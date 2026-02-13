"""
Theme Manager for Klyp Video Downloader.
Handles dark/light theme switching with emerald green color scheme.
"""

import ttkbootstrap as ttk
from ttkbootstrap.style import Style


class ThemeManager:
    """Manages application theme switching."""
    
    # Color scheme
    EMERALD_GREEN = "#10b981"
    
    # Dark theme colors 
    DARK_BG = "#1e1e1e"
    DARK_SECONDARY_BG = "#252526"
    DARK_TEXT = "#d4d4d4"
    BORDER_COLOR = "#454545"
    INPUT_BG = "#3c3c3c"
    
    # Light theme colors
    LIGHT_BG = "#ffffff"
    LIGHT_SECONDARY_BG = "#f5f5f5"
    LIGHT_TEXT = "#1f1f1f"
    LIGHT_BORDER_COLOR = "#e5e5e5"
    LIGHT_INPUT_BG = "#ffffff"
    
    def __init__(self, app, settings_manager):
        """
        Initialize ThemeManager.
        
        Args:
            app: Main application window instance.
            settings_manager: SettingsManager instance.
        """
        self.app = app
        self.settings_manager = settings_manager
        self.current_theme = settings_manager.get_theme()
        
        # Apply the theme colors on startup
        self._apply_custom_colors(self.current_theme)
    
    def apply_theme(self, theme: str):
        """
        Apply a theme to the application.
        
        Args:
            theme: Theme name ('dark' or 'light')
        """
        if theme not in ["dark", "light"]:
            raise ValueError("Theme must be 'dark' or 'light'")
        
        # Map theme to ttkbootstrap theme
        theme_name = "darkly" if theme == "dark" else "flatly"
        
        # Update the style
        self.app.style.theme_use(theme_name)
        
        # Apply custom colors
        self._apply_custom_colors(theme)
        
        # Save theme preference
        self.settings_manager.set_theme(theme)
        self.current_theme = theme
    
    def _apply_custom_colors(self, theme: str):
        """
        Apply custom color scheme to the theme.
        
        Args:
            theme: Theme name ('dark' or 'light')
        """
        style = self.app.style
        
        if theme == "dark":
            bg = self.DARK_BG
            fg = self.DARK_TEXT
            sec_bg = self.DARK_SECONDARY_BG
            border = self.BORDER_COLOR
            input_bg = self.INPUT_BG
        else:
            bg = self.LIGHT_BG
            fg = self.LIGHT_TEXT
            sec_bg = self.LIGHT_SECONDARY_BG
            border = self.LIGHT_BORDER_COLOR
            input_bg = self.LIGHT_INPUT_BG
            
        # Global configuration
        style.configure(".", background=bg, foreground=fg)
        style.configure("TFrame", background=bg)
        style.configure("TLabel", background=bg, foreground=fg)
        style.configure("TLabelframe", background=bg, foreground=fg, bordercolor=border)
        style.configure("TLabelframe.Label", background=bg, foreground=fg)
        
        # Button styling (flat)
        style.configure("TButton", background=sec_bg, foreground=fg, borderwidth=0, relief="flat")
        style.map("TButton",
                  background=[("active", self.EMERALD_GREEN), ("pressed", self.EMERALD_GREEN)],
                  foreground=[("active", "#ffffff"), ("pressed", "#ffffff")])
        
        # Accent buttons (Emerald Green)
        style.configure("success.TButton", background=self.EMERALD_GREEN, foreground="#ffffff", borderwidth=0)
        style.map("success.TButton",
                  background=[("active", "#059669"), ("pressed", "#047857")]) # Darker shades of emerald
        
        # Entry styling (VS Code input style)
        style.configure("TEntry", fieldbackground=input_bg, foreground=fg, bordercolor=border, relief="flat", padding=5)
        
        # Treeview styling
        style.configure("Treeview", 
                        background=sec_bg, 
                        foreground=fg, 
                        fieldbackground=sec_bg,
                        borderwidth=0,
                        rowheight=30)
        style.configure("Treeview.Heading", 
                        background=bg, 
                        foreground=fg, 
                        relief="flat",
                        borderwidth=0)
        style.map("Treeview", background=[("selected", "#37373d")]) # VS Code selection color
        
        # Notebook styling
        style.configure("TNotebook", background=bg, borderwidth=0)
        style.configure("TNotebook.Tab", background=sec_bg, foreground=fg, padding=[10, 5], borderwidth=0)
        style.map("TNotebook.Tab", 
                  background=[("selected", bg)], 
                  foreground=[("selected", self.EMERALD_GREEN)])
    
    def toggle_theme(self):
        """Toggle between dark and light themes."""
        new_theme = "light" if self.current_theme == "dark" else "dark"
        self.apply_theme(new_theme)
    
    def get_current_theme(self) -> str:
        """
        Get the current theme name.
        
        Returns:
            Current theme ('dark' or 'light')
        """
        return self.current_theme
    
    def get_bg_color(self) -> str:
        """Get the background color for current theme."""
        return self.DARK_BG if self.current_theme == "dark" else self.LIGHT_BG
    
    def get_secondary_bg_color(self) -> str:
        """Get the secondary background color for current theme."""
        return self.DARK_SECONDARY_BG if self.current_theme == "dark" else self.LIGHT_SECONDARY_BG
    
    def get_text_color(self) -> str:
        """Get the text color for current theme."""
        return self.DARK_TEXT if self.current_theme == "dark" else self.LIGHT_TEXT
    
    def get_accent_color(self) -> str:
        """Get the accent color (emerald green)."""
        return self.EMERALD_GREEN
