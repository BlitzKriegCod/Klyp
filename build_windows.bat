@echo off
REM Build script for OK.ru Video Downloader on Windows

echo ==========================================
echo OK.ru Video Downloader - Windows Build
echo ==========================================

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    exit /b 1
)

echo Python version:
python --version

REM Check if pip is installed
pip --version >nul 2>&1
if errorlevel 1 (
    echo Error: pip is not installed
    exit /b 1
)

REM Install dependencies
echo.
echo Installing dependencies...
pip install -r requirements.txt

REM Install PyInstaller if not already installed
echo.
echo Installing PyInstaller...
pip install pyinstaller

REM Clean previous builds
echo.
echo Cleaning previous builds...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

REM Build the application
echo.
echo Building application...
pyinstaller build_config.spec

REM Check if build was successful
if exist "dist\Klyp" (
    echo.
    echo ==========================================
    echo Build successful!
    echo Application location: dist\Klyp\
    echo ==========================================
    echo.
    echo To run the application:
    echo   cd dist\Klyp
    echo   Klyp.exe
    echo.
    
    REM Create a simple launcher batch file
    echo @echo off > dist\Klyp\run.bat
    echo cd /d "%%~dp0" >> dist\Klyp\run.bat
    echo start Klyp.exe >> dist\Klyp\run.bat
    
    echo A launcher script has been created: dist\Klyp\run.bat
) else (
    echo.
    echo Build failed!
    exit /b 1
)

REM Optional: Create installer using Inno Setup
echo.
set /p CREATE_INSTALLER="Do you want to create an installer? (requires Inno Setup) (y/n): "
if /i "%CREATE_INSTALLER%"=="y" (
    echo Creating installer script...
    
    REM Create Inno Setup script
    (
        echo [Setup]
        echo AppName=Klyp Video Downloader
        echo AppVersion=1.1.0
        echo DefaultDirName={pf}\Klyp
        echo DefaultGroupName=Klyp Video Downloader
        echo OutputDir=dist
        echo OutputBaseFilename=Klyp_Setup
        echo Compression=lzma
        echo SolidCompression=yes
        echo.
        echo [Files]
        echo Source: "dist\Klyp\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
        echo.
        echo [Icons]
        echo Name: "{group}\Klyp Video Downloader"; Filename: "{app}\Klyp.exe"
        echo Name: "{group}\Uninstall Klyp Video Downloader"; Filename: "{uninstallexe}"
        echo Name: "{commondesktop}\Klyp Video Downloader"; Filename: "{app}\Klyp.exe"
        echo.
        echo [Run]
        echo Filename: "{app}\Klyp.exe"; Description: "Launch Klyp Video Downloader"; Flags: nowait postinstall skipifsilent
    ) > installer_config.iss
    
    echo Installer script created: installer_config.iss
    echo.
    echo To build the installer, run:
    echo   "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer_config.iss
    echo.
    echo Or manually compile installer_config.iss with Inno Setup
)

echo.
echo Build process complete!
pause
