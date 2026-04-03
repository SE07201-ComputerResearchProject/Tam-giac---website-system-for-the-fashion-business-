-- Script: create_db_and_user.sql
-- Creates a fresh database and an application SQL login/user with db_owner on that database.
-- Run this in SSMS as an administrator (Windows Authentication) in a New Query window.

SET NOCOUNT ON;

-- Parameters (change if you want different names/passwords)
DECLARE @dbName SYSNAME = N'KhakiEcommerceDB_fresh';
DECLARE @loginName SYSNAME = N'khaki_app';
DECLARE @loginPassword NVARCHAR(128) = N'Khaki@2026';

-- 1) Create database if not exists
IF DB_ID(@dbName) IS NULL
BEGIN
    DECLARE @sql NVARCHAR(MAX) = N'CREATE DATABASE ' + QUOTENAME(@dbName) + ';';
    EXEC sp_executesql @sql;
    PRINT CONCAT('Database ', @dbName, ' created.');
END
ELSE
    PRINT CONCAT('Database ', @dbName, ' already exists.');

-- 2) Create server login if not exists
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = @loginName)
BEGIN
    DECLARE @createLogin NVARCHAR(MAX) = N'CREATE LOGIN ' + QUOTENAME(@loginName) + N' WITH PASSWORD = ' + QUOTENAME(@loginPassword, '''') + N', CHECK_POLICY = OFF;';
    EXEC sp_executesql @createLogin;
    PRINT CONCAT('Login ', @loginName, ' created.');
END
ELSE
    PRINT CONCAT('Login ', @loginName, ' already exists.');

-- 3) Create database user and grant role
DECLARE @useDb NVARCHAR(200) = N'USE ' + QUOTENAME(@dbName) + N';';
EXEC sp_executesql @useDb;

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = @loginName)
BEGIN
    DECLARE @createUser NVARCHAR(MAX) = N'CREATE USER ' + QUOTENAME(@loginName) + N' FOR LOGIN ' + QUOTENAME(@loginName) + N';';
    EXEC sp_executesql @createUser;
    PRINT CONCAT('Database user ', @loginName, ' created in ', @dbName, '.');

    DECLARE @addRole NVARCHAR(MAX) = N'ALTER ROLE db_owner ADD MEMBER ' + QUOTENAME(@loginName) + N';';
    EXEC sp_executesql @addRole;
    PRINT CONCAT('Added ', @loginName, ' to db_owner on ', @dbName, '.');
END
ELSE
    PRINT CONCAT('Database user ', @loginName, ' already exists in ', @dbName, '.');

PRINT 'Done.';
