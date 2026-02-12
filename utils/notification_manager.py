"""
Notification Manager for Klyp Video Downloader.
Handles desktop notifications for download completion.
"""

import os
import warnings
from typing import Optional

# Suppress all plyer warnings to prevent crashes
warnings.filterwarnings('ignore', module='plyer')

# Suppress plyer warnings if dependencies are missing on Linux
NOTIFICATIONS_AVAILABLE = False
try:
    # Suppress warnings during import
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        from plyer import notification
    
    # Check for Linux specific issues (dbus/notify-send)
    if os.name == 'posix':
        import subprocess
        try:
            # Check if notify-send exists
            result = subprocess.run(['which', 'notify-send'], capture_output=True, timeout=1)
            if result.returncode == 0:
                NOTIFICATIONS_AVAILABLE = True
        except Exception:
            # If check fails, disable notifications
            NOTIFICATIONS_AVAILABLE = False
    else:
        # On non-Linux systems, assume plyer works
        NOTIFICATIONS_AVAILABLE = True
            
except ImportError:
    NOTIFICATIONS_AVAILABLE = False


class NotificationManager:
    """Manages desktop notifications for download events."""
    
    def __init__(self, enabled: bool = True):
        """
        Initialize NotificationManager.
        
        Args:
            enabled: Whether notifications are enabled.
        """
        self.enabled = enabled and NOTIFICATIONS_AVAILABLE
        self.app_name = "Klyp"
    
    def set_enabled(self, enabled: bool) -> None:
        """
        Enable or disable notifications.
        
        Args:
            enabled: Whether to enable notifications.
        """
        self.enabled = enabled and NOTIFICATIONS_AVAILABLE
    
    def is_available(self) -> bool:
        """
        Check if notifications are available on this system.
        
        Returns:
            True if notifications are available, False otherwise.
        """
        return NOTIFICATIONS_AVAILABLE
    
    def notify_download_complete(self, video_title: str, filename: str) -> None:
        """
        Display notification for a completed download.
        
        Args:
            video_title: Title of the downloaded video.
            filename: Name of the downloaded file.
        """
        if not self.enabled:
            return
        
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                notification.notify(
                    title="Download Complete",
                    message=f"{video_title}\nSaved as: {filename}",
                    app_name=self.app_name,
                    timeout=5
                )
        except Exception as e:
            # Silently fail if notification fails to avoid crashes
            print(f"DEBUG: Notification failed (non-critical): {e}")
            pass
    
    def notify_all_downloads_complete(self, total_count: int, successful_count: int, failed_count: int) -> None:
        """
        Display summary notification when all downloads complete.
        
        Args:
            total_count: Total number of downloads.
            successful_count: Number of successful downloads.
            failed_count: Number of failed downloads.
        """
        if not self.enabled:
            return
        
        try:
            if failed_count == 0:
                message = f"All {total_count} downloads completed successfully!"
            else:
                message = f"{successful_count} of {total_count} downloads completed.\n{failed_count} failed."
            
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                notification.notify(
                    title="All Downloads Complete",
                    message=message,
                    app_name=self.app_name,
                    timeout=10
                )
        except Exception as e:
            # Silently fail if notification fails
            print(f"DEBUG: Notification failed (non-critical): {e}")
            pass
    
    def notify_download_failed(self, video_title: str, error_message: str) -> None:
        """
        Display notification for a failed download.
        
        Args:
            video_title: Title of the video that failed.
            error_message: Error message describing the failure.
        """
        if not self.enabled:
            return
        
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                notification.notify(
                    title="Download Failed",
                    message=f"{video_title}\nError: {error_message}",
                    app_name=self.app_name,
                    timeout=10
                )
        except Exception as e:
            # Silently fail if notification fails
            print(f"DEBUG: Notification failed (non-critical): {e}")
            pass
