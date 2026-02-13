"""
Tests for data compatibility validation.
Ensures that existing data files from previous versions can be loaded correctly.
"""

import json
import os
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

from controllers.queue_manager import QueueManager
from controllers.history_manager import HistoryManager
from controllers.settings_manager import SettingsManager
from models.data_models import DownloadStatus


class TestPendingDownloadsCompatibility(unittest.TestCase):
    """Test compatibility with pending_downloads.json format."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.pending_file = os.path.join(self.temp_dir, "pending_downloads.json")
        self.queue_manager = QueueManager()
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_load_pending_downloads_with_real_format(self):
        """Test loading pending_downloads.json with real format from previous version."""
        # Create a sample pending_downloads.json file with the exact format
        # that would be saved by the current version
        sample_data = [
            {
                "id": "test-task-1",
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "title": "Test Video 1",
                "thumbnail": "https://example.com/thumb1.jpg",
                "duration": 213,
                "author": "Test Author",
                "selected_quality": "1080p",
                "filename": "test_video_1.mp4",
                "download_subtitles": False,
                "download_path": "/home/user/Downloads",
                "status": "queued",
                "progress": 0.0,
                "created_at": "2024-01-15T10:30:00"
            },
            {
                "id": "test-task-2",
                "url": "https://vimeo.com/123456789",
                "title": "Test Video 2",
                "thumbnail": "https://example.com/thumb2.jpg",
                "duration": 456,
                "author": "Another Author",
                "selected_quality": "720p",
                "filename": "test_video_2.mp4",
                "download_subtitles": True,
                "download_path": "/home/user/Videos",
                "status": "downloading",
                "progress": 45.5,
                "created_at": "2024-01-15T11:00:00"
            },
            {
                "id": "test-task-3",
                "url": "https://www.youtube.com/watch?v=test123",
                "title": "Test Video 3",
                "thumbnail": "",
                "duration": 0,
                "author": "",
                "selected_quality": "best",
                "filename": "",
                "download_subtitles": False,
                "download_path": "",
                "status": "stopped",
                "progress": 12.3,
                "created_at": "2024-01-15T09:00:00"
            }
        ]
        
        # Write sample data to file
        with open(self.pending_file, 'w', encoding='utf-8') as f:
            json.dump(sample_data, f, indent=2)
        
        # Load the data
        loaded_tasks = self.queue_manager.load_pending_downloads(self.pending_file)
        
        # Verify correct number of tasks loaded
        self.assertEqual(len(loaded_tasks), 3, "Should load all 3 tasks")
        
        # Verify first task
        task1 = loaded_tasks[0]
        self.assertEqual(task1.id, "test-task-1")
        self.assertEqual(task1.video_info.url, "https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        self.assertEqual(task1.video_info.title, "Test Video 1")
        self.assertEqual(task1.video_info.thumbnail, "https://example.com/thumb1.jpg")
        self.assertEqual(task1.video_info.duration, 213)
        self.assertEqual(task1.video_info.author, "Test Author")
        self.assertEqual(task1.video_info.selected_quality, "1080p")
        self.assertEqual(task1.video_info.filename, "test_video_1.mp4")
        self.assertEqual(task1.video_info.download_subtitles, False)
        self.assertEqual(task1.download_path, "/home/user/Downloads")
        self.assertEqual(task1.status, DownloadStatus.QUEUED)
        self.assertEqual(task1.progress, 0.0)
        
        # Verify second task (downloading status should be reset to queued)
        task2 = loaded_tasks[1]
        self.assertEqual(task2.id, "test-task-2")
        self.assertEqual(task2.video_info.url, "https://vimeo.com/123456789")
        self.assertEqual(task2.status, DownloadStatus.QUEUED, "Downloading status should be reset to queued")
        self.assertEqual(task2.progress, 0.0, "Progress should be reset to 0")
        self.assertEqual(task2.video_info.download_subtitles, True)
        
        # Verify third task
        task3 = loaded_tasks[2]
        self.assertEqual(task3.id, "test-task-3")
        self.assertEqual(task3.status, DownloadStatus.STOPPED)
        self.assertEqual(task3.progress, 12.3)
    
    def test_save_and_reload_pending_downloads(self):
        """Test that saved format can be reloaded correctly."""
        # Add some tasks to queue
        from models.data_models import VideoInfo
        
        video1 = VideoInfo(
            url="https://www.youtube.com/watch?v=test1",
            title="Save Test 1",
            thumbnail="https://example.com/thumb.jpg",
            duration=300,
            author="Test Author",
            selected_quality="1080p",
            filename="save_test_1.mp4",
            download_subtitles=False
        )
        
        video2 = VideoInfo(
            url="https://vimeo.com/test2",
            title="Save Test 2",
            selected_quality="best"
        )
        
        task1 = self.queue_manager.add_task(video1, "/home/user/Downloads")
        task2 = self.queue_manager.add_task(video2, "/home/user/Videos")
        
        # Update task2 status
        self.queue_manager.update_task_status(task2.id, DownloadStatus.DOWNLOADING, 25.5)
        
        # Save pending downloads
        success = self.queue_manager.save_pending_downloads(self.pending_file)
        self.assertTrue(success, "Should save successfully")
        
        # Verify file exists and is valid JSON
        self.assertTrue(os.path.exists(self.pending_file), "File should exist")
        
        with open(self.pending_file, 'r', encoding='utf-8') as f:
            saved_data = json.load(f)
        
        self.assertEqual(len(saved_data), 2, "Should save 2 tasks")
        
        # Create new queue manager and load
        new_queue_manager = QueueManager()
        loaded_tasks = new_queue_manager.load_pending_downloads(self.pending_file)
        
        self.assertEqual(len(loaded_tasks), 2, "Should load 2 tasks")
        
        # Verify data integrity
        loaded_task1 = next(t for t in loaded_tasks if t.video_info.url == video1.url)
        self.assertEqual(loaded_task1.video_info.title, "Save Test 1")
        self.assertEqual(loaded_task1.video_info.duration, 300)
        self.assertEqual(loaded_task1.video_info.selected_quality, "1080p")
        self.assertEqual(loaded_task1.download_path, "/home/user/Downloads")
        
        loaded_task2 = next(t for t in loaded_tasks if t.video_info.url == video2.url)
        self.assertEqual(loaded_task2.video_info.title, "Save Test 2")
        # Downloading status should be reset to queued
        self.assertEqual(loaded_task2.status, DownloadStatus.QUEUED)
        self.assertEqual(loaded_task2.progress, 0.0)
    
    def test_load_empty_pending_downloads(self):
        """Test loading when file doesn't exist."""
        non_existent_file = os.path.join(self.temp_dir, "non_existent.json")
        loaded_tasks = self.queue_manager.load_pending_downloads(non_existent_file)
        
        self.assertEqual(len(loaded_tasks), 0, "Should return empty list")
    
    def test_load_malformed_pending_downloads(self):
        """Test loading malformed JSON file."""
        # Create malformed JSON
        with open(self.pending_file, 'w', encoding='utf-8') as f:
            f.write("{ invalid json }")
        
        loaded_tasks = self.queue_manager.load_pending_downloads(self.pending_file)
        
        self.assertEqual(len(loaded_tasks), 0, "Should return empty list on error")
    
    def test_save_only_pending_tasks(self):
        """Test that only queued, downloading, and stopped tasks are saved."""
        from models.data_models import VideoInfo
        
        # Add tasks with different statuses
        video1 = VideoInfo(url="https://test.com/1", title="Queued")
        video2 = VideoInfo(url="https://test.com/2", title="Downloading")
        video3 = VideoInfo(url="https://test.com/3", title="Completed")
        video4 = VideoInfo(url="https://test.com/4", title="Failed")
        video5 = VideoInfo(url="https://test.com/5", title="Stopped")
        
        task1 = self.queue_manager.add_task(video1)
        task2 = self.queue_manager.add_task(video2)
        task3 = self.queue_manager.add_task(video3)
        task4 = self.queue_manager.add_task(video4)
        task5 = self.queue_manager.add_task(video5)
        
        # Update statuses
        self.queue_manager.update_task_status(task2.id, DownloadStatus.DOWNLOADING, 50.0)
        self.queue_manager.update_task_status(task3.id, DownloadStatus.COMPLETED, 100.0)
        self.queue_manager.update_task_status(task4.id, DownloadStatus.FAILED, 0.0, "Error")
        self.queue_manager.update_task_status(task5.id, DownloadStatus.STOPPED, 30.0)
        
        # Save
        self.queue_manager.save_pending_downloads(self.pending_file)
        
        # Load and verify
        with open(self.pending_file, 'r', encoding='utf-8') as f:
            saved_data = json.load(f)
        
        # Should only save queued, downloading, and stopped (3 tasks)
        self.assertEqual(len(saved_data), 3, "Should only save pending tasks")
        
        saved_titles = [task["title"] for task in saved_data]
        self.assertIn("Queued", saved_titles)
        self.assertIn("Downloading", saved_titles)
        self.assertIn("Stopped", saved_titles)
        self.assertNotIn("Completed", saved_titles)
        self.assertNotIn("Failed", saved_titles)


