"""
History Screen for Klyp Video Downloader.
Displays completed download history.
"""

import ttkbootstrap as ttk
from ttkbootstrap.constants import *
import tkinter as tk
from tkinter import messagebox
from datetime import datetime
from utils.safe_callback_mixin import SafeCallbackMixin
from utils.event_bus import EventBus, EventType, Event


class HistoryScreen(SafeCallbackMixin, ttk.Frame):
    """History screen with completed downloads list."""
    
    def __init__(self, parent, app, event_bus: EventBus = None):
        """
        Initialize HistoryScreen.
        
        Args:
            parent: Parent widget.
            app: Main application instance.
            event_bus: EventBus instance for event subscriptions (optional).
        """
        ttk.Frame.__init__(self, parent)
        SafeCallbackMixin.__init__(self)
        self.app = app
        self.event_bus = event_bus
        self._subscription_ids = []
        self.history_items = []
        
        # Subscribe to events if event_bus is provided
        if self.event_bus:
            self._subscribe_to_events()
        
        self.setup_ui()
        # Load history after UI is set up using safe_after
        self.safe_after(100, self.refresh_history)
    
    def _subscribe_to_events(self):
        """Subscribe to EventBus events."""
        # Subscribe to download complete events to update history automatically
        sub_id = self.event_bus.subscribe(
            EventType.DOWNLOAD_COMPLETE,
            self._on_download_complete
        )
        self._subscription_ids.append(sub_id)
    
    def _on_download_complete(self, event: Event):
        """
        Handle download complete event.
        
        Args:
            event: Event containing task_id and file_path
        """
        # Refresh history to show the newly completed download
        self.safe_after_idle(self.refresh_history)
    
    def setup_ui(self):
        """Set up the history screen UI."""
        # Main container
        container = ttk.Frame(self, padding=20)
        container.pack(fill=BOTH, expand=YES)
        
        # Header
        header_frame = ttk.Frame(container)
        header_frame.pack(fill=X, pady=(0, 15))
        
        title_label = ttk.Label(
            header_frame,
            text="Download History",
            font=("Segoe UI", 20, "bold")
        )
        title_label.pack(side=LEFT)
        
        # Controls
        controls_frame = ttk.Frame(header_frame)
        controls_frame.pack(side=RIGHT)
        
        ttk.Button(
            controls_frame,
            text=" Refresh",
            image=self.app.icons_light.get("history"),
            compound=LEFT,
            command=self.refresh_history,
            bootstyle="secondary",
            width=12
        ).pack(side=LEFT, padx=2)
        
        ttk.Button(
            controls_frame,
            text=" Clear History",
            image=self.app.icons_light.get("delete"),
            compound=LEFT,
            command=self.clear_history,
            bootstyle="danger",
            width=15
        ).pack(side=LEFT, padx=2)
        
        # Filter section
        filter_frame = ttk.Frame(container)
        filter_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Label(
            filter_frame,
            text="Filter:",
            font=("Segoe UI", 10)
        ).pack(side=LEFT, padx=(0, 10))
        
        self.filter_entry = ttk.Entry(
            filter_frame,
            font=("Segoe UI", 10),
        )
        self.filter_entry.pack(side=LEFT, fill=X, expand=YES, padx=(0, 10))
        self.filter_entry.bind("<KeyRelease>", lambda e: self.apply_filter())
        
        ttk.Button(
            filter_frame,
            text="Apply",
            command=self.apply_filter,
            bootstyle="secondary",
            width=10
        ).pack(side=LEFT)
        
        # History list section
        list_container = ttk.Frame(container)
        list_container.pack(fill=BOTH, expand=YES, pady=(0, 10))
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(list_container, bootstyle="round")
        
        # History treeview
        self.history_tree = ttk.Treeview(
            list_container,
            columns=("title", "date", "size", "path"),
            show="tree headings",
            selectmode=BROWSE,
            yscrollcommand=scrollbar.set
        )
        self.history_tree.pack(side=LEFT, fill=BOTH, expand=YES)
        scrollbar.pack(side=RIGHT, fill=Y)
        scrollbar.config(command=self.history_tree.yview)
        
        # Configure columns
        self.history_tree.column("#0", width=40, stretch=NO)
        self.history_tree.column("title", width=350, stretch=YES)
        self.history_tree.column("date", width=180, stretch=NO)
        self.history_tree.column("size", width=100, stretch=NO)
        self.history_tree.column("path", width=250, stretch=YES)
        
        # Configure headings
        self.history_tree.heading("#0", text="#")
        self.history_tree.heading("title", text="Video Title")
        self.history_tree.heading("date", text="Download Date")
        self.history_tree.heading("size", text="File Size")
        self.history_tree.heading("path", text="File Path")
        
        # Context Menu
        self.context_menu = tk.Menu(self, tearoff=0)
        self.context_menu.add_command(
            label=" Open Location",
            image=self.app.icons_light.get("download"),
            compound=LEFT,
            command=self.open_file_location
        )
        self.context_menu.add_separator()
        self.context_menu.add_command(
            label=" Remove from History",
            image=self.app.icons_light.get("delete"),
            compound=LEFT,
            command=self.remove_selected
        )
        
        # Bind right-click to show context menu
        self.history_tree.bind("<Button-3>", self.show_context_menu)
        
        # Stats
        info_frame = ttk.Labelframe(
            container,
            text="Statistics",
            padding=15,
            bootstyle="secondary"
        )
        info_frame.pack(fill=X)
        
        self.stats_label = ttk.Label(
            info_frame,
            text="Total downloads: 0 | Total size: 0 MB",
            font=("Segoe UI", 10)
        )
        self.stats_label.pack()
        
        # Footer Actions
        button_frame = ttk.Frame(container)
        button_frame.pack(fill=X, pady=(10, 0))
        
        ttk.Button(
            button_frame,
            text="Open File Location",
            command=self.open_file_location,
            style="success.TButton",
            width=18
        ).pack(side=LEFT, padx=(0, 10))
        
        ttk.Button(
            button_frame,
            text="Remove Selected",
            command=self.remove_selected,
            bootstyle="danger-outline",
            width=18
        ).pack(side=LEFT)
        
        # Initial refresh
        self.refresh_history()
    
    def refresh_history(self):
        """Refresh the history display."""
        # Load history from history manager
        if hasattr(self.app, 'history_manager'):
            self.history_items = self.app.history_manager.get_all_history()
        
        # Clear existing items
        for item in self.history_tree.get_children():
            self.history_tree.delete(item)
        
        # Placeholder: In actual implementation, this would load from a history manager
        # For now, show a message that history is empty
        if not self.history_items:
            # Add a placeholder item
            self.history_tree.insert(
                "",
                END,
                text="",
                values=("No download history yet", "", "", "")
            )
            self.stats_label.config(text="Total downloads: 0 | Total size: 0 MB")
        else:
            # Display history items
            total_size = 0
            for idx, item in enumerate(self.history_items, 1):
                title = item.get("title", "Unknown")
                date = item.get("date", "")
                
                # Format date
                if date:
                    try:
                        from datetime import datetime
                        dt = datetime.fromisoformat(date)
                        date = dt.strftime("%Y-%m-%d %H:%M")
                    except:
                        pass
                
                size = item.get("size", 0)
                path = item.get("path", "")
                
                size_mb = size / (1024 * 1024) if size > 0 else 0
                total_size += size
                
                self.history_tree.insert(
                    "",
                    END,
                    text=str(idx),
                    values=(
                        title,
                        date,
                        f"{size_mb:.2f} MB",
                        path
                    ),
                    tags=(item.get("id", ""),)
                )
            
            total_size_mb = total_size / (1024 * 1024)
            self.stats_label.config(
                text=f"Total downloads: {len(self.history_items)} | Total size: {total_size_mb:.2f} MB"
            )
    
    def apply_filter(self):
        """Apply filter to history list."""
        filter_text = self.filter_entry.get().strip().lower()
        
        # Clear existing items
        for item in self.history_tree.get_children():
            self.history_tree.delete(item)
        
        if not filter_text:
            # No filter, show all
            self.refresh_history()
            return
        
        # Filter history items
        filtered_items = [
            item for item in self.history_items
            if filter_text in item.get("title", "").lower()
        ]
        
        if not filtered_items:
            self.history_tree.insert(
                "",
                END,
                text="",
                values=("No matching results", "", "", "")
            )
        else:
            for idx, item in enumerate(filtered_items, 1):
                title = item.get("title", "Unknown")
                date = item.get("date", "")
                size = item.get("size", 0)
                path = item.get("path", "")
                
                size_mb = size / (1024 * 1024) if size > 0 else 0
                
                self.history_tree.insert(
                    "",
                    END,
                    text=str(idx),
                    values=(
                        title,
                        date,
                        f"{size_mb:.2f} MB",
                        path
                    ),
                    tags=(item.get("id", ""),)
                )
    
    def clear_history(self):
        """Clear all history."""
        if not self.history_items:
            messagebox.showinfo("Empty History", "History is already empty")
            return
        
        if messagebox.askyesno("Confirm", "Clear all download history?"):
            if hasattr(self.app, 'history_manager'):
                self.app.history_manager.clear_history()
            self.history_items = []
            self.refresh_history()
            messagebox.showinfo("Success", "History cleared")
    
    def remove_selected(self):
        """Remove selected item from history."""
        selection = self.history_tree.selection()
        
        if not selection:
            messagebox.showwarning("No Selection", "Please select an item to remove")
            return
        
        # Get selected item
        item = selection[0]
        tags = self.history_tree.item(item, "tags")
        
        if tags and tags[0]:
            item_id = tags[0]
            
            # Remove from history manager
            if hasattr(self.app, 'history_manager'):
                self.app.history_manager.remove_item(item_id)
            
            self.refresh_history()
            messagebox.showinfo("Success", "Item removed from history")
    
    def open_file_location(self):
        """Open file location in system file manager."""
        selection = self.history_tree.selection()
        
        if not selection:
            messagebox.showwarning("No Selection", "Please select an item")
            return
        
        # Get selected item
        item = selection[0]
        values = self.history_tree.item(item, "values")
        
        if values and len(values) > 3:
            file_path = values[3]
            
            if file_path:
                # Open file manager at the location
                import subprocess
                import platform
                from pathlib import Path
                
                try:
                    # Get directory from file path
                    file_dir = str(Path(file_path).parent)
                    
                    system = platform.system()
                    if system == "Windows":
                        subprocess.run(['explorer', file_dir])
                    elif system == "Darwin":  # macOS
                        subprocess.run(['open', file_dir])
                    else:  # Linux
                        subprocess.run(['xdg-open', file_dir])
                except Exception as e:
                    messagebox.showerror("Error", f"Failed to open file location:\n{str(e)}")
            else:
                messagebox.showwarning("No Path", "File path not available")
    
    def show_context_menu(self, event):
        """Show context menu on right-click."""
        # Select the item under cursor
        item = self.history_tree.identify_row(event.y)
        if item:
            self.history_tree.selection_set(item)
            self.context_menu.post(event.x_root, event.y_root)
    
    def cleanup(self):
        """
        Clean up resources when screen is being destroyed or switched away from.
        
        This method:
        - Unsubscribes from all EventBus events
        - Cancels all pending callbacks
        - Clears references to help with garbage collection
        """
        # Unsubscribe from all events
        if self.event_bus:
            for sub_id in self._subscription_ids:
                self.event_bus.unsubscribe(sub_id)
            self._subscription_ids.clear()
        
        # Cancel all pending callbacks
        self.cleanup_callbacks()
        
        # Clear references (helps with garbage collection)
        self.app = None
        self.event_bus = None
