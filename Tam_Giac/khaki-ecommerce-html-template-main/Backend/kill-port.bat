@echo off
SETLOCAL ENABLEDELAYEDEXPANSION

REM Kiểm tra xem người dùng đã cung cấp số cổng chưa
IF "%~1"=="" (
    ECHO Vui long cung cap so cong can dong.
    ECHO Vi du: %~nx0 3002
    GOTO :EOF
)

SET port=%1
ECHO Tim va dong tien trinh dang su dung cong %port%...

FOR /F "tokens=5" %%A IN ('netstat -aon ^| findstr ":%port%" ^| findstr "LISTENING"') DO (
    SET pid=%%A
    IF NOT "!pid!"=="0" (
        ECHO -> Da tim thay tien trinh voi PID: !pid!. Dang dung...
        taskkill /F /PID !pid!
        GOTO :DONE
    )
)

ECHO -> Khong tim thay tien trinh nao dang su dung cong %port%.

:DONE
ECHO Hoan tat.
ENDLOCAL