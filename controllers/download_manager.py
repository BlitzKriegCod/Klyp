"""
Download Manager for Klyp Video Downloader.
Manages download queue processing with multi-threaded and sequential modes.

DEPRECATED: This class is now a wrapper around DownloadService.
New code should use DownloadService directly for better thread-safety and architecture.
"""

# Standard library imports
import threading
import warnings
from typing import Optional, Callable

# Local imports
from models import DownloadTask, DownloadStatus
from .download_service import DownloadService
from .history_manager import HistoryManager
from .queue_manager import QueueManager
from utils.decorators import deprecated
from utils.logger import get_logger
from utils.notification_manager import NotificationManager
from utils.video_downloader import VideoDownloader


class DownloadManager:
    """
    Manages download queue processing and status updates.
    
    DEPRECATED: This class is now a wrapper around DownloadService.
    It maintains backward compatibility but delegates all operations to DownloadService.
    New code should use DownloadService directly.
    """
    
    def __init__(self, queue_manager: QueueManager, history_manager: Optional[HistoryManager] = None, max_concurrent_downloads: int = 3):
        """
        Initialize DownloadManager.
        
        DEPRECATED: Parameters queue_manager, history_manager, and max_concurrent_downloads
        are maintained for compatibility but are no longer used internally.
        DownloadService manages these dependencies as singletons.
        
        Args:
            queue_manager: QueueManager instance (deprecated, kept for compatibility)
            history_manager: HistoryManager instance (deprecated, kept for compatibility)
            max_concurrent_downloads: Maximum concurrent downloads (deprecated, kept for compatibility)
        """
        self.logger = get_logger()
        self.logger.warning(
            "DownloadManager is deprecated. Consider using DownloadService directly. "
            "DownloadManager now acts as a wrapper for backward compatibility."
        )
        
        # Get DownloadService singleton instance
        self._download_service = DownloadService()
        
        # Maintain references to managers for compatibility
        # These are kept so existing code that accesses them doesn't break
        self.queue_manager = queue_manager
        self.history_manager = history_manager or HistoryManager()
        
        # Deprecated parameters - kept for compatibility but not used
        self.max_concurrent_downloads = max_concurrent_downloads
        if max_concurrent_downloads != 3:
            self.logger.warning(
                f"max_concurrent_downloads parameter ({max_concurrent_downloads}) is deprecated "
                "and no longer affects behavior. ThreadPoolManager uses fixed pool size of 3."
            )
        
        # Legacy fields maintained for compatibility
        self.video_downloader = VideoDownloader()
        self.notification_manager = NotificationManager()
        self.is_running = False
        self.download_mode = "sequential"  # Deprecated, kept for compatibility
        self.lock = threading.Lock()
        self.completed_count = 0
        self.failed_count = 0
        self.total_count = 0
        self.pending_downloads_file: Optional[str] = None
        
        self.logger.info("DownloadManager initialized (wrapper mode)")
    
    def set_download_mode(self, mode: str) -> None:
        """
        Set the download mode.
        
        Args:
            mode: "sequential" or "multi-threaded"
        
        Raises:
            ValueError: If mode is invalid.
        """
        if mode not in ["sequential", "multi-threaded"]:
            raise ValueError("Mode must be 'sequential' or 'multi-threaded'")
        self.download_mode = mode
        self.logger.info(f"Download mode set to: {mode}")
    
    @deprecated(replacement="EventBus.subscribe()")
    def set_status_callback(self, callback: Callable[[str, DownloadStatus, float], None]) -> None:
        """
        Set callback for status updates.
        
        DEPRECATED: Status callbacks are deprecated. Use EventBus subscriptions instead.
        Screens should subscribe to DOWNLOAD_PROGRESS, DOWNLOAD_COMPLETE, and DOWNLOAD_FAILED events.
        This method is kept for backward compatibility but does nothing.
        
        Args:
            callback: Function to call with (task_id, status, progress) on updates (ignored).
        """
        warnings.warn(
            "set_status_callback() is deprecated. Use EventBus subscriptions instead. "
            "Subscribe to DOWNLOAD_PROGRESS, DOWNLOAD_COMPLETE, and DOWNLOAD_FAILED events.",
            DeprecationWarning,
            stacklevel=2
        )
    
    def set_cookies_file(self, cookies_file: str) -> None:
        """
        Set cookies file for authentication.
        
        Args:
            cookies_file: Path to cookies file.
        """
        self.video_downloader = VideoDownloader(cookies_file=cookies_file)
    
    def set_notifications_enabled(self, enabled: bool) -> None:
        """
        Enable or disable desktop notifications.
        
        Args:
            enabled: Whether to enable notifications.
        """
        self.notification_manager.set_enabled(enabled)
    
    def set_pending_downloads_file(self, file_path: str) -> None:
        """
        Set the file path for saving pending downloads.
        
        Args:
            file_path: Path to the pending downloads file.
        """
        self.pending_downloads_file = file_path
    
    def save_pending_downloads(self) -> bool:
        """
        Save pending downloads to file.
        
        Returns:
            True if successful, False otherwise.
        """
        if self.pending_downloads_file:
            return self.queue_manager.save_pending_downloads(self.pending_downloads_file)
        return False

    def _update_task_status(self, task_id: str, status: DownloadStatus, 
                           progress: float = None, error_message: str = "") -> None:
        """
        Update task status and notify callback.
        
        Args:
            task_id: Task ID to update.
            status: New status.
            progress: Progress percentage (0-100).
            error_message: Error message if failed.
        """
        old_status = None
        task = self.queue_manager.get_task(task_id)
        if task:
            old_status = task.status
        
        self.queue_manager.update_task_status(task_id, status, progress, error_message)
        
        # Auto-save pending downloads when status changes (but not on progress updates)
        # Do it in a separate thread to avoid blocking
        if old_status != status and status in [DownloadStatus.QUEUED, DownloadStatus.DOWNLOADING, DownloadStatus.STOPPED, DownloadStatus.COMPLETED, DownloadStatus.FAILED]:
            threading.Thread(target=self.save_pending_downloads, daemon=True).start()
    
    def fetch_metadata(self, task_id: str) -> None:
        """
        Fetch metadata for a task in the background.
        
        Args:
            task_id: ID of the task to fetch metadata for.
        """
        def _fetch_worker():
            task = self.queue_manager.get_task(task_id)
            if not task:
                return
                
            try:
                self.logger.info(f"Fetching metadata for task {task_id}")
                video_info = self.video_downloader.extract_info(task.video_info.url)
                
                # Preserve some original fields if needed (like selected quality if set)
                # But here extract_info returns a fresh VideoInfo
                # Let's ensure we keep user preferences if they were set, 
                # though currently they are defaults on add.
                
                # Update task with new info
                self.queue_manager.update_task_info(task_id, video_info)
                self.logger.info(f"Metadata updated for task {task_id}: {video_info.title}")
                    
            except Exception as e:
                self.logger.error(f"Failed to fetch metadata for task {task_id}: {str(e)}")
        
        threading.Thread(target=_fetch_worker, daemon=True).start()
    
    @deprecated(replacement="DownloadService.start_all_downloads()")
    def start_downloads(self) -> None:
        """
        Start processing the download queue.
        
        DEPRECATED: This method now delegates to DownloadService.start_all_downloads().
        The download_mode parameter is ignored as DownloadService always uses
        multi-threaded mode with ThreadPoolManager.
        """
        warnings.warn(
            "DownloadManager.start_downloads() is deprecated. Use DownloadService.start_all_downloads() instead.",
            DeprecationWarning,
            stacklevel=2
        )
        
        if self.is_running:
            self.logger.warning("Downloads already running")
            return
        
        self.is_running = True
        self.logger.info("Starting download processing (delegating to DownloadService)")
        
        # Reset counters for compatibility
        with self.lock:
            self.completed_count = 0
            self.failed_count = 0
            self.total_count = len(self.queue_manager.get_tasks_by_status(DownloadStatus.QUEUED))
        
        self.logger.info(f"Total queued tasks: {self.total_count}")
        
        # Delegate to DownloadService
        started_count = self._download_service.start_all_downloads()
        self.logger.info(f"DownloadService started {started_count} download(s)")
    
    @deprecated(replacement="DownloadService.stop_all_downloads()")
    def stop_all_downloads(self) -> None:
        """
        Stop all active downloads.
        
        DEPRECATED: This method now delegates to DownloadService.stop_all_downloads().
        """
        warnings.warn(
            "DownloadManager.stop_all_downloads() is deprecated. Use DownloadService.stop_all_downloads() instead.",
            DeprecationWarning,
            stacklevel=2
        )
        
        self.is_running = False
        self.logger.info("Stopping all downloads (delegating to DownloadService)")
        
        # Delegate to DownloadService
        self._download_service.stop_all_downloads()
        
        self.logger.info("All downloads stopped")
            
    @deprecated(replacement="DownloadService.stop_download()")
    def stop_task(self, task_id: str) -> bool:
        """
        Stop a specific download task.
        
        DEPRECATED: This method now delegates to DownloadService.stop_download().
        
        Args:
            task_id: ID of the task to stop.
            
        Returns:
            True if task was stopped or already stopped, False if not found.
        """
        warnings.warn(
            "DownloadManager.stop_task() is deprecated. Use DownloadService.stop_download() instead.",
            DeprecationWarning,
            stacklevel=2
        )
        
        task = self.queue_manager.get_task(task_id)
        if not task:
            self.logger.warning(f"Task {task_id} not found")
            return False
        
        if task.status == DownloadStatus.DOWNLOADING:
            # Delegate to DownloadService
            self.logger.info(f"Stopping task {task_id} (delegating to DownloadService)")
            return self._download_service.stop_download(task_id)
        elif task.status == DownloadStatus.QUEUED:
            # If it hasn't started yet, just mark as stopped
            self.logger.info(f"Marking queued task {task_id} as stopped")
            self._update_task_status(task_id, DownloadStatus.STOPPED, error_message="Paused by user")
            return True
        
        return False
        
    @deprecated(replacement="DownloadService.start_download()")
    def start_task(self, task_id: str) -> bool:
        """
        Start a specific download task.
        
        DEPRECATED: This method now delegates to DownloadService.start_download().
        
        Args:
            task_id: ID of the task to start.
            
        Returns:
            True if task was started or queued, False if not found.
        """
        warnings.warn(
            "DownloadManager.start_task() is deprecated. Use DownloadService.start_download() instead.",
            DeprecationWarning,
            stacklevel=2
        )
        
        task = self.queue_manager.get_task(task_id)
        if not task:
            self.logger.warning(f"Task {task_id} not found")
            return False
        
        # If task is already downloading, return True
        if task.status == DownloadStatus.DOWNLOADING:
            self.logger.info(f"Task {task_id} is already downloading")
            return True
        
        # Reset task to queued if it's not already
        if task.status != DownloadStatus.QUEUED:
            self.logger.info(f"Resetting task {task_id} to QUEUED status")
            self._update_task_status(task_id, DownloadStatus.QUEUED, 0.0)
        
        # Delegate to DownloadService
        self.logger.info(f"Starting task {task_id} (delegating to DownloadService)")
        success = self._download_service.start_download(task_id)
        
        if success:
            # Update is_running flag for compatibility
            self.is_running = True
        
        return success
    
    @deprecated(replacement="DownloadService.get_active_count()")
    def get_active_download_count(self) -> int:
        """
        Get the number of currently active downloads.
        
        DEPRECATED: This method now delegates to DownloadService.get_active_count().
        
        Returns:
            Number of active downloads.
        """
        warnings.warn(
            "DownloadManager.get_active_download_count() is deprecated. Use DownloadService.get_active_count() instead.",
            DeprecationWarning,
            stacklevel=2
        )
        return self._download_service.get_active_count()
    
    @deprecated(replacement="QueueManager.get_task()")
    def is_task_downloading(self, task_id: str) -> bool:
        """
        Check if a task is currently downloading.
        
        DEPRECATED: This method checks the task status from QueueManager.
        Use QueueManager.get_task() and check status directly instead.
        
        Args:
            task_id: Task ID to check.
        
        Returns:
            True if task is downloading, False otherwise.
        """
        warnings.warn(
            "DownloadManager.is_task_downloading() is deprecated. Use QueueManager.get_task() and check status instead.",
            DeprecationWarning,
            stacklevel=2
        )
        task = self.queue_manager.get_task(task_id)
        if task:
            return task.status == DownloadStatus.DOWNLOADING
        return False
