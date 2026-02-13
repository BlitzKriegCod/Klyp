"""
Settings Manager for Klyp Video Downloader.
Handles user preferences persistence.
"""

import json
import os
import threading
from pathlib import Path
from typing import Optional

from utils.event_bus import EventBus, Event, EventType
from utils.logger import get_logger


class SettingsManager:
    """
    Manages user settings and preferences.
    
    Singleton class with thread-safe access to settings.
    Uses caching to minimize disk I/O operations.
    """
    
    _instance = None
    _lock = threading.Lock()
    
    DEFAULT_SETTINGS = {
        "download_directory": str(Path.home() / "Downloads" / "Klyp"),
        "theme": "dark",
        "download_mode": "sequential",
        "proxy_enabled": False,
        "proxy_host": "",
        "proxy_port": "",
        "proxy_type": "http",
        "subtitle_download": False,
        "notifications_enabled": True,
        "auto_resume": True,
        # Advanced yt-dlp settings
        "extract_audio": False,
        "audio_format": "mp3",
        "embed_thumbnail": False,
        "embed_metadata": False,
        "sponsorblock_enabled": False,
        "cookies_path": "",
        # OpenSubtitles settings
        "os_username": "",
        "os_password": "",
        "os_api_key": "FNyoC96mlztsk3ALgNdhfSNapfFY9lOi",
        # Search enhancement settings
        "search_enable_enrichment": True,
        "search_enable_quality_filter": True,
        "search_enable_recommendations": True,
        "search_cache_ttl": 3600,
        "search_max_parallel_enrichment": 5,
        "search_show_platform_health": True,
        # Debug settings
        "debug_thread_safety": False,
    }
    
    def __new__(cls, config_path: Optional[str] = None):
        """
        Create or return singleton instance with double-checked locking.
        
        Args:
            config_path: Path to configuration file. Only used on first instantiation.
        
        Returns:
            Singleton instance of SettingsManager
        """
        if cls._instance is None:
            with cls._lock:
                # Double-checked locking
                if cls._instance is None:
                    instance = super().__new__(cls)
                    cls._instance = instance
        return cls._instance
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize SettingsManager.
        
        Args:
            config_path: Path to configuration file. If None, uses default location.
        """
        # Prevent re-initialization
        if hasattr(self, '_initialized'):
            return
        
        self._initialized = True
        self._logger = get_logger()
        self._cache_lock = threading.RLock()  # Reentrant lock for nested calls
        
        if config_path is None:
            config_dir = Path.home() / ".config" / "klyp"
            config_dir.mkdir(parents=True, exist_ok=True)
            config_path = config_dir / "settings.json"
        
        self.config_path = Path(config_path)
        self._settings_cache = self._load_settings()
        self._logger.info(f"SettingsManager initialized with config at {self.config_path}")
    
    def _load_settings(self) -> dict:
        """
        Load settings from file or return defaults.
        
        Settings are loaded once and cached in memory. The cache is only
        invalidated when save_settings() is called.
        
        Returns:
            Dictionary of settings
        """
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    loaded_settings = json.load(f)
                # Merge with defaults to ensure all keys exist
                settings = self.DEFAULT_SETTINGS.copy()
                settings.update(loaded_settings)
                self._logger.info(f"Settings loaded from {self.config_path}")
                return settings
            except (json.JSONDecodeError, IOError) as e:
                self._logger.error(f"Error loading settings: {e}. Using defaults.")
                return self.DEFAULT_SETTINGS.copy()
        
        self._logger.info("No settings file found, using defaults")
        return self.DEFAULT_SETTINGS.copy()
    
    def save_settings(self) -> bool:
        """
        Save current settings to file and invalidate cache.
        
        Returns:
            True if successful, False otherwise.
        """
        with self._cache_lock:
            try:
                self.config_path.parent.mkdir(parents=True, exist_ok=True)
                with open(self.config_path, 'w', encoding='utf-8') as f:
                    json.dump(self._settings_cache, f, indent=2)
                self._logger.info(f"Settings saved to {self.config_path}")
                return True
            except IOError as e:
                self._logger.error(f"Error saving settings: {e}")
                return False
    
    def get(self, key: str, default=None):
        """
        Get a setting value (thread-safe).
        
        Args:
            key: Setting key.
            default: Default value if key doesn't exist.
        
        Returns:
            Setting value or default.
        """
        with self._cache_lock:
            return self._settings_cache.get(key, default)
    
    def set(self, key: str, value) -> None:
        """
        Set a setting value and save (thread-safe).
        
        Args:
            key: Setting key.
            value: Setting value.
        """
        with self._cache_lock:
            old_value = self._settings_cache.get(key)
            self._settings_cache[key] = value
            
            # Save to disk
            if self.save_settings():
                # Publish event if value actually changed
                if old_value != value:
                    self._publish_settings_changed([key])
    
    def _publish_settings_changed(self, changed_keys: list) -> None:
        """
        Publish SETTINGS_CHANGED event.
        
        Args:
            changed_keys: List of setting keys that changed
        """
        try:
            # Get EventBus instance (may not be available during initialization)
            from utils.event_bus import EventBus
            event_bus = EventBus()
            
            # Create event data with changed keys and their new values
            settings_data = {key: self._settings_cache.get(key) for key in changed_keys}
            
            event_bus.publish(Event(
                type=EventType.SETTINGS_CHANGED,
                data={
                    "changed_keys": changed_keys,
                    "settings": settings_data
                }
            ))
            self._logger.debug(f"Published SETTINGS_CHANGED event for keys: {changed_keys}")
        except Exception as e:
            # Don't fail if EventBus is not available
            self._logger.debug(f"Could not publish SETTINGS_CHANGED event: {e}")
    
    def get_download_directory(self) -> str:
        """Get the download directory path (thread-safe)."""
        with self._cache_lock:
            return self._settings_cache["download_directory"]
    
    def set_download_directory(self, path: str) -> None:
        """Set the download directory path (thread-safe)."""
        self.set("download_directory", path)
    
    def get_theme(self) -> str:
        """Get the current theme (dark or light) (thread-safe)."""
        with self._cache_lock:
            return self._settings_cache["theme"]
    
    def set_theme(self, theme: str) -> None:
        """Set the theme (dark or light) (thread-safe)."""
        if theme not in ["dark", "light"]:
            raise ValueError("Theme must be 'dark' or 'light'")
        self.set("theme", theme)
    
    def get_download_mode(self) -> str:
        """Get the download mode (sequential or multi-threaded) (thread-safe)."""
        with self._cache_lock:
            return self._settings_cache["download_mode"]
    
    def set_download_mode(self, mode: str) -> None:
        """Set the download mode (sequential or multi-threaded) (thread-safe)."""
        if mode not in ["sequential", "multi-threaded"]:
            raise ValueError("Download mode must be 'sequential' or 'multi-threaded'")
        self.set("download_mode", mode)
    
    def reset_to_defaults(self) -> None:
        """Reset all settings to default values (thread-safe)."""
        with self._cache_lock:
            # Track all keys that will change
            changed_keys = [
                key for key in self.DEFAULT_SETTINGS.keys()
                if self._settings_cache.get(key) != self.DEFAULT_SETTINGS[key]
            ]
            
            self._settings_cache = self.DEFAULT_SETTINGS.copy()
            
            if self.save_settings() and changed_keys:
                self._publish_settings_changed(changed_keys)
