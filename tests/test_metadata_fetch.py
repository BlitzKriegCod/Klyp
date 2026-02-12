
import unittest
import time
from unittest.mock import MagicMock, patch
from controllers.download_manager import DownloadManager
from controllers.queue_manager import QueueManager
from models import VideoInfo, DownloadTask

class TestMetadataFetch(unittest.TestCase):
    
    def setUp(self):
        self.queue_manager = QueueManager()
        self.download_manager = DownloadManager(self.queue_manager)
        
        # Mock VideoDownloader
        self.mock_downloader = MagicMock()
        self.download_manager.video_downloader = self.mock_downloader
        
        # Add a task to queue
        self.video_info = VideoInfo(url="https://example.com/video", title="Initial Title")
        self.task = self.queue_manager.add_task(self.video_info)
        
    def test_fetch_metadata_success(self):
        # Setup mock return value
        enhanced_info = VideoInfo(
            url="https://example.com/video",
            title="Enhanced Title",
            author="Awesome Creator",
            duration=120
        )
        self.mock_downloader.extract_info.return_value = enhanced_info
        
        # Trigger fetch
        self.download_manager.fetch_metadata(self.task.id)
        
        # Wait for thread to complete (simple sleep for test)
        time.sleep(0.5)
        
        # Verify queue updated
        updated_task = self.queue_manager.get_task(self.task.id)
        self.assertEqual(updated_task.video_info.title, "Enhanced Title")
        self.assertEqual(updated_task.video_info.author, "Awesome Creator")
        self.assertEqual(updated_task.video_info.duration, 120)
        
        # Verify downloader called
        self.mock_downloader.extract_info.assert_called_with("https://example.com/video")

    def test_fetch_metadata_failure(self):
        # Setup mock to raise exception
        self.mock_downloader.extract_info.side_effect = Exception("Network Error")
        
        # Trigger fetch
        self.download_manager.fetch_metadata(self.task.id)
        
        # Wait for thread
        time.sleep(0.5)
        
        # Verify queue NOT updated (should retain original)
        updated_task = self.queue_manager.get_task(self.task.id)
        self.assertEqual(updated_task.video_info.title, "Initial Title")

if __name__ == '__main__':
    unittest.main()
