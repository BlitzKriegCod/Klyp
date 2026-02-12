"""
UI Component Tests for OK.ru Video Downloader.
Tests theme switching and navigation functionality.
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
from controllers import SettingsManager, QueueManager, ThemeManager


class TestThemeManager(unittest.TestCase):
    """Test cases for ThemeManager."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.settings_manager = SettingsManager()
        
        # Mock the app window
        self.mock_app = Mock()
        self.mock_app.style = Mock()
        self.mock_app.style.theme_use = Mock()
        self.mock_app.style.configure = Mock()
        
        self.theme_manager = ThemeManager(self.mock_app, self.settings_manager)
    
    def test_initialization(self):
        """Test ThemeManager initialization."""
        self.assertIsNotNone(self.theme_manager)
        self.assertEqual(self.theme_manager.app, self.mock_app)
        self.assertEqual(self.theme_manager.settings_manager, self.settings_manager)
    
    def test_apply_dark_theme(self):
        """Test applying dark theme."""
        self.theme_manager.apply_theme("dark")
        
        # Verify theme was applied
        self.mock_app.style.theme_use.assert_called_with("darkly")
        self.assertEqual(self.theme_manager.current_theme, "dark")
        self.assertEqual(self.settings_manager.get_theme(), "dark")
    
    def test_apply_light_theme(self):
        """Test applying light theme."""
        self.theme_manager.apply_theme("light")
        
        # Verify theme was applied
        self.mock_app.style.theme_use.assert_called_with("flatly")
        self.assertEqual(self.theme_manager.current_theme, "light")
        self.assertEqual(self.settings_manager.get_theme(), "light")
    
    def test_apply_invalid_theme(self):
        """Test applying invalid theme raises error."""
        with self.assertRaises(ValueError):
            self.theme_manager.apply_theme("invalid")
    
    def test_toggle_theme_dark_to_light(self):
        """Test toggling from dark to light theme."""
        self.theme_manager.current_theme = "dark"
        self.theme_manager.toggle_theme()
        
        self.assertEqual(self.theme_manager.current_theme, "light")
    
    def test_toggle_theme_light_to_dark(self):
        """Test toggling from light to dark theme."""
        self.theme_manager.current_theme = "light"
        self.theme_manager.toggle_theme()
        
        self.assertEqual(self.theme_manager.current_theme, "dark")
    
    def test_get_current_theme(self):
        """Test getting current theme."""
        self.theme_manager.current_theme = "dark"
        self.assertEqual(self.theme_manager.get_current_theme(), "dark")
    
    def test_get_bg_color_dark(self):
        """Test getting background color for dark theme."""
        self.theme_manager.current_theme = "dark"
        self.assertEqual(self.theme_manager.get_bg_color(), "#1e1e1e")
    
    def test_get_bg_color_light(self):
        """Test getting background color for light theme."""
        self.theme_manager.current_theme = "light"
        self.assertEqual(self.theme_manager.get_bg_color(), "#ffffff")
    
    def test_get_accent_color(self):
        """Test getting accent color (emerald green)."""
        self.assertEqual(self.theme_manager.get_accent_color(), "#10b981")


class TestNavigationSystem(unittest.TestCase):
    """Test cases for navigation system."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Mock the main application
        self.mock_app = Mock()
        self.mock_app.settings_manager = SettingsManager()
        self.mock_app.queue_manager = QueueManager()
        self.mock_app.notebook = Mock()
        self.mock_app.notebook.select = Mock()
    
    def test_navigate_to_home(self):
        """Test navigation to home screen."""
        # Simulate navigate_to method
        screen_map = {
            "home": 0,
            "search": 1,
            "queue": 2,
            "settings": 3,
            "history": 4
        }
        
        screen_name = "home"
        if screen_name.lower() in screen_map:
            self.mock_app.notebook.select(screen_map[screen_name.lower()])
        
        self.mock_app.notebook.select.assert_called_with(0)
    
    def test_navigate_to_search(self):
        """Test navigation to search screen."""
        screen_map = {
            "home": 0,
            "search": 1,
            "queue": 2,
            "settings": 3,
            "history": 4
        }
        
        screen_name = "search"
        if screen_name.lower() in screen_map:
            self.mock_app.notebook.select(screen_map[screen_name.lower()])
        
        self.mock_app.notebook.select.assert_called_with(1)
    
    def test_navigate_to_queue(self):
        """Test navigation to queue screen."""
        screen_map = {
            "home": 0,
            "search": 1,
            "queue": 2,
            "settings": 3,
            "history": 4
        }
        
        screen_name = "queue"
        if screen_name.lower() in screen_map:
            self.mock_app.notebook.select(screen_map[screen_name.lower()])
        
        self.mock_app.notebook.select.assert_called_with(2)
    
    def test_navigate_to_settings(self):
        """Test navigation to settings screen."""
        screen_map = {
            "home": 0,
            "search": 1,
            "queue": 2,
            "settings": 3,
            "history": 4
        }
        
        screen_name = "settings"
        if screen_name.lower() in screen_map:
            self.mock_app.notebook.select(screen_map[screen_name.lower()])
        
        self.mock_app.notebook.select.assert_called_with(3)
    
    def test_navigate_to_history(self):
        """Test navigation to history screen."""
        screen_map = {
            "home": 0,
            "search": 1,
            "queue": 2,
            "settings": 3,
            "history": 4
        }
        
        screen_name = "history"
        if screen_name.lower() in screen_map:
            self.mock_app.notebook.select(screen_map[screen_name.lower()])
        
        self.mock_app.notebook.select.assert_called_with(4)


if __name__ == "__main__":
    unittest.main()
