const express = require('express');
const vnpayService = require('../services/vnpay');
const momoService = require('../services/momo');
const mockPaymentService = require('../services/mock-payment');
const { getMissingConfig } = require('../config/momo');
const logger = require('../utils/logger');

const router = express.Router();

// Tạo link thanh toán VNPay
router.post('/create', async (req, res) => {
  const { amount, orderId, returnUrl } = req.body;
  const ipAddr = req.ip || req.connection.remoteAddress || '127.0.0.1';
  
  try {
    const paymentUrl = vnpayService.createPaymentUrl(amount, orderId, returnUrl, ipAddr);
    res.json({ paymentUrl });
  } catch (error) {
    logger.error('VNPay create error:', error);
    res.status(500).json({ error: 'Tạo thanh toán thất bại' });
  }
});

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

// VNPay return URL (frontend redirect về)
router.get('/vnpay_return', (req, res) => {
  const result = vnpayService.verifyPayment(req);
  
  if (result.isSuccess) {
    logger.info(`Payment success: ${result.orderId}`);
    res.json({ success: true, message: 'Thanh toán thành công!', transactionNo: result.transactionNo });
  } else {
    logger.warn(`Payment fail: ${result.orderId}`);
    res.json({ success: false, message: 'Thanh toán thất bại' });
  }
});

// IPN (VNPay server gọi - verify lại)
router.post('/vnpay_ipn', (req, res) => {
  const result = vnpayService.verifyPayment(req);
  // Update Order.status = 'paid' nếu success
  
  // Response cho VNPay
  res.status(200).json({ 
    RspCode: '00', 
    Message: 'IPN OK' 
  });
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

