"""
Unit tests for NotificationManager.
Tests notification display functionality.
"""

import unittest
from unittest.mock import patch, MagicMock, Mock
import sys


# Mock plyer before any imports
plyer_mock = MagicMock()
notification_mock = MagicMock()
plyer_mock.notification = notification_mock
sys.modules['plyer'] = plyer_mock
sys.modules['plyer.notification'] = notification_mock

from utils import NotificationManager
import importlib
import utils.notification_manager
importlib.reload(utils.notification_manager)
from utils import NotificationManager


class TestNotificationManager(unittest.TestCase):
    """Test cases for NotificationManager."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Reset the mock before each test
        notification_mock.notify.reset_mock()
        self.notification_manager = NotificationManager(enabled=True)
    
    def test_initial_state(self):
        """Test initial state of NotificationManager."""
        self.assertTrue(self.notification_manager.enabled)
        self.assertEqual(self.notification_manager.app_name, "OK.ru Video Downloader")
    
    def test_is_available(self):
        """Test checking if notifications are available."""
        result = self.notification_manager.is_available()
        self.assertTrue(result)
    
    def test_set_enabled(self):
        """Test enabling and disabling notifications."""
        self.notification_manager.set_enabled(False)
        self.assertFalse(self.notification_manager.enabled)
        
        self.notification_manager.set_enabled(True)
        self.assertTrue(self.notification_manager.enabled)
    
    def test_notify_download_complete(self):
        """Test notification for completed download."""
        self.notification_manager.notify_download_complete(
            video_title="Test Video",
            filename="test_video.mp4"
        )
        
        notification_mock.notify.assert_called_once()
        call_args = notification_mock.notify.call_args[1]
        self.assertEqual(call_args['title'], "Download Complete")
        self.assertIn("Test Video", call_args['message'])
        self.assertIn("test_video.mp4", call_args['message'])
    
    def test_notify_download_complete_disabled(self):
        """Test that notification is not sent when disabled."""
        self.notification_manager.set_enabled(False)
        
        self.notification_manager.notify_download_complete(
            video_title="Test Video",
            filename="test_video.mp4"
        )
        
        notification_mock.notify.assert_not_called()
    
    def test_notify_all_downloads_complete_success(self):
        """Test summary notification when all downloads succeed."""
        self.notification_manager.notify_all_downloads_complete(
            total_count=5,
            successful_count=5,
            failed_count=0
        )
        
        notification_mock.notify.assert_called_once()
        call_args = notification_mock.notify.call_args[1]
        self.assertEqual(call_args['title'], "All Downloads Complete")
        self.assertIn("5", call_args['message'])
        self.assertIn("successfully", call_args['message'])
    
    def test_notify_all_downloads_complete_with_failures(self):
        """Test summary notification with some failures."""
        self.notification_manager.notify_all_downloads_complete(
            total_count=5,
            successful_count=3,
            failed_count=2
        )
        
        notification_mock.notify.assert_called_once()
        call_args = notification_mock.notify.call_args[1]
        self.assertEqual(call_args['title'], "All Downloads Complete")
        self.assertIn("3", call_args['message'])
        self.assertIn("5", call_args['message'])
        self.assertIn("2", call_args['message'])
        self.assertIn("failed", call_args['message'])
    
    def test_notify_download_failed(self):
        """Test notification for failed download."""
        self.notification_manager.notify_download_failed(
            video_title="Test Video",
            error_message="Network error"
        )
        
        notification_mock.notify.assert_called_once()
        call_args = notification_mock.notify.call_args[1]
        self.assertEqual(call_args['title'], "Download Failed")
        self.assertIn("Test Video", call_args['message'])
        self.assertIn("Network error", call_args['message'])
    
    def test_notification_exception_handling(self):
        """Test that notification exceptions are handled gracefully."""
        notification_mock.notify.side_effect = Exception("Notification failed")
        
        # Should not raise exception
        self.notification_manager.notify_download_complete(
            video_title="Test Video",
            filename="test_video.mp4"
        )
        
        # Reset side effect for other tests
        notification_mock.notify.side_effect = None


class TestNotificationManagerIntegration(unittest.TestCase):
    """Integration tests for NotificationManager."""
    
    def test_notification_manager_creation(self):
        """Test creating NotificationManager with different settings."""
        # Test with notifications enabled
        nm_enabled = NotificationManager(enabled=True)
        self.assertTrue(nm_enabled.enabled)
        
        # Test with notifications disabled
        nm_disabled = NotificationManager(enabled=False)
        self.assertFalse(nm_disabled.enabled)


if __name__ == "__main__":
    unittest.main()
