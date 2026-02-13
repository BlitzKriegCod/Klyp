"""Utility functions and helpers."""

from .video_downloader import VideoDownloader
from .session_manager import SessionManager
from .directory_manager import DirectoryManager
from .notification_manager import NotificationManager
from .logger import get_logger, set_debug_mode, debug, info, warning, error, critical, exception
from .event_bus import EventBus, Event, EventType
from .thread_pool_manager import ThreadPoolManager
from .safe_callback_mixin import SafeCallbackMixin
from .exceptions import (
    KlypException,
    DownloadException,
    NetworkException,
    AuthenticationException,
    FormatException,
    ExtractionException,
    ThreadSafetyViolation,
    QueueException,
    SettingsException,
    SearchException,
    classify_yt_dlp_error
)
from .decorators import (
    safe_callback,
    thread_safe_ui_update,
    retry_on_network_error,
    log_execution_time,
    deprecated
)

__all__ = [
    "VideoDownloader",
    "SessionManager",
    "DirectoryManager",
    "NotificationManager",
    "get_logger",
    "set_debug_mode",
    "debug",
    "info",
    "warning",
    "error",
    "critical",
    "exception",
    "EventBus",
    "Event",
    "EventType",
    "ThreadPoolManager",
    "SafeCallbackMixin",
    "KlypException",
    "DownloadException",
    "NetworkException",
    "AuthenticationException",
    "FormatException",
    "ExtractionException",
    "ThreadSafetyViolation",
    "QueueException",
    "SettingsException",
    "SearchException",
    "classify_yt_dlp_error",
    "safe_callback",
    "thread_safe_ui_update",
    "retry_on_network_error",
    "log_execution_time",
    "deprecated"
]
