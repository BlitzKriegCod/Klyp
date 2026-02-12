# Klyp - Universal Video Downloader

**Klyp** is a powerful, modern, and universal video downloader application. Originally designed for OK.ru, it has evolved into a versatile tool capable of downloading video and audio from thousands of sites supported by `yt-dlp`.

## Features

### Core Features
- **Universal Downloading**: Support for 1,864+ video platforms via `yt-dlp`
- **Advanced Search**: Integrated DuckDuckGo video search with comprehensive filters
- **Audio Extraction**: Convert video to MP3, M4A, WAV, or FLAC
- **Post-Processing**: Embed thumbnails, metadata, and use **SponsorBlock** to skip sponsored segments
- **Queue Management**: Batch downloading with pause/resume capabilities
- **Modern UI**: Sleek interface built with `ttkbootstrap` with dark/light themes
- **Cross-Platform**: Runs on Linux, Windows, and macOS

### Enhanced Search Capabilities

#### Content Presets
Quick-access buttons for specialized content searches:
- 🎌 **Anime**: Bilibili, Niconico, HiDive
- 🎵 **Music**: SoundCloud, Bandcamp, Audiomack
- 🎮 **Gaming**: Twitch, YouTube Gaming
- 🎙️ **Podcasts**: SoundCloud, Mixcloud, Spotify
- 📱 **Social Media**: TikTok, Instagram, Twitter, Reddit
- 📚 **Education**: TED, YouTube educational content

#### Platform Categories
Visual indicators for easy platform identification:
- Video Streaming (YouTube, Vimeo, Dailymotion, OK.ru)
- Anime (Bilibili, Niconico, HiDive, iQiyi)
- Music (SoundCloud, Bandcamp, Audiomack)
- Social Media (TikTok, Instagram, Twitter)
- Gaming (Twitch, YouTube Gaming)
- Podcasts (Apple Podcasts, Spotify)

#### Smart Search Operators
Advanced search syntax for precise queries:
- **Exact Phrase**: Match exact phrases in quotes
- **Exclusions**: Exclude terms with minus operator
- **OR Logic**: Combine multiple search terms
- **Site Filter**: Restrict search to specific domains
- **File Type**: Filter by file extension
- **In Title/URL**: Search within title or URL

#### Quality Pre-filtering
Filter search results by video quality before downloading:
- 4K (2160p)
- Full HD (1080p)
- HD (720p)
- SD (480p)
- Audio Only

#### Metadata Enrichment
Automatic enrichment of search results with:
- View count and like count
- Upload date
- Video description preview
- Tags
- Available quality options

#### Smart Playlist Detection
Automatic detection and batch download of episodic content:
- Detects series keywords (season, episode, part, vol)
- Searches for all episodes automatically
- Batch add with episode selection dialog

#### Trending & Recommendations
- **Trending Tab**: Discover popular content by category
- **Recommended Tab**: Personalized suggestions based on download history
- 15-minute cache for trending content

#### Batch Platform Comparison
Compare search results across multiple platforms:
- Side-by-side comparison view
- Ranking by quality, views, and recency
- Quick add to queue from comparison

#### Platform Health Status
Real-time indicators showing platform extractor status:
- ✅ Healthy: Platform working normally
- ⚠️ Degraded: Platform experiencing issues
- ❌ Broken: Platform extractor not working
- ❓ Unknown: No test data available

## Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/klyp.git
    cd klyp
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Run the application:
    ```bash
    python main.py
    ```

## Configuration
Settings are stored in `~/.config/klyp/settings.json`.
Downloads are saved to `~/Downloads/Klyp` by default.

### Search Enhancement Settings
- `search_enable_enrichment`: Enable metadata enrichment (default: true)
- `search_enable_quality_filter`: Enable quality pre-filtering (default: true)
- `search_enable_recommendations`: Enable personalized recommendations (default: true)
- `search_cache_ttl`: Cache time-to-live in seconds (default: 3600)
- `search_max_parallel_enrichment`: Max parallel enrichment workers (default: 5)
- `search_show_platform_health`: Show platform health indicators (default: true)

## Supported Platforms
Klyp supports 1,864+ platforms through yt-dlp, including:
- **Video Streaming**: YouTube, Vimeo, Dailymotion, Rumble, OK.ru
- **Anime**: Bilibili, Niconico, HiDive, iQiyi, Youku
- **Music**: SoundCloud, Bandcamp, Audiomack, Mixcloud
- **Social Media**: TikTok, Instagram, Twitter, Reddit
- **Gaming**: Twitch, YouTube Gaming, Facebook Gaming
- **Podcasts**: Apple Podcasts, Spotify, SoundCloud

For a complete list of supported sites, visit: https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md

## License
MIT License
