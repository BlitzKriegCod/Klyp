"""
Unit tests for SettingsManager.
Tests settings persistence and management.
"""

import unittest
import tempfile
from pathlib import Path
from controllers import SettingsManager


class TestSettingsManager(unittest.TestCase):
    """Test cases for SettingsManager."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json')
        self.temp_file.close()
        self.settings_manager = SettingsManager(config_path=self.temp_file.name)
    
    def tearDown(self):
        """Clean up test fixtures."""
        Path(self.temp_file.name).unlink(missing_ok=True)
    
    def test_default_settings(self):
        """Test that default settings are loaded."""
        self.assertEqual(self.settings_manager.get_theme(), "dark")
        self.assertEqual(self.settings_manager.get_download_mode(), "sequential")
    
    def test_set_and_get_theme(self):
        """Test setting and getting theme."""
        self.settings_manager.set_theme("light")
        self.assertEqual(self.settings_manager.get_theme(), "light")
    
    def test_invalid_theme_raises_error(self):
        """Test that invalid theme raises ValueError."""
        with self.assertRaises(ValueError):
            self.settings_manager.set_theme("invalid")
    
    def test_set_and_get_download_mode(self):
        """Test setting and getting download mode."""
        self.settings_manager.set_download_mode("multi-threaded")
        self.assertEqual(self.settings_manager.get_download_mode(), "multi-threaded")
    
    def test_invalid_download_mode_raises_error(self):
        """Test that invalid download mode raises ValueError."""
        with self.assertRaises(ValueError):
            self.settings_manager.set_download_mode("invalid")
    
    def test_set_and_get_download_directory(self):
        """Test setting and getting download directory."""
        test_path = "/test/downloads"
        self.settings_manager.set_download_directory(test_path)
        self.assertEqual(self.settings_manager.get_download_directory(), test_path)
    
    def test_settings_persistence(self):
        """Test that settings persist across instances."""
        self.settings_manager.set_theme("light")
        self.settings_manager.set_download_mode("multi-threaded")
        
        # Create new instance with same config file
        new_manager = SettingsManager(config_path=self.temp_file.name)
        self.assertEqual(new_manager.get_theme(), "light")
        self.assertEqual(new_manager.get_download_mode(), "multi-threaded")


if __name__ == "__main__":
    unittest.main()
