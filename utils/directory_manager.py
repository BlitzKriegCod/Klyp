"""
Directory Manager for OK.ru Video Downloader.
Handles download directory creation and validation.
"""

import os
from pathlib import Path
from typing import Tuple


class DirectoryManager:
    """Manages download directory operations."""
    
    @staticmethod
    def validate_directory(directory_path: str) -> Tuple[bool, str]:
        """
        Validate if a directory path is valid and accessible.
        
        Args:
            directory_path: Path to validate.
        
        Returns:
            Tuple of (is_valid, error_message).
            If valid, error_message is empty string.
        """
        if not directory_path:
            return False, "Directory path cannot be empty"
        
        try:
            path = Path(directory_path)
            
            # Check if path exists
            if path.exists():
                # Check if it's a directory
                if not path.is_dir():
                    return False, "Path exists but is not a directory"
                
                # Check write permissions
                if not os.access(path, os.W_OK):
                    return False, "Directory is not writable"
                
                return True, ""
            else:
                # Check if parent directory exists and is writable
                parent = path.parent
                if not parent.exists():
                    # Try to find the first existing parent
                    while not parent.exists() and parent != parent.parent:
                        parent = parent.parent
                
                if parent.exists() and os.access(parent, os.W_OK):
                    return True, ""
                else:
                    return False, "Cannot create directory: parent is not writable"
                    
        except Exception as e:
            return False, f"Invalid directory path: {str(e)}"
    
    @staticmethod
    def create_directory(directory_path: str) -> Tuple[bool, str]:
        """
        Create a directory if it doesn't exist.
        
        Args:
            directory_path: Path to create.
        
        Returns:
            Tuple of (success, error_message).
            If successful, error_message is empty string.
        """
        try:
            path = Path(directory_path)
            
            # Create directory with parents
            path.mkdir(parents=True, exist_ok=True)
            
            # Verify it was created and is writable
            if path.exists() and path.is_dir() and os.access(path, os.W_OK):
                return True, ""
            else:
                return False, "Directory created but is not accessible"
                
        except PermissionError:
            return False, "Permission denied: cannot create directory"
        except OSError as e:
            return False, f"Failed to create directory: {str(e)}"
        except Exception as e:
            return False, f"Unexpected error: {str(e)}"
    
    @staticmethod
    def ensure_directory_exists(directory_path: str) -> Tuple[bool, str]:
        """
        Ensure a directory exists, creating it if necessary.
        
        Args:
            directory_path: Path to ensure exists.
        
        Returns:
            Tuple of (success, error_message).
            If successful, error_message is empty string.
        """
        # First validate the path
        is_valid, error_msg = DirectoryManager.validate_directory(directory_path)
        
        if not is_valid and "not writable" not in error_msg.lower():
            return False, error_msg
        
        # Try to create if it doesn't exist
        path = Path(directory_path)
        if not path.exists():
            return DirectoryManager.create_directory(directory_path)
        
        return True, ""
    
    @staticmethod
    def get_directory_info(directory_path: str) -> dict:
        """
        Get information about a directory.
        
        Args:
            directory_path: Path to get info about.
        
        Returns:
            Dictionary with directory information.
        """
        try:
            path = Path(directory_path)
            
            if not path.exists():
                return {
                    'exists': False,
                    'is_directory': False,
                    'is_writable': False,
                    'size': 0,
                    'file_count': 0
                }
            
            # Count files in directory
            file_count = len(list(path.glob('*'))) if path.is_dir() else 0
            
            # Calculate directory size
            total_size = 0
            if path.is_dir():
                for item in path.rglob('*'):
                    if item.is_file():
                        total_size += item.stat().st_size
            
            return {
                'exists': True,
                'is_directory': path.is_dir(),
                'is_writable': os.access(path, os.W_OK),
                'size': total_size,
                'file_count': file_count,
                'absolute_path': str(path.absolute())
            }
            
        except Exception as e:
            return {
                'exists': False,
                'is_directory': False,
                'is_writable': False,
                'size': 0,
                'file_count': 0,
                'error': str(e)
            }
