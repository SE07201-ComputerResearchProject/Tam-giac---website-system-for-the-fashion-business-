const recaptcha = require('recaptcha2');
const logger = require('../utils/logger');

const verifyRecaptcha = new recaptcha({
  siteKey: process.env.RECAPTCHA_SITE_KEY,
  secretKey: process.env.RECAPTCHA_SECRET_KEY
});

module.exports = {
  verifyCaptcha: (req, res, next) => {
    const { recaptchaValue } = req.body;

    if (!recaptchaValue) {
      return res.status(400).json({ error: 'ReCAPTCHA bắt buộc' });
    }

    verifyRecaptcha.validate(recaptchaValue)
      .then(() => {
        logger.info(`ReCAPTCHA pass: ${req.ip}`);
        next();
      })
      .catch((error) => {
        logger.warn(`ReCAPTCHA fail ${req.ip}:`, error);
        res.status(400).json({ error: 'ReCAPTCHA không hợp lệ' });
      });
  }
};

