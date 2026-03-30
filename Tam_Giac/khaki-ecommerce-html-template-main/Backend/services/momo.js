const crypto = require('crypto');
const axios = require('axios');
const logger = require('../utils/logger');
const { assertConfigured, momoConfig } = require('../config/momo');

function createRequestId(prefix) {
  return [
    prefix,
    Date.now(),
    Math.floor(Math.random() * 1000000)
  ].join('-');
}

function buildSignaturePayload(payload) {
  return [
    'accessKey=' + momoConfig.accessKey,
    'amount=' + payload.amount,
    'extraData=' + payload.extraData,
    'ipnUrl=' + payload.ipnUrl,
    'orderId=' + payload.orderId,
    'orderInfo=' + payload.orderInfo,
    'partnerCode=' + payload.partnerCode,
    'redirectUrl=' + payload.redirectUrl,
    'requestId=' + payload.requestId,
    'requestType=' + payload.requestType
  ].join('&');
}

function signPayload(rawSignature) {
  return crypto
    .createHmac('sha256', momoConfig.secretKey)
    .update(rawSignature)
    .digest('hex');
}

class MoMoService {
  createPaymentPayload(input) {
    assertConfigured();

    const safeAmount = Math.max(1000, Math.round(Number(input.amount) || 0));
    const orderId = String(input.orderId || createRequestId('MOMO-ORDER'));
    const requestId = String(input.requestId || createRequestId('MOMO-REQ'));
    const orderInfo = String(input.orderInfo || ('Thanh toan don hang ' + orderId));
    const redirectUrl = String(input.returnUrl || momoConfig.returnUrl);
    const ipnUrl = String(input.notifyUrl || momoConfig.notifyUrl);
    const extraData = String(input.extraData || '');

    const payload = {
      partnerCode: momoConfig.partnerCode,
      requestId: requestId,
      amount: String(safeAmount),
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: redirectUrl,
      ipnUrl: ipnUrl,
      lang: momoConfig.lang,
      requestType: momoConfig.requestType,
      autoCapture: true,
      extraData: extraData
    };

    const rawSignature = buildSignaturePayload(payload);
    payload.signature = signPayload(rawSignature);

    return payload;
  }

  async createPayment(input) {
    const payload = this.createPaymentPayload(input);

    logger.info('Creating MoMo payment request', {
      orderId: payload.orderId,
      requestId: payload.requestId,
      amount: payload.amount
    });

    const response = await axios.post(momoConfig.endpoint, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return response.data;
  }

  verifyCallbackSignature(callbackBody) {
    assertConfigured();

    const fields = [
      'accessKey=' + momoConfig.accessKey,
      'amount=' + String(callbackBody.amount || ''),
      'extraData=' + String(callbackBody.extraData || ''),
      'message=' + String(callbackBody.message || ''),
      'orderId=' + String(callbackBody.orderId || ''),
      'orderInfo=' + String(callbackBody.orderInfo || ''),
      'orderType=' + String(callbackBody.orderType || ''),
      'partnerCode=' + String(callbackBody.partnerCode || ''),
      'payType=' + String(callbackBody.payType || ''),
      'requestId=' + String(callbackBody.requestId || ''),
      'responseTime=' + String(callbackBody.responseTime || ''),
      'resultCode=' + String(callbackBody.resultCode || ''),
      'transId=' + String(callbackBody.transId || '')
    ].join('&');

    const expected = signPayload(fields);
    return expected === String(callbackBody.signature || '');
  }
}

module.exports = new MoMoService();
