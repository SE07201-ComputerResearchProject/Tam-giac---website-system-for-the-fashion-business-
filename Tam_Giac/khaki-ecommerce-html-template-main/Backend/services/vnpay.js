const crypto = require('crypto');

const DEFAULT_PAYMENT_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const DEFAULT_ORDER_TYPE = 'other';
const DEFAULT_EXPIRE_MINUTES = 15;

function cleanEnvValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function padNumber(value) {
  return String(value).padStart(2, '0');
}

function encodeVnpayValue(value) {
  return encodeURIComponent(String(value)).replace(/%20/g, '+');
}

function formatDateGmt7(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
  const gmt7Date = new Date(utcTime + (7 * 60 * 60 * 1000));

  return [
    gmt7Date.getFullYear(),
    padNumber(gmt7Date.getMonth() + 1),
    padNumber(gmt7Date.getDate()),
    padNumber(gmt7Date.getHours()),
    padNumber(gmt7Date.getMinutes()),
    padNumber(gmt7Date.getSeconds())
  ].join('');
}

class VNPayService {
  constructor() {
    this.tmnCode = cleanEnvValue(process.env.VNPAY_TMN_CODE);
    this.secretKey = cleanEnvValue(process.env.VNPAY_SECRET);
    this.vnpayUrl = cleanEnvValue(process.env.VNPAY_URL) || DEFAULT_PAYMENT_URL;
    this.returnUrl = cleanEnvValue(process.env.VNPAY_RETURN_URL);
    this.bankCode = cleanEnvValue(process.env.VNPAY_BANK_CODE);
  }

  assertConfigured() {
    const missing = [];

    if (!this.tmnCode) {
      missing.push('VNPAY_TMN_CODE');
    }

    if (!this.secretKey) {
      missing.push('VNPAY_SECRET');
    }

    if (!this.vnpayUrl) {
      missing.push('VNPAY_URL');
    }

    if (missing.length) {
      throw new Error('VNPay config missing: ' + missing.join(', '));
    }
  }

  getBaseUrl(req) {
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
    const protocol = forwardedProto || req.protocol || 'http';
    const host = forwardedHost || req.get('host') || '127.0.0.1:3002';

    return `${protocol}://${host}`;
  }

  getReturnUrl(req) {
    if (this.returnUrl) {
      return this.returnUrl;
    }

    return new URL('/api/payments/vnpay_return', this.getBaseUrl(req)).toString();
  }

  buildCheckoutResultUrl(req, details) {
    const url = new URL('/checkout.html', this.getBaseUrl(req));
    url.searchParams.set('payment', 'vnpay-return');

    Object.entries(details || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });

    return url.toString();
  }

  getClientIp(req) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return forwarded || req.ip || req.connection?.remoteAddress || '127.0.0.1';
  }

  normalizeAmount(amount) {
    return Math.max(0, Math.round(Number(amount || 0)));
  }

  sortParams(params) {
    const sorted = {};

    Object.keys(params || {})
      .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
      .sort()
      .forEach((key) => {
        sorted[encodeURIComponent(key)] = encodeVnpayValue(params[key]);
      });

    return sorted;
  }

  buildQueryString(params) {
    return Object.keys(params)
      .map((key) => `${key}=${params[key]}`)
      .join('&');
  }

  createChecksum(data) {
    return crypto.createHmac('sha512', this.secretKey).update(Buffer.from(data, 'utf-8')).digest('hex');
  }

  createPaymentUrl(input) {
    this.assertConfigured();

    const amount = this.normalizeAmount(input.amount);
    const createdAt = input.createdAt ? new Date(input.createdAt) : new Date();
    const expiresAt = new Date(
      createdAt.getTime() + ((Number(input.expireMinutes) || DEFAULT_EXPIRE_MINUTES) * 60 * 1000)
    );

    const params = this.sortParams({
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Amount: amount * 100,
      vnp_CreateDate: formatDateGmt7(createdAt),
      vnp_CurrCode: 'VND',
      vnp_IpAddr: input.ipAddr || '127.0.0.1',
      vnp_Locale: input.locale || 'vn',
      vnp_OrderInfo: input.orderInfo || `Thanh toan don hang ${input.orderId}`,
      vnp_OrderType: input.orderType || DEFAULT_ORDER_TYPE,
      vnp_ReturnUrl: input.returnUrl,
      vnp_TxnRef: input.orderId,
      vnp_ExpireDate: formatDateGmt7(expiresAt),
      vnp_BankCode: input.bankCode || this.bankCode || ''
    });

    const signData = this.buildQueryString(params);
    const secureHash = this.createChecksum(signData);

    return `${this.vnpayUrl}?${signData}&vnp_SecureHash=${secureHash}`;
  }

  verifyPayment(queryInput) {
    this.assertConfigured();

    const rawParams = { ...(queryInput || {}) };
    const secureHash = String(rawParams.vnp_SecureHash || '').trim();

    delete rawParams.vnp_SecureHash;
    delete rawParams.vnp_SecureHashType;

    const params = this.sortParams(rawParams);
    const signData = this.buildQueryString(params);
    const expectedHash = this.createChecksum(signData);
    const isVerified = Boolean(secureHash) && secureHash.toLowerCase() === expectedHash.toLowerCase();

    return {
      isVerified,
      isSuccess:
        isVerified &&
        params.vnp_ResponseCode === '00' &&
        (!params.vnp_TransactionStatus || params.vnp_TransactionStatus === '00'),
      params,
      secureHash,
      expectedHash,
      orderId: params.vnp_TxnRef || '',
      transactionNo: params.vnp_TransactionNo || '',
      responseCode: params.vnp_ResponseCode || '',
      transactionStatus: params.vnp_TransactionStatus || '',
      amount: Number(params.vnp_Amount || 0)
    };
  }
}

module.exports = new VNPayService();
