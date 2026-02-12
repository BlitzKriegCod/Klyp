"""
Data models for OK.ru Video Downloader.
Defines VideoInfo, DownloadTask, and DownloadHistory structures.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class DownloadStatus(Enum):
    """Enumeration of download statuses."""
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    COMPLETED = "completed"
    FAILED = "failed"
    STOPPED = "stopped"


@dataclass
class VideoInfo:
    """Stores video metadata and information."""
    url: str
    title: str = ""
    thumbnail: str = ""
    duration: int = 0
    author: str = ""
    available_qualities: List[str] = field(default_factory=list)
    selected_quality: str = "best"
    filename: str = ""
    download_subtitles: bool = False
    
    def __post_init__(self):
        """Validate VideoInfo after initialization."""
        if not self.url:
            raise ValueError("URL cannot be empty")
        if not self.url.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")


@dataclass
class DownloadTask:
    """Represents a download task in the queue."""
    id: str
    video_info: VideoInfo
    status: DownloadStatus = DownloadStatus.QUEUED
    progress: float = 0.0
    download_path: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    error_message: str = ""
    
    def __post_init__(self):
        """Validate DownloadTask after initialization."""
        if not self.id:
            raise ValueError("Task ID cannot be empty")
        if not isinstance(self.video_info, VideoInfo):
            raise TypeError("video_info must be a VideoInfo instance")
        if not isinstance(self.status, DownloadStatus):
            if isinstance(self.status, str):
                self.status = DownloadStatus(self.status)
            else:
                raise TypeError("status must be a DownloadStatus enum")
        if not 0.0 <= self.progress <= 100.0:
            raise ValueError("Progress must be between 0.0 and 100.0")


@dataclass
class DownloadHistory:
    """Stores completed download records."""
    id: str
    video_info: VideoInfo
    download_path: str
    completed_at: datetime = field(default_factory=datetime.now)
    file_size: int = 0
    
    def __post_init__(self):
        """Validate DownloadHistory after initialization."""
        if not self.id:
            raise ValueError("History ID cannot be empty")
        if not isinstance(self.video_info, VideoInfo):
            raise TypeError("video_info must be a VideoInfo instance")
        if not self.download_path:
            raise ValueError("Download path cannot be empty")
        if self.file_size < 0:
            raise ValueError("File size cannot be negative")


@dataclass
class SearchResult:
    """Structured search result with enriched metadata."""
    id: str
    url: str
    title: str
    author: str
    duration: str
    thumbnail: str
    platform: str
    platform_category: str
    platform_icon: str
    platform_color: str
    
    # Enriched metadata fields (optional)
    view_count: Optional[int] = None
    like_count: Optional[int] = None
    upload_date: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    available_qualities: List[str] = field(default_factory=list)
    
    # Enrichment status
    enrichment_failed: bool = False
    
    # Series detection fields
    is_part_of_series: bool = False
    series_name: Optional[str] = None
    episode_number: Optional[int] = None
    
    def __post_init__(self):
        """Validate SearchResult after initialization."""
        if not self.url:
            raise ValueError("URL cannot be empty")
        if not self.url.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")


@dataclass
class UserPreferences:
    """User preferences learned from download history."""
    top_platforms: List[str] = field(default_factory=list)
    top_categories: List[str] = field(default_factory=list)
    preferred_quality: str = "1080p"
    preferred_format: str = "best"
    favorite_keywords: List[str] = field(default_factory=list)
    last_updated: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        """Validate UserPreferences after initialization."""
        if not isinstance(self.top_platforms, list):
            raise TypeError("top_platforms must be a list")
        if not isinstance(self.top_categories, list):
            raise TypeError("top_categories must be a list")
        if not isinstance(self.favorite_keywords, list):
            raise TypeError("favorite_keywords must be a list")
