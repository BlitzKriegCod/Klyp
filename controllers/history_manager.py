"""
History Manager for Klyp Video Downloader.
Tracks completed downloads and provides history functionality.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional


class HistoryManager:
    """Manages download history persistence and retrieval."""
    
    def __init__(self, history_file: Optional[str] = None):
        """
        Initialize HistoryManager.
        
        Args:
            history_file: Path to history JSON file. If None, uses default location.
        """
        if history_file is None:
            config_dir = Path.home() / ".config" / "klyp"
            config_dir.mkdir(parents=True, exist_ok=True)
            history_file = config_dir / "download_history.json"
        
        self.history_file = Path(history_file)
        self.history_items: List[Dict[str, Any]] = []
        self.load_history()
    
    def load_history(self) -> None:
        """Load history from file."""
        if not self.history_file.exists():
            self.history_items = []
            return
        
        try:
            with open(self.history_file, 'r', encoding='utf-8') as f:
                self.history_items = json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error loading history: {e}")
            self.history_items = []
    
    def save_history(self) -> bool:
        """
        Save history to file.
        
        Returns:
            True if successful, False otherwise.
        """
        try:
            self.history_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.history_file, 'w', encoding='utf-8') as f:
                json.dump(self.history_items, f, indent=2)
            return True
        except IOError as e:
            print(f"Error saving history: {e}")
            return False
    
    def add_download(self, 
                    title: str,
                    url: str,
                    file_path: str,
                    file_size: int = 0,
                    platform: str = "Unknown",
                    quality: str = "best",
                    duration: int = 0) -> None:
        """
        Add a completed download to history.
        
        Args:
            title: Video title
            url: Video URL
            file_path: Path to downloaded file
            file_size: File size in bytes
            platform: Platform name (YouTube, Vimeo, etc.)
            quality: Selected quality
            duration: Video duration in seconds
        """
        history_item = {
            "id": f"{datetime.now().timestamp()}_{hash(url)}",
            "title": title,
            "url": url,
            "path": file_path,
            "size": file_size,
            "platform": platform,
            "quality": quality,
            "duration": duration,
            "date": datetime.now().isoformat(),
            "timestamp": datetime.now().timestamp()
        }
        
        # Add to beginning of list (most recent first)
        self.history_items.insert(0, history_item)
        
        # Limit history to 1000 items
        if len(self.history_items) > 1000:
            self.history_items = self.history_items[:1000]
        
        self.save_history()
    
    def get_all_history(self) -> List[Dict[str, Any]]:
        """
        Get all history items.
        
        Returns:
            List of history items, most recent first.
        """
        return self.history_items.copy()
    
    def get_recent_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get recent history items.
        
        Args:
            limit: Maximum number of items to return.
            
        Returns:
            List of recent history items.
        """
        return self.history_items[:limit]
    
    def search_history(self, query: str) -> List[Dict[str, Any]]:
        """
        Search history by title.
        
        Args:
            query: Search query.
            
        Returns:
            List of matching history items.
        """
        query_lower = query.lower()
        return [
            item for item in self.history_items
            if query_lower in item.get("title", "").lower()
        ]
    
    def remove_item(self, item_id: str) -> bool:
        """
        Remove an item from history.
        
        Args:
            item_id: ID of the item to remove.
            
        Returns:
            True if item was removed, False if not found.
        """
        for i, item in enumerate(self.history_items):
            if item.get("id") == item_id:
                self.history_items.pop(i)
                self.save_history()
                return True
        return False
    
    def clear_history(self) -> None:
        """Clear all history."""
        self.history_items = []
        self.save_history()
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get download statistics.
        
        Returns:
            Dictionary with statistics.
        """
        total_downloads = len(self.history_items)
        total_size = sum(item.get("size", 0) for item in self.history_items)
        
        # Platform breakdown
        platforms = {}
        for item in self.history_items:
            platform = item.get("platform", "Unknown")
            platforms[platform] = platforms.get(platform, 0) + 1
        
        return {
            "total_downloads": total_downloads,
            "total_size": total_size,
            "platforms": platforms
        }
