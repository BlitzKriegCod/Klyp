"""
Views module for Klyp Video Downloader.
Contains all screen components.
"""

from views.home_screen import HomeScreen
from views.search_screen import SearchScreen
from views.queue_screen import QueueScreen
from views.settings_screen import SettingsScreen
from views.history_screen import HistoryScreen
from views.subtitles_screen import SubtitlesScreen

__all__ = [
    "HomeScreen",
    "SearchScreen",
    "QueueScreen",
    "SettingsScreen",
    "HistoryScreen",
    "SubtitlesScreen"
]
