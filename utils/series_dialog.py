"""
Series Detection Dialog for Klyp Video Downloader.
Allows users to confirm and select episodes from detected series.
"""

import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from tkinter import messagebox
from typing import List, Dict, Any, Optional


class SeriesDetectionDialog(ttk.Toplevel):
    """Dialog for handling detected series/playlists."""
    
    def __init__(self, parent, episodes: List[Dict[str, Any]], series_name: str = "Series"):
        """
        Initialize SeriesDetectionDialog.
        
        Args:
            parent: Parent widget.
            episodes: List of episode dictionaries with metadata.
            series_name: Name of the detected series.
        """
        super().__init__(parent)
        
        self.episodes = episodes
        self.series_name = series_name
        self.result = None  # Will store selected episodes
        self.episode_vars = []  # Checkbutton variables
        
        # Configure dialog
        self.title("Series Detected")
        self.geometry("700x500")
        self.resizable(True, True)
        
        # Make dialog modal
        self.transient(parent)
        self.grab_set()
        
        self.setup_ui()
        
        # Center dialog on parent
        self.update_idletasks()
        x = parent.winfo_x() + (parent.winfo_width() // 2) - (self.winfo_width() // 2)
        y = parent.winfo_y() + (parent.winfo_height() // 2) - (self.winfo_height() // 2)
        self.geometry(f"+{x}+{y}")
    
    def setup_ui(self):
        """Set up the dialog UI."""
        # Main container
        container = ttk.Frame(self, padding=20)
        container.pack(fill=BOTH, expand=YES)
        
        # Header
        header_frame = ttk.Frame(container)
        header_frame.pack(fill=X, pady=(0, 15))
        
        icon_label = ttk.Label(
            header_frame,
            text="📺",
            font=("Segoe UI", 32)
        )
        icon_label.pack(side=LEFT, padx=(0, 15))
        
        text_frame = ttk.Frame(header_frame)
        text_frame.pack(side=LEFT, fill=X, expand=YES)
        
        title_label = ttk.Label(
            text_frame,
            text="Series Detected!",
            font=("Segoe UI", 16, "bold")
        )
        title_label.pack(anchor=W)
        
        # Group episodes by episode number to get unique episodes
        unique_episodes = {}
        for ep in self.episodes:
            ep_num = ep.get('episode_number', 0)
            if ep_num not in unique_episodes:
                unique_episodes[ep_num] = ep
        
        episode_count = len(unique_episodes)
        
        subtitle_label = ttk.Label(
            text_frame,
            text=f"Found {episode_count} episode(s) for '{self.series_name}'",
            font=("Segoe UI", 10),
            foreground="#888888"
        )
        subtitle_label.pack(anchor=W)
        
        # Info message
        info_frame = ttk.Frame(container)
        info_frame.pack(fill=X, pady=(0, 15))
        
        info_label = ttk.Label(
            info_frame,
            text="Select which episodes you want to add to the download queue:",
            font=("Segoe UI", 10)
        )
        info_label.pack(anchor=W)
        
        # Episodes list with scrollbar
        list_frame = ttk.Labelframe(
            container,
            text="Episodes",
            padding=10,
            bootstyle="primary"
        )
        list_frame.pack(fill=BOTH, expand=YES, pady=(0, 15))
        
        # Create scrollable frame
        canvas = ttk.Canvas(list_frame, height=250)
        scrollbar = ttk.Scrollbar(list_frame, orient=VERTICAL, command=canvas.yview, bootstyle="round")
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor=NW)
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side=LEFT, fill=BOTH, expand=YES)
        scrollbar.pack(side=RIGHT, fill=Y)
        
        # Add episode checkboxes (one per unique episode)
        sorted_episodes = sorted(unique_episodes.items(), key=lambda x: x[0])
        
        for ep_num, episode in sorted_episodes:
            var = ttk.BooleanVar(value=True)  # Selected by default
            self.episode_vars.append((var, episode))
            
            ep_frame = ttk.Frame(scrollable_frame)
            ep_frame.pack(fill=X, pady=2)
            
            check = ttk.Checkbutton(
                ep_frame,
                text=f"Episode {ep_num}: {episode.get('title', 'Unknown')}",
                variable=var,
                bootstyle="primary-round-toggle"
            )
            check.pack(side=LEFT, fill=X, expand=YES)
            
            # Show platform info
            platform = episode.get('platform', 'Unknown')
            platform_icon = episode.get('platform_icon', '🌐')
            duration = episode.get('duration', 'Unknown')
            
            info_text = f"{platform_icon} {platform} | {duration}"
            info_label = ttk.Label(
                ep_frame,
                text=info_text,
                font=("Segoe UI", 8),
                foreground="#888888"
            )
            info_label.pack(side=RIGHT, padx=(10, 0))
        
        # Selection controls
        select_frame = ttk.Frame(container)
        select_frame.pack(fill=X, pady=(0, 15))
        
        select_all_btn = ttk.Button(
            select_frame,
            text="Select All",
            command=self.select_all,
            bootstyle="secondary-outline",
            width=12
        )
        select_all_btn.pack(side=LEFT, padx=(0, 5))
        
        deselect_all_btn = ttk.Button(
            select_frame,
            text="Deselect All",
            command=self.deselect_all,
            bootstyle="secondary-outline",
            width=12
        )
        deselect_all_btn.pack(side=LEFT)
        
        # Action buttons
        button_frame = ttk.Frame(container)
        button_frame.pack(fill=X)
        
        download_all_btn = ttk.Button(
            button_frame,
            text="Download Selected",
            command=self.download_selected,
            bootstyle="success",
            width=20
        )
        download_all_btn.pack(side=LEFT, padx=(0, 10))
        
        cancel_btn = ttk.Button(
            button_frame,
            text="Cancel",
            command=self.cancel,
            bootstyle="secondary",
            width=15
        )
        cancel_btn.pack(side=LEFT)
    
    def select_all(self):
        """Select all episodes."""
        for var, _ in self.episode_vars:
            var.set(True)
    
    def deselect_all(self):
        """Deselect all episodes."""
        for var, _ in self.episode_vars:
            var.set(False)
    
    def download_selected(self):
        """Confirm and return selected episodes."""
        selected_episodes = []
        
        for var, episode in self.episode_vars:
            if var.get():
                selected_episodes.append(episode)
        
        if not selected_episodes:
            messagebox.showwarning(
                "No Selection",
                "Please select at least one episode to download.",
                parent=self
            )
            return
        
        self.result = selected_episodes
        self.destroy()
    
    def cancel(self):
        """Cancel and close dialog."""
        self.result = None
        self.destroy()
    
    def get_selected_episodes(self) -> Optional[List[Dict[str, Any]]]:
        """
        Get the list of selected episodes.
        
        Returns:
            List of selected episode dictionaries, or None if cancelled.
        """
        return self.result
