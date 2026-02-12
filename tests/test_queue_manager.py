"""
Unit tests for QueueManager.
Tests queue operations including add, remove, import, and export.
"""

import unittest
import tempfile
import json
from pathlib import Path
from models import VideoInfo, DownloadStatus
from controllers import QueueManager


class TestQueueManager(unittest.TestCase):
    """Test cases for QueueManager."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.queue_manager = QueueManager()
        self.video_info = VideoInfo(
            url="https://ok.ru/video/123456",
            title="Test Video"
        )
    
    def test_add_task(self):
        """Test adding a task to the queue."""
        task = self.queue_manager.add_task(self.video_info)
        self.assertIsNotNone(task.id)
        self.assertEqual(len(self.queue_manager.get_all_tasks()), 1)
    
    def test_add_duplicate_url_raises_error(self):
        """Test that adding duplicate URL raises ValueError."""
        self.queue_manager.add_task(self.video_info)
        with self.assertRaises(ValueError):
            self.queue_manager.add_task(self.video_info)
    
    def test_remove_task(self):
        """Test removing a task from the queue."""
        task = self.queue_manager.add_task(self.video_info)
        result = self.queue_manager.remove_task(task.id)
        self.assertTrue(result)
        self.assertEqual(len(self.queue_manager.get_all_tasks()), 0)
    
    def test_remove_nonexistent_task(self):
        """Test removing a task that doesn't exist."""
        result = self.queue_manager.remove_task("nonexistent-id")
        self.assertFalse(result)
    
    def test_clear_queue(self):
        """Test clearing all tasks from the queue."""
        self.queue_manager.add_task(self.video_info)
        video_info2 = VideoInfo(url="https://ok.ru/video/789012")
        self.queue_manager.add_task(video_info2)
        
        self.queue_manager.clear_queue()
        self.assertEqual(len(self.queue_manager.get_all_tasks()), 0)
    
    def test_get_tasks_by_status(self):
        """Test filtering tasks by status."""
        task = self.queue_manager.add_task(self.video_info)
        self.queue_manager.update_task_status(task.id, DownloadStatus.DOWNLOADING)
        
        downloading_tasks = self.queue_manager.get_tasks_by_status(DownloadStatus.DOWNLOADING)
        self.assertEqual(len(downloading_tasks), 1)
        self.assertEqual(downloading_tasks[0].id, task.id)
    
    def test_export_and_import_queue(self):
        """Test exporting and importing queue."""
        self.queue_manager.add_task(self.video_info)
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
            temp_file = f.name
        
        try:
            # Export
            result = self.queue_manager.export_queue(temp_file)
            self.assertTrue(result)
            
            # Clear and import
            self.queue_manager.clear_queue()
            imported_count = self.queue_manager.import_queue(temp_file)
            self.assertEqual(imported_count, 1)
            self.assertEqual(len(self.queue_manager.get_all_tasks()), 1)
        finally:
            Path(temp_file).unlink(missing_ok=True)
    
    def test_load_urls_from_file(self):
        """Test loading URLs from a text file."""
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            f.write("https://ok.ru/video/111111\n")
            f.write("https://ok.ru/video/222222\n")
            f.write("invalid-url\n")
            temp_file = f.name
        
        try:
            added_count = self.queue_manager.load_urls_from_file(temp_file)
            self.assertEqual(added_count, 2)
            self.assertEqual(len(self.queue_manager.get_all_tasks()), 2)
        finally:
            Path(temp_file).unlink(missing_ok=True)
    
    def test_save_pending_downloads(self):
        """Test saving pending downloads to file."""
        # Add tasks with different statuses
        task1 = self.queue_manager.add_task(self.video_info)
        
        video_info2 = VideoInfo(url="https://ok.ru/video/789012", title="Test Video 2")
        task2 = self.queue_manager.add_task(video_info2)
        self.queue_manager.update_task_status(task2.id, DownloadStatus.DOWNLOADING, 50.0)
        
        video_info3 = VideoInfo(url="https://ok.ru/video/345678", title="Test Video 3")
        task3 = self.queue_manager.add_task(video_info3)
        self.queue_manager.update_task_status(task3.id, DownloadStatus.COMPLETED)
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
            temp_file = f.name
        
        try:
            # Save pending downloads
            result = self.queue_manager.save_pending_downloads(temp_file)
            self.assertTrue(result)
            
            # Verify file exists and contains correct data
            self.assertTrue(Path(temp_file).exists())
            
            with open(temp_file, 'r') as f:
                data = json.load(f)
            
            # Should only save queued and downloading tasks (not completed)
            self.assertEqual(len(data), 2)
            
            # Verify task data
            urls = [task['url'] for task in data]
            self.assertIn(self.video_info.url, urls)
            self.assertIn(video_info2.url, urls)
            self.assertNotIn(video_info3.url, urls)
        finally:
            Path(temp_file).unlink(missing_ok=True)
    
    def test_save_pending_downloads_removes_file_when_empty(self):
        """Test that save_pending_downloads removes file when no pending tasks."""
        # Add a completed task
        video_info = VideoInfo(url="https://ok.ru/video/111111", title="Completed Video")
        task = self.queue_manager.add_task(video_info)
        self.queue_manager.update_task_status(task.id, DownloadStatus.COMPLETED)
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
            temp_file = f.name
        
        try:
            # Save pending downloads (should remove file since no pending tasks)
            result = self.queue_manager.save_pending_downloads(temp_file)
            self.assertTrue(result)
            
            # File should not exist
            self.assertFalse(Path(temp_file).exists())
        finally:
            Path(temp_file).unlink(missing_ok=True)
    
    def test_load_pending_downloads(self):
        """Test loading pending downloads from file."""
        # Create test data
        pending_data = [
            {
                "id": "test-id-1",
                "url": "https://ok.ru/video/111111",
                "title": "Test Video 1",
                "thumbnail": "",
                "duration": 120,
                "author": "Test Author",
                "selected_quality": "best",
                "filename": "test1.mp4",
                "download_subtitles": False,
                "download_path": "/tmp/downloads",
                "status": "queued",
                "progress": 0.0,
                "created_at": "2024-01-01T12:00:00"
            },
            {
                "id": "test-id-2",
                "url": "https://ok.ru/video/222222",
                "title": "Test Video 2",
                "thumbnail": "",
                "duration": 180,
                "author": "Test Author 2",
                "selected_quality": "720p",
                "filename": "test2.mp4",
                "download_subtitles": True,
                "download_path": "/tmp/downloads",
                "status": "downloading",
                "progress": 45.5,
                "created_at": "2024-01-01T12:05:00"
            }
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
            json.dump(pending_data, f)
            temp_file = f.name
        
        try:
            # Load pending downloads
            loaded_tasks = self.queue_manager.load_pending_downloads(temp_file)
            
            self.assertEqual(len(loaded_tasks), 2)
            
            # Verify first task
            task1 = loaded_tasks[0]
            self.assertEqual(task1.id, "test-id-1")
            self.assertEqual(task1.video_info.url, "https://ok.ru/video/111111")
            self.assertEqual(task1.video_info.title, "Test Video 1")
            self.assertEqual(task1.status, DownloadStatus.QUEUED)
            self.assertEqual(task1.progress, 0.0)
            
            # Verify second task (downloading should be reset to queued)
            task2 = loaded_tasks[1]
            self.assertEqual(task2.id, "test-id-2")
            self.assertEqual(task2.video_info.url, "https://ok.ru/video/222222")
            self.assertEqual(task2.status, DownloadStatus.QUEUED)  # Reset from downloading
            self.assertEqual(task2.progress, 0.0)  # Reset progress
            self.assertTrue(task2.video_info.download_subtitles)
        finally:
            Path(temp_file).unlink(missing_ok=True)
    
    def test_load_pending_downloads_nonexistent_file(self):
        """Test loading pending downloads from nonexistent file."""
        loaded_tasks = self.queue_manager.load_pending_downloads("/nonexistent/file.json")
        self.assertEqual(len(loaded_tasks), 0)
    
    def test_restore_pending_downloads(self):
        """Test restoring pending downloads to queue."""
        # Create some tasks
        from models import DownloadTask
        from datetime import datetime
        
        video_info1 = VideoInfo(url="https://ok.ru/video/111111", title="Video 1")
        task1 = DownloadTask(
            id="task-1",
            video_info=video_info1,
            status=DownloadStatus.QUEUED,
            download_path="/tmp/downloads"
        )
        
        video_info2 = VideoInfo(url="https://ok.ru/video/222222", title="Video 2")
        task2 = DownloadTask(
            id="task-2",
            video_info=video_info2,
            status=DownloadStatus.QUEUED,
            download_path="/tmp/downloads"
        )
        
        # Restore tasks
        restored_count = self.queue_manager.restore_pending_downloads([task1, task2])
        
        self.assertEqual(restored_count, 2)
        self.assertEqual(len(self.queue_manager.get_all_tasks()), 2)
        
        # Verify tasks are in queue
        all_tasks = self.queue_manager.get_all_tasks()
        urls = [task.video_info.url for task in all_tasks]
        self.assertIn("https://ok.ru/video/111111", urls)
        self.assertIn("https://ok.ru/video/222222", urls)
    
    def test_restore_pending_downloads_skips_duplicates(self):
        """Test that restore_pending_downloads skips duplicate URLs."""
        from models import DownloadTask
        
        # Add a task to queue
        self.queue_manager.add_task(self.video_info)
        
        # Try to restore the same URL
        task = DownloadTask(
            id="task-1",
            video_info=self.video_info,
            status=DownloadStatus.QUEUED,
            download_path="/tmp/downloads"
        )
        
        restored_count = self.queue_manager.restore_pending_downloads([task])
        
        # Should skip duplicate
        self.assertEqual(restored_count, 0)
        self.assertEqual(len(self.queue_manager.get_all_tasks()), 1)


if __name__ == "__main__":
    unittest.main()
