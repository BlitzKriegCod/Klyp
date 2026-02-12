"""
Trending Tab UI Component for Klyp Video Downloader.
Displays trending content by category with filter buttons.
"""

import logging
import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from typing import Callable, Optional, List, Dict, Any
from threading import Thread


class TrendingTab(ttk.Frame):
    """Tab component for displaying trending content with category filters."""
    
    def __init__(self, parent, search_manager, on_add_to_queue: Optional[Callable] = None):
        """
        Initialize the TrendingTab.
        
        Args:
            parent: Parent widget.
            search_manager: SearchManager instance for fetching trending content.
            on_add_to_queue: Callback function to add videos to queue.
                           Should accept (url, title, platform) parameters.
        """
        super().__init__(parent)
        self.logger = logging.getLogger("Klyp.TrendingTab")
        self.search_manager = search_manager
        self.on_add_to_queue = on_add_to_queue
        
        self.current_category = "all"
        self.trending_results = []
        self.is_loading = False
        
        self.setup_ui()
    
    def setup_ui(self):
        """Set up the UI components."""
        # Main container
        main_container = ttk.Frame(self)
        main_container.pack(fill=BOTH, expand=YES, padx=10, pady=10)
        
        # Header section with title and refresh button
        header_frame = ttk.Frame(main_container)
        header_frame.pack(fill=X, pady=(0, 10))
        
        title_label = ttk.Label(
            header_frame,
            text="🔥 Trending Content",
            font=("Helvetica", 14, "bold")
        )
        title_label.pack(side=LEFT)
        
        self.refresh_button = ttk.Button(
            header_frame,
            text="🔄 Refresh",
            command=self.refresh_trending,
            bootstyle="info-outline"
        )
        self.refresh_button.pack(side=RIGHT)
        
        # Category filter buttons
        filter_frame = ttk.Labelframe(main_container, text="Category Filters", padding=10, bootstyle="secondary")
        filter_frame.pack(fill=X, pady=(0, 10))
        
        # Create category buttons
        categories = [
            ("All", "all", "🌐"),
            ("Video Streaming", "Video Streaming", "🎬"),
            ("Anime", "Anime", "🎌"),
            ("Music", "Music", "🎵"),
            ("Social Media", "Social Media", "📱"),
            ("Gaming", "Gaming", "🎮"),
            ("Podcasts", "Podcasts", "🎙️")
        ]
        
        self.category_buttons = {}
        
        for label, category, icon in categories:
            btn = ttk.Button(
                filter_frame,
                text=f"{icon} {label}",
                command=lambda c=category: self.select_category(c),
                bootstyle="primary-outline",
                width=15
            )
            btn.pack(side=LEFT, padx=5)
            self.category_buttons[category] = btn
        
        # Highlight the default category
        self.category_buttons["all"].configure(bootstyle="primary")
        
        # Loading indicator
        self.loading_frame = ttk.Frame(main_container)
        self.loading_frame.pack(fill=BOTH, expand=YES)
        
        self.loading_label = ttk.Label(
            self.loading_frame,
            text="⏳ Loading trending content...",
            font=("Helvetica", 12)
        )
        
        # Results container with scrollbar
        results_container = ttk.Frame(main_container)
        results_container.pack(fill=BOTH, expand=YES)
        
        # Create scrollbar
        scrollbar = ttk.Scrollbar(results_container, orient=VERTICAL)
        scrollbar.pack(side=RIGHT, fill=Y)
        
        # Create canvas for scrolling
        self.canvas = ttk.Canvas(results_container, yscrollcommand=scrollbar.set)
        self.canvas.pack(side=LEFT, fill=BOTH, expand=YES)
        scrollbar.config(command=self.canvas.yview)
        
        # Create frame inside canvas for results
        self.results_frame = ttk.Frame(self.canvas)
        self.canvas_window = self.canvas.create_window((0, 0), window=self.results_frame, anchor=NW)
        
        # Bind canvas resize
        self.results_frame.bind("<Configure>", self._on_frame_configure)
        self.canvas.bind("<Configure>", self._on_canvas_configure)
        
        # Enable mouse wheel scrolling
        self.canvas.bind_all("<MouseWheel>", self._on_mousewheel)
    
    def _on_frame_configure(self, event=None):
        """Update scroll region when frame size changes."""
        self.canvas.configure(scrollregion=self.canvas.bbox("all"))
    
    def _on_canvas_configure(self, event):
        """Update canvas window width when canvas is resized."""
        self.canvas.itemconfig(self.canvas_window, width=event.width)
    
    def _on_mousewheel(self, event):
        """Handle mouse wheel scrolling."""
        self.canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
    
    def select_category(self, category: str):
        """
        Select a category and load trending content.
        
        Args:
            category: Category name to filter by.
        """
        if self.is_loading:
            self.logger.info("Already loading, ignoring category change")
            return
        
        self.logger.info(f"Selected category: {category}")
        self.current_category = category
        
        # Update button styles
        for cat, btn in self.category_buttons.items():
            if cat == category:
                btn.configure(bootstyle="primary")
            else:
                btn.configure(bootstyle="primary-outline")
        
        # Load trending content for this category
        self.load_trending()
    
    def refresh_trending(self):
        """Refresh trending content for the current category."""
        self.logger.info("Refreshing trending content")
        self.load_trending()
    
    def load_trending(self):
        """Load trending content in a background thread."""
        if self.is_loading:
            self.logger.info("Already loading trending content")
            return
        
        self.is_loading = True
        self.show_loading()
        
        # Load in background thread to avoid blocking UI
        thread = Thread(target=self._fetch_trending, daemon=True)
        thread.start()
    
    def _fetch_trending(self):
        """Fetch trending content from SearchManager (runs in background thread)."""
        try:
            self.logger.info(f"Fetching trending content for category: {self.current_category}")
            
            # Fetch trending results
            results = self.search_manager.get_trending(
                category=self.current_category,
                region="wt-wt",
                limit=20
            )
            
            self.trending_results = results
            
            # Update UI in main thread
            self.after(0, self._display_results)
            
        except Exception as e:
            self.logger.error(f"Failed to fetch trending content: {e}")
            self.after(0, self._show_error, str(e))
        finally:
            self.is_loading = False
    
    def show_loading(self):
        """Show loading indicator."""
        # Clear results
        for widget in self.results_frame.winfo_children():
            widget.destroy()
        
        # Show loading message
        self.loading_label.pack(pady=50)
        self.refresh_button.configure(state=DISABLED)
    
    def hide_loading(self):
        """Hide loading indicator."""
        self.loading_label.pack_forget()
        self.refresh_button.configure(state=NORMAL)
    
    def _display_results(self):
        """Display trending results in the UI (runs in main thread)."""
        self.hide_loading()
        
        # Clear previous results
        for widget in self.results_frame.winfo_children():
            widget.destroy()
        
        if not self.trending_results:
            # Show empty state - recreate label since it was destroyed
            empty_label = ttk.Label(
                self.results_frame,
                text="No trending content available.\nClick 'Refresh' to load trending videos.",
                font=("Helvetica", 11),
                justify=CENTER
            )
            empty_label.pack(pady=50)
            return
        
        self.logger.info(f"Displaying {len(self.trending_results)} trending results")
        
        # Display each result
        for idx, result in enumerate(self.trending_results):
            self._create_result_card(result, idx)
    
    def _create_result_card(self, result: Dict[str, Any], index: int):
        """
        Create a result card widget.
        
        Args:
            result: Result dictionary with video metadata.
            index: Index of the result (for alternating colors).
        """
        # Card frame with alternating background
        card_style = "secondary" if index % 2 == 0 else "light"
        card = ttk.Frame(self.results_frame, bootstyle=card_style)
        card.pack(fill=X, padx=5, pady=3)
        
        # Content frame
        content_frame = ttk.Frame(card)
        content_frame.pack(fill=X, padx=10, pady=8)
        
        # Platform icon and title
        header_frame = ttk.Frame(content_frame)
        header_frame.pack(fill=X, pady=(0, 5))
        
        platform_icon = result.get("platform_icon", "🌐")
        platform_name = result.get("platform", "Unknown")
        title = result.get("title", "Unknown")
        
        # Platform label with icon
        platform_label = ttk.Label(
            header_frame,
            text=f"{platform_icon} {platform_name}",
            font=("Helvetica", 9, "bold"),
            foreground=result.get("platform_color", "#6b7280")
        )
        platform_label.pack(side=LEFT)
        
        # Duration
        duration = result.get("duration", "Unknown")
        duration_label = ttk.Label(
            header_frame,
            text=f"⏱️ {duration}",
            font=("Helvetica", 9)
        )
        duration_label.pack(side=RIGHT)
        
        # Title
        title_label = ttk.Label(
            content_frame,
            text=title,
            font=("Helvetica", 10),
            wraplength=600
        )
        title_label.pack(fill=X, pady=(0, 5))
        
        # Author
        author = result.get("author", "Unknown")
        author_label = ttk.Label(
            content_frame,
            text=f"👤 {author}",
            font=("Helvetica", 9),
            foreground="#6b7280"
        )
        author_label.pack(fill=X, pady=(0, 5))
        
        # Metadata row (if available)
        metadata_frame = ttk.Frame(content_frame)
        metadata_frame.pack(fill=X, pady=(0, 5))
        
        # View count
        view_count = result.get("view_count", 0)
        if view_count > 0:
            views_text = self._format_number(view_count)
            views_label = ttk.Label(
                metadata_frame,
                text=f"👁️ {views_text} views",
                font=("Helvetica", 9),
                foreground="#6b7280"
            )
            views_label.pack(side=LEFT, padx=(0, 10))
        
        # Like count
        like_count = result.get("like_count", 0)
        if like_count > 0:
            likes_text = self._format_number(like_count)
            likes_label = ttk.Label(
                metadata_frame,
                text=f"👍 {likes_text}",
                font=("Helvetica", 9),
                foreground="#6b7280"
            )
            likes_label.pack(side=LEFT, padx=(0, 10))
        
        # Upload date
        upload_date = result.get("upload_date", "")
        if upload_date and len(upload_date) == 8:
            # Format YYYYMMDD to YYYY-MM-DD
            formatted_date = f"{upload_date[:4]}-{upload_date[4:6]}-{upload_date[6:]}"
            date_label = ttk.Label(
                metadata_frame,
                text=f"📅 {formatted_date}",
                font=("Helvetica", 9),
                foreground="#6b7280"
            )
            date_label.pack(side=LEFT)
        
        # Action buttons
        button_frame = ttk.Frame(content_frame)
        button_frame.pack(fill=X)
        
        # Add to queue button
        add_button = ttk.Button(
            button_frame,
            text="➕ Add to Queue",
            command=lambda r=result: self._add_to_queue(r),
            bootstyle="success-outline",
            width=15
        )
        add_button.pack(side=RIGHT)
    
    def _add_to_queue(self, result: Dict[str, Any]):
        """
        Add a video to the download queue.
        
        Args:
            result: Result dictionary with video metadata.
        """
        if not self.on_add_to_queue:
            self.logger.warning("No add_to_queue callback configured")
            return
        
        url = result.get("url", "")
        title = result.get("title", "Unknown")
        platform = result.get("platform", "Unknown")
        
        if not url:
            self.logger.warning("Cannot add to queue: no URL")
            return
        
        self.logger.info(f"Adding to queue: {title}")
        
        try:
            self.on_add_to_queue(url, title, platform)
        except Exception as e:
            self.logger.error(f"Failed to add to queue: {e}")
    
    def _format_number(self, num: int) -> str:
        """
        Format large numbers with K/M/B suffixes.
        
        Args:
            num: Number to format.
            
        Returns:
            Formatted string (e.g., "1.2M", "500K").
        """
        if num >= 1_000_000_000:
            return f"{num / 1_000_000_000:.1f}B"
        elif num >= 1_000_000:
            return f"{num / 1_000_000:.1f}M"
        elif num >= 1_000:
            return f"{num / 1_000:.1f}K"
        else:
            return str(num)
    
    def _show_error(self, error_message: str):
        """
        Show error message in the UI.
        
        Args:
            error_message: Error message to display.
        """
        self.hide_loading()
        
        # Clear results
        for widget in self.results_frame.winfo_children():
            widget.destroy()
        
        # Show error message
        error_label = ttk.Label(
            self.results_frame,
            text=f"❌ Error loading trending content:\n{error_message}",
            font=("Helvetica", 11),
            foreground="red",
            justify=CENTER
        )
        error_label.pack(pady=50)
