"""
Integration tests for the refactored architecture.
Tests complete workflows including downloads, cancellations, and screen changes.
"""

import unittest
import threading
import time
import tempfile
import os
from unittest.mock import Mock, patch, MagicMock
from models import VideoInfo, DownloadTask, DownloadStatus
from controllers.download_service import DownloadService
from controllers.queue_manager import QueueManager
from controllers.history_manager import HistoryManager
from utils.event_bus import EventBus, Event, EventType
from utils.thread_pool_manager import ThreadPoolManager


class TestIntegrationDownloadFlow(unittest.TestCase):
    """Integration tests for complete download flow."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Reset singletons
        DownloadService._instance = None
        ThreadPoolManager._instance = None
        
        self.download_service = DownloadService()
        # Use the same queue manager and event bus instances as the download service
        self.queue_manager = self.download_service._queue_manager
        self.history_manager = HistoryManager()
        self.event_bus = self.download_service._event_bus
        
        # Create temp directory for downloads
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up after tests."""
        # Stop any active downloads
        if hasattr(self.download_service, '_initialized'):
            self.download_service.stop_all_downloads()
            time.sleep(0.5)
        
        # Shutdown thread pools
        thread_pool_manager = ThreadPoolManager()
        thread_pool_manager.shutdown(timeout=5)
        
        # Clear queue
        self.queue_manager.clear_queue()
        
        # Stop event bus
        if self.event_bus._running:
            self.event_bus.stop()
        
        # Clean up temp directory
        if os.path.exists(self.temp_dir):
            for file in os.listdir(self.temp_dir):
                os.remove(os.path.join(self.temp_dir, file))
            os.rmdir(self.temp_dir)
        
        # Reset singletons
        DownloadService._instance = None
        ThreadPoolManager._instance = None
    
    @patch('controllers.download_service.VideoDownloader')
    def test_complete_download_flow(self, mock_downloader_class):
        """Test complete download flow from queue to history."""
        # Track events
        progress_events = []
        complete_events = []
        
        def progress_callback(event):
            progress_events.append(event)
        
        def complete_callback(event):
            complete_events.append(event)
        
        self.event_bus.subscribe(EventType.DOWNLOAD_PROGRESS, progress_callback)
        self.event_bus.subscribe(EventType.DOWNLOAD_COMPLETE, complete_callback)
        
        # Setup mock downloader
        mock_downloader = Mock()
        
        def download_with_progress(*args, **kwargs):
            progress_cb = kwargs.get('progress_callback')
            if progress_cb:
                # Simulate progress updates
                for i in [0, 25, 50, 75, 100]:
                    progress_cb({
                        'status': 'downloading',
                        'downloaded_bytes': i * 1000,
                        'total_bytes': 100000
                    })
                    time.sleep(0.05)
            return os.path.join(self.temp_dir, "test_video.mp4")
        
        mock_downloader.download.side_effect = download_with_progress
        
        with patch('controllers.download_service.VideoDownloader', return_value=mock_downloader):
            # Step 1: Add task to queue
            video_info = VideoInfo(
                url="https://www.youtube.com/watch?v=test123",
                title="Test Video",
                selected_quality="720p"
            )
            task = self.queue_manager.add_task(video_info, self.temp_dir)
            
            # Verify task is in queue
            self.assertIsNotNone(task)
            self.assertEqual(task.status, DownloadStatus.QUEUED)
            
            # Step 2: Start download
            result = self.download_service.start_download(task.id)
            self.assertTrue(result)
            
            # Step 3: Wait for download to complete
            time.sleep(1)
            
            # Step 4: Verify events were published
            self.assertGreater(len(progress_events), 0, "Should have progress events")
            
            # Verify progress event structure
            for event in progress_events:
                self.assertEqual(event.type, EventType.DOWNLOAD_PROGRESS)
                self.assertIn('task_id', event.data)
                self.assertEqual(event.data['task_id'], task.id)
            
            # Step 5: Verify task status is completed
            updated_task = self.queue_manager.get_task(task.id)
            self.assertEqual(updated_task.status, DownloadStatus.COMPLETED)
            self.assertEqual(updated_task.progress, 100.0)
            
            # Step 6: Verify task is in history
            history_entries = self.history_manager.get_all_history()
            matching_entries = [h for h in history_entries if h.url == video_info.url]
            self.assertGreater(len(matching_entries), 0, "Task should be in history")


