"""
Subtitles Screen for Klyp Video Downloader.
Allows searching and downloading subtitles for local video files.
"""

import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from tkinter import filedialog, messagebox
import threading
from pathlib import Path
import os
import sys

import subliminal
from babelfish import Language


class SubtitlesScreen(ttk.Frame):
    """Screen for downloading subtitles using OpenSubtitles.com."""
    
    def __init__(self, parent, app):
        """
        Initialize SubtitlesScreen.
        
        Args:
            parent: Parent widget.
            app: Main application instance.
        """
        super().__init__(parent)
        self.app = app
        self.selected_file = None
        self.is_searching = False
        self.search_results = []
        self.manual_save_dir = str(Path.home() / "Downloads" / "Klyp")
        self.languages_dict = {
            "English": "eng",
            "Spanish": "spa",
            "French": "fra",
            "German": "deu",
            "Italian": "ita",
            "Portuguese": "por",
            "Russian": "rus",
            "Japanese": "jpn",
            "Chinese": "zho",
            "Korean": "kor"
        }
        self.patch_subliminal()
        self.setup_ui()

    def patch_subliminal(self):
        """Patch subliminal providers to fix known issues with current APIs."""
        try:
            from subliminal.providers.opensubtitlescom import OpenSubtitlesComProvider
            
            # Anti-recursion safety flag: class-level to prevent wrapping wraps
            if hasattr(OpenSubtitlesComProvider, '_klyp_patched'):
                return
            OpenSubtitlesComProvider._klyp_patched = True
            
            # 1. OpenSubtitles.com Patch: Ensure correct headers
            original_os_init = OpenSubtitlesComProvider.initialize
            def patched_os_init(instance):
                original_os_init(instance)
                # Ensure Accept is application/json
                instance.session.headers['Accept'] = 'application/json'
            
            OpenSubtitlesComProvider.initialize = patched_os_init

            # 2. api_get wrapper for deep diagnostics on failures
            original_api_get = OpenSubtitlesComProvider.api_get
            def patched_api_get(instance, path, params=None, **kwargs):
                try:
                    return original_api_get(instance, path, params, **kwargs)
                except Exception as e:
                    # Capture body if it failed with specific errors
                    if "Bad Request" in str(e) or "400" in str(e):
                        try:
                            # Re-sort/lower params as subliminal does
                            p = dict(sorted(params.items())) if params else {}
                            p = {k.lower(): (v.lower() if isinstance(v, str) else v) for k, v in p.items()}
                            r = instance.session.get(instance.server_url + path, params=p, timeout=instance.timeout)
                            print(f"DEBUG: [OpenSubtitles] Error Response Body: {r.text}")
                        except:
                            pass
                    raise
            
            OpenSubtitlesComProvider.api_get = patched_api_get

            # 3. _search wrapper for language format compliance
            original_os_search = OpenSubtitlesComProvider._search
            def patched_os_search(instance, page=1, **params):
                # Ensure languages is a list for the API
                if 'languages' in params and isinstance(params['languages'], str):
                    params['languages'] = [l.strip() for l in params['languages'].split(',')]
                
                # Deeper debugging for English-specific Bad Request
                if os.environ.get('KLYP_DEBUG', '1') == '1':
                    print(f"DEBUG: [OpenSubtitles] Sending Params: {params}")
                
                try:
                    return original_os_search(instance, page=page, **params)
                except Exception as e:
                    # Log precisely what failed to help identify provider-side issues
                    print(f"DEBUG: [OpenSubtitles] Search failed with internal error: {e}")
                    raise
            
            OpenSubtitlesComProvider._search = patched_os_search
            print("DEBUG: OpenSubtitles.com patched successfully.")
            
        except Exception as e:
            print(f"ERROR: Failed to patch subliminal: {e}")
    
    def setup_ui(self):
        """Set up the UI components with tabs."""
        container = ttk.Frame(self, padding=20)
        container.pack(fill=BOTH, expand=YES)
        
        # Header
        header_frame = ttk.Frame(container)
        header_frame.pack(fill=X, pady=(0, 20))
        
        ttk.Label(
            header_frame,
            text="Subtitle Downloader",
            font=("Segoe UI", 20, "bold")
        ).pack(anchor=W)
        
        # Tabs
        self.notebook = ttk.Notebook(container)
        self.notebook.pack(fill=BOTH, expand=YES)
        
        # Tab 1: Local Video
        self.local_tab = ttk.Frame(self.notebook, padding=15)
        self.notebook.add(self.local_tab, text="Local Video")
        self.setup_local_tab()
        
        # Tab 2: Manual Search
        self.manual_tab = ttk.Frame(self.notebook, padding=15)
        self.notebook.add(self.manual_tab, text="Manual Search")
        self.setup_manual_tab()
        
        # Common Progress/Status (at bottom)
        self.bottom_frame = ttk.Frame(container, padding=(0, 10))
        self.bottom_frame.pack(fill=X, side=BOTTOM)
        
        self.status_label = ttk.Label(self.bottom_frame, text="", bootstyle="info")
        self.status_label.pack(pady=5)
        
        self.progress = ttk.Progressbar(self.bottom_frame, mode="indeterminate", bootstyle="success")
        self.progress.pack(fill=X)
        self.progress.stop()

    def setup_local_tab(self):
        """Set up the Local Video tab UI."""
        file_frame = ttk.Labelframe(self.local_tab, text="Select Video", padding=15)
        file_frame.pack(fill=X, pady=(0, 20))
        
        self.file_label = ttk.Label(file_frame, text="No file selected", font=("Segoe UI", 9))
        self.file_label.pack(side=LEFT, fill=X, expand=YES)
        browse_btn = ttk.Button(
            file_frame, 
            text=" Select Video", 
            image=self.app.icons_light.get("plus"),
            compound=LEFT,
            command=self.browse_file,
            bootstyle="secondary",
            width=15
        )
        browse_btn.pack(side=RIGHT)
        
        # Options
        opt_frame = ttk.Frame(self.local_tab)
        opt_frame.pack(fill=X, pady=(0, 20))
        
        ttk.Label(opt_frame, text="Language:").pack(side=LEFT, padx=(0, 10))
        self.local_lang_var = ttk.StringVar(value="English")
        self.local_lang_combo = ttk.Combobox(
            opt_frame, 
            textvariable=self.local_lang_var, 
            values=list(self.languages_dict.keys()),
            state="readonly",
            width=15
        )
        self.local_lang_combo.pack(side=LEFT)
        
        # Action button for local tab
        self.local_download_btn = ttk.Button(
            self.local_tab,
            text=" Search & Download",
            image=self.app.icons_light.get("search"),
            compound=LEFT,
            command=self.start_local_download,
            bootstyle="success",
            width=25
        )
        self.local_download_btn.pack(pady=20)

    def setup_manual_tab(self):
        """Set up the Manual Search tab UI."""
        # Main container for manual tab
        main_manual = ttk.Frame(self.manual_tab)
        main_manual.pack(fill=BOTH, expand=YES)

        # Row 1: Title and Search Button
        search_input_frame = ttk.Frame(main_manual)
        search_input_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Label(search_input_frame, text="Title/Series:").pack(side=LEFT, padx=(0, 10))
        self.search_entry = ttk.Entry(search_input_frame)
        self.search_entry.pack(side=LEFT, fill=X, expand=YES, padx=(0, 10))
        self.search_entry.bind("<Return>", lambda e: self.start_manual_search())

        self.search_manual_btn = ttk.Button(
            search_input_frame, 
            text=" Search", 
            image=self.app.icons_light.get("search"),
            compound=LEFT,
            command=self.start_manual_search, 
            bootstyle="success",
            width=12
        )
        self.search_manual_btn.pack(side=LEFT)

        # Row 2: Provider and Language
        opt_frame = ttk.Frame(main_manual)
        opt_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Label(opt_frame, text="Provider:").pack(side=LEFT, padx=(0, 10))
        self.provider_label = ttk.Label(opt_frame, text="OpenSubtitles.com", font=("Segoe UI", 9, "bold"))
        self.provider_label.pack(side=LEFT, padx=(0, 20))
        
        ttk.Label(opt_frame, text="Language:").pack(side=LEFT, padx=(0, 10))
        self.manual_lang_var = ttk.StringVar(value="English")
        self.lang_combo = ttk.Combobox(
            opt_frame, 
            textvariable=self.manual_lang_var, 
            values=list(self.languages_dict.keys()),
            state="readonly",
            width=15
        )
        self.lang_combo.pack(side=LEFT)

        # Row 3: Save Directory
        dir_frame = ttk.Frame(main_manual)
        dir_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Label(dir_frame, text="Save To:").pack(side=LEFT, padx=(0, 10))
        self.save_dir_label = ttk.Label(dir_frame, text=os.path.basename(self.manual_save_dir) or self.manual_save_dir, font=("Segoe UI", 8), width=30)
        self.save_dir_label.pack(side=LEFT, fill=X, expand=YES)
        
        ttk.Button(
            dir_frame,
            text="Change",
            command=self.change_save_dir,
            bootstyle="link"
        ).pack(side=RIGHT)
        
        # Results Treeview
        columns = ("Language", "Provider", "Name", "ID")
        self.tree = ttk.Treeview(self.manual_tab, columns=columns, show="headings", height=8)
        self.tree.heading("Language", text="Lang")
        self.tree.heading("Provider", text="Provider")
        self.tree.heading("Name", text="Subtitle Name")
        self.tree.heading("ID", text="ID")
        
        self.tree.column("Language", width=50, stretch=NO)
        self.tree.column("Provider", width=100, stretch=NO)
        self.tree.column("Name", width=400, stretch=YES)
        self.tree.column("ID", width=100, stretch=NO)
        
        self.tree.pack(fill=BOTH, expand=YES, pady=(10, 10))
        self.tree.bind("<<TreeviewSelect>>", self._on_manual_tree_select)
        
        self.download_manual_btn = ttk.Button(
            self.manual_tab,
            text=" Download Selected",
            image=self.app.icons_light.get("download"),
            compound=LEFT,
            command=self.download_selected_manual,
            bootstyle="info",
            state=DISABLED
        )
        self.download_manual_btn.pack(pady=5)

    def change_save_dir(self):
        """Open directory dialog to change manual save location."""
        new_dir = filedialog.askdirectory(initialdir=self.manual_save_dir)
        if new_dir:
            self.manual_save_dir = new_dir
            self.save_dir_label.config(text=os.path.basename(new_dir) or new_dir)

    def browse_file(self):
        """Open file dialog to select a video file."""
        file_path = filedialog.askopenfilename(
            title="Select Video File",
            filetypes=[
                ("Video Files", "*.mp4 *.mkv *.avi *.mov *.m4v *.webm *.ts"),
                ("All Files", "*.*")
            ]
        )
        if file_path:
            self.selected_file = file_path
            self.file_label.config(text=os.path.basename(file_path))
            self.status_label.config(text="", bootstyle="info")

    def _on_provider_change(self, event=None):
        """Check for credentials and show guidance if missing."""
        creds = self._get_credentials()
        if not creds[0] or not creds[1] or not creds[2]:
            messagebox.showinfo(
                "OpenSubtitles.com Setup Guide",
                "To use OpenSubtitles.com, you need an account and an API Key:\n\n"
                "1. Visit https://www.opensubtitles.com and create an account.\n"
                "2. Verify your email (CRITICAL).\n"
                "3. Go to your Profile > API section.\n"
                "4. Create a new 'Consumer' entry to generate your 'API Key'.\n\n"
                "After that, enter your Username, Password, and API Key in the Settings screen.\n\n"
                "I will redirect you to the Settings screen now."
            )
            self.app.navigate_to("settings")

    def _get_credentials(self):
        """Helper to get OpenSubtitles credentials. Returns empty values if not set."""
        username = self.app.settings_manager.get("os_username", "")
        password = self.app.settings_manager.get("os_password", "")
        api_key = self.app.settings_manager.get("os_api_key", "")
        return username, password, api_key

    def start_local_download(self):
        """Start file-based subtitle search."""
        if not self.selected_file:
            messagebox.showwarning("Warning", "Please select a video file first.")
            return
            
        creds = self._get_credentials()
        
        if self.is_searching: return
        self._set_loading(True)
        self.status_label.config(text="Scanning video and searching...", bootstyle="info")
        
        lang_code = self.languages_dict.get(self.local_lang_var.get(), "eng")
        threading.Thread(target=self._local_download_worker, args=(self.selected_file, lang_code, *creds), daemon=True).start()

    def _local_download_worker(self, video_path, lang_str, user, pwd, key):
        """Worker for local file search."""
        try:
            lang_codes = [l.strip() for l in lang_str.split(',') if l.strip()]
            languages = {Language(l) for l in lang_codes}
            video = subliminal.scan_video(video_path)
            
            configs = {'opensubtitlescom': {'username': user, 'password': pwd, 'apikey': key}}
            subtitles = subliminal.download_best_subtitles([video], languages, provider_configs=configs)
            
            if video in subtitles and subtitles[video]:
                subliminal.save_subtitles(video, subtitles[video])
                self._update_status(f"Successfully downloaded {len(subtitles[video])} subtitle(s)!", "success")
            else:
                self._update_status("No matching subtitles found for this file.", "warning")
        except Exception as e:
            self._update_status(f"Error: {str(e)}", "danger")
        finally:
            self._on_finish()

    def start_manual_search(self):
        """Start title-based subtitle search."""
        query = self.search_entry.get().strip()
        if not query:
            return
            
        creds = self._get_credentials()
        
        if self.is_searching: return
        self._set_loading(True)
        self.tree.delete(*self.tree.get_children())
        self.search_results = []
        self.status_label.config(text=f"Searching for '{query}'...", bootstyle="info")
        
        lang_code = self.languages_dict.get(self.manual_lang_var.get(), "eng")
        
        threading.Thread(
            target=self._manual_search_worker, 
            args=(query, lang_code, *creds), 
            daemon=True
        ).start()

    def _manual_search_worker(self, query, lang_str, user, pwd, key):
        """Worker for title search using OpenSubtitles.com."""
        try:
            from subliminal.video import Movie
            from subliminal.providers.opensubtitlescom import OpenSubtitlesComProvider
            
            lang_codes = [l.strip() for l in lang_str.split(',') if l.strip()]
            languages = {Language(l) for l in lang_codes}
            
            # Simplified search using Movie object with title
            video = Movie('manual_search.mp4', query)
            
            all_results = []
            
            if user and pwd:
                print(f"DEBUG: Searching OpenSubtitles.com for '{query}'...")
                try:
                    os_provider = OpenSubtitlesComProvider(user, pwd, apikey=key)
                    os_provider.initialize()
                    os_results = os_provider.list_subtitles(video, languages)
                    print(f"DEBUG: OpenSubtitles.com found {len(os_results)} subtitles.")
                    all_results.extend(os_results)
                except Exception as e:
                    print(f"ERROR: OpenSubtitles manual search failed: {str(e)}")
                    if hasattr(self.app, 'logger'):
                        self.app.logger.warning(f"OpenSubtitles manual search failed: {str(e)}")
            
            self.search_results = all_results
            self.after(0, lambda r=all_results: self._populate_results(r))
            self._update_status(f"Found {len(all_results)} results.", "success" if all_results else "warning")
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            self._update_status(f"Search Error: {str(e)}", "danger")
        finally:
            self._on_finish()

    def _populate_results(self, results):
        """Populate Treeview with results."""
        self.tree.delete(*self.tree.get_children())
        for i, sub in enumerate(results):
            # Resilient attribute access
            lang = getattr(sub, 'language', 'N/A')
            provider = getattr(sub, 'provider_name', 'N/A')
            fname = getattr(sub, 'filename', getattr(sub, 'file_name', 'N/A'))
            sub_id = getattr(sub, 'id', getattr(sub, 'subtitle_id', 'N/A'))
            
            self.tree.insert("", END, iid=str(i), values=(
                lang, 
                provider, 
                fname, 
                sub_id
            ))
        self.download_manual_btn.config(state=NORMAL if results else DISABLED)

    def download_selected_manual(self):
        """Download the selected subtitle from the Treeview."""
        selected = self.tree.selection()
        if not selected: return
        
        idx = int(selected[0])
        subtitle = self.search_results[idx]
        
        creds = self._get_credentials()
        
        self._set_loading(True)
        self.status_label.config(text="Downloading selected subtitle...", bootstyle="info")
        threading.Thread(target=self._manual_download_worker, args=(subtitle, *creds), daemon=True).start()

    def _manual_download_worker(self, subtitle, user, pwd, key):
        """Worker for manual download with OpenSubtitles.com."""
        try:
            from subliminal.providers.opensubtitlescom import OpenSubtitlesComProvider
            
            print(f"DEBUG: Starting download from OpenSubtitles.com")
            provider = OpenSubtitlesComProvider(user, pwd, apikey=key)
                
            provider.initialize()
            content = provider.get_subtitle_content(subtitle)
            
            # Save to disk
            ext = ".srt"
            filename = getattr(subtitle, 'filename', getattr(subtitle, 'file_name', f"subtitle_{getattr(subtitle, 'id', 'new')}"))
            if not filename.endswith(ext): filename += ext
            
            save_path = os.path.join(self.manual_save_dir, filename)
            print(f"DEBUG: Saving subtitle to: {save_path}")
            with open(save_path, 'wb') as f:
                f.write(content)
            
            self._update_status(f"Saved: {filename}", "success")
            print(f"DEBUG: Download successful: {filename}")
        except Exception as e:
            self._update_status(f"Download Error: {str(e)}", "danger")
        finally:
            self._on_finish()

    def _set_loading(self, is_loading):
        """Set UI to loading state."""
        self.is_searching = is_loading
        state = DISABLED if is_loading else NORMAL
        self.local_download_btn.config(state=state)
        # We don't disable manual search button to allow interruption
        if is_loading:
            self.progress.start()
        else:
            self.progress.stop()

    def _update_status(self, text, style="info"):
        """Update status label safely."""
        self.after(0, lambda t=text, s=style: self.status_label.config(text=t, bootstyle=s))
        
    def _on_finish(self):
        """Cleanup after process."""
        self.after(0, lambda: self._set_loading(False))

    def _on_manual_tree_select(self, event=None):
        """Handle manual tree selection."""
        selection = self.tree.selection()
        if selection:
            self.download_manual_btn.config(state=NORMAL)
        else:
            self.download_manual_btn.config(state=DISABLED)

    def _on_local_tree_select(self, event=None):
        """Handle local tree selection."""
        pass
