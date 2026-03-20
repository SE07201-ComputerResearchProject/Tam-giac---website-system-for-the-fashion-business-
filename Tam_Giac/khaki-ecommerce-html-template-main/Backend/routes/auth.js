const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const passport = require('passport');
const logger = require('../utils/logger');
const authMiddleware = require('../middleware/auth');
const mfaMiddleware = require('../middleware/mfa');
const recaptchaMiddleware = require('../middleware/recaptcha');
const { getSqlPool, sql } = require('../config/database');

const router = express.Router();

const googleOAuthEnabled =
  Boolean(process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET) &&
  Boolean(process.env.GOOGLE_CALLBACK_URL);

let ensureUsersTablePromise = null;

const ensureUsersTable = async () => {
  if (ensureUsersTablePromise) {
    return ensureUsersTablePromise;
  }

  ensureUsersTablePromise = (async () => {
    const pool = getSqlPool();
    if (!pool) {
      throw new Error('SQL pool is not ready');
    }

    await pool.request().batch(`
      IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.Users (
          id INT IDENTITY(1,1) PRIMARY KEY,
          email NVARCHAR(255) NOT NULL UNIQUE,
          password NVARCHAR(255) NOT NULL,
          fullName NVARCHAR(255) NULL,
          phone NVARCHAR(50) NULL,
          role NVARCHAR(20) NOT NULL DEFAULT 'user',
          isActive BIT NOT NULL DEFAULT 1,
          mfaSecret NVARCHAR(255) NULL,
          mfaEnabled BIT NOT NULL DEFAULT 0,
          googleId NVARCHAR(255) NULL,
          lastLogin DATETIME NULL,
          createdAt DATETIME NOT NULL DEFAULT GETDATE(),
          updatedAt DATETIME NOT NULL DEFAULT GETDATE()
        );
      END
    `);
  })();

  return ensureUsersTablePromise;
};

const getPoolOrThrow = () => {
  const pool = getSqlPool();
  if (!pool) {
    throw new Error('Database pool has not been initialized');
  }
  return pool;
};

const signAuthToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role || 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

if (!googleOAuthEnabled) {
  logger.warn('Google OAuth chua duoc cau hinh');
}

router.post(
  '/register',
  recaptchaMiddleware.verifyCaptcha,
  [
    body('email').isEmail().normalizeEmail(),
    body('fullName').trim().notEmpty(),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      .withMessage('Mat khau chua dat yeu cau bao mat')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      await ensureUsersTable();
      const pool = getPoolOrThrow();
      const { email, password, fullName } = req.body;

      const existingUser = await pool
        .request()
        .input('email', sql.NVarChar(255), email)
        .query('SELECT TOP 1 id FROM dbo.Users WHERE email = @email');

      if (existingUser.recordset.length > 0) {
        return res.status(400).json({ error: 'Email da ton tai' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const createdUser = await pool
        .request()
        .input('email', sql.NVarChar(255), email)
        .input('password', sql.NVarChar(255), hashedPassword)
        .input('fullName', sql.NVarChar(255), fullName)
        .query(`
          INSERT INTO dbo.Users (email, password, fullName, createdAt, updatedAt)
          OUTPUT INSERTED.id
          VALUES (@email, @password, @fullName, GETDATE(), GETDATE())
        `);

      logger.info(`User registered: ${email}`);
      res.status(201).json({
        message: 'Dang ky thanh cong',
        userId: createdUser.recordset[0].id
      });
    } catch (error) {
      logger.error('Register failed', { message: error?.message });
      res.status(500).json({ error: 'Khong the dang ky tai khoan' });
    }
  }
);

router.post('/login', recaptchaMiddleware.verifyCaptcha, async (req, res) => {
  try {
    await ensureUsersTable();
    const pool = getPoolOrThrow();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Vui long nhap email va mat khau' });
    }

    const result = await pool
      .request()
      .input('email', sql.NVarChar(255), email)
      .query(`
        SELECT TOP 1 id, email, password, role, fullName, phone, mfaEnabled, isActive
        FROM dbo.Users
        WHERE email = @email
      `);

    const user = result.recordset[0];
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Email/mat khau sai' });
    }

    const passwordMatched = await bcrypt.compare(password, user.password);
    if (!passwordMatched) {
      return res.status(401).json({ error: 'Email/mat khau sai' });
    }

    await pool
      .request()
      .input('id', sql.Int, user.id)
      .query('UPDATE dbo.Users SET lastLogin = GETDATE(), updatedAt = GETDATE() WHERE id = @id');

    res.json({
      token: signAuthToken(user),
      mfaEnabled: Boolean(user.mfaEnabled),
      message: 'Dang nhap OK'
    });
  } catch (error) {
    logger.error('Login failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the dang nhap' });
  }
});

