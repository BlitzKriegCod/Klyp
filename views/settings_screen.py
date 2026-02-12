"""
Settings Screen for Klyp Video Downloader.
Provides configuration options for the application.
"""

import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from tkinter import filedialog, messagebox
from pathlib import Path


class SettingsScreen(ttk.Frame):
    """Settings screen with all configuration options."""
    
    def __init__(self, parent, app):
        """
        Initialize SettingsScreen.
        
        Args:
            parent: Parent widget.
            app: Main application instance.
        """
        super().__init__(parent)
        self.app = app
        self.loading = True
        self.setup_ui()
        self.load_settings()
        self.loading = False
    
    def setup_ui(self):
        """Set up the settings screen UI."""
        # Main container
        container = ttk.Frame(self, padding=20)
        container.pack(fill=BOTH, expand=YES)
        
        # Header
        title_label = ttk.Label(
            container,
            text="Settings",
            font=("Segoe UI", 20, "bold")
        )
        title_label.pack(anchor=W, pady=(0, 20))
        
        # Scrollable area
        canvas = ttk.Canvas(container, highlightthickness=0)
        scrollbar = ttk.Scrollbar(container, orient=VERTICAL, command=canvas.yview, bootstyle="round")
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor=NW, width=900) # Fixed width for consistency
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Helper to create styled sections
        def create_section(parent, title):
            frame = ttk.Labelframe(
                parent,
                text=title,
                padding=15,
                bootstyle="secondary"
            )
            frame.pack(fill=X, pady=(0, 15), anchor=NW)
            return frame
            
        # Download Directory
        dir_frame = create_section(scrollable_frame, "Download Directory")
        
        dir_input_frame = ttk.Frame(dir_frame)
        dir_input_frame.pack(fill=X)
        
        self.dir_entry = ttk.Entry(
            dir_input_frame,
            font=("Consolas", 10),
        )
        self.dir_entry.pack(side=LEFT, fill=X, expand=YES, padx=(0, 10))
        
        browse_btn = ttk.Button(
            dir_input_frame,
            text="Browse",
            command=self.browse_directory,
            bootstyle="secondary",
            width=12
        )
        browse_btn.pack(side=LEFT)
        
        # Appearance
        theme_frame = create_section(scrollable_frame, "Appearance")
        
        theme_row = ttk.Frame(theme_frame)
        theme_row.pack(fill=X)
        
        ttk.Label(theme_row, text="Theme Mode:", font=("Segoe UI", 10)).pack(side=LEFT, padx=(0, 15))
        
        self.theme_var = ttk.BooleanVar(value=True if self.app.theme_manager.get_current_theme() == "dark" else False)
        self.theme_switch = ttk.Checkbutton(
            theme_row,
            text="Dark Mode",
            variable=self.theme_var,
            command=self.toggle_theme,
            bootstyle="success-round-toggle"
        )
        self.theme_switch.pack(side=LEFT)
        
        # Download Mode
        mode_frame = create_section(scrollable_frame, "Download Behavior")
        
        self.mode_var = ttk.StringVar(value="sequential")
        
        ttk.Radiobutton(
            mode_frame,
            text="Sequential (one at a time)",
            variable=self.mode_var,
            value="sequential",
            command=self.save_download_mode,
            bootstyle="success"
        ).pack(anchor=W, pady=2)
        
        ttk.Radiobutton(
            mode_frame,
            text="Multi-threaded (fast, consumes more bandwidth)",
            variable=self.mode_var,
            value="multi-threaded",
            command=self.save_download_mode,
            bootstyle="success"
        ).pack(anchor=W, pady=2)
        
        # Proxy Settings
        proxy_frame = create_section(scrollable_frame, "Network & Proxy")
        
        self.proxy_enabled_var = ttk.BooleanVar(value=False)
        ttk.Checkbutton(
            proxy_frame,
            text="Enable Proxy",
            variable=self.proxy_enabled_var,
            command=self.save_proxy_settings,
            bootstyle="success-round-toggle"
        ).pack(anchor=W, pady=(0, 10))
        
        # Grid for proxy details
        proxy_grid = ttk.Frame(proxy_frame)
        proxy_grid.pack(fill=X)
        
        ttk.Label(proxy_grid, text="Host:").grid(row=0, column=0, padx=5, pady=5, sticky=W)
        self.proxy_host_entry = ttk.Entry(proxy_grid)
        self.proxy_host_entry.grid(row=0, column=1, padx=5, pady=5, sticky=EW)
        
        ttk.Label(proxy_grid, text="Port:").grid(row=0, column=2, padx=5, pady=5, sticky=W)
        self.proxy_port_entry = ttk.Entry(proxy_grid, width=10)
        self.proxy_port_entry.grid(row=0, column=3, padx=5, pady=5, sticky=W)
        
        ttk.Label(proxy_grid, text="Type:").grid(row=0, column=4, padx=5, pady=5, sticky=W)
        self.proxy_type_var = ttk.StringVar(value="http")
        ttk.Combobox(
            proxy_grid,
            textvariable=self.proxy_type_var,
            values=["http", "https", "socks5"],
            state="readonly",
            width=10
        ).grid(row=0, column=5, padx=5, pady=5, sticky=W)
        
        proxy_grid.columnconfigure(1, weight=1)
        
        # Additional Options
        options_frame = create_section(scrollable_frame, "Advanced Options")
        
        self.subtitle_var = ttk.BooleanVar(value=False)
        ttk.Checkbutton(
            options_frame,
            text="Download subtitles automatically",
            variable=self.subtitle_var,
            command=self.save_additional_options,
            bootstyle="success-round-toggle"
        ).pack(anchor=W, pady=5)
        
        self.notifications_var = ttk.BooleanVar(value=True)
        ttk.Checkbutton(
            options_frame,
            text="Show desktop notifications",
            variable=self.notifications_var,
            command=self.save_additional_options,
            bootstyle="success-round-toggle"
        ).pack(anchor=W, pady=5)
        
        self.auto_resume_var = ttk.BooleanVar(value=True)
        ttk.Checkbutton(
            options_frame,
            text="Auto-resume unfinished downloads",
            variable=self.auto_resume_var,
            command=self.save_additional_options,
            bootstyle="success-round-toggle"
        ).pack(anchor=W, pady=5)
        
        self.debug_mode_var = ttk.BooleanVar(value=False)
        ttk.Checkbutton(
            options_frame,
            text="Debug Mode (Verbose Logging)",
            variable=self.debug_mode_var,
            command=self.save_additional_options,
            bootstyle="warning-round-toggle"
        ).pack(anchor=W, pady=5)

        # ---------------------------------------------------------------------
        # Advanced Features Section
        # ---------------------------------------------------------------------
        
        # Audio Extraction
        audio_frame = create_section(scrollable_frame, "Audio Extraction")
        
        self.extract_audio_var = ttk.BooleanVar(value=False)
        ttk.Checkbutton(
            audio_frame,
            text="Extract Audio Only",
            variable=self.extract_audio_var,
            bootstyle="success-round-toggle"
        ).pack(anchor=W, pady=(0, 5))
        
        audio_opts = ttk.Frame(audio_frame)
        audio_opts.pack(fill=X, padx=20)
        
        ttk.Label(audio_opts, text="Format:").pack(side=LEFT, padx=(0, 10))
        self.audio_format_var = ttk.StringVar(value="mp3")
        ttk.Combobox(
            audio_opts,
            textvariable=self.audio_format_var,
            values=["mp3", "m4a", "wav", "flac"],
            state="readonly",
            width=10
        ).pack(side=LEFT)
        
        # Post-Processing
        post_frame = create_section(scrollable_frame, "Post-Processing")
        
        self.embed_thumb_var = ttk.BooleanVar(value=False)
        ttk.Checkbutton(
            post_frame,
            text="Embed Thumbnail",
            variable=self.embed_thumb_var,
            bootstyle="success-round-toggle"
        ).pack(anchor=W, pady=2)
        
        self.embed_meta_var = ttk.BooleanVar(value=False)
        ttk.Checkbutton(
            post_frame,
            text="Embed Metadata",
            variable=self.embed_meta_var,
            bootstyle="success-round-toggle"
        ).pack(anchor=W, pady=2)
        
        self.sponsor_var = ttk.BooleanVar(value=False)
        ttk.Checkbutton(
            post_frame,
            text="Enable SponsorBlock (Skip Sponsors)",
            variable=self.sponsor_var,
            bootstyle="info-round-toggle"
        ).pack(anchor=W, pady=2)
        
        # Authentication
        auth_frame = create_section(scrollable_frame, "Authentication")
        
        ttk.Label(auth_frame, text="Cookies File (Netscape format):").pack(anchor=W, pady=(0, 5))
        
        auth_input = ttk.Frame(auth_frame)
        auth_input.pack(fill=X)
        
        self.cookies_entry = ttk.Entry(auth_input)
        self.cookies_entry.pack(side=LEFT, fill=X, expand=YES, padx=(0, 10))
        
        ttk.Button(
            auth_input,
            text="Browse",
            command=self.browse_cookies,
            bootstyle="secondary",
            width=10
        ).pack(side=LEFT)
        
        # OpenSubtitles Authentication
        os_auth_frame = create_section(scrollable_frame, "OpenSubtitles.com Authentication")
        
        ttk.Label(os_auth_frame, text="Username:").pack(anchor=W, pady=(0, 2))
        self.os_user_entry = ttk.Entry(os_auth_frame)
        self.os_user_entry.pack(fill=X, pady=(0, 10))
        
        ttk.Label(os_auth_frame, text="Password:").pack(anchor=W, pady=(0, 2))
        self.os_pass_entry = ttk.Entry(os_auth_frame, show="*")
        self.os_pass_entry.pack(fill=X, pady=(0, 10))
        
        ttk.Label(os_auth_frame, text="API Key:").pack(anchor=W, pady=(0, 2))
        self.os_api_entry = ttk.Entry(os_auth_frame)
        self.os_api_entry.pack(fill=X, pady=(0, 5))
        
        ttk.Label(
            os_auth_frame, 
            text="Required for searching and downloading subtitles. Default key is provided.",
            font=("Segoe UI", 8),
            bootstyle="secondary"
        ).pack(anchor=W)
        
        # Action Buttons
        button_frame = ttk.Frame(scrollable_frame)
        button_frame.pack(fill=X, pady=(20, 0))
        
        ttk.Button(
            button_frame,
            text="Save All Settings",
            command=self.save_all_settings,
            style="success.TButton",
            width=20
        ).pack(side=LEFT, padx=(0, 10))
        
        ttk.Button(
            button_frame,
            text="Reset Defaults",
            command=self.reset_to_defaults,
            bootstyle="danger-outline",
            width=20
        ).pack(side=LEFT)
        
        # Pack layouts
        canvas.pack(side=LEFT, fill=BOTH, expand=YES)
        scrollbar.pack(side=RIGHT, fill=Y)
    
    def load_settings(self):
        """Load current settings into UI."""
        settings = self.app.settings_manager
        
        # Download directory
        self.dir_entry.delete(0, END)
        self.dir_entry.insert(0, settings.get_download_directory())
        
        # Theme
        theme = settings.get_theme()
        self.theme_var.set(True if theme == "dark" else False)
        
        # Download mode
        self.mode_var.set(settings.get_download_mode())
        
        # Proxy settings
        self.proxy_enabled_var.set(settings.get("proxy_enabled", False))
        self.proxy_host_entry.delete(0, END)
        self.proxy_host_entry.insert(0, settings.get("proxy_host", ""))
        self.proxy_port_entry.delete(0, END)
        self.proxy_port_entry.insert(0, settings.get("proxy_port", ""))
        self.proxy_type_var.set(settings.get("proxy_type", "http"))
        
        # Additional options
        self.auto_resume_var.set(settings.get("auto_resume", True))
        self.debug_mode_var.set(settings.get("debug_mode", False))
        
        # Load Advanced Settings
        self.extract_audio_var.set(settings.get("extract_audio", False))
        self.audio_format_var.set(settings.get("audio_format", "mp3"))
        self.embed_thumb_var.set(settings.get("embed_thumbnail", False))
        self.embed_meta_var.set(settings.get("embed_metadata", False))
        self.sponsor_var.set(settings.get("sponsorblock_enabled", False))
        self.cookies_entry.delete(0, END)
        self.cookies_entry.insert(0, settings.get("cookies_path", ""))
        self.os_user_entry.delete(0, END)
        self.os_user_entry.insert(0, settings.get("os_username", ""))
        self.os_pass_entry.delete(0, END)
        self.os_pass_entry.insert(0, settings.get("os_password", ""))
        self.os_api_entry.delete(0, END)
        self.os_api_entry.insert(0, settings.get("os_api_key", ""))
    
    def browse_directory(self):
        """Open directory browser dialog."""
        directory = filedialog.askdirectory(
            title="Select Download Directory",
            initialdir=self.dir_entry.get()
        )
        
        if directory:
            self.dir_entry.delete(0, END)
            self.dir_entry.insert(0, directory)
            self.app.settings_manager.set_download_directory(directory)
            
    def browse_cookies(self):
        """Open file browser for cookies."""
        filename = filedialog.askopenfilename(
            title="Select Cookies File",
            filetypes=[("Text Files", "*.txt"), ("All Files", "*.*")]
        )
        if filename:
            self.cookies_entry.delete(0, END)
            self.cookies_entry.insert(0, filename)
    
    def toggle_theme(self):
        """Toggle between dark and light themes."""
        if self.loading:
            return
        new_theme = "dark" if self.theme_var.get() else "light"
        self.app.theme_manager.apply_theme(new_theme)
    
    def save_download_mode(self):
        """Save download mode setting."""
        if self.loading:
            return
        mode = self.mode_var.get()
        self.app.settings_manager.set_download_mode(mode)
        
        # Update download manager if it exists
        if hasattr(self.app, 'download_manager'):
            try:
                self.app.download_manager.set_download_mode(mode)
            except Exception as e:
                messagebox.showerror("Error", f"Failed to update download mode: {str(e)}")
    
    def save_proxy_settings(self):
        """Save proxy settings."""
        if self.loading:
            return
        self.app.settings_manager.set("proxy_enabled", self.proxy_enabled_var.get())
        self.app.settings_manager.set("proxy_host", self.proxy_host_entry.get())
        self.app.settings_manager.set("proxy_port", self.proxy_port_entry.get())
        self.app.settings_manager.set("proxy_type", self.proxy_type_var.get())
    
    def save_additional_options(self):
        """Save additional options."""
        self.app.settings_manager.set("subtitle_download", self.subtitle_var.get())
        self.app.settings_manager.set("notifications_enabled", self.notifications_var.get())
        self.app.settings_manager.set("auto_resume", self.auto_resume_var.get())
        self.app.settings_manager.set("debug_mode", self.debug_mode_var.get())
        
        # Save Advanced Settings
        self.app.settings_manager.set("extract_audio", self.extract_audio_var.get())
        self.app.settings_manager.set("audio_format", self.audio_format_var.get())
        self.app.settings_manager.set("embed_thumbnail", self.embed_thumb_var.get())
        self.app.settings_manager.set("embed_metadata", self.embed_meta_var.get())
        self.app.settings_manager.set("sponsorblock_enabled", self.sponsor_var.get())
        self.app.settings_manager.set("cookies_path", self.cookies_entry.get())
        self.app.settings_manager.set("os_username", self.os_user_entry.get())
        self.app.settings_manager.set("os_password", self.os_pass_entry.get())
        self.app.settings_manager.set("os_api_key", self.os_api_entry.get())
        
        # Update debug mode
        from utils import set_debug_mode
        set_debug_mode(self.debug_mode_var.get())
        
        # Update download manager if it exists
        if hasattr(self.app, 'download_manager'):
            try:
                notifications_enabled = self.notifications_var.get()
                self.app.download_manager.set_notifications_enabled(notifications_enabled)
                
                # Update advanced settings in download manager/video downloader
                # For now just reload everything from settings in VideoDownloader
                # But since we create VideoDownloader instances, we should pass config
                pass 
                
            except Exception as e:
                messagebox.showerror("Error", f"Failed to update settings: {str(e)}")
    
    def save_all_settings(self):
        """Save all settings."""
        # Save download directory
        directory = self.dir_entry.get()
        if directory:
            self.app.settings_manager.set_download_directory(directory)
        
        # Save proxy settings
        self.save_proxy_settings()
        
        # Save additional options (includes advanced)
        self.save_additional_options()
        
        messagebox.showinfo("Success", "All settings saved successfully!")
    
    def reset_to_defaults(self):
        """Reset all settings to defaults."""
        if messagebox.askyesno("Confirm", "Reset all settings to defaults?"):
            self.app.settings_manager.reset_to_defaults()
            self.load_settings()
            messagebox.showinfo("Success", "Settings reset to defaults")
