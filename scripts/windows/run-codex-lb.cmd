@echo off
setlocal
pushd "%~dp0\..\.."

if exist "%CD%\.env.local" (
  for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%CD%\.env.local") do (
    if /i "%%A"=="HOST" set "HOST=%%B"
    if /i "%%A"=="PORT" set "PORT=%%B"
    if /i "%%A"=="SSL_CERTFILE" set "SSL_CERTFILE=%%B"
    if /i "%%A"=="SSL_KEYFILE" set "SSL_KEYFILE=%%B"
  )
)

set "PYTHON=%CD%\.venv\Scripts\python.exe"
if not exist "%PYTHON%" (
  echo Missing Python launcher: "%PYTHON%"
  popd
  exit /b 1
)

"%PYTHON%" "%CD%\scripts\windows\server_control.py" run %*
set "EXIT_CODE=%ERRORLEVEL%"

popd
exit /b %EXIT_CODE%
