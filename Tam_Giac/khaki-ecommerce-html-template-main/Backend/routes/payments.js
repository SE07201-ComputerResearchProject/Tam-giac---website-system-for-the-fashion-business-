const express = require('express');
const { Order } = require('../models');
const authMiddleware = require('../middleware/auth');
const vnpayService = require('../services/vnpay');
const momoService = require('../services/momo');
const mockPaymentService = require('../services/mock-payment');
const { getMissingConfig } = require('../config/momo');
const {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  canCreateVnpayPayment,
  getPaymentMethodFromStatus,
  getVnpayStatusFromResponse,
  isFinalOrderStatus
} = require('../services/order-payment');
const { createOrderReference } = require('../services/storefront');
const logger = require('../utils/logger');

const router = express.Router();

function getExpectedVnpayAmount(order) {
  return Math.round(Number(order && order.totalAmount ? order.totalAmount : 0) * 100);
}

function isExpectedVnpayAmount(order, amountFromGateway) {
  return getExpectedVnpayAmount(order) === Number(amountFromGateway || 0);
}

function buildVnpayOrderInfo(order) {
  return `Thanh toan don hang ${createOrderReference(order.id)}`;
}

function getReturnMessage(responseCode, status) {
  if (status === ORDER_STATUSES.VNPAY_PAID) {
    return 'VNPay payment completed successfully.';
  }

  if (status === ORDER_STATUSES.VNPAY_CANCELLED) {
    return 'The VNPay transaction was cancelled.';
  }

  if (status === ORDER_STATUSES.VNPAY_EXPIRED) {
    return 'The VNPay QR session expired before payment completed.';
  }

  if (responseCode === '97') {
    return 'VNPay callback signature is invalid.';
  }

  if (responseCode === '01') {
    return 'The order could not be found.';
  }

  if (responseCode === '04') {
    return 'The payment amount did not match the order total.';
  }

  return 'VNPay payment was not completed.';
}

function redirectToCheckoutResult(req, res, details) {
  return res.redirect(302, vnpayService.buildCheckoutResultUrl(req, details));
}

async function applyVnpayResult(order, verification, source) {
  if (!order) {
    return { ok: false, code: '01', message: 'Order not Found' };
  }

  if (getPaymentMethodFromStatus(order.status) !== PAYMENT_METHODS.VNPAY) {
    return { ok: false, code: '99', message: 'Invalid request' };
  }

  if (!isExpectedVnpayAmount(order, verification.amount)) {
    return { ok: false, code: '04', message: 'Invalid Amount' };
  }

  if (isFinalOrderStatus(order.status)) {
    return {
      ok: true,
      code: '02',
      message: 'Order already confirmed',
      status: order.status
    };
  }

  const nextStatus = getVnpayStatusFromResponse(
    verification.responseCode,
    verification.transactionStatus
  );

  await order.update({ status: nextStatus });

  logger.info('VNPay order status updated', {
    source,
    orderId: order.id,
    nextStatus,
    responseCode: verification.responseCode,
    transactionStatus: verification.transactionStatus,
    transactionNo: verification.transactionNo
  });

  return {
    ok: true,
    code: '00',
    message: 'Confirm Success',
    status: nextStatus
  };
}

