const recaptcha = require('recaptcha2');
const logger = require('../utils/logger');

const recaptchaEnabled =
  (process.env.RECAPTCHA_ENABLED || 'false').toLowerCase() === 'true';
const hasRecaptchaConfig =
  Boolean(process.env.RECAPTCHA_SITE_KEY) &&
  Boolean(process.env.RECAPTCHA_SECRET_KEY);
const canVerifyCaptcha = recaptchaEnabled && hasRecaptchaConfig;

const verifyRecaptcha = canVerifyCaptcha
  ? new recaptcha({
      siteKey: process.env.RECAPTCHA_SITE_KEY,
      secretKey: process.env.RECAPTCHA_SECRET_KEY
    })
  : null;

module.exports = {
  verifyCaptcha: (req, res, next) => {
    // In local/dev, if ReCAPTCHA is not fully configured, bypass verification.
    if (!canVerifyCaptcha || !verifyRecaptcha) {
      return next();
    }

    // Support either `recaptchaValue` or `recaptchaToken` from different clients
    const recaptchaValue = req.body.recaptchaValue || req.body.recaptchaToken || null;

    if (!recaptchaValue) {
      return res.status(400).json({ error: 'ReCAPTCHA bat buoc' });
    }

    verifyRecaptcha
      .validate(recaptchaValue)
      .then(() => {
        logger.info(`ReCAPTCHA pass: ${req.ip}`);
        next();
      })
      .catch((error) => {
        logger.warn(`ReCAPTCHA fail ${req.ip}:`, error);
        res.status(400).json({ error: 'ReCAPTCHA khong hop le' });
      });
  }
};
