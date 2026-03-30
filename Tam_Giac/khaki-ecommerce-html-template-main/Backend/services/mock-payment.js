const crypto = require('crypto');
const QRCode = require('qrcode');

const sessions = new Map();
const SESSION_TTL_MS = 15 * 60 * 1000;

function now() {
  return Date.now();
}

function createSessionId() {
  return crypto.randomBytes(8).toString('hex');
}

function buildReturnUrl(baseUrl, params) {
  const url = new URL(baseUrl);
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.set(key, String(params[key]));
    }
  });
  return url.toString();
}

async function buildQrCodeDataUrl(session) {
  const qrPayload = JSON.stringify({
    gateway: 'TamGiacDemoPay',
    sessionId: session.sessionId,
    orderId: session.orderId,
    amount: session.amount,
    timestamp: session.createdAt
  });

  return QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
    color: {
      dark: '#0d2a3f',
      light: '#f8fdff'
    }
  });
}

function sanitizeAmount(amount) {
  return Math.max(1000, Math.round(Number(amount) || 0));
}

function getMessageForAction(action) {
  switch (action) {
    case 'success':
      return 'Thanh toan demo thanh cong';
    case 'fail':
      return 'Thanh toan demo that bai';
    case 'cancel':
      return 'Nguoi dung da huy giao dich';
    default:
      return 'Trang thai khong hop le';
  }
}

function getResultCodeForAction(action) {
  switch (action) {
    case 'success':
      return '00';
    case 'fail':
      return '99';
    case 'cancel':
      return '24';
    default:
      return '98';
  }
}

async function createSession(input) {
  const createdAt = now();
  const sessionId = createSessionId();
  const session = {
    sessionId,
    orderId: String(input.orderId || ('DEMO-' + createdAt)),
    amount: sanitizeAmount(input.amount),
    orderInfo: String(input.orderInfo || 'Thanh toan demo Tam Giac'),
    returnUrl: String(input.returnUrl || 'http://127.0.0.1:3001/checkout.html?payment=demopay-return'),
    extraData: String(input.extraData || ''),
    status: 'pending',
    provider: 'demopay',
    createdAt,
    expiresAt: createdAt + SESSION_TTL_MS,
    webhookStatus: 'pending',
    webhookPayload: null,
    webhookDispatchedAt: null
  };

  session.qrCodeDataUrl = await buildQrCodeDataUrl(session);
  session.payUrl = 'http://127.0.0.1:3001/demo-pay.html?session=' + encodeURIComponent(sessionId);
  sessions.set(sessionId, session);
  return session;
}

function getSession(sessionId) {
  const session = sessions.get(String(sessionId || ''));
  if (!session) {
    return null;
  }

  if (session.status === 'pending' && session.expiresAt <= now()) {
    session.status = 'expired';
  }

  return session;
}

function buildWebhookPayload(session, action) {
  return {
    partnerCode: 'TAMGIAC_DEMOPAY',
    orderId: session.orderId,
    requestId: session.sessionId,
    amount: session.amount,
    orderInfo: session.orderInfo,
    resultCode: getResultCodeForAction(action),
    message: getMessageForAction(action),
    transId: 'DEMO-' + session.sessionId,
    responseTime: now()
  };
}

function completeSession(sessionId, action) {
  const session = getSession(sessionId);
  if (!session) {
    return null;
  }

  if (action === 'success') {
    session.status = 'paid';
  } else if (action === 'fail') {
    session.status = 'failed';
  } else if (action === 'cancel') {
    session.status = 'cancelled';
  } else {
    session.status = 'error';
  }

  session.updatedAt = now();
  session.webhookStatus = 'sent';
  session.webhookDispatchedAt = session.updatedAt;
  session.webhookPayload = buildWebhookPayload(session, action);
  session.redirectUrl = buildReturnUrl(session.returnUrl, {
    payment: 'demopay-return',
    resultCode: getResultCodeForAction(action),
    message: getMessageForAction(action),
    orderId: session.orderId
  });

  return session;
}

module.exports = {
  createSession,
  getSession,
  completeSession
};