async function createVnpayPayment(req, res) {
  const orderId = String((req.body && req.body.orderId) || '').trim();

  try {
    if (!orderId) {
      return res.status(400).json({ error: 'Order id is required' });
    }

    const order = await Order.findOne({
      where: {
        id: orderId,
        userId: req.user.id
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Khong tim thay don hang' });
    }

    if (getPaymentMethodFromStatus(order.status) !== PAYMENT_METHODS.VNPAY) {
      return res.status(400).json({ error: 'Don hang nay khong su dung VNPay QR' });
    }

    if (!canCreateVnpayPayment(order.status)) {
      return res.status(409).json({ error: 'Don hang VNPay nay da duoc xu ly roi' });
    }

    const paymentUrl = vnpayService.createPaymentUrl({
      amount: Number(order.totalAmount || 0),
      orderId: order.id,
      orderInfo: buildVnpayOrderInfo(order),
      returnUrl: vnpayService.getReturnUrl(req),
      ipAddr: vnpayService.getClientIp(req)
    });

    return res.json({
      provider: 'vnpay',
      orderId: order.id,
      reference: createOrderReference(order.id),
      paymentUrl
    });
  } catch (error) {
    logger.error('VNPay create error', {
      message: error && error.message,
      orderId
    });

    return res.status(500).json({
      error: error && error.message ? error.message : 'Tao thanh toan VNPay that bai'
    });
  }
}

router.post('/create', authMiddleware.authenticateToken, createVnpayPayment);
router.post('/vnpay/create', authMiddleware.authenticateToken, createVnpayPayment);

router.post('/momo/create', async (req, res) => {
  const { amount, orderId, returnUrl, orderInfo, extraData } = req.body || {};

  try {
    const missing = getMissingConfig();
    if (missing.length) {
      const session = await mockPaymentService.createSession({
        amount,
        orderId,
        returnUrl,
        orderInfo,
        extraData
      });

      return res.json({
        provider: 'demopay',
        orderId: session.orderId,
        payUrl: session.payUrl,
        qrCodeUrl: session.qrCodeDataUrl,
        resultCode: '00',
        message: 'MoMo test chua cau hinh. Da chuyen sang Tam Giac DemoPay de mo phong luong QR.'
      });
    }

    const result = await momoService.createPayment({
      amount,
      orderId,
      returnUrl,
      orderInfo,
      extraData
    });

    res.json({
      partnerCode: result.partnerCode,
      requestId: result.requestId,
      orderId: result.orderId,
      payUrl: result.payUrl,
      deeplink: result.deeplink,
      qrCodeUrl: result.qrCodeUrl,
      resultCode: result.resultCode,
      message: result.message
    });
  } catch (error) {
    const missing = getMissingConfig();
    logger.error('MoMo create error', {
      message: error && error.message,
      missingConfig: missing,
      response: error && error.response && error.response.data
    });

    res.status(500).json({
      error: missing.length
        ? 'Cau hinh MoMo chua day du: ' + missing.join(', ')
        : 'Khong tao duoc giao dich MoMo',
      details: error && error.response && error.response.data
    });
  }
});

router.post('/mock/create', async (req, res) => {
  const { amount, orderId, returnUrl, orderInfo, extraData } = req.body || {};

  try {
    const session = await mockPaymentService.createSession({
      amount,
      orderId,
      returnUrl,
      orderInfo,
      extraData
    });

    res.json({
      provider: 'demopay',
      sessionId: session.sessionId,
      orderId: session.orderId,
      payUrl: session.payUrl,
      qrCodeUrl: session.qrCodeDataUrl,
      resultCode: '00',
      message: 'Da tao giao dich DemoPay thanh cong'
    });
  } catch (error) {
    logger.error('Mock payment create error', {
      message: error && error.message
    });

    res.status(500).json({
      error: 'Khong tao duoc giao dich demo'
    });
  }
});

router.get('/mock/session/:sessionId', (req, res) => {
  const session = mockPaymentService.getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Khong tim thay phien thanh toan demo' });
  }

  return res.json({
    sessionId: session.sessionId,
    orderId: session.orderId,
    amount: session.amount,
    orderInfo: session.orderInfo,
    status: session.status,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    provider: session.provider,
    payUrl: session.payUrl,
    qrCodeUrl: session.qrCodeDataUrl,
    webhookStatus: session.webhookStatus,
    webhookPayload: session.webhookPayload,
    redirectUrl: session.redirectUrl || null
  });
});

router.post('/mock/session/:sessionId/action', (req, res) => {
  const action = String((req.body && req.body.action) || '').trim().toLowerCase();
  const session = mockPaymentService.completeSession(req.params.sessionId, action);

  if (!session) {
    return res.status(404).json({ error: 'Khong tim thay phien thanh toan demo' });
  }

  return res.json({
    status: session.status,
    resultCode: session.webhookPayload && session.webhookPayload.resultCode,
    message: session.webhookPayload && session.webhookPayload.message,
    redirectUrl: session.redirectUrl,
    webhookStatus: session.webhookStatus,
    webhookPayload: session.webhookPayload
  });
});

router.get('/vnpay_return', async (req, res) => {
  try {
    const verification = vnpayService.verifyPayment(req.query);

    if (!verification.isVerified) {
      logger.warn('VNPay return invalid signature', {
        orderId: verification.orderId
      });

      return redirectToCheckoutResult(req, res, {
        orderId: verification.orderId,
        resultCode: '97',
        status: ORDER_STATUSES.VNPAY_FAILED,
        success: '0',
        message: getReturnMessage('97', ORDER_STATUSES.VNPAY_FAILED)
      });
    }

    const order = await Order.findByPk(verification.orderId);
    const updateResult = await applyVnpayResult(order, verification, 'return');
    const finalStatus =
      updateResult.status || getVnpayStatusFromResponse(verification.responseCode, verification.transactionStatus);
    const resultCode = updateResult.ok ? verification.responseCode || updateResult.code : updateResult.code;

    return redirectToCheckoutResult(req, res, {
      orderId: verification.orderId,
      transactionNo: verification.transactionNo,
      resultCode,
      status: finalStatus,
      success: finalStatus === ORDER_STATUSES.VNPAY_PAID ? '1' : '0',
      message: getReturnMessage(resultCode, finalStatus)
    });
  } catch (error) {
    logger.error('VNPay return error', {
      message: error && error.message
    });

    return redirectToCheckoutResult(req, res, {
      resultCode: '99',
      status: ORDER_STATUSES.VNPAY_FAILED,
      success: '0',
      message: 'VNPay return handling failed.'
    });
  }
});

router.get('/vnpay_ipn', async (req, res) => {
  try {
    const verification = vnpayService.verifyPayment(req.query);

    if (!verification.isVerified) {
      logger.warn('VNPay IPN invalid signature', {
        orderId: verification.orderId
      });

      return res.status(200).json({
        RspCode: '97',
        Message: 'Invalid Signature'
      });
    }

    const order = await Order.findByPk(verification.orderId);
    const updateResult = await applyVnpayResult(order, verification, 'ipn');

    return res.status(200).json({
      RspCode: updateResult.code,
      Message: updateResult.message
    });
  } catch (error) {
    logger.error('VNPay IPN error', {
      message: error && error.message
    });

    return res.status(200).json({
      RspCode: '99',
      Message: 'Unknown error'
    });
  }
});

router.post('/momo/ipn', (req, res) => {
  try {
    const isValidSignature = momoService.verifyCallbackSignature(req.body || {});

    if (!isValidSignature) {
      logger.warn('MoMo IPN signature invalid', {
        orderId: req.body && req.body.orderId
      });

      return res.status(400).json({
        message: 'Invalid signature'
      });
    }

    logger.info('MoMo IPN received', {
      orderId: req.body && req.body.orderId,
      resultCode: req.body && req.body.resultCode,
      transId: req.body && req.body.transId
    });

    return res.status(204).end();
  } catch (error) {
    logger.error('MoMo IPN error', {
      message: error && error.message
    });

    return res.status(500).json({
      message: 'IPN processing failed'
    });
  }
});

module.exports = router;
