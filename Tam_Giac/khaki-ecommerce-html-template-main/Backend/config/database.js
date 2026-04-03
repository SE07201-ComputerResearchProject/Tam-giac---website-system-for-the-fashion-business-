const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
const sql = require('mssql/tedious');

let sqlPool = null;

const trimQuoted = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  const text = String(value).trim();
  if (
    text.length >= 2 &&
    ((text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'")))
  ) {
    return text.slice(1, -1).trim();
  }

  return text;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const splitConnectionString = (connectionString = '') => {
  const parts = [];
  let current = '';
  let quoteChar = '';

  for (const char of connectionString) {
    if (char === '"' || char === "'") {
      if (!quoteChar) {
        quoteChar = char;
      } else if (quoteChar === char) {
        quoteChar = '';
      }
    }

    if (char === ';' && !quoteChar) {
      if (current.trim()) {
        parts.push(current);
      }
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current);
  }

  return parts;
};

const parseSqlConnectionString = (connectionString = '') => {
  const settings = {};

  for (const part of splitConnectionString(connectionString)) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = part.slice(0, separatorIndex).trim().toLowerCase();
    const value = trimQuoted(part.slice(separatorIndex + 1));

    if (key) {
      settings[key] = value;
    }
  }

  return settings;
};

const parseBooleanish = (value, defaultValue) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return defaultValue;
  }

  switch (trimQuoted(value).toLowerCase()) {
    case '1':
    case 'true':
    case 'yes':
    case 'sspi':
      return true;
    case '0':
    case 'false':
    case 'no':
      return false;
    default:
      return defaultValue;
  }
};

const pickConnectionValue = (settings, ...keys) => {
  for (const key of keys) {
    const normalizedKey = key.toLowerCase();
    if (settings[normalizedKey] !== undefined && settings[normalizedKey] !== '') {
      return settings[normalizedKey];
    }
  }

  return '';
};

const parseServerValue = (serverValue) => {
  const normalizedValue = trimQuoted(serverValue).replace(/^tcp:/i, '').trim();
  if (!normalizedValue) {
    return {};
  }

  let host = normalizedValue;
  let instance = '';
  let port;

  const instanceSeparatorIndex = normalizedValue.indexOf('\\');
  if (instanceSeparatorIndex >= 0) {
    host = normalizedValue.slice(0, instanceSeparatorIndex).trim();
    const instancePart = normalizedValue.slice(instanceSeparatorIndex + 1).trim();
    const portSeparatorIndex = instancePart.indexOf(',');

    if (portSeparatorIndex >= 0) {
      instance = instancePart.slice(0, portSeparatorIndex).trim();
      const parsedPort = Number(instancePart.slice(portSeparatorIndex + 1).trim());
      port = Number.isFinite(parsedPort) ? parsedPort : undefined;
    } else {
      instance = instancePart;
    }

    return { host, instance, port };
  }

  const portSeparatorIndex = normalizedValue.indexOf(',');
  if (portSeparatorIndex >= 0) {
    host = normalizedValue.slice(0, portSeparatorIndex).trim();
    const parsedPort = Number(normalizedValue.slice(portSeparatorIndex + 1).trim());
    port = Number.isFinite(parsedPort) ? parsedPort : undefined;
  }

  return { host, instance, port };
};

const appendConnectionStringValue = (connectionString, key, value) => {
  if (!value) {
    return connectionString;
  }

  const keyPattern = new RegExp(`${escapeRegExp(key)}\\s*=`, 'i');
  if (keyPattern.test(connectionString)) {
    return connectionString;
  }

  const base = connectionString.trim().replace(/;+$/, '');
  return base ? `${base};${key}=${value};` : `${key}=${value};`;
};

const rawConnectionString = trimQuoted(process.env.DB_CONNECTION_STRING || '');
const connectionSettings = parseSqlConnectionString(rawConnectionString);
const parsedServer = parseServerValue(
  pickConnectionValue(
    connectionSettings,
    'data source',
    'server',
    'address',
    'addr',
    'network address'
  )
);

const DB_AUTH_MODE = (
  process.env.DB_AUTH_MODE ||
  (parseBooleanish(
    pickConnectionValue(connectionSettings, 'integrated security', 'trusted_connection'),
    false
  )
    ? 'windows'
    : 'sql')
).toLowerCase();
const DB_ENCRYPT = parseBooleanish(
  pickConnectionValue(connectionSettings, 'encrypt'),
  (process.env.DB_ENCRYPT || 'true').toLowerCase() === 'true'
);
const DB_TRUST_CERT = parseBooleanish(
  pickConnectionValue(connectionSettings, 'trustservercertificate'),
  (process.env.DB_TRUST_CERT || 'true').toLowerCase() === 'true'
);
const DB_HOST = parsedServer.host || process.env.DB_HOST;
const DB_INSTANCE = parsedServer.instance || process.env.DB_INSTANCE || '';
const DB_PORT = parsedServer.port || Number(process.env.DB_PORT || 1433);
const DB_NAME =
  pickConnectionValue(connectionSettings, 'initial catalog', 'database') || process.env.DB_NAME;
const DB_USER = pickConnectionValue(connectionSettings, 'user id', 'uid', 'user') || process.env.DB_USER;
const DB_PASSWORD =
  pickConnectionValue(connectionSettings, 'password', 'pwd') || process.env.DB_PASSWORD;
