"""
Search Screen for Klyp Video Downloader.
Provides video search functionality.
"""

# Standard library imports
import logging
import threading
import tkinter as tk
from tkinter import messagebox

# Third-party imports
import ttkbootstrap as ttk
from ttkbootstrap.constants import *

# Local imports
from controllers.search_manager import SearchManager
from models import VideoInfo, DownloadStatus
from utils.advanced_search_panel import AdvancedSearchPanel
from utils.batch_compare_dialog import BatchCompareDialog
from utils.event_bus import EventBus, Event, EventType
from utils.metadata_tooltip import MetadataTooltip
from utils.platform_health_indicator import PlatformHealthIndicator
from utils.quality_dialog import QualityDialog
from utils.safe_callback_mixin import SafeCallbackMixin
from utils.series_dialog import SeriesDetectionDialog


class SearchScreen(SafeCallbackMixin, ttk.Frame):
    """Search screen with search input and results display."""
    
    def __init__(self, parent, app, event_bus: EventBus = None):
        """
        Initialize SearchScreen.
        
        Args:
            parent: Parent widget.
            app: Main application instance.
            event_bus: EventBus instance for event subscriptions (optional).
        """
        ttk.Frame.__init__(self, parent)
        SafeCallbackMixin.__init__(self)
        self.app = app
        self.event_bus = event_bus
        self.search_manager = SearchManager()
        self.search_results = []
        self.logger = logging.getLogger("Klyp.SearchScreen")
        self.expanded_items = {}  # Track expanded items and their metadata tooltips
        self.enrichment_enabled = False  # DISABLED by default to prevent freezing
        self.advanced_search_visible = False  # Track advanced search panel visibility
        self.advanced_panel = None  # Will hold the AdvancedSearchPanel instance
        self.trending_cache = {}  # Cache for trending results
        self.trending_cache_ttl = 900  # 15 minutes in seconds
        self._subscription_ids = []  # Track event subscriptions for cleanup
        self.setup_ui()
    
    def setup_ui(self):
        """Set up the search screen UI."""
        # Main container with padding
        container = ttk.Frame(self, padding=20)
        container.pack(fill=BOTH, expand=YES)
        
        # Header Section
        header_frame = ttk.Frame(container)
        header_frame.pack(fill=X, pady=(0, 20))
        
        title_label = ttk.Label(
            header_frame,
            text="Search Videos",
            font=("Segoe UI", 20, "bold")
        )
        title_label.pack(anchor=W)
        
        # Search Input Section
        input_section = ttk.Labelframe(
            container,
            text="Search Query",
            padding=15,
            bootstyle="secondary"
        )
        input_section.pack(fill=X, pady=(0, 20))
        
        input_row = ttk.Frame(input_section)
        input_row.pack(fill=X)
        
        self.search_entry = ttk.Entry(
            input_row,
            font=("Segoe UI", 11),
        )
        self.search_entry.pack(side=LEFT, fill=X, expand=YES, padx=(0, 10))
        self.search_entry.bind("<Return>", lambda e: self.perform_search())
        
        self.search_button = ttk.Button(
            input_row,
            text=" Search",
            image=self.app.icons_light.get("search"),
            compound=LEFT,
            command=self.perform_search,
            style="success.TButton",
            width=15
        )
        self.search_button.pack(side=LEFT)
        
        # Filters Section
        filters_frame = ttk.Labelframe(
            container,
            text="Search Filters",
            padding=15,
            bootstyle="secondary"
        )
        filters_frame.pack(fill=X, pady=(0, 20))
        
        # Region Filter
        ttk.Label(filters_frame, text="Region:").pack(side=LEFT, padx=(0, 5))
        self.region_var = ttk.StringVar(value="wt-wt")
        ttk.Combobox(
            filters_frame,
            textvariable=self.region_var,
            values=["wt-wt", "us-en", "ru-ru", "de-de", "fr-fr"],
            state="readonly",
            width=10
        ).pack(side=LEFT, padx=(0, 20))
        
        # Domain Filter
        ttk.Label(filters_frame, text="Domain:").pack(side=LEFT, padx=(0, 5))
        self.domain_var = ttk.StringVar(value="All")
        self.domain_combo = ttk.Combobox(
            filters_frame,
            textvariable=self.domain_var,
            values=[
                "All",
                "--- Video Streaming ---",
                "YouTube",
                "Vimeo",
                "Dailymotion",
                "OK.ru",
                "Rumble",
                "--- Anime ---",
                "Bilibili",
                "Niconico",
                "Crunchyroll",
                "--- Music ---",
                "SoundCloud",
                "Bandcamp",
                "Audiomack",
                "Mixcloud",
                "--- Social Media ---",
                "TikTok",
                "Instagram",
                "Twitter",
                "Reddit",
                "--- Gaming ---",
                "Twitch",
                "--- Podcasts ---",
                "Spotify"
            ],
            state="readonly",
            width=20
        )
        self.domain_combo.pack(side=LEFT)
        
        # Platform health status cache
        self.platform_health_status = {}
        
        # Results Section (no tabs, just direct results)
        results_container = ttk.Frame(container)
        results_container.pack(fill=BOTH, expand=YES, pady=(0, 10))
        
        self._setup_search_results_tab(results_container)
        
        # Progress bar for long-running operations (initially hidden)
        self.progress_frame = ttk.Frame(container)
        # Don't pack it yet - will be shown when needed
        
        self.progress_bar = ttk.Progressbar(
            self.progress_frame,
            mode='indeterminate',
            bootstyle="success-striped",
            length=400
        )
        self.progress_bar.pack(pady=5)
        
        self.progress_label = ttk.Label(
            self.progress_frame,
            text="Processing...",
            font=("Segoe UI", 9),
            foreground="#10b981"
        )
        self.progress_label.pack()
        
        # Status label
        self.status_label = ttk.Label(
            container,
            text="Enter a search query to find videos",
            font=("Segoe UI", 9),
            foreground="#888888"
        )
        self.status_label.pack(pady=(10, 0))
        
        # Subscribe to search events if EventBus is available
        self._subscribe_to_events()
    
    def _subscribe_to_events(self):
        """Subscribe to relevant events from the EventBus."""
        # Use event_bus passed to constructor
        if self.event_bus:
            # Subscribe to SEARCH_COMPLETE
            sub_id = self.event_bus.subscribe(EventType.SEARCH_COMPLETE, self._on_search_complete_event)
            self._subscription_ids.append(sub_id)
            self.logger.debug(f"Subscribed to SEARCH_COMPLETE with ID {sub_id}")
            
            # Subscribe to SEARCH_FAILED
            sub_id = self.event_bus.subscribe(EventType.SEARCH_FAILED, self._on_search_failed_event)
            self._subscription_ids.append(sub_id)
            self.logger.debug(f"Subscribed to SEARCH_FAILED with ID {sub_id}")
        else:
            self.logger.warning("EventBus not available, skipping event subscriptions")
    
    def _on_search_complete_event(self, event: Event):
        """Handle SEARCH_COMPLETE event from EventBus."""
        try:
            query = event.data.get('query', '')
            results = event.data.get('results', [])
            
            self.logger.info(f"Received SEARCH_COMPLETE event for query: {query}")
            # Update UI with search results
            self.display_results(results)
            self.status_label.config(
                text=f"Search complete: {len(results)} result(s) found",
                foreground="#10b981"
            )
        except tk.TclError as e:
            # Widget was destroyed - ignore
            self.logger.debug(f"TclError in _on_search_complete_event: {e}")
        except Exception as e:
            # Log other errors but don't crash
            self.logger.error(f"Error in _on_search_complete_event: {e}", exc_info=True)
    
    def _on_search_failed_event(self, event: Event):
        """Handle SEARCH_FAILED event from EventBus."""
        try:
            query = event.data.get('query', '')
            error = event.data.get('error', 'Unknown error')
            
            self.logger.error(f"Received SEARCH_FAILED event for query: {query}, error: {error}")
            # Update UI with error
            self.status_label.config(
                text=f"Search failed: {error}",
                foreground="#ef4444"
            )
        except tk.TclError as e:
            # Widget was destroyed - ignore
            self.logger.debug(f"TclError in _on_search_failed_event: {e}")
        except Exception as e:
            # Log other errors but don't crash
            self.logger.error(f"Error in _on_search_failed_event: {e}", exc_info=True)
    
    def toggle_advanced_search(self):
        """Toggle the visibility of the advanced search panel."""
        if self.advanced_search_visible:
            # Hide the panel
            self.advanced_panel_container.pack_forget()
            self.advanced_toggle_btn.config(text="⚙️ Advanced", bootstyle="info-outline")
            self.advanced_search_visible = False
        else:
            # Show the panel (insert it after filters_frame, before tabs)
            self.advanced_panel_container.pack(fill=X, pady=(0, 20), after=self.tabs_notebook.master.master)
            self.advanced_toggle_btn.config(text="⚙️ Advanced ✓", bootstyle="info")
            self.advanced_search_visible = True
    
    def _on_advanced_query_change(self, operators_config):
        """Callback when advanced search operators change."""
        # This can be used to provide real-time feedback if needed
        pass
    
    def _setup_search_results_tab(self, parent_container):
        """Set up the search results tab content."""
        # Results Section with frame
        results_section = ttk.Labelframe(
            parent_container,
            text="Search Results",
            padding=15,
            bootstyle="secondary"
        )
        results_section.pack(fill=BOTH, expand=YES, pady=(0, 10))
        
        # Results container with scrollbar
        list_container = ttk.Frame(results_section)
        list_container.pack(fill=BOTH, expand=YES)
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(list_container, bootstyle="round")
        
        # Results treeview - removed "category" column
        self.results_tree = ttk.Treeview(
            list_container,
            columns=("expand", "title", "author", "duration", "platform"),
            show="tree headings",
            selectmode=BROWSE,
            yscrollcommand=scrollbar.set
        )
        self.results_tree.pack(side=LEFT, fill=BOTH, expand=YES)
        scrollbar.pack(side=RIGHT, fill=Y)
        scrollbar.config(command=self.results_tree.yview)
        
        # Configure columns
        self.results_tree.column("#0", width=40, stretch=NO)
        self.results_tree.column("expand", width=30, stretch=NO)
        self.results_tree.column("title", width=400, stretch=YES)
        self.results_tree.column("author", width=150, stretch=NO)
        self.results_tree.column("duration", width=80, stretch=NO)
        self.results_tree.column("platform", width=100, stretch=NO)
        
        # Configure headings
        self.results_tree.heading("#0", text="#")
        self.results_tree.heading("expand", text="▼")
        self.results_tree.heading("title", text="Title")
        self.results_tree.heading("author", text="Author")
        self.results_tree.heading("duration", text="Duration")
        self.results_tree.heading("platform", text="Platform")
        
        # Bind double-click and single-click for expand
        self.results_tree.bind("<Double-Button-1>", self.add_selected_to_queue)
        self.results_tree.bind("<Button-1>", self._on_tree_click)
        
        # Action buttons
        button_frame = ttk.Frame(results_section)
        button_frame.pack(fill=X, pady=(10, 0))
        
        add_btn = ttk.Button(
            button_frame,
            text=" Add to Queue",
            image=self.app.icons_light.get("plus"),
            compound=LEFT,
            command=self.add_selected_to_queue,
            style="success.TButton",
            width=20
        )
        add_btn.pack(side=LEFT, padx=(0, 10))
        
        clear_btn = ttk.Button(
            button_frame,
            text="Clear Results",
            command=self.clear_results,
            bootstyle="secondary",
            width=15
        )
        clear_btn.pack(side=LEFT)
    
    def _setup_recommended_tab(self):
        """Set up the recommended tab content."""
        from utils.recommendations_panel import RecommendationsPanel
        
        self.recommendations_panel = RecommendationsPanel(
            self.recommended_tab,
            self.app,
            on_add_callback=self._add_recommendation_to_queue
        )
        self.recommendations_panel.pack(fill=BOTH, expand=YES, padx=10, pady=10)
    
    def _setup_trending_tab(self):
        """Set up the trending tab content."""
        from utils.trending_tab import TrendingTab
        
        self.trending_panel = TrendingTab(
            self.trending_tab,
            self.search_manager,
            on_add_to_queue=self._add_trending_to_queue
        )
        self.trending_panel.pack(fill=BOTH, expand=YES)
    
    def _on_tab_changed(self, event):
        """Handle tab change event."""
        current_tab = self.tabs_notebook.index(self.tabs_notebook.select())
        
        # If Recommended tab is selected, load recommendations
        if current_tab == 1:  # Recommended tab
            self._load_recommendations()
        # If Trending tab is selected, load trending content
        elif current_tab == 2:  # Trending tab
            self._load_trending_with_cache()
    
    def _load_recommendations(self):
        """Load recommendations when tab is opened."""
        # Get history from app
        if hasattr(self.app, 'history_screen') and hasattr(self.app.history_screen, 'history_items'):
            history_items = self.app.history_screen.history_items
            self.recommendations_panel.load_recommendations(history_items)
        else:
            # No history available
            self.recommendations_panel.info_label.config(
                text="No download history available. Download some videos to get personalized recommendations!",
                foreground="#f59e0b"
            )
    
    def _add_recommendation_to_queue(self, result):
        """Add a recommended video to the queue."""
        url = result.get('url')
        title = result.get('title', 'video')
        
        if not url:
            return
        
        # Show loading status
        self.status_label.config(text=f"Fetching available qualities for '{title}'...", foreground="#3498db")
        
        # Run metadata fetch in background thread
        threading.Thread(
            target=self._fetch_formats_and_add,
            args=(url, title),
            daemon=True
        ).start()
    
    def _load_trending_with_cache(self):
        """Load trending content with 15-minute cache."""
        from datetime import datetime
        
        # Check if we have cached trending results
        current_category = self.trending_panel.current_category
        cache_key = f"trending_{current_category}"
        
        if cache_key in self.trending_cache:
            cached_time, cached_results = self.trending_cache[cache_key]
            
            # Check if cache is still valid (15 minutes)
            time_elapsed = (datetime.now() - cached_time).total_seconds()
            
            if time_elapsed < self.trending_cache_ttl:
                self.logger.info(f"Using cached trending results for {current_category}")
                # Use cached results
                self.trending_panel.trending_results = cached_results
                self.trending_panel._display_results()
                return
        
        # Cache miss or expired - load fresh trending content
        self.logger.info(f"Loading fresh trending content for {current_category}")
        self.trending_panel.load_trending()
    
    def _add_trending_to_queue(self, url, title, platform):
        """Add a trending video to the queue."""
        if not url:
            return
        
        # Show loading status
        self.status_label.config(text=f"Fetching available qualities for '{title}'...", foreground="#3498db")
        
        # Run metadata fetch in background thread
        threading.Thread(
            target=self._fetch_formats_and_add,
            args=(url, title),
            daemon=True
        ).start()
    
    def perform_search(self):
        """Perform video search in background."""
        query = self.search_entry.get().strip()
        
        if not query:
            messagebox.showwarning("Empty Query", "Please enter a search query")
            return
            
        # Get filter values (only region and domain now)
        region = self.region_var.get()
        site = self._get_clean_domain_value()
        
        # Set default values for removed filters
        timelimit = None
        duration = None
        content_type = "All"
        min_quality = None
        format_type = None
        use_advanced = False
        operators_config = None
        
        # UI Updates
        self.clear_results()
        self.status_label.config(text=f"Searching for: {query}...", foreground="#10b981")
        self.search_button.config(state="disabled")
        self.search_entry.config(state="disabled")
        
        # Run search in thread
        import threading
        threading.Thread(
            target=self._perform_search_thread, 
            args=(query, region, timelimit, duration, site, content_type, min_quality, format_type, use_advanced, operators_config), 
            daemon=True
        ).start()
    
    def search_with_preset(self, preset_name):
        """Perform search using a content preset."""
        query = self.search_entry.get().strip()
        
        if not query:
            messagebox.showinfo(
                f"{preset_name} Search",
                f"Enter a search term for {preset_name} content"
            )
            self.search_entry.focus()
            return
        
        # Update status
        self.status_label.config(
            text=f"Searching {preset_name} platforms...",
            foreground="#10b981"
        )
        
        # Clear previous results
        self.clear_results()
        self.search_button.config(state="disabled")
        self.search_entry.config(state="disabled")
        
        # Run preset search in thread
        import threading
        threading.Thread(
            target=self._preset_search_worker,
            args=(preset_name, query),
            daemon=True
        ).start()
    
    def _preset_search_worker(self, preset_name, query):
        """Background worker for preset search."""
        try:
            # Check if widget is still alive before starting
            if self.is_destroyed():
                self.logger.debug("Widget destroyed, skipping preset search")
                return
            
            results = self.search_manager.search_preset(
                preset_name=preset_name,
                query=query,
                limit=50,
                region=self.region_var.get()
            )
            
            # Check again before scheduling callback
            if self.is_destroyed():
                self.logger.debug("Widget destroyed during preset search, skipping callback")
                return
            
            self.safe_after(0, lambda r=results: self._on_search_complete(r))
        except Exception as e:
            # Check if widget is still alive before scheduling error callback
            if not self.is_destroyed():
                self.safe_after(0, lambda err=e: self._on_search_error(str(err)))
    def _perform_search_thread(self, query, region, timelimit, duration, site, content_type, min_quality=None, format_type=None, use_advanced=False, operators_config=None):
        """Perform search in background thread."""
        try:
            # Check if widget is still alive before starting
            if self.is_destroyed():
                self.logger.debug("Widget destroyed, skipping search")
                return
            
            # Use advanced search if operators are configured
            if use_advanced and operators_config:
                results = self.search_manager.search_advanced(
                    base_query=query,
                    exact_phrases=operators_config.get('exact_phrases'),
                    exclude_terms=operators_config.get('exclude_terms'),
                    or_terms=operators_config.get('or_terms'),
                    must_contain=operators_config.get('must_contain'),
                    site=operators_config.get('site'),
                    filetype=operators_config.get('filetype'),
                    intitle_terms=operators_config.get('intitle_terms'),
                    inurl_terms=operators_config.get('inurl_terms'),
                    limit=50,
                    region=region,
                    timelimit=timelimit,
                    duration=duration
                )
            # Use quality-filtered search if filters are active
            elif min_quality or format_type:
                results = self.search_manager.search_with_quality_filter(
                    query=query,
                    min_quality=min_quality,
                    format_type=format_type,
                    region=region,
                    timelimit=timelimit,
                    duration=duration,
                    site=site,
                    content_type=content_type
                )
            else:
                results = self.search_manager.search(
                    query=query, 
                    region=region, 
                    timelimit=timelimit, 
                    duration=duration,
                    site=site,
                    content_type=content_type
                )
            
            # Check again before scheduling callback
            if self.is_destroyed():
                self.logger.debug("Widget destroyed during search, skipping callback")
                return
            
            # Schedule UI update on main thread
            self.safe_after(0, lambda r=results, q=query: self._on_search_complete(r, q))
        except Exception as e:
            # Check if widget is still alive before scheduling error callback
            if not self.is_destroyed():
                self.safe_after(0, lambda err=e: self._on_search_error(str(err)))
            
    def _on_search_complete(self, results, query=None):
        """Handle search completion on main thread."""
        try:
            self.search_button.config(state="normal")
            self.search_entry.config(state="normal")
            self.display_results(results)
            
            # ENRICHMENT DISABLED BY DEFAULT - it causes freezing
            # Users can enable it in settings if they want metadata
            if self.enrichment_enabled and results:
                self.logger.info("Metadata enrichment is enabled, starting background enrichment")
                self.status_label.config(
                    text=f"Found {len(results)} result(s). Enriching metadata...",
                    foreground="#10b981"
                )
                # Show progress bar for enrichment
                self.show_progress(f"Enriching metadata for {len(results)} results...")
                
                threading.Thread(
                    target=self._enrich_results_thread,
                    args=(results,),
                    daemon=True
                ).start()
            else:
                # Just show results count without enrichment
                self.status_label.config(
                    text=f"Found {len(results)} result(s)",
                    foreground="#10b981"
                )
            
            # Check for series detection if query is provided
            if query:
                self._check_series_detection(query, results)
        except tk.TclError as e:
            # Widget was destroyed - ignore
            self.logger.debug(f"TclError in _on_search_complete: {e}")
        except Exception as e:
            # Log other errors but don't crash
            self.logger.error(f"Error in _on_search_complete: {e}", exc_info=True)
        
    def _on_search_error(self, error_msg):
        """Handle search error on main thread."""
        try:
            self.search_button.config(state="normal")
            self.search_entry.config(state="normal")
            self.status_label.config(text=f"Error: {error_msg}", foreground="#ef4444")
            messagebox.showerror("Search Error", f"Search failed: {error_msg}")
        except tk.TclError as e:
            # Widget was destroyed - ignore
            self.logger.debug(f"TclError in _on_search_error: {e}")
        except Exception as e:
            # Log other errors but don't crash
            self.logger.error(f"Error in _on_search_error: {e}", exc_info=True)
    
    def _enrich_results_thread(self, results):
        """Enrich search results with metadata in background thread."""
        try:
            # Check if widget is still alive before starting
            if self.is_destroyed():
                self.logger.debug("Widget destroyed, skipping enrichment")
                return
            
            enriched_results = self.search_manager.enrich_results_batch(results, max_workers=5)
            
            # Check again before scheduling callback
            if self.is_destroyed():
                self.logger.debug("Widget destroyed during enrichment, skipping callback")
                return
            
            # Update search_results with enriched data
            self.safe_after(0, lambda r=enriched_results: self._on_enrichment_complete(r))
        except Exception as e:
            self.logger.error(f"Enrichment failed: {e}")
            # Check if widget is still alive before scheduling error callback
            if not self.is_destroyed():
                self.safe_after(0, lambda: self._on_enrichment_error(str(e)))
    
    def _on_enrichment_complete(self, enriched_results):
        """Handle enrichment completion on main thread."""
        try:
            # Hide progress bar
            self.hide_progress()
            
            # Update search_results with enriched data
            self.search_results = enriched_results
            
            # Count successful enrichments
            successful = sum(1 for r in enriched_results if not r.get('enrichment_failed', True))
            
            self.status_label.config(
                text=f"Found {len(enriched_results)} result(s). Metadata enriched for {successful} videos.",
                foreground="#10b981"
            )
            
            # Auto-hide status after 5 seconds
            self.safe_after(5000, lambda: self._safe_update_status(
                "Enter a search query to find videos",
                "#888888"
            ))
        except tk.TclError as e:
            # Widget was destroyed - ignore
            self.logger.debug(f"TclError in _on_enrichment_complete: {e}")
        except Exception as e:
            # Log other errors but don't crash
            self.logger.error(f"Error in _on_enrichment_complete: {e}", exc_info=True)
    
    def _on_enrichment_error(self, error_msg):
        """Handle enrichment error on main thread."""
        try:
            # Hide progress bar
            self.hide_progress()
            
            self.logger.warning(f"Enrichment error: {error_msg}")
            self.status_label.config(
                text=f"Search complete. Metadata enrichment failed.",
                foreground="#f59e0b"
            )
        except tk.TclError as e:
            # Widget was destroyed - ignore
            self.logger.debug(f"TclError in _on_enrichment_error: {e}")
        except Exception as e:
            # Log other errors but don't crash
            self.logger.error(f"Error in _on_enrichment_error: {e}", exc_info=True)
    
    def _on_tree_click(self, event):
        """Handle click on tree item to expand/collapse metadata."""
        try:
            # Identify which column was clicked
            region = self.results_tree.identify_region(event.x, event.y)
            
            if region != "cell":
                return
            
            column = self.results_tree.identify_column(event.x)
            item = self.results_tree.identify_row(event.y)
            
            if not item:
                return
            
            # Check if expand column was clicked (column #1)
            if column == "#1":  # expand column
                self._toggle_metadata(item)
        except tk.TclError as e:
            # Widget was destroyed or invalid - ignore
            self.logger.debug(f"TclError in _on_tree_click: {e}")
        except Exception as e:
            # Log other errors but don't crash
            self.logger.error(f"Error in _on_tree_click: {e}", exc_info=True)
    
    def _toggle_metadata(self, item_id):
        """Toggle metadata display for a result item."""
        try:
            if item_id in self.expanded_items:
                # Collapse: remove metadata tooltip
                tooltip_frame = self.expanded_items[item_id]
                if self.results_tree.exists(tooltip_frame):
                    self.results_tree.delete(tooltip_frame)
                del self.expanded_items[item_id]
                
                # Update expand indicator
                if self.results_tree.exists(item_id):
                    values = list(self.results_tree.item(item_id, "values"))
                    values[0] = "▶"
                    self.results_tree.item(item_id, values=values)
            else:
                # Expand: show metadata tooltip
                self._show_metadata_for_item(item_id)
        except tk.TclError as e:
            # Widget was destroyed or invalid - ignore
            self.logger.debug(f"TclError in _toggle_metadata: {e}")
        except Exception as e:
            # Log other errors but don't crash
            self.logger.error(f"Error in _toggle_metadata: {e}", exc_info=True)
    
    def _show_metadata_for_item(self, item_id):
        """Show metadata tooltip for a result item."""
        # Find the result data
        item_index = self.results_tree.index(item_id)
        
        if item_index >= len(self.search_results):
            return
        
        result = self.search_results[item_index]
        
        # Check if metadata is available
        if not result.get('view_count') and not result.get('enrichment_failed'):
            # Metadata not yet enriched
            self.status_label.config(
                text="Metadata not yet available. Please wait for enrichment to complete.",
                foreground="#f59e0b"
            )
            return
        
        # Create a child item with metadata tooltip
        tooltip_id = self.results_tree.insert(
            item_id,
            END,
            text="",
            values=("", "", "", "", "", "")
        )
        
        # Store the tooltip reference
        self.expanded_items[item_id] = tooltip_id
        
        # Update expand indicator
        values = list(self.results_tree.item(item_id, "values"))
        values[0] = "▼"
        self.results_tree.item(item_id, values=values)
        
        # Create and display metadata tooltip
        # Note: Treeview doesn't support embedding widgets directly,
        # so we'll display metadata as text in child items
        self._display_metadata_as_text(tooltip_id, result)
    
    def _display_metadata_as_text(self, tooltip_id, result):
        """Display metadata as text in child tree items."""
        metadata_lines = []
        
        if result.get('enrichment_failed', False):
            metadata_lines.append("⚠️ Metadata unavailable")
        else:
            # Stats line
            stats_parts = []
            view_count = result.get('view_count', 0)
            if view_count > 0:
                stats_parts.append(f"👁️ {self._format_number(view_count)} views")
            
            like_count = result.get('like_count', 0)
            if like_count > 0:
                stats_parts.append(f"👍 {self._format_number(like_count)} likes")
            
            upload_date = result.get('upload_date', '')
            if upload_date:
                from datetime import datetime
                try:
                    if len(upload_date) == 8:
                        date_obj = datetime.strptime(upload_date, "%Y%m%d")
                        formatted_date = date_obj.strftime("%b %d, %Y")
                        stats_parts.append(f"📅 {formatted_date}")
                except Exception:
                    pass
            
            if stats_parts:
                metadata_lines.append(" | ".join(stats_parts))
            
            # Description
            description = result.get('description', '')
            if description:
                metadata_lines.append(f"Description: {description}")
            
            # Tags
            tags = result.get('tags', [])
            if tags:
                tags_str = ", ".join([f"🏷️ {tag}" for tag in tags])
                metadata_lines.append(f"Tags: {tags_str}")
            
            # Qualities
            qualities = result.get('available_qualities', [])
            if qualities:
                quality_str = ", ".join([f"{q}p" for q in qualities])
                metadata_lines.append(f"🎬 Available: {quality_str}")
        
        # Add each line as a child item
        for line in metadata_lines:
            self.results_tree.insert(
                tooltip_id,
                END,
                text="",
                values=("", "", line, "", "", "")
            )
    
    def _format_number(self, num: int) -> str:
        """Format large numbers with K, M, B suffixes."""
        if num >= 1_000_000_000:
            return f"{num / 1_000_000_000:.1f}B"
        elif num >= 1_000_000:
            return f"{num / 1_000_000:.1f}M"
        elif num >= 1_000:
            return f"{num / 1_000:.1f}K"
        else:
            return str(num)
    
    def _check_series_detection(self, query, results):
        """Check if query indicates a series and offer to find all episodes."""
        series_info = self.search_manager.detect_series(query)
        
        if not series_info:
            return  # Not a series query
        
        # Ask user if they want to search for all episodes
        base_query = series_info['base_query']
        detected_keyword = series_info['detected_keyword']
        
        msg = (f"Series detected in your search!\n\n"
               f"Base title: {base_query}\n"
               f"Keyword: {detected_keyword}\n\n"
               f"Would you like to search for all episodes?")
        
        if messagebox.askyesno("Series Detected", msg, parent=self):
            self._search_all_episodes(base_query, series_info)
    
    def _search_all_episodes(self, base_query, series_info):
        """Search for all episodes in background."""
        self.status_label.config(
            text=f"Searching for all episodes of '{base_query}'...",
            foreground="#10b981"
        )
        self.search_button.config(state="disabled")
        
        # Get current filters
        region = self.region_var.get()
        site = self._get_clean_domain_value()
        
        # Run episode search in thread
        threading.Thread(
            target=self._search_episodes_thread,
            args=(base_query, region, site, series_info),
            daemon=True
        ).start()
    
    def _search_episodes_thread(self, base_query, region, site, series_info):
        """Search for episodes in background thread."""
        try:
            # Check if widget is still alive before starting
            if self.is_destroyed():
                self.logger.debug("Widget destroyed, skipping episode search")
                return
            
            episodes = self.search_manager.find_all_episodes(
                base_query=base_query,
                max_episodes=24,
                region=region,
                site=site
            )
            
            # Check again before scheduling callback
            if self.is_destroyed():
                self.logger.debug("Widget destroyed during episode search, skipping callback")
                return
            
            if episodes:
                self.safe_after(0, lambda eps=episodes, bq=base_query: self._show_series_dialog(eps, bq))
            else:
                self.safe_after(0, lambda: self._on_no_episodes_found())
        except Exception as e:
            # Check if widget is still alive before scheduling error callback
            if not self.is_destroyed():
                self.safe_after(0, lambda err=e: self._on_search_error(str(err)))
    
    def _show_series_dialog(self, episodes, base_query):
        """Show series detection dialog with found episodes."""
        self.search_button.config(state="normal")
        self.status_label.config(
            text=f"Found {len(episodes)} episode results",
            foreground="#10b981"
        )
        
        # Show dialog
        dialog = SeriesDetectionDialog(self, episodes, base_query)
        self.wait_window(dialog)
        
        # Get selected episodes
        selected_episodes = dialog.get_selected_episodes()
        
        if selected_episodes:
            self._add_episodes_to_queue(selected_episodes, base_query)
        else:
            self.status_label.config(
                text="Series download cancelled",
                foreground="#888888"
            )
    
    def _on_no_episodes_found(self):
        """Handle case when no episodes are found."""
        self.search_button.config(state="normal")
        self.status_label.config(
            text="No additional episodes found",
            foreground="#888888"
        )
        messagebox.showinfo(
            "No Episodes Found",
            "Could not find additional episodes for this series.",
            parent=self
        )
    
    def _add_episodes_to_queue(self, episodes, series_name):
        """Add selected episodes to download queue."""
        # Show quality dialog once for all episodes
        dialog = QualityDialog(
            self,
            f"Series: {series_name}",
            ["1080p", "720p", "480p", "360p", "Audio Only"]
        )
        
        if not dialog.result:
            self.status_label.config(
                text="Series download cancelled",
                foreground="#888888"
            )
            return
        
        selected_quality = dialog.result
        
        # Add each episode to queue
        added_count = 0
        duplicate_count = 0
        
        for episode in episodes:
            url = episode.get('url')
            title = episode.get('title', 'Unknown')
            
            if not url:
                continue
            
            video_info = VideoInfo(
                url=url,
                title=title,
                selected_quality=selected_quality,
                download_subtitles=self.app.settings_manager.get("subtitle_download", False)
            )
            
            try:
                download_path = self.app.settings_manager.get_download_directory()
                self.app.queue_manager.add_task(
                    video_info=video_info,
                    download_path=download_path
                )
                added_count += 1
            except ValueError:
                # Duplicate video
                duplicate_count += 1
                continue
            except Exception as e:
                self.logger.warning(f"Failed to add episode to queue: {e}")
                continue
        
        # Save pending downloads
        if hasattr(self.app, 'save_pending_downloads'):
            self.app.save_pending_downloads()
        
        # Refresh queue screen
        if hasattr(self.app, 'queue_screen'):
            self.app.queue_screen.refresh_queue()
        
        # Show success message
        msg = f"Added {added_count} episode(s) to queue"
        if duplicate_count > 0:
            msg += f" ({duplicate_count} duplicate(s) skipped)"
        
        self.status_label.config(text=msg, foreground="#10b981")
        self.safe_after(5000, lambda: self.status_label.config(
            text="Enter a search query to find videos",
            foreground="#888888"
        ))
    
    def display_results(self, results):
        """
        Display search results in the treeview.
        
        Args:
            results: List of video result dictionaries.
        """
        try:
            self.search_results = results
            self.expanded_items = {}  # Clear expanded items
            
            # Add results to treeview
            for idx, result in enumerate(results, 1):
                title = result.get("title", "Unknown")
                author = result.get("author", "Unknown")
                duration = result.get("duration", "Unknown")
                platform = result.get("platform", "Unknown")
                url = result.get("url", "")
                
                # Detect if URL might be a playlist
                is_likely_playlist = self._is_playlist_url(url)
                
                # Add playlist indicator to title
                if is_likely_playlist:
                    title = f"📋 {title}"
                
                # Add available qualities to title if present
                available_qualities = result.get("available_qualities", [])
                if available_qualities:
                    quality_str = ", ".join(available_qualities[:3])  # Show top 3 qualities
                    title = f"{title} [{quality_str}]"
                
                # Map platform to icon for tree column
                platform_lower = platform.lower()
                if "youtube" in platform_lower:
                    icon = self.app.icons.get("youtube_logo")
                elif "ok.ru" in platform_lower:
                    icon = self.app.icons.get("okru_logo")
                elif "vimeo" in platform_lower:
                    icon = self.app.icons.get("vimeo_logo")
                else:
                    icon = self.app.icons.get("web_logo")
                
                # Insert row without category column
                item_id = self.results_tree.insert(
                    "",
                    END,
                    text=f" {idx}",
                    image=icon,
                    values=("▶", title, author, duration, platform),
                    tags=(url,)
                )
            
            if results:
                self.status_label.config(text=f"Found {len(results)} result(s)", foreground="#d4d4d4")
            else:
                self.status_label.config(text="No results found", foreground="#d4d4d4")
        except tk.TclError as e:
            # Widget was destroyed - ignore
            self.logger.debug(f"TclError in display_results: {e}")
        except Exception as e:
            # Log other errors but don't crash
            self.logger.error(f"Error in display_results: {e}", exc_info=True)
    
    def _is_playlist_url(self, url: str) -> bool:
        """
        Check if URL is likely a playlist based on URL patterns.
        
        Args:
            url: URL to check
            
        Returns:
            True if URL appears to be a playlist
        """
        if not url:
            return False
        
        url_lower = url.lower()
        
        # YouTube playlist patterns
        if 'youtube.com' in url_lower or 'youtu.be' in url_lower:
            if 'list=' in url_lower:
                return True
            if '/playlist' in url_lower:
                return True
        
        # Vimeo patterns
        if 'vimeo.com' in url_lower:
            if '/showcase/' in url_lower:
                return True
            if '/album/' in url_lower:
                return True
            if '/channels/' in url_lower:
                return True
        
        # Dailymotion patterns
        if 'dailymotion.com' in url_lower:
            if '/playlist/' in url_lower:
                return True
        
        # SoundCloud patterns
        if 'soundcloud.com' in url_lower:
            if '/sets/' in url_lower:
                return True
        
        # Generic patterns
        if 'playlist' in url_lower:
            return True
        if 'album' in url_lower:
            return True
        if 'collection' in url_lower:
            return True
        
        return False
    
    def add_selected_to_queue(self, event=None):
        """Add selected video to queue with quality selection."""
        try:
            selection = self.results_tree.selection()
            
            if not selection:
                messagebox.showwarning("No Selection", "Please select a video to add")
                return
            
            # Get selected item
            item = selection[0]
            
            # Check if item still exists
            if not self.results_tree.exists(item):
                return
            
            values = self.results_tree.item(item, "values")
            tags = self.results_tree.item(item, "tags")
            
            if not tags or not tags[0]:
                messagebox.showerror("Error", "Invalid video URL")
                return
            
            url = tags[0]
            title = values[1] if len(values) > 1 else "video"  # Title is now at index 1
            
            # Phase 2: Show loading status and fetch formats
            self.status_label.config(text=f"Fetching available qualities for '{title}'...", foreground="#3498db")
            
            # Run metadata fetch in background thread
            threading.Thread(
                target=self._fetch_formats_and_add,
                args=(url, title),
                daemon=True
            ).start()
        except tk.TclError as e:
            # Widget was destroyed or invalid - ignore
            self.logger.debug(f"TclError in add_selected_to_queue: {e}")
        except Exception as e:
            # Log other errors but don't crash
            self.logger.error(f"Error in add_selected_to_queue: {e}", exc_info=True)

    def _fetch_formats_and_add(self, url, title):
        """Identify available formats and show selection dialog."""
        try:
            # Check if widget is still alive
            if self.is_destroyed():
                self.logger.debug("Widget destroyed, skipping format fetch")
                return
            
            # Use downloader from app with timeout
            import concurrent.futures
            from threading import Thread
            
            downloader = self.app.download_manager.video_downloader
            
            # Create a future for the extraction with timeout
            executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
            future = executor.submit(downloader.extract_info, url)
            
            try:
                # Wait max 15 seconds for extraction
                result = future.result(timeout=15)
                
                # Check again if widget is still alive
                if self.is_destroyed():
                    self.logger.debug("Widget destroyed during format fetch, skipping callback")
                    return
                
                if result['type'] == 'playlist':
                    # Show playlist confirmation on main thread
                    self.safe_after(0, lambda r=result: self._show_playlist_confirm(r))
                else:
                    # Show quality dialog for single video on main thread
                    self.safe_after(0, lambda v=result['video_info']: self._show_quality_dialog(v))
                    
            except concurrent.futures.TimeoutError:
                # Timeout - show default quality options
                self.logger.warning(f"Timeout fetching formats for {url}, using defaults")
                if not self.is_destroyed():
                    self.safe_after(0, lambda: self._show_default_quality_dialog(url, title))
            finally:
                executor.shutdown(wait=False)
            
        except Exception as e:
            if not self.is_destroyed():
                self.safe_after(0, lambda msg=str(e): self._on_metadata_error(msg))

    def _show_playlist_confirm(self, playlist_info):
        """Confirm adding a playlist to the queue."""
        count = playlist_info['count']
        title = playlist_info['title']
        
        msg = f"Playlist detected: '{title}'\nContains {count} videos.\n\nDo you want to add all videos to the queue?"
        if messagebox.askyesno("Playlist Detected", msg):
            # Show a single quality dialog for the whole playlist?
            # Let's just use 'best' to keep it simple, or show one dialog.
            # Showing one dialog for the 'preference' is better.
            dialog = QualityDialog(self, f"Playlist: {title}", ["1080p", "720p", "480p", "360p", "Audio Only"])
            
            if dialog.result:
                self._add_playlist_to_queue(playlist_info, dialog.result)
            else:
                self.status_label.config(text="Enter a search query to find videos", foreground="#888888")
        else:
            self.status_label.config(text="Enter a search query to find videos", foreground="#888888")

    def _add_playlist_to_queue(self, playlist_info, selected_quality):
        """Add all entries from a playlist to the queue."""
        entries = playlist_info['entries']
        added_count = 0
        
        for entry in entries:
            url = entry.get('url') or entry.get('webpage_url')
            if not url: continue
            
            video_info = VideoInfo(
                url=url,
                title=entry.get('title', 'Unknown'),
                selected_quality=selected_quality
            )
            
            try:
                # Get download settings
                download_path = self.app.settings_manager.get_download_directory()
                video_info.download_subtitles = self.app.settings_manager.get("subtitle_download", False)
                
                self.app.queue_manager.add_task(
                    video_info=video_info,
                    download_path=download_path
                )
                added_count += 1
            except Exception:
                # Skip duplicates or errors
                continue
        
        if added_count > 0:
            # Save pending downloads
            if hasattr(self.app, 'save_pending_downloads'):
                self.app.save_pending_downloads()
            
            if hasattr(self.app, 'queue_screen'):
                self.app.queue_screen.refresh_queue()
            self.status_label.config(text=f"Added {added_count} videos from playlist to queue!", foreground="#10b981")
        else:
            self.status_label.config(text="No videos added from playlist", foreground="#ef4444")
            
        self.safe_after(5000, lambda: self.status_label.config(text="Enter a search query to find videos", foreground="#888888"))

    def _show_quality_dialog(self, video_info):
        """Show the quality selection dialog."""
        try:
            dialog = QualityDialog(self, video_info.title, video_info.available_qualities)
            
            if dialog.result:
                video_info.selected_quality = dialog.result
                self._finalize_add_to_queue(video_info)
            else:
                # User cancelled
                self.status_label.config(text="Enter a search query to find videos", foreground="#888888")
        except tk.TclError as e:
            self.logger.debug(f"TclError in _show_quality_dialog: {e}")
        except Exception as e:
            self.logger.error(f"Error in _show_quality_dialog: {e}", exc_info=True)
    
    def _show_default_quality_dialog(self, url, title):
        """Show quality dialog with default options when format fetch times out."""
        try:
            # Create VideoInfo with default qualities
            video_info = VideoInfo(
                url=url,
                title=title,
                available_qualities=["1080p", "720p", "480p", "360p", "Audio Only"]
            )
            
            dialog = QualityDialog(self, title, video_info.available_qualities)
            
            if dialog.result:
                video_info.selected_quality = dialog.result
                self._finalize_add_to_queue(video_info)
            else:
                # User cancelled
                self.status_label.config(text="Enter a search query to find videos", foreground="#888888")
        except tk.TclError as e:
            self.logger.debug(f"TclError in _show_default_quality_dialog: {e}")
        except Exception as e:
            self.logger.error(f"Error in _show_default_quality_dialog: {e}", exc_info=True)

    def _finalize_add_to_queue(self, video_info):
        """Complete the addition of task to queue."""
        try:
            # Get download settings
            download_path = self.app.settings_manager.get_download_directory()
            subtitle_download = self.app.settings_manager.get("subtitle_download", False)
            
            # Set subtitle preference
            video_info.download_subtitles = subtitle_download
            
            task = self.app.queue_manager.add_task(
                video_info=video_info,
                download_path=download_path
            )
            
            # Save pending downloads
            if hasattr(self.app, 'save_pending_downloads'):
                self.app.save_pending_downloads()
            
            # Refresh queue screen to show new task
            if hasattr(self.app, 'queue_screen'):
                self.app.queue_screen.refresh_queue()
            
            # We already have metadata, so no need to fetch again, 
            # but we might want to trigger any other background tasks if needed.
            # actually fetch_metadata in download_manager also updates the task status.
            # Let's just update the status ourselves or call it.
            
            # Non-blocking success notification
            self.status_label.config(text=f"Added '{video_info.title}' ({video_info.selected_quality}) to queue!", foreground="#10b981")
            self.safe_after(3000, lambda: self.status_label.config(text="Enter a search query to find videos", foreground="#888888"))
            
        except ValueError as e:
            messagebox.showerror("Error", str(e))
            self.status_label.config(text="Error: Video already in queue", foreground="#ef4444")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to add video to queue: {str(e)}")
            self.status_label.config(text="Error adding to queue", foreground="#ef4444")

    def _on_metadata_error(self, error_msg):
        """Handle error during pre-download metadata fetch."""
        self.status_label.config(text=f"Error fetching qualities: {error_msg}", foreground="#ef4444")
        messagebox.showerror("Metadata Error", f"Could not retrieve video formats: {error_msg}")
    
    def clear_results(self):
        """Clear all search results."""
        try:
            for item in self.results_tree.get_children():
                self.results_tree.delete(item)
            self.search_results = []
            self.expanded_items = {}
        except tk.TclError as e:
            # Widget was destroyed - ignore
            self.logger.debug(f"TclError in clear_results: {e}")
        except Exception as e:
            # Log other errors but don't crash
            self.logger.error(f"Error in clear_results: {e}", exc_info=True)

    def show_platform_comparison(self):
        """Show platform selection dialog and launch batch comparison."""
        query = self.search_entry.get().strip()
        
        if not query:
            messagebox.showwarning(
                "Empty Query",
                "Please enter a search query before comparing platforms",
                parent=self
            )
            return
        
        # Show platform selection dialog
        dialog = PlatformSelectionDialog(self)
        self.wait_window(dialog)
        
        selected_platforms = dialog.get_selected_platforms()
        
        if not selected_platforms:
            return  # User cancelled or didn't select any platforms
        
        # Start batch comparison in background
        self.status_label.config(
            text=f"Comparing '{query}' across {len(selected_platforms)} platforms...",
            foreground="#10b981"
        )
        
        # Show progress bar
        self.show_progress(f"Comparing across {len(selected_platforms)} platforms...")
        
        self.compare_btn.config(state="disabled")
        
        threading.Thread(
            target=self._perform_batch_comparison,
            args=(query, selected_platforms),
            daemon=True
        ).start()
    
    def _perform_batch_comparison(self, query, platforms):
        """Perform batch comparison in background thread."""
        try:
            # Get filter values
            region = self.region_var.get()
            timelimit_map = {"Any": None, "Day": "d", "Week": "w", "Month": "m", "Year": "y"}
            timelimit = timelimit_map.get(self.time_var.get())
            duration_map = {"Any": None, "Short": "short", "Medium": "medium", "Long": "long"}
            duration = duration_map.get(self.duration_var.get())
            
            # Execute comparison search
            platform_results = self.search_manager.compare_platforms(
                query=query,
                platforms=platforms,
                limit_per_platform=5,
                region=region,
                timelimit=timelimit,
                duration=duration
            )
            
            # Enrich results if enabled
            if self.enrichment_enabled:
                self.logger.info("Enriching comparison results...")
                enriched_platform_results = {}
                
                for platform_name, results in platform_results.items():
                    if results:
                        enriched_results = self.search_manager.enrich_results_batch(results, max_workers=3)
                        enriched_platform_results[platform_name] = enriched_results
                    else:
                        enriched_platform_results[platform_name] = []
                
                platform_results = enriched_platform_results
            
            # Rank results
            ranked_results = self.search_manager.rank_comparison_results(platform_results)
            
            # Show comparison dialog on main thread
            self.safe_after(0, lambda r=ranked_results: self._show_comparison_dialog(query, r))
            
        except Exception as e:
            self.logger.error(f"Batch comparison failed: {e}")
            self.safe_after(0, lambda err=str(e): self._on_comparison_error(err))
    
    def _show_comparison_dialog(self, query, ranked_results):
        """Show the batch comparison dialog."""
        # Hide progress bar
        self.hide_progress()
        
        self.compare_btn.config(state="normal")
        self.status_label.config(
            text="Comparison complete",
            foreground="#10b981"
        )
        
        # Show dialog
        dialog = BatchCompareDialog(
            self,
            query,
            ranked_results,
            on_add_callback=self._add_comparison_result_to_queue
        )
        
        # Auto-hide status after dialog closes
        self.safe_after(3000, lambda: self.status_label.config(
            text="Enter a search query to find videos",
            foreground="#888888"
        ))
    
    def _on_comparison_error(self, error_msg):
        """Handle comparison error."""
        # Hide progress bar
        self.hide_progress()
        
        self.compare_btn.config(state="normal")
        self.status_label.config(
            text=f"Comparison failed: {error_msg}",
            foreground="#ef4444"
        )
        messagebox.showerror(
            "Comparison Error",
            f"Failed to compare platforms: {error_msg}",
            parent=self
        )
    
    def _add_comparison_result_to_queue(self, result):
        """Add a comparison result to the download queue."""
        url = result.get('url')
        title = result.get('title', 'video')
        
        if not url:
            raise ValueError("Invalid video URL")
        
        # Show loading status
        self.status_label.config(
            text=f"Fetching available qualities for '{title}'...",
            foreground="#3498db"
        )
        
        # Run metadata fetch in background thread
        threading.Thread(
            target=self._fetch_formats_and_add,
            args=(url, title),
            daemon=True
        ).start()
    
    def refresh_platform_health(self):
        """Refresh platform health status for all platforms."""
        self.status_label.config(
            text="Checking platform health status...",
            foreground="#10b981"
        )
        
        # Show progress bar
        self.show_progress("Checking health of all platforms...")
        
        self.health_refresh_btn.config(state="disabled", text="⏳")
        
        # Run health check in background thread
        threading.Thread(
            target=self._check_platform_health_thread,
            daemon=True
        ).start()
    
    def _check_platform_health_thread(self):
        """Check platform health in background thread."""
        try:
            # Check if widget is still alive before starting
            if self.is_destroyed():
                self.logger.debug("Widget destroyed, skipping health check")
                return
            
            # Check health of all platforms
            health_results = self.search_manager.check_all_platforms_health()
            
            # Check again before scheduling callback
            if self.is_destroyed():
                self.logger.debug("Widget destroyed during health check, skipping callback")
                return
            
            # Update UI on main thread
            self.safe_after(0, lambda r=health_results: self._on_health_check_complete(r))
            
        except Exception as e:
            self.logger.error(f"Platform health check failed: {e}")
            # Check if widget is still alive before scheduling error callback
            if not self.is_destroyed():
                self.safe_after(0, lambda err=str(e): self._on_health_check_error(err))
    
    def _on_health_check_complete(self, health_results):
        """Handle health check completion on main thread."""
        # Hide progress bar
        self.hide_progress()
        
        self.platform_health_status = health_results
        
        # Update domain filter dropdown with health indicators
        self._update_domain_filter_with_health()
        
        # Re-enable refresh button
        self.health_refresh_btn.config(state="normal", text="🔄")
        
        # Count health statuses
        healthy_count = sum(1 for status in health_results.values() if status == "healthy")
        broken_count = sum(1 for status in health_results.values() if status == "broken")
        unknown_count = sum(1 for status in health_results.values() if status == "unknown")
        
        self.status_label.config(
            text=f"Platform health: {healthy_count} healthy, {broken_count} broken, {unknown_count} unknown",
            foreground="#10b981"
        )
        
        # Auto-hide status after 5 seconds
        self.safe_after(5000, lambda: self.status_label.config(
            text="Enter a search query to find videos",
            foreground="#888888"
        ))
    
    def _on_health_check_error(self, error_msg):
        """Handle health check error on main thread."""
        # Hide progress bar
        self.hide_progress()
        
        self.health_refresh_btn.config(state="normal", text="🔄")
        self.status_label.config(
            text=f"Health check failed: {error_msg}",
            foreground="#ef4444"
        )
        
        messagebox.showerror(
            "Health Check Error",
            f"Failed to check platform health: {error_msg}",
            parent=self
        )
    
    def _update_domain_filter_with_health(self):
        """Update domain filter dropdown to show health indicators."""
        # Get current platforms in dropdown
        base_platforms = ["All", "YouTube", "Vimeo", "Dailymotion", "OK.ru"]
        
        # Add health indicators to platform names
        updated_values = []
        for platform in base_platforms:
            if platform == "All":
                updated_values.append(platform)
            else:
                status = self.platform_health_status.get(platform, "unknown")
                icon = PlatformHealthIndicator.STATUS_ICONS.get(status, "❓")
                updated_values.append(f"{icon} {platform}")
        
        # Update combobox values
        self.domain_combo.config(values=updated_values)
        
        # Update current selection to include health indicator
        current_value = self.domain_var.get()
        if current_value != "All" and current_value in base_platforms:
            status = self.platform_health_status.get(current_value, "unknown")
            icon = PlatformHealthIndicator.STATUS_ICONS.get(status, "❓")
            self.domain_var.set(f"{icon} {current_value}")
    
    def _get_clean_domain_value(self):
        """Get domain value without health indicator icon and map to actual domain."""
        domain_value = self.domain_var.get()
        
        # Remove health indicator icons if present
        for icon in PlatformHealthIndicator.STATUS_ICONS.values():
            domain_value = domain_value.replace(icon, "").strip()
        
        # Skip category separators
        if domain_value.startswith("---") or domain_value == "All":
            return None
        
        # Map platform names to domains
        domain_map = {
            "YouTube": "youtube.com",
            "Vimeo": "vimeo.com",
            "Dailymotion": "dailymotion.com",
            "OK.ru": "ok.ru",
            "Rumble": "rumble.com",
            "Bilibili": "bilibili.com",
            "Niconico": "nicovideo.jp",
            "Crunchyroll": "crunchyroll.com",
            "SoundCloud": "soundcloud.com",
            "Bandcamp": "bandcamp.com",
            "Audiomack": "audiomack.com",
            "Mixcloud": "mixcloud.com",
            "TikTok": "tiktok.com",
            "Instagram": "instagram.com",
            "Twitter": "twitter.com",
            "Reddit": "reddit.com",
            "Twitch": "twitch.tv",
            "Spotify": "spotify.com"
        }
        
        mapped_domain = domain_map.get(domain_value)
        return mapped_domain if mapped_domain else None
    
    def show_progress(self, message="Processing..."):
        """
        Show progress bar with a message for long-running operations.
        
        Args:
            message: Message to display with the progress bar.
        """
        try:
            self.progress_label.config(text=message)
            self.progress_frame.pack(fill=X, pady=(0, 10), before=self.status_label)
            self.progress_bar.start(10)  # Start animation with 10ms interval
        except tk.TclError as e:
            # Widget was destroyed - ignore
            self.logger.debug(f"TclError in show_progress: {e}")
        except Exception as e:
            # Log other errors but don't crash
            self.logger.error(f"Error in show_progress: {e}", exc_info=True)
    
    def hide_progress(self):
        """Hide the progress bar."""
        try:
            self.progress_bar.stop()
            self.progress_frame.pack_forget()
        except tk.TclError as e:
            # Widget was destroyed - ignore
            self.logger.debug(f"TclError in hide_progress: {e}")
        except Exception as e:
            # Log other errors but don't crash
            self.logger.error(f"Error in hide_progress: {e}", exc_info=True)
    
    def update_progress_message(self, message):
        """
        Update the progress bar message without stopping it.
        
        Args:
            message: New message to display.
        """
        try:
            self.progress_label.config(text=message)
        except tk.TclError as e:
            # Widget was destroyed - ignore
            self.logger.debug(f"TclError in update_progress_message: {e}")
        except Exception as e:
            # Log other errors but don't crash
            self.logger.error(f"Error in update_progress_message: {e}", exc_info=True)
    
    def _safe_update_status(self, text, foreground="#888888"):
        """
        Safely update status label text and color.
        
        Args:
            text: Status text to display
            foreground: Text color
        """
        try:
            self.status_label.config(text=text, foreground=foreground)
        except tk.TclError as e:
            # Widget was destroyed - ignore
            self.logger.debug(f"TclError in _safe_update_status: {e}")
        except Exception as e:
            # Log other errors but don't crash
            self.logger.error(f"Error in _safe_update_status: {e}", exc_info=True)
    
    def cleanup(self):
        """
        Cleanup method to unsubscribe from events and cancel callbacks.
        
        This method should be called when the screen is being destroyed or
        when switching away from this screen to prevent memory leaks and
        ensure proper resource cleanup.
        """
        self.logger.info("Cleaning up SearchScreen")
        
        # Unsubscribe from all events
        if self.event_bus:
            for sub_id in self._subscription_ids:
                try:
                    self.event_bus.unsubscribe(sub_id)
                    self.logger.debug(f"Unsubscribed from event with ID {sub_id}")
                except Exception as e:
                    self.logger.error(f"Error unsubscribing from event {sub_id}: {e}")
            self._subscription_ids.clear()
        
        # Cleanup callbacks from SafeCallbackMixin
        self.cleanup_callbacks()
        
        self.logger.info("SearchScreen cleanup complete")


