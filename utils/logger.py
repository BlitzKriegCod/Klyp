"""
Logger utility for Klyp Video Downloader.
Provides comprehensive logging with debug mode support.
"""

import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional


class AppLogger:
    """Application logger with file and console output."""
    
    _instance: Optional['AppLogger'] = None
    _initialized: bool = False
    
    def __new__(cls):
        """Singleton pattern to ensure only one logger instance."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize the logger."""
        if self._initialized:
            return
        
        self._initialized = True
        self.debug_mode = False
        
        # Create logs directory
        self.log_dir = Path.home() / ".config" / "klyp" / "logs"
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Create log file with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.log_file = self.log_dir / f"app_{timestamp}.log"
        
        # Set up logger
        self.logger = logging.getLogger("KlypVideoDownloader")
        self.logger.setLevel(logging.DEBUG)
        
        # Remove existing handlers
        self.logger.handlers.clear()
        
        # File handler (always logs DEBUG and above)
        file_handler = logging.FileHandler(self.log_file, encoding='utf-8')
        file_handler.setLevel(logging.DEBUG)
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_formatter)
        self.logger.addHandler(file_handler)
        
        # Console handler (INFO by default, DEBUG in debug mode)
        self.console_handler = logging.StreamHandler(sys.stdout)
        self.console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter(
            '%(levelname)s - %(message)s'
        )
        self.console_handler.setFormatter(console_formatter)
        self.logger.addHandler(self.console_handler)
        
        self.logger.info("=" * 80)
        self.logger.info("Klyp Video Downloader - Application Started")
        self.logger.info(f"Log file: {self.log_file}")
        self.logger.info("=" * 80)
    
    def set_debug_mode(self, enabled: bool) -> None:
        """
        Enable or disable debug mode.
        
        Args:
            enabled: True to enable debug mode, False to disable.
        """
        self.debug_mode = enabled
        
        if enabled:
            self.console_handler.setLevel(logging.DEBUG)
            self.logger.info("Debug mode enabled")
        else:
            self.console_handler.setLevel(logging.INFO)
            self.logger.info("Debug mode disabled")
    
    def debug(self, message: str) -> None:
        """Log debug message."""
        self.logger.debug(message)
    
    def info(self, message: str) -> None:
        """Log info message."""
        self.logger.info(message)
    
    def warning(self, message: str) -> None:
        """Log warning message."""
        self.logger.warning(message)
    
    def error(self, message: str, exc_info: bool = False) -> None:
        """
        Log error message.
        
        Args:
            message: Error message to log.
            exc_info: If True, include exception information.
        """
        self.logger.error(message, exc_info=exc_info)
    
    def critical(self, message: str, exc_info: bool = False) -> None:
        """
        Log critical message.
        
        Args:
            message: Critical message to log.
            exc_info: If True, include exception information.
        """
        self.logger.critical(message, exc_info=exc_info)
    
    def exception(self, message: str) -> None:
        """
        Log exception with traceback.
        
        Args:
            message: Exception message to log.
        """
        self.logger.exception(message)
    
    def get_log_file_path(self) -> str:
        """
        Get the current log file path.
        
        Returns:
            Path to the current log file.
        """
        return str(self.log_file)
    
    def cleanup_old_logs(self, days: int = 7) -> int:
        """
        Clean up log files older than specified days.
        
        Args:
            days: Number of days to keep logs.
        
        Returns:
            Number of log files deleted.
        """
        count = 0
        cutoff_time = datetime.now().timestamp() - (days * 24 * 60 * 60)
        
        try:
            for log_file in self.log_dir.glob("app_*.log"):
                if log_file.stat().st_mtime < cutoff_time:
                    log_file.unlink()
                    count += 1
            
            if count > 0:
                self.info(f"Cleaned up {count} old log file(s)")
        except Exception as e:
            self.error(f"Failed to cleanup old logs: {str(e)}")
        
        return count


# Global logger instance
_logger = AppLogger()


def get_logger() -> AppLogger:
    """
    Get the global logger instance.
    
    Returns:
        AppLogger instance.
    """
    return _logger


def set_debug_mode(enabled: bool) -> None:
    """
    Enable or disable debug mode globally.
    
    Args:
        enabled: True to enable debug mode, False to disable.
    """
    _logger.set_debug_mode(enabled)


def debug(message: str) -> None:
    """Log debug message."""
    _logger.debug(message)


def info(message: str) -> None:
    """Log info message."""
    _logger.info(message)


def warning(message: str) -> None:
    """Log warning message."""
    _logger.warning(message)


def error(message: str, exc_info: bool = False) -> None:
    """Log error message."""
    _logger.error(message, exc_info=exc_info)


def critical(message: str, exc_info: bool = False) -> None:
    """Log critical message."""
    _logger.critical(message, exc_info=exc_info)


def exception(message: str) -> None:
    """Log exception with traceback."""
    _logger.exception(message)
