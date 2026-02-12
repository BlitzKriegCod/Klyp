"""
Home Screen for Klyp Video Downloader.
Provides URL input and quick navigation.
"""

import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from PIL import Image, ImageTk
import tkinter as tk
from tkinter import messagebox
import threading
from models import VideoInfo
from utils.quality_dialog import QualityDialog


class HomeScreen(ttk.Frame):
    """Home screen with URL input and search functionality."""
    
    def __init__(self, parent, app):
        """
        Initialize HomeScreen.
        
        Args:
            parent: Parent widget.
            app: Main application instance.
        """
        super().__init__(parent)
        self.app = app
        self.setup_ui()
    
    def setup_ui(self):
        """Set up the home screen UI."""
        # Main container with padding (reduced for VS Code density)
        container = ttk.Frame(self, padding=20)
        container.pack(fill=BOTH, expand=YES)
        
        # Title Section
        header_frame = ttk.Frame(container)
        header_frame.pack(fill=X, pady=(0, 20))
        
        # Logo and Title Row
        title_row = ttk.Frame(header_frame)
        title_row.pack(anchor=W)
        
        # Display centralized brand logo
        if hasattr(self.app, 'logo_image') and self.app.logo_image:
            logo_label = ttk.Label(title_row, image=self.app.logo_image)
            logo_label.pack(side=LEFT, padx=(0, 15))
        
        title_label = ttk.Label(
            title_row,
            text="Klyp",
            font=("Segoe UI", 24, "bold"), # Modern font
            foreground=self.app.theme_manager.EMERALD_GREEN
        )
        title_label.pack(side=LEFT)
        
        subtitle_label = ttk.Label(
            header_frame,
            text="Download videos with ease",
            font=("Segoe UI", 11),
            bootstyle="secondary"
        )
        subtitle_label.pack(anchor=W, pady=(5, 0))
        
        # URL Input Section (Card-like look)
        input_section = ttk.Labelframe(
            container,
            text="Add Video",
            padding=15,
            bootstyle="secondary"
        )
        input_section.pack(fill=X, pady=(0, 20))
        
        url_label = ttk.Label(
            input_section,
            text="Video URL",
            font=("Segoe UI", 10, "bold")
        )
        url_label.pack(anchor=W, pady=(0, 5))
        
        input_row = ttk.Frame(input_section)
        input_row.pack(fill=X)
        
        self.url_entry = ttk.Entry(
            input_row,
            font=("Consolas", 11), # Monospace for URLs
        )
        self.url_entry.pack(side=LEFT, fill=X, expand=YES, padx=(0, 10))
        self.url_entry.bind("<Return>", lambda e: self.add_to_queue())
        
        add_button = ttk.Button(
            input_row,
            text="Add to Queue",
            command=self.add_to_queue,
            style="success.TButton", # Use custom emerald style
            width=15
        )
        add_button.pack(side=LEFT)
        
        # Quick Actions Section
        actions_section = ttk.Labelframe(
            container,
            text="Quick Actions",
            padding=15,
            bootstyle="secondary"
        )
        actions_section.pack(fill=X, pady=(0, 20))
        
        # Grid layout for actions
        actions_grid = ttk.Frame(actions_section)
        actions_grid.pack(fill=X)
        
        actions = [
            (" Search Videos", "search", "search", 0, 0),
            (" View Queue", "queue", "queue", 0, 1),
            (" Subtitles", "subtitles", "subtitles", 1, 0),
            (" Settings", "settings", "settings", 2, 0),
            (" History", "history", "history", 2, 1)
        ]
        
        for text, icon_name, screen, row, col in actions:
            icon = self.app.icons_light.get(icon_name)
            btn = ttk.Button(
                actions_grid,
                text=text,
                image=icon,
                compound=LEFT,
                command=lambda s=screen: self.app.navigate_to(s),
                width=20
            )
            btn.grid(row=row, column=col, padx=5, pady=5, sticky=EW)
            
        actions_grid.columnconfigure(0, weight=1)
        actions_grid.columnconfigure(1, weight=1)
        
        # Queue Summary Section
        summary_section = ttk.Labelframe(
            container,
            text="Queue Summary",
            padding=15,
            bootstyle="secondary"
        )
        summary_section.pack(fill=X)
        
        self.summary_label = ttk.Label(
            summary_section,
            text="No videos in queue",
            font=("Segoe UI", 10)
        )
        self.summary_label.pack(anchor=W)
    
    def add_to_queue(self):
        """Add URL from input field to download queue with quality selection."""
        url = self.url_entry.get().strip()
        
        if not url:
            messagebox.showwarning("Empty URL", "Please enter a video URL")
            return
        
        if not url.startswith(("http://", "https://")):
            messagebox.showerror("Invalid URL", "URL must start with http:// or https://")
            return

        # Show loading status and fetch formats
        self.summary_label.config(text=f"Fetching video info...", foreground="#3498db")
        
        # Run metadata fetch in background thread
        threading.Thread(
            target=self._fetch_formats_and_add,
            args=(url,),
            daemon=True
        ).start()

    def _fetch_formats_and_add(self, url):
        """Identify available formats and show selection dialog."""
        try:
            downloader = self.app.download_manager.video_downloader
            result = downloader.extract_info(url)
            
            if result['type'] == 'playlist':
                self.after(0, lambda r=result: self._show_playlist_confirm(r))
            else:
                self.after(0, lambda v=result['video_info']: self._show_quality_dialog(v))
            
        except Exception as e:
            self.after(0, lambda msg=str(e): self._on_metadata_error(msg))

    def _show_playlist_confirm(self, playlist_info):
        """Confirm adding a playlist to the queue."""
        count = playlist_info['count']
        title = playlist_info['title']
        
        msg = f"Playlist detected: '{title}'\nContains {count} videos.\n\nAdd all to queue?"
        if messagebox.askyesno("Playlist Detected", msg):
            dialog = QualityDialog(self, f"Playlist: {title}", ["1080p", "720p", "480p", "360p", "Audio Only"])
            if dialog.result:
                self._add_playlist_to_queue(playlist_info, dialog.result)
            else:
                self.update_summary()
        else:
            self.update_summary()

    def _add_playlist_to_queue(self, playlist_info, selected_quality):
        """Add all entries from a playlist to the queue."""
        entries = playlist_info['entries']
        added_count = 0
        download_path = self.app.settings_manager.get_download_directory()
        subtitle_download = self.app.settings_manager.get("subtitle_download", False)
        
        for entry in entries:
            # Handle different URL formats from yt-dlp
            if entry.get('ie_key') == 'Youtube' and entry.get('id'):
                url = f"https://youtube.com/watch?v={entry['id']}"
            else:
                url = entry.get('url') or entry.get('webpage_url') or entry.get('id')
            
            if not url:
                continue
            
            video_info = VideoInfo(
                url=url,
                title=entry.get('title', 'Unknown'),
                selected_quality=selected_quality,
                download_subtitles=subtitle_download
            )
            
            try:
                self.app.queue_manager.add_task(video_info=video_info, download_path=download_path)
                added_count += 1
            except Exception:
                continue
        
        if added_count > 0:
            # Save pending downloads
            if hasattr(self.app, 'save_pending_downloads'):
                self.app.save_pending_downloads()
            
            if hasattr(self.app, 'queue_screen'):
                self.app.queue_screen.refresh_queue()
            
            # Show success feedback
            self.summary_label.config(
                text=f"✓ {added_count} videos added to queue from playlist",
                foreground="#10b981"  # Emerald green
            )
            self.url_entry.delete(0, 'end')
            messagebox.showinfo("Success", f"{added_count} videos added to queue!")
            self.app.navigate_to("queue")
        else:
            self.summary_label.config(
                text="Failed to add playlist videos",
                foreground="#ef4444"  # Red
            )
            
        self.after(5000, self.update_summary)

    def _show_quality_dialog(self, video_info):
        """Show the quality selection dialog."""
        dialog = QualityDialog(self, video_info.title, video_info.available_qualities)
        
        if dialog.result:
            video_info.selected_quality = dialog.result
            self._finalize_add_to_queue(video_info)
        else:
            self.update_summary()

    def _finalize_add_to_queue(self, video_info):
        """Complete the addition of task to queue."""
        try:
            download_path = self.app.settings_manager.get_download_directory()
            video_info.download_subtitles = self.app.settings_manager.get("subtitle_download", False)
            
            self.app.queue_manager.add_task(video_info=video_info, download_path=download_path)
            
            # Save pending downloads
            if hasattr(self.app, 'save_pending_downloads'):
                self.app.save_pending_downloads()
            
            if hasattr(self.app, 'queue_screen'):
                self.app.queue_screen.refresh_queue()
            
            self.summary_label.config(text=f"Added '{video_info.title}' ({video_info.selected_quality})!", foreground="#10b981")
            self.url_entry.delete(0, tk.END)
            self.after(3000, self.update_summary)
            
        except Exception as e:
            self.summary_label.config(text="Error adding to queue", foreground="#ef4444")
            messagebox.showerror("Error", str(e))

    def _on_metadata_error(self, error_msg):
        """Handle error during metadata fetch."""
        self.summary_label.config(text="Error fetching info", foreground="#ef4444")
        messagebox.showerror("Error", f"Could not retrieve video info: {error_msg}")
    
    def update_summary(self):
        """Update the queue summary display."""
        tasks = self.app.queue_manager.get_all_tasks()
        count = len(tasks)
        
        if count == 0:
            self.summary_label.config(text="No videos in queue")
        elif count == 1:
            self.summary_label.config(text="1 video in queue")
        else:
            self.summary_label.config(text=f"{count} videos in queue")
