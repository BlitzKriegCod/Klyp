"""
Batch Compare Dialog for Klyp Video Downloader.
Displays side-by-side comparison of search results across multiple platforms.
"""

import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from tkinter import messagebox
import logging


class BatchCompareDialog(ttk.Toplevel):
    """Dialog for comparing search results across multiple platforms."""
    
    def __init__(self, parent, query, platform_results, on_add_callback=None):
        """
        Initialize BatchCompareDialog.
        
        Args:
            parent: Parent widget.
            query: Search query string.
            platform_results: Dictionary mapping platform name to list of results.
            on_add_callback: Callback function to add video to queue.
        """
        super().__init__(parent)
        
        self.query = query
        self.platform_results = platform_results
        self.on_add_callback = on_add_callback
        self.logger = logging.getLogger("Klyp.BatchCompareDialog")
        
        # Dialog configuration
        self.title(f"Platform Comparison: {query}")
        self.geometry("1200x700")
        self.resizable(True, True)
        
        # Make dialog modal
        self.transient(parent)
        self.grab_set()
        
        self.setup_ui()
        self.display_results()
    
    def setup_ui(self):
        """Set up the dialog UI."""
        # Main container
        container = ttk.Frame(self, padding=20)
        container.pack(fill=BOTH, expand=YES)
        
        # Header
        header_frame = ttk.Frame(container)
        header_frame.pack(fill=X, pady=(0, 20))
        
        title_label = ttk.Label(
            header_frame,
            text=f"Comparing: {self.query}",
            font=("Segoe UI", 16, "bold")
        )
        title_label.pack(anchor=W)
        
        subtitle_label = ttk.Label(
            header_frame,
            text=f"Results from {len(self.platform_results)} platforms",
            font=("Segoe UI", 10),
            foreground="#888888"
        )
        subtitle_label.pack(anchor=W)
        
        # Scrollable content area
        canvas_frame = ttk.Frame(container)
        canvas_frame.pack(fill=BOTH, expand=YES)
        
        # Create canvas with scrollbar
        self.canvas = ttk.Canvas(canvas_frame)
        scrollbar = ttk.Scrollbar(canvas_frame, orient=VERTICAL, command=self.canvas.yview, bootstyle="round")
        
        self.scrollable_frame = ttk.Frame(self.canvas)
        self.scrollable_frame.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all"))
        )
        
        self.canvas.create_window((0, 0), window=self.scrollable_frame, anchor=NW)
        self.canvas.configure(yscrollcommand=scrollbar.set)
        
        self.canvas.pack(side=LEFT, fill=BOTH, expand=YES)
        scrollbar.pack(side=RIGHT, fill=Y)
        
        # Bind mouse wheel scrolling
        self.canvas.bind_all("<MouseWheel>", self._on_mousewheel)
        
        # Close button
        button_frame = ttk.Frame(container)
        button_frame.pack(fill=X, pady=(20, 0))
        
        close_btn = ttk.Button(
            button_frame,
            text="Close",
            command=self.destroy,
            bootstyle="secondary",
            width=15
        )
        close_btn.pack(side=RIGHT)
    
    def _on_mousewheel(self, event):
        """Handle mouse wheel scrolling."""
        self.canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
    
    def display_results(self):
        """Display comparison results grouped by platform."""
        if not self.platform_results:
            no_results_label = ttk.Label(
                self.scrollable_frame,
                text="No results found for comparison",
                font=("Segoe UI", 12),
                foreground="#888888"
            )
            no_results_label.pack(pady=50)
            return
        
        # Find the best result across all platforms
        best_result = self._find_best_result()
        best_result_url = best_result.get('url') if best_result else None
        
        # Display results for each platform
        for platform_name, results in self.platform_results.items():
            self._display_platform_section(platform_name, results, best_result_url)
    
    def _find_best_result(self):
        """Find the best result across all platforms based on comparison_score."""
        best_result = None
        best_score = -1
        
        for platform_name, results in self.platform_results.items():
            for result in results:
                score = result.get('comparison_score', 0)
                if score > best_score:
                    best_score = score
                    best_result = result
        
        return best_result
    
    def _display_platform_section(self, platform_name, results, best_result_url):
        """Display results for a single platform."""
        # Platform header
        platform_frame = ttk.Labelframe(
            self.scrollable_frame,
            text=f"{platform_name} ({len(results)} results)",
            padding=15,
            bootstyle="primary"
        )
        platform_frame.pack(fill=X, pady=(0, 15))
        
        if not results:
            no_results_label = ttk.Label(
                platform_frame,
                text="No results found",
                foreground="#888888"
            )
            no_results_label.pack()
            return
        
        # Display each result
        for idx, result in enumerate(results):
            self._display_result_row(platform_frame, result, idx, best_result_url)
    
    def _display_result_row(self, parent, result, index, best_result_url):
        """Display a single result row."""
        url = result.get('url', '')
        title = result.get('title', 'Unknown')
        duration = result.get('duration', 'Unknown')
        author = result.get('author', 'Unknown')
        view_count = result.get('view_count', 0)
        available_qualities = result.get('available_qualities', [])
        comparison_score = result.get('comparison_score', 0)
        
        # Check if this is the best result
        is_best = (url == best_result_url)
        
        # Result container
        result_frame = ttk.Frame(parent)
        result_frame.pack(fill=X, pady=(0, 10))
        
        # Highlight best result
        if is_best:
            highlight_label = ttk.Label(
                result_frame,
                text="⭐ BEST MATCH",
                font=("Segoe UI", 9, "bold"),
                foreground="#fbbf24",
                background="#fef3c7",
                padding=5
            )
            highlight_label.pack(anchor=W, pady=(0, 5))
        
        # Main info row
        info_row = ttk.Frame(result_frame)
        info_row.pack(fill=X)
        
        # Rank number
        rank_label = ttk.Label(
            info_row,
            text=f"#{index + 1}",
            font=("Segoe UI", 10, "bold"),
            width=4
        )
        rank_label.pack(side=LEFT, padx=(0, 10))
        
        # Title and metadata
        details_frame = ttk.Frame(info_row)
        details_frame.pack(side=LEFT, fill=X, expand=YES)
        
        # Title
        title_label = ttk.Label(
            details_frame,
            text=title,
            font=("Segoe UI", 10, "bold"),
            wraplength=600
        )
        title_label.pack(anchor=W)
        
        # Metadata line
        metadata_parts = []
        
        if author and author != "Unknown":
            metadata_parts.append(f"👤 {author}")
        
        if duration and duration != "Unknown":
            metadata_parts.append(f"⏱️ {duration}")
        
        if view_count > 0:
            metadata_parts.append(f"👁️ {self._format_number(view_count)} views")
        
        if available_qualities:
            quality_str = ", ".join([f"{q}p" for q in available_qualities[:3]])
            metadata_parts.append(f"🎬 {quality_str}")
        
        metadata_parts.append(f"⭐ Score: {comparison_score:.2f}")
        
        if metadata_parts:
            metadata_label = ttk.Label(
                details_frame,
                text=" | ".join(metadata_parts),
                font=("Segoe UI", 9),
                foreground="#666666"
            )
            metadata_label.pack(anchor=W)
        
        # Add to Queue button
        add_btn = ttk.Button(
            info_row,
            text="Add to Queue",
            command=lambda r=result: self._add_to_queue(r),
            bootstyle="success-outline",
            width=15
        )
        add_btn.pack(side=RIGHT, padx=(10, 0))
        
        # Separator
        separator = ttk.Separator(result_frame, orient=HORIZONTAL)
        separator.pack(fill=X, pady=(10, 0))
    
    def _format_number(self, num):
        """Format large numbers with K, M, B suffixes."""
        if num >= 1_000_000_000:
            return f"{num / 1_000_000_000:.1f}B"
        elif num >= 1_000_000:
            return f"{num / 1_000_000:.1f}M"
        elif num >= 1_000:
            return f"{num / 1_000:.1f}K"
        else:
            return str(num)
    
    def _add_to_queue(self, result):
        """Add a result to the download queue."""
        if self.on_add_callback:
            try:
                self.on_add_callback(result)
                messagebox.showinfo(
                    "Added to Queue",
                    f"'{result.get('title', 'Video')}' has been added to the queue.",
                    parent=self
                )
            except Exception as e:
                self.logger.error(f"Failed to add to queue: {e}")
                messagebox.showerror(
                    "Error",
                    f"Failed to add video to queue: {str(e)}",
                    parent=self
                )
        else:
            messagebox.showwarning(
                "Not Available",
                "Add to queue functionality is not available.",
                parent=self
            )
