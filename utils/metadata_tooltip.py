"""
Metadata Tooltip Component for Klyp Video Downloader.
Displays enriched metadata for search results.
"""

import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from typing import Dict, Any, Optional
from datetime import datetime


class MetadataTooltip(ttk.Frame):
    """Expandable panel showing enriched metadata for a search result."""
    
    def __init__(self, parent, **kwargs):
        """
        Initialize MetadataTooltip.
        
        Args:
            parent: Parent widget.
            **kwargs: Additional frame options.
        """
        super().__init__(parent, **kwargs)
        self.metadata = {}
        self.setup_ui()
    
    def setup_ui(self):
        """Set up the metadata display UI."""
        # Container with padding
        container = ttk.Frame(self, padding=10)
        container.pack(fill=BOTH, expand=YES)
        
        # Metadata sections
        self.stats_frame = ttk.Frame(container)
        self.stats_frame.pack(fill=X, pady=(0, 5))
        
        self.description_frame = ttk.Frame(container)
        self.description_frame.pack(fill=X, pady=(0, 5))
        
        self.tags_frame = ttk.Frame(container)
        self.tags_frame.pack(fill=X, pady=(0, 5))
        
        self.qualities_frame = ttk.Frame(container)
        self.qualities_frame.pack(fill=X)
    
    def show_metadata(self, metadata: Dict[str, Any]):
        """
        Display metadata in the tooltip.
        
        Args:
            metadata: Dictionary containing enriched metadata fields:
                - view_count: Number of views
                - like_count: Number of likes
                - upload_date: Upload date string (YYYYMMDD)
                - description: Video description
                - tags: List of tags
                - available_qualities: List of quality strings
                - enrichment_failed: Boolean indicating if enrichment failed
        """
        self.metadata = metadata
        
        # Clear existing widgets
        for widget in self.stats_frame.winfo_children():
            widget.destroy()
        for widget in self.description_frame.winfo_children():
            widget.destroy()
        for widget in self.tags_frame.winfo_children():
            widget.destroy()
        for widget in self.qualities_frame.winfo_children():
            widget.destroy()
        
        # Check if enrichment failed
        if metadata.get('enrichment_failed', False):
            error_label = ttk.Label(
                self.stats_frame,
                text="⚠️ Metadata unavailable",
                font=("Segoe UI", 9, "italic"),
                foreground="#ef4444"
            )
            error_label.pack(anchor=W)
            return
        
        # Display statistics (views, likes, date)
        self._display_stats()
        
        # Display description
        self._display_description()
        
        # Display tags
        self._display_tags()
        
        # Display available qualities
        self._display_qualities()
    
    def _display_stats(self):
        """Display view count, like count, and upload date."""
        stats_row = ttk.Frame(self.stats_frame)
        stats_row.pack(fill=X)
        
        # View count
        view_count = self.metadata.get('view_count', 0)
        if view_count > 0:
            views_text = self._format_number(view_count)
            ttk.Label(
                stats_row,
                text=f"👁️ {views_text} views",
                font=("Segoe UI", 9),
                foreground="#6b7280"
            ).pack(side=LEFT, padx=(0, 15))
        
        # Like count
        like_count = self.metadata.get('like_count', 0)
        if like_count > 0:
            likes_text = self._format_number(like_count)
            ttk.Label(
                stats_row,
                text=f"👍 {likes_text} likes",
                font=("Segoe UI", 9),
                foreground="#6b7280"
            ).pack(side=LEFT, padx=(0, 15))
        
        # Upload date
        upload_date = self.metadata.get('upload_date', '')
        if upload_date:
            formatted_date = self._format_date(upload_date)
            ttk.Label(
                stats_row,
                text=f"📅 {formatted_date}",
                font=("Segoe UI", 9),
                foreground="#6b7280"
            ).pack(side=LEFT)
    
    def _display_description(self):
        """Display video description preview."""
        description = self.metadata.get('description', '')
        
        if description:
            # Description label
            ttk.Label(
                self.description_frame,
                text="Description:",
                font=("Segoe UI", 9, "bold"),
                foreground="#374151"
            ).pack(anchor=W, pady=(5, 2))
            
            # Description text
            desc_label = ttk.Label(
                self.description_frame,
                text=description,
                font=("Segoe UI", 9),
                foreground="#6b7280",
                wraplength=400,
                justify=LEFT
            )
            desc_label.pack(anchor=W)
    
    def _display_tags(self):
        """Display video tags."""
        tags = self.metadata.get('tags', [])
        
        if tags:
            # Tags label
            ttk.Label(
                self.tags_frame,
                text="Tags:",
                font=("Segoe UI", 9, "bold"),
                foreground="#374151"
            ).pack(anchor=W, pady=(5, 2))
            
            # Tags row
            tags_row = ttk.Frame(self.tags_frame)
            tags_row.pack(fill=X)
            
            # Display tags as labels
            for tag in tags:
                tag_label = ttk.Label(
                    tags_row,
                    text=f"🏷️ {tag}",
                    font=("Segoe UI", 8),
                    foreground="#8b5cf6",
                    background="#f3f4f6",
                    padding=(5, 2)
                )
                tag_label.pack(side=LEFT, padx=(0, 5))
    
    def _display_qualities(self):
        """Display available quality options."""
        qualities = self.metadata.get('available_qualities', [])
        
        if qualities:
            # Qualities label
            ttk.Label(
                self.qualities_frame,
                text="Available Qualities:",
                font=("Segoe UI", 9, "bold"),
                foreground="#374151"
            ).pack(anchor=W, pady=(5, 2))
            
            # Qualities row
            qualities_row = ttk.Frame(self.qualities_frame)
            qualities_row.pack(fill=X)
            
            # Display qualities as badges
            quality_text = ", ".join([f"{q}p" for q in qualities])
            ttk.Label(
                qualities_row,
                text=f"🎬 {quality_text}",
                font=("Segoe UI", 9),
                foreground="#10b981"
            ).pack(side=LEFT)
    
    def _format_number(self, num: int) -> str:
        """
        Format large numbers with K, M, B suffixes.
        
        Args:
            num: Number to format.
            
        Returns:
            Formatted string (e.g., "1.2M", "45K").
        """
        if num >= 1_000_000_000:
            return f"{num / 1_000_000_000:.1f}B"
        elif num >= 1_000_000:
            return f"{num / 1_000_000:.1f}M"
        elif num >= 1_000:
            return f"{num / 1_000:.1f}K"
        else:
            return str(num)
    
    def _format_date(self, date_str: str) -> str:
        """
        Format upload date from YYYYMMDD to readable format.
        
        Args:
            date_str: Date string in YYYYMMDD format.
            
        Returns:
            Formatted date string (e.g., "Jan 15, 2024").
        """
        try:
            if len(date_str) == 8:
                date_obj = datetime.strptime(date_str, "%Y%m%d")
                return date_obj.strftime("%b %d, %Y")
            else:
                return date_str
        except Exception:
            return date_str
    
    def clear(self):
        """Clear all displayed metadata."""
        self.metadata = {}
        for widget in self.stats_frame.winfo_children():
            widget.destroy()
        for widget in self.description_frame.winfo_children():
            widget.destroy()
        for widget in self.tags_frame.winfo_children():
            widget.destroy()
        for widget in self.qualities_frame.winfo_children():
            widget.destroy()
