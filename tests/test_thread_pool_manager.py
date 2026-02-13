"""
Unit tests for ThreadPoolManager.
Tests singleton pattern, pool creation, shutdown, and thread-safety.
"""

import unittest
import threading
import time
from concurrent.futures import Future
from utils.thread_pool_manager import ThreadPoolManager


class TestThreadPoolManager(unittest.TestCase):
    """Test cases for ThreadPoolManager."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Reset singleton instance for each test
        ThreadPoolManager._instance = None
    
    def tearDown(self):
        """Clean up after tests."""
        # Shutdown any active pools
        if ThreadPoolManager._instance is not None:
            manager = ThreadPoolManager()
            if hasattr(manager, '_initialized'):
                manager.shutdown(timeout=2)
        
        # Reset singleton
        ThreadPoolManager._instance = None
    
    def test_singleton_pattern(self):
        """Test that ThreadPoolManager implements singleton pattern."""
        manager1 = ThreadPoolManager()
        manager2 = ThreadPoolManager()
        
        # Should be the same instance
        self.assertIs(manager1, manager2)
    
    def test_singleton_thread_safety(self):
        """Test thread-safe singleton initialization."""
        instances = []
        lock = threading.Lock()
        
        def create_instance():
            manager = ThreadPoolManager()
            with lock:
                instances.append(manager)
        
        # Create multiple threads that try to get the singleton
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=create_instance)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # All instances should be the same object
        self.assertEqual(len(instances), 10)
        first_instance = instances[0]
        for instance in instances:
            self.assertIs(instance, first_instance)
    
    def test_download_pool_creation(self):
        """Test lazy creation of download pool."""
        manager = ThreadPoolManager()
        
        # Pool should not exist initially
        self.assertFalse(manager.is_download_pool_active())
        
        # Access pool should create it
        pool = manager.download_pool
        self.assertIsNotNone(pool)
        self.assertTrue(manager.is_download_pool_active())
        
        # Subsequent access should return same pool
        pool2 = manager.download_pool
        self.assertIs(pool, pool2)
    
    def test_search_pool_creation(self):
        """Test lazy creation of search pool."""
        manager = ThreadPoolManager()
        
        # Pool should not exist initially
        self.assertFalse(manager.is_search_pool_active())
        
        # Access pool should create it
        pool = manager.search_pool
        self.assertIsNotNone(pool)
        self.assertTrue(manager.is_search_pool_active())
        
        # Subsequent access should return same pool
        pool2 = manager.search_pool
        self.assertIs(pool, pool2)
    
    def test_download_pool_worker_count(self):
        """Test download pool has correct number of workers."""
        manager = ThreadPoolManager()
        
        # Get worker count
        worker_count = manager.get_download_worker_count()
        self.assertEqual(worker_count, 3)
    
    def test_search_pool_worker_count(self):
        """Test search pool has correct number of workers."""
        manager = ThreadPoolManager()
        
        # Get worker count
        worker_count = manager.get_search_worker_count()
        self.assertEqual(worker_count, 3)
    
    def test_download_pool_executes_tasks(self):
        """Test that download pool can execute tasks."""
        manager = ThreadPoolManager()
        
        results = []
        lock = threading.Lock()
        
        def test_task(value):
            time.sleep(0.1)
            with lock:
                results.append(value)
            return value * 2
        
        # Submit tasks
        futures = []
        for i in range(5):
            future = manager.download_pool.submit(test_task, i)
            futures.append(future)
        
        # Wait for completion
        for future in futures:
            future.result(timeout=2)
        
        # All tasks should complete
        self.assertEqual(len(results), 5)
        self.assertEqual(sorted(results), [0, 1, 2, 3, 4])
    
    def test_search_pool_executes_tasks(self):
        """Test that search pool can execute tasks."""
        manager = ThreadPoolManager()
        
        results = []
        lock = threading.Lock()
        
        def test_task(value):
            time.sleep(0.1)
            with lock:
                results.append(value)
            return value * 3
        
        # Submit tasks
        futures = []
        for i in range(5):
            future = manager.search_pool.submit(test_task, i)
            futures.append(future)
        
        # Wait for completion
        for future in futures:
            future.result(timeout=2)
        
        # All tasks should complete
        self.assertEqual(len(results), 5)
        self.assertEqual(sorted(results), [0, 1, 2, 3, 4])
    
    def test_shutdown_with_timeout(self):
        """Test shutdown with timeout."""
        manager = ThreadPoolManager()
        
        # Create pools by accessing them
        _ = manager.download_pool
        _ = manager.search_pool
        
        # Submit some quick tasks
        def quick_task():
            time.sleep(0.1)
            return "done"
        
        manager.download_pool.submit(quick_task)
        manager.search_pool.submit(quick_task)
        
        # Shutdown
        start_time = time.time()
        result = manager.shutdown(timeout=5)
        elapsed = time.time() - start_time
        
        # Should complete successfully
        self.assertTrue(result)
        # Should complete quickly (tasks are short)
        self.assertLess(elapsed, 5)
    
    def test_shutdown_without_pools(self):
        """Test shutdown when no pools have been created."""
        manager = ThreadPoolManager()
        
        # Shutdown without creating pools
        result = manager.shutdown(timeout=1)
        
        # Should succeed (nothing to shutdown)
        self.assertTrue(result)
    
    def test_shutdown_idempotent(self):
        """Test that shutdown can be called multiple times."""
        manager = ThreadPoolManager()
        
        # Create pools
        _ = manager.download_pool
        _ = manager.search_pool
        
        # First shutdown
        result1 = manager.shutdown(timeout=2)
        self.assertTrue(result1)
        
        # Second shutdown should not fail
        result2 = manager.shutdown(timeout=2)
        self.assertTrue(result2)
    
    def test_concurrent_pool_access(self):
        """Test concurrent access to pools from multiple threads."""
        manager = ThreadPoolManager()
        
        download_pools = []
        search_pools = []
        lock = threading.Lock()
        
        def access_pools():
            dp = manager.download_pool
            sp = manager.search_pool
            with lock:
                download_pools.append(dp)
                search_pools.append(sp)
        
        # Create multiple threads
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=access_pools)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # All threads should get the same pool instances
        self.assertEqual(len(download_pools), 10)
        self.assertEqual(len(search_pools), 10)
        
        first_download_pool = download_pools[0]
        first_search_pool = search_pools[0]
        
        for dp in download_pools:
            self.assertIs(dp, first_download_pool)
        
        for sp in search_pools:
            self.assertIs(sp, first_search_pool)
    
    def test_pool_isolation(self):
        """Test that download and search pools are separate."""
        manager = ThreadPoolManager()
        
        download_pool = manager.download_pool
        search_pool = manager.search_pool
        
        # Pools should be different objects
        self.assertIsNot(download_pool, search_pool)
    
    def test_max_concurrent_workers(self):
        """Test that pools respect max worker limits."""
        manager = ThreadPoolManager()
        
        active_count = []
        max_active = [0]
        lock = threading.Lock()
        
        def long_task():
            with lock:
                active_count.append(1)
                current_active = len(active_count)
                if current_active > max_active[0]:
                    max_active[0] = current_active
            
            time.sleep(0.5)
            
            with lock:
                active_count.pop()
        
        # Submit more tasks than max workers
        futures = []
        for _ in range(10):
            future = manager.download_pool.submit(long_task)
            futures.append(future)
        
        # Wait for all to complete
        for future in futures:
            future.result(timeout=10)
        
        # Max active should not exceed worker limit
        self.assertLessEqual(max_active[0], manager.get_download_worker_count())
    
    def test_shutdown_waits_for_tasks(self):
        """Test that shutdown waits for running tasks to complete."""
        manager = ThreadPoolManager()
        
        task_completed = []
        
        def slow_task():
            time.sleep(0.5)
            task_completed.append(True)
            return "done"
        
        # Submit task
        future = manager.download_pool.submit(slow_task)
        
        # Shutdown with sufficient timeout
        result = manager.shutdown(timeout=2)
        
        # Task should have completed
        self.assertTrue(result)
        self.assertEqual(len(task_completed), 1)
    
    def test_no_reinitialization(self):
        """Test that __init__ doesn't reinitialize singleton."""
        manager1 = ThreadPoolManager()
        
        # Access pools to create them
        pool1 = manager1.download_pool
        
        # Get instance again (should be same)
        manager2 = ThreadPoolManager()
        pool2 = manager2.download_pool
        
        # Pools should be the same
        self.assertIs(pool1, pool2)
        
        # Manager should be the same
        self.assertIs(manager1, manager2)


if __name__ == "__main__":
    unittest.main()