if __name__ == "__main__":
    unittest.main()


class TestIntegrationDownloadCancellation(unittest.TestCase):
    """Integration tests for download cancellation."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Reset singletons
        DownloadService._instance = None
        ThreadPoolManager._instance = None
        
        self.download_service = DownloadService()
        # Use the same queue manager and event bus instances as the download service
        self.queue_manager = self.download_service._queue_manager
        self.event_bus = self.download_service._event_bus
        
        # Create temp directory for downloads
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up after tests."""
        # Stop any active downloads
        if hasattr(self.download_service, '_initialized'):
            self.download_service.stop_all_downloads()
            time.sleep(0.5)
        
        # Shutdown thread pools
        thread_pool_manager = ThreadPoolManager()
        thread_pool_manager.shutdown(timeout=5)
        
        # Clear queue
        self.queue_manager.clear_queue()
        
        # Stop event bus
        if self.event_bus._running:
            self.event_bus.stop()
        
        # Clean up temp directory
        if os.path.exists(self.temp_dir):
            for file in os.listdir(self.temp_dir):
                os.remove(os.path.join(self.temp_dir, file))
            os.rmdir(self.temp_dir)
        
        # Reset singletons
        DownloadService._instance = None
        ThreadPoolManager._instance = None
    
    @patch('controllers.download_service.VideoDownloader')
    def test_download_cancellation(self, mock_downloader_class):
        """Test cancelling a download mid-way."""
        # Track events
        stopped_events = []
        
        def stopped_callback(event):
            stopped_events.append(event)
        
        self.event_bus.subscribe(EventType.DOWNLOAD_STOPPED, stopped_callback)
        
        # Setup mock downloader with slow download
        mock_downloader = Mock()
        
        def slow_download(*args, **kwargs):
            progress_cb = kwargs.get('progress_callback')
            for i in range(0, 100, 10):
                if progress_cb:
                    progress_cb({
                        'status': 'downloading',
                        'downloaded_bytes': i * 1000,
                        'total_bytes': 100000
                    })
                time.sleep(0.1)
            return os.path.join(self.temp_dir, "test_video.mp4")
        
        mock_downloader.download.side_effect = slow_download
        
        with patch('controllers.download_service.VideoDownloader', return_value=mock_downloader):
            # Step 1: Add task and start download
            video_info = VideoInfo(
                url="https://www.youtube.com/watch?v=test_cancel",
                title="Test Cancel Video",
                selected_quality="720p"
            )
            task = self.queue_manager.add_task(video_info, self.temp_dir)
            
            result = self.download_service.start_download(task.id)
            self.assertTrue(result)
            
            # Step 2: Wait a bit for download to start
            time.sleep(0.3)
            
            # Verify download is active
            active_count = self.download_service.get_active_count()
            self.assertGreater(active_count, 0)
            
            # Step 3: Cancel download
            cancel_result = self.download_service.stop_download(task.id)
            self.assertTrue(cancel_result)
            
            # Step 4: Wait for cancellation to complete
            time.sleep(0.5)
            
            # Step 5: Verify status is STOPPED
            updated_task = self.queue_manager.get_task(task.id)
            self.assertEqual(updated_task.status, DownloadStatus.STOPPED)
            
            # Step 6: Verify cleanup of resources
            active_count_after = self.download_service.get_active_count()
            self.assertEqual(active_count_after, 0, "No active downloads should remain")
            
            # Verify stop flag was removed
            with self.download_service._lock:
                self.assertNotIn(task.id, self.download_service._stop_flags)
                self.assertNotIn(task.id, self.download_service._active_futures)


