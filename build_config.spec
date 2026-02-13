# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for Klyp Video Downloader
Builds standalone executables for Linux, Windows, and macOS
"""

import sys
from pathlib import Path
from PyInstaller.utils.hooks import collect_data_files

block_cipher = None

# Application metadata
app_name = 'Klyp'
app_version = '1.1.0'

# Collect data files from packages
datas = [
    # Include assets (icons, images)
    ('assets', 'assets'),
]
datas += collect_data_files('babelfish')
datas += collect_data_files('subliminal')

# Collect all Python files
a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=[
        # GUI frameworks
        'ttkbootstrap',
        'tkinter',
        'tkinter.ttk',
        'tkinter.filedialog',
        'tkinter.messagebox',
        'PIL',
        'PIL._tkinter_finder',
        'PIL.Image',
        'PIL.ImageTk',
        # Video download
        'yt_dlp',
        'yt_dlp.extractor',
        'yt_dlp.downloader',
        # Search
        'duckduckgo_search',
        # FFmpeg
        'static_ffmpeg',
        # Subtitles
        'opensubtitlescom',
        'subliminal',
        'babelfish',
        'babelfish.converters',
        'babelfish.converters.alpha2',
        'babelfish.converters.alpha3b',
        'babelfish.converters.alpha3t',
        'babelfish.converters.name',
        'babelfish.converters.opensubtitles',
        'babelfish.converters.scope',
        'guessit',
        # Other dependencies
        'requests',
        'urllib3',
        'certifi',
        'charset_normalizer',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Exclude unnecessary packages to reduce size
        'matplotlib',
        'numpy',
        'pandas',
        'scipy',
        'pytest',
        'IPython',
        'jupyter',
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
    console=False,  # GUI application (no console window)
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='assets/klyp_logo.png' if Path('assets/klyp_logo.png').exists() else None,
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
