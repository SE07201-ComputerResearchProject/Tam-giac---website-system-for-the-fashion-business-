const express = require('express');
const { body } = require('express-validator');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');
const authMiddleware = require('../middleware/auth');
const mfaMiddleware = require('../middleware/mfa');
const recaptchaMiddleware = require('../middleware/recaptcha');

const router = express.Router();

const googleOAuthEnabled =
  Boolean(process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET) &&
  Boolean(process.env.GOOGLE_CALLBACK_URL);

// Google OAuth setup (chỉ bật khi đủ biến môi trường)
if (googleOAuthEnabled) {
  passport.use(new (require('passport-google-oauth20').Strategy)({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ where: { googleId: profile.id } });
      if (!user) {
        user = await User.create({
          googleId: profile.id,
          email: profile.emails?.[0]?.value,
          fullName: profile.displayName
        });
      }
      done(null, user);
    } catch (error) {
      done(error);
    }
  }));
} else {
  logger.warn('Google OAuth chưa cấu hình (thiếu GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL)');
}

// ReCAPTCHA protect register/login
router.post('/register', recaptchaMiddleware.verifyCaptcha, [
  body('email').isEmail(),
  body('password').isLength({ min: 8 })
], async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    const user = await User.create({ email, password, fullName });
    logger.info(`User registered: ${email}`);
    res.status(201).json({ message: 'Đăng ký thành công', userId: user.id });
  } catch (error) {
    res.status(400).json({ error: 'Email đã tồn tại' });
  }
});

// Login + JWT + optional MFA
router.post('/login', recaptchaMiddleware.verifyCaptcha, async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  
  if (!user || !(await user.validPassword(password))) {
    return res.status(401).json({ error: 'Email/mật khẩu sai' });
  }

  // JWT payload (không sensitive)
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    mfaEnabled: user.mfaEnabled,
    message: 'Đăng nhập OK'
  });
});

// MFA setup (sau login)
router.post('/mfa/setup', authMiddleware.authenticateToken, mfaMiddleware.generateMFASecret, async (req, res) => {
  // Update user.mfaSecret = req.mfa.secret
  await req.user.update({ mfaSecret: req.mfa.secret });
  res.json({ 
    qrCode: req.mfa.qr,
    secret: req.mfa.secret, 
    message: 'Scan QR bằng Google Authenticator'
  });
});

// MFA verify & enable
router.post('/mfa/verify', authMiddleware.authenticateToken, mfaMiddleware.verifyMFA, async (req, res) => {
  await req.user.update({ mfaEnabled: true });
  res.json({ message: 'MFA kích hoạt thành công' });
});

// Google OAuth routes
router.get('/google', (req, res, next) => {
  if (!googleOAuthEnabled) return res.status(501).json({ error: 'Google OAuth chưa được cấu hình' });
  return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});
router.get('/google/callback', (req, res, next) => {
  if (!googleOAuthEnabled) return res.status(501).json({ error: 'Google OAuth chưa được cấu hình' });
  return passport.authenticate('google')(req, res, next);
}, (req, res) => {
  const token = jwt.sign({ id: req.user.id, email: req.user.email }, process.env.JWT_SECRET);
  res.redirect(`http://localhost:3001/auth/callback?token=${token}`); // Frontend React
});

module.exports = router;