class PlatformSelectionDialog(ttk.Toplevel):
    """Dialog for selecting platforms to compare."""
    
    def __init__(self, parent):
        """Initialize PlatformSelectionDialog."""
        super().__init__(parent)
        
        self.title("Select Platforms to Compare")
        self.geometry("500x600")
        self.resizable(False, False)
        
        # Make dialog modal
        self.transient(parent)
        self.grab_set()
        
        self.selected_platforms = []
        self.platform_vars = {}
        
        self.setup_ui()
    
    def setup_ui(self):
        """Set up the dialog UI."""
        # Main container
        container = ttk.Frame(self, padding=20)
        container.pack(fill=BOTH, expand=YES)
        
        # Header
        header_label = ttk.Label(
            container,
            text="Select Platforms to Compare",
            font=("Segoe UI", 14, "bold")
        )
        header_label.pack(anchor=W, pady=(0, 10))
        
        subtitle_label = ttk.Label(
            container,
            text="Choose 2-5 platforms to search and compare results",
            font=("Segoe UI", 9),
            foreground="#888888"
        )
        subtitle_label.pack(anchor=W, pady=(0, 20))
        
        # Scrollable platform list
        canvas_frame = ttk.Frame(container)
        canvas_frame.pack(fill=BOTH, expand=YES)
        
        canvas = ttk.Canvas(canvas_frame, height=400)
        scrollbar = ttk.Scrollbar(canvas_frame, orient=VERTICAL, command=canvas.yview, bootstyle="round")
        
        scrollable_frame = ttk.Frame(canvas)
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor=NW)
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side=LEFT, fill=BOTH, expand=YES)
        scrollbar.pack(side=RIGHT, fill=Y)
        
        # Platform categories and checkboxes
        from controllers.search_manager import PLATFORM_CATEGORIES
        
        for category_name, category_info in PLATFORM_CATEGORIES.items():
            # Category header
            category_frame = ttk.Labelframe(
                scrollable_frame,
                text=f"{category_info['icon']} {category_name}",
                padding=10,
                bootstyle="primary"
            )
            category_frame.pack(fill=X, pady=(0, 10))
            
            # Platform checkboxes
            for platform in category_info['platforms']:
                # Skip platforms with asterisk (experimental)
                if '*' in platform:
                    continue
                
                var = ttk.BooleanVar(value=False)
                self.platform_vars[platform] = var
                
                checkbox = ttk.Checkbutton(
                    category_frame,
                    text=platform,
                    variable=var,
                    bootstyle="primary-round-toggle"
                )
                checkbox.pack(anchor=W, pady=2)
        
        # Button frame
        button_frame = ttk.Frame(container)
        button_frame.pack(fill=X, pady=(20, 0))
        
        # Select All / Deselect All buttons
        select_all_btn = ttk.Button(
            button_frame,
            text="Select All",
            command=self._select_all,
            bootstyle="info-outline",
            width=12
        )
        select_all_btn.pack(side=LEFT, padx=(0, 5))
        
        deselect_all_btn = ttk.Button(
            button_frame,
            text="Deselect All",
            command=self._deselect_all,
            bootstyle="secondary-outline",
            width=12
        )
        deselect_all_btn.pack(side=LEFT)
        
        # Compare and Cancel buttons
        compare_btn = ttk.Button(
            button_frame,
            text="Compare",
            command=self._on_compare,
            bootstyle="success",
            width=12
        )
        compare_btn.pack(side=RIGHT, padx=(5, 0))
        
        cancel_btn = ttk.Button(
            button_frame,
            text="Cancel",
            command=self.destroy,
            bootstyle="secondary",
            width=12
        )
        cancel_btn.pack(side=RIGHT)
    
    def _select_all(self):
        """Select all platforms."""
        for var in self.platform_vars.values():
            var.set(True)
    
    def _deselect_all(self):
        """Deselect all platforms."""
        for var in self.platform_vars.values():
            var.set(False)
    
    def _on_compare(self):
        """Handle compare button click."""
        # Get selected platforms
        selected = [
            platform for platform, var in self.platform_vars.items()
            if var.get()
        ]
        
        if len(selected) < 2:
            messagebox.showwarning(
                "Too Few Platforms",
                "Please select at least 2 platforms to compare.",
                parent=self
            )
            return
        
        if len(selected) > 5:
            messagebox.showwarning(
                "Too Many Platforms",
                "Please select no more than 5 platforms to compare.",
                parent=self
            )
            return
        
        self.selected_platforms = selected
        self.destroy()
    
    def get_selected_platforms(self):
        """Get the list of selected platforms."""
        return self.selected_platforms
