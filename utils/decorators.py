"""
Decorators for Klyp Video Downloader.
Provides utility decorators for error handling and thread safety.
"""

import functools
import tkinter as tk
from typing import Callable, Any, Optional

from utils.logger import get_logger


def safe_callback(show_error: bool = False, error_message: Optional[str] = None):
    """
    Decorator that captures exceptions in callbacks.
    
    This decorator wraps callback functions to catch and handle exceptions
    gracefully. It's particularly useful for tkinter callbacks where
    unhandled exceptions can crash the application.
    
    Features:
    - Catches TclError silently (widget destroyed)
    - Catches other exceptions and logs them
    - Optionally shows error message to user
    - Prevents callback exceptions from crashing the app
    
    Args:
        show_error: If True, show error message to user via messagebox
        error_message: Custom error message to show. If None, uses exception message.
    
    Returns:
        Decorated function that handles exceptions safely
    
    Usage:
        @safe_callback()
        def on_button_click():
            # This won't crash the app even if it raises an exception
            risky_operation()
        
        @safe_callback(show_error=True, error_message="Failed to save file")
        def on_save():
            save_file()
    
    Note:
        When show_error=True, this will import tkinter.messagebox which
        requires tkinter to be initialized.
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            logger = get_logger()
            
            try:
                return func(*args, **kwargs)
            
            except tk.TclError as e:
                # Widget was destroyed - this is expected in some cases
                # Log at debug level and don't show to user
                logger.debug(
                    f"TclError in callback {func.__name__}: {e}"
                )
                return None
            
            except Exception as e:
                # Unexpected error - log at error level
                logger.error(
                    f"Error in callback {func.__name__}: {e}",
                    exc_info=True
                )
                
                # Optionally show error to user
                if show_error:
                    try:
                        import tkinter.messagebox as messagebox
                        
                        # Use custom message or exception message
                        msg = error_message if error_message else str(e)
                        
                        messagebox.showerror(
                            "Error",
                            f"An error occurred: {msg}"
                        )
                    except Exception as show_error_exception:
                        # If showing error fails, just log it
                        logger.error(
                            f"Failed to show error message: {show_error_exception}"
                        )
                
                return None
        
        return wrapper
    
    return decorator


def thread_safe_ui_update(func: Callable) -> Callable:
    """
    Decorator that validates UI updates happen in the main thread.
    
    This decorator is used in debug mode to detect thread-safety violations.
    It checks if the decorated function is being called from the main thread
    and raises ThreadSafetyViolation if not.
    
    Note: This decorator should only be used in debug mode as it adds
    overhead to every call.
    
    Args:
        func: Function to decorate
    
    Returns:
        Decorated function that validates thread safety
    
    Usage:
        @thread_safe_ui_update
        def update_progress_bar(self, value):
            self.progress_bar['value'] = value
    
    Raises:
        ThreadSafetyViolation: If called from non-main thread in debug mode
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        import threading
        from utils.exceptions import ThreadSafetyViolation
        
        # Check if we're in the main thread
        current_thread = threading.current_thread()
        main_thread = threading.main_thread()
        
        if current_thread != main_thread:
            logger = get_logger()
            error_msg = (
                f"UI update attempted from {current_thread.name} "
                f"(expected {main_thread.name}) in {func.__name__}"
            )
            
            # In debug mode, raise exception
            # In production, just log warning
            try:
                from controllers.settings_manager import SettingsManager
                settings = SettingsManager()
                debug_mode = settings.get('debug_thread_safety', False)
            except:
                debug_mode = False
            
            if debug_mode:
                logger.error(error_msg)
                raise ThreadSafetyViolation(error_msg)
            else:
                logger.warning(error_msg)
        
        return func(*args, **kwargs)
    
    return wrapper


def retry_on_network_error(max_retries: int = 3, delay: float = 1.0):
    """
    Decorator that retries function on network errors.
    
    This decorator automatically retries a function if it raises a
    NetworkException, with exponential backoff between retries.
    
    Args:
        max_retries: Maximum number of retry attempts
        delay: Initial delay between retries in seconds (doubles each retry)
    
    Returns:
        Decorated function that retries on network errors
    
    Usage:
        @retry_on_network_error(max_retries=3, delay=2.0)
        def download_file(url):
            response = requests.get(url)
            return response.content
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            import time
            from utils.exceptions import NetworkException
            
            logger = get_logger()
            last_exception = None
            current_delay = delay
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                
                except NetworkException as e:
                    last_exception = e
                    
                    if attempt < max_retries:
                        logger.warning(
                            f"Network error in {func.__name__} (attempt {attempt + 1}/{max_retries + 1}): {e}. "
                            f"Retrying in {current_delay}s..."
                        )
                        time.sleep(current_delay)
                        current_delay *= 2  # Exponential backoff
                    else:
                        logger.error(
                            f"Network error in {func.__name__} after {max_retries + 1} attempts: {e}"
                        )
            
            # If we get here, all retries failed
            raise last_exception
        
        return wrapper
    
    return decorator


def log_execution_time(func: Callable) -> Callable:
    """
    Decorator that logs function execution time.
    
    Useful for performance monitoring and debugging slow operations.
    
    Args:
        func: Function to decorate
    
    Returns:
        Decorated function that logs execution time
    
    Usage:
        @log_execution_time
        def slow_operation():
            time.sleep(2)
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        import time
        
        logger = get_logger()
        start_time = time.time()
        
        try:
            result = func(*args, **kwargs)
            elapsed = time.time() - start_time
            logger.debug(
                f"{func.__name__} completed in {elapsed:.3f}s"
            )
            return result
        
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(
                f"{func.__name__} failed after {elapsed:.3f}s: {e}"
            )
            raise
    
    return wrapper


def deprecated(replacement: Optional[str] = None):
    """
    Decorator to mark functions as deprecated.
    
    Logs a warning when the deprecated function is called, optionally
    suggesting a replacement function.
    
    Args:
        replacement: Name of the replacement function (optional)
    
    Returns:
        Decorated function that logs deprecation warning
    
    Usage:
        @deprecated(replacement="new_function")
        def old_function():
            pass
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            logger = get_logger()
            
            msg = f"{func.__name__} is deprecated"
            if replacement:
                msg += f". Use {replacement} instead"
            
            logger.warning(msg)
            
            return func(*args, **kwargs)
        
        return wrapper
    
    return decorator
