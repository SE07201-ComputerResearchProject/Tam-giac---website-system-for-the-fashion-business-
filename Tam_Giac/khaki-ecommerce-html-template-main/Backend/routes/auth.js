const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');
const authMiddleware = require('../middleware/auth');
const mfaMiddleware = require('../middleware/mfa');
const recaptchaMiddleware = require('../middleware/recaptcha');
const { getSqlPool, sql } = require('../config/database');

const router = express.Router();

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
          password_hash NVARCHAR(255) NOT NULL,
          full_name NVARCHAR(255) NULL,
          phone NVARCHAR(50) NULL,
          role NVARCHAR(20) NOT NULL DEFAULT 'user',
          is_verified BIT NOT NULL DEFAULT 0,
          is_active BIT NOT NULL DEFAULT 1,
          created_at DATETIME NOT NULL DEFAULT GETDATE()
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
      const email = String(req.body.email || '').trim().toLowerCase();
      const password = String(req.body.password || '');
      const fullName = String(req.body.fullName || '').trim();

      const existingUser = await pool
        .request()
        .input('email', sql.NVarChar(255), email)
        .query('SELECT TOP 1 id FROM dbo.Users WHERE email = @email');

      if (existingUser.recordset.length > 0) {
        return res.status(400).json({ error: 'Email da ton tai' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const createdUser = await pool
        .request()
        .input('email', sql.NVarChar(255), email)
        .input('passwordHash', sql.NVarChar(255), passwordHash)
        .input('fullName', sql.NVarChar(255), fullName)
        .query(`
          INSERT INTO dbo.Users (
            email,
            password_hash,
            full_name,
            role,
            is_verified,
            is_active,
            created_at
          )
          OUTPUT INSERTED.id
          VALUES (
            @email,
            @passwordHash,
            @fullName,
            'user',
            0,
            1,
            GETDATE()
          )
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
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Vui long nhap email va mat khau' });
    }

    const result = await pool
      .request()
      .input('email', sql.NVarChar(255), email)
      .query(`
        SELECT TOP 1
          id,
          email,
          password_hash AS passwordHash,
          role,
          full_name AS fullName,
          phone,
          is_active AS isActive
        FROM dbo.Users
        WHERE email = @email
      `);

    const user = result.recordset[0];
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Email/mat khau sai' });
    }

    const passwordMatched = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatched) {
      return res.status(401).json({ error: 'Email/mat khau sai' });
    }

    res.json({
      token: signAuthToken(user),
      mfaEnabled: false,
      message: 'Dang nhap OK'
    });
  } catch (error) {
    logger.error('Login failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the dang nhap' });
  }
});

router.post(
  '/mfa/setup',
  authMiddleware.authenticateToken,
  async (req, res) => {
    return res.status(501).json({ error: 'MFA chua duoc bat cho schema hien tai' });
  }
);

router.post(
  '/mfa/verify',
  authMiddleware.authenticateToken,
  async (req, res) => {
    return res.status(501).json({ error: 'MFA chua duoc bat cho schema hien tai' });
  }
);

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
        SELECT TOP 1
          id,
          email,
          full_name AS fullName,
          role,
          phone
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

router.put(
  '/profile',
  authMiddleware.authenticateToken,
  [
    body('fullName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Ho ten khong hop le'),
    body('phone')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ max: 50 })
      .withMessage('So dien thoai khong hop le')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      await ensureUsersTable();
      const pool = getPoolOrThrow();
      const fullName = req.body.fullName ? String(req.body.fullName).trim() : null;
      const phone = req.body.phone ? String(req.body.phone).trim() : null;

      await pool
        .request()
        .input('id', sql.Int, req.user.id)
        .input('fullName', sql.NVarChar(255), fullName)
        .input('phone', sql.NVarChar(50), phone)
        .query(`
          UPDATE dbo.Users
          SET
            full_name = COALESCE(@fullName, full_name),
            phone = @phone
          WHERE id = @id
        `);

      const result = await pool
        .request()
        .input('id', sql.Int, req.user.id)
        .query(`
          SELECT TOP 1
            id,
            email,
            full_name AS fullName,
            role,
            phone
          FROM dbo.Users
          WHERE id = @id
        `);

      res.json({
        message: 'Cap nhat tai khoan thanh cong',
        user: result.recordset[0]
      });
    } catch (error) {
      logger.error('Update profile failed', { message: error?.message });
      res.status(500).json({ error: 'Khong the cap nhat tai khoan' });
    }
  }
);

module.exports = router;
