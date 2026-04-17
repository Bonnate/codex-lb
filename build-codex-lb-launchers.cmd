@echo off
setlocal
call "%~dp0scripts\windows\build-launchers.cmd" %*
exit /b %ERRORLEVEL%
