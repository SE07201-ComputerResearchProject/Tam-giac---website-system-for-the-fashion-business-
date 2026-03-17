require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const path = require('path');

const { connectDB, sequelize, getSqlPool } = require('./config/database');
const redisClient = require('./config/redis');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');

// Logger Winston (bảo mật: không log sensitive data)
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// App Express
const app = express();

// Security Middleware (chống tấn công)
app.use(helmet()); // Headers bảo mật
app.use(cors({ origin: 'http://localhost:3001', credentials: true })); // Frontend React

// Rate limiting (chống DDoS brute-force)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // 100 req/IP
  message: 'Quá nhiều request, thử lại sau!'
});
app.use('/api/', limiter);

// Body parser với limit + JSON validate
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// DB health check (xác thực kết nối DB nhanh)
app.get('/health/db', async (req, res) => {
  try {
    const pool = getSqlPool();
    if (pool) {
      await pool.request().query('SELECT 1 AS ok');
    } else {
      await sequelize.query('SELECT 1 AS ok');
    }
    res.status(200).json({ db: 'OK', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('DB health check failed', { message: error?.message });
    res.status(500).json({ db: 'FAIL', error: 'DB connection failed' });
  }
});

// Routes API (JWT protected trừ auth)
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// 404 handler
app.use('*', (req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Không tìm thấy API' });
});

// Error handler (toàn cục, log lỗi)
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Lỗi server nội bộ' });
});

// Khởi động
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    if (redisClient) {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      logger.info('DB và Redis kết nối thành công');
    } else {
      logger.info('DB kết nối thành công (Redis đang tắt)');
    }
    
    app.listen(PORT, () => {
      logger.info(`Server chạy tại http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Lỗi khởi động server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
