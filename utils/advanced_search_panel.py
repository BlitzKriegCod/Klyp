"""
Advanced Search Panel for Klyp Video Downloader.
Provides UI for advanced search operators.
"""

import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from typing import Dict, Any, List, Optional


class AdvancedSearchPanel(ttk.Frame):
    """Expandable panel for advanced search operators."""
    
    def __init__(self, parent, on_query_change=None):
        """
        Initialize AdvancedSearchPanel.
        
        Args:
            parent: Parent widget.
            on_query_change: Optional callback function called when query changes.
        """
        super().__init__(parent)
        
        self.on_query_change = on_query_change
        
        # Variables for operator inputs
        self.exact_phrase_var = ttk.StringVar()
        self.exclude_terms_var = ttk.StringVar()
        self.must_contain_var = ttk.StringVar()
        self.or_terms_var = ttk.StringVar()
        self.intitle_var = ttk.StringVar()
        self.inurl_var = ttk.StringVar()
        self.filetype_var = ttk.StringVar(value="Any")
        
        # Constructed query display
        self.constructed_query_var = ttk.StringVar(value="")
        
        self.setup_ui()
    
    def setup_ui(self):
        """Set up the panel UI."""
        # Main container with padding
        container = ttk.Frame(self, padding=10)
        container.pack(fill=BOTH, expand=YES)
        
        # Header
        header_frame = ttk.Frame(container)
        header_frame.pack(fill=X, pady=(0, 10))
        
        header_label = ttk.Label(
            header_frame,
            text="⚙️ Advanced Search Operators",
            font=("Segoe UI", 11, "bold")
        )
        header_label.pack(side=LEFT)
        
        # Info button/label
        info_label = ttk.Label(
            header_frame,
            text="ℹ️",
            font=("Segoe UI", 10),
            foreground="#888888",
            cursor="hand2"
        )
        info_label.pack(side=RIGHT)
        info_label.bind("<Button-1>", self.show_help)
        
        # Separator
        ttk.Separator(container, orient=HORIZONTAL).pack(fill=X, pady=(0, 10))
        
        # Create two columns for better layout
        columns_frame = ttk.Frame(container)
        columns_frame.pack(fill=BOTH, expand=YES)
        
        left_column = ttk.Frame(columns_frame)
        left_column.pack(side=LEFT, fill=BOTH, expand=YES, padx=(0, 10))
        
        right_column = ttk.Frame(columns_frame)
        right_column.pack(side=LEFT, fill=BOTH, expand=YES)
        
        # Left Column - Text operators
        
        # Exact phrase
        exact_frame = ttk.Labelframe(
            left_column,
            text="Exact Phrase Match",
            padding=10
        )
        exact_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Label(
            exact_frame,
            text='Match exact phrase (e.g., "full episode")',
            font=("Segoe UI", 8),
            foreground="#666666"
        ).pack(anchor=W, pady=(0, 5))
        
        exact_entry = ttk.Entry(
            exact_frame,
            textvariable=self.exact_phrase_var
        )
        exact_entry.pack(fill=X)
        exact_entry.bind("<KeyRelease>", lambda e: self.update_query_preview())
        
        # Exclude terms
        exclude_frame = ttk.Labelframe(
            left_column,
            text="Exclude Terms",
            padding=10
        )
        exclude_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Label(
            exclude_frame,
            text="Exclude results with these terms (comma-separated)",
            font=("Segoe UI", 8),
            foreground="#666666"
        ).pack(anchor=W, pady=(0, 5))
        
        exclude_entry = ttk.Entry(
            exclude_frame,
            textvariable=self.exclude_terms_var
        )
        exclude_entry.pack(fill=X)
        exclude_entry.bind("<KeyRelease>", lambda e: self.update_query_preview())
        
        # Must contain
        must_frame = ttk.Labelframe(
            left_column,
            text="Must Contain",
            padding=10
        )
        must_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Label(
            must_frame,
            text="Results must contain these terms (comma-separated)",
            font=("Segoe UI", 8),
            foreground="#666666"
        ).pack(anchor=W, pady=(0, 5))
        
        must_entry = ttk.Entry(
            must_frame,
            textvariable=self.must_contain_var
        )
        must_entry.pack(fill=X)
        must_entry.bind("<KeyRelease>", lambda e: self.update_query_preview())
        
        # Right Column - Advanced operators
        
        # OR logic
        or_frame = ttk.Labelframe(
            right_column,
            text="OR Logic",
            padding=10
        )
        or_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Label(
            or_frame,
            text="Match any of these terms (comma-separated)",
            font=("Segoe UI", 8),
            foreground="#666666"
        ).pack(anchor=W, pady=(0, 5))
        
        or_entry = ttk.Entry(
            or_frame,
            textvariable=self.or_terms_var
        )
        or_entry.pack(fill=X)
        or_entry.bind("<KeyRelease>", lambda e: self.update_query_preview())
        
        # In title
        intitle_frame = ttk.Labelframe(
            right_column,
            text="In Title",
            padding=10
        )
        intitle_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Label(
            intitle_frame,
            text="Terms that must appear in title (comma-separated)",
            font=("Segoe UI", 8),
            foreground="#666666"
        ).pack(anchor=W, pady=(0, 5))
        
        intitle_entry = ttk.Entry(
            intitle_frame,
            textvariable=self.intitle_var
        )
        intitle_entry.pack(fill=X)
        intitle_entry.bind("<KeyRelease>", lambda e: self.update_query_preview())
        
        # In URL
        inurl_frame = ttk.Labelframe(
            right_column,
            text="In URL",
            padding=10
        )
        inurl_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Label(
            inurl_frame,
            text="Terms that must appear in URL (comma-separated)",
            font=("Segoe UI", 8),
            foreground="#666666"
        ).pack(anchor=W, pady=(0, 5))
        
        inurl_entry = ttk.Entry(
            inurl_frame,
            textvariable=self.inurl_var
        )
        inurl_entry.pack(fill=X)
        inurl_entry.bind("<KeyRelease>", lambda e: self.update_query_preview())
        
        # Filetype filter
        filetype_frame = ttk.Labelframe(
            right_column,
            text="File Type",
            padding=10
        )
        filetype_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Label(
            filetype_frame,
            text="Filter by file extension",
            font=("Segoe UI", 8),
            foreground="#666666"
        ).pack(anchor=W, pady=(0, 5))
        
        filetype_combo = ttk.Combobox(
            filetype_frame,
            textvariable=self.filetype_var,
            values=["Any", "mp4", "webm", "mkv", "avi", "mov", "flv"],
            state="readonly",
            width=15
        )
        filetype_combo.pack(fill=X)
        filetype_combo.bind("<<ComboboxSelected>>", lambda e: self.update_query_preview())
        
        # Query preview section
        preview_frame = ttk.Labelframe(
            container,
            text="Constructed Query Preview",
            padding=10,
            bootstyle="info"
        )
        preview_frame.pack(fill=X, pady=(10, 0))
        
        preview_text = ttk.Label(
            preview_frame,
            textvariable=self.constructed_query_var,
            font=("Consolas", 9),
            foreground="#0066cc",
            wraplength=700,
            justify=LEFT
        )
        preview_text.pack(fill=X)
        
        # Action buttons
        button_frame = ttk.Frame(container)
        button_frame.pack(fill=X, pady=(10, 0))
        
        clear_btn = ttk.Button(
            button_frame,
            text="Clear All",
            command=self.clear_all,
            bootstyle="secondary-outline",
            width=12
        )
        clear_btn.pack(side=LEFT, padx=(0, 5))
        
        # Initial query preview
        self.update_query_preview()
    
    def show_help(self, event=None):
        """Show help information about advanced search operators."""
        from tkinter import messagebox
        
        help_text = """Advanced Search Operators Help:

• Exact Phrase: Match exact phrase in quotes
• Exclude Terms: Remove results containing these terms (uses -)
• Must Contain: Results must include all these terms
• OR Logic: Match any of the specified terms
• In Title: Terms must appear in video title (uses intitle:)
• In URL: Terms must appear in video URL (uses inurl:)
• File Type: Filter by file extension (uses filetype:)

Tips:
- Use commas to separate multiple terms
- Combine operators for precise searches
- Preview shows the constructed query"""
        
        messagebox.showinfo(
            "Advanced Search Help",
            help_text,
            parent=self
        )
    
    def update_query_preview(self):
        """Update the constructed query preview."""
        operators_config = self.get_operators_config()
        
        # Build a simple preview (without base query)
        query_parts = []
        
        # Exact phrases
        if operators_config.get('exact_phrases'):
            for phrase in operators_config['exact_phrases']:
                query_parts.append(f'"{phrase}"')
        
        # Exclude terms
        if operators_config.get('exclude_terms'):
            for term in operators_config['exclude_terms']:
                query_parts.append(f"-{term}")
        
        # OR terms
        if operators_config.get('or_terms') and len(operators_config['or_terms']) > 1:
            or_query = " OR ".join(operators_config['or_terms'])
            query_parts.append(f"({or_query})")
        
        # Must contain
        if operators_config.get('must_contain'):
            query_parts.extend(operators_config['must_contain'])
        
        # Intitle
        if operators_config.get('intitle_terms'):
            for term in operators_config['intitle_terms']:
                query_parts.append(f"intitle:{term}")
        
        # Inurl
        if operators_config.get('inurl_terms'):
            for term in operators_config['inurl_terms']:
                query_parts.append(f"inurl:{term}")
        
        # Filetype
        if operators_config.get('filetype'):
            query_parts.append(f"filetype:{operators_config['filetype']}")
        
        # Update preview
        if query_parts:
            preview = "[base query] " + " ".join(query_parts)
        else:
            preview = "[base query] (no operators applied)"
        
        self.constructed_query_var.set(preview)
        
        # Call callback if provided
        if self.on_query_change:
            self.on_query_change(operators_config)
    
    def get_operators_config(self) -> Dict[str, Any]:
        """
        Get the current operator configuration.
        
        Returns:
            Dictionary with operator settings for use with SearchManager.build_advanced_query()
        """
        # Helper function to split comma-separated values
        def split_terms(text: str) -> List[str]:
            if not text:
                return []
            return [term.strip() for term in text.split(',') if term.strip()]
        
        config = {
            'exact_phrases': split_terms(self.exact_phrase_var.get()),
            'exclude_terms': split_terms(self.exclude_terms_var.get()),
            'must_contain': split_terms(self.must_contain_var.get()),
            'or_terms': split_terms(self.or_terms_var.get()),
            'intitle_terms': split_terms(self.intitle_var.get()),
            'inurl_terms': split_terms(self.inurl_var.get()),
            'site': None,  # Site is handled separately in SearchScreen
            'filetype': self.filetype_var.get() if self.filetype_var.get() != "Any" else None
        }
        
        return config
    
    def clear_all(self):
        """Clear all operator inputs."""
        self.exact_phrase_var.set("")
        self.exclude_terms_var.set("")
        self.must_contain_var.set("")
        self.or_terms_var.set("")
        self.intitle_var.set("")
        self.inurl_var.set("")
        self.filetype_var.set("Any")
        self.update_query_preview()
    
    def has_operators(self) -> bool:
        """
        Check if any operators are currently configured.
        
        Returns:
            True if any operator has a value, False otherwise.
        """
        config = self.get_operators_config()
        
        return (
            bool(config['exact_phrases']) or
            bool(config['exclude_terms']) or
            bool(config['must_contain']) or
            bool(config['or_terms']) or
            bool(config['intitle_terms']) or
            bool(config['inurl_terms']) or
            bool(config['filetype'])
        )
