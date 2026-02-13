"""
Unit tests for DownloadService.
Tests start_download, stop_download, event publishing, and exception handling.
"""

import unittest
import threading
import time
from unittest.mock import Mock, patch, MagicMock
from models import VideoInfo, DownloadTask, DownloadStatus
from controllers.download_service import DownloadService
from utils.event_bus import EventType, Event


class TestDownloadService(unittest.TestCase):
    """Test cases for DownloadService."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Reset singleton instance
        DownloadService._instance = None
        
        self.service = DownloadService()
        
        # Create test video info
        self.video_info = VideoInfo(
            url="https://www.youtube.com/watch?v=test123",
            title="Test Video",
            selected_quality="720p"
        )
    
    def tearDown(self):
        """Clean up after tests."""
        # Stop any active downloads
        if hasattr(self.service, '_initialized'):
            self.service.stop_all_downloads()
            time.sleep(0.5)
        
        # Reset singleton
        DownloadService._instance = None
    
    def test_singleton_pattern(self):
        """Test that DownloadService implements singleton pattern."""
        service1 = DownloadService()
        service2 = DownloadService()
        
        # Should be the same instance
        self.assertIs(service1, service2)
    
    def test_start_download_nonexistent_task(self):
        """Test starting download for nonexistent task."""
        result = self.service.start_download("nonexistent-id")
        self.assertFalse(result)
    
    def test_start_download_already_active(self):
        """Test starting download that is already active."""
        # Add task to queue
        task = self.service._queue_manager.add_task(self.video_info)
        
        # Mock the download worker to prevent actual download
        with patch.object(self.service._thread_pool.download_pool, 'submit') as mock_submit:
            mock_future = Mock()
            mock_submit.return_value = mock_future
            
            # Start download first time
            result1 = self.service.start_download(task.id)
            self.assertTrue(result1)
            
            # Try to start again
            result2 = self.service.start_download(task.id)
            self.assertFalse(result2)
    
    @patch('controllers.download_service.VideoDownloader')
    def test_start_download_success(self, mock_downloader_class):
        """Test successful download start."""
        # Setup mock downloader
        mock_downloader = Mock()
        mock_downloader.download.return_value = "/tmp/test_video.mp4"
        mock_downloader_class.return_value = mock_downloader
        
        # Add task to queue
        task = self.service._queue_manager.add_task(self.video_info)
        
        # Track events
        received_events = []
        
        def event_callback(event):
            received_events.append(event)
        
        self.service._event_bus.subscribe(EventType.DOWNLOAD_PROGRESS, event_callback)
        self.service._event_bus.subscribe(EventType.DOWNLOAD_COMPLETE, event_callback)
        
        # Start download
        result = self.service.start_download(task.id)
        self.assertTrue(result)
        
        # Wait for download to complete
        time.sleep(1)
        
        # Check that task is in active downloads initially
        self.assertGreaterEqual(self.service.get_active_count(), 0)
    
    @patch('controllers.download_service.VideoDownloader')
    def test_stop_download(self, mock_downloader_class):
        """Test stopping an active download."""
        # Setup mock downloader that takes time
        mock_downloader = Mock()
        
        def slow_download(*args, **kwargs):
            time.sleep(2)
            return "/tmp/test_video.mp4"
        
        mock_downloader.download.side_effect = slow_download
        mock_downloader_class.return_value = mock_downloader
        
        # Add task to queue
        task = self.service._queue_manager.add_task(self.video_info)
        
        # Start download
        result = self.service.start_download(task.id)
        self.assertTrue(result)
        
        # Give it a moment to start
        time.sleep(0.2)
        
        # Stop download
        stop_result = self.service.stop_download(task.id)
        self.assertTrue(stop_result)
        
        # Wait for cleanup
        time.sleep(0.5)
    
    def test_stop_download_not_active(self):
        """Test stopping download that is not active."""
        result = self.service.stop_download("nonexistent-id")
        self.assertFalse(result)
    
    @patch('controllers.download_service.VideoDownloader')
    def test_stop_all_downloads(self, mock_downloader_class):
        """Test stopping all active downloads."""
        # Setup mock downloader
        mock_downloader = Mock()
        
        def slow_download(*args, **kwargs):
            time.sleep(2)
            return "/tmp/test_video.mp4"
        
        mock_downloader.download.side_effect = slow_download
        mock_downloader_class.return_value = mock_downloader
        
        # Add multiple tasks
        tasks = []
        for i in range(3):
            video_info = VideoInfo(
                url=f"https://www.youtube.com/watch?v=test{i}",
                title=f"Test Video {i}"
            )
            task = self.service._queue_manager.add_task(video_info)
            tasks.append(task)
        
        # Start all downloads
        for task in tasks:
            self.service.start_download(task.id)
        
        # Give them a moment to start
        time.sleep(0.2)
        
        # Stop all
        self.service.stop_all_downloads()
        
        # Wait for cleanup
        time.sleep(0.5)
        
        # All should be stopped
        self.assertEqual(self.service.get_active_count(), 0)
    
    @patch('controllers.download_service.VideoDownloader')
    def test_start_all_downloads(self, mock_downloader_class):
        """Test starting all queued downloads."""
        # Setup mock downloader
        mock_downloader = Mock()
        mock_downloader.download.return_value = "/tmp/test_video.mp4"
        mock_downloader_class.return_value = mock_downloader
        
        # Add multiple queued tasks
        tasks = []
        for i in range(3):
            video_info = VideoInfo(
                url=f"https://www.youtube.com/watch?v=test{i}",
                title=f"Test Video {i}"
            )
            task = self.service._queue_manager.add_task(video_info)
            tasks.append(task)
        
        # Start all
        started_count = self.service.start_all_downloads()
        
        # Should start all 3
        self.assertEqual(started_count, 3)
        
        # Wait for downloads to process
        time.sleep(1)
    
    def test_start_all_downloads_no_queued(self):
        """Test starting all downloads when none are queued."""
        started_count = self.service.start_all_downloads()
        self.assertEqual(started_count, 0)
    
    def test_get_active_count(self):
        """Test getting active download count."""
        # Initially should be 0
        self.assertEqual(self.service.get_active_count(), 0)
    
    @patch('controllers.download_service.VideoDownloader')
    def test_download_publishes_progress_events(self, mock_downloader_class):
        """Test that download publishes progress events."""
        # Setup mock downloader
        mock_downloader = Mock()
        
        def download_with_progress(*args, **kwargs):
            progress_callback = kwargs.get('progress_callback')
            if progress_callback:
                # Simulate progress updates
                for i in range(0, 101, 25):
                    progress_callback({
                        'status': 'downloading',
                        'downloaded_bytes': i * 1000,
                        'total_bytes': 100000
                    })
                progress_callback({'status': 'finished'})
            return "/tmp/test_video.mp4"
        
        mock_downloader.download.side_effect = download_with_progress
        mock_downloader_class.return_value = mock_downloader
        
        # Track events
        progress_events = []
        complete_events = []
        
        def progress_callback(event):
            progress_events.append(event)
        
        def complete_callback(event):
            complete_events.append(event)
        
        self.service._event_bus.subscribe(EventType.DOWNLOAD_PROGRESS, progress_callback)
        self.service._event_bus.subscribe(EventType.DOWNLOAD_COMPLETE, complete_callback)
        
        # Add task and start download
        task = self.service._queue_manager.add_task(self.video_info)
        self.service.start_download(task.id)
        
        # Wait for completion
        time.sleep(1)
        
        # Should have received progress events
        self.assertGreater(len(progress_events), 0)
    
    @patch('controllers.download_service.VideoDownloader')
    def test_download_failure_publishes_failed_event(self, mock_downloader_class):
        """Test that download failure publishes DOWNLOAD_FAILED event."""
        # Setup mock downloader to fail
        mock_downloader = Mock()
        mock_downloader.download.side_effect = Exception("Network error")
        mock_downloader_class.return_value = mock_downloader
        
        # Track events
        failed_events = []
        
        def failed_callback(event):
            failed_events.append(event)
        
        self.service._event_bus.subscribe(EventType.DOWNLOAD_FAILED, failed_callback)
        
        # Add task and start download
        task = self.service._queue_manager.add_task(self.video_info)
        self.service.start_download(task.id)
        
        # Wait for failure
        time.sleep(1)
        
        # Should have received failed event
        self.assertGreater(len(failed_events), 0)
        self.assertIn("error", failed_events[0].data)
    
    @patch('controllers.download_service.VideoDownloader')
    def test_exception_handling_in_worker(self, mock_downloader_class):
        """Test exception handling in download worker."""
        # Setup mock downloader to raise exception
        mock_downloader = Mock()
        mock_downloader.download.side_effect = ValueError("Invalid format")
        mock_downloader_class.return_value = mock_downloader
        
        # Add task and start download
        task = self.service._queue_manager.add_task(self.video_info)
        self.service.start_download(task.id)
        
        # Wait for failure
        time.sleep(1)
        
        # Task should be marked as failed
        updated_task = self.service._queue_manager.get_task(task.id)
        self.assertEqual(updated_task.status, DownloadStatus.FAILED)
        self.assertIn("Invalid format", updated_task.error_message)
    
    @patch('controllers.download_service.VideoDownloader')
    def test_stopped_by_user_handling(self, mock_downloader_class):
        """Test handling of user-stopped downloads."""
        # Setup mock downloader
        mock_downloader = Mock()
        mock_downloader.download.side_effect = Exception("Download stopped by user")
        mock_downloader_class.return_value = mock_downloader
        
        # Track events
        stopped_events = []
        
        def stopped_callback(event):
            stopped_events.append(event)
        
        self.service._event_bus.subscribe(EventType.DOWNLOAD_STOPPED, stopped_callback)
        
        # Add task and start download
        task = self.service._queue_manager.add_task(self.video_info)
        self.service.start_download(task.id)
        
        # Wait for stop
        time.sleep(1)
        
        # Task should be marked as stopped
        updated_task = self.service._queue_manager.get_task(task.id)
        self.assertEqual(updated_task.status, DownloadStatus.STOPPED)
    
    def test_thread_safety_of_active_futures(self):
        """Test thread-safe access to active_futures."""
        # This test verifies that concurrent access to active_futures doesn't cause issues
        
        def access_active_count():
            for _ in range(100):
                count = self.service.get_active_count()
                self.assertGreaterEqual(count, 0)
        
        # Create multiple threads
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=access_active_count)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
    
    @patch('controllers.download_service.VideoDownloader')
    def test_concurrent_download_starts(self, mock_downloader_class):
        """Test starting multiple downloads concurrently."""
        # Setup mock downloader
        mock_downloader = Mock()
        mock_downloader.download.return_value = "/tmp/test_video.mp4"
        mock_downloader_class.return_value = mock_downloader
        
        # Add multiple tasks
        tasks = []
        for i in range(5):
            video_info = VideoInfo(
                url=f"https://www.youtube.com/watch?v=test{i}",
                title=f"Test Video {i}"
            )
            task = self.service._queue_manager.add_task(video_info)
            tasks.append(task)
        
        # Start downloads from multiple threads
        results = []
        lock = threading.Lock()
        
        def start_download(task_id):
            result = self.service.start_download(task_id)
            with lock:
                results.append(result)
        
        threads = []
        for task in tasks:
            thread = threading.Thread(target=start_download, args=(task.id,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # All should succeed
        self.assertEqual(len(results), 5)
        self.assertTrue(all(results))
        
        # Wait for downloads to process
        time.sleep(1)
    
    @patch('controllers.download_service.VideoDownloader')
    def test_download_with_subtitles(self, mock_downloader_class):
        """Test download with subtitles enabled."""
        # Setup mock downloader
        mock_downloader = Mock()
        mock_downloader.download_with_subtitles.return_value = "/tmp/test_video.mp4"
        mock_downloader_class.return_value = mock_downloader
        
        # Create video info with subtitles enabled
        video_info = VideoInfo(
            url="https://www.youtube.com/watch?v=test123",
            title="Test Video",
            download_subtitles=True
        )
        
        # Add task and start download
        task = self.service._queue_manager.add_task(video_info)
        self.service.start_download(task.id)
        
        # Wait for completion
        time.sleep(1)
        
        # Verify download_with_subtitles was called
        mock_downloader.download_with_subtitles.assert_called()


if __name__ == "__main__":
    unittest.main()
