# Building Klyp Video Downloader

This document describes how to build standalone executables and packages for Klyp Video Downloader.

## Prerequisites

### All Platforms
- Python 3.8 or higher
- pip (Python package installer)
- All dependencies from `requirements.txt`

### Linux
- PyInstaller
- dpkg (for creating .deb packages)
- Standard build tools

### Windows
- PyInstaller
- Inno Setup (optional, for creating installers)

## Building on Linux

### Quick Build

1. Make the build script executable:
   ```bash
   chmod +x build_linux.sh
   ```

2. Run the build script:
   ```bash
   ./build_linux.sh
   ```

3. The application will be built in `dist/OKVideoDownloader/`

### Manual Build

1. Install dependencies:
   ```bash
   pip3 install -r requirements.txt
   pip3 install pyinstaller
   ```

2. Build with PyInstaller:
   ```bash
   pyinstaller build_config.spec
   ```

3. Run the application:
   ```bash
   cd dist/OKVideoDownloader
   ./OKVideoDownloader
   ```

### Creating a .deb Package

The build script will prompt you to create a .deb package. If you choose yes:

1. The package will be created in `dist/ok-video-downloader_1.0.0.deb`

2. Install the package:
   ```bash
   sudo dpkg -i dist/ok-video-downloader_1.0.0.deb
   ```

3. Run from anywhere:
   ```bash
   ok-video-downloader
   ```

4. Uninstall:
   ```bash
   sudo dpkg -r ok-video-downloader
   ```

## Building on Windows

### Quick Build

1. Run the build script:
   ```cmd
   build_windows.bat
   ```

2. The application will be built in `dist\OKVideoDownloader\`

### Manual Build

1. Install dependencies:
   ```cmd
   pip install -r requirements.txt
   pip install pyinstaller
   ```

2. Build with PyInstaller:
   ```cmd
   pyinstaller build_config.spec
   ```

3. Run the application:
   ```cmd
   cd dist\OKVideoDownloader
   OKVideoDownloader.exe
   ```

### Creating an Installer

The build script will prompt you to create an installer configuration. If you choose yes:

1. Install Inno Setup from https://jrsoftware.org/isdl.php

2. Compile the installer:
   ```cmd
   "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer_config.iss
   ```

3. The installer will be created as `dist\OKVideoDownloader_Setup.exe`

## Build Configuration

The build is configured in `build_config.spec`. You can modify this file to:

- Add or exclude Python modules
- Include additional data files
- Change application metadata
- Adjust compression settings

### Key Configuration Options

```python
# Application name
app_name = 'OKVideoDownloader'

# Hidden imports (modules not automatically detected)
hiddenimports=[
    'ttkbootstrap',
    'yt_dlp',
    # Add more as needed
]

# Excluded modules (to reduce size)
excludes=[
    'matplotlib',
    'numpy',
    # Add more as needed
]

# Console mode (False for GUI, True for console)
console=False
```

## Troubleshooting

### Missing Modules

If the built application fails with "ModuleNotFoundError":

1. Add the missing module to `hiddenimports` in `build_config.spec`
2. Rebuild the application

### Large File Size

To reduce the executable size:

1. Add unnecessary modules to `excludes` in `build_config.spec`
2. Enable UPX compression (already enabled by default)
3. Remove unused dependencies from `requirements.txt`

### Linux: Permission Denied

If you get permission errors:

```bash
chmod +x dist/OKVideoDownloader/OKVideoDownloader
```

### Windows: Antivirus False Positives

Some antivirus software may flag PyInstaller executables. This is a known issue. You can:

1. Add an exception in your antivirus software
2. Submit the executable to your antivirus vendor for analysis
3. Sign the executable with a code signing certificate

## Distribution

### Linux

Distribute either:
- The `dist/OKVideoDownloader/` directory (users run `./OKVideoDownloader`)
- The `.deb` package (users install with `dpkg -i`)

### Windows

Distribute either:
- The `dist\OKVideoDownloader\` directory (users run `OKVideoDownloader.exe`)
- The installer `.exe` (users run the installer)

## Version Management

To update the version number:

1. Update `app_version` in `build_config.spec`
2. Update version in build scripts (`build_linux.sh`, `build_windows.bat`)
3. Update version in package control files

## Additional Notes

- The first build may take several minutes
- Subsequent builds are faster due to caching
- Clean builds can be forced by deleting `build/` and `dist/` directories
- Log files are stored in `~/.config/ok-video-downloader/logs/` (Linux) or `%USERPROFILE%\.config\ok-video-downloader\logs\` (Windows)
