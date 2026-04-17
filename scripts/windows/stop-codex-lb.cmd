@echo off
setlocal
pushd "%~dp0\..\.."

set "PYTHON=%CD%\.venv\Scripts\python.exe"
if not exist "%PYTHON%" (
  echo Missing Python launcher: "%PYTHON%"
  popd
  exit /b 1
)

"%PYTHON%" "%CD%\scripts\windows\server_control.py" stop %*
set "EXIT_CODE=%ERRORLEVEL%"

popd
exit /b %EXIT_CODE%
