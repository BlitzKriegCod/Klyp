# API Reference

Complete API documentation for Klyp - Universal Video Downloader.

## Table of Contents

- [Models API](#models-api)
  - [VideoInfo](#videoinfo)
  - [DownloadTask](#downloadtask)
  - [DownloadHistory](#downloadhistory)
  - [SearchResult](#searchresult)
  - [DownloadStatus](#downloadstatus)
  - [UserPreferences](#userpreferences)
- [Controllers API](#controllers-api)
  - [QueueManager](#queuemanager)
  - [DownloadService](#downloadservice)
  - [SearchManager](#searchmanager)
  - [HistoryManager](#historymanager)
  - [SettingsManager](#settingsmanager)
- [Utils API](#utils-api)
  - [VideoDownloader](#videodownloader)
  - [EventBus](#eventbus)
  - [ThreadPoolManager](#threadpoolmanager)
  - [Logger](#logger)
- [Event Types](#event-types)

---

## Models API

### VideoInfo

Stores video metadata and information.

**Module:** `models.data_models`

**Type:** `@dataclass`

#### Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `url` | `str` | Required | Video URL (must start with http:// or https://) |
| `title` | `str` | `""` | Video title |
| `thumbnail` | `str` | `""` | Thumbnail URL |
| `duration` | `int` | `0` | Video duration in seconds |
| `author` | `str` | `""` | Video author/uploader |
| `available_qualities` | `List[str]` | `[]` | List of available quality options |
| `selected_quality` | `str` | `"best"` | Selected quality for download |
| `filename` | `str` | `""` | Custom filename for download |
| `download_subtitles` | `bool` | `False` | Whether to download subtitles |


#### Validation

- `url` cannot be empty
- `url` must start with `http://` or `https://`

#### Example

```python
from models import VideoInfo

# Create video info
video_info = VideoInfo(
    url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    title="Example Video",
    selected_quality="1080p",
    download_subtitles=True
)

# Access fields
print(video_info.title)  # "Example Video"
print(video_info.url)    # "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

---

### DownloadTask

Represents a download task in the queue.

**Module:** `models.data_models`

**Type:** `@dataclass`

#### Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `str` | Required | Unique task identifier (UUID) |
| `video_info` | `VideoInfo` | Required | Associated video information |
| `status` | `DownloadStatus` | `QUEUED` | Current task status |
| `progress` | `float` | `0.0` | Download progress (0.0-100.0) |
| `download_path` | `str` | `""` | Destination directory path |
| `created_at` | `datetime` | `now()` | Task creation timestamp |
| `completed_at` | `Optional[datetime]` | `None` | Task completion timestamp |
| `error_message` | `str` | `""` | Error message if failed |

#### Validation

- `id` cannot be empty
- `video_info` must be a `VideoInfo` instance
- `status` must be a `DownloadStatus` enum
- `progress` must be between 0.0 and 100.0


#### Example

```python
from models import DownloadTask, VideoInfo, DownloadStatus
import uuid

# Create download task
task = DownloadTask(
    id=str(uuid.uuid4()),
    video_info=video_info,
    status=DownloadStatus.QUEUED,
    download_path="/home/user/Downloads"
)

# Update progress
task.progress = 50.0
task.status = DownloadStatus.DOWNLOADING
```

---

### DownloadHistory

Stores completed download records.

**Module:** `models.data_models`

**Type:** `@dataclass`

#### Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `str` | Required | Unique history identifier |
| `video_info` | `VideoInfo` | Required | Associated video information |
| `download_path` | `str` | Required | Path to downloaded file |
| `completed_at` | `datetime` | `now()` | Completion timestamp |
| `file_size` | `int` | `0` | File size in bytes |

#### Validation

- `id` cannot be empty
- `video_info` must be a `VideoInfo` instance
- `download_path` cannot be empty
- `file_size` cannot be negative

#### Example

```python
from models import DownloadHistory, VideoInfo
from datetime import datetime

history = DownloadHistory(
    id="hist_123",
    video_info=video_info,
    download_path="/home/user/Downloads/video.mp4",
    file_size=104857600  # 100 MB
)
```


---

### SearchResult

Structured search result with enriched metadata.

**Module:** `models.data_models`

**Type:** `@dataclass`

#### Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `str` | Required | Unique result identifier |
| `url` | `str` | Required | Video URL |
| `title` | `str` | Required | Video title |
| `author` | `str` | Required | Video author/uploader |
| `duration` | `str` | Required | Duration string (e.g., "10:30") |
| `thumbnail` | `str` | Required | Thumbnail URL |
| `platform` | `str` | Required | Platform name (YouTube, Vimeo, etc.) |
| `platform_category` | `str` | Required | Platform category |
| `platform_icon` | `str` | Required | Path to platform icon |
| `platform_color` | `str` | Required | Platform brand color |
| `view_count` | `Optional[int]` | `None` | Number of views |
| `like_count` | `Optional[int]` | `None` | Number of likes |
| `upload_date` | `Optional[str]` | `None` | Upload date string |
| `description` | `Optional[str]` | `None` | Video description |
| `tags` | `List[str]` | `[]` | Video tags |
| `available_qualities` | `List[str]` | `[]` | Available quality options |
| `enrichment_failed` | `bool` | `False` | Whether enrichment failed |
| `is_part_of_series` | `bool` | `False` | Whether part of a series |
| `series_name` | `Optional[str]` | `None` | Series name if applicable |
| `episode_number` | `Optional[int]` | `None` | Episode number if applicable |

#### Validation

- `url` cannot be empty
- `url` must start with `http://` or `https://`


#### Example

```python
from models import SearchResult

result = SearchResult(
    id="result_123",
    url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    title="Example Video",
    author="Example Channel",
    duration="3:32",
    thumbnail="https://example.com/thumb.jpg",
    platform="YouTube",
    platform_category="Video Streaming",
    platform_icon="assets/icons/youtube_logo.png",
    platform_color="#FF0000",
    view_count=1000000,
    available_qualities=["1080p", "720p", "480p"]
)
```

---

### DownloadStatus

Enumeration of download statuses.

**Module:** `models.data_models`

**Type:** `Enum`

#### Values

| Value | Description |
|-------|-------------|
| `QUEUED` | Task is queued and waiting to start |
| `DOWNLOADING` | Task is currently downloading |
| `COMPLETED` | Task completed successfully |
| `FAILED` | Task failed with an error |
| `STOPPED` | Task was stopped by user |

#### Example

```python
from models import DownloadStatus

# Check status
if task.status == DownloadStatus.DOWNLOADING:
    print(f"Progress: {task.progress}%")

# Update status
task.status = DownloadStatus.COMPLETED
```


---

### UserPreferences

User preferences learned from download history.

**Module:** `models.data_models`

**Type:** `@dataclass`

#### Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `top_platforms` | `List[str]` | `[]` | Most used platforms |
| `top_categories` | `List[str]` | `[]` | Most used categories |
| `preferred_quality` | `str` | `"1080p"` | Preferred video quality |
| `preferred_format` | `str` | `"best"` | Preferred format |
| `favorite_keywords` | `List[str]` | `[]` | Frequently searched keywords |
| `last_updated` | `datetime` | `now()` | Last update timestamp |

---

## Controllers API

### QueueManager

Manages the download queue operations with thread-safety.

**Module:** `controllers.queue_manager`

**Pattern:** Singleton with double-checked locking

**Thread-Safety:** Uses `threading.RLock` for reentrant locking

#### Methods

##### `add_task(video_info: VideoInfo, download_path: str = "") -> DownloadTask`

Add a new download task to the queue (thread-safe).

**Parameters:**
- `video_info`: VideoInfo object containing video metadata
- `download_path`: Path where the video will be downloaded

**Returns:** The created DownloadTask

**Raises:** `ValueError` if the video URL is already in the queue

**Example:**
```python
from controllers import QueueManager
from models import VideoInfo

queue_manager = QueueManager()
video_info = VideoInfo(url="https://youtube.com/watch?v=...")
task = queue_manager.add_task(video_info, "/home/user/Downloads")
```


##### `remove_task(task_id: str) -> bool`

Remove a task from the queue (thread-safe).

**Parameters:**
- `task_id`: ID of the task to remove

**Returns:** True if task was removed, False if not found

##### `get_task(task_id: str) -> Optional[DownloadTask]`

Get a task by ID (thread-safe).

**Parameters:**
- `task_id`: ID of the task to retrieve

**Returns:** DownloadTask if found, None otherwise

##### `get_all_tasks() -> List[DownloadTask]`

Get all tasks in the queue (thread-safe).

**Returns:** Copy of the list of all DownloadTask objects

**Note:** Returns a copy to prevent external modification without lock

##### `get_tasks_by_status(status: DownloadStatus) -> List[DownloadTask]`

Get all tasks with a specific status (thread-safe).

**Parameters:**
- `status`: DownloadStatus to filter by

**Returns:** List of DownloadTask objects with the specified status

##### `clear_queue() -> None`

Clear all tasks from the queue (thread-safe).

##### `is_url_in_queue(url: str) -> bool`

Check if a URL is already in the queue (thread-safe).

**Parameters:**
- `url`: URL to check

**Returns:** True if URL exists in queue, False otherwise


##### `update_task_status(task_id: str, status: DownloadStatus, progress: float = None, error_message: str = "") -> bool`

Update a task's status and progress (thread-safe).

**Parameters:**
- `task_id`: ID of the task to update
- `status`: New status
- `progress`: New progress value (0-100)
- `error_message`: Error message if status is FAILED

**Returns:** True if task was updated, False if not found

##### `export_queue(file_path: str) -> bool`

Export the current queue to a JSON file (thread-safe).

**Parameters:**
- `file_path`: Path to save the queue file

**Returns:** True if successful, False otherwise

##### `import_queue(file_path: str) -> int`

Import a queue from a JSON file (thread-safe).

**Parameters:**
- `file_path`: Path to the queue file

**Returns:** Number of tasks successfully imported

##### `save_pending_downloads(file_path: str) -> bool`

Save pending and downloading tasks to a file for auto-resume (thread-safe).

**Parameters:**
- `file_path`: Path to save the pending downloads file

**Returns:** True if successful, False otherwise

##### `load_pending_downloads(file_path: str) -> List[DownloadTask]`

Load pending downloads from a file (thread-safe).

**Parameters:**
- `file_path`: Path to the pending downloads file

**Returns:** List of DownloadTask objects loaded from the file


---

### DownloadService

Service layer for download operations. Singleton, thread-safe.

**Module:** `controllers.download_service`

**Pattern:** Singleton with double-checked locking

**Thread-Safety:** Uses locks for state management and EventBus for communication

#### Methods

##### `start_download(task_id: str) -> bool`

Start a specific download task.

**Parameters:**
- `task_id`: ID of the task to start

**Returns:** True if download was started successfully, False otherwise

**Example:**
```python
from controllers import DownloadService

service = DownloadService()
success = service.start_download(task_id)
if success:
    print("Download started")
```

##### `stop_download(task_id: str) -> bool`

Stop a specific download.

**Parameters:**
- `task_id`: ID of the task to stop

**Returns:** True if stop signal was sent, False if task is not active

##### `stop_all_downloads() -> None`

Stop all active downloads.

##### `start_all_downloads() -> int`

Start all queued downloads.

**Returns:** Number of downloads successfully started

##### `get_active_count() -> int`

Get the number of currently active downloads.

**Returns:** Number of active downloads


#### Internal Architecture

- Uses `ThreadPoolManager` for worker threads (max 3 concurrent downloads)
- Publishes events via `EventBus` for UI updates
- Tracks active downloads with `Future` objects
- Uses `threading.Event` for graceful cancellation
- Automatically adds completed downloads to history

---

### SearchManager

Manages video search operations using DuckDuckGo.

**Module:** `controllers.search_manager`

**Pattern:** Singleton

**Thread-Safety:** Uses thread pool for concurrent searches

#### Methods

##### `search(query: str, filters: dict = None) -> List[SearchResult]`

Perform a video search with optional filters.

**Parameters:**
- `query`: Search query string
- `filters`: Optional dictionary of filters (platform, duration, quality, etc.)

**Returns:** List of SearchResult objects

**Example:**
```python
from controllers import SearchManager

search_manager = SearchManager()
results = search_manager.search(
    query="python tutorial",
    filters={"platform": "YouTube", "duration": "long"}
)
```

##### `search_async(query: str, callback: Callable, filters: dict = None) -> None`

Perform asynchronous search with callback.

**Parameters:**
- `query`: Search query string
- `callback`: Function to call with results
- `filters`: Optional dictionary of filters


---

### HistoryManager

Manages download history persistence and retrieval.

**Module:** `controllers.history_manager`

**Storage:** JSON file at `~/.config/klyp/download_history.json`

#### Methods

##### `add_download(title: str, url: str, file_path: str, file_size: int = 0, platform: str = "Unknown", quality: str = "best", duration: int = 0) -> None`

Add a completed download to history.

**Parameters:**
- `title`: Video title
- `url`: Video URL
- `file_path`: Path to downloaded file
- `file_size`: File size in bytes
- `platform`: Platform name (YouTube, Vimeo, etc.)
- `quality`: Selected quality
- `duration`: Video duration in seconds

##### `get_all_history() -> List[Dict[str, Any]]`

Get all history items.

**Returns:** List of history items, most recent first

##### `get_recent_history(limit: int = 50) -> List[Dict[str, Any]]`

Get recent history items.

**Parameters:**
- `limit`: Maximum number of items to return

**Returns:** List of recent history items

##### `search_history(query: str) -> List[Dict[str, Any]]`

Search history by title.

**Parameters:**
- `query`: Search query

**Returns:** List of matching history items


##### `remove_item(item_id: str) -> bool`

Remove an item from history.

**Parameters:**
- `item_id`: ID of the item to remove

**Returns:** True if item was removed, False if not found

##### `clear_history() -> None`

Clear all history.

##### `get_statistics() -> Dict[str, Any]`

Get download statistics.

**Returns:** Dictionary with statistics including:
- `total_downloads`: Total number of downloads
- `total_size`: Total size in bytes
- `platforms`: Dictionary of platform counts

**Example:**
```python
from controllers import HistoryManager

history_manager = HistoryManager()
stats = history_manager.get_statistics()
print(f"Total downloads: {stats['total_downloads']}")
print(f"Total size: {stats['total_size']} bytes")
```

---

### SettingsManager

Manages user settings and preferences.

**Module:** `controllers.settings_manager`

**Pattern:** Singleton with double-checked locking

**Thread-Safety:** Uses `threading.RLock` for reentrant locking

**Storage:** JSON file at `~/.config/klyp/settings.json`


#### Default Settings

```python
{
    "download_directory": "~/Downloads/Klyp",
    "theme": "dark",
    "download_mode": "sequential",
    "proxy_enabled": False,
    "subtitle_download": False,
    "notifications_enabled": True,
    "auto_resume": True,
    "extract_audio": False,
    "audio_format": "mp3",
    "embed_thumbnail": False,
    "embed_metadata": False,
    "sponsorblock_enabled": False,
    "cookies_path": "",
    "search_enable_enrichment": True,
    "search_enable_quality_filter": True,
    "search_enable_recommendations": True,
    "debug_thread_safety": False
}
```

#### Methods

##### `get(key: str, default=None) -> Any`

Get a setting value (thread-safe).

**Parameters:**
- `key`: Setting key
- `default`: Default value if key doesn't exist

**Returns:** Setting value or default

##### `set(key: str, value: Any) -> None`

Set a setting value and save (thread-safe).

**Parameters:**
- `key`: Setting key
- `value`: Setting value

**Note:** Publishes `SETTINGS_CHANGED` event if value changes


##### `get_download_directory() -> str`

Get the download directory path (thread-safe).

##### `set_download_directory(path: str) -> None`

Set the download directory path (thread-safe).

##### `get_theme() -> str`

Get the current theme (dark or light) (thread-safe).

##### `set_theme(theme: str) -> None`

Set the theme (dark or light) (thread-safe).

**Raises:** `ValueError` if theme is not 'dark' or 'light'

##### `get_download_mode() -> str`

Get the download mode (sequential or multi-threaded) (thread-safe).

##### `set_download_mode(mode: str) -> None`

Set the download mode (sequential or multi-threaded) (thread-safe).

**Raises:** `ValueError` if mode is not 'sequential' or 'multi-threaded'

##### `reset_to_defaults() -> None`

Reset all settings to default values (thread-safe).

**Example:**
```python
from controllers import SettingsManager

settings = SettingsManager()
settings.set("theme", "light")
theme = settings.get("theme")  # "light"
settings.reset_to_defaults()
```

---

## Utils API

### VideoDownloader

Wrapper for yt-dlp with download and extraction capabilities.

**Module:** `utils.video_downloader`


#### Methods

##### `extract_info(url: str) -> VideoInfo`

Extract video information without downloading.

**Parameters:**
- `url`: Video URL

**Returns:** VideoInfo object with metadata

**Raises:** `ExtractionException` if extraction fails

**Example:**
```python
from utils import VideoDownloader

downloader = VideoDownloader()
video_info = downloader.extract_info("https://youtube.com/watch?v=...")
print(f"Title: {video_info.title}")
print(f"Duration: {video_info.duration}s")
print(f"Qualities: {video_info.available_qualities}")
```

##### `download(video_info: VideoInfo, download_path: str, progress_callback: Callable = None) -> str`

Download a video.

**Parameters:**
- `video_info`: VideoInfo object with download options
- `download_path`: Destination directory
- `progress_callback`: Optional callback for progress updates

**Returns:** Path to downloaded file

**Raises:** `DownloadException` if download fails

**Progress Callback Format:**
```python
def progress_callback(d: dict):
    if d['status'] == 'downloading':
        total = d.get('total_bytes', 0)
        downloaded = d.get('downloaded_bytes', 0)
        progress = (downloaded / total) * 100
        print(f"Progress: {progress:.1f}%")
```


##### `download_with_subtitles(video_info: VideoInfo, download_path: str, progress_callback: Callable = None) -> str`

Download a video with subtitles.

**Parameters:**
- `video_info`: VideoInfo object with download options
- `download_path`: Destination directory
- `progress_callback`: Optional callback for progress updates

**Returns:** Path to downloaded file

**Raises:** `DownloadException` if download fails

##### `get_available_formats(url: str) -> List[Dict[str, Any]]`

Get all available formats for a video.

**Parameters:**
- `url`: Video URL

**Returns:** List of format dictionaries

#### Configuration Options

The VideoDownloader respects settings from SettingsManager:

- `extract_audio`: Extract audio only
- `audio_format`: Audio format (mp3, m4a, etc.)
- `embed_thumbnail`: Embed thumbnail in file
- `embed_metadata`: Embed metadata in file
- `sponsorblock_enabled`: Remove sponsored segments
- `cookies_path`: Path to cookies file for authentication

---

### EventBus

Thread-safe event bus for cross-thread communication.

**Module:** `utils.event_bus`

**Pattern:** Singleton with double-checked locking

**Thread-Safety:** Uses `queue.Queue` for thread-safe event queuing


#### Methods

##### `publish(event: Event) -> bool`

Publish an event from any thread.

**Parameters:**
- `event`: Event to publish

**Returns:** True if event was queued successfully, False if queue is full

**Thread-Safety:** Can be called from worker threads

**Example:**
```python
from utils.event_bus import EventBus, Event, EventType

event_bus = EventBus()
event_bus.publish(Event(
    type=EventType.DOWNLOAD_PROGRESS,
    data={"task_id": "123", "progress": 50.0}
))
```

##### `subscribe(event_type: EventType, callback: Callable[[Event], None]) -> str`

Subscribe to an event type.

**Parameters:**
- `event_type`: Type of event to subscribe to
- `callback`: Function to call when event occurs

**Returns:** Subscription ID for unsubscribing

**Note:** Callback is invoked in the UI thread

**Example:**
```python
def on_download_complete(event: Event):
    task_id = event.data["task_id"]
    print(f"Download {task_id} completed!")

sub_id = event_bus.subscribe(EventType.DOWNLOAD_COMPLETE, on_download_complete)
```

##### `unsubscribe(sub_id: str) -> bool`

Unsubscribe using subscription ID.

**Parameters:**
- `sub_id`: Subscription ID returned by subscribe()

**Returns:** True if subscription was found and removed, False otherwise


##### `start(root: tk.Tk) -> None`

Start event processing loop.

**Parameters:**
- `root`: Tkinter root window

**Note:** Should be called after UI initialization

##### `stop() -> None`

Stop event processing loop.

**Note:** Should be called when application is closing

##### `clear_queue() -> int`

Clear all pending events from the queue.

**Returns:** Number of events cleared

##### `get_queue_size() -> int`

Get the current number of events in the queue.

**Returns:** Number of pending events

##### `get_listener_count(event_type: Optional[EventType] = None) -> int`

Get the number of listeners.

**Parameters:**
- `event_type`: If specified, count listeners for this event type only

**Returns:** Number of listeners

#### Configuration

- `MAX_QUEUE_SIZE`: 1000 events (prevents memory leaks)
- `PROCESS_INTERVAL_MS`: 100ms (event processing interval)
- Processes max 100 events per cycle to prevent UI freezing

---

### ThreadPoolManager

Centralized thread pool management with proper lifecycle.

**Module:** `utils.thread_pool_manager`

**Pattern:** Singleton with double-checked locking

**Thread-Safety:** Lazy initialization with locks


#### Properties

##### `download_pool -> ThreadPoolExecutor`

Get or create download thread pool.

**Returns:** ThreadPoolExecutor for download operations

**Configuration:** Max 3 workers, thread name prefix "download_worker"

**Note:** Lazy initialization - pool created on first access

##### `search_pool -> ThreadPoolExecutor`

Get or create search thread pool.

**Returns:** ThreadPoolExecutor for search operations

**Configuration:** Max 3 workers, thread name prefix "search_worker"

**Note:** Lazy initialization - pool created on first access

#### Methods

##### `shutdown(timeout: int = 10) -> bool`

Shutdown all thread pools gracefully.

**Parameters:**
- `timeout`: Maximum time in seconds to wait for shutdown

**Returns:** True if all pools shut down successfully, False if timeout occurred

**Example:**
```python
from utils import ThreadPoolManager

manager = ThreadPoolManager()

# Submit tasks
future = manager.download_pool.submit(download_function, args)

# Shutdown when closing
manager.shutdown(timeout=10)
```

##### `is_download_pool_active() -> bool`

Check if download pool has been created.

**Returns:** True if download pool exists, False otherwise


##### `is_search_pool_active() -> bool`

Check if search pool has been created.

**Returns:** True if search pool exists, False otherwise

##### `get_download_worker_count() -> int`

Get the maximum number of download workers.

**Returns:** Maximum number of concurrent download workers (3)

##### `get_search_worker_count() -> int`

Get the maximum number of search workers.

**Returns:** Maximum number of concurrent search workers (3)

---

### Logger

Application logger with file and console output.

**Module:** `utils.logger`

**Pattern:** Singleton

**Storage:** Log files at `~/.config/klyp/logs/`

#### Functions

##### `get_logger() -> AppLogger`

Get the global logger instance.

**Returns:** AppLogger instance

##### `set_debug_mode(enabled: bool) -> None`

Enable or disable debug mode globally.

**Parameters:**
- `enabled`: True to enable debug mode, False to disable


##### `debug(message: str) -> None`

Log debug message.

##### `info(message: str) -> None`

Log info message.

##### `warning(message: str) -> None`

Log warning message.

##### `error(message: str, exc_info: bool = False) -> None`

Log error message.

**Parameters:**
- `message`: Error message to log
- `exc_info`: If True, include exception information

##### `exception(message: str) -> None`

Log exception with traceback.

##### `log_exception_structured(exception: Exception, context: dict = None, message: str = None) -> None`

Log exception with structured context information.

**Parameters:**
- `exception`: The exception that occurred
- `context`: Dictionary with contextual information (task_id, url, etc.)
- `message`: Optional custom message

**Example:**
```python
from utils.logger import get_logger

logger = get_logger()
logger.info("Application started")

try:
    # Some operation
    pass
except Exception as e:
    logger.log_exception_structured(
        exception=e,
        context={"task_id": "123", "url": "https://..."},
        message="Download failed"
    )
```


#### AppLogger Methods

##### `set_debug_mode(enabled: bool) -> None`

Enable or disable debug mode.

##### `get_log_file_path() -> str`

Get the current log file path.

**Returns:** Path to the current log file

##### `cleanup_old_logs(days: int = 7) -> int`

Clean up log files older than specified days.

**Parameters:**
- `days`: Number of days to keep logs

**Returns:** Number of log files deleted

#### Log Levels

- **DEBUG**: Detailed information for debugging (only in debug mode)
- **INFO**: General informational messages
- **WARNING**: Warning messages for potential issues
- **ERROR**: Error messages for failures
- **CRITICAL**: Critical errors that may cause application failure

#### Log Format

**File:** `YYYY-MM-DD HH:MM:SS - KlypVideoDownloader - LEVEL - filename:line - message`

**Console:** `LEVEL - message`

---

## Event Types

### EventType Enum

**Module:** `utils.event_bus`

All event types in the application with their data structures.


### DOWNLOAD_PROGRESS

Published during download to report progress.

**Data Structure:**
```python
{
    "task_id": str,              # ID of the download task
    "progress": float,           # Progress percentage (0-100)
    "status": str,               # Current status (optional)
    "downloaded_bytes": int,     # Bytes downloaded (optional)
    "total_bytes": int          # Total bytes (optional)
}
```

**Example:**
```python
event_bus.subscribe(EventType.DOWNLOAD_PROGRESS, lambda e: 
    print(f"Task {e.data['task_id']}: {e.data['progress']:.1f}%")
)
```

---

### DOWNLOAD_COMPLETE

Published when a download completes successfully.

**Data Structure:**
```python
{
    "task_id": str,     # ID of the download task
    "file_path": str    # Path to downloaded file
}
```

**Example:**
```python
def on_complete(event: Event):
    task_id = event.data["task_id"]
    file_path = event.data["file_path"]
    print(f"Download {task_id} saved to {file_path}")

event_bus.subscribe(EventType.DOWNLOAD_COMPLETE, on_complete)
```

---

### DOWNLOAD_FAILED

Published when a download fails.

**Data Structure:**
```python
{
    "task_id": str,         # ID of the download task
    "error": str,           # Error message
    "error_type": str       # Type of error (optional)
}
```


---

### DOWNLOAD_STOPPED

Published when a download is stopped by user.

**Data Structure:**
```python
{
    "task_id": str,     # ID of the download task
    "reason": str       # Reason for stopping (optional)
}
```

---

### SEARCH_COMPLETE

Published when a search completes successfully.

**Data Structure:**
```python
{
    "query": str,                    # Search query
    "results": List[SearchResult],   # Search results
    "result_count": int              # Number of results
}
```

**Example:**
```python
def on_search_complete(event: Event):
    query = event.data["query"]
    results = event.data["results"]
    print(f"Found {len(results)} results for '{query}'")
    for result in results:
        print(f"  - {result.title}")

event_bus.subscribe(EventType.SEARCH_COMPLETE, on_search_complete)
```

---

### SEARCH_FAILED

Published when a search fails.

**Data Structure:**
```python
{
    "query": str,   # Search query
    "error": str    # Error message
}
```


---

### QUEUE_UPDATED

Published when the download queue is modified.

**Data Structure:**
```python
{
    "action": str,      # Action performed (add, remove, update, clear)
    "task_id": str,     # ID of affected task (optional)
    "task_count": int   # Total tasks in queue (optional)
}
```

**Example:**
```python
def on_queue_updated(event: Event):
    action = event.data["action"]
    task_count = event.data.get("task_count", 0)
    print(f"Queue {action}: {task_count} tasks")

event_bus.subscribe(EventType.QUEUE_UPDATED, on_queue_updated)
```

---

### SETTINGS_CHANGED

Published when settings are modified.

**Data Structure:**
```python
{
    "changed_keys": List[str],      # List of setting keys that changed
    "settings": Dict[str, Any]      # New settings values
}
```

**Example:**
```python
def on_settings_changed(event: Event):
    changed_keys = event.data["changed_keys"]
    settings = event.data["settings"]
    
    if "theme" in changed_keys:
        new_theme = settings["theme"]
        print(f"Theme changed to: {new_theme}")

event_bus.subscribe(EventType.SETTINGS_CHANGED, on_settings_changed)
```

---

## Complete Usage Example

Here's a complete example showing how to use the main APIs together:


```python
import tkinter as tk
from models import VideoInfo, DownloadStatus
from controllers import QueueManager, DownloadService, SettingsManager
from utils.event_bus import EventBus, Event, EventType
from utils.logger import get_logger
from utils import VideoDownloader

# Initialize logger
logger = get_logger()
logger.info("Application starting")

# Get singleton instances
queue_manager = QueueManager()
download_service = DownloadService()
settings_manager = SettingsManager()
event_bus = EventBus()

# Configure settings
settings_manager.set("download_directory", "/home/user/Videos")
settings_manager.set("theme", "dark")

# Subscribe to events
def on_download_progress(event: Event):
    task_id = event.data["task_id"]
    progress = event.data["progress"]
    logger.info(f"Task {task_id}: {progress:.1f}%")

def on_download_complete(event: Event):
    task_id = event.data["task_id"]
    file_path = event.data["file_path"]
    logger.info(f"Download complete: {file_path}")

def on_download_failed(event: Event):
    task_id = event.data["task_id"]
    error = event.data["error"]
    logger.error(f"Download failed: {error}")

event_bus.subscribe(EventType.DOWNLOAD_PROGRESS, on_download_progress)
event_bus.subscribe(EventType.DOWNLOAD_COMPLETE, on_download_complete)
event_bus.subscribe(EventType.DOWNLOAD_FAILED, on_download_failed)

# Extract video info
downloader = VideoDownloader()
video_info = downloader.extract_info("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
logger.info(f"Extracted: {video_info.title}")

# Add to queue
download_path = settings_manager.get_download_directory()
task = queue_manager.add_task(video_info, download_path)
logger.info(f"Added task {task.id} to queue")

# Start download
success = download_service.start_download(task.id)
if success:
    logger.info("Download started")

# Start event processing (in main UI thread)
root = tk.Tk()
event_bus.start(root)

# Run application
root.mainloop()

# Cleanup on exit
event_bus.stop()
download_service.stop_all_downloads()
```

---

## Thread Safety Notes

### Singleton Pattern

All manager classes use double-checked locking for thread-safe singleton initialization:

```python
if cls._instance is None:
    with cls._lock:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
```

### Reentrant Locks

`QueueManager` and `SettingsManager` use `threading.RLock` (reentrant lock) to allow the same thread to acquire the lock multiple times. This is necessary when methods call other methods within the same class.

### Event-Driven Communication

Worker threads publish events via `EventBus`, which uses `queue.Queue` for thread-safe queuing. Events are processed in the UI thread to ensure thread-safe UI updates.

### Thread Pools

`ThreadPoolManager` provides separate pools for downloads (3 workers) and searches (3 workers) to prevent resource contention and system overload.

---

## Error Handling

### Exception Hierarchy

```python
DownloadException (base)
├── NetworkException
├── AuthenticationException
├── FormatException
├── ExtractionException
└── SearchException
```

### Error Classification

The `classify_yt_dlp_error()` function automatically classifies yt-dlp errors into specific exception types for granular error handling.

### Structured Logging

Use `log_exception_structured()` for comprehensive error logging with context:

```python
logger.log_exception_structured(
    exception=e,
    context={
        "task_id": task_id,
        "url": video_info.url,
        "operation": "download"
    },
    message="Download failed"
)
```

---

**Last Updated:** 2024
**Version:** 1.0
