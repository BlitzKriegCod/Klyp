import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from typing import List, Optional

class QualityDialog(ttk.Toplevel):
    """Dialog for selecting video quality/format."""
    
    def __init__(self, parent, title: str, qualities: List[str]):
        super().__init__(parent)
        self.title(f"Select Quality - {title}")
        self.geometry("450x400")
        self.resizable(True, True)
        self.minsize(400, 350)
        
        self.result = None
        self.qualities = qualities if qualities else ["best"]
        
        # UI Setup
        container = ttk.Frame(self, padding=15)
        container.pack(fill=BOTH, expand=YES)
        
        # Center the dialog after creating content
        self.update_idletasks()
        width = self.winfo_width()
        height = self.winfo_height()
        x = (self.winfo_screenwidth() // 2) - (width // 2)
        y = (self.winfo_screenheight() // 2) - (height // 2)
        self.geometry(f'{width}x{height}+{x}+{y}')
        
        ttk.Label(
            container, 
            text="Choose your preferred quality:",
            font=("Segoe UI", 11, "bold")
        ).pack(anchor=W, pady=(0, 10))
        
        self.quality_var = ttk.StringVar(value="best")
        
        # Scrollable area for many qualities
        list_frame = ttk.Frame(container)
        list_frame.pack(fill=BOTH, expand=YES, pady=(0, 10))
        
        canvas = ttk.Canvas(list_frame, highlightthickness=0)
        scrollbar = ttk.Scrollbar(list_frame, orient=VERTICAL, command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side=LEFT, fill=BOTH, expand=YES)
        scrollbar.pack(side=RIGHT, fill=Y)
        
        # Explicitly add "Best Available"
        ttk.Radiobutton(
            scrollable_frame,
            text="🎬 Best Available (Default)",
            variable=self.quality_var,
            value="best",
            bootstyle="success"
        ).pack(anchor=W, pady=5)
        
        # Add separator
        ttk.Separator(scrollable_frame, orient=HORIZONTAL).pack(fill=X, pady=10)
        
        # Add video quality options
        for q in self.qualities:
            if q.lower() == "best": continue
            ttk.Radiobutton(
                scrollable_frame,
                text=f"🎥 {q}",
                variable=self.quality_var,
                value=q,
                bootstyle="success"
            ).pack(anchor=W, pady=5)
        
        # Add separator before audio option
        ttk.Separator(scrollable_frame, orient=HORIZONTAL).pack(fill=X, pady=10)
        
        # Add "Audio Only" option
        ttk.Radiobutton(
            scrollable_frame,
            text="🎵 Audio Only (MP3)",
            variable=self.quality_var,
            value="audio",
            bootstyle="info"
        ).pack(anchor=W, pady=5)
            
        # Buttons - Always visible at bottom
        btn_frame = ttk.Frame(container)
        btn_frame.pack(fill=X, side=BOTTOM, pady=(10, 0))
        
        ttk.Button(
            btn_frame,
            text="Cancel",
            command=self.on_cancel,
            bootstyle="secondary",
            width=12
        ).pack(side=LEFT)
        
        ttk.Button(
            btn_frame,
            text="Download",
            command=self.on_confirm,
            bootstyle="success",
            width=15
        ).pack(side=RIGHT)
        
        # Grab focus
        self.transient(parent)
        self.grab_set()
        self.protocol("WM_DELETE_WINDOW", self.on_cancel)
        self.wait_window()
        
    def on_confirm(self):
        self.result = self.quality_var.get()
        self.destroy()
        
    def on_cancel(self):
        self.result = None
        self.destroy()
