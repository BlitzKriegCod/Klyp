# Platform Categories and Supported Sites

Klyp organizes 1,864+ supported platforms into logical categories for easy discovery and filtering. Each category has a unique icon and color for visual identification.

## Category Overview

### 🎬 Video Streaming (Red)
General video hosting and streaming platforms.

**Supported Platforms:**
- YouTube
- Vimeo
- Dailymotion
- Rumble
- OK.ru

**Best For:** General video content, vlogs, documentaries, entertainment

**Health Status:** Most platforms in this category are actively maintained and healthy.

---

### 🎌 Anime (Orange)
Platforms specializing in anime and Asian content.

**Supported Platforms:**
- Bilibili
- Niconico
- HiDive
- iQiyi
- Youku
- AnimeFLV* (experimental)
- JKAnime* (experimental)

**Best For:** Anime series, Asian dramas, manga adaptations

**Note:** Platforms marked with * have experimental support and may have limited functionality.

**Health Status:** Bilibili and Niconico are generally healthy. Regional restrictions may apply.

---

### 🎵 Music (Purple)
Music streaming and audio platforms.

**Supported Platforms:**
- SoundCloud
- Bandcamp
- Audiomack
- Mixcloud

**Best For:** Music tracks, DJ mixes, podcasts, audio content

**Health Status:** Generally healthy. Some platforms may require authentication for certain content.

---

### 📱 Social Media (Cyan)
Social media platforms with video content.

**Supported Platforms:**
- TikTok
- Instagram
- Twitter (X)
- Reddit

**Best For:** Short-form videos, viral content, social clips

**Health Status:** Variable. Social media platforms frequently update their APIs, which may affect extractor reliability.

**Note:** Some platforms may require authentication or have rate limits.

---

### 🎮 Gaming (Purple)
Gaming and live streaming platforms.

**Supported Platforms:**
- Twitch
- YouTube Gaming
- Facebook Gaming

**Best For:** Gaming streams, esports, gameplay videos, VODs

**Health Status:** Generally healthy. Live streams may have different download behavior than VODs.

---

### 🎙️ Podcasts (Green)
Podcast and audio content platforms.

**Supported Platforms:**
- Apple Podcasts
- Spotify
- SoundCloud

**Best For:** Podcast episodes, audio shows, interviews

**Health Status:** Variable. Some platforms may require authentication or have limited extractor support.

---

## Using Platform Categories

### In Search Results
Each search result displays a category icon and color indicator:
- Icon appears before the platform name
- Color coding helps quickly identify content type
- Hover over results to see full platform information

### Content Presets
Quick-access buttons use platform categories:
- Click a preset button (e.g., 🎌 Anime) to search across all platforms in that category
- Presets automatically optimize search keywords for the category
- Results are aggregated from multiple platforms

### Platform Health Indicators
Check the operational status of platforms:
- ✅ **Healthy**: Platform extractor working normally
- ⚠️ **Degraded**: Platform experiencing issues
- ❌ **Broken**: Platform extractor not working
- ❓ **Unknown**: No test data available

**To Check Health:**
1. Open the Search tab
2. Click the 🔄 button next to the Domain filter
3. Wait for health check to complete
4. View status indicators in the domain dropdown

### Filtering by Platform
Use the Domain filter to restrict searches:
1. Select a specific platform from the dropdown
2. Your search will only return results from that platform
3. Health status is shown next to each platform name

## Platform-Specific Features

### YouTube
- Full quality range support (4K, 1080p, 720p, etc.)
- Subtitle download support
- Playlist and channel support
- Live stream recording

### Bilibili
- Anime and Asian content specialization
- Multiple quality options
- Subtitle support (when available)
- Series detection for anime episodes

### SoundCloud
- Audio-only downloads
- Track and playlist support
- Artist and album information
- High-quality audio formats

### TikTok
- Short-form video downloads
- Watermark removal options
- User profile downloads
- Trending content discovery

### Twitch
- VOD downloads
- Clip downloads
- Live stream recording
- Chat replay (when available)

