"""
Stress and stability tests for the refactored architecture.
Tests system behavior under heavy load and rapid state changes.
"""

import unittest
import threading
import time
import tempfile
import os
import tracemalloc
from unittest.mock import Mock, patch
from models import VideoInfo, DownloadTask, DownloadStatus
from controllers.download_service import DownloadService
from controllers.queue_manager import QueueManager
from controllers.search_manager import SearchManager
from utils.event_bus import EventBus, Event, EventType
from utils.thread_pool_manager import ThreadPoolManager


class TestStress100Tasks(unittest.TestCase):
    """Stress test with 100 tasks in queue."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Reset singletons
        DownloadService._instance = None
        ThreadPoolManager._instance = None
        
        self.download_service = DownloadService()
        self.queue_manager = self.download_service._queue_manager
        self.event_bus = self.download_service._event_bus
        
        # Create temp directory for downloads
        self.temp_dir = tempfile.mkdtemp()
        
        # Start memory tracking
        tracemalloc.start()
    
    def tearDown(self):
        """Clean up after tests."""
        # Stop memory tracking
        tracemalloc.stop()
        
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
    def test_100_tasks_stress(self, mock_downloader_class):
        """Test adding 100 tasks, starting all, and verifying completion."""
        # Track completion by checking task status directly
        completed_tasks = []
        failed_tasks = []
        lock = threading.Lock()
        
        # Setup mock downloader with fast downloads
        mock_downloader = Mock()
        
        def fast_download(*args, **kwargs):
            progress_cb = kwargs.get('progress_callback')
            if progress_cb:
                # Simulate quick progress
                for i in [0, 50, 100]:
                    progress_cb({
                        'status': 'downloading',
                        'downloaded_bytes': i * 1000,
                        'total_bytes': 100000
                    })
            time.sleep(0.05)  # Very fast download
            return os.path.join(self.temp_dir, f"test_video_{time.time()}.mp4")
        
        mock_downloader.download.side_effect = fast_download
        
        with patch('controllers.download_service.VideoDownloader', return_value=mock_downloader):
            # Get initial memory usage
            snapshot_before = tracemalloc.take_snapshot()
            
            # Step 1: Add 100 tasks to queue
            tasks = []
            for i in range(100):
                video_info = VideoInfo(
                    url=f"https://www.youtube.com/watch?v=stress_test_{i}",
                    title=f"Stress Test Video {i}",
                    selected_quality="720p"
                )
                task = self.queue_manager.add_task(video_info, self.temp_dir)
                tasks.append(task)
            
            # Verify all tasks added
            self.assertEqual(len(tasks), 100)
            all_tasks = self.queue_manager.get_all_tasks()
            self.assertEqual(len(all_tasks), 100)
            
            # Step 2: Start all downloads
            for task in tasks:
                result = self.download_service.start_download(task.id)
                self.assertTrue(result)
            
            # Step 3: Wait for all to complete (with timeout)
            timeout = 60  # 60 seconds should be enough
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                # Check task statuses directly
                with lock:
                    completed_tasks.clear()
                    failed_tasks.clear()
                    for task in tasks:
                        updated_task = self.queue_manager.get_task(task.id)
                        if updated_task.status == DownloadStatus.COMPLETED:
                            completed_tasks.append(task.id)
                        elif updated_task.status in [DownloadStatus.FAILED, DownloadStatus.STOPPED]:
                            failed_tasks.append(task.id)
                
                if len(completed_tasks) + len(failed_tasks) >= 100:
                    break
                time.sleep(0.5)
            
            # Step 4: Verify all completed or failed gracefully
            total_finished = len(completed_tasks) + len(failed_tasks)
            self.assertEqual(total_finished, 100, 
                           f"Expected 100 tasks to finish, got {total_finished}")
            
            # Step 5: Verify no active downloads remain
            active_count = self.download_service.get_active_count()
            self.assertEqual(active_count, 0, "No active downloads should remain")
            
            # Step 6: Check memory usage (no significant leaks)
            snapshot_after = tracemalloc.take_snapshot()
            top_stats = snapshot_after.compare_to(snapshot_before, 'lineno')
            
            # Get total memory increase
            total_increase = sum(stat.size_diff for stat in top_stats)
            
            # Memory increase should be reasonable (less than 50MB)
            max_allowed_increase = 50 * 1024 * 1024  # 50 MB
            self.assertLess(total_increase, max_allowed_increase,
                          f"Memory increased by {total_increase / 1024 / 1024:.2f} MB")
            
            # Step 7: Verify all tasks have final status
            for task in tasks:
                updated_task = self.queue_manager.get_task(task.id)
                self.assertIn(updated_task.status, 
                            [DownloadStatus.COMPLETED, DownloadStatus.FAILED, DownloadStatus.STOPPED])


if __name__ == "__main__":
    unittest.main()



class TestRapidScreenChanges(unittest.TestCase):
    """Stress test with rapid screen changes."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Reset singletons
        DownloadService._instance = None
        ThreadPoolManager._instance = None
        
        self.download_service = DownloadService()
        self.queue_manager = self.download_service._queue_manager
        self.event_bus = self.download_service._event_bus
        
        # Create temp directory for downloads
        self.temp_dir = tempfile.mkdtemp()
        
        # Start memory tracking
        tracemalloc.start()
    
    def tearDown(self):
        """Clean up after tests."""
        # Stop memory tracking
        tracemalloc.stop()
        
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
    
    def test_rapid_screen_changes(self):
        """Test changing between screens every 100ms for 1 minute."""
        from utils.safe_callback_mixin import SafeCallbackMixin
        import tkinter as tk
        
        # Track crashes and callback leaks
        crashes = []
        total_callbacks_created = [0]
        total_callbacks_cleaned = [0]
        
        class MockScreen(SafeCallbackMixin, tk.Frame):
            """Mock screen for testing."""
            
            def __init__(self, parent, screen_id):
                tk.Frame.__init__(self, parent)
                SafeCallbackMixin.__init__(self)
                self.screen_id = screen_id
                self.event_subscriptions = []
                self.callback_count = 0
            
            def schedule_callbacks(self):
                """Schedule multiple callbacks to simulate real screen."""
                for i in range(10):
                    self.safe_after(50 * i, self._dummy_callback)
                    total_callbacks_created[0] += 1
            
            def _dummy_callback(self):
                """Dummy callback."""
                self.callback_count += 1
            
            def subscribe_to_events(self, event_bus):
                """Subscribe to events."""
                sub_id = event_bus.subscribe(
                    EventType.DOWNLOAD_PROGRESS,
                    self._on_event
                )
                self.event_subscriptions.append(sub_id)
            
            def _on_event(self, event):
                """Handle event."""
                pass
            
            def cleanup(self):
                """Cleanup callbacks and subscriptions."""
                for sub_id in self.event_subscriptions:
                    self.event_bus.unsubscribe(sub_id)
                self.event_subscriptions.clear()
                
                # Count callbacks before cleanup
                callbacks_to_clean = len(self._callback_ids)
                total_callbacks_cleaned[0] += callbacks_to_clean
                
                self.cleanup_callbacks()
        
        # Get initial memory usage
        snapshot_before = tracemalloc.take_snapshot()
        
        # Create tkinter root
        root = tk.Tk()
        root.withdraw()  # Hide window
        
        try:
            # Test duration: 1 minute
            test_duration = 60  # seconds
            screen_change_interval = 0.1  # 100ms
            
            start_time = time.time()
            screen_count = 0
            current_screen = None
            
            # Change screens rapidly
            while time.time() - start_time < test_duration:
                try:
                    # Cleanup previous screen
                    if current_screen is not None:
                        current_screen.cleanup()
                        current_screen.destroy()
                    
                    # Create new screen
                    current_screen = MockScreen(root, screen_count)
                    current_screen.event_bus = self.event_bus
                    current_screen.schedule_callbacks()
                    current_screen.subscribe_to_events(self.event_bus)
                    
                    screen_count += 1
                    
                    # Wait for interval
                    time.sleep(screen_change_interval)
                    
                except Exception as e:
                    import traceback as tb
                    crashes.append({
                        'screen_id': screen_count,
                        'error': str(e),
                        'traceback': tb.format_exc()
                    })
            
            # Cleanup final screen
            if current_screen is not None:
                current_screen.cleanup()
                current_screen.destroy()
            
            # Verify no crashes occurred
            self.assertEqual(len(crashes), 0, 
                           f"Expected no crashes, got {len(crashes)}: {crashes}")
            
            # Verify we changed screens many times
            expected_min_screens = int(test_duration / screen_change_interval * 0.8)
            self.assertGreater(screen_count, expected_min_screens,
                             f"Expected at least {expected_min_screens} screen changes")
            
            # Verify no callback leaks (most callbacks should be cleaned)
            # Some callbacks might execute before cleanup, so we allow some margin
            leak_ratio = (total_callbacks_created[0] - total_callbacks_cleaned[0]) / total_callbacks_created[0]
            self.assertLess(leak_ratio, 0.2,
                          f"Too many callbacks leaked: {leak_ratio * 100:.1f}%")
            
            # Check memory usage
            snapshot_after = tracemalloc.take_snapshot()
            top_stats = snapshot_after.compare_to(snapshot_before, 'lineno')
            
            # Get total memory increase
            total_increase = sum(stat.size_diff for stat in top_stats)
            
            # Memory increase should be reasonable (less than 30MB)
            max_allowed_increase = 30 * 1024 * 1024  # 30 MB
            self.assertLess(total_increase, max_allowed_increase,
                          f"Memory increased by {total_increase / 1024 / 1024:.2f} MB")
            
        finally:
            # Clean up tkinter
            try:
                root.destroy()
            except:
                pass



