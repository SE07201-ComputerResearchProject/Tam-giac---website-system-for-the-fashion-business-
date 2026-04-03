require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

const { connectDB, sequelize, getSqlPool } = require('./config/database');
const redisClient = require('./config/redis');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const chatRoutes = require('./routes/chat');

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

const app = express();
const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const PORT = Number(process.env.PORT || 3000);
const DB_OPTIONAL = (process.env.DB_OPTIONAL || 'false').toLowerCase() === 'true';

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || localOriginPattern.test(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS blocked for this origin'));
    },
    credentials: true
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Qua nhieu request, thu lai sau!'
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    dbOptional: DB_OPTIONAL,
    timestamp: new Date().toISOString()
  });
});

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
    logger.error('DB health check failed', { message: error && error.message });
    res.status(500).json({ db: 'FAIL', error: 'DB connection failed' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);

app.use('*', (req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Khong tim thay API' });
});

app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Loi server noi bo' });
});

const startServer = async () => {
  try {
    let dbReady = false;

    try {
      await connectDB();
      dbReady = true;
    } catch (dbError) {
      if (!DB_OPTIONAL) {
        throw dbError;
      }

      logger.warn('DB local chua san sang, backend se chay o che do khong phu thuoc DB', {
        message: dbError && dbError.message
      });
    }

    if (redisClient) {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }

      logger.info(dbReady ? 'DB va Redis ket noi thanh cong' : 'Redis ket noi thanh cong (DB dang bi bo qua)');
    } else {
      logger.info(dbReady ? 'DB ket noi thanh cong (Redis dang tat)' : 'Backend chay khong DB (Redis dang tat)');
    }

    app.listen(PORT, () => {
      logger.info(`Server chay tai http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Loi khoi dong server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
