/* Sequelize CLI config (JS) — reads from environment variables */
const DB_ENCRYPT = (process.env.DB_ENCRYPT || 'false').toLowerCase() === 'true';
const DB_TRUST_CERT = (process.env.DB_TRUST_CERT || 'true').toLowerCase() === 'true';

const base = {
  username: process.env.DB_USER || 'khaki_app',
  password: process.env.DB_PASSWORD || 'Khaki@2026',
  database: process.env.DB_NAME || 'KhakiEcommerceDB_fresh',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 1433),
  dialect: 'mssql',
  dialectOptions: {
    options: {
      encrypt: DB_ENCRYPT,
      trustServerCertificate: DB_TRUST_CERT
    }
  },
  logging: false
};

module.exports = {
  development: { ...base },
  test: { ...base },
  production: { ...base }
};
