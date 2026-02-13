#!/usr/bin/env python3
"""
Klyp - Universal Video Downloader
Main application entry point
"""

import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from pathlib import Path
import time
from controllers import (
    SettingsManager, QueueManager, ThemeManager, DownloadManager
)
from utils import (
    get_logger, set_debug_mode, info, error, exception
)
from utils.resume_dialog import ResumeDialog
from utils.event_bus import EventBus, EventType
from utils.thread_pool_manager import ThreadPoolManager
from PIL import Image, ImageTk
from views import HomeScreen, SearchScreen, QueueScreen, SettingsScreen, HistoryScreen, SubtitlesScreen


class KlypVideoDownloader(ttk.Window):
    """Main application window for Klyp video downloader."""
    
    def __init__(self):
        # Initialize logger
        self.logger = get_logger()
        info("Initializing Klyp - Universal Video Downloader")
        
        # Initialize EventBus
        self._event_bus = EventBus()
        info("EventBus initialized")
        
        # Initialize managers
        self.settings_manager = SettingsManager()
        self.queue_manager = QueueManager()
        self.last_refresh_time = 0
        self.refresh_throttle = 0.5 # Minimum 500ms between refreshes
        
        # Check for debug mode setting
        debug_mode = self.settings_manager.get("debug_mode", False)
        set_debug_mode(debug_mode)
        
        # Get theme from settings
        theme = self.settings_manager.get_theme()
        theme_name = "darkly" if theme == "dark" else "flatly"
        info(f"Using theme: {theme_name}")
        
        super().__init__(
            title="Klyp - Universal Video Downloader",
            themename=theme_name,
            size=(1000, 700),
            resizable=(True, True)
        )

        # Set window icon
        try:
            icon_path = Path(__file__).parent / "assets" / "klyp_logo.png"
            if icon_path.exists():
                icon_img = Image.open(icon_path)
                self.icon_photo = ImageTk.PhotoImage(icon_img)
                self.iconphoto(False, self.icon_photo)
                info("Application icon set successfully")
        except Exception as e:
            error(f"Failed to set application icon: {e}")
        
        # Bind window state change events to handle maximize/minimize
        self.bind("<Configure>", self._on_window_configure)
        self._last_geometry = None
        
        # Initialize theme manager after window creation
        self.theme_manager = ThemeManager(self, self.settings_manager)
        
        # Set up pending downloads file path
        config_dir = Path.home() / ".config" / "klyp"
        config_dir.mkdir(parents=True, exist_ok=True)
        self.pending_downloads_file = config_dir / "pending_downloads.json"
        
        # Initialize history manager
        info("Initializing history manager")
        from controllers.history_manager import HistoryManager
        self.history_manager = HistoryManager()
        
        # Initialize download manager
        info("Initializing download manager")
        self.download_manager = DownloadManager(self.queue_manager, self.history_manager)
        self.download_manager.set_pending_downloads_file(str(self.pending_downloads_file))
        
        # Configure download manager from settings
        download_mode = self.settings_manager.get_download_mode()
        self.download_manager.set_download_mode(download_mode)
        info(f"Download mode: {download_mode}")
        
        notifications_enabled = self.settings_manager.get("notifications_enabled", True)
        self.download_manager.set_notifications_enabled(notifications_enabled)
        
        # Center window on screen
        self.position_center()
        
        # Initialize application
        info("Loading assets")
        self.icons, self.icons_light = self._load_icons()
        
        info("Setting up UI")
        self.setup_ui()
        
        # Start EventBus after UI is created
        info("Starting EventBus")
        self._event_bus.start(self)
        
        # Subscribe to settings changes to update debug mode
        self._event_bus.subscribe(
            EventType.SETTINGS_CHANGED,
            self._on_settings_changed
        )
        
        # Clean up old logs
        self.logger.cleanup_old_logs(days=7)
        
        # Check for pending downloads after UI is ready
        self.after(500, self.check_pending_downloads)
        
        info("Application initialization complete")
    
    def _load_icons(self):
        """Load and resize icons for the UI in multiple colors."""
        from PIL import Image, ImageTk
        from pathlib import Path
        
        base_assets_dir = Path(__file__).parent / "assets"
        icon_dir = base_assets_dir / "icons"
        icons_emerald = {}
        icons_light = {}
        
        # 1. Load Brand Logo centrally
        self.logo_image = None
        logo_path = base_assets_dir / "klyp_logo.png"
        if logo_path.exists():
            try:
                img = Image.open(logo_path)
                # Keep a high-res version for the window icon thumbnail
                logo_thumb = img.copy()
                logo_thumb.thumbnail((48, 48), Image.Resampling.LANCZOS)
                self.logo_image = ImageTk.PhotoImage(logo_thumb)
            except Exception as e:
                print(f"Failed to load brand logo: {e}")

        # 2. Load UI Icons
        icon_names = [
            "home", "search", "queue", "subtitles", "settings", "history", 
            "play", "stop", "delete", "plus", "download",
            "youtube_logo", "okru_logo", "vimeo_logo", "web_logo"
        ]
        
        for color_name in ["emerald", "light"]:
            target_dict = icons_emerald if color_name == "emerald" else icons_light
            color_dir = icon_dir / color_name
            
            # Fallback for old structure if migration is slow
            if not color_dir.exists():
                color_dir = icon_dir
            
            for name in icon_names:
                path = color_dir / f"{name}.png"
                if path.exists():
                    try:
                        img = Image.open(path)
                        # Standard tab icon size is 20x20
                        img.thumbnail((20, 20), Image.Resampling.LANCZOS)
                        target_dict[name] = ImageTk.PhotoImage(img)
                    except Exception as e:
                        print(f"Failed to load {color_name} icon {name}: {e}")
                else:
                    target_dict[name] = None
                
        return icons_emerald, icons_light

    def setup_ui(self):
        """Set up the main user interface."""
        # Create main container
        main_container = ttk.Frame(self)
        main_container.pack(fill=BOTH, expand=YES, padx=0, pady=0)
        
        # Create notebook for tab-based navigation
        self.notebook = ttk.Notebook(main_container, bootstyle="success")
        self.notebook.pack(fill=BOTH, expand=YES)
        
        # Create screens
        self.home_screen = HomeScreen(self.notebook, self, self._event_bus)
        self.search_screen = SearchScreen(self.notebook, self, self._event_bus)
        self.queue_screen = QueueScreen(self.notebook, self, self._event_bus)
        self.subtitles_screen = SubtitlesScreen(self.notebook, self)
        self.settings_screen = SettingsScreen(self.notebook, self, self._event_bus)
        self.history_screen = HistoryScreen(self.notebook, self, self._event_bus)
        
        # Enable thread-safety debugging if configured
        debug_thread_safety = self.settings_manager.get("debug_thread_safety", False)
        if debug_thread_safety:
            info("Thread-safety debugging enabled")
            for screen in [self.home_screen, self.search_screen, self.queue_screen, 
                          self.settings_screen, self.history_screen]:
                if hasattr(screen, 'set_debug_thread_safety'):
                    screen.set_debug_thread_safety(True)
        
        # Add tabs to notebook
        # Start with all icons in light (white) and update on selection
        self.notebook.add(self.home_screen, text=" Home", image=self.icons_light.get("home"), compound=LEFT)
        self.notebook.add(self.search_screen, text=" Search", image=self.icons_light.get("search"), compound=LEFT)
        self.notebook.add(self.queue_screen, text=" Queue", image=self.icons_light.get("queue"), compound=LEFT)
        self.notebook.add(self.subtitles_screen, text=" Subtitles", image=self.icons_light.get("subtitles"), compound=LEFT)
        self.notebook.add(self.settings_screen, text=" Settings", image=self.icons_light.get("settings"), compound=LEFT)
        self.notebook.add(self.history_screen, text=" History", image=self.icons_light.get("history"), compound=LEFT)
        
        # Bind tab change event for dynamic icons
        self.notebook.bind("<<NotebookTabChanged>>", self._on_tab_changed)
        
        # Track current screen for cleanup
        self._current_screen = None
    
    def _on_tab_changed(self, event=None):
        """Update tab icons when selection changes: selected=emerald, others=light."""
        tab_id = self.notebook.index("current")
        icon_names = ["home", "search", "queue", "subtitles", "settings", "history"]
        
        # Get the new screen
        screen_map = [
            self.home_screen,
            self.search_screen,
            self.queue_screen,
            self.subtitles_screen,
            self.settings_screen,
            self.history_screen
        ]
        
        new_screen = screen_map[tab_id] if tab_id < len(screen_map) else None
        
        # Cleanup previous screen if it has a cleanup method
        # NOTE: We don't cleanup when switching tabs because screens need to keep
        # listening to events (e.g., QueueScreen needs to update when downloads complete)
        # Cleanup only happens on application shutdown
        # if self._current_screen is not None and self._current_screen != new_screen:
        #     if hasattr(self._current_screen, 'cleanup'):
        #         try:
        #             info(f"Cleaning up previous screen: {self._current_screen.__class__.__name__}")
        #             self._current_screen.cleanup()
        #         except Exception as e:
        #             error(f"Error cleaning up screen: {e}", exc_info=True)
        
        # Update current screen
        self._current_screen = new_screen
        
        # Update tab icons
        for i, name in enumerate(icon_names):
            if i == tab_id:
                # Active tab gets Emerald icon
                self.notebook.tab(i, image=self.icons.get(name))
            else:
                # Inactive tabs get Light (white) icon
                self.notebook.tab(i, image=self.icons_light.get(name))
    
    def _on_settings_changed(self, event):
        """Handle settings changes, particularly debug_thread_safety."""
        changed_keys = event.data.get("changed_keys", [])
        
        if "debug_thread_safety" in changed_keys:
            debug_enabled = event.data.get("settings", {}).get("debug_thread_safety", False)
            info(f"Thread-safety debugging {'enabled' if debug_enabled else 'disabled'}")
            
            # Update all screens
            for screen in [self.home_screen, self.search_screen, self.queue_screen, 
                          self.settings_screen, self.history_screen]:
                if hasattr(screen, 'set_debug_thread_safety'):
                    screen.set_debug_thread_safety(debug_enabled)
    
    def position_center(self):
        """Center the window on the screen."""
        self.update_idletasks()
        width = self.winfo_width()
        height = self.winfo_height()
        screen_width = self.winfo_screenwidth()
        screen_height = self.winfo_screenheight()
        x = (screen_width // 2) - (width // 2)
        y = (screen_height // 2) - (height // 2)
        self.geometry(f'{width}x{height}+{x}+{y}')
    
    def _on_window_configure(self, event):
        """Handle window configuration changes (resize, maximize, etc)."""
        try:
            # Only process events for the main window, not child widgets
            if event.widget != self:
                return
            
            # Get current geometry
            current_geometry = self.geometry()
            
            # Avoid processing duplicate events
            if current_geometry == self._last_geometry:
                return
            
            self._last_geometry = current_geometry
            
            # Log geometry changes in debug mode
            if self.settings_manager.get("debug_mode", False):
                info(f"Window geometry changed: {current_geometry}")
                
        except Exception as e:
            # Don't let configure errors crash the app
            error(f"Error in window configure handler: {e}", exc_info=True)
    
    def navigate_to(self, screen_name: str):
        """
        Navigate to a specific screen.
        
        Args:
            screen_name: Name of the screen (home, search, queue, settings, history)
        """
        screen_map = {
            "home": 0,
            "search": 1,
            "queue": 2,
            "subtitles": 3,
            "settings": 4,
            "history": 5
        }
        
        if screen_name.lower() in screen_map:
            self.notebook.select(screen_map[screen_name.lower()])
    
    def check_pending_downloads(self):
        """Check for pending downloads on startup and offer to resume."""
        info("Checking for pending downloads")
        
        # Check if auto-resume is enabled
        auto_resume_enabled = self.settings_manager.get("auto_resume", True)
        
        if not auto_resume_enabled:
            info("Auto-resume is disabled")
            return
        
        # Load pending downloads
        pending_tasks = self.queue_manager.load_pending_downloads(str(self.pending_downloads_file))
        
        if not pending_tasks:
            info("No pending downloads found")
            return
        
        info(f"Found {len(pending_tasks)} pending download(s)")
        
        # Show resume dialog
        action = ResumeDialog.show_resume_dialog(self, len(pending_tasks))
        
        if action == "resume":
            info("User chose to resume pending downloads")
            # Restore pending downloads to queue
            restored_count = self.queue_manager.restore_pending_downloads(pending_tasks)
            info(f"Restored {restored_count} pending download(s)")
            
            if restored_count > 0:
                # Navigate to queue screen
                self.navigate_to("queue")
                
                # Refresh queue screen if it has a refresh method
                if hasattr(self.queue_screen, 'refresh_queue'):
                    self.queue_screen.refresh_queue()
        
        elif action == "discard":
            info("User chose to discard pending downloads")
            # Remove the pending downloads file
            if self.pending_downloads_file.exists():
                self.pending_downloads_file.unlink()
                info("Pending downloads file removed")
    
    def save_pending_downloads(self):
        """Save pending downloads before closing."""
        self.queue_manager.save_pending_downloads(str(self.pending_downloads_file))
    
    def on_closing(self):
        """Handle application closing."""
        # Stop EventBus
        if hasattr(self, '_event_bus'):
            info("Stopping EventBus")
            self._event_bus.stop()
        
        # Stop all active downloads using DownloadService
        from controllers.download_service import DownloadService
        download_service = DownloadService()
        download_service.stop_all_downloads()
        
        # Shutdown SearchManager executor
        if hasattr(self, 'search_screen') and hasattr(self.search_screen, 'search_manager'):
            self.search_screen.search_manager.shutdown()
        
        # Shutdown ThreadPoolManager
        info("Shutting down ThreadPoolManager")
        thread_pool_manager = ThreadPoolManager()
        thread_pool_manager.shutdown(timeout=10)
        
        # Save pending downloads
        self.save_pending_downloads()
        
        # Destroy window
        self.destroy()
    
    def start_downloads(self):
        """Start processing the download queue."""
        try:
            info("Starting download processing")
            
            # Update download mode from settings
            download_mode = self.settings_manager.get_download_mode()
            self.download_manager.set_download_mode(download_mode)
            info(f"Download mode: {download_mode}")
            
            # Update notifications setting
            notifications_enabled = self.settings_manager.get("notifications_enabled", True)
            self.download_manager.set_notifications_enabled(notifications_enabled)
            
            # Start downloads using DownloadService
            from controllers.download_service import DownloadService
            download_service = DownloadService()
            download_service.start_all_downloads()
            info("Download processing started successfully")
            
        except Exception as e:
            error(f"Failed to start downloads: {str(e)}", exc_info=True)
            from tkinter import messagebox
            messagebox.showerror("Error", f"Failed to start downloads: {str(e)}")
    
    def stop_downloads(self):
        """Stop all active downloads."""
        try:
            info("Stopping all downloads")
            from controllers.download_service import DownloadService
            download_service = DownloadService()
            download_service.stop_all_downloads()
            info("Downloads stopped successfully")
        except Exception as e:
            error(f"Failed to stop downloads: {str(e)}", exc_info=True)
            from tkinter import messagebox
            messagebox.showerror("Error", f"Failed to stop downloads: {str(e)}")


def main():
    """Application entry point."""
    try:
        info("Starting Klyp - Universal Video Downloader")
        app = KlypVideoDownloader()
        
        # Set up close handler
        app.protocol("WM_DELETE_WINDOW", app.on_closing)
        
        info("Entering main loop")
        app.mainloop()
        info("Application closed")
        
    except Exception as e:
        exception(f"Fatal error in main: {str(e)}")
        raise


if __name__ == "__main__":
    main()
