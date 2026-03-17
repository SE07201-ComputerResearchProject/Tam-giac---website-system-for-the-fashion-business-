const crypto = require('crypto');
const axios = require('axios');
const logger = require('../utils/logger');

class VNPayService {
  constructor() {
    this.tmnCode = process.env.VNPAY_TMN_CODE;
    this.secretKey = process.env.VNPAY_SECRET;
    this.vnpayUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  }

  // Tạo URL thanh toán (gọi từ /orders/checkout)
  createPaymentUrl(amount, orderId, returnUrl, ipAddr) {
    const date = new Date();
    const createDate = date.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    
    let vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Amount: amount * 100, // VND * 100
      vnp_CreateDate: createDate,
      vnp_CurrCode: 'VND',
      vnp_IpAddr: ipAddr,
      vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: returnUrl || 'http://localhost:3001/orders/return',
      vnp_TxnRef: orderId
    };

    // Sort & tạo hash signature (chống tamper)
    vnp_Params = this.sortObject(vnp_Params);
    let querystring = this.buildQueryString(vnp_Params);
    let signData = querystring + '&vnp_SecureHash=' + this.createChecksum(querystring, this.secretKey);
    
    return this.vnpayUrl + '?' + signData;
  }

  // Verify payment return/IPN (chống fake callback)
  verifyPayment(req) {
    const vnp_Params = req.query;
    const secureHash = vnp_Params.vnp_SecureHash;
    delete vnp_Params.vnp_SecureHash;
    delete vnp_Params.vnp_SecureHashType;

    vnp_Params = this.sortObject(vnp_Params);
    const querystring = this.buildQueryString(vnp_Params);
    const checkSum = this.createChecksum(querystring, this.secretKey);

    if (secureHash === checkSum) {
      logger.info(`VNPay verify OK: ${vnp_Params.vnp_TxnRef}`);
      return {
        isSuccess: vnp_Params.vnp_ResponseCode === '00',
        transactionNo: vnp_Params.vnp_TransactionNo,
        orderId: vnp_Params.vnp_TxnRef
      };
    } else {
      logger.error('VNPay checksum fail');
      return { isSuccess: false };
    }
  }

  sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        str.push(encodeURIComponent(key));
      }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
      sorted[str[key]] = encodeURIComponent(obj[str[key]]);
    }
    return sorted;
  }

  buildQueryString(obj) {
    let str = [];
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        str.push(key + '=' + obj[key]);
      }
    }
    return str.join('&');
  }

  createChecksum(data, key) {
    const hmac = crypto.createHmac('sha512', key);
    return hmac.update(Buffer.from(data, 'utf-8')).digest('hex');
  }
}

module.exports = new VNPayService();

