# Navigation Map

## Overview

The application follows a tab-based navigation structure with the following main sections:

```
Main Window
├── Home Screen (default view)
├── Search Screen
├── Download Queue
├── Settings Screen
└── History Screen
```

## Screen Descriptions

### Home Screen
- URL input field with "Add to Queue" button
- Quick access to search, queue, settings, and history
- Download status summary (queued, downloading, completed, failed)

### Search Screen
- Search input field for OK.ru search
- Search results display with video thumbnails, titles, duration, author
- "Add to Queue" button for each result

### Download Queue
- List of all queued videos with status indicators
- Progress bars for active downloads
- Actions: Remove, Stop, Rename, Select Quality, Download Subtitles
- Download mode toggle (multi-threaded/sequential)

### Settings Screen
- Download directory selector
- Theme switch (dark/light)
- Download mode selection
- Proxy settings
- Authentication (login/logout for private videos)
- Auto-resume preference

### History Screen
- List of completed downloads
- Filter by date/status
- Clear history option

## Navigation Flow

```
[Home] ↔ [Search]
[Home] ↔ [Queue]
[Home] ↔ [Settings]
[Home] ↔ [History]
[Queue] → [Download Progress] (during download)
[Settings] → [Directory Picker] (when changing download dir)
[Settings] → [Login Dialog] (when logging in)
```

## User Journey Examples

### Download Public Video
1. Home → Enter URL → Add to Queue
2. Queue → Start Download
3. Download Progress → Complete

### Search and Download
1. Home → Search Screen
2. Search → Enter query → View results
3. Result → Add to Queue
4. Queue → Start Download

### Download Private Video
1. Settings → Login Dialog
2. Enter credentials → Authenticate
3. Home → Enter private URL → Add to Queue
4. Queue → Start Download (uses authenticated session)

### Bulk Download
1. Settings → Load URLs File
2. Select .txt file → Parse URLs → Add to Queue
3. Queue → Start All Downloads
