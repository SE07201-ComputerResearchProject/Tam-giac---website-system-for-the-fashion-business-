const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const logger = require('../utils/logger');

module.exports = {
  // Tạo MFA secret & QR code
  generateMFASecret: async (req, res, next) => {
    try {
      const { user } = req;
      const secret = speakeasy.generateSecret({
        name: `Tam-Giac (${user.email})`,
        issuer: 'TamGiac Ecommerce'
      });

      // Lưu secret vào DB (sẽ update user.mfaSecret)
      req.mfa = {
        secret: secret.base32,
        otpauth_url: secret.otpauth_url,
        qr: await QRCode.toDataURL(secret.otpauth_url)
      };

      next();
    } catch (error) {
      logger.error('MFA generate error:', error);
      res.status(500).json({ error: 'Lỗi tạo MFA' });
    }
  },

  // Verify TOTP code (6 số)
  verifyMFA: (req, res, next) => {
    const { token } = req.body;
    const { userId } = req.user;

    // Lấy user từ DB (giả sử đã load)
    // const user = await models.User.findByPk(userId);

    const verified = speakeasy.totp.verify({
      secret: req.user.mfaSecret, // Từ DB
      encoding: 'base32',
      token,
      window: 1 // Cho lệch thời gian
    });

    if (!verified) {
      return res.status(401).json({ error: 'Mã MFA sai' });
    }

    next();
  },

  enableMFA: async (req, res, next) => {
    // Update user.mfaEnabled = true sau verify
    next();
  }
};

