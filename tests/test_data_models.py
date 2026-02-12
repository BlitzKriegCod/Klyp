"""
Unit tests for data models.
Tests VideoInfo, DownloadTask, and DownloadHistory.
"""

import unittest
from datetime import datetime
from models import VideoInfo, DownloadTask, DownloadHistory, DownloadStatus


class TestVideoInfo(unittest.TestCase):
    """Test cases for VideoInfo model."""
    
    def test_valid_video_info(self):
        """Test creating a valid VideoInfo instance."""
        video = VideoInfo(
            url="https://ok.ru/video/123456",
            title="Test Video",
            duration=120
        )
        self.assertEqual(video.url, "https://ok.ru/video/123456")
        self.assertEqual(video.title, "Test Video")
        self.assertEqual(video.duration, 120)
    
    def test_empty_url_raises_error(self):
        """Test that empty URL raises ValueError."""
        with self.assertRaises(ValueError):
            VideoInfo(url="")
    
    def test_invalid_url_raises_error(self):
        """Test that invalid URL format raises ValueError."""
        with self.assertRaises(ValueError):
            VideoInfo(url="not-a-valid-url")
    
    def test_download_subtitles_default(self):
        """Test that download_subtitles defaults to False."""
        video = VideoInfo(url="https://ok.ru/video/123456")
        self.assertFalse(video.download_subtitles)
    
    def test_download_subtitles_enabled(self):
        """Test creating VideoInfo with subtitles enabled."""
        video = VideoInfo(
            url="https://ok.ru/video/123456",
            download_subtitles=True
        )
        self.assertTrue(video.download_subtitles)


class TestDownloadTask(unittest.TestCase):
    """Test cases for DownloadTask model."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.video_info = VideoInfo(url="https://ok.ru/video/123456")
    
    def test_valid_download_task(self):
        """Test creating a valid DownloadTask."""
        task = DownloadTask(
            id="task-1",
            video_info=self.video_info,
            status=DownloadStatus.QUEUED
        )
        self.assertEqual(task.id, "task-1")
        self.assertEqual(task.status, DownloadStatus.QUEUED)
        self.assertEqual(task.progress, 0.0)
    
    def test_empty_id_raises_error(self):
        """Test that empty task ID raises ValueError."""
        with self.assertRaises(ValueError):
            DownloadTask(id="", video_info=self.video_info)
    
    def test_invalid_progress_raises_error(self):
        """Test that invalid progress value raises ValueError."""
        with self.assertRaises(ValueError):
            DownloadTask(
                id="task-1",
                video_info=self.video_info,
                progress=150.0
            )


class TestDownloadHistory(unittest.TestCase):
    """Test cases for DownloadHistory model."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.video_info = VideoInfo(url="https://ok.ru/video/123456")
    
    def test_valid_download_history(self):
        """Test creating a valid DownloadHistory."""
        history = DownloadHistory(
            id="history-1",
            video_info=self.video_info,
            download_path="/downloads/video.mp4",
            file_size=1024000
        )
        self.assertEqual(history.id, "history-1")
        self.assertEqual(history.download_path, "/downloads/video.mp4")
        self.assertEqual(history.file_size, 1024000)
    
    def test_empty_download_path_raises_error(self):
        """Test that empty download path raises ValueError."""
        with self.assertRaises(ValueError):
            DownloadHistory(
                id="history-1",
                video_info=self.video_info,
                download_path=""
            )
    
    def test_negative_file_size_raises_error(self):
        """Test that negative file size raises ValueError."""
        with self.assertRaises(ValueError):
            DownloadHistory(
                id="history-1",
                video_info=self.video_info,
                download_path="/downloads/video.mp4",
                file_size=-100
            )


if __name__ == "__main__":
    unittest.main()
