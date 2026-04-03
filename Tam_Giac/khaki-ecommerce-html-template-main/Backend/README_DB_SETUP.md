# Database Setup for Tam Giac Backend

This file contains the steps to create a fresh SQL Server database and an application SQL login, and how to run the backend locally.

1) Open SQL Server Management Studio (SSMS) and connect using an account with sufficient rights (Windows Authentication / sysadmin).

2) Open **New Query** and run the script `sql/create_db_and_user.sql` (right-click the file in Explorer or copy-paste into a new query). The defaults in the script are:

- Database: `KhakiEcommerceDB_fresh`
- Login: `khaki_app`
- Password: `Khaki@2026`

If you want different names/passwords edit the top of `create_db_and_user.sql` before running.

3) Verify you can connect with the new SQL login in SSMS:

- Server: `localhost`
- Authentication: `SQL Server Authentication`
- User name: `khaki_app`
- Password: `Khaki@2026`
- Database: `KhakiEcommerceDB_fresh`

4) Ensure `Backend/.env` matches these credentials (already updated). File location:
`Backend/.env`

5) Start the backend (from project `Backend` folder). Recommended quick command:

```powershell
cd "...\Backend"
node server.js
```

If you prefer `npm run dev` and PowerShell blocks scripts, run as Administrator once:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

6) After backend starts, check logs in the terminal. If connection succeeds you will see: `✅ Kết nối SQL Server thành công (Sequelize)`.

If you see login errors, verify the SQL login and password, and ensure SQL Server is configured for SQL Server and Windows Authentication (Mixed Mode):

- In SSMS: Right-click server → Properties → Security → choose **SQL Server and Windows Authentication mode** → OK → restart SQL Server service.

7) Security note: do not commit `.env` with real credentials to version control. Use secrets management for production.
