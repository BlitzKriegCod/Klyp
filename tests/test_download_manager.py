"""
Unit tests for DownloadManager, VideoDownloader, and SessionManager.
Tests download operations and authentication flow.
"""

import unittest
import tempfile
from pathlib import Path
from models import VideoInfo, DownloadStatus
from controllers import QueueManager, DownloadManager
from utils import SessionManager, DirectoryManager


class TestDirectoryManager(unittest.TestCase):
    """Test cases for DirectoryManager."""
    
    def test_validate_directory_empty_path(self):
        """Test validation with empty path."""
        is_valid, error = DirectoryManager.validate_directory("")
        self.assertFalse(is_valid)
        self.assertIn("empty", error.lower())
    
    def test_validate_directory_existing(self):
        """Test validation with existing directory."""
        with tempfile.TemporaryDirectory() as temp_dir:
            is_valid, error = DirectoryManager.validate_directory(temp_dir)
            self.assertTrue(is_valid)
            self.assertEqual(error, "")
    
    def test_create_directory(self):
        """Test creating a new directory."""
        with tempfile.TemporaryDirectory() as temp_dir:
            new_dir = Path(temp_dir) / "test_subdir"
            success, error = DirectoryManager.create_directory(str(new_dir))
            self.assertTrue(success)
            self.assertEqual(error, "")
            self.assertTrue(new_dir.exists())
    
    def test_ensure_directory_exists(self):
        """Test ensuring directory exists."""
        with tempfile.TemporaryDirectory() as temp_dir:
            new_dir = Path(temp_dir) / "test_subdir"
            success, error = DirectoryManager.ensure_directory_exists(str(new_dir))
            self.assertTrue(success)
            self.assertTrue(new_dir.exists())
    
    def test_get_directory_info(self):
        """Test getting directory information."""
        with tempfile.TemporaryDirectory() as temp_dir:
            info = DirectoryManager.get_directory_info(temp_dir)
            self.assertTrue(info['exists'])
            self.assertTrue(info['is_directory'])
            self.assertTrue(info['is_writable'])


class TestSessionManager(unittest.TestCase):
    """Test cases for SessionManager."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.session_manager = SessionManager(cookies_dir=self.temp_dir)
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_initial_state(self):
        """Test initial state of SessionManager."""
        self.assertFalse(self.session_manager.is_logged_in())
        self.assertEqual(self.session_manager.get_username(), "")
    
    def test_login(self):
        """Test login functionality."""
        result = self.session_manager.login("testuser", "testpass")
        self.assertTrue(result)
        self.assertTrue(self.session_manager.is_logged_in())
        self.assertEqual(self.session_manager.get_username(), "testuser")
    
    def test_login_empty_credentials(self):
        """Test login with empty credentials."""
        result = self.session_manager.login("", "")
        self.assertFalse(result)
        self.assertFalse(self.session_manager.is_logged_in())
    
    def test_logout(self):
        """Test logout functionality."""
        self.session_manager.login("testuser", "testpass")
        self.session_manager.logout()
        self.assertFalse(self.session_manager.is_logged_in())
        self.assertEqual(self.session_manager.get_username(), "")
    
    def test_get_cookies_file(self):
        """Test getting cookies file path."""
        self.assertIsNone(self.session_manager.get_cookies_file())
        self.session_manager.login("testuser", "testpass")
        cookies_file = self.session_manager.get_cookies_file()
        self.assertIsNotNone(cookies_file)
        self.assertTrue(Path(cookies_file).exists())

    def test_import_cookies_from_file(self):
        """Test importing cookies from file."""
        # Create a test cookies file
        cookies_file = Path(self.temp_dir) / "test_cookies.txt"
        with open(cookies_file, 'w') as f:
            f.write("# Netscape HTTP Cookie File\n")
            f.write("# Test cookies\n")
        
        result = self.session_manager.import_cookies_from_file(str(cookies_file))
        self.assertTrue(result)
        self.assertTrue(self.session_manager.is_logged_in())


class TestDownloadManager(unittest.TestCase):
    """Test cases for DownloadManager."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.queue_manager = QueueManager()
        self.download_manager = DownloadManager(self.queue_manager)
    
    def test_initial_state(self):
        """Test initial state of DownloadManager."""
        self.assertFalse(self.download_manager.is_running)
        self.assertEqual(self.download_manager.download_mode, "sequential")
        self.assertEqual(self.download_manager.get_active_download_count(), 0)
    
    def test_set_download_mode(self):
        """Test setting download mode."""
        self.download_manager.set_download_mode("multi-threaded")
        self.assertEqual(self.download_manager.download_mode, "multi-threaded")
        
        self.download_manager.set_download_mode("sequential")
        self.assertEqual(self.download_manager.download_mode, "sequential")
    
    def test_set_invalid_download_mode(self):
        """Test setting invalid download mode."""
        with self.assertRaises(ValueError):
            self.download_manager.set_download_mode("invalid-mode")
    
    def test_status_callback(self):
        """Test status callback registration (deprecated)."""
        callback_called = []
        
        def test_callback(task_id, status, progress):
            callback_called.append((task_id, status, progress))
        
        # This method is deprecated but should not crash
        self.download_manager.set_status_callback(test_callback)
        # The callback is no longer stored, so we just verify it doesn't crash
    
    def test_stop_download(self):
        """Test stopping a download (delegates to DownloadService)."""
        video_info = VideoInfo(url="https://ok.ru/video/123456")
        task = self.queue_manager.add_task(video_info)
        
        # Test stopping a task that's not downloading (should return False or handle gracefully)
        result = self.download_manager.stop_task(task.id)
        # Task is QUEUED, so it should be marked as STOPPED
        self.assertTrue(result)
    
    def test_stop_nonexistent_download(self):
        """Test stopping a download that doesn't exist."""
        result = self.download_manager.stop_task("nonexistent-id")
        self.assertFalse(result)
    
    def test_is_task_downloading(self):
        """Test checking if task is downloading."""
        video_info = VideoInfo(url="https://ok.ru/video/123456")
        task = self.queue_manager.add_task(video_info)
        
        self.assertFalse(self.download_manager.is_task_downloading(task.id))


class TestSubtitleDownload(unittest.TestCase):
    """Test cases for subtitle download functionality."""
    
    def test_video_info_with_subtitles(self):
        """Test creating VideoInfo with subtitle download enabled."""
        video_info = VideoInfo(
            url="https://ok.ru/video/123456",
            title="Test Video",
            download_subtitles=True
        )
        self.assertTrue(video_info.download_subtitles)
    
    def test_video_info_without_subtitles(self):
        """Test creating VideoInfo with subtitle download disabled."""
        video_info = VideoInfo(
            url="https://ok.ru/video/123456",
            title="Test Video",
            download_subtitles=False
        )
        self.assertFalse(video_info.download_subtitles)
    
    def test_subtitle_download_default(self):
        """Test that subtitle download defaults to False."""
        video_info = VideoInfo(url="https://ok.ru/video/123456")
        self.assertFalse(video_info.download_subtitles)


if __name__ == "__main__":
    unittest.main()
