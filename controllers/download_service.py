"""
DownloadService for Klyp Video Downloader.
Service layer for download operations with thread-safe singleton pattern.
"""

import threading
from concurrent.futures import Future
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

from controllers.queue_manager import QueueManager
from controllers.history_manager import HistoryManager
from controllers.settings_manager import SettingsManager
from models import DownloadTask, DownloadStatus
from utils.event_bus import EventBus, Event, EventType
from utils.thread_pool_manager import ThreadPoolManager
from utils.video_downloader import VideoDownloader
from utils.logger import get_logger
from utils.exceptions import (
    DownloadException,
    NetworkException,
    AuthenticationException,
    FormatException,
    ExtractionException,
    classify_yt_dlp_error
)


class DownloadService:
    """
    Service layer for download operations. Singleton, thread-safe.
    
    This service manages all download operations, coordinating between
    the queue manager, history manager, and video downloader. It uses
    the EventBus for thread-safe communication with the UI layer.
    
    Usage:
        # Get singleton instance
        service = DownloadService()
        
        # Start a download
        service.start_download(task_id)
        
        # Stop a download
        service.stop_download(task_id)
        
        # Stop all downloads
        service.stop_all_downloads()
    """
    
    _instance: Optional['DownloadService'] = None
    _lock = threading.Lock()
    
    def __new__(cls):
        """
        Implement singleton pattern with thread-safe initialization.
        
        Uses double-checked locking to ensure only one instance is created
        even in multi-threaded environments.
        """
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize the DownloadService."""
        # Prevent re-initialization
        if hasattr(self, '_initialized'):
            return
        
        self._initialized = True
        
        # Initialize dependencies
        self._queue_manager = QueueManager()
        self._history_manager = HistoryManager()
        self._settings_manager = SettingsManager()
        self._thread_pool = ThreadPoolManager()
        self._event_bus = EventBus()
        self._logger = get_logger()
        
        # Track active downloads
        self._active_futures: Dict[str, Future] = {}
        self._stop_flags: Dict[str, threading.Event] = {}
        self._state_lock = threading.Lock()
        
        self._logger.info("DownloadService initialized")

    def start_download(self, task_id: str) -> bool:
        """
        Start a specific download task.
        
        This method validates the task exists, checks it's not already downloading,
        creates a stop flag, and submits the download worker to the thread pool.
        
        Args:
            task_id: ID of the task to start
        
        Returns:
            True if download was started successfully, False otherwise
        """
        # Validate task exists
        task = self._queue_manager.get_task(task_id)
        if not task:
            self._logger.warning(f"Task {task_id} not found")
            return False
        
        # THREAD-SAFE: Lock protects _active_futures and _stop_flags dicts
        # This ensures atomic check-and-add operation to prevent duplicate downloads
        with self._state_lock:
            # Check if already downloading
            if task_id in self._active_futures:
                self._logger.warning(f"Task {task_id} is already downloading")
                return False
            
            # Create stop flag for graceful cancellation
            # threading.Event is thread-safe and allows worker to check for stop signal
            stop_event = threading.Event()
            self._stop_flags[task_id] = stop_event
            
            # Submit download worker to thread pool
            # The worker runs in a background thread from the pool
            future = self._thread_pool.download_pool.submit(
                self._download_worker,
                task,
                stop_event
            )
            self._active_futures[task_id] = future
            
            # Add done callback for cleanup
            # Callback is invoked by thread pool when future completes
            future.add_done_callback(
                lambda f: self._on_download_complete(task_id, f)
            )
            
            self._logger.info(f"Started download for task {task_id}: {task.video_info.url}")
        
        return True

    def _download_worker(self, task: DownloadTask, stop_event: threading.Event) -> str:
        """
        Worker function that runs in thread pool to perform the download.
        
        This method handles the entire download lifecycle including status updates,
        progress reporting, error handling, and history tracking.
        
        Args:
            task: DownloadTask to process
            stop_event: Threading event to signal stop request
        
        Returns:
            Path to the downloaded file
        
        Raises:
            Exception: If download fails
        """
        task_id = task.id
        
        try:
            # Update status to DOWNLOADING
            self._queue_manager.update_task_status(
                task_id, DownloadStatus.DOWNLOADING, 0.0
            )
            
            # Publish initial progress event
            self._event_bus.publish(Event(
                type=EventType.DOWNLOAD_PROGRESS,
                data={
                    "task_id": task_id,
                    "progress": 0.0,
                    "status": "downloading"
                }
            ))
            
            self._logger.info(f"Starting download worker for task {task_id}")
            
            # Track last progress percentage for throttling
            last_progress_reported = -1
            
            # Create progress callback with throttling (every 5%)
            def progress_callback(d):
                nonlocal last_progress_reported
                
                # CRITICAL: Check stop flag to allow graceful cancellation
                # This is called frequently during download, so we check the stop event
                if stop_event.is_set():
                    self._logger.info(f"Stop requested for task {task_id}")
                    raise Exception("Download stopped by user")
                
                if d['status'] == 'downloading':
                    total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                    downloaded = d.get('downloaded_bytes', 0)
                    
                    if total > 0:
                        progress = (downloaded / total) * 100
                        
                        # Update task status (QueueManager is thread-safe)
                        self._queue_manager.update_task_status(
                            task_id, DownloadStatus.DOWNLOADING, progress
                        )
                        
                        # PERFORMANCE: Throttle progress events to every 5%
                        # Without throttling, we'd publish hundreds of events per download
                        # This reduces UI update overhead and prevents event queue overflow
                        current_progress_bucket = int(progress / 5)
                        if current_progress_bucket > last_progress_reported:
                            last_progress_reported = current_progress_bucket
                            # THREAD-SAFE: EventBus.publish() is thread-safe
                            # This allows worker thread to safely notify UI thread
                            self._event_bus.publish(Event(
                                type=EventType.DOWNLOAD_PROGRESS,
                                data={
                                    "task_id": task_id,
                                    "progress": progress,
                                    "downloaded_bytes": downloaded,
                                    "total_bytes": total
                                }
                            ))
                            self._logger.debug(f"Task {task_id} progress: {progress:.1f}%")
                
                elif d['status'] == 'finished':
                    self._logger.debug(f"Task {task_id} download phase finished")
            
            # Execute download with VideoDownloader
            # Get settings once and pass to VideoDownloader to avoid repeated instantiation
            settings_dict = {
                'extract_audio': self._settings_manager.get("extract_audio", False),
                'audio_format': self._settings_manager.get("audio_format", "mp3"),
                'embed_thumbnail': self._settings_manager.get("embed_thumbnail", False),
                'embed_metadata': self._settings_manager.get("embed_metadata", False),
                'sponsorblock_enabled': self._settings_manager.get("sponsorblock_enabled", False),
                'cookies_path': self._settings_manager.get("cookies_path", "")
            }
            
            # Set cookies if configured
            cookies_path = self._settings_manager.get("cookies_path", "")
            cookies_file = cookies_path if cookies_path and Path(cookies_path).exists() else None
            
            # Create downloader with cached settings
            downloader = VideoDownloader(cookies_file=cookies_file, settings=settings_dict)
            
            # Download with or without subtitles
            if task.video_info.download_subtitles:
                self._logger.info(f"Downloading with subtitles for task {task_id}")
                file_path = downloader.download_with_subtitles(
                    task.video_info,
                    task.download_path,
                    progress_callback
                )
            else:
                self._logger.info(f"Downloading video for task {task_id}")
                file_path = downloader.download(
                    task.video_info,
                    task.download_path,
                    progress_callback
                )
            
            # Update status to COMPLETED
            task.completed_at = datetime.now()
            self._queue_manager.update_task_status(
                task_id, DownloadStatus.COMPLETED, 100.0
            )
            
            self._logger.info(f"Task {task_id} completed successfully: {file_path}")
            
            # Add to history
            self._add_to_history(task, file_path)
            
            return file_path
            
        except Exception as e:
            error_msg = str(e)
            
            # Log with structured context
            self._logger.log_exception_structured(
                exception=e,
                context={
                    "task_id": task_id,
                    "url": task.video_info.url,
                    "title": task.video_info.title,
                    "operation": "download_worker"
                },
                message=f"Download failed for task {task_id}"
            )
            
            # Classify and handle exception
            if "stopped by user" in error_msg.lower():
                self._queue_manager.update_task_status(
                    task_id, DownloadStatus.STOPPED, error_message="Stopped by user"
                )
                self._logger.info(f"Task {task_id} stopped by user")
            else:
                # Classify the error type
                exception_class = classify_yt_dlp_error(error_msg)
                self._logger.error(
                    f"Task {task_id} failed with {exception_class.__name__}: {error_msg}"
                )
                
                self._queue_manager.update_task_status(
                    task_id, DownloadStatus.FAILED, error_message=error_msg
                )
            
            # Re-raise to be caught by future
            raise
    
    def _add_to_history(self, task: DownloadTask, file_path: str) -> None:
        """
        Add completed download to history.
        
        Args:
            task: Completed download task
            file_path: Path to downloaded file
        """
        try:
            file_path_obj = Path(file_path)
            file_size = file_path_obj.stat().st_size if file_path_obj.exists() else 0
            
            # Extract platform from URL
            platform = self._extract_platform(task.video_info.url)
            
            self._history_manager.add_download(
                title=task.video_info.title,
                url=task.video_info.url,
                file_path=str(file_path),
                file_size=file_size,
                platform=platform,
                quality=task.video_info.selected_quality or "best",
                duration=task.video_info.duration
            )
            
            self._logger.info(f"Added to history: {task.video_info.title}")
        except Exception as e:
            self._logger.log_exception_structured(
                exception=e,
                context={
                    "task_id": task.id,
                    "url": task.video_info.url,
                    "file_path": file_path,
                    "operation": "add_to_history"
                },
                message="Failed to add download to history"
            )
    
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

    def _on_download_complete(self, task_id: str, future: Future) -> None:
        """
        Callback when download completes (success or failure).
        
        This method is called by the thread pool when a download future completes.
        It handles cleanup of internal state and publishes appropriate events.
        
        Args:
            task_id: ID of the completed task
            future: Future object representing the completed download
        """
        # Cleanup active_futures and stop_flags (with lock)
        with self._state_lock:
            self._active_futures.pop(task_id, None)
            self._stop_flags.pop(task_id, None)
        
        self._logger.debug(f"Download complete callback for task {task_id}")
        
        try:
            # Get result from future (will raise exception if download failed)
            file_path = future.result()
            
            # Publish success event
            self._event_bus.publish(Event(
                type=EventType.DOWNLOAD_COMPLETE,
                data={
                    "task_id": task_id,
                    "file_path": file_path
                }
            ))
            
            self._logger.info(f"Published DOWNLOAD_COMPLETE event for task {task_id}")
            
        except Exception as e:
            error_msg = str(e)
            
            # Determine if it was stopped or failed
            if "stopped by user" in error_msg.lower():
                event_type = EventType.DOWNLOAD_STOPPED
                self._logger.info(f"Task {task_id} was stopped by user")
            else:
                event_type = EventType.DOWNLOAD_FAILED
                self._logger.error(f"Task {task_id} failed: {error_msg}")
            
            # Publish failure/stopped event
            self._event_bus.publish(Event(
                type=event_type,
                data={
                    "task_id": task_id,
                    "error": error_msg
                }
            ))
            
            self._logger.info(f"Published {event_type.value} event for task {task_id}")

    def stop_download(self, task_id: str) -> bool:
        """
        Stop a specific download.
        
        This method signals the download worker to stop by setting the stop event.
        The actual cleanup happens in the _on_download_complete callback.
        
        Args:
            task_id: ID of the task to stop
        
        Returns:
            True if stop signal was sent, False if task is not active
        """
        with self._state_lock:
            if task_id in self._stop_flags:
                self._stop_flags[task_id].set()
                self._logger.info(f"Stop signal sent for task {task_id}")
                return True
        
        self._logger.warning(f"Cannot stop task {task_id}: not active")
        return False

    def stop_all_downloads(self) -> None:
        """
        Stop all active downloads.
        
        This method signals all active download workers to stop by setting
        their stop events. The actual cleanup happens in the _on_download_complete
        callbacks.
        """
        with self._state_lock:
            active_count = len(self._stop_flags)
            
            if active_count == 0:
                self._logger.info("No active downloads to stop")
                return
            
            # Set all stop events
            for task_id, stop_event in self._stop_flags.items():
                stop_event.set()
                self._logger.debug(f"Stop signal sent for task {task_id}")
            
            self._logger.info(f"Stop signal sent for {active_count} active download(s)")

    def start_all_downloads(self) -> int:
        """
        Start all queued downloads.
        
        This method starts all tasks with QUEUED status. It handles errors
        for individual tasks without affecting others.
        
        Returns:
            Number of downloads successfully started
        """
        # Get all tasks to debug
        all_tasks = self._queue_manager.get_all_tasks()
        self._logger.info(f"Total tasks in queue: {len(all_tasks)}")
        
        # Log status of each task for debugging
        for task in all_tasks:
            self._logger.debug(f"Task {task.id[:8]}... status: {task.status.value}")
        
        # Get all queued tasks
        queued_tasks = self._queue_manager.get_tasks_by_status(DownloadStatus.QUEUED)
        
        if not queued_tasks:
            self._logger.info("No queued tasks to start")
            return 0
        
        started_count = 0
        
        # Start each task
        for task in queued_tasks:
            try:
                if self.start_download(task.id):
                    started_count += 1
            except Exception as e:
                self._logger.log_exception_structured(
                    exception=e,
                    context={
                        "task_id": task.id,
                        "url": task.video_info.url,
                        "operation": "start_all_downloads"
                    },
                    message=f"Failed to start task {task.id}"
                )
                # Continue with other tasks
                continue
        
        self._logger.info(f"Started {started_count} of {len(queued_tasks)} queued download(s)")
        return started_count

    def get_active_count(self) -> int:
        """
        Get the number of currently active downloads.
        
        This method is thread-safe and returns the count of downloads
        currently in progress.
        
        Returns:
            Number of active downloads
        """
        with self._state_lock:
            return len(self._active_futures)