class TestHistoryCompatibility(unittest.TestCase):
    """Test compatibility with download_history.json format."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.history_file = os.path.join(self.temp_dir, "download_history.json")
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_load_history_with_real_format(self):
        """Test loading download_history.json with real format from previous version."""
        # Create sample history data
        sample_history = [
            {
                "id": "1705315800.0_123456",
                "title": "Historical Video 1",
                "url": "https://www.youtube.com/watch?v=hist1",
                "path": "/home/user/Downloads/historical_video_1.mp4",
                "size": 52428800,
                "platform": "YouTube",
                "quality": "1080p",
                "duration": 300,
                "date": "2024-01-15T10:30:00",
                "timestamp": 1705315800.0
            },
            {
                "id": "1705319400.0_789012",
                "title": "Historical Video 2",
                "url": "https://vimeo.com/hist2",
                "path": "/home/user/Videos/historical_video_2.mp4",
                "size": 104857600,
                "platform": "Vimeo",
                "quality": "720p",
                "duration": 600,
                "date": "2024-01-15T11:30:00",
                "timestamp": 1705319400.0
            }
        ]
        
        # Write sample data to file
        with open(self.history_file, 'w', encoding='utf-8') as f:
            json.dump(sample_history, f, indent=2)
        
        # Load history
        history_manager = HistoryManager(self.history_file)
        
        # Verify data loaded correctly
        all_history = history_manager.get_all_history()
        self.assertEqual(len(all_history), 2, "Should load 2 history items")
        
        # Verify first item
        item1 = all_history[0]
        self.assertEqual(item1["id"], "1705315800.0_123456")
        self.assertEqual(item1["title"], "Historical Video 1")
        self.assertEqual(item1["url"], "https://www.youtube.com/watch?v=hist1")
        self.assertEqual(item1["path"], "/home/user/Downloads/historical_video_1.mp4")
        self.assertEqual(item1["size"], 52428800)
        self.assertEqual(item1["platform"], "YouTube")
        self.assertEqual(item1["quality"], "1080p")
        self.assertEqual(item1["duration"], 300)
        
        # Verify second item
        item2 = all_history[1]
        self.assertEqual(item2["platform"], "Vimeo")
        self.assertEqual(item2["size"], 104857600)
    
    def test_add_and_reload_history(self):
        """Test that added history entries can be reloaded correctly."""
        # Create history manager and add entries
        history_manager = HistoryManager(self.history_file)
        
        history_manager.add_download(
            title="New Download 1",
            url="https://www.youtube.com/watch?v=new1",
            file_path="/home/user/Downloads/new_download_1.mp4",
            file_size=10485760,
            platform="YouTube",
            quality="1080p",
            duration=180
        )
        
        history_manager.add_download(
            title="New Download 2",
            url="https://vimeo.com/new2",
            file_path="/home/user/Videos/new_download_2.mp4",
            file_size=20971520,
            platform="Vimeo",
            quality="720p",
            duration=240
        )
        
        # Verify file exists and is valid JSON
        self.assertTrue(os.path.exists(self.history_file), "History file should exist")
        
        with open(self.history_file, 'r', encoding='utf-8') as f:
            saved_data = json.load(f)
        
        self.assertEqual(len(saved_data), 2, "Should save 2 history items")
        
        # Create new history manager and verify data
        new_history_manager = HistoryManager(self.history_file)
        all_history = new_history_manager.get_all_history()
        
        self.assertEqual(len(all_history), 2, "Should load 2 history items")
        
        # Verify data integrity (most recent first)
        item1 = all_history[0]
        self.assertEqual(item1["title"], "New Download 2")
        self.assertEqual(item1["platform"], "Vimeo")
        self.assertEqual(item1["size"], 20971520)
        
        item2 = all_history[1]
        self.assertEqual(item2["title"], "New Download 1")
        self.assertEqual(item2["platform"], "YouTube")
        self.assertEqual(item2["size"], 10485760)
    
    def test_load_empty_history(self):
        """Test loading when history file doesn't exist."""
        non_existent_file = os.path.join(self.temp_dir, "non_existent_history.json")
        history_manager = HistoryManager(non_existent_file)
        
        all_history = history_manager.get_all_history()
        self.assertEqual(len(all_history), 0, "Should return empty list")
    
    def test_load_malformed_history(self):
        """Test loading malformed history JSON."""
        # Create malformed JSON
        with open(self.history_file, 'w', encoding='utf-8') as f:
            f.write("{ invalid json }")
        
        history_manager = HistoryManager(self.history_file)
        all_history = history_manager.get_all_history()
        
        self.assertEqual(len(all_history), 0, "Should return empty list on error")