const DB_POOL_MAX = Number(process.env.DB_POOL_MAX || 10);
const DB_POOL_MIN = Number(process.env.DB_POOL_MIN || 0);
const DB_POOL_ACQUIRE_MS = Number(process.env.DB_POOL_ACQUIRE_MS || 30000);
const DB_POOL_IDLE_MS = Number(process.env.DB_POOL_IDLE_MS || 10000);
const DB_ODBC_DRIVER = trimQuoted(process.env.DB_ODBC_DRIVER || 'SQL Server') || 'SQL Server';
const USE_INTEGRATED_SECURITY = parseBooleanish(
  pickConnectionValue(connectionSettings, 'integrated security', 'trusted_connection'),
  false
);
const WINDOWS_CREDS_AVAILABLE = Boolean(
  process.env.DB_WINDOWS_USER && process.env.DB_WINDOWS_PASSWORD
);

const dbRuntimeConfig = {
  authMode: DB_AUTH_MODE,
  host: DB_HOST,
  port: DB_INSTANCE ? undefined : DB_PORT,
  instance: DB_INSTANCE || undefined,
  database: DB_NAME,
  user: DB_USER,
  encrypt: DB_ENCRYPT,
  trustServerCertificate: DB_TRUST_CERT,
  hasConnectionString: Boolean(rawConnectionString)
};

const sequelizeOptions = {
  host: DB_HOST,
  ...(DB_INSTANCE ? {} : { port: Number(DB_PORT || 1433) }),
  dialect: 'mssql',
  dialectOptions: {
    options: {
      ...(DB_INSTANCE ? { instanceName: DB_INSTANCE } : {}),
      encrypt: DB_ENCRYPT,
      trustServerCertificate: DB_TRUST_CERT
    }
  },
  logging: false,
  pool: {
    max: DB_POOL_MAX,
    min: DB_POOL_MIN,
    acquire: DB_POOL_ACQUIRE_MS,
    idle: DB_POOL_IDLE_MS
  }
};

let sequelize;
if (DB_AUTH_MODE === 'windows') {
  sequelize = new Sequelize(DB_NAME, '', '', {
    ...sequelizeOptions,
    dialectOptions: {
      ...sequelizeOptions.dialectOptions,
      authentication: {
        type: 'ntlm',
        options: {
          userName: process.env.DB_WINDOWS_USER,
          password: process.env.DB_WINDOWS_PASSWORD,
          domain: process.env.DB_DOMAIN || ''
        }
      }
    }
  });
} else {
  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, sequelizeOptions);
}

const buildSqlConfig = () => ({
  user: DB_USER,
  password: DB_PASSWORD,
  server: DB_HOST,
  ...(DB_INSTANCE ? {} : { port: Number(DB_PORT || 1433) }),
  database: DB_NAME,
  options: {
    ...(DB_INSTANCE ? { instanceName: DB_INSTANCE } : {}),
    encrypt: DB_ENCRYPT,
    trustServerCertificate: DB_TRUST_CERT
  },
  pool: {
    max: DB_POOL_MAX,
    min: DB_POOL_MIN,
    idleTimeoutMillis: DB_POOL_IDLE_MS
  },
  connectionTimeout: DB_POOL_ACQUIRE_MS
});

const buildWindowsConnectionString = () => {
  if (!rawConnectionString) {
    const serverPart = DB_INSTANCE ? `${DB_HOST}\\${DB_INSTANCE}` : DB_HOST;

    return (
      `Driver={${DB_ODBC_DRIVER}};` +
      `Server=${serverPart};` +
      `Database=${DB_NAME};` +
      'Trusted_Connection=Yes;' +
      `Encrypt=${DB_ENCRYPT ? 'Yes' : 'No'};` +
      `TrustServerCertificate=${DB_TRUST_CERT ? 'Yes' : 'No'};`
    );
  }

  let connectionString = rawConnectionString;
  connectionString = appendConnectionStringValue(connectionString, 'Driver', `{${DB_ODBC_DRIVER}}`);
  connectionString = appendConnectionStringValue(connectionString, 'Database', DB_NAME);
  connectionString = appendConnectionStringValue(connectionString, 'Trusted_Connection', 'Yes');
  connectionString = appendConnectionStringValue(
    connectionString,
    'Encrypt',
    DB_ENCRYPT ? 'Yes' : 'No'
  );
  connectionString = appendConnectionStringValue(
    connectionString,
    'TrustServerCertificate',
    DB_TRUST_CERT ? 'Yes' : 'No'
  );

  return connectionString;
};

const connectDB = async () => {
  try {
    if (sqlPool && (sqlPool.connected || sqlPool.connecting)) {
      return sqlPool;
    }

    if (DB_AUTH_MODE === 'windows' || USE_INTEGRATED_SECURITY) {
      const nativeSql = require('mssql/msnodesqlv8');
      sqlPool = await nativeSql.connect({
        connectionString: buildWindowsConnectionString()
      });

      if (WINDOWS_CREDS_AVAILABLE) {
        await sequelize.authenticate();
      } else {
        logger.warn(
          'Skipping Sequelize authenticate because Windows auth needs DB_WINDOWS_USER and DB_WINDOWS_PASSWORD'
        );
      }

      logger.info('Connected to SQL Server successfully (Integrated Security)');
      return sqlPool;
    }

    sqlPool = await sql.connect(buildSqlConfig());
    await sequelize.authenticate();
    logger.info('Connected to SQL Server successfully (SQL login)');
    return sqlPool;
  } catch (error) {
    logger.error('DB connection error:', error);
    throw error;
  }
};

const closeSqlPool = async () => {
  if (!sqlPool) {
    return;
  }

  await sqlPool.close();
  sqlPool = null;
};

const syncDB = async () => {
  await sequelize.sync({ alter: true });
  logger.info('DB models synced');
};

module.exports = { sequelize, connectDB, closeSqlPool, syncDB, dbRuntimeConfig };
module.exports.Sequelize = Sequelize;
module.exports.sql = sql;
module.exports.getSqlPool = () => sqlPool;
