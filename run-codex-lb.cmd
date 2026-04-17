@echo off
setlocal
call "%~dp0scripts\windows\run-codex-lb.cmd" %*
exit /b %ERRORLEVEL%