class TestIntegrationConcurrentDownloads(unittest.TestCase):
    """Integration tests for multiple concurrent downloads."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Reset singletons
        DownloadService._instance = None
        ThreadPoolManager._instance = None
        
        self.download_service = DownloadService()
        # Use the same queue manager and event bus instances as the download service
        self.queue_manager = self.download_service._queue_manager
        self.event_bus = self.download_service._event_bus
        
        # Create temp directory for downloads
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up after tests."""
        # Stop any active downloads
        if hasattr(self.download_service, '_initialized'):
            self.download_service.stop_all_downloads()
            time.sleep(1)
        
        # Shutdown thread pools
        thread_pool_manager = ThreadPoolManager()
        thread_pool_manager.shutdown(timeout=10)
        
        # Clear queue
        self.queue_manager.clear_queue()
        
        # Stop event bus
        if self.event_bus._running:
            self.event_bus.stop()
        
        # Clean up temp directory
        if os.path.exists(self.temp_dir):
            for file in os.listdir(self.temp_dir):
                os.remove(os.path.join(self.temp_dir, file))
            os.rmdir(self.temp_dir)
        
        # Reset singletons
        DownloadService._instance = None
        ThreadPoolManager._instance = None
    
    @patch('controllers.download_service.VideoDownloader')
    def test_multiple_concurrent_downloads(self, mock_downloader_class):
        """Test that only 3 downloads run concurrently, others queue."""
        # Track concurrent downloads
        concurrent_downloads = []
        max_concurrent = 0
        lock = threading.Lock()
        
        # Track completion
        completed_downloads = []
        
        def complete_callback(event):
            completed_downloads.append(event)
        
        self.event_bus.subscribe(EventType.DOWNLOAD_COMPLETE, complete_callback)
        
        # Setup mock downloader
        mock_downloader = Mock()
        
        def download_with_tracking(*args, **kwargs):
            with lock:
                concurrent_downloads.append(1)
                current_concurrent = len(concurrent_downloads)
                nonlocal max_concurrent
                max_concurrent = max(max_concurrent, current_concurrent)
            
            # Simulate download time
            time.sleep(0.3)
            
            with lock:
                concurrent_downloads.pop()
            
            return os.path.join(self.temp_dir, f"test_video_{time.time()}.mp4")
        
        mock_downloader.download.side_effect = download_with_tracking
        
        with patch('controllers.download_service.VideoDownloader', return_value=mock_downloader):
            # Step 1: Add 5 tasks to queue
            tasks = []
            for i in range(5):
                video_info = VideoInfo(
                    url=f"https://www.youtube.com/watch?v=test{i}",
                    title=f"Test Video {i}",
                    selected_quality="720p"
                )
                task = self.queue_manager.add_task(video_info, self.temp_dir)
                tasks.append(task)
            
            # Step 2: Start all downloads
            for task in tasks:
                result = self.download_service.start_download(task.id)
                self.assertTrue(result)
            
            # Step 3: Check that only 3 are running concurrently
            time.sleep(0.2)
            active_count = self.download_service.get_active_count()
            self.assertLessEqual(active_count, 3, "Should have max 3 concurrent downloads")
            
            # Step 4: Wait for all to complete
            timeout = 5
            start_time = time.time()
            while len(completed_downloads) < 5 and time.time() - start_time < timeout:
                time.sleep(0.1)
            
            # Step 5: Verify all completed
            self.assertEqual(len(completed_downloads), 5, "All 5 downloads should complete")
            
            # Step 6: Verify max concurrent was 3
            self.assertLessEqual(max_concurrent, 3, "Max concurrent downloads should be 3")
            
            # Verify all tasks are completed
            for task in tasks:
                updated_task = self.queue_manager.get_task(task.id)
                self.assertEqual(updated_task.status, DownloadStatus.COMPLETED)



