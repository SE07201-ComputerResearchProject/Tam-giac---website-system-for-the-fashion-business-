const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
// Use msnodesqlv8 driver for Windows Integrated Security
const sql = require('mssql/msnodesqlv8');

let sqlPool = null;

const DB_AUTH_MODE = (process.env.DB_AUTH_MODE || 'sql').toLowerCase(); // 'sql' | 'windows'
const DB_ENCRYPT = (process.env.DB_ENCRYPT || 'true').toLowerCase() === 'true';
const DB_TRUST_CERT = (process.env.DB_TRUST_CERT || 'true').toLowerCase() === 'true';

const sequelizeOptions = {
  host: process.env.DB_HOST,
  ...(process.env.DB_INSTANCE ? {} : { port: Number(process.env.DB_PORT || 1433) }),
  dialect: 'mssql',
  dialectOptions: {
    // Passed through to tedious
    options: {
      ...(process.env.DB_INSTANCE ? { instanceName: process.env.DB_INSTANCE } : {}),
      encrypt: DB_ENCRYPT,
      trustServerCertificate: DB_TRUST_CERT
    }
  },
  logging: false, // Tắt Sequelize log, dùng Winston
  pool: {
    max: Number(process.env.DB_POOL_MAX || 10),
    min: Number(process.env.DB_POOL_MIN || 0),
    acquire: Number(process.env.DB_POOL_ACQUIRE_MS || 30000),
    idle: Number(process.env.DB_POOL_IDLE_MS || 10000)
  }
};

// Notes:
// - Sequelize (dialect mssql) uses `tedious` under the hood.
// - "Windows Authentication without credentials" (use current logged-in Windows user)
//   is NOT supported by tedious.
// - If you want Windows Auth here, provide NTLM credentials (domain/user/password).
let sequelize;
if (DB_AUTH_MODE === 'windows') {
  const userName = process.env.DB_WINDOWS_USER;
  const password = process.env.DB_WINDOWS_PASSWORD;
  const domain = process.env.DB_DOMAIN || '';

  sequelize = new Sequelize(process.env.DB_NAME, '', '', {
    ...sequelizeOptions,
    dialectOptions: {
      ...sequelizeOptions.dialectOptions,
      authentication: {
        type: 'ntlm',
        options: { userName, password, domain }
      }
    }
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    sequelizeOptions
  );
}

// Test kết nối
const connectDB = async () => {
  try {
    // Preferred path: Windows Integrated Security connection string
    if (process.env.DB_CONNECTION_STRING) {
      // Use explicit ODBC connection string (requires Driver={...})
      const odbcDriver = (process.env.DB_ODBC_DRIVER || 'SQL Server').trim();
      const serverPart = process.env.DB_INSTANCE
        ? `${process.env.DB_HOST}\\${process.env.DB_INSTANCE}`
        : process.env.DB_HOST;

      const odbcConnStr =
        `Driver={${odbcDriver}};` +
        `Server=${serverPart};` +
        `Database=${process.env.DB_NAME};` +
        `Trusted_Connection=Yes;` +
        `Encrypt=${DB_ENCRYPT ? 'Yes' : 'No'};` +
        `TrustServerCertificate=${DB_TRUST_CERT ? 'Yes' : 'No'};`;

      sqlPool = await sql.connect({ connectionString: odbcConnStr });
      logger.info('✅ Kết nối SQL Server thành công (Integrated Security)');
      return;
    }

    // Fallback: Sequelize authenticate (SQL login or NTLM)
    await sequelize.authenticate();
    logger.info('✅ Kết nối SQL Server thành công (Sequelize)');
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
module.exports.sql = sql;
module.exports.getSqlPool = () => sqlPool;