## Regional Considerations

### Content Availability
Some platforms have regional restrictions:
- **Bilibili**: Primarily Chinese content, may require VPN for some regions
- **Niconico**: Japanese content, some videos region-locked
- **iQiyi/Youku**: Asian content, regional restrictions common

### VPN Usage
If you encounter regional restrictions:
1. Use a VPN to access region-locked content
2. Configure proxy settings in Klyp Settings
3. Select appropriate region in search filters

## Quality Support by Category

### Video Streaming
- 4K (2160p): ✅ YouTube, ✅ Vimeo
- Full HD (1080p): ✅ Most platforms
- HD (720p): ✅ All platforms
- SD (480p): ✅ All platforms

### Anime
- Full HD (1080p): ✅ Bilibili, ✅ HiDive
- HD (720p): ✅ All platforms
- SD (480p): ✅ All platforms

### Music
- High Quality Audio: ✅ SoundCloud, ✅ Bandcamp
- Standard Quality: ✅ All platforms

### Social Media
- HD (720p): ✅ TikTok, ✅ Instagram
- SD (480p): ✅ All platforms

### Gaming
- Full HD (1080p): ✅ Twitch, ✅ YouTube Gaming
- HD (720p): ✅ All platforms
- Source Quality: ✅ Twitch (for VODs)

## Adding Custom Platforms

While Klyp supports 1,864+ platforms through yt-dlp, you can search for any platform:

1. Use the "All" option in the Domain filter
2. Enter the video URL directly in the search
3. Klyp will attempt to extract using yt-dlp
4. If successful, the video will be added to your queue

### Checking Platform Support
To verify if a specific platform is supported:
1. Visit: https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md
2. Search for the platform name
3. Check the platform's health status in Klyp

## Troubleshooting Platform Issues

### Platform Shows as Broken
1. Check if yt-dlp has been updated recently
2. Update yt-dlp: `pip install --upgrade yt-dlp`
3. Restart Klyp
4. Refresh platform health status

### No Results from Platform
1. Verify the platform is not region-locked
2. Check your internet connection
3. Try a different search query
4. Use the platform's website to verify content exists

### Download Fails
1. Check platform health status
2. Verify video URL is correct
3. Check if video requires authentication
4. Try updating yt-dlp

### Quality Not Available
1. Some platforms limit quality options
2. Check available qualities in metadata tooltip
3. Try a different quality setting
4. Verify your internet speed supports the quality

## Best Practices

### For Anime Content
- Use Bilibili or Niconico for best quality
- Enable series detection for batch downloads
- Use exact episode numbers in searches
- Check for subtitle availability

### For Music
- Use SoundCloud or Bandcamp for high-quality audio
- Enable audio extraction in settings
- Choose appropriate audio format (MP3, FLAC, etc.)
- Check artist and album metadata

### For Social Media
- Download content promptly (may be deleted)
- Check for watermarks on TikTok content
- Verify content is public before downloading
- Respect platform terms of service

### For Gaming Content
- Download VODs rather than live streams when possible
- Check for source quality on Twitch
- Use appropriate quality for file size management
- Consider storage space for long streams

## Platform Updates

Klyp's platform support is powered by yt-dlp, which is actively maintained:
- Regular updates add new platforms
- Existing platforms are fixed when broken
- Quality options are improved over time

**To Stay Updated:**
1. Update yt-dlp regularly: `pip install --upgrade yt-dlp`
2. Check Klyp releases for new features
3. Monitor platform health status
4. Report issues on GitHub

## Additional Resources

- [yt-dlp Documentation](https://github.com/yt-dlp/yt-dlp)
- [Supported Sites List](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)
- [Klyp GitHub Repository](https://github.com/yourusername/klyp)
- [Report Platform Issues](https://github.com/yourusername/klyp/issues)

---

**Note:** Platform availability and functionality may change over time as platforms update their APIs and policies. Always check the health status before attempting downloads from a specific platform.
