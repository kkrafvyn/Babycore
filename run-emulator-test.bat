@echo off
setlocal
cd /d "%~dp0"

set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "ANDROID_SDK_ROOT=%LOCALAPPDATA%\Android\Sdk"
set "ANDROID_AVD_HOME=E:\Android\avd"

echo.
echo ============================================
echo  Cradlyn - Emulator test (images on E:)
echo ============================================
echo.
echo SDK tools: %ANDROID_HOME%
echo AVDs:      %ANDROID_AVD_HOME%
echo Images:    E:\Android\system-images
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js not found in PATH. Install Node.js first.
  pause
  exit /b 1
)

call npm run run:aab:emulator
set EXIT_CODE=%ERRORLEVEL%

echo.
if %EXIT_CODE%==0 (
  echo Success. Cradlyn should be running on the emulator.
) else (
  echo Setup failed. See messages above.
)
echo.
pause
exit /b %EXIT_CODE%
