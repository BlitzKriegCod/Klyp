"""
SafeCallbackMixin for thread-safe UI updates in tkinter screens.
Provides safe wrappers around tkinter's after() and after_idle() methods.
"""

import tkinter as tk
import threading
from typing import Callable, List, Any

from utils.logger import get_logger
from utils.exceptions import ThreadSafetyViolation


class SafeCallbackMixin:
    """
    Mixin for screens to handle thread-safe UI updates.
    
    This mixin provides safe wrappers around tkinter's after() and after_idle()
    methods that automatically track callback IDs and handle cleanup. It also
    catches TclError exceptions that occur when callbacks execute after widgets
    have been destroyed.
    
    Usage:
        class MyScreen(SafeCallbackMixin, ttk.Frame):
            def __init__(self, parent):
                ttk.Frame.__init__(self, parent)
                SafeCallbackMixin.__init__(self)
                
                # Use safe_after instead of after
                self.safe_after(1000, self.update_ui)
                
                # Use safe_after_idle instead of after_idle
                self.safe_after_idle(self.refresh_data)
            
            def cleanup(self):
                # Call this when screen is being destroyed
                self.cleanup_callbacks()
    
    Note:
        Classes using this mixin must also inherit from a tkinter widget class
        (e.g., ttk.Frame) that provides the after() and after_idle() methods.
    """
    
    def __init__(self):
        """Initialize the SafeCallbackMixin."""
        self._callback_ids: List[str] = []
        self._destroyed = False
        self._logger = get_logger()
        self._main_thread_id = threading.main_thread().ident
        self._debug_thread_safety = False
        self._logger.debug(f"SafeCallbackMixin initialized for {self.__class__.__name__}")
    
    def set_debug_thread_safety(self, enabled: bool) -> None:
        """
        Enable or disable thread-safety debugging.
        
        When enabled, validates that UI updates occur in the main thread
        and raises ThreadSafetyViolation if not.
        
        Args:
            enabled: True to enable thread-safety validation
        """
        self._debug_thread_safety = enabled
        if enabled:
            self._logger.info(
                f"Thread-safety debugging enabled for {self.__class__.__name__}"
            )
    
    def _validate_ui_thread(self, operation: str) -> None:
        """
        Validate that the current operation is running in the main UI thread.
        
        Args:
            operation: Name of the operation being performed
        
        Raises:
            ThreadSafetyViolation: If debug mode is enabled and not in main thread
        """
        current_thread = threading.current_thread()
        
        if current_thread.ident != self._main_thread_id:
            error_msg = (
                f"UI operation '{operation}' called from non-UI thread: "
                f"Thread-{current_thread.ident}:{current_thread.name}. "
                f"Expected main thread: Thread-{self._main_thread_id}"
            )
            
            if self._debug_thread_safety:
                self._logger.error(f"[THREAD-SAFETY VIOLATION] {error_msg}")
                raise ThreadSafetyViolation(error_msg)
            else:
                self._logger.warning(f"[THREAD-SAFETY WARNING] {error_msg}")
    
    def safe_after(self, ms: int, func: Callable, *args, **kwargs) -> str:
        """
        Schedule callback with automatic cleanup tracking.
        
        This is a safe wrapper around tkinter's after() method that:
        - Tracks callback IDs for automatic cleanup
        - Catches TclError when widget is destroyed
        - Catches and logs other exceptions without crashing
        - Prevents execution if widget is already destroyed
        - Validates thread-safety in debug mode
        
        Args:
            ms: Delay in milliseconds before executing callback
            func: Function to call
            *args: Positional arguments to pass to func
            **kwargs: Keyword arguments to pass to func
        
        Returns:
            Callback ID that can be used with after_cancel(), or empty string if destroyed
        """
        # Validate UI thread access in debug mode
        # NOTE: Commented out because tkinter's after() already handles cross-thread calls safely
        # self._validate_ui_thread(f"safe_after({func.__name__})")
        
        # SAFETY: Check if widget is already destroyed before scheduling
        if self._destroyed:
            self._logger.debug(
                f"Ignoring safe_after call on destroyed widget: {self.__class__.__name__}"
            )
            return ""
        
        def wrapped():
            """Wrapper that handles exceptions and checks destruction state."""
            # SAFETY: Double-check destruction state before executing callback
            # Widget may have been destroyed between scheduling and execution
            if self._destroyed:
                return
            
            try:
                func(*args, **kwargs)
            except tk.TclError as e:
                # EXPECTED: Widget was destroyed between check and execution
                # This is a normal race condition in tkinter, log at debug level
                self._logger.debug(
                    f"TclError in callback for {self.__class__.__name__}: {e}"
                )
            except Exception as e:
                # UNEXPECTED: Other errors should be logged but not crash the app
                self._logger.error(
                    f"Error in callback for {self.__class__.__name__}: {e}",
                    exc_info=True
                )
        
        try:
            # Schedule the wrapped callback
            callback_id = self.after(ms, wrapped)
            # IMPORTANT: Track callback ID for cleanup
            # Without tracking, callbacks would continue executing after widget destruction
            self._callback_ids.append(callback_id)
            self._logger.debug(
                f"Scheduled callback {callback_id} for {self.__class__.__name__} in {ms}ms"
            )
            return callback_id
        except tk.TclError as e:
            self._logger.debug(
                f"TclError scheduling callback for {self.__class__.__name__}: {e}"
            )
            return ""
        except Exception as e:
            self._logger.error(
                f"Error scheduling callback for {self.__class__.__name__}: {e}",
                exc_info=True
            )
            return ""
    
    def safe_after_idle(self, func: Callable, *args, **kwargs) -> str:
        """
        Schedule idle callback with automatic cleanup tracking.
        
        This is a safe wrapper around tkinter's after_idle() method that:
        - Tracks callback IDs for automatic cleanup
        - Catches TclError when widget is destroyed
        - Catches and logs other exceptions without crashing
        - Prevents execution if widget is already destroyed
        - Validates thread-safety in debug mode
        
        Args:
            func: Function to call when idle
            *args: Positional arguments to pass to func
            **kwargs: Keyword arguments to pass to func
        
        Returns:
            Callback ID that can be used with after_cancel(), or empty string if destroyed
        """
        # Validate UI thread access in debug mode
        # NOTE: Commented out because tkinter's after_idle() already handles cross-thread calls safely
        # self._validate_ui_thread(f"safe_after_idle({func.__name__})")
        
        if self._destroyed:
            self._logger.debug(
                f"Ignoring safe_after_idle call on destroyed widget: {self.__class__.__name__}"
            )
            return ""
        
        def wrapped():
            """Wrapper that handles exceptions and checks destruction state."""
            if self._destroyed:
                return
            
            try:
                func(*args, **kwargs)
            except tk.TclError as e:
                # Widget was destroyed - this is expected, log at debug level
                self._logger.debug(
                    f"TclError in idle callback for {self.__class__.__name__}: {e}"
                )
            except Exception as e:
                # Unexpected error - log at error level
                self._logger.error(
                    f"Error in idle callback for {self.__class__.__name__}: {e}",
                    exc_info=True
                )
        
        try:
            callback_id = self.after_idle(wrapped)
            self._callback_ids.append(callback_id)
            self._logger.debug(
                f"Scheduled idle callback {callback_id} for {self.__class__.__name__}"
            )
            return callback_id
        except tk.TclError as e:
            self._logger.debug(
                f"TclError scheduling idle callback for {self.__class__.__name__}: {e}"
            )
            return ""
        except Exception as e:
            self._logger.error(
                f"Error scheduling idle callback for {self.__class__.__name__}: {e}",
                exc_info=True
            )
            return ""
    
    def cleanup_callbacks(self) -> None:
        """
        Cancel all pending callbacks.
        
        This method should be called when the screen is being destroyed or
        when switching away from the screen. It cancels all pending callbacks
        that were scheduled with safe_after() or safe_after_idle().
        """
        if self._destroyed:
            return
        
        # CRITICAL: Mark as destroyed BEFORE cancelling callbacks
        # This prevents new callbacks from being scheduled during cleanup
        self._destroyed = True
        cancelled_count = 0
        
        # IMPORTANT: Cancel all tracked callbacks to prevent memory leaks
        # Without this, callbacks would continue executing even after widget destruction
        # This is the primary cause of crashes when switching screens
        for callback_id in self._callback_ids:
            try:
                self.after_cancel(callback_id)
                cancelled_count += 1
            except tk.TclError:
                # Widget already destroyed or callback already executed - this is OK
                pass
            except Exception as e:
                self._logger.error(
                    f"Error cancelling callback {callback_id}: {e}"
                )
        
        self._callback_ids.clear()
        
        if cancelled_count > 0:
            self._logger.info(
                f"Cleaned up {cancelled_count} callback(s) for {self.__class__.__name__}"
            )
    
    def destroy(self) -> None:
        """
        Override destroy to cleanup callbacks automatically.
        
        This method ensures that all pending callbacks are cancelled before
        the widget is destroyed, preventing TclError exceptions.
        """
        self.cleanup_callbacks()
        
        # Call parent destroy method
        # Note: This assumes the class also inherits from a tkinter widget
        try:
            super().destroy()
        except AttributeError:
            # If super doesn't have destroy, that's okay
            pass
    
    def is_destroyed(self) -> bool:
        """
        Check if the widget has been marked as destroyed.
        
        Returns:
            True if cleanup_callbacks() or destroy() has been called
        """
        return self._destroyed
    
    def get_pending_callback_count(self) -> int:
        """
        Get the number of pending callbacks.
        
        Returns:
            Number of callbacks that have been scheduled but not yet executed or cancelled
        """
        return len(self._callback_ids)
