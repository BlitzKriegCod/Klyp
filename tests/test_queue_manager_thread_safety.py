"""
Unit tests for QueueManager thread-safety.
Tests concurrent access to add_task, update_task_status, and race conditions.
"""

import unittest
import threading
import time
from models import VideoInfo, DownloadStatus
from controllers import QueueManager


class TestQueueManagerThreadSafety(unittest.TestCase):
    """Test cases for QueueManager thread-safety."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.queue_manager = QueueManager()
    
    def tearDown(self):
        """Clean up after tests."""
        self.queue_manager.clear_queue()
    
    def test_concurrent_add_task(self):
        """Test concurrent add_task operations."""
        num_threads = 10
        tasks_per_thread = 10
        
        def add_tasks(thread_id):
            for i in range(tasks_per_thread):
                video_info = VideoInfo(
                    url=f"https://test.com/video/{thread_id}_{i}",
                    title=f"Video {thread_id}_{i}"
                )
                try:
                    self.queue_manager.add_task(video_info)
                except ValueError:
                    # Duplicate URL, expected in concurrent scenario
                    pass
        
        # Create and start threads
        threads = []
        for i in range(num_threads):
            thread = threading.Thread(target=add_tasks, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Should have exactly num_threads * tasks_per_thread tasks
        all_tasks = self.queue_manager.get_all_tasks()
        expected_count = num_threads * tasks_per_thread
        self.assertEqual(len(all_tasks), expected_count)
        
        # Verify no duplicate URLs
        urls = [task.video_info.url for task in all_tasks]
        self.assertEqual(len(urls), len(set(urls)))
    
    def test_concurrent_update_task_status(self):
        """Test concurrent update_task_status operations."""
        # Add initial tasks
        tasks = []
        for i in range(20):
            video_info = VideoInfo(
                url=f"https://test.com/video/{i}",
                title=f"Video {i}"
            )
            task = self.queue_manager.add_task(video_info)
            tasks.append(task)
        
        # Update statuses concurrently
        def update_statuses(task_subset):
            for task in task_subset:
                # Update multiple times
                self.queue_manager.update_task_status(
                    task.id, DownloadStatus.DOWNLOADING, 25.0
                )
                time.sleep(0.001)
                self.queue_manager.update_task_status(
                    task.id, DownloadStatus.DOWNLOADING, 50.0
                )
                time.sleep(0.001)
                self.queue_manager.update_task_status(
                    task.id, DownloadStatus.COMPLETED, 100.0
                )
        
        # Split tasks among threads
        num_threads = 4
        tasks_per_thread = len(tasks) // num_threads
        
        threads = []
        for i in range(num_threads):
            start_idx = i * tasks_per_thread
            end_idx = start_idx + tasks_per_thread
            task_subset = tasks[start_idx:end_idx]
            
            thread = threading.Thread(target=update_statuses, args=(task_subset,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # All tasks should be completed
        completed_tasks = self.queue_manager.get_tasks_by_status(DownloadStatus.COMPLETED)
        self.assertEqual(len(completed_tasks), len(tasks))
    
    def test_concurrent_add_and_remove(self):
        """Test concurrent add and remove operations."""
        added_tasks = []
        lock = threading.Lock()
        
        def add_tasks():
            for i in range(50):
                video_info = VideoInfo(
                    url=f"https://test.com/add/{i}_{threading.current_thread().name}",
                    title=f"Video {i}"
                )
                task = self.queue_manager.add_task(video_info)
                with lock:
                    added_tasks.append(task.id)
                time.sleep(0.001)
        
        def remove_tasks():
            time.sleep(0.01)  # Let some tasks be added first
            for _ in range(25):
                with lock:
                    if added_tasks:
                        task_id = added_tasks.pop(0)
                        self.queue_manager.remove_task(task_id)
                time.sleep(0.001)
        
        # Create threads
        add_thread1 = threading.Thread(target=add_tasks)
        add_thread2 = threading.Thread(target=add_tasks)
        remove_thread = threading.Thread(target=remove_tasks)
        
        # Start threads
        add_thread1.start()
        add_thread2.start()
        remove_thread.start()
        
        # Wait for completion
        add_thread1.join()
        add_thread2.join()
        remove_thread.join()
        
        # Should have some tasks remaining
        remaining_tasks = self.queue_manager.get_all_tasks()
        self.assertGreater(len(remaining_tasks), 0)
        self.assertLess(len(remaining_tasks), 100)
    
    def test_concurrent_get_and_update(self):
        """Test concurrent get_task and update_task_status operations."""
        # Add tasks
        tasks = []
        for i in range(10):
            video_info = VideoInfo(
                url=f"https://test.com/video/{i}",
                title=f"Video {i}"
            )
            task = self.queue_manager.add_task(video_info)
            tasks.append(task)
        
        update_counts = [0] * len(tasks)
        lock = threading.Lock()
        
        def get_and_update(task_index):
            task_id = tasks[task_index].id
            for _ in range(100):
                # Get task
                task = self.queue_manager.get_task(task_id)
                if task:
                    # Update status
                    new_progress = (task.progress + 1) % 101
                    self.queue_manager.update_task_status(
                        task_id,
                        DownloadStatus.DOWNLOADING,
                        new_progress
                    )
                    with lock:
                        update_counts[task_index] += 1
        
        # Create threads for each task
        threads = []
        for i in range(len(tasks)):
            thread = threading.Thread(target=get_and_update, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # All updates should have succeeded
        for count in update_counts:
            self.assertEqual(count, 100)
    
    def test_no_race_condition_in_add_task(self):
        """Test that add_task doesn't have race conditions with duplicate detection."""
        # Try to add the same URL from multiple threads
        video_info = VideoInfo(
            url="https://test.com/same_video",
            title="Same Video"
        )
        
        results = []
        lock = threading.Lock()
        
        def try_add_task():
            try:
                task = self.queue_manager.add_task(video_info)
                with lock:
                    results.append(("success", task.id))
            except ValueError as e:
                with lock:
                    results.append(("error", str(e)))
        
        # Create multiple threads trying to add same URL
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=try_add_task)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # Exactly one should succeed, others should get ValueError
        successes = [r for r in results if r[0] == "success"]
        errors = [r for r in results if r[0] == "error"]
        
        self.assertEqual(len(successes), 1)
        self.assertEqual(len(errors), 9)
        
        # Queue should have exactly one task
        all_tasks = self.queue_manager.get_all_tasks()
        self.assertEqual(len(all_tasks), 1)
    
    def test_concurrent_get_all_tasks(self):
        """Test concurrent get_all_tasks operations."""
        # Add tasks
        for i in range(20):
            video_info = VideoInfo(
                url=f"https://test.com/video/{i}",
                title=f"Video {i}"
            )
            self.queue_manager.add_task(video_info)
        
        results = []
        lock = threading.Lock()
        
        def get_all():
            for _ in range(50):
                tasks = self.queue_manager.get_all_tasks()
                with lock:
                    results.append(len(tasks))
                time.sleep(0.001)
        
        # Create multiple threads
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=get_all)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # All results should be consistent
        self.assertEqual(len(results), 250)  # 5 threads * 50 calls
        # All should return 20 tasks (since we're not modifying)
        for count in results:
            self.assertEqual(count, 20)
    
    def test_concurrent_is_url_in_queue(self):
        """Test concurrent is_url_in_queue operations."""
        # Add some tasks
        urls = [f"https://test.com/video/{i}" for i in range(10)]
        for url in urls:
            video_info = VideoInfo(url=url, title="Test")
            self.queue_manager.add_task(video_info)
        
        results = []
        lock = threading.Lock()
        
        def check_urls():
            for url in urls:
                result = self.queue_manager.is_url_in_queue(url)
                with lock:
                    results.append(result)
            
            # Also check non-existent URL
            result = self.queue_manager.is_url_in_queue("https://test.com/nonexistent")
            with lock:
                results.append(result)
        
        # Create multiple threads
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=check_urls)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # Should have 110 results (10 threads * 11 checks)
        self.assertEqual(len(results), 110)
        
        # First 100 should be True (10 threads * 10 existing URLs)
        # Last 10 should be False (10 threads * 1 non-existent URL)
        true_count = sum(1 for r in results if r is True)
        false_count = sum(1 for r in results if r is False)
        
        self.assertEqual(true_count, 100)
        self.assertEqual(false_count, 10)
    
    def test_concurrent_get_tasks_by_status(self):
        """Test concurrent get_tasks_by_status operations."""
        # Add tasks with different statuses
        for i in range(30):
            video_info = VideoInfo(
                url=f"https://test.com/video/{i}",
                title=f"Video {i}"
            )
            task = self.queue_manager.add_task(video_info)
            
            # Set different statuses
            if i < 10:
                self.queue_manager.update_task_status(task.id, DownloadStatus.QUEUED)
            elif i < 20:
                self.queue_manager.update_task_status(task.id, DownloadStatus.DOWNLOADING)
            else:
                self.queue_manager.update_task_status(task.id, DownloadStatus.COMPLETED)
        
        results = {
            DownloadStatus.QUEUED: [],
            DownloadStatus.DOWNLOADING: [],
            DownloadStatus.COMPLETED: []
        }
        lock = threading.Lock()
        
        def get_by_status(status):
            for _ in range(50):
                tasks = self.queue_manager.get_tasks_by_status(status)
                with lock:
                    results[status].append(len(tasks))
                time.sleep(0.001)
        
        # Create threads for each status
        threads = []
        for status in [DownloadStatus.QUEUED, DownloadStatus.DOWNLOADING, DownloadStatus.COMPLETED]:
            thread = threading.Thread(target=get_by_status, args=(status,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # Verify results are consistent
        for status, counts in results.items():
            self.assertEqual(len(counts), 50)
            # All counts should be the same for each status
            unique_counts = set(counts)
            self.assertEqual(len(unique_counts), 1)
    
    def test_stress_test_mixed_operations(self):
        """Stress test with mixed concurrent operations."""
        operations_completed = []
        lock = threading.Lock()
        
        def mixed_operations(thread_id):
            for i in range(20):
                # Add task
                video_info = VideoInfo(
                    url=f"https://test.com/video/{thread_id}_{i}",
                    title=f"Video {thread_id}_{i}"
                )
                task = self.queue_manager.add_task(video_info)
                
                # Update status
                self.queue_manager.update_task_status(
                    task.id, DownloadStatus.DOWNLOADING, 50.0
                )
                
                # Get task
                retrieved_task = self.queue_manager.get_task(task.id)
                self.assertIsNotNone(retrieved_task)
                
                # Check URL
                self.assertTrue(self.queue_manager.is_url_in_queue(video_info.url))
                
                # Get all tasks
                all_tasks = self.queue_manager.get_all_tasks()
                self.assertGreater(len(all_tasks), 0)
                
                with lock:
                    operations_completed.append(thread_id)
        
        # Create multiple threads
        num_threads = 5
        threads = []
        for i in range(num_threads):
            thread = threading.Thread(target=mixed_operations, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # All operations should complete
        self.assertEqual(len(operations_completed), num_threads * 20)
        
        # Should have all tasks
        all_tasks = self.queue_manager.get_all_tasks()
        self.assertEqual(len(all_tasks), num_threads * 20)


if __name__ == "__main__":
    unittest.main()
