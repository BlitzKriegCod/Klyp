# Design Document

## Overview

Application to download videos from OK.ru with a modern GUI built using ttkbootstrap. Features include download queue management, multi-threaded/sequential downloads, search functionality, dark/light themes, and authentication support for private videos.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Main Application                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   GUI Layer  │  │  Logic Layer │  │  Download    │       │
│  │  (ttkbootstrap)││  (Queue,     │  │  Manager     │       │
│  │              │  │  Auth,       │  │  (yt-dlp)    │       │
│  │ - Main Window│  │  Settings)   │  │              │       │
│  │ - Screens    │  │              │  │ - Queue      │       │
│  │ - Widgets    │  │              │  │ - Threads    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Settings   │  │   History    │  │   Queue      │       │
│  │   Manager    │  │   Manager    │  │   Manager    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Main Application
- **MainApplication**: Root window with navigation system
- **ThemeManager**: Handles dark/light theme switching
- **ConfigManager**: Manages user settings and preferences

### Screens
- **HomeScreen**: URL input, queue summary, navigation
- **SearchScreen**: Search input and results display
- **QueueScreen**: Download queue with progress tracking
- **SettingsScreen**: Download directory, theme, proxy, auth
- **HistoryScreen**: Completed downloads list

### Download Manager
- **DownloadManager**: Manages download queue and threads
- **VideoDownloader**: Handles individual video downloads using yt-dlp
- **SessionManager**: Manages authentication sessions for private videos

### Data Models
- **VideoInfo**: Stores video metadata (title, URL, quality, etc.)
- **DownloadTask**: Represents a download in the queue
- **DownloadHistory**: Stores completed download records

## Data Models

### VideoInfo
```python
{
    "url": str,
    "title": str,
    "thumbnail": str,
    "duration": int,
    "author": str,
    "available_qualities": list,
    "selected_quality": str,
    "filename": str
}
```

### DownloadTask
```python
{
    "id": str,
    "video_info": VideoInfo,
    "status": "queued" | "downloading" | "completed" | "failed" | "stopped",
    "progress": float,
    "download_path": str,
    "created_at": datetime,
    "completed_at": datetime
}
```

### DownloadHistory
```python
{
    "id": str,
    "video_info": VideoInfo,
    "download_path": str,
    "completed_at": datetime,
    "file_size": int
}
```

## Error Handling

- **Network errors**: Retry with exponential backoff
- **Authentication errors**: Prompt for re-login
- **Invalid URL**: Display error message
- **Disk space**: Check before download starts
- **Download failures**: Log error and mark task as failed

## Testing Strategy

- Unit tests for DownloadManager and VideoDownloader
- Integration tests for authentication flow
- UI tests for theme switching and navigation
- Test with various video URLs (public/private)
