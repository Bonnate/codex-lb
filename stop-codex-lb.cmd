@echo off
setlocal
call "%~dp0scripts\windows\stop-codex-lb.cmd" %*
exit /b %ERRORLEVEL%