class TestConcurrentSearches(unittest.TestCase):
    """Stress test with concurrent searches."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Reset singletons
        ThreadPoolManager._instance = None
        SearchManager._instance = None
        
        self.search_manager = SearchManager()
        self.event_bus = EventBus()
        
        # Start memory tracking
        tracemalloc.start()
    
    def tearDown(self):
        """Clean up after tests."""
        # Stop memory tracking
        tracemalloc.stop()
        
        # Shutdown search manager
        if hasattr(self.search_manager, 'shutdown'):
            self.search_manager.shutdown()
        
        # Shutdown thread pools
        thread_pool_manager = ThreadPoolManager()
        thread_pool_manager.shutdown(timeout=5)
        
        # Stop event bus
        if self.event_bus._running:
            self.event_bus.stop()
        
        # Reset singletons
        ThreadPoolManager._instance = None
        SearchManager._instance = None
    
    @patch('controllers.search_manager.DDGS')
    def test_concurrent_searches(self, mock_ddgs_class):
        """Test executing 10 searches simultaneously, verify only 3 run at once."""
        # Track concurrent searches
        active_searches = []
        max_concurrent = [0]
        lock = threading.Lock()
        
        # Setup mock DDGS
        mock_ddgs_instance = Mock()
        
        def mock_videos(*args, **kwargs):
            """Mock search that tracks concurrency."""
            keywords = kwargs.get('keywords', '')
            
            with lock:
                active_searches.append(keywords)
                current_concurrent = len(active_searches)
                if current_concurrent > max_concurrent[0]:
                    max_concurrent[0] = current_concurrent
            
            # Simulate search time
            time.sleep(0.3)
            
            with lock:
                active_searches.remove(keywords)
            
            # Return mock results
            return [
                {
                    'content': f'https://youtube.com/watch?v=test_{keywords}',
                    'title': f'Test Video for {keywords}',
                    'duration': '5:00',
                    'uploader': 'Test Uploader',
                    'images': {'large': 'https://example.com/thumb.jpg'}
                }
            ]
        
        mock_ddgs_instance.videos.side_effect = mock_videos
        mock_ddgs_class.return_value = mock_ddgs_instance
        
        # Get initial memory usage
        snapshot_before = tracemalloc.take_snapshot()
        
        # Step 1: Execute 10 searches simultaneously
        search_queries = [f"test query {i}" for i in range(10)]
        search_futures = []
        
        for query in search_queries:
            # Submit searches to the search pool
            future = self.search_manager._thread_pool_manager.search_pool.submit(
                self.search_manager.search,
                query,
                limit=10
            )
            search_futures.append(future)
        
        # Step 2: Monitor that only 3 run concurrently
        time.sleep(0.2)  # Let searches start
        
        # Check max concurrent
        with lock:
            current_active = len(active_searches)
        
        # Should have at most 3 active
        self.assertLessEqual(current_active, 3,
                           f"Expected max 3 concurrent searches, got {current_active}")
        
        # Step 3: Wait for all to complete
        timeout = 10
        start_time = time.time()
        completed_count = 0
        failed_count = 0
        
        for future in search_futures:
            remaining_time = timeout - (time.time() - start_time)
            if remaining_time <= 0:
                break
            try:
                result = future.result(timeout=remaining_time)
                if result is not None:
                    completed_count += 1
                else:
                    failed_count += 1
            except Exception:
                failed_count += 1
        
        # Step 4: Verify all completed
        total_finished = completed_count + failed_count
        self.assertEqual(total_finished, 10,
                       f"Expected 10 searches to finish, got {total_finished}")
        
        # Step 5: Verify max concurrent was 3
        self.assertLessEqual(max_concurrent[0], 3,
                           f"Max concurrent searches should be 3, got {max_concurrent[0]}")
        
        # Step 6: Check memory usage
        snapshot_after = tracemalloc.take_snapshot()
        top_stats = snapshot_after.compare_to(snapshot_before, 'lineno')
        
        # Get total memory increase
        total_increase = sum(stat.size_diff for stat in top_stats)
        
        # Memory increase should be reasonable (less than 20MB)
        max_allowed_increase = 20 * 1024 * 1024  # 20 MB
        self.assertLess(total_increase, max_allowed_increase,
                      f"Memory increased by {total_increase / 1024 / 1024:.2f} MB")
