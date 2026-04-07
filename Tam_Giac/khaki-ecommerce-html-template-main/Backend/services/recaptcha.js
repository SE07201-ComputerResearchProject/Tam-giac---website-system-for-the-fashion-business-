const axios = require('axios');
const logger = require('../utils/logger');

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || '6LdS0KssAAAAADPEzgrMXuj24Rkhr_qOo443cpVH';
const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * Verifies a reCAPTCHA token with Google's API.
 * @param {string} token The reCAPTCHA token from the client.
 * @param {string} [remoteIp] The user's IP address (optional but recommended).
 * @returns {Promise<boolean>} True if the token is valid, false otherwise.
 */
async function verifyRecaptcha(token, remoteIp) {
  if (!token) {
    return false;
  }

  try {
    const response = await axios.post(VERIFY_URL, null, {
      params: {
        secret: RECAPTCHA_SECRET_KEY,
        response: token,
        remoteip: remoteIp,
      },
    });

    const { success, 'error-codes': errorCodes } = response.data;

    if (!success) {
      logger.warn('reCAPTCHA verification failed', { errorCodes });
    }

    return success === true;
  } catch (error) {
    logger.error('Error calling reCAPTCHA verification API', {
      message: error.message,
      response: error.response ? error.response.data : null,
    });
    // In case of API failure, we might choose to fail open or closed.
    // Failing closed (returning false) is safer.
    return false;
  }
}

module.exports = {
  verifyRecaptcha,
};