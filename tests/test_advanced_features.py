
import unittest
from unittest.mock import patch, MagicMock
from pathlib import Path
from utils.video_downloader import VideoDownloader
from models import VideoInfo

class TestAdvancedFeatures(unittest.TestCase):
    def setUp(self):
        # Create downloader with empty settings dict
        self.downloader = VideoDownloader(settings={})
        self.video_info = VideoInfo(
            url="https://youtube.com/watch?v=123",
            title="Test Video",
            filename="test_video",
            author="Test Author",
            duration="10:00"
        )
        self.download_path = "/tmp/downloads"

    def test_audio_extraction_settings(self):
        # Create downloader with audio extraction settings
        settings = {
            "extract_audio": True,
            "audio_format": "m4a",
            "embed_thumbnail": False,
            "embed_metadata": False,
            "sponsorblock_enabled": False,
            "cookies_path": ""
        }
        downloader = VideoDownloader(settings=settings)

        opts = downloader._get_ydl_opts(self.download_path, self.video_info)
        
        self.assertEqual(opts['format'], 'bestaudio/best')
        self.assertTrue(any(pp['key'] == 'FFmpegExtractAudio' and pp['preferredcodec'] == 'm4a' for pp in opts['postprocessors']))

    def test_post_processing_settings(self):
        # Create downloader with post-processing settings
        settings = {
            "extract_audio": False,
            "embed_thumbnail": True,
            "embed_metadata": True,
            "sponsorblock_enabled": True,
            "cookies_path": ""
        }
        downloader = VideoDownloader(settings=settings)

        opts = downloader._get_ydl_opts(self.download_path, self.video_info)
        
        self.assertTrue(opts.get('writethumbnail'))
        self.assertTrue(opts.get('addmetadata'))
        self.assertTrue(any(pp['key'] == 'EmbedThumbnail' for pp in opts['postprocessors']))
        self.assertTrue(any(pp['key'] == 'SponsorBlock' for pp in opts['postprocessors']))

    def test_cookies_setting(self):
        # Create downloader with cookies settings
        settings = {
            "extract_audio": False,
            "embed_thumbnail": False,
            "embed_metadata": False,
            "sponsorblock_enabled": False,
            "cookies_path": "/tmp/cookies.txt"
        }
        downloader = VideoDownloader(settings=settings)
        
        # Mock Path.exists to return True for cookies file
        with patch('pathlib.Path.exists', return_value=True):
            opts = downloader._get_ydl_opts(self.download_path, self.video_info)
            self.assertEqual(opts.get('cookiefile'), "/tmp/cookies.txt")

if __name__ == '__main__':
    unittest.main()
