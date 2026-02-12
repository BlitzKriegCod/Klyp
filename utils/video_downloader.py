"""
Video Downloader for Klyp Video Downloader.
Handles video info extraction and downloading using yt-dlp.
"""

import yt_dlp
import logging
from pathlib import Path
from typing import Optional, Callable, Dict, Any
from models import VideoInfo

# Try to import static_ffmpeg for portable ffmpeg binary
try:
    import static_ffmpeg
    import logging
    temp_logger = logging.getLogger("Klyp.StaticFFmpeg")
    FFMPEG_PATH = static_ffmpeg.run.get_or_fetch_platform_executables_else_raise()[0]
    FFMPEG_BIN_DIR = str(Path(FFMPEG_PATH).parent.absolute())
    temp_logger.info(f"Detected portable ffmpeg at: {FFMPEG_PATH}")
    temp_logger.info(f"Using ffmpeg bin directory: {FFMPEG_BIN_DIR}")
except (ImportError, Exception) as e:
    FFMPEG_BIN_DIR = None
    import logging
    logging.getLogger("Klyp").warning(f"static-ffmpeg not available or failed: {e}")


class VideoDownloader:
    """Handles individual video downloads using yt-dlp."""
    
    def __init__(self, cookies_file: Optional[str] = None):
        """
        Initialize VideoDownloader.
        
        Args:
            cookies_file: Path to cookies file for authentication.
        """
        self.cookies_file = cookies_file
        self.logger = logging.getLogger("Klyp.VideoDownloader")
    
    def extract_info(self, url: str) -> Dict[str, Any]:
        """
        Extract video or playlist information from URL.
        
        Args:
            url: URL to extract info from.
        
        Returns:
            Dictionary containing metadata. If playlist, contains 'entries'.
        
        Raises:
            Exception: If extraction fails.
        """
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': 'in_playlist', # Better for fast playlist extraction
        }
        
        if self.cookies_file:
            ydl_opts['cookiefile'] = self.cookies_file
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                is_playlist = 'entries' in info and info['entries']
                
                if is_playlist:
                    # It's a playlist, return generic playlist info
                    return {
                        'type': 'playlist',
                        'title': info.get('title', 'Playlist'),
                        'entries': info['entries'],
                        'count': len(info['entries']),
                        'url': url
                    }
                
                # It's a single video
                # Extract available qualities
                formats = info.get('formats', [])
                qualities = set()
                for fmt in formats:
                    height = fmt.get('height')
                    if height:
                        qualities.add(f"{height}p")
                
                available_qualities = sorted(list(qualities), 
                                            key=lambda x: int(x[:-1]) if x[:-1].isdigit() else 0, 
                                            reverse=True)
                
                # Create VideoInfo object
                video_info = VideoInfo(
                    url=url,
                    title=info.get('title', 'Unknown'),
                    thumbnail=info.get('thumbnail', ''),
                    duration=info.get('duration', 0),
                    author=info.get('uploader', 'Unknown'),
                    available_qualities=available_qualities,
                    filename=info.get('title', 'video')
                )
                
                return {
                    'type': 'video',
                    'video_info': video_info
                }
        except Exception as e:
            self.logger.error(f"Extraction failed: {str(e)}")
            raise Exception(f"Failed to extract info: {str(e)}")
    
    def check_subtitles_available(self, url: str) -> bool:
        """
        Check if subtitles are available for a video.
        
        Args:
            url: Video URL to check for subtitles.
        
        Returns:
            True if subtitles are available, False otherwise.
        """
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'listsubtitles': True,
        }
        
        if self.cookies_file:
            ydl_opts['cookiefile'] = self.cookies_file
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                # Check for subtitles or automatic captions
                subtitles = info.get('subtitles', {})
                automatic_captions = info.get('automatic_captions', {})
                
                return bool(subtitles or automatic_captions)
        except Exception:
            return False

    def download(self, 
                 video_info: VideoInfo, 
                 download_path: str,
                 progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None) -> str:
        """
        Download a video.
        
        Args:
            video_info: VideoInfo object containing video metadata.
            download_path: Directory path where video will be saved.
            progress_callback: Optional callback function for progress updates.
        
        Returns:
            Path to the downloaded file.
        
        Raises:
            Exception: If download fails.
        """
    def _get_ydl_opts(self, 
                     download_path: str, 
                     video_info: VideoInfo, 
                     writesubtitles: bool = False,
                     progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None) -> Dict[str, Any]:
        """
        Construct yt-dlp options based on settings and parameters.
        """
        # Prepare output template
        output_template = str(Path(download_path) / f"{video_info.filename}.%(ext)s")
        
        # Base options
        ydl_opts = {
            'outtmpl': output_template,
            'quiet': False,
            'no_warnings': False,
        }
        
        # Add ffmpeg location if available
        if FFMPEG_BIN_DIR:
            ydl_opts['ffmpeg_location'] = FFMPEG_BIN_DIR
        
        # Subtitles
        if writesubtitles:
            ydl_opts.update({
                'writesubtitles': True,
                'writeautomaticsub': True,
                'subtitlesformat': 'srt',
            })
            
        # Quality selection
        # Check if user selected "audio" from quality dialog
        if video_info.selected_quality and video_info.selected_quality.lower() == "audio":
            # User wants audio only from quality dialog
            ydl_opts['format'] = 'bestaudio/best'
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }]
        elif video_info.selected_quality and video_info.selected_quality != "best":
            quality_height = video_info.selected_quality.replace('p', '')
            ydl_opts['format'] = f'bestvideo[height<={quality_height}]+bestaudio/best[height<={quality_height}]'
        else:
            ydl_opts['format'] = 'bestvideo+bestaudio/best'
        
        # Cookies
        if self.cookies_file and Path(self.cookies_file).exists():
            ydl_opts['cookiefile'] = self.cookies_file
            
        # Progress hook
        if progress_callback:
            def progress_hook(d):
                progress_callback(d)
            ydl_opts['progress_hooks'] = [progress_hook]
            
        # --- Advanced Features from Settings ---
        # Note: We need to access SettingsManager here. 
        # Ideally passed in __init__, but for now we can instantiate it or modify DownloadManager to pass config.
        # Since we don't have direct access to app/settings here easily without refactoring,
        # we'll assume the VideoDownloader is initialized with these configs or we load them.
        # Let's import SettingsManager here to load current config.
        
        from controllers.settings_manager import SettingsManager
        settings = SettingsManager()
        
        # Audio Extraction from settings (only if not already set by quality selection)
        if settings.get("extract_audio", False) and video_info.selected_quality != "audio":
            audio_format = settings.get("audio_format", "mp3")
            ydl_opts['format'] = 'bestaudio/best'
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': audio_format,
                'preferredquality': '192',
            }]
            # Update output template for audio
            ydl_opts['outtmpl'] = str(Path(download_path) / f"{video_info.filename}.%(ext)s")
            
        # Post-Processing
        postprocessors = ydl_opts.get('postprocessors', [])
        
        if settings.get("embed_thumbnail", False):
            ydl_opts['writethumbnail'] = True
            postprocessors.append({'key': 'EmbedThumbnail'})
            
        if settings.get("embed_metadata", False):
            ydl_opts['addmetadata'] = True
            
        if settings.get("sponsorblock_enabled", False):
            postprocessors.append({
                'key': 'SponsorBlock',
                'categories': ['sponsor', 'intro', 'outro', 'selfpromo', 'preview', 'filler', 'interaction', 'music_offtopic'],
                'action': 'remove'
            })
            
        if postprocessors:
            ydl_opts['postprocessors'] = postprocessors
            
        # Authentication (Cookies from settings take precedence if method arg is None, or we merge?)
        # method arg self.cookies_file was set via set_cookies_file
        # Settings might have a path.
        settings_cookies = settings.get("cookies_path", "")
        if settings_cookies and Path(settings_cookies).exists():
            ydl_opts['cookiefile'] = settings_cookies

        return ydl_opts

    def download(self, 
                 video_info: VideoInfo, 
                 download_path: str,
                 progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None) -> str:
        """
        Download a video.
        """
        # Ensure download directory exists
        Path(download_path).mkdir(parents=True, exist_ok=True)
        
        # Get options
        ydl_opts = self._get_ydl_opts(download_path, video_info, writesubtitles=False, progress_callback=progress_callback)
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_info.url, download=True)
                filename = ydl.prepare_filename(info)
                # If audio extraction, extension changes
                if 'postprocessors' in ydl_opts:
                    for pp in ydl_opts['postprocessors']:
                        if pp['key'] == 'FFmpegExtractAudio':
                            filename = str(Path(filename).with_suffix(f".{pp['preferredcodec']}"))
                return filename
        except Exception as e:
            raise Exception(f"Failed to download video: {str(e)}")
    
    def download_with_subtitles(self,
                                video_info: VideoInfo,
                                download_path: str,
                                progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None) -> str:
        """
        Download a video with subtitles if available.
        """
        # Ensure download directory exists
        Path(download_path).mkdir(parents=True, exist_ok=True)
        
        # Get options
        ydl_opts = self._get_ydl_opts(download_path, video_info, writesubtitles=True, progress_callback=progress_callback)
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_info.url, download=True)
                filename = ydl.prepare_filename(info)
                # If audio extraction, extension changes
                if 'postprocessors' in ydl_opts:
                    for pp in ydl_opts['postprocessors']:
                        if pp['key'] == 'FFmpegExtractAudio':
                            filename = str(Path(filename).with_suffix(f".{pp['preferredcodec']}"))
                return filename
        except Exception as e:
            raise Exception(f"Failed to download video with subtitles: {str(e)}")
