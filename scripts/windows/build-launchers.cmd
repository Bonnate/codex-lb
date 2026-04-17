@echo off
setlocal
pushd "%~dp0\..\.."

set "PYTHON=%CD%\.venv\Scripts\python.exe"
if not exist "%PYTHON%" (
  echo Missing Python launcher: "%PYTHON%"
  popd
  exit /b 1
)

"%PYTHON%" -m PyInstaller --noconfirm --clean --specpath build\pyinstaller --workpath build\pyinstaller\work --distpath dist --onefile --console --name run-codex-lb scripts\windows\run_launcher.py
if errorlevel 1 (
  popd
  exit /b 1
)

"%PYTHON%" -m PyInstaller --noconfirm --clean --specpath build\pyinstaller --workpath build\pyinstaller\work --distpath dist --onefile --console --name stop-codex-lb scripts\windows\stop_launcher.py
set "EXIT_CODE=%ERRORLEVEL%"

popd
exit /b %EXIT_CODE%