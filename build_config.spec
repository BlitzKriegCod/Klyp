# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for OK.ru Video Downloader
Builds standalone executables for Linux and Windows
"""

import sys
from pathlib import Path

block_cipher = None

# Application metadata
app_name = 'OKVideoDownloader'
app_version = '1.0.0'

# Collect all Python files
a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        # Include any data files if needed
    ],
    hiddenimports=[
        'ttkbootstrap',
        'yt_dlp',
        'tkinter',
        'tkinter.ttk',
        'tkinter.filedialog',
        'tkinter.messagebox',
        'PIL',
        'PIL._tkinter_finder',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'matplotlib',
        'numpy',
        'pandas',
        'scipy',
        'pytest',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name=app_name,
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # Set to False for GUI application
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name=app_name,
)
