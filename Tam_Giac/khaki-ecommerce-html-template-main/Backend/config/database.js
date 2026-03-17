const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 1433,
    dialect: 'mssql',
    dialectOptions: {
      // SQL Server options (chống injection tự động qua Sequelize)
      options: {
        encrypt: true, // Azure? true; local false
        trustServerCertificate: true // Local dev
      }
    },
    logging: false, // Tắt Sequelize log, dùng Winston
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test kết nối
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Kết nối SQL Server thành công');
  } catch (error) {
    logger.error('❌ Lỗi kết nối DB:', error);
    throw error;
  }
};

// Models sync (dev only)
const syncDB = async () => {
  await sequelize.sync({ alter: true }); // Cẩn thận production: { force: false }
  logger.info('✅ DB models synced');
};

module.exports = { sequelize, connectDB, syncDB };
module.exports.Sequelize = Sequelize;
