@echo off
setlocal
cd /d "%~dp0"

set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
set "APK=%~dp0releases\android\cradlyn-1.0.8-v10-universal.apk"
set "PKG=com.cradlyn.app"

echo.
echo ============================================
echo  Install Cradlyn on connected Android phone
echo ============================================
echo.

if not exist "%ADB%" (
  echo adb not found. Install Android SDK platform-tools first.
  pause
  exit /b 1
)

if not exist "%APK%" (
  echo Release APK not found: %APK%
  pause
  exit /b 1
)

echo Waiting for phone... Unlock Samsung and tap Allow on USB debugging prompt.
"%ADB%" wait-for-device
timeout /t 2 /nobreak >nul

echo.
echo Connected devices:
"%ADB%" devices -l
echo.

echo Installing Cradlyn 1.0.8...
"%ADB%" install -r "%APK%"
if errorlevel 1 (
  echo Install failed. If app already installed, try uninstalling old Cradlyn first.
  pause
  exit /b 1
)

echo Launching Cradlyn...
"%ADB%" shell monkey -p %PKG% -c android.intent.category.LAUNCHER 1 >nul 2>&1

echo.
echo Done. Cradlyn should be open on your phone.
echo Test: sign in, Care Copilot AI, baby data sync.
echo.
pause
