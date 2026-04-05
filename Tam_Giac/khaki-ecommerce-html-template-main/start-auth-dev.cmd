@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%Backend"

echo Starting Tam Giac web server...
echo.

echo Main website:     http://127.0.0.1:3002
echo Register page:    http://127.0.0.1:3002/register.html
echo Login page:       http://127.0.0.1:3002/login.html
echo Admin page:       http://127.0.0.1:3002/admin/product.html
echo Backend health:   http://127.0.0.1:3002/health
echo.
echo Keep this window open while testing.
echo.

cd /d "%BACKEND_DIR%"
node server.js

echo.
echo Server stopped with exit code %ERRORLEVEL%.
echo If the website did not open, check:
echo %BACKEND_DIR%\logs\combined.log
echo %BACKEND_DIR%\logs\error.log
pause

endlocal
