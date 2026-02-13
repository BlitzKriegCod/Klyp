"""
Queue Screen for Klyp Video Downloader.
Displays download queue with progress tracking.
"""

# Standard library imports
import tkinter as tk
from tkinter import messagebox, filedialog

# Third-party imports
import ttkbootstrap as ttk
from ttkbootstrap.constants import *

# Local imports
from models import DownloadStatus
from utils.event_bus import EventBus, EventType
from utils.safe_callback_mixin import SafeCallbackMixin


class QueueScreen(SafeCallbackMixin, ttk.Frame):
    """Queue screen with download list and progress tracking."""
    
    def __init__(self, parent, app, event_bus: EventBus = None):
        """
        Initialize QueueScreen.
        
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
        self._pending_refresh_id = None  # For debouncing refresh_queue
        
        # Subscribe to events if event_bus is provided
        if self.event_bus:
            self._subscribe_to_events()
        
        self.setup_ui()
    
    def _get_queue_manager(self):
        """
        Get QueueManager instance safely.
        
        Returns QueueManager singleton, which is safe even if self.app is None.
        """
        from controllers.queue_manager import QueueManager
        return QueueManager()
    
    def _subscribe_to_events(self):
        """Subscribe to EventBus events."""
        # Subscribe to download progress events
        sub_id = self.event_bus.subscribe(
            EventType.DOWNLOAD_PROGRESS,
            self._on_download_progress
        )
        self._subscription_ids.append(sub_id)
        
        # Subscribe to download complete events
        sub_id = self.event_bus.subscribe(
            EventType.DOWNLOAD_COMPLETE,
            self._on_download_complete
        )
        self._subscription_ids.append(sub_id)
        
        # Subscribe to download failed events
        sub_id = self.event_bus.subscribe(
            EventType.DOWNLOAD_FAILED,
            self._on_download_failed
        )
        self._subscription_ids.append(sub_id)
        
        # Subscribe to queue updated events
        sub_id = self.event_bus.subscribe(
            EventType.QUEUE_UPDATED,
            self._on_queue_updated
        )
        self._subscription_ids.append(sub_id)
    
    def setup_ui(self):
        """Set up the queue screen UI."""
        # Main container with padding
        container = ttk.Frame(self, padding=20)
        container.pack(fill=BOTH, expand=YES)
        
        # Header section
        header_frame = ttk.Frame(container)
        header_frame.pack(fill=X, pady=(0, 15))
        
        title_label = ttk.Label(
            header_frame,
            text="Download Queue",
            font=("Segoe UI", 20, "bold")
        )
        title_label.pack(side=LEFT)
        
        # Queue controls
        controls_frame = ttk.Frame(header_frame)
        controls_frame.pack(side=RIGHT)
        
        # Controls using list for simplified creation
        controls = [
            (" Import", self.import_queue, "secondary", "plus", self.app.icons_light), # use light for solid secondary
            (" Export", self.export_queue, "secondary", "history", self.app.icons_light),
            (" Clear All", self.clear_queue, "danger", "delete", self.app.icons_light)
        ]
        
        for text, command, style, icon_name, icon_set in controls:
            btn = ttk.Button(
                controls_frame,
                text=text,
                image=icon_set.get(icon_name),
                compound=LEFT,
                command=command,
                bootstyle=style,
                width=12
            )
            btn.pack(side=LEFT, padx=2)
        
        # Queue list section
        list_container = ttk.Frame(container)
        list_container.pack(fill=BOTH, expand=YES, pady=(0, 10))
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(list_container, bootstyle="round")
        
        # Queue treeview
        self.queue_tree = ttk.Treeview(
            list_container,
            columns=("title", "author", "duration", "status", "progress"),
            show="tree headings",
            selectmode=BROWSE,
            yscrollcommand=scrollbar.set
        )
        self.queue_tree.pack(side=LEFT, fill=BOTH, expand=YES)
        scrollbar.pack(side=RIGHT, fill=Y)
        scrollbar.config(command=self.queue_tree.yview)
        
        # Configure columns
        self.queue_tree.column("#0", width=40, stretch=NO)
        self.queue_tree.column("title", width=400, stretch=YES)
        self.queue_tree.column("author", width=150, stretch=NO)
        self.queue_tree.column("duration", width=80, stretch=NO)
        self.queue_tree.column("status", width=100, stretch=NO)
        self.queue_tree.column("progress", width=80, stretch=NO)
        
        # Configure headings
        self.queue_tree.heading("#0", text="#")
        self.queue_tree.heading("title", text="Video Title / URL")
        self.queue_tree.heading("author", text="Author")
        self.queue_tree.heading("duration", text="Duration")
        self.queue_tree.heading("status", text="Status")
        self.queue_tree.heading("progress", text="Progress")
        
        # Progress bar frame (for selected item)
        progress_frame = ttk.Labelframe(
            container,
            text="Download Progress",
            padding=15,
            bootstyle="secondary"
        )
        progress_frame.pack(fill=X, pady=(0, 10))
        
        self.progress_bar = ttk.Progressbar(
            progress_frame,
            mode="determinate",
            bootstyle="success-striped",
            length=300
        )
        self.progress_bar.pack(fill=X)
        
        self.progress_label = ttk.Label(
            progress_frame,
            text="0%",
            font=("Segoe UI", 9)
        )
        self.progress_label.pack(pady=(5, 0))
        
        # Context Menu
        self.context_menu = tk.Menu(self, tearoff=0)
        self.context_menu.add_command(
            label=" Start Download", 
            image=self.app.icons_light.get("play"), 
            compound=LEFT, 
            command=self.start_selected
        )
        self.context_menu.add_command(
            label=" Stop Download", 
            image=self.app.icons_light.get("stop"), 
            compound=LEFT, 
            command=self.stop_selected
        )
        self.context_menu.add_separator()
        self.context_menu.add_command(
            label=" Open Location", 
            image=self.app.icons_light.get("download"), 
            compound=LEFT, 
            command=self.open_file_location
        )
        self.context_menu.add_command(
            label=" Remove Task", 
            image=self.app.icons_light.get("delete"), 
            compound=LEFT, 
            command=self.remove_selected
        )
        
        # Action buttons
        button_frame = ttk.Frame(container)
        button_frame.pack(fill=X)
        
        start_btn = ttk.Button(
            button_frame,
            text=" Start All",
            image=self.app.icons_light.get("play"),
            compound=LEFT,
            command=self.start_downloads,
            style="success.TButton",
            width=15
        )
        start_btn.pack(side=LEFT, padx=(0, 10))
        
        stop_btn = ttk.Button(
            button_frame,
            text=" Stop All",
            image=self.app.icons_light.get("stop"),
            compound=LEFT,
            command=self.stop_downloads,
            bootstyle="warning",
            width=15
        )
        stop_btn.pack(side=LEFT, padx=(0, 10))
        
        ttk.Separator(button_frame, orient=VERTICAL).pack(side=LEFT, fill=Y, padx=10)
        
        start_sel_btn = ttk.Button(
            button_frame,
            text=" Start",
            image=self.app.icons.get("play"),
            compound=LEFT,
            command=self.start_selected,
            bootstyle="success-outline",
            width=12
        )
        start_sel_btn.pack(side=LEFT, padx=(0, 10))
        
        stop_sel_btn = ttk.Button(
            button_frame,
            text=" Stop",
            image=self.app.icons.get("stop"),
            compound=LEFT,
            command=self.stop_selected,
            bootstyle="warning-outline",
            width=12
        )
        stop_sel_btn.pack(side=LEFT, padx=(0, 10))
        
        remove_btn = ttk.Button(
            button_frame,
            text=" Remove",
            image=self.app.icons_light.get("delete"),
            compound=LEFT,
            command=self.remove_selected,
            bootstyle="danger",
            width=12
        )
        remove_btn.pack(side=LEFT, padx=(0, 10))
        
        # Bind selection and right-click
        self.queue_tree.bind("<<TreeviewSelect>>", self.on_selection_change)
        self.queue_tree.bind("<Button-3>", self.show_context_menu)
        
        # Initial refresh
        self.refresh_queue()
    
    def _on_download_progress(self, event):
        """
        Handle download progress event.
        
        Args:
            event: Event with data containing task_id and progress
        """
        # Update progress bar for selected task
        self.safe_after_idle(self._update_progress_bar)
        
        # Update the specific task row in the tree view
        task_id = event.data.get("task_id")
        progress = event.data.get("progress", 0.0)
        
        if task_id:
            self.safe_after_idle(lambda: self._update_task_row(task_id, progress))
    
    def _on_download_complete(self, event):
        """
        Handle download complete event.
        
        Args:
            event: Event with data containing task_id and file_path
        """
        # Refresh queue to show completed status (with debouncing)
        self._schedule_refresh()
    
    def _on_download_failed(self, event):
        """
        Handle download failed event.
        
        Args:
            event: Event with data containing task_id and error
        """
        # Refresh queue to show failed status (with debouncing)
        self._schedule_refresh()
    
    def _on_queue_updated(self, event):
        """
        Handle queue updated event.
        
        Args:
            event: Event with data containing action and optional task_id
        """
        # Refresh queue to show updated state (with debouncing)
        self._schedule_refresh()
    
    def _schedule_refresh(self):
        """
        Schedule a refresh with debouncing.
        
        Cancels any pending refresh and schedules a new one after 500ms.
        This prevents excessive UI updates when multiple events arrive quickly.
        """
        # Cancel pending refresh if exists
        if self._pending_refresh_id:
            try:
                self.after_cancel(self._pending_refresh_id)
            except:
                pass
        
        # Schedule new refresh after 500ms
        self._pending_refresh_id = self.safe_after(500, self._do_refresh)
    
    def _do_refresh(self):
        """Execute the actual refresh and clear pending ID."""
        self._pending_refresh_id = None
        self.refresh_queue()
    
    def refresh_queue(self):
        """Refresh the queue display more efficiently by updating existing items."""
        # Get all tasks
        tasks = self.app.queue_manager.get_all_tasks()
        
        # Get existing items in tree
        existing_items = {self.queue_tree.item(item, "tags")[0]: item 
                         for item in self.queue_tree.get_children() 
                         if self.queue_tree.item(item, "tags")}
        
        # Track items to keep
        seen_ids = set()
        
        # Update or insert tasks
        for idx, task in enumerate(tasks, 1):
            seen_ids.add(task.id)
            title = task.video_info.title or task.video_info.url
            author = task.video_info.author or "Unknown"
            
            # Format duration
            duration_sec = task.video_info.duration
            if duration_sec > 0:
                m, s = divmod(int(duration_sec), 60)
                if m >= 60:
                    h, m = divmod(int(m), 60)
                    duration = f"{int(h)}:{int(m):02d}:{int(s):02d}"
                else:
                    duration = f"{int(m)}:{int(s):02d}"
            else:
                duration = "--:--"
            
            status_text = task.status.value.capitalize()
            progress = f"{task.progress:.1f}%"
            
            values = (title, author, duration, status_text, progress)
            
            # Map status to icon for tree column
            status_icons = {
                DownloadStatus.QUEUED: self.app.icons.get("queue"),
                DownloadStatus.DOWNLOADING: self.app.icons.get("download"),
                DownloadStatus.COMPLETED: self.app.icons.get("history"),
                DownloadStatus.FAILED: self.app.icons.get("delete"),
                DownloadStatus.STOPPED: self.app.icons.get("stop")
            }
            icon = status_icons.get(task.status)
            
            if task.id in existing_items:
                item_id = existing_items[task.id]
                current_values = self.queue_tree.item(item_id, "values")
                if tuple(map(str, current_values)) != tuple(map(str, values)) or \
                   self.queue_tree.item(item_id, "text") != str(idx):
                    self.queue_tree.item(item_id, values=values, text=str(idx), image=icon)
            else:
                self.queue_tree.insert(
                    "",
                    tk.END,
                    text=str(idx),
                    values=values,
                    image=icon,
                    tags=(task.id,)
                )
                
        # Remove items no longer in queue
        for task_id, item_id in existing_items.items():
            if task_id not in seen_ids:
                self.queue_tree.delete(item_id)
        
        # Update progress bar for selected item
        self._update_progress_bar()
    
    def _get_status_icon(self, status: DownloadStatus) -> str:
        """Get icon for download status."""
        icons = {
            DownloadStatus.QUEUED: "⏳",
            DownloadStatus.DOWNLOADING: "⬇️",
            DownloadStatus.COMPLETED: "✅",
            DownloadStatus.FAILED: "❌",
            DownloadStatus.STOPPED: "⏸️"
        }
        return icons.get(status, "❓")
    
    def on_selection_change(self, event):
        """Handle queue item selection change."""
        self._update_progress_bar()
    
    def _update_progress_bar(self):
        """Update progress bar to show overall download progress."""
        try:
            from controllers.queue_manager import QueueManager
            from models import DownloadStatus
            
            queue_manager = QueueManager()
            
            # Get all downloading tasks
            downloading_tasks = [
                task for task in queue_manager.get_all_tasks()
                if task.status == DownloadStatus.DOWNLOADING
            ]
            
            if not downloading_tasks:
                # No active downloads, show 0%
                self.progress_bar["value"] = 0
                self.progress_label.config(text="0% (No active downloads)")
                return
            
            # Calculate average progress
            total_progress = sum(task.progress for task in downloading_tasks)
            avg_progress = total_progress / len(downloading_tasks)
            
            # Update progress bar
            self.progress_bar["value"] = avg_progress
            self.progress_label.config(
                text=f"{avg_progress:.1f}% ({len(downloading_tasks)} active)"
            )
            
        except Exception as e:
            # Silently ignore errors (widget might be destroyed)
            self.progress_bar["value"] = 0
            self.progress_label.config(text="0%")
    
    def _update_task_row(self, task_id: str, progress: float):
        """
        Update a specific task row in the tree view with new progress.
        
        Args:
            task_id: ID of the task to update
            progress: Progress percentage (0-100)
        """
        try:
            # Find the item with this task_id
            for item in self.queue_tree.get_children():
                tags = self.queue_tree.item(item, "tags")
                if tags and tags[0] == task_id:
                    # Update only the progress column (index 4: title, author, duration, status, progress)
                    current_values = self.queue_tree.item(item, "values")
                    if current_values and len(current_values) >= 5:
                        # Keep other columns the same, only update progress
                        new_values = list(current_values)
                        new_values[4] = f"{progress:.1f}%"
                        self.queue_tree.item(item, values=new_values)
                    break
        except Exception as e:
            # Silently ignore errors (widget might be destroyed)
            pass
    
    def remove_selected(self):
        """Remove selected task from queue."""
        selection = self.queue_tree.selection()
        
        if not selection:
            messagebox.showwarning("No Selection", "Please select a task to remove")
            return
        
        # Get selected task
        item = selection[0]
        tags = self.queue_tree.item(item, "tags")
        
        if tags and tags[0]:
            task_id = tags[0]
            
            # Confirm removal
            if messagebox.askyesno("Confirm", "Remove this task from queue?"):
                self.app.queue_manager.remove_task(task_id)
                self.refresh_queue()
                messagebox.showinfo("Success", "Task removed from queue")
    
    def clear_queue(self):
        """Clear all tasks from queue."""
        if not self.app.queue_manager.get_all_tasks():
            messagebox.showinfo("Empty Queue", "Queue is already empty")
            return
        
        if messagebox.askyesno("Confirm", "Clear all tasks from queue?"):
            self.app.queue_manager.clear_queue()
            self.refresh_queue()
            messagebox.showinfo("Success", "Queue cleared")
    
    def load_urls_from_file(self):
        """Load URLs from a text file."""
        try:
            file_path = filedialog.askopenfilename(
                title="Select URL File",
                filetypes=[("Text Files", "*.txt"), ("All Files", "*.*")]
            )
            
            if file_path:
                count = self.app.queue_manager.load_urls_from_file(file_path)
                self.refresh_queue()
                messagebox.showinfo("Success", f"Added {count} URL(s) to queue")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load URLs from file: {str(e)}")
    
    def export_queue(self):
        """Export queue to a JSON file."""
        try:
            file_path = filedialog.asksaveasfilename(
                title="Export Queue",
                defaultextension=".json",
                filetypes=[("JSON Files", "*.json"), ("All Files", "*.*")]
            )
            
            if file_path:
                if self.app.queue_manager.export_queue(file_path):
                    messagebox.showinfo("Success", "Queue exported successfully")
                else:
                    messagebox.showerror("Error", "Failed to export queue")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to export queue: {str(e)}")
    
    def import_queue(self):
        """Import queue from a JSON file."""
        try:
            file_path = filedialog.askopenfilename(
                title="Import Queue",
                filetypes=[("JSON Files", "*.json"), ("All Files", "*.*")]
            )
            
            if file_path:
                count = self.app.queue_manager.import_queue(file_path)
                self.refresh_queue()
                messagebox.showinfo("Success", f"Imported {count} task(s)")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to import queue: {str(e)}")
    
    def start_downloads(self):
        """Start processing the download queue."""
        try:
            tasks = self.app.queue_manager.get_all_tasks()
            if not tasks:
                messagebox.showinfo("Empty Queue", "No videos in queue to download")
                return
            
            # Check if downloads are already running
            if self.app.download_manager.is_running:
                messagebox.showinfo("Already Running", "Downloads are already in progress")
                return
            
            # Start downloads using DownloadService
            from controllers.download_service import DownloadService
            download_service = DownloadService()
            started_count = download_service.start_all_downloads()
            
            if started_count > 0:
                messagebox.showinfo("Started", f"Started {started_count} download(s)")
            else:
                messagebox.showinfo("No Downloads", "No queued downloads to start")
            
            # Start auto-refresh
            self.auto_refresh()
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to start downloads: {str(e)}")
    
    def stop_downloads(self):
        """Stop all active downloads."""
        try:
            if not self.app.download_manager.is_running:
                messagebox.showinfo("Not Running", "No downloads are currently running")
                return
            
            if messagebox.askyesno("Confirm", "Stop all active downloads?"):
                self.app.stop_downloads()
                self.refresh_queue()
                messagebox.showinfo("Stopped", "Downloads stopped")
                
        except Exception as e:
            messagebox.showerror("Error", f"Failed to stop downloads: {str(e)}")
    
    def auto_refresh(self):
        """
        Trigger an initial refresh when downloads start.
        
        Note: This method no longer uses recursive polling. UI updates are now
        handled through EventBus events (DOWNLOAD_PROGRESS, DOWNLOAD_COMPLETE, etc.)
        which provide real-time updates without polling overhead.
        """
        # Do an initial refresh to show current state
        self.refresh_queue()

    def show_context_menu(self, event):
        """Show context menu on right-click."""
        item = self.queue_tree.identify_row(event.y)
        if item:
            self.queue_tree.selection_set(item)
            self.context_menu.post(event.x_root, event.y_root)

    def start_selected(self):
        """Start the selected download task."""
        selection = self.queue_tree.selection()
        if not selection:
            messagebox.showwarning("No Selection", "Please select a task to start")
            return
            
        item = selection[0]
        tags = self.queue_tree.item(item, "tags")
        if tags and tags[0]:
            task_id = tags[0]
            from controllers.download_service import DownloadService
            download_service = DownloadService()
            if download_service.start_download(task_id):
                self.refresh_queue()
                self.auto_refresh()
            else:
                messagebox.showerror("Error", "Failed to start task")

    def stop_selected(self):
        """Stop the selected download task."""
        selection = self.queue_tree.selection()
        if not selection:
            messagebox.showwarning("No Selection", "Please select a task to stop")
            return
            
        item = selection[0]
        tags = self.queue_tree.item(item, "tags")
        if tags and tags[0]:
            task_id = tags[0]
            from controllers.download_service import DownloadService
            download_service = DownloadService()
            if download_service.stop_download(task_id):
                self.refresh_queue()
            else:
                messagebox.showerror("Error", "Failed to stop task")
    
    def cleanup(self):
        """
        Cleanup method to be called when screen is being destroyed or switched away.
        
        This method:
        - Unsubscribes from all EventBus events
        - Cancels all pending callbacks via SafeCallbackMixin
        - Clears references to managers
        """
        # Unsubscribe from all events
        if self.event_bus:
            for sub_id in self._subscription_ids:
                self.event_bus.unsubscribe(sub_id)
            self._subscription_ids.clear()
        
        # Cancel pending refresh
        if self._pending_refresh_id:
            try:
                self.after_cancel(self._pending_refresh_id)
            except:
                pass
            self._pending_refresh_id = None
        
        # Cleanup callbacks from SafeCallbackMixin
        self.cleanup_callbacks()
        
        # Clear references (helps with garbage collection)
        self.app = None
        self.event_bus = None

    def open_file_location(self):
        """Open the file location of the selected completed download."""
        import subprocess
        import platform
        from pathlib import Path
        
        selection = self.queue_tree.selection()
        if not selection:
            messagebox.showwarning("No Selection", "Please select a task")
            return
            
        item = selection[0]
        tags = self.queue_tree.item(item, "tags")
        if not tags or not tags[0]:
            return
        
        # Check if app is still available (screen not destroyed)
        if not self.app:
            return
            
        task_id = tags[0]
        # Use QueueManager singleton directly
        from controllers.queue_manager import QueueManager
        queue_manager = QueueManager()
        task = queue_manager.get_task(task_id)
        
        if not task:
            messagebox.showwarning("Task Not Found", "Selected task not found")
            return
        
        # Check if task is completed
        if task.status != DownloadStatus.COMPLETED:
            messagebox.showinfo("Not Completed", "This download is not yet completed")
            return
        
        # Get download directory
        download_dir = task.download_path or self.app.settings_manager.get_download_directory()
        download_path = Path(download_dir)
        
        # Check if directory exists
        if not download_path.exists():
            messagebox.showerror("Directory Not Found", f"Download directory not found:\n{download_dir}")
            return
        
        # Open file manager at the location
        try:
            system = platform.system()
            if system == "Windows":
                subprocess.run(['explorer', str(download_path)])
            elif system == "Darwin":  # macOS
                subprocess.run(['open', str(download_path)])
            else:  # Linux and others
                subprocess.run(['xdg-open', str(download_path)])
        except Exception as e:
            messagebox.showerror("Error", f"Failed to open file location:\n{str(e)}")
