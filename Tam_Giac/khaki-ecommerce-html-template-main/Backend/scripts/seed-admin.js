require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcrypt');
const { connectDB, closeSqlPool, getSqlPool, sequelize, sql } = require('../config/database');

const DEFAULT_EMAIL = 'admin@tamgiac.local';
const DEFAULT_PASSWORD = 'KhakiAdmin@2026';
const DEFAULT_NAME = 'Tam Giac Admin';

const adminEmail = String(process.argv[2] || process.env.ADMIN_EMAIL || DEFAULT_EMAIL)
  .trim()
  .toLowerCase();
const adminPassword = String(process.argv[3] || process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD).trim();
const adminName = String(process.argv[4] || process.env.ADMIN_NAME || DEFAULT_NAME).trim();

const ensureUsersTable = async (pool) => {
  await pool.request().batch(`
    IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Users (
        id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
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
};

const main = async () => {
  try {
    await connectDB();
    const pool = getSqlPool();

    if (!pool) {
      throw new Error('SQL pool is not ready');
    }

    await ensureUsersTable(pool);

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const existing = await pool
      .request()
      .input('email', sql.NVarChar(255), adminEmail)
      .query('SELECT TOP 1 id FROM dbo.Users WHERE email = @email');

    if (existing.recordset.length > 0) {
      const userId = existing.recordset[0].id;

      await pool
        .request()
        .input('id', sql.UniqueIdentifier, userId)
        .input('passwordHash', sql.NVarChar(255), passwordHash)
        .input('fullName', sql.NVarChar(255), adminName)
        .query(`
          UPDATE dbo.Users
          SET
            password_hash = @passwordHash,
            full_name = @fullName,
            role = 'admin',
            is_active = 1
          WHERE id = @id
        `);

      console.log(
        JSON.stringify(
          {
            action: 'updated',
            email: adminEmail,
            password: adminPassword,
            fullName: adminName,
            role: 'admin',
            id: userId
          },
          null,
          2
        )
      );
    } else {
      const created = await pool
        .request()
        .input('email', sql.NVarChar(255), adminEmail)
        .input('passwordHash', sql.NVarChar(255), passwordHash)
        .input('fullName', sql.NVarChar(255), adminName)
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
            'admin',
            1,
            1,
            GETDATE()
          )
        `);

      console.log(
        JSON.stringify(
          {
            action: 'created',
            email: adminEmail,
            password: adminPassword,
            fullName: adminName,
            role: 'admin',
            id: created.recordset[0].id
          },
          null,
          2
        )
      );
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await closeSqlPool().catch(() => {});
    await sequelize.close().catch(() => {});
  }
};

main();
