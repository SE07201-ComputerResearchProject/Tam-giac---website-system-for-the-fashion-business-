@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%Backend"
set "FRONTEND_DIR=%ROOT%"

echo Starting Tam Giac auth dev servers...
echo.

start "TamGiac Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && node server.js"
start "TamGiac Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && node dev-static-server.js"

echo Frontend preview: http://127.0.0.1:3001/register.html
echo Login page:       http://127.0.0.1:3001/login.html
echo DB proof demo:    http://127.0.0.1:3001/demo-db-proof.html
echo Backend health:   http://localhost:3002/health
echo.
echo Keep both opened terminal windows running while testing.

endlocal
