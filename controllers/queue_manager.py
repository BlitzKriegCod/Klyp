"""
Queue Manager for Klyp Video Downloader.
Handles download queue operations.
"""

import json
import uuid
from pathlib import Path
from typing import List, Optional
from models import DownloadTask, VideoInfo, DownloadStatus


class QueueManager:
    """Manages the download queue operations."""
    
    def __init__(self):
        """Initialize QueueManager."""
        self.queue: List[DownloadTask] = []
    
    def add_task(self, video_info: VideoInfo, download_path: str = "") -> DownloadTask:
        """
        Add a new download task to the queue.
        
        Args:
            video_info: VideoInfo object containing video metadata.
            download_path: Path where the video will be downloaded.
        
        Returns:
            The created DownloadTask.
        
        Raises:
            ValueError: If the video URL is already in the queue.
        """
        # Check if URL already exists in queue
        if self.is_url_in_queue(video_info.url):
            raise ValueError(f"URL already in queue: {video_info.url}")
        
        task = DownloadTask(
            id=str(uuid.uuid4()),
            video_info=video_info,
            download_path=download_path
        )
        self.queue.append(task)
        return task
    
    def remove_task(self, task_id: str) -> bool:
        """
        Remove a task from the queue.
        
        Args:
            task_id: ID of the task to remove.
        
        Returns:
            True if task was removed, False if not found.
        """
        for i, task in enumerate(self.queue):
            if task.id == task_id:
                self.queue.pop(i)
                return True
        return False
    
    def get_task(self, task_id: str) -> Optional[DownloadTask]:
        """
        Get a task by ID.
        
        Args:
            task_id: ID of the task to retrieve.
        
        Returns:
            DownloadTask if found, None otherwise.
        """
        for task in self.queue:
            if task.id == task_id:
                return task
        return None
    
    def clear_queue(self) -> None:
        """Clear all tasks from the queue."""
        self.queue.clear()
    
    def get_all_tasks(self) -> List[DownloadTask]:
        """
        Get all tasks in the queue.
        
        Returns:
            List of all DownloadTask objects.
        """
        return self.queue.copy()
    
    def get_tasks_by_status(self, status: DownloadStatus) -> List[DownloadTask]:
        """
        Get all tasks with a specific status.
        
        Args:
            status: DownloadStatus to filter by.
        
        Returns:
            List of DownloadTask objects with the specified status.
        """
        return [task for task in self.queue if task.status == status]
    
    def is_url_in_queue(self, url: str) -> bool:
        """
        Check if a URL is already in the queue.
        
        Args:
            url: URL to check.
        
        Returns:
            True if URL exists in queue, False otherwise.
        """
        return any(task.video_info.url == url for task in self.queue)
    
    def update_task_info(self, task_id: str, video_info: VideoInfo) -> bool:
        """
        Update video info for a specific task.
        
        Args:
            task_id: ID of the task to update.
            video_info: New VideoInfo object.
            
        Returns:
            True if task was updated, False if not found.
        """
        task = self.get_task(task_id)
        if task:
            task.video_info = video_info
            return True
        return False

    def update_task_status(self, task_id: str, status: DownloadStatus, 
                          progress: float = None, error_message: str = "") -> bool:
        """
        Update a task's status and progress.
        
        Args:
            task_id: ID of the task to update.
            status: New status.
            progress: New progress value (0-100).
            error_message: Error message if status is FAILED.
        
        Returns:
            True if task was updated, False if not found.
        """
        task = self.get_task(task_id)
        if task:
            task.status = status
            if progress is not None:
                task.progress = progress
            if error_message:
                task.error_message = error_message
            return True
        return False
    
    def export_queue(self, file_path: str) -> bool:
        """
        Export the current queue to a JSON file.
        
        Args:
            file_path: Path to save the queue file.
        
        Returns:
            True if successful, False otherwise.
        """
        try:
            queue_data = []
            for task in self.queue:
                task_dict = {
                    "url": task.video_info.url,
                    "title": task.video_info.title,
                    "selected_quality": task.video_info.selected_quality,
                    "filename": task.video_info.filename,
                    "download_path": task.download_path,
                }
                queue_data.append(task_dict)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(queue_data, f, indent=2)
            return True
        except IOError as e:
            print(f"Error exporting queue: {e}")
            return False
    
    def import_queue(self, file_path: str) -> int:
        """
        Import a queue from a JSON file.
        
        Args:
            file_path: Path to the queue file.
        
        Returns:
            Number of tasks successfully imported.
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                queue_data = json.load(f)
            
            imported_count = 0
            for task_dict in queue_data:
                try:
                    video_info = VideoInfo(
                        url=task_dict.get("url", ""),
                        title=task_dict.get("title", ""),
                        selected_quality=task_dict.get("selected_quality", "best"),
                        filename=task_dict.get("filename", "")
                    )
                    
                    if not self.is_url_in_queue(video_info.url):
                        self.add_task(
                            video_info=video_info,
                            download_path=task_dict.get("download_path", "")
                        )
                        imported_count += 1
                except (ValueError, TypeError) as e:
                    print(f"Error importing task: {e}")
                    continue
            
            return imported_count
        except (IOError, json.JSONDecodeError) as e:
            print(f"Error importing queue: {e}")
            return 0
    
    def load_urls_from_file(self, file_path: str) -> int:
        """
        Load URLs from a text file and add them to the queue.
        
        Args:
            file_path: Path to the text file containing URLs (one per line).
        
        Returns:
            Number of URLs successfully added to the queue.
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            added_count = 0
            for line in lines:
                url = line.strip()
                if url and url.startswith(("http://", "https://")):
                    try:
                        video_info = VideoInfo(url=url)
                        if not self.is_url_in_queue(url):
                            self.add_task(video_info=video_info)
                            added_count += 1
                    except ValueError:
                        continue
            
            return added_count
        except IOError as e:
            print(f"Error loading URLs from file: {e}")
            return 0
    
    def save_pending_downloads(self, file_path: str) -> bool:
        """
        Save pending and downloading tasks to a file for auto-resume.
        
        Args:
            file_path: Path to save the pending downloads file.
        
        Returns:
            True if successful, False otherwise.
        """
        try:
            pending_tasks = []
            for task in self.queue:
                # Only save queued, downloading, or stopped tasks
                if task.status in [DownloadStatus.QUEUED, DownloadStatus.DOWNLOADING, DownloadStatus.STOPPED]:
                    task_dict = {
                        "id": task.id,
                        "url": task.video_info.url,
                        "title": task.video_info.title,
                        "thumbnail": task.video_info.thumbnail,
                        "duration": task.video_info.duration,
                        "author": task.video_info.author,
                        "selected_quality": task.video_info.selected_quality,
                        "filename": task.video_info.filename,
                        "download_subtitles": task.video_info.download_subtitles,
                        "download_path": task.download_path,
                        "status": task.status.value,
                        "progress": task.progress,
                        "created_at": task.created_at.isoformat(),
                    }
                    pending_tasks.append(task_dict)
            
            # Only save if there are pending tasks
            if pending_tasks:
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(pending_tasks, f, indent=2)
            else:
                # Remove the file if no pending tasks
                if Path(file_path).exists():
                    Path(file_path).unlink()
            
            return True
        except IOError as e:
            print(f"Error saving pending downloads: {e}")
            return False
    
    def load_pending_downloads(self, file_path: str) -> List[DownloadTask]:
        """
        Load pending downloads from a file.
        
        Args:
            file_path: Path to the pending downloads file.
        
        Returns:
            List of DownloadTask objects loaded from the file.
        """
        try:
            if not Path(file_path).exists():
                return []
            
            with open(file_path, 'r', encoding='utf-8') as f:
                pending_data = json.load(f)
            
            loaded_tasks = []
            for task_dict in pending_data:
                try:
                    from datetime import datetime
                    
                    video_info = VideoInfo(
                        url=task_dict.get("url", ""),
                        title=task_dict.get("title", ""),
                        thumbnail=task_dict.get("thumbnail", ""),
                        duration=task_dict.get("duration", 0),
                        author=task_dict.get("author", ""),
                        selected_quality=task_dict.get("selected_quality", "best"),
                        filename=task_dict.get("filename", ""),
                        download_subtitles=task_dict.get("download_subtitles", False)
                    )
                    
                    task = DownloadTask(
                        id=task_dict.get("id", str(uuid.uuid4())),
                        video_info=video_info,
                        status=DownloadStatus(task_dict.get("status", "queued")),
                        progress=task_dict.get("progress", 0.0),
                        download_path=task_dict.get("download_path", ""),
                        created_at=datetime.fromisoformat(task_dict.get("created_at", datetime.now().isoformat()))
                    )
                    
                    # Reset downloading status to queued for resume
                    if task.status == DownloadStatus.DOWNLOADING:
                        task.status = DownloadStatus.QUEUED
                        task.progress = 0.0
                    
                    loaded_tasks.append(task)
                except (ValueError, TypeError, KeyError) as e:
                    print(f"Error loading pending task: {e}")
                    continue
            
            return loaded_tasks
        except (IOError, json.JSONDecodeError) as e:
            print(f"Error loading pending downloads: {e}")
            return []
    
    def restore_pending_downloads(self, tasks: List[DownloadTask]) -> int:
        """
        Restore pending downloads to the queue.
        
        Args:
            tasks: List of DownloadTask objects to restore.
        
        Returns:
            Number of tasks successfully restored.
        """
        restored_count = 0
        for task in tasks:
            if not self.is_url_in_queue(task.video_info.url):
                self.queue.append(task)
                restored_count += 1
        return restored_count
