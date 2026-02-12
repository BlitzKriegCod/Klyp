"""
Recommendations Panel for Klyp Video Downloader.
Displays personalized video recommendations based on download history.
"""

import ttkbootstrap as ttk
from ttkbootstrap.constants import *
import logging
from typing import List, Dict, Any, Callable


class RecommendationsPanel(ttk.Frame):
    """Panel showing personalized video recommendations."""
    
    def __init__(self, parent, app, on_add_callback: Callable = None):
        """
        Initialize RecommendationsPanel.
        
        Args:
            parent: Parent widget.
            app: Main application instance.
            on_add_callback: Callback function when adding video to queue.
        """
        super().__init__(parent)
        self.app = app
        self.on_add_callback = on_add_callback
        self.recommendations = []
        self.logger = logging.getLogger("Klyp.RecommendationsPanel")
        self.setup_ui()
    
    def setup_ui(self):
        """Set up the recommendations panel UI."""
        # Header with refresh button
        header_frame = ttk.Frame(self)
        header_frame.pack(fill=X, pady=(0, 10))
        
        title_label = ttk.Label(
            header_frame,
            text="Recommended for You",
            font=("Segoe UI", 14, "bold")
        )
        title_label.pack(side=LEFT)
        
        self.refresh_button = ttk.Button(
            header_frame,
            text=" Refresh",
            command=self.refresh_recommendations,
            bootstyle="info-outline",
            width=12
        )
        self.refresh_button.pack(side=RIGHT)
        
        # Status/info label
        self.info_label = ttk.Label(
            self,
            text="Loading recommendations...",
            font=("Segoe UI", 10),
            foreground="#888888"
        )
        self.info_label.pack(pady=(0, 10))
        
        # Results container with scrollbar
        list_container = ttk.Frame(self)
        list_container.pack(fill=BOTH, expand=YES)
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(list_container, bootstyle="round")
        
        # Recommendations treeview
        self.recommendations_tree = ttk.Treeview(
            list_container,
            columns=("category", "title", "author", "duration", "platform"),
            show="tree headings",
            selectmode=BROWSE,
            yscrollcommand=scrollbar.set
        )
        self.recommendations_tree.pack(side=LEFT, fill=BOTH, expand=YES)
        scrollbar.pack(side=RIGHT, fill=Y)
        scrollbar.config(command=self.recommendations_tree.yview)
        
        # Configure columns
        self.recommendations_tree.column("#0", width=40, stretch=NO)
        self.recommendations_tree.column("category", width=60, stretch=NO)
        self.recommendations_tree.column("title", width=350, stretch=YES)
        self.recommendations_tree.column("author", width=150, stretch=NO)
        self.recommendations_tree.column("duration", width=80, stretch=NO)
        self.recommendations_tree.column("platform", width=100, stretch=NO)
        
        # Configure headings
        self.recommendations_tree.heading("#0", text="#")
        self.recommendations_tree.heading("category", text="Cat")
        self.recommendations_tree.heading("title", text="Title")
        self.recommendations_tree.heading("author", text="Author")
        self.recommendations_tree.heading("duration", text="Duration")
        self.recommendations_tree.heading("platform", text="Platform")
        
        # Bind double-click to add to queue
        self.recommendations_tree.bind("<Double-Button-1>", self._on_double_click)
    
    def load_recommendations(self, history_items: List[Dict[str, Any]]):
        """
        Load and display recommendations based on history.
        
        Args:
            history_items: List of download history items.
        """
        # Clear existing items
        for item in self.recommendations_tree.get_children():
            self.recommendations_tree.delete(item)
        
        if not history_items:
            self.info_label.config(
                text="No download history available. Download some videos to get personalized recommendations!",
                foreground="#f59e0b"
            )
            self.recommendations = []
            return
        
        self.info_label.config(
            text="Generating recommendations based on your download history...",
            foreground="#10b981"
        )
        self.refresh_button.config(state="disabled")
        
        # Load recommendations in background thread
        import threading
        threading.Thread(
            target=self._load_recommendations_thread,
            args=(history_items,),
            daemon=True
        ).start()
    
    def _load_recommendations_thread(self, history_items):
        """Load recommendations in background thread."""
        try:
            from controllers.search_manager import SearchManager
            search_manager = SearchManager()
            
            recommendations = search_manager.get_recommendations(
                history_items=history_items,
                limit=20,
                region="wt-wt"
            )
            
            # Update UI on main thread
            self.after(0, lambda r=recommendations: self._on_recommendations_loaded(r))
            
        except Exception as e:
            self.logger.error(f"Failed to load recommendations: {e}")
            self.after(0, lambda err=str(e): self._on_recommendations_error(err))
    
    def _on_recommendations_loaded(self, recommendations):
        """Handle recommendations loaded on main thread."""
        self.recommendations = recommendations
        self.refresh_button.config(state="normal")
        
        if not recommendations:
            self.info_label.config(
                text="No recommendations found. Try downloading more videos to improve recommendations.",
                foreground="#888888"
            )
            return
        
        self.info_label.config(
            text=f"Found {len(recommendations)} recommendations based on your preferences",
            foreground="#10b981"
        )
        
        # Display recommendations
        for idx, result in enumerate(recommendations, 1):
            title = result.get("title", "Unknown")
            author = result.get("author", "Unknown")
            duration = result.get("duration", "Unknown")
            platform = result.get("platform", "Unknown")
            
            # Get category information
            platform_icon = result.get("platform_icon", "🌐")
            
            # Insert into treeview without platform color tags
            self.recommendations_tree.insert(
                "",
                END,
                text=str(idx),
                values=(
                    platform_icon,
                    title,
                    author,
                    duration,
                    platform
                ),
                tags=(result.get("url", ""),)
            )
        
        # Auto-hide info label after 5 seconds
        self.after(5000, lambda: self.info_label.config(
            text="",
            foreground="#888888"
        ))
    
    def _on_recommendations_error(self, error_msg):
        """Handle recommendations error on main thread."""
        self.refresh_button.config(state="normal")
        self.info_label.config(
            text=f"Error loading recommendations: {error_msg}",
            foreground="#ef4444"
        )
        self.recommendations = []
    
    def refresh_recommendations(self):
        """Refresh recommendations."""
        # Get history from app
        if hasattr(self.app, 'history_screen') and hasattr(self.app.history_screen, 'history_items'):
            history_items = self.app.history_screen.history_items
            self.load_recommendations(history_items)
        else:
            self.info_label.config(
                text="No download history available",
                foreground="#888888"
            )
    
    def _on_double_click(self, event):
        """Handle double-click on recommendation item."""
        selection = self.recommendations_tree.selection()
        
        if not selection:
            return
        
        # Get selected item index
        item = selection[0]
        item_index = self.recommendations_tree.index(item)
        
        if item_index >= len(self.recommendations):
            return
        
        result = self.recommendations[item_index]
        
        # Call the add callback if provided
        if self.on_add_callback:
            self.on_add_callback(result)
    
    def get_selected_recommendation(self) -> Dict[str, Any]:
        """
        Get the currently selected recommendation.
        
        Returns:
            Dictionary with recommendation data, or None if no selection.
        """
        selection = self.recommendations_tree.selection()
        
        if not selection:
            return None
        
        item = selection[0]
        item_index = self.recommendations_tree.index(item)
        
        if item_index >= len(self.recommendations):
            return None
        
        return self.recommendations[item_index]