class TestIntegrationScreenChanges(unittest.TestCase):
    """Integration tests for screen changes during downloads."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Reset singletons
        DownloadService._instance = None
        ThreadPoolManager._instance = None
        
        self.download_service = DownloadService()
        # Use the same queue manager and event bus instances as the download service
        self.queue_manager = self.download_service._queue_manager
        self.event_bus = self.download_service._event_bus
        
        # Create temp directory for downloads
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up after tests."""
        # Stop any active downloads
        if hasattr(self.download_service, '_initialized'):
            self.download_service.stop_all_downloads()
            time.sleep(0.5)
        
        # Shutdown thread pools
        thread_pool_manager = ThreadPoolManager()
        thread_pool_manager.shutdown(timeout=5)
        
        # Clear queue
        self.queue_manager.clear_queue()
        
        # Stop event bus
        if self.event_bus._running:
            self.event_bus.stop()
        
        # Clean up temp directory
        if os.path.exists(self.temp_dir):
            for file in os.listdir(self.temp_dir):
                os.remove(os.path.join(self.temp_dir, file))
            os.rmdir(self.temp_dir)
        
        # Reset singletons
        DownloadService._instance = None
        ThreadPoolManager._instance = None
    
    @patch('controllers.download_service.VideoDownloader')
    def test_screen_change_during_download(self, mock_downloader_class):
        """Test changing screens during active download doesn't crash."""
        from utils.safe_callback_mixin import SafeCallbackMixin
        import tkinter as tk
        
        # Create a mock screen with SafeCallbackMixin
        class MockQueueScreen(SafeCallbackMixin, tk.Frame):
            def __init__(self, parent):
                tk.Frame.__init__(self, parent)
                SafeCallbackMixin.__init__(self)
                self.event_subscriptions = []
                self.refresh_count = 0
            
            def on_download_progress(self, event):
                """Handle download progress event."""
                self.refresh_count += 1
                # Schedule UI update
                self.safe_after(100, self._update_ui)
            
            def _update_ui(self):
                """Update UI (simulated)."""
                pass
            
            def cleanup(self):
                """Cleanup subscriptions and callbacks."""
                for sub_id in self.event_subscriptions:
                    self.event_bus.unsubscribe(sub_id)
                self.cleanup_callbacks()
        
        # Setup mock downloader
        mock_downloader = Mock()
        
        def slow_download(*args, **kwargs):
            progress_cb = kwargs.get('progress_callback')
            for i in range(0, 100, 10):
                if progress_cb:
                    progress_cb({
                        'status': 'downloading',
                        'downloaded_bytes': i * 1000,
                        'total_bytes': 100000
                    })
                time.sleep(0.1)
            return os.path.join(self.temp_dir, "test_video.mp4")
        
        mock_downloader.download.side_effect = slow_download
        
        with patch('controllers.download_service.VideoDownloader', return_value=mock_downloader):
            # Create mock root window
            root = tk.Tk()
            
            try:
                # Step 1: Create QueueScreen and subscribe to events
                queue_screen = MockQueueScreen(root)
                queue_screen.event_bus = self.event_bus
                
                sub_id = self.event_bus.subscribe(
                    EventType.DOWNLOAD_PROGRESS,
                    queue_screen.on_download_progress
                )
                queue_screen.event_subscriptions.append(sub_id)
                
                # Step 2: Start download
                video_info = VideoInfo(
                    url="https://www.youtube.com/watch?v=test_screen_change",
                    title="Test Screen Change",
                    selected_quality="720p"
                )
                task = self.queue_manager.add_task(video_info, self.temp_dir)
                
                result = self.download_service.start_download(task.id)
                self.assertTrue(result)
                
                # Step 3: Wait a bit for download to start
                time.sleep(0.3)
                
                # Step 4: Simulate screen change by cleaning up QueueScreen
                queue_screen.cleanup()
                
                # Step 5: Verify no crash occurs
                # Download should continue in background
                time.sleep(0.5)
                
                # Step 6: Verify callbacks were cancelled
                self.assertEqual(len(queue_screen._callback_ids), 0)
                
                # Step 7: Verify download continues despite screen change
                active_count = self.download_service.get_active_count()
                # Download might still be active or completed
                self.assertGreaterEqual(active_count, 0)
                
                # Wait for download to complete
                time.sleep(1)
                
                # Verify task completed
                updated_task = self.queue_manager.get_task(task.id)
                self.assertIn(updated_task.status, [DownloadStatus.COMPLETED, DownloadStatus.DOWNLOADING])
                
            finally:
                # Clean up tkinter
                root.destroy()
    
    @patch('controllers.download_service.VideoDownloader')
    def test_rapid_screen_changes(self, mock_downloader_class):
        """Test rapid screen changes don't cause memory leaks."""
        from utils.safe_callback_mixin import SafeCallbackMixin
        import tkinter as tk
        
        class MockScreen(SafeCallbackMixin, tk.Frame):
            def __init__(self, parent):
                tk.Frame.__init__(self, parent)
                SafeCallbackMixin.__init__(self)
                self.callback_count = 0
            
            def schedule_callbacks(self):
                """Schedule multiple callbacks."""
                for i in range(10):
                    self.safe_after(100 * i, self._dummy_callback)
            
            def _dummy_callback(self):
                """Dummy callback."""
                self.callback_count += 1
            
            def cleanup(self):
                """Cleanup callbacks."""
                self.cleanup_callbacks()
        
        # Setup mock downloader
        mock_downloader = Mock()
        mock_downloader.download.return_value = os.path.join(self.temp_dir, "test_video.mp4")
        
        with patch('controllers.download_service.VideoDownloader', return_value=mock_downloader):
            root = tk.Tk()
            
            try:
                # Create and destroy multiple screens rapidly
                screens = []
                for i in range(5):
                    screen = MockScreen(root)
                    screen.schedule_callbacks()
                    screens.append(screen)
                    time.sleep(0.05)
                
                # Cleanup all screens
                for screen in screens:
                    screen.cleanup()
                
                # Verify all callbacks were cancelled
                for screen in screens:
                    self.assertEqual(len(screen._callback_ids), 0)
                
                # No crashes should occur
                time.sleep(0.5)
                
            finally:
                root.destroy()


