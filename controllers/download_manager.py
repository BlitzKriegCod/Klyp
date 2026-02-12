"""
Download Manager for Klyp Video Downloader.
Manages download queue processing with multi-threaded and sequential modes.
"""

import threading
from typing import Optional, Callable
from datetime import datetime
from pathlib import Path
from models import DownloadTask, DownloadStatus
from .queue_manager import QueueManager
from .history_manager import HistoryManager
from utils.video_downloader import VideoDownloader
from utils.notification_manager import NotificationManager
from utils.logger import get_logger


class DownloadManager:
    """Manages download queue processing and status updates."""
    
    def __init__(self, queue_manager: QueueManager, history_manager: Optional[HistoryManager] = None, max_concurrent_downloads: int = 3):
        """
        Initialize DownloadManager.
        
        Args:
            queue_manager: QueueManager instance to manage the queue.
            history_manager: HistoryManager instance to track completed downloads.
            max_concurrent_downloads: Maximum number of concurrent downloads in multi-threaded mode.
        """
        self.logger = get_logger()
        self.logger.info("Initializing DownloadManager")
        
        self.queue_manager = queue_manager
        self.history_manager = history_manager or HistoryManager()
        self.max_concurrent_downloads = max_concurrent_downloads
        self.video_downloader = VideoDownloader()
        self.notification_manager = NotificationManager()
        self.is_running = False
        self.download_mode = "sequential"  # "sequential" or "multi-threaded"
        self.active_downloads = {}  # task_id -> thread
        self.stop_flags = {}  # task_id -> stop_flag
        self.lock = threading.Lock()
        self.status_callback: Optional[Callable[[str, DownloadStatus, float], None]] = None
        self.completed_count = 0
        self.failed_count = 0
        self.total_count = 0
        self.pending_downloads_file: Optional[str] = None
    
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
    
    def set_status_callback(self, callback: Callable[[str, DownloadStatus, float], None]) -> None:
        """
        Set callback for status updates.
        
        Args:
            callback: Function to call with (task_id, status, progress) on updates.
        """
        self.status_callback = callback
    
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
        
        if self.status_callback:
            self.status_callback(task_id, status, progress or 0.0)
    
    def _download_task(self, task: DownloadTask) -> None:
        """
        Download a single task.
        
        Args:
            task: DownloadTask to download.
        """
        task_id = task.id
        self.logger.info(f"Downloading task {task_id}: {task.video_info.url}")
        
        try:
            # Status is already set to DOWNLOADING by the caller to prevent race conditions
            
            # Progress callback
            def progress_hook(d):
                if task_id in self.stop_flags and self.stop_flags[task_id]:
                    self.logger.warning(f"Download stopped by user for task {task_id}")
                    raise Exception("Download stopped by user")
                
                if d['status'] == 'downloading':
                    total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                    downloaded = d.get('downloaded_bytes', 0)
                    
                    if total > 0:
                        progress = (downloaded / total) * 100
                        self._update_task_status(task_id, DownloadStatus.DOWNLOADING, progress)
                        # Debug: print progress occasionally
                        if int(progress) % 10 == 0:  # Print every 10%
                            print(f"Progress: {progress:.1f}%")
                elif d['status'] == 'finished':
                    self._update_task_status(task_id, DownloadStatus.DOWNLOADING, 100.0)
                    self.logger.debug(f"Task {task_id} download finished")
            
            # Download the video with or without subtitles
            if task.video_info.download_subtitles:
                self.logger.info(f"Downloading video with subtitles for task {task_id}")
                downloaded_file = self.video_downloader.download_with_subtitles(
                    video_info=task.video_info,
                    download_path=task.download_path,
                    progress_callback=progress_hook
                )
            else:
                self.logger.info(f"Downloading video for task {task_id}")
                downloaded_file = self.video_downloader.download(
                    video_info=task.video_info,
                    download_path=task.download_path,
                    progress_callback=progress_hook
                )
            
            # Update status to completed
            task.completed_at = datetime.now()
            self._update_task_status(task_id, DownloadStatus.COMPLETED, 100.0)
            self.logger.info(f"Task {task_id} completed successfully: {downloaded_file}")
            
            # Print success message to console
            print(f"\n✅ DOWNLOAD COMPLETE: {task.video_info.title}")
            print(f"   Saved to: {downloaded_file}\n")
            
            # Add to history
            try:
                file_path = Path(downloaded_file)
                file_size = file_path.stat().st_size if file_path.exists() else 0
                
                self.history_manager.add_download(
                    title=task.video_info.title,
                    url=task.video_info.url,
                    file_path=str(downloaded_file),
                    file_size=file_size,
                    platform=self._extract_platform(task.video_info.url),
                    quality=task.video_info.selected_quality or "best",
                    duration=task.video_info.duration
                )
                self.logger.info(f"Added to history: {task.video_info.title}")
            except Exception as e:
                self.logger.error(f"Failed to add to history: {e}")
            
            # Send notification for completed download
            self.notification_manager.notify_download_complete(
                video_title=task.video_info.title,
                filename=task.video_info.filename or "video"
            )
            
            with self.lock:
                self.completed_count += 1
            
        except Exception as e:
            error_msg = str(e)
            if "stopped by user" in error_msg.lower():
                self.logger.warning(f"Task {task_id} stopped by user")
                self._update_task_status(task_id, DownloadStatus.STOPPED, error_message="Stopped by user")
            else:
                self.logger.error(f"Task {task_id} failed: {error_msg}", exc_info=True)
                self._update_task_status(task_id, DownloadStatus.FAILED, error_message=error_msg)
                
                # Send notification for failed download
                self.notification_manager.notify_download_failed(
                    video_title=task.video_info.title,
                    error_message=error_msg[:100]  # Limit error message length
                )
                
                with self.lock:
                    self.failed_count += 1
        finally:
            with self.lock:
                if task_id in self.active_downloads:
                    del self.active_downloads[task_id]
                if task_id in self.stop_flags:
                    del self.stop_flags[task_id]
                    
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
                
                # Notify UI via callback (using a special status or just trigger refresh)
                # We can reuse the status callback to trigger a refresh without changing status
                if self.status_callback:
                    self.status_callback(task_id, task.status, task.progress)
                    
            except Exception as e:
                self.logger.error(f"Failed to fetch metadata for task {task_id}: {str(e)}")
        
        threading.Thread(target=_fetch_worker, daemon=True).start()
    
    def start_downloads(self) -> None:
        """Start processing the download queue based on the current mode."""
        if self.is_running:
            self.logger.warning("Downloads already running")
            return
        
        self.is_running = True
        self.logger.info("Starting download processing")
        
        # Reset counters
        with self.lock:
            self.completed_count = 0
            self.failed_count = 0
            self.total_count = len(self.queue_manager.get_tasks_by_status(DownloadStatus.QUEUED))
        
        self.logger.info(f"Total queued tasks: {self.total_count}")
        
        if self.download_mode == "sequential":
            self.logger.info("Using sequential download mode")
            self._start_sequential_downloads()
        else:
            self.logger.info(f"Using multi-threaded download mode (max {self.max_concurrent_downloads} concurrent)")
            self._start_multithreaded_downloads()
    
    def _start_sequential_downloads(self) -> None:
        """Start sequential download processing."""
        def process_queue():
            while self.is_running:
                # Use lock to safely get next task
                with self.lock:
                    queued_tasks = self.queue_manager.get_tasks_by_status(DownloadStatus.QUEUED)
                    
                    if not queued_tasks:
                        self.is_running = False
                        self._send_summary_notification()
                        break
                    
                    task = queued_tasks[0]
                    self.stop_flags[task.id] = False
                    # Mark as DOWNLOADING immediately to prevent re-selection
                    self._update_task_status(task.id, DownloadStatus.DOWNLOADING, 0.0)
                
                # Download task outside of lock
                self.logger.info(f"Processing sequential task {task.id}: {task.video_info.url}")
                self._download_task(task)
        
        thread = threading.Thread(target=process_queue, daemon=True)
        thread.start()

    def _start_multithreaded_downloads(self) -> None:
        """Start multi-threaded download processing."""
        def process_queue():
            while self.is_running:
                task_to_start = None
                
                with self.lock:
                    active_count = len(self.active_downloads)
                
                    if active_count < self.max_concurrent_downloads:
                        # Get all queued tasks
                        queued_tasks = self.queue_manager.get_tasks_by_status(DownloadStatus.QUEUED)
                        
                        if not queued_tasks:
                            # Check if any downloads are still active
                            if active_count == 0:
                                self.is_running = False
                                self._send_summary_notification()
                                break
                        else:
                            # Pick the first task that isn't already active
                            for task in queued_tasks:
                                if task.id not in self.active_downloads:
                                    task_to_start = task
                                    break
                            
                            if task_to_start:
                                self.stop_flags[task_to_start.id] = False
                                # Mark as DOWNLOADING immediately to prevent re-selection in next loop iteration
                                self._update_task_status(task_to_start.id, DownloadStatus.DOWNLOADING, 0.0)
                                
                                # Start download in a new thread
                                download_thread = threading.Thread(
                                    target=self._download_task,
                                    args=(task_to_start,),
                                    daemon=True
                                )
                                self.active_downloads[task_to_start.id] = download_thread
                                download_thread.start()
                                self.logger.info(f"Started thread for task {task_to_start.id}")
                
                # Small delay to prevent busy waiting and allow threads to update
                threading.Event().wait(0.5)
        
        thread = threading.Thread(target=process_queue, daemon=True)
        thread.start()
    
    def _send_summary_notification(self) -> None:
        """Send summary notification when all downloads complete."""
        with self.lock:
            total = self.total_count
            completed = self.completed_count
            failed = self.failed_count
        
        if total > 0:
            self.notification_manager.notify_all_downloads_complete(
                total_count=total,
                successful_count=completed,
                failed_count=failed
            )
        
        # Save pending downloads after all complete
        self.save_pending_downloads()
    
    def stop_download(self, task_id: str) -> bool:
        """
        Stop a specific download.
        
        Args:
            task_id: ID of the task to stop.
        
        Returns:
            True if stop signal was sent, False if task not found.
        """
        with self.lock:
            if task_id in self.stop_flags:
                self.stop_flags[task_id] = True
                return True
        return False
    
    def stop_all_downloads(self) -> None:
        """Stop all active downloads."""
        self.is_running = False
        self.logger.info("Stopping all downloads")
        
        with self.lock:
            for task_id in list(self.active_downloads.keys()):
                self.stop_flags[task_id] = True
        
        self.logger.info("All downloads stopped")
            
    def stop_task(self, task_id: str) -> bool:
        """
        Stop a specific download task.
        
        Args:
            task_id: ID of the task to stop.
            
        Returns:
            True if task was stopped or already stopped, False if not found.
        """
        task = self.queue_manager.get_task(task_id)
        if not task:
            return False
            
        if task.status == DownloadStatus.DOWNLOADING:
            self.logger.info(f"Stopping task {task_id}")
            self.stop_flags[task_id] = True
            return True
        elif task.status == DownloadStatus.QUEUED:
            # If it hasn't started yet, just mark as stopped/paused
            self._update_task_status(task_id, DownloadStatus.STOPPED, error_message="Paused by user")
            return True
            
        return False
        
    def start_task(self, task_id: str) -> bool:
        """
        Start a specific download task.
        
        Args:
            task_id: ID of the task to start.
            
        Returns:
            True if task was started or queued, False if not found.
        """
        task = self.queue_manager.get_task(task_id)
        if not task:
            return False
            
        if task.status == DownloadStatus.DOWNLOADING:
            # Already downloading
            return True
            
        # Reset task to queued
        self.logger.info(f"Restarting/Queuing task {task_id}")
        self._update_task_status(task_id, DownloadStatus.QUEUED, 0.0)
        
        # If downloads are not running, start them
        if not self.is_running:
            self.start_downloads()
        else:
            # If downloads are running, the task will be picked up automatically
            # For multi-threaded mode, we might need to trigger a new worker
            if self.download_mode == "multi-threaded":
                # Check if we can start a new worker
                with self.lock:
                    if len(self.active_downloads) < self.max_concurrent_downloads:
                        # Start a worker for this task
                        threading.Thread(target=self._download_worker, daemon=True).start()
            
        return True
    
    def get_active_download_count(self) -> int:
        """
        Get the number of currently active downloads.
        
        Returns:
            Number of active downloads.
        """
        with self.lock:
            return len(self.active_downloads)
    
    def is_task_downloading(self, task_id: str) -> bool:
        """
        Check if a task is currently downloading.
        
        Args:
            task_id: Task ID to check.
        
        Returns:
            True if task is downloading, False otherwise.
        """
        with self.lock:
            return task_id in self.active_downloads

    def _extract_platform(self, url: str) -> str:
        """
        Extract platform name from URL.
        
        Args:
            url: Video URL
            
        Returns:
            Platform name
        """
        url_lower = url.lower()
        
        if 'youtube.com' in url_lower or 'youtu.be' in url_lower:
            return "YouTube"
        elif 'vimeo.com' in url_lower:
            return "Vimeo"
        elif 'dailymotion.com' in url_lower:
            return "Dailymotion"
        elif 'ok.ru' in url_lower:
            return "OK.ru"
        elif 'soundcloud.com' in url_lower:
            return "SoundCloud"
        elif 'twitch.tv' in url_lower:
            return "Twitch"
        else:
            return "Other"
