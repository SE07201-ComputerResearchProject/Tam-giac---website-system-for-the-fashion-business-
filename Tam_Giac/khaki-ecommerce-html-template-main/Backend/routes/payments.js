const express = require('express');
const vnpayService = require('../services/vnpay');
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

module.exports = router;

