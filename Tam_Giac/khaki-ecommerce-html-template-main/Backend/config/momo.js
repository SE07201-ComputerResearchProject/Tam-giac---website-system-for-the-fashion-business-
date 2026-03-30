const TEST_ENDPOINT = 'https://test-payment.momo.vn/v2/gateway/api/create';
const DEFAULT_RETURN_URL = 'http://127.0.0.1:3001/checkout.html?payment=momo-return';
const DEFAULT_NOTIFY_URL = 'http://127.0.0.1:3002/api/payments/momo/ipn';

function cleanEnvValue(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

const momoConfig = Object.freeze({
  partnerCode: cleanEnvValue(process.env.MOMO_PARTNER_CODE),
  accessKey: cleanEnvValue(process.env.MOMO_ACCESS_KEY),
  secretKey: cleanEnvValue(process.env.MOMO_SECRET_KEY),
  endpoint: cleanEnvValue(process.env.MOMO_ENDPOINT) || TEST_ENDPOINT,
  returnUrl: cleanEnvValue(process.env.MOMO_RETURN_URL) || DEFAULT_RETURN_URL,
  notifyUrl: cleanEnvValue(process.env.MOMO_NOTIFY_URL) || DEFAULT_NOTIFY_URL,
  requestType: cleanEnvValue(process.env.MOMO_REQUEST_TYPE) || 'captureWallet',
  lang: cleanEnvValue(process.env.MOMO_LANG) || 'vi'
});

function getMissingConfig() {
  const missing = [];

  if (!momoConfig.partnerCode) {
    missing.push('MOMO_PARTNER_CODE');
  }

  if (!momoConfig.accessKey) {
    missing.push('MOMO_ACCESS_KEY');
  }

  if (!momoConfig.secretKey) {
    missing.push('MOMO_SECRET_KEY');
  }

  if (!momoConfig.endpoint) {
    missing.push('MOMO_ENDPOINT');
  }

  if (!momoConfig.returnUrl) {
    missing.push('MOMO_RETURN_URL');
  }

  if (!momoConfig.notifyUrl) {
    missing.push('MOMO_NOTIFY_URL');
  }

  return missing;
}

function isConfigured() {
  return getMissingConfig().length === 0;
}

function assertConfigured() {
  const missing = getMissingConfig();

  if (!missing.length) {
    return momoConfig;
  }

  throw new Error('MoMo config missing: ' + missing.join(', '));
}

module.exports = {
  TEST_ENDPOINT,
  DEFAULT_RETURN_URL,
  DEFAULT_NOTIFY_URL,
  momoConfig,
  getMissingConfig,
  isConfigured,
  assertConfigured
};
