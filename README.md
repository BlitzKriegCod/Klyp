# Klyp

<div align="center">

![Klyp Logo](assets/klyp_logo.png)

**GUI application for downloading videos from multiple platforms make whit IA**

[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-beta-yellow.svg)](https://github.com/BlitzKriegCod/Klyp)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Supported Platforms](#supported-platforms)
- [Usage](#usage)
- [Building from Source](#building-from-source)
- [Contributing](#contributing)
- [License](#license)
- [Credits](#credits)

---

## Overview

Klyp is a desktop application for downloading videos from multiple platforms. Built with Python and featuring a GUI interface powered by ttkbootstrap, it provides tools for managing video downloads.

The application supports quality selection, subtitle downloads, audio extraction, and other common download features through its integration with yt-dlp.

### Key Features

- **Multi-Platform Support**: Download from YouTube, Vimeo, TikTok, SoundCloud, and other platforms supported by yt-dlp
- **GUI Interface**: Desktop interface with dark and light themes
- **Queue Management**: Organize and manage your downloads
- **Integrated Search**: Find videos using DuckDuckGo search
- **Download Options**: Subtitles, audio extraction, quality selection, and metadata embedding

---

## Features

### Core Functionality


#### Multi-Platform Video Downloads

- Download videos from platforms supported by yt-dlp
- Platform detection and extractor selection via yt-dlp
- Support for playlists and channels (where available)
- Batch URL processing from text files

#### Integrated Video Search

- Built-in search using DuckDuckGo
- Search filters (duration, upload date, quality)
- Platform-specific search presets
- Search result display with metadata
- Platform comparison

#### Queue Management

- Add multiple videos to download queue
- Manage downloads (start, stop, remove)
- Sequential or parallel download modes (up to 3 concurrent)
- Auto-resume interrupted downloads on restart
- Export/import queue as JSON

#### Quality & Format Control

- Select video quality based on available formats (4K, 1080p, 720p, 480p, etc.)
- Extract audio only in available formats
- Automatic format selection for best quality
- Custom quality preferences

#### Subtitle Support

- Download subtitles in multiple languages
- Dedicated subtitles-only download screen
- SRT format output

#### Download History

- Track all completed downloads
- Search through download history
- Quick access to downloaded files

#### Advanced Options

- Cookie-based authentication for private content
- Proxy support (HTTP, HTTPS, SOCKS)
- Thumbnail embedding
- Metadata embedding
- SponsorBlock integration for YouTube
- Custom download directory per video

#### User Interface

- Dark and light theme support
- Desktop notifications for completed downloads
- Progress tracking
- Error messages with details
- Thread-safe architecture

---

## Installation

### Prerequisites

- **Python 3.8 or higher**
- **FFmpeg** (automatically installed via static-ffmpeg package)
- **Operating System**: Linux, Windows, or macOS

### Quick Install

1. **Clone the repository**

```bash
git clone https://github.com/BlitzKriegCod/Klyp.git
cd Klyp
```

2. **Install dependencies**

```bash
pip install -r requirements.txt
```

3. **Run the application**

```bash
python main.py
```

### Detailed Installation

#### Linux

```bash
# Install Python 3.8+ (if not already installed)
sudo apt update
sudo apt install python3 python3-pip

# Clone and setup
git clone https://github.com/BlitzKriegCod/Klyp.git
cd Klyp
pip3 install -r requirements.txt

# Run
python3 main.py
```

#### Windows

```bash
# Ensure Python 3.8+ is installed from python.org

# Clone and setup
git clone https://github.com/BlitzKriegCod/Klyp.git
cd Klyp
pip install -r requirements.txt

# Run
python main.py
```

#### macOS

```bash
# Install Python 3.8+ via Homebrew
brew install python@3.11

# Clone and setup
git clone https://github.com/BlitzKriegCod/Klyp.git
cd klyp
pip3 install -r requirements.txt

# Run
python3 main.py
```

Note: There is no dedicated build script for macOS yet. Use the Linux build script as reference.

### Dependencies

Klyp relies on the following Python packages:

- **ttkbootstrap** (≥1.10.1) - Modern themed Tkinter widgets
- **yt-dlp** (≥2023.0.0) - Video download engine
- **Pillow** (≥10.0.0) - Image processing for thumbnails
- **plyer** (≥2.1.0) - Desktop notifications
- **duckduckgo-search** (≥6.1.0) - Integrated search functionality
- **static-ffmpeg** (≥3.0.0) - Portable FFmpeg for media processing
- **subliminal** (≥2.1.0) - Subtitle download support

All dependencies are automatically installed via `requirements.txt`.

---

## Supported Platforms

Klyp supports video downloads from multiple platforms through yt-dlp. Common platforms include:

### Video Streaming

- **YouTube** - Videos, playlists, channels, live streams
- **Vimeo** - Standard and premium content
- **Dailymotion** - Videos and playlists
- **OK.ru** - Odnoklassniki videos
- **Rumble** - Alternative video platform
- **Twitch** - VODs and clips
- **Facebook** - Public videos
- **And many more...**

### Anime & Asian Content

- **Bilibili** - Chinese video platform
- **Niconico** - Japanese video sharing
- **HiDive** - Anime streaming
- **iQiyi** - Chinese streaming service
- **Youku** - Chinese video platform
- **Crunchyroll** - Anime streaming (with authentication)

### Music Platforms

- **SoundCloud** - Music and podcasts
- **Bandcamp** - Independent music
- **Audiomack** - Music streaming
- **Mixcloud** - DJ mixes and radio shows
- **Spotify** - Podcasts (with authentication)

### 📱 Social Media

- **TikTok** - Short-form videos
- **Instagram** - Posts, reels, stories (public)
- **Twitter/X** - Video tweets
- **Reddit** - Video posts
- **LinkedIn** - Video content

### 🎮 Gaming

- **Twitch** - Live streams and VODs
- **YouTube Gaming** - Gaming content
- **Facebook Gaming** - Gaming streams

### 🎙️ Podcasts

- **Apple Podcasts** - Podcast episodes
- **Spotify** - Podcast content
- **SoundCloud** - Podcast shows

### 🌐 Generic Support

Klyp uses yt-dlp as its download engine. For a complete list of supported platforms, see the [yt-dlp documentation](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md).

---

## Usage

### Basic Workflow

1. **Launch Klyp**
   ```bash
   python main.py
   ```

2. **Add Videos to Queue**
   - Paste video URL in the Home screen
   - Click "Add to Queue"
   - Or use Search to find videos

3. **Configure Download Options**
   - Select video quality
   - Enable subtitle download if needed
   - Choose download directory

4. **Start Downloads**
   - Navigate to Queue screen
   - Click "Start All" to begin downloading
   - Monitor progress in real-time

### Adding Videos to Queue

#### From URL (Home Screen)

1. Copy video URL from your browser
2. Paste into the URL input field
3. Click "Fetch Info" to preview video details
4. Select quality and options
5. Click "Add to Queue"

#### From Search (Search Screen)

1. Navigate to Search tab
2. Enter search query
3. Apply filters (platform, duration, quality)
4. Click search icon
5. Select video from results
6. Click "Add to Queue"

#### Batch Import

1. Create a text file with one URL per line
2. Go to Queue screen
3. Click "Import URLs"
4. Select your text file
5. All URLs will be added to queue

### Quality Selection

Quality options depend on what's available for each video (provided by yt-dlp):

- **Best**: Automatically selects highest available quality
- **4K (2160p)**: Ultra HD quality (if available)
- **1080p**: Full HD (if available)
- **720p**: HD (if available)
- **480p**: Standard definition (if available)
- **360p**: Low quality (if available)
- **Audio Only**: Extract audio in best available quality

### Search Features

#### Basic Search

Simply enter keywords and click search. Results include:
- Video title and author
- Duration and upload date
- Platform and category
- Thumbnail preview

#### Advanced Search

Use search operators for precise results:

- **Exact phrase**: Use quotes `"exact phrase"`
- **Exclude words**: Use minus `-unwanted`
- **Site-specific**: `site:youtube.com query`
- **OR logic**: `term1 OR term2`



### Download Management

#### Queue Operations

- **Start All**: Begin downloading all queued items
- **Stop All**: Pause all active downloads
- **Clear Queue**: Remove all items from queue
- **Remove Item**: Delete specific item from queue

#### Download Modes

Configure in Settings:

- **Sequential**: Download one video at a time
- **Parallel**: Download up to 3 videos simultaneously

### Subtitle Downloads

1. Navigate to Subtitles screen
2. Paste video URL
3. Select desired languages
4. Choose subtitle format (SRT recommended)
5. Click "Download Subtitles"

Subtitles are saved in the same directory as videos.

### Settings Configuration

Access Settings screen to customize:

#### General Settings
- Download directory
- Theme (dark/light)
- Download mode (sequential/parallel)
- Auto-resume on startup
- Desktop notifications

#### Advanced Settings
- Proxy configuration
- Cookie file for authentication
- Audio extraction format
- Thumbnail embedding
- Metadata embedding
- SponsorBlock integration
- Debug mode

---

## Building from Source

Klyp can be compiled into standalone executables for distribution.

### Prerequisites

- PyInstaller installed: `pip install pyinstaller`
- All dependencies installed
- Platform-specific build tools

### Linux Build

```bash
# Make build script executable
chmod +x build_linux.sh

# Run build script
./build_linux.sh

# Executable will be in dist/klyp/
```

The build script:
- Compiles Python code
- Bundles all dependencies
- Includes assets and icons
- Creates single-folder distribution

### Windows Build

```bash
# Run build script
build_windows.bat

# Executable will be in dist\klyp\
```

The build script:
- Uses PyInstaller with Windows-specific options
- Bundles Python runtime
- Includes all dependencies
- Creates executable with icon

### Build Configuration

Both scripts use `build_config.spec` for PyInstaller configuration:

- Entry point: `main.py`
- Hidden imports for dynamic modules
- Data files (assets, icons)
- Binary exclusions for size optimization
- Platform-specific options

### Distribution

After building:

1. Test the executable in `dist/klyp/`
2. Create archive: `tar -czf klyp-linux.tar.gz dist/klyp/` (Linux) or zip (Windows)
3. Distribute the archive
4. Users extract and run the executable

---

## Contributing

We welcome contributions to Klyp! Whether it's bug reports, feature requests, or code contributions, your help is appreciated.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Test thoroughly**
5. **Commit with clear messages**: `git commit -m 'Add amazing feature'`
6. **Push to your fork**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Reporting Issues

Found a bug? Please open an issue with:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- System information (OS, Python version)
- Relevant log files from `~/.config/klyp/logs/`

### Feature Requests

Have an idea? Open an issue with:

- Clear description of the feature
- Use case and benefits
- Proposed implementation (if applicable)

### Development Guidelines

- Follow PEP 8 style guide
- Add type hints to new code
- Write docstrings for functions and classes
- Include tests for new features
- Update documentation as needed

For detailed development guidelines, see [CONTRIBUTING.md](Docs/CONTRIBUTING.md).

---

## License

Klyp is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2024 Klyp Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

See LICENSE file for full license text (to be added).

---

## Credits

Klyp is built on the shoulders of giants. Special thanks to:

### Core Dependencies

- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** - Video download engine
- **[ttkbootstrap](https://github.com/israel-dryer/ttkbootstrap)** - Themed Tkinter widgets for the UI
- **[FFmpeg](https://ffmpeg.org/)** - Media processing and conversion
- **[Pillow](https://python-pillow.org/)** - Image processing library
- **[DuckDuckGo Search](https://github.com/deedy5/duckduckgo_search)** - Search integration

### Additional Libraries

- **plyer** - Cross-platform desktop notifications
- **subliminal** - Subtitle download functionality
- **static-ffmpeg** - Portable FFmpeg distribution

### Community

Thanks to all contributors and users.

---

## Support

- **Documentation**: Check the [Docs](Docs/) folder for detailed guides
- **Issues**: Report bugs on [GitHub Issues](https://github.com/BlitzKriegCod/klyp/issues)

---

<div align="center">

**Made with ❤️ by BlitzKriegCod**

[⬆ Back to Top](#klyp)

</div>