router.post('/mfa/setup', authMiddleware.authenticateToken, async (req, res, next) => {
  try {
    await ensureUsersTable();
    const pool = getPoolOrThrow();
    const userResult = await pool
      .request()
      .input('id', sql.Int, req.user.id)
      .query('SELECT TOP 1 id, email FROM dbo.Users WHERE id = @id');

    const dbUser = userResult.recordset[0];
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = { ...req.user, ...dbUser };
    return mfaMiddleware.generateMFASecret(req, res, next);
  } catch (error) {
    logger.error('MFA setup init failed', { message: error?.message });
    return res.status(500).json({ error: 'Khong the tao MFA' });
  }
}, async (req, res) => {
  try {
    const pool = getPoolOrThrow();
    await pool
      .request()
      .input('id', sql.Int, req.user.id)
      .input('mfaSecret', sql.NVarChar(255), req.mfa.secret)
      .query(`
        UPDATE dbo.Users
        SET mfaSecret = @mfaSecret, updatedAt = GETDATE()
        WHERE id = @id
      `);

    res.json({
      qrCode: req.mfa.qr,
      secret: req.mfa.secret,
      message: 'Scan QR bang Google Authenticator'
    });
  } catch (error) {
    logger.error('MFA setup save failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the luu MFA' });
  }
});

router.post('/mfa/verify', authMiddleware.authenticateToken, async (req, res, next) => {
  try {
    const pool = getPoolOrThrow();
    const userResult = await pool
      .request()
      .input('id', sql.Int, req.user.id)
      .query('SELECT TOP 1 id, mfaSecret FROM dbo.Users WHERE id = @id');

    const dbUser = userResult.recordset[0];
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = { ...req.user, ...dbUser };
    return mfaMiddleware.verifyMFA(req, res, next);
  } catch (error) {
    logger.error('MFA verify init failed', { message: error?.message });
    return res.status(500).json({ error: 'Khong the xac minh MFA' });
  }
}, async (req, res) => {
  try {
    const pool = getPoolOrThrow();
    await pool
      .request()
      .input('id', sql.Int, req.user.id)
      .query('UPDATE dbo.Users SET mfaEnabled = 1, updatedAt = GETDATE() WHERE id = @id');

    res.json({ message: 'MFA kich hoat thanh cong' });
  } catch (error) {
    logger.error('MFA enable failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the kich hoat MFA' });
  }
});

router.get('/google', (req, res) => {
  res.status(501).json({ error: 'Google OAuth chua duoc cau hinh cho local flow nay' });
});

router.get('/google/callback', (req, res) => {
  res.status(501).json({ error: 'Google OAuth chua duoc cau hinh cho local flow nay' });
});

router.get('/me', authMiddleware.authenticateToken, async (req, res) => {
  try {
    await ensureUsersTable();
    const pool = getPoolOrThrow();
    const result = await pool
      .request()
      .input('id', sql.Int, req.user.id)
      .query(`
        SELECT TOP 1 id, email, fullName, role, phone
        FROM dbo.Users
        WHERE id = @id
      `);

    const user = result.recordset[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Get profile failed', { message: error?.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
