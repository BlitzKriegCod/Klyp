"""
Settings Manager for Klyp Video Downloader.
Handles user preferences persistence.
"""

import json
import os
from pathlib import Path
from typing import Optional


class SettingsManager:
    """Manages user settings and preferences."""
    
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
    }
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize SettingsManager.
        
        Args:
            config_path: Path to configuration file. If None, uses default location.
        """
        if config_path is None:
            config_dir = Path.home() / ".config" / "klyp"
            config_dir.mkdir(parents=True, exist_ok=True)
            config_path = config_dir / "settings.json"
        
        self.config_path = Path(config_path)
        self.settings = self._load_settings()
    
    def _load_settings(self) -> dict:
        """Load settings from file or return defaults."""
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    loaded_settings = json.load(f)
                # Merge with defaults to ensure all keys exist
                settings = self.DEFAULT_SETTINGS.copy()
                settings.update(loaded_settings)
                return settings
            except (json.JSONDecodeError, IOError) as e:
                print(f"Error loading settings: {e}. Using defaults.")
                return self.DEFAULT_SETTINGS.copy()
        return self.DEFAULT_SETTINGS.copy()
    
    def save_settings(self) -> bool:
        """
        Save current settings to file.
        
        Returns:
            True if successful, False otherwise.
        """
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(self.settings, f, indent=2)
            return True
        except IOError as e:
            print(f"Error saving settings: {e}")
            return False
    
    def get(self, key: str, default=None):
        """
        Get a setting value.
        
        Args:
            key: Setting key.
            default: Default value if key doesn't exist.
        
        Returns:
            Setting value or default.
        """
        return self.settings.get(key, default)
    
    def set(self, key: str, value) -> None:
        """
        Set a setting value and save.
        
        Args:
            key: Setting key.
            value: Setting value.
        """
        self.settings[key] = value
        self.save_settings()
    
    def get_download_directory(self) -> str:
        """Get the download directory path."""
        return self.settings["download_directory"]
    
    def set_download_directory(self, path: str) -> None:
        """Set the download directory path."""
        self.set("download_directory", path)
    
    def get_theme(self) -> str:
        """Get the current theme (dark or light)."""
        return self.settings["theme"]
    
    def set_theme(self, theme: str) -> None:
        """Set the theme (dark or light)."""
        if theme not in ["dark", "light"]:
            raise ValueError("Theme must be 'dark' or 'light'")
        self.set("theme", theme)
    
    def get_download_mode(self) -> str:
        """Get the download mode (sequential or multi-threaded)."""
        return self.settings["download_mode"]
    
    def set_download_mode(self, mode: str) -> None:
        """Set the download mode (sequential or multi-threaded)."""
        if mode not in ["sequential", "multi-threaded"]:
            raise ValueError("Download mode must be 'sequential' or 'multi-threaded'")
        self.set("download_mode", mode)
    
    def reset_to_defaults(self) -> None:
        """Reset all settings to default values."""
        self.settings = self.DEFAULT_SETTINGS.copy()
        self.save_settings()
