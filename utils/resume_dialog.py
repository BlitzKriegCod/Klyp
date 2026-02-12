"""
Resume Dialog for OK.ru Video Downloader.
Displays a dialog to offer resuming pending downloads.
"""

import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from ttkbootstrap.dialogs import Messagebox


class ResumeDialog:
    """Dialog to offer resuming pending downloads."""
    
    @staticmethod
    def show_resume_dialog(parent, pending_count: int) -> str:
        """
        Show a dialog asking the user if they want to resume pending downloads.
        
        Args:
            parent: Parent window.
            pending_count: Number of pending downloads.
        
        Returns:
            "resume" to resume downloads, "discard" to discard them, or "cancel" to do nothing.
        """
        # Create custom dialog
        dialog = ttk.Toplevel(parent)
        dialog.title("Resume Downloads")
        dialog.geometry("450x200")
        dialog.resizable(False, False)
        dialog.transient(parent)
        dialog.grab_set()
        
        # Center dialog on parent
        dialog.update_idletasks()
        x = parent.winfo_x() + (parent.winfo_width() // 2) - (dialog.winfo_width() // 2)
        y = parent.winfo_y() + (parent.winfo_height() // 2) - (dialog.winfo_height() // 2)
        dialog.geometry(f"+{x}+{y}")
        
        result = {"action": "cancel"}
        
        # Main container
        container = ttk.Frame(dialog, padding=20)
        container.pack(fill=BOTH, expand=YES)
        
        # Icon and message
        message_frame = ttk.Frame(container)
        message_frame.pack(fill=X, pady=(0, 20))
        
        # Message
        message_text = f"Found {pending_count} pending download{'s' if pending_count != 1 else ''} from your last session.\n\nWould you like to resume them?"
        message_label = ttk.Label(
            message_frame,
            text=message_text,
            font=("TkDefaultFont", 11),
            wraplength=400
        )
        message_label.pack()
        
        # Buttons
        button_frame = ttk.Frame(container)
        button_frame.pack(fill=X, pady=(10, 0))
        
        def on_resume():
            result["action"] = "resume"
            dialog.destroy()
        
        def on_discard():
            result["action"] = "discard"
            dialog.destroy()
        
        def on_cancel():
            result["action"] = "cancel"
            dialog.destroy()
        
        # Resume button (primary action)
        resume_btn = ttk.Button(
            button_frame,
            text="Resume Downloads",
            command=on_resume,
            bootstyle="success",
            width=18
        )
        resume_btn.pack(side=LEFT, padx=(0, 10))
        
        # Discard button
        discard_btn = ttk.Button(
            button_frame,
            text="Discard",
            command=on_discard,
            bootstyle="secondary",
            width=12
        )
        discard_btn.pack(side=LEFT, padx=(0, 10))
        
        # Cancel button
        cancel_btn = ttk.Button(
            button_frame,
            text="Cancel",
            command=on_cancel,
            bootstyle="secondary",
            width=12
        )
        cancel_btn.pack(side=LEFT)
        
        # Set focus to resume button
        resume_btn.focus_set()
        
        # Handle window close
        dialog.protocol("WM_DELETE_WINDOW", on_cancel)
        
        # Wait for dialog to close
        parent.wait_window(dialog)
        
        return result["action"]