class TestSettingsCompatibility(unittest.TestCase):
    """Test compatibility with settings.json format."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.settings_file = os.path.join(self.temp_dir, "settings.json")
        # Reset singleton for testing
        SettingsManager._instance = None
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
        # Reset singleton
        SettingsManager._instance = None
    
    def test_load_settings_with_real_format(self):
        """Test loading settings.json with real format from previous version."""
        # Create sample settings data with all expected fields
        sample_settings = {
            "download_directory": "/home/user/Downloads/Klyp",
            "theme": "dark",
            "download_mode": "sequential",
            "proxy_enabled": False,
            "proxy_host": "",
            "proxy_port": "",
            "proxy_type": "http",
            "subtitle_download": True,
            "notifications_enabled": True,
            "auto_resume": True,
            "extract_audio": False,
            "audio_format": "mp3",
            "embed_thumbnail": True,
            "embed_metadata": True,
            "sponsorblock_enabled": False,
            "cookies_path": "/home/user/.config/klyp/cookies.txt",
            "os_username": "testuser",
            "os_password": "testpass",
            "os_api_key": "test_api_key_12345",
            "search_enable_enrichment": True,
            "search_enable_quality_filter": True,
            "search_enable_recommendations": True,
            "search_cache_ttl": 3600,
            "search_max_parallel_enrichment": 5,
            "search_show_platform_health": True
        }
        
        # Write sample data to file
        with open(self.settings_file, 'w', encoding='utf-8') as f:
            json.dump(sample_settings, f, indent=2)
        
        # Load settings
        settings_manager = SettingsManager(self.settings_file)
        
        # Verify all settings loaded correctly
        self.assertEqual(settings_manager.get("download_directory"), "/home/user/Downloads/Klyp")
        self.assertEqual(settings_manager.get("theme"), "dark")
        self.assertEqual(settings_manager.get("download_mode"), "sequential")
        self.assertEqual(settings_manager.get("proxy_enabled"), False)
        self.assertEqual(settings_manager.get("subtitle_download"), True)
        self.assertEqual(settings_manager.get("notifications_enabled"), True)
        self.assertEqual(settings_manager.get("auto_resume"), True)
        self.assertEqual(settings_manager.get("extract_audio"), False)
        self.assertEqual(settings_manager.get("audio_format"), "mp3")
        self.assertEqual(settings_manager.get("embed_thumbnail"), True)
        self.assertEqual(settings_manager.get("embed_metadata"), True)
        self.assertEqual(settings_manager.get("sponsorblock_enabled"), False)
        self.assertEqual(settings_manager.get("cookies_path"), "/home/user/.config/klyp/cookies.txt")
        self.assertEqual(settings_manager.get("os_username"), "testuser")
        self.assertEqual(settings_manager.get("os_password"), "testpass")
        self.assertEqual(settings_manager.get("os_api_key"), "test_api_key_12345")
        self.assertEqual(settings_manager.get("search_enable_enrichment"), True)
        self.assertEqual(settings_manager.get("search_enable_quality_filter"), True)
        self.assertEqual(settings_manager.get("search_enable_recommendations"), True)
        self.assertEqual(settings_manager.get("search_cache_ttl"), 3600)
        self.assertEqual(settings_manager.get("search_max_parallel_enrichment"), 5)
        self.assertEqual(settings_manager.get("search_show_platform_health"), True)
    
    def test_save_and_reload_settings(self):
        """Test that saved settings can be reloaded correctly."""
        # Create settings manager and modify settings
        settings_manager = SettingsManager(self.settings_file)
        
        settings_manager.set("download_directory", "/custom/path/Downloads")
        settings_manager.set("theme", "light")
        settings_manager.set("download_mode", "multi-threaded")
        settings_manager.set("subtitle_download", True)
        settings_manager.set("extract_audio", True)
        settings_manager.set("audio_format", "flac")
        
        # Verify file exists and is valid JSON
        self.assertTrue(os.path.exists(self.settings_file), "Settings file should exist")
        
        with open(self.settings_file, 'r', encoding='utf-8') as f:
            saved_data = json.load(f)
        
        # Verify saved data
        self.assertEqual(saved_data["download_directory"], "/custom/path/Downloads")
        self.assertEqual(saved_data["theme"], "light")
        self.assertEqual(saved_data["download_mode"], "multi-threaded")
        
        # Reset singleton and create new instance
        SettingsManager._instance = None
        new_settings_manager = SettingsManager(self.settings_file)
        
        # Verify data integrity
        self.assertEqual(new_settings_manager.get("download_directory"), "/custom/path/Downloads")
        self.assertEqual(new_settings_manager.get("theme"), "light")
        self.assertEqual(new_settings_manager.get("download_mode"), "multi-threaded")
        self.assertEqual(new_settings_manager.get("subtitle_download"), True)
        self.assertEqual(new_settings_manager.get("extract_audio"), True)
        self.assertEqual(new_settings_manager.get("audio_format"), "flac")
    
    def test_load_settings_with_missing_keys(self):
        """Test loading settings file with missing keys (partial old version)."""
        # Create settings with only some keys (simulating old version)
        partial_settings = {
            "download_directory": "/old/path/Downloads",
            "theme": "dark",
            "download_mode": "sequential"
        }
        
        with open(self.settings_file, 'w', encoding='utf-8') as f:
            json.dump(partial_settings, f, indent=2)
        
        # Load settings
        settings_manager = SettingsManager(self.settings_file)
        
        # Verify old keys are preserved
        self.assertEqual(settings_manager.get("download_directory"), "/old/path/Downloads")
        self.assertEqual(settings_manager.get("theme"), "dark")
        self.assertEqual(settings_manager.get("download_mode"), "sequential")
        
        # Verify missing keys use defaults
        self.assertEqual(settings_manager.get("subtitle_download"), False)
        self.assertEqual(settings_manager.get("extract_audio"), False)
        self.assertEqual(settings_manager.get("notifications_enabled"), True)
    
    def test_load_empty_settings(self):
        """Test loading when settings file doesn't exist."""
        non_existent_file = os.path.join(self.temp_dir, "non_existent_settings.json")
        settings_manager = SettingsManager(non_existent_file)
        
        # Should use defaults
        self.assertIsNotNone(settings_manager.get("download_directory"))
        self.assertEqual(settings_manager.get("theme"), "dark")
        self.assertEqual(settings_manager.get("download_mode"), "sequential")
    
    def test_load_malformed_settings(self):
        """Test loading malformed settings JSON."""
        # Create malformed JSON
        with open(self.settings_file, 'w', encoding='utf-8') as f:
            f.write("{ invalid json }")
        
        settings_manager = SettingsManager(self.settings_file)
        
        # Should fall back to defaults
        self.assertIsNotNone(settings_manager.get("download_directory"))
        self.assertEqual(settings_manager.get("theme"), "dark")


if __name__ == '__main__':
    unittest.main()
