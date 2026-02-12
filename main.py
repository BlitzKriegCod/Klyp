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
from PIL import Image, ImageTk
from views import HomeScreen, SearchScreen, QueueScreen, SettingsScreen, HistoryScreen, SubtitlesScreen


class KlypVideoDownloader(ttk.Window):
    """Main application window for Klyp video downloader."""
    
    def __init__(self):
        # Initialize logger
        self.logger = get_logger()
        info("Initializing Klyp - Universal Video Downloader")
        
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
        
        # Set up download status callback
        self.download_manager.set_status_callback(self.on_download_status_update)
        
        # Center window on screen
        self.position_center()
        
        # Initialize application
        info("Loading assets")
        self.icons, self.icons_light = self._load_icons()
        
        info("Setting up UI")
        self.setup_ui()
        
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
        self.home_screen = HomeScreen(self.notebook, self)
        self.search_screen = SearchScreen(self.notebook, self)
        self.queue_screen = QueueScreen(self.notebook, self)
        self.subtitles_screen = SubtitlesScreen(self.notebook, self)
        self.settings_screen = SettingsScreen(self.notebook, self)
        self.history_screen = HistoryScreen(self.notebook, self)
        
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
    
    def _on_tab_changed(self, event=None):
        """Update tab icons when selection changes: selected=emerald, others=light."""
        tab_id = self.notebook.index("current")
        icon_names = ["home", "search", "queue", "subtitles", "settings", "history"]
        
        for i, name in enumerate(icon_names):
            if i == tab_id:
                # Active tab gets Emerald icon
                self.notebook.tab(i, image=self.icons.get(name))
            else:
                # Inactive tabs get Light (white) icon
                self.notebook.tab(i, image=self.icons_light.get(name))
    
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
        # Stop all active downloads
        if hasattr(self, 'download_manager'):
            self.download_manager.stop_all_downloads()
        
        # Shutdown SearchManager executor
        if hasattr(self, 'search_screen') and hasattr(self.search_screen, 'search_manager'):
            self.search_screen.search_manager.shutdown()
        
        # Save pending downloads
        self.save_pending_downloads()
        
        # Destroy window
        self.destroy()
    
    def on_download_status_update(self, task_id: str, status, progress: float):
        """
        Callback for download status updates. Throttled to prevent UI freeze.
        
        Args:
            task_id: Task ID that was updated.
            status: New download status.
            progress: Progress percentage (0-100).
        """
        current_time = time.time()
        
        # Only refresh if status changed, or if enough time has passed since last refresh
        # This prevents the UI from freezing when many progress updates arrive quickly
        if current_time - self.last_refresh_time > self.refresh_throttle:
            self.last_refresh_time = current_time
            
            # Update queue screen if it's visible
            if hasattr(self, 'queue_screen'):
                # Schedule UI update on main thread
                self.after(0, self.queue_screen.refresh_queue)
            
            # Update home screen summary
            if hasattr(self, 'home_screen'):
                self.after(0, self.home_screen.update_summary)
    
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
            
            # Start downloads
            self.download_manager.start_downloads()
            info("Download processing started successfully")
            
        except Exception as e:
            error(f"Failed to start downloads: {str(e)}", exc_info=True)
            from tkinter import messagebox
            messagebox.showerror("Error", f"Failed to start downloads: {str(e)}")
    
    def stop_downloads(self):
        """Stop all active downloads."""
        try:
            info("Stopping all downloads")
            self.download_manager.stop_all_downloads()
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
