"""
Platform Health Indicator UI Component.
Displays health status icons for video platforms.
"""

import tkinter as tk
from tkinter import ttk
from datetime import datetime
import logging


class PlatformHealthIndicator(ttk.Label):
    """
    Visual indicator for platform health status.
    Shows status icon with tooltip displaying last check time.
    """
    
    # Status icon mapping
    STATUS_ICONS = {
        "healthy": "✅",
        "broken": "❌",
        "unknown": "❓",
        "checking": "⏳"
    }
    
    def __init__(self, parent, platform_name="", initial_status="unknown", **kwargs):
        """
        Initialize the platform health indicator.
        
        Args:
            parent: Parent widget.
            platform_name: Name of the platform being monitored.
            initial_status: Initial health status ('healthy', 'broken', 'unknown', 'checking').
            **kwargs: Additional arguments passed to ttk.Label.
        """
        super().__init__(parent, **kwargs)
        
        self.logger = logging.getLogger("Klyp.PlatformHealthIndicator")
        self.platform_name = platform_name
        self.status = initial_status
        self.last_check_time = None
        
        # Set initial icon
        self.update_status(initial_status)
        
        # Create tooltip
        self._create_tooltip()
    
    def update_status(self, status, check_time=None):
        """
        Update the health status and icon.
        
        Args:
            status: New health status ('healthy', 'broken', 'unknown', 'checking').
            check_time: Optional datetime of the check. Defaults to now.
        """
        if status not in self.STATUS_ICONS:
            self.logger.warning(f"Unknown status: {status}, defaulting to 'unknown'")
            status = "unknown"
        
        self.status = status
        self.last_check_time = check_time or datetime.now()
        
        # Update the label text with the icon
        icon = self.STATUS_ICONS[status]
        self.config(text=icon)
        
        # Update tooltip
        self._update_tooltip_text()
        
        self.logger.debug(f"Updated {self.platform_name} status to: {status}")
    
    def get_status(self):
        """
        Get the current health status.
        
        Returns:
            Current status string.
        """
        return self.status
    
    def _create_tooltip(self):
        """Create tooltip widget for showing last check time."""
        self.tooltip = None
        self.tooltip_window = None
        
        # Bind mouse events for tooltip
        self.bind("<Enter>", self._show_tooltip)
        self.bind("<Leave>", self._hide_tooltip)
    
    def _update_tooltip_text(self):
        """Update the tooltip text with current status and check time."""
        if self.last_check_time:
            time_str = self.last_check_time.strftime("%Y-%m-%d %H:%M:%S")
            self.tooltip_text = f"{self.platform_name}\nStatus: {self.status}\nLast checked: {time_str}"
        else:
            self.tooltip_text = f"{self.platform_name}\nStatus: {self.status}\nNot yet checked"
    
    def _show_tooltip(self, event=None):
        """Show the tooltip when mouse enters the widget."""
        if self.tooltip_window or not self.tooltip_text:
            return
        
        # Calculate tooltip position
        x = self.winfo_rootx() + 20
        y = self.winfo_rooty() + 20
        
        # Create tooltip window
        self.tooltip_window = tk.Toplevel(self)
        self.tooltip_window.wm_overrideredirect(True)
        self.tooltip_window.wm_geometry(f"+{x}+{y}")
        
        # Create tooltip label
        label = ttk.Label(
            self.tooltip_window,
            text=self.tooltip_text,
            justify=tk.LEFT,
            relief=tk.SOLID,
            borderwidth=1,
            padding=(5, 3)
        )
        label.pack()
    
    def _hide_tooltip(self, event=None):
        """Hide the tooltip when mouse leaves the widget."""
        if self.tooltip_window:
            self.tooltip_window.destroy()
            self.tooltip_window = None
    
    def set_platform_name(self, platform_name):
        """
        Set or update the platform name.
        
        Args:
            platform_name: Name of the platform.
        """
        self.platform_name = platform_name
        self._update_tooltip_text()
