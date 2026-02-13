"""
ThreadPoolManager for centralized thread pool management.
Provides singleton access to download and search thread pools.
"""

import threading
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from utils.logger import get_logger


class ThreadPoolManager:
    """
    Centralized thread pool management with proper lifecycle.
    
    This singleton class manages all ThreadPoolExecutor instances in the
    application, ensuring proper initialization and shutdown. It provides
    separate thread pools for downloads and searches with appropriate
    worker limits.
    
    Usage:
        # Get singleton instance
        manager = ThreadPoolManager()
        
        # Submit download task
        future = manager.download_pool.submit(download_function, args)
        
        # Submit search task
        future = manager.search_pool.submit(search_function, args)
        
        # Shutdown when closing application
        manager.shutdown(timeout=10)
    """
    
    _instance: Optional['ThreadPoolManager'] = None
    _lock = threading.Lock()
    
    # Thread pool configuration
    MAX_DOWNLOAD_WORKERS = 3
    MAX_SEARCH_WORKERS = 3
    
    def __new__(cls):
        """
        Implement singleton pattern with thread-safe initialization.
        
        Uses double-checked locking to ensure only one instance is created
        even in multi-threaded environments.
        """
        # THREAD-SAFE SINGLETON: Double-checked locking pattern
        # First check without lock for performance (fast path)
        if cls._instance is None:
            # Acquire lock only if instance doesn't exist
            with cls._lock:
                # Second check with lock to prevent race condition
                # Multiple threads may have passed first check simultaneously
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize the ThreadPoolManager."""
        # Prevent re-initialization
        if hasattr(self, '_initialized'):
            return
        
        self._initialized = True
        self._download_pool: Optional[ThreadPoolExecutor] = None
        self._search_pool: Optional[ThreadPoolExecutor] = None
        self._shutdown_initiated = False
        self._logger = get_logger()
        self._logger.info("ThreadPoolManager initialized")
    
    @property
    def download_pool(self) -> ThreadPoolExecutor:
        """
        Get or create download thread pool.
        
        Lazy initialization ensures the pool is only created when needed.
        The pool has a maximum of 3 workers for concurrent downloads.
        
        Returns:
            ThreadPoolExecutor for download operations
        """
        # THREAD-SAFE LAZY INITIALIZATION: Double-checked locking
        # Lazy initialization avoids creating pools that may never be used
        if self._download_pool is None:
            with self._lock:
                # Double-check to prevent race condition
                if self._download_pool is None:
                    thread = threading.current_thread()
                    # IMPORTANT: max_workers=3 limits concurrent downloads
                    # This prevents overwhelming the system and network
                    self._download_pool = ThreadPoolExecutor(
                        max_workers=self.MAX_DOWNLOAD_WORKERS,
                        thread_name_prefix="download_worker"
                    )
                    self._logger.info(
                        f"[Thread-{thread.ident}:{thread.name}] Download thread pool created with {self.MAX_DOWNLOAD_WORKERS} workers"
                    )
        return self._download_pool
    
    @property
    def search_pool(self) -> ThreadPoolExecutor:
        """
        Get or create search thread pool.
        
        Lazy initialization ensures the pool is only created when needed.
        The pool has a maximum of 3 workers for concurrent searches.
        
        Returns:
            ThreadPoolExecutor for search operations
        """
        if self._search_pool is None:
            with self._lock:
                if self._search_pool is None:
                    thread = threading.current_thread()
                    self._search_pool = ThreadPoolExecutor(
                        max_workers=self.MAX_SEARCH_WORKERS,
                        thread_name_prefix="search_worker"
                    )
                    self._logger.info(
                        f"[Thread-{thread.ident}:{thread.name}] Search thread pool created with {self.MAX_SEARCH_WORKERS} workers"
                    )
        return self._search_pool
    
    def shutdown(self, timeout: int = 10) -> bool:
        """
        Shutdown all thread pools gracefully.
        
        This method initiates shutdown of all thread pools and waits for
        them to complete within the specified timeout. It should be called
        when the application is closing.
        
        Args:
            timeout: Maximum time in seconds to wait for shutdown
        
        Returns:
            True if all pools shut down successfully, False if timeout occurred
        """
        if self._shutdown_initiated:
            self._logger.warning("Shutdown already initiated")
            return True
        
        self._shutdown_initiated = True
        thread = threading.current_thread()
        self._logger.info(
            f"[Thread-{thread.ident}:{thread.name}] Shutting down thread pools (timeout: {timeout}s)..."
        )
        
        start_time = time.time()
        success = True
        
        # Shutdown download pool
        if self._download_pool is not None:
            try:
                self._logger.info(
                    f"[Thread-{thread.ident}:{thread.name}] Shutting down download pool..."
                )
                self._download_pool.shutdown(wait=False)
                
                # Wait for completion with timeout
                remaining_time = timeout - (time.time() - start_time)
                if remaining_time > 0:
                    # Give it half the remaining time
                    wait_time = min(remaining_time / 2, timeout / 2)
                    self._wait_for_pool_shutdown(self._download_pool, wait_time)
                    self._logger.info(
                        f"[Thread-{thread.ident}:{thread.name}] Download pool shut down successfully"
                    )
                else:
                    self._logger.warning(
                        f"[Thread-{thread.ident}:{thread.name}] Download pool shutdown timeout"
                    )
                    success = False
            except Exception as e:
                self._logger.error(
                    f"[Thread-{thread.ident}:{thread.name}] Error shutting down download pool: {str(e)}"
                )
                success = False
        
        # Shutdown search pool
        if self._search_pool is not None:
            try:
                self._logger.info(
                    f"[Thread-{thread.ident}:{thread.name}] Shutting down search pool..."
                )
                self._search_pool.shutdown(wait=False)
                
                # Wait for completion with remaining timeout
                remaining_time = timeout - (time.time() - start_time)
                if remaining_time > 0:
                    self._wait_for_pool_shutdown(self._search_pool, remaining_time)
                    self._logger.info(
                        f"[Thread-{thread.ident}:{thread.name}] Search pool shut down successfully"
                    )
                else:
                    self._logger.warning(
                        f"[Thread-{thread.ident}:{thread.name}] Search pool shutdown timeout"
                    )
                    success = False
            except Exception as e:
                self._logger.error(
                    f"[Thread-{thread.ident}:{thread.name}] Error shutting down search pool: {str(e)}"
                )
                success = False
        
        elapsed = time.time() - start_time
        if success:
            self._logger.info(
                f"[Thread-{thread.ident}:{thread.name}] All thread pools terminated successfully in {elapsed:.2f}s"
            )
        else:
            self._logger.warning(
                f"[Thread-{thread.ident}:{thread.name}] Thread pool shutdown completed with warnings after {elapsed:.2f}s"
            )
        
        return success
    
    def _wait_for_pool_shutdown(self, pool: ThreadPoolExecutor, timeout: float) -> None:
        """
        Wait for a thread pool to shut down.
        
        Args:
            pool: ThreadPoolExecutor to wait for
            timeout: Maximum time to wait in seconds
        """
        start_time = time.time()
        while time.time() - start_time < timeout:
            # Check if pool has any running threads
            # Note: ThreadPoolExecutor doesn't expose a direct way to check
            # if all threads are done, so we use a simple time-based approach
            time.sleep(0.1)
            
            # If we've waited a reasonable amount, assume it's done
            if time.time() - start_time > timeout * 0.8:
                break
    
    def is_download_pool_active(self) -> bool:
        """
        Check if download pool has been created.
        
        Returns:
            True if download pool exists, False otherwise
        """
        return self._download_pool is not None
    
    def is_search_pool_active(self) -> bool:
        """
        Check if search pool has been created.
        
        Returns:
            True if search pool exists, False otherwise
        """
        return self._search_pool is not None
    
    def get_download_worker_count(self) -> int:
        """
        Get the maximum number of download workers.
        
        Returns:
            Maximum number of concurrent download workers
        """
        return self.MAX_DOWNLOAD_WORKERS
    
    def get_search_worker_count(self) -> int:
        """
        Get the maximum number of search workers.
        
        Returns:
            Maximum number of concurrent search workers
        """
        return self.MAX_SEARCH_WORKERS