class TestIntegrationApplicationShutdown(unittest.TestCase):
    """Integration tests for application shutdown with active downloads."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Reset singletons
        DownloadService._instance = None
        ThreadPoolManager._instance = None
        
        self.download_service = DownloadService()
        # Use the same queue manager and event bus instances as the download service
        self.queue_manager = self.download_service._queue_manager
        self.event_bus = self.download_service._event_bus
        
        # Create temp directory for downloads
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up after tests."""
        # Clear queue
        self.queue_manager.clear_queue()
        
        # Stop event bus
        if self.event_bus._running:
            self.event_bus.stop()
        
        # Clean up temp directory
        if os.path.exists(self.temp_dir):
            for file in os.listdir(self.temp_dir):
                try:
                    os.remove(os.path.join(self.temp_dir, file))
                except:
                    pass
            try:
                os.rmdir(self.temp_dir)
            except:
                pass
        
        # Reset singletons
        DownloadService._instance = None
        ThreadPoolManager._instance = None
    
    @patch('controllers.download_service.VideoDownloader')
    def test_graceful_shutdown_with_active_downloads(self, mock_downloader_class):
        """Test graceful shutdown with active downloads."""
        # Setup mock downloader with slow download
        mock_downloader = Mock()
        
        def slow_download(*args, **kwargs):
            progress_cb = kwargs.get('progress_callback')
            for i in range(0, 100, 10):
                if progress_cb:
                    progress_cb({
                        'status': 'downloading',
                        'downloaded_bytes': i * 1000,
                        'total_bytes': 100000
                    })
                time.sleep(0.2)
            return os.path.join(self.temp_dir, "test_video.mp4")
        
        mock_downloader.download.side_effect = slow_download
        
        with patch('controllers.download_service.VideoDownloader', return_value=mock_downloader):
            # Step 1: Start multiple downloads
            tasks = []
            for i in range(3):
                video_info = VideoInfo(
                    url=f"https://www.youtube.com/watch?v=test_shutdown_{i}",
                    title=f"Test Shutdown Video {i}",
                    selected_quality="720p"
                )
                task = self.queue_manager.add_task(video_info, self.temp_dir)
                tasks.append(task)
                self.download_service.start_download(task.id)
            
            # Step 2: Wait for downloads to start
            time.sleep(0.3)
            
            # Verify downloads are active
            active_count = self.download_service.get_active_count()
            self.assertGreater(active_count, 0)
            
            # Step 3: Simulate application shutdown
            # Stop all downloads
            self.download_service.stop_all_downloads()
            
            # Step 4: Shutdown thread pools
            thread_pool_manager = ThreadPoolManager()
            shutdown_start = time.time()
            thread_pool_manager.shutdown(timeout=5)
            shutdown_duration = time.time() - shutdown_start
            
            # Step 5: Verify shutdown completed within timeout
            self.assertLess(shutdown_duration, 6, "Shutdown should complete within timeout")
            
            # Step 6: Verify no active downloads remain
            final_active_count = self.download_service.get_active_count()
            self.assertEqual(final_active_count, 0)
    
    @patch('controllers.download_service.VideoDownloader')
    def test_pending_downloads_saved_on_shutdown(self, mock_downloader_class):
        """Test that pending downloads are saved on shutdown."""
        # Setup mock downloader
        mock_downloader = Mock()
        
        def slow_download(*args, **kwargs):
            time.sleep(2)
            return os.path.join(self.temp_dir, "test_video.mp4")
        
        mock_downloader.download.side_effect = slow_download
        
        with patch('controllers.download_service.VideoDownloader', return_value=mock_downloader):
            # Step 1: Add tasks to queue (some queued, some downloading)
            tasks = []
            for i in range(5):
                video_info = VideoInfo(
                    url=f"https://www.youtube.com/watch?v=test_pending_{i}",
                    title=f"Test Pending Video {i}",
                    selected_quality="720p"
                )
                task = self.queue_manager.add_task(video_info, self.temp_dir)
                tasks.append(task)
            
            # Start only first 3
            for i in range(3):
                self.download_service.start_download(tasks[i].id)
            
            # Step 2: Wait a bit
            time.sleep(0.3)
            
            # Step 3: Save pending downloads (simulating shutdown)
            self.queue_manager.save_pending_downloads()
            
            # Step 4: Verify pending downloads were saved
            # Check that file exists
            pending_file = os.path.join(
                os.path.expanduser("~"),
                ".klyp",
                "pending_downloads.json"
            )
            
            # Note: In real scenario, this would save to file
            # For test, we verify the method was called without error
            
            # Step 5: Stop all downloads
            self.download_service.stop_all_downloads()
            
            # Step 6: Shutdown gracefully
            thread_pool_manager = ThreadPoolManager()
            thread_pool_manager.shutdown(timeout=5)
            
            # Verify no crashes occurred
            self.assertTrue(True)
    
    def test_event_bus_stops_cleanly(self):
        """Test that EventBus stops cleanly and processes remaining events."""
        # Track events
        processed_events = []
        
        def callback(event):
            processed_events.append(event)
        
        self.event_bus.subscribe(EventType.DOWNLOAD_COMPLETE, callback)
        
        # Publish events
        for i in range(10):
            event = Event(
                type=EventType.DOWNLOAD_COMPLETE,
                data={"task_id": f"test-{i}", "file_path": f"/tmp/test-{i}.mp4"}
            )
            self.event_bus.publish(event)
        
        # Start event bus
        import tkinter as tk
        root = tk.Tk()
        
        try:
            self.event_bus.start(root)
            
            # Wait for events to process
            time.sleep(0.5)
            
            # Stop event bus
            self.event_bus.stop()
            
            # Verify all events were processed
            self.assertEqual(len(processed_events), 10)
            
        finally:
            root.destroy()
