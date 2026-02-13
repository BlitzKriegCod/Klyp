# Development Guide

This guide provides comprehensive information for developers working on Klyp - Universal Video Downloader. It covers environment setup, project structure, coding conventions, testing, and build processes.

## Table of Contents

- [Environment Setup](#environment-setup)
- [Project Structure](#project-structure)
- [Dependencies](#dependencies)
- [Coding Conventions](#coding-conventions)
- [Testing Strategy](#testing-strategy)
- [Running Tests](#running-tests)
- [Debugging](#debugging)
- [Build Process](#build-process)

## Environment Setup

### Prerequisites

Klyp requires Python 3.8 or higher. Verify your Python installation:

```bash
python3 --version
# or on Windows
python --version
```

### Setting Up Development Environment

1. **Clone the repository:**

```bash
git clone https://github.com/yourusername/klyp.git
cd klyp
```

2. **Create a virtual environment (recommended):**

```bash
# Linux/macOS
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

3. **Install dependencies:**

```bash
pip install -r requirements.txt
```

4. **Install development dependencies:**

```bash
pip install pytest pytest-cov pyinstaller
```

5. **Verify installation:**

```bash
python main.py
```

### IDE Configuration

#### Recommended IDEs

- **VS Code**: Install Python extension, configure linting with flake8/pylint
- **PyCharm**: Professional or Community Edition with Python support
- **Sublime Text**: With Anaconda package for Python development

#### VS Code Settings (Recommended)

Create `.vscode/settings.json`:

```json
{
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.formatting.provider": "black",
  "python.testing.pytestEnabled": true,
  "python.testing.unittestEnabled": false,
  "editor.formatOnSave": true,
  "files.exclude": {
    "**/__pycache__": true,
    "**/*.pyc": true
  }
}
```

### FFmpeg Configuration

Klyp uses `static-ffmpeg` which automatically downloads and manages FFmpeg. However, for development, you may want to install FFmpeg system-wide:

**Linux:**
```bash
sudo apt-get install ffmpeg  # Debian/Ubuntu
sudo dnf install ffmpeg      # Fedora
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH.


## Project Structure

Klyp follows a clean MVC (Model-View-Controller) architecture with clear separation of concerns:

```
klyp/
├── main.py                      # Application entry point
├── requirements.txt             # Python dependencies
├── setup.py                     # Package configuration
├── build_config.spec            # PyInstaller build configuration
├── build_linux.sh               # Linux build script
├── build_windows.bat            # Windows build script
│
├── models/                      # Data models (Domain Layer)
│   ├── __init__.py
│   └── data_models.py          # VideoInfo, DownloadTask, DownloadHistory, etc.
│
├── views/                       # UI screens (Presentation Layer)
│   ├── __init__.py
│   ├── home_screen.py          # Main screen with URL input
│   ├── search_screen.py        # Video search interface
│   ├── queue_screen.py         # Download queue management
│   ├── history_screen.py       # Download history viewer
│   ├── settings_screen.py      # Application settings
│   └── subtitles_screen.py     # Subtitle download interface
│
├── controllers/                 # Business logic (Application Layer)
│   ├── __init__.py
│   ├── download_manager.py     # (Deprecated) Download coordination
│   ├── download_service.py     # Singleton download service
│   ├── queue_manager.py        # Thread-safe queue management
│   ├── search_manager.py       # Video search functionality
│   ├── history_manager.py      # History persistence
│   ├── settings_manager.py     # Settings management
│   └── theme_manager.py        # Theme switching
│
├── utils/                       # Utilities (Infrastructure Layer)
│   ├── __init__.py
│   ├── video_downloader.py     # yt-dlp wrapper
│   ├── event_bus.py            # Event-driven communication
│   ├── thread_pool_manager.py  # Thread pool management
│   ├── logger.py               # Structured logging
│   ├── notification_manager.py # Desktop notifications
│   ├── safe_callback_mixin.py  # Thread-safe UI callbacks
│   ├── directory_manager.py    # Directory utilities
│   ├── decorators.py           # Custom decorators
│   ├── exceptions.py           # Custom exception hierarchy
│   ├── quality_dialog.py       # Quality selection dialog
│   ├── resume_dialog.py        # Resume download dialog
│   ├── series_dialog.py        # Series download dialog
│   ├── advanced_search_panel.py # Advanced search UI
│   ├── recommendations_panel.py # Video recommendations
│   ├── trending_tab.py         # Trending videos
│   ├── metadata_tooltip.py     # Video metadata tooltips
│   ├── platform_health_indicator.py # Platform status
│   ├── batch_compare_dialog.py # Batch comparison
│   └── session_manager.py      # Session management
│
├── tests/                       # Test suite
│   ├── __init__.py
│   ├── test_data_models.py
│   ├── test_download_manager.py
│   ├── test_download_service.py
│   ├── test_queue_manager.py
│   ├── test_queue_manager_thread_safety.py
│   ├── test_search_manager.py
│   ├── test_settings_manager.py
│   ├── test_event_bus.py
│   ├── test_thread_pool_manager.py
│   ├── test_safe_callback_mixin.py
│   ├── test_notification_manager.py
│   ├── test_metadata_enrichment.py
│   ├── test_metadata_fetch.py
│   ├── test_recommendations.py
│   ├── test_advanced_features.py
│   ├── test_data_compatibility.py
│   ├── test_ui_components.py
│   ├── test_integration.py
│   └── test_stress_stability.py
│
├── assets/                      # Static assets
│   ├── icons/                  # Application icons
│   │   ├── light/             # Light theme icons
│   │   └── emerald/           # Emerald theme icons
│   ├── klyp_logo.png          # Application logo
│   └── klyp_logo.svg          # Vector logo
│
├── Docs/                        # Documentation
│   ├── ARCHITECTURE.md         # Architecture documentation
│   ├── DEVELOPMENT.md          # This file
│   ├── CONTRIBUTING.md         # Contribution guidelines
│   └── API_REFERENCE.md        # API documentation
│
├── .kiro/                       # Kiro IDE configuration
│   └── specs/                  # Feature specifications
│
├── build/                       # Build artifacts (generated)
├── dist/                        # Distribution files (generated)
└── __pycache__/                # Python cache (generated)
```

### Directory Purpose

#### Core Application Directories

- **models/**: Contains data structures and domain models. All models use Python dataclasses for clean, type-safe definitions.

- **views/**: UI components built with ttkbootstrap. Each screen is a self-contained module that handles its own layout and user interactions.

- **controllers/**: Business logic and coordination between models and views. Implements singleton patterns for shared state management.

- **utils/**: Infrastructure code including external service wrappers, event system, threading utilities, and helper functions.

#### Supporting Directories

- **tests/**: Comprehensive test suite using pytest. Tests are organized by module and include unit, integration, and stress tests.

- **assets/**: Static resources including icons for different themes and application logos.

- **Docs/**: Project documentation including architecture, development guides, and API references.

### Naming Conventions

#### Files and Modules

- **Python files**: Use `snake_case` (e.g., `download_manager.py`, `event_bus.py`)
- **Test files**: Prefix with `test_` (e.g., `test_queue_manager.py`)
- **Class files**: One primary class per file, file named after the class in snake_case

#### Classes

- **Classes**: Use `PascalCase` (e.g., `DownloadManager`, `EventBus`, `VideoInfo`)
- **Mixins**: Suffix with `Mixin` (e.g., `SafeCallbackMixin`)
- **Exceptions**: Suffix with `Exception` (e.g., `NetworkException`, `AuthenticationException`)

#### Functions and Variables

- **Functions**: Use `snake_case` (e.g., `download_video()`, `process_queue()`)
- **Private methods**: Prefix with single underscore (e.g., `_internal_method()`)
- **Constants**: Use `UPPER_SNAKE_CASE` (e.g., `MAX_WORKERS`, `DEFAULT_TIMEOUT`)
- **Variables**: Use `snake_case` (e.g., `download_task`, `video_info`)

#### Enums

- **Enum classes**: Use `PascalCase` (e.g., `DownloadStatus`, `EventType`)
- **Enum values**: Use `UPPER_SNAKE_CASE` (e.g., `DownloadStatus.IN_PROGRESS`)


## Dependencies

Klyp relies on several key Python packages. All dependencies are listed in `requirements.txt` and can be installed with `pip install -r requirements.txt`.

### Core Dependencies

#### UI Framework

**ttkbootstrap >= 1.10.1**
- Modern themed Tkinter widgets
- Provides dark/light themes and custom styling
- Used for all UI components across the application
- Documentation: [ttkbootstrap.readthedocs.io](https://ttkbootstrap.readthedocs.io/)

#### Video Download Engine

**yt-dlp >= 2023.0.0**
- Fork of youtube-dl with active development
- Supports 1000+ video platforms
- Handles video extraction, format selection, and downloading
- Core dependency for all download functionality
- Documentation: [github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp)

#### Image Processing

**Pillow >= 10.0.0**
- Python Imaging Library (PIL) fork
- Used for loading and displaying icons and thumbnails
- Handles image format conversions
- Required for UI icon rendering

#### Desktop Notifications

**plyer >= 2.1.0**
- Cross-platform Python wrapper for platform-specific APIs
- Provides desktop notifications on Linux, Windows, and macOS
- Used by NotificationManager for download completion alerts

#### Search Functionality

**duckduckgo-search >= 6.1.0**
- DuckDuckGo search API wrapper
- Powers the integrated video search feature
- Provides video search results with metadata
- Used by SearchManager

#### Media Processing

**static-ffmpeg >= 3.0.0**
- Portable FFmpeg binaries for Python
- Automatically downloads and manages FFmpeg
- Required for video post-processing (merging audio/video, format conversion)
- Eliminates need for system-wide FFmpeg installation

#### Subtitle Support

**subliminal >= 2.1.0**
- Subtitle download library
- Supports multiple subtitle providers (OpenSubtitles, etc.)
- Used by SubtitlesScreen for subtitle downloading
- Includes language detection and matching

### Development Dependencies

These dependencies are not in `requirements.txt` but are needed for development:

**pytest >= 7.0.0**
- Testing framework
- Used for all unit and integration tests
- Install: `pip install pytest`

**pytest-cov >= 4.0.0**
- Coverage plugin for pytest
- Generates test coverage reports
- Install: `pip install pytest-cov`

**pyinstaller >= 5.0.0**
- Packages Python applications into standalone executables
- Required for building distributable binaries
- Install: `pip install pyinstaller`

### Optional Dependencies

**black**
- Code formatter
- Enforces consistent code style
- Install: `pip install black`

**flake8** or **pylint**
- Code linters
- Checks for code quality and PEP 8 compliance
- Install: `pip install flake8` or `pip install pylint`

### Dependency Management

#### Updating Dependencies

To update all dependencies to their latest compatible versions:

```bash
pip install --upgrade -r requirements.txt
```

To update a specific dependency:

```bash
pip install --upgrade package-name
```

#### Checking Installed Versions

```bash
pip list
# or for specific package
pip show package-name
```

#### Freezing Dependencies

To generate a complete dependency list with exact versions:

```bash
pip freeze > requirements-frozen.txt
```

### Platform-Specific Notes

#### Linux

- Some distributions may require additional system packages for Tkinter:
  ```bash
  sudo apt-get install python3-tk  # Debian/Ubuntu
  sudo dnf install python3-tkinter  # Fedora
  ```

#### Windows

- All dependencies install cleanly via pip
- No additional system packages required

#### macOS

- Tkinter is included with Python from python.org
- Homebrew Python may require: `brew install python-tk`


## Coding Conventions

Klyp follows Python best practices and PEP 8 style guidelines. Consistency in code style makes the codebase more maintainable and easier to understand.

### PEP 8 Style Guide

Follow [PEP 8](https://pep8.org/) for all Python code:

- **Line length**: Maximum 100 characters (slightly relaxed from PEP 8's 79)
- **Indentation**: 4 spaces (no tabs)
- **Blank lines**: 2 blank lines between top-level functions/classes, 1 within classes
- **Imports**: Grouped (standard library, third-party, local) with blank lines between groups
- **Whitespace**: Follow PEP 8 guidelines for operators and commas

### Type Hints

Use type hints for function signatures and class attributes where possible:

```python
from typing import Optional, List, Dict, Callable
from dataclasses import dataclass

def download_video(url: str, quality: str = "best") -> Optional[str]:
    """Download a video and return the file path."""
    pass

@dataclass
class VideoInfo:
    """Video metadata information."""
    title: str
    url: str
    duration: Optional[int] = None
    formats: List[Dict[str, str]] = None
```

**Guidelines:**
- Use type hints for all public methods and functions
- Use `Optional[T]` for nullable values
- Use `List[T]`, `Dict[K, V]`, `Tuple[T, ...]` for collections
- Use `Callable[[ArgTypes], ReturnType]` for callbacks
- Private methods may omit type hints if obvious from context

### Docstring Format

Use Google-style docstrings for all public classes, methods, and functions:

```python
def process_download(task: DownloadTask, callback: Optional[Callable] = None) -> bool:
    """Process a download task with optional progress callback.
    
    This function handles the complete download workflow including
    metadata extraction, format selection, and actual downloading.
    
    Args:
        task: The download task containing URL and options.
        callback: Optional callback function for progress updates.
            Called with (progress: float, status: str).
    
    Returns:
        True if download completed successfully, False otherwise.
    
    Raises:
        NetworkException: If network connection fails.
        AuthenticationException: If authentication is required.
        FormatException: If requested format is unavailable.
    
    Example:
        >>> task = DownloadTask(url="https://example.com/video")
        >>> success = process_download(task)
        >>> if success:
        ...     print("Download completed")
    """
    pass
```

**Docstring Sections:**
- **Summary**: One-line description (required)
- **Description**: Detailed explanation (optional, for complex functions)
- **Args**: Parameter descriptions (required if parameters exist)
- **Returns**: Return value description (required if not None)
- **Raises**: Exceptions that may be raised (required if applicable)
- **Example**: Usage example (optional but recommended for public APIs)

### Logging Conventions

Use the structured logger from `utils/logger.py`:

```python
from utils.logger import Logger

logger = Logger(__name__)

# Log levels
logger.debug("Detailed debugging information")
logger.info("General informational messages")
logger.warning("Warning messages for recoverable issues")
logger.error("Error messages for failures")
logger.critical("Critical errors requiring immediate attention")

# Structured logging with context
logger.info("Download started", extra={
    "url": video_url,
    "quality": selected_quality,
    "task_id": task.id
})
```

**Logging Guidelines:**
- Use appropriate log levels (debug < info < warning < error < critical)
- Include context in log messages (task IDs, URLs, user actions)
- Don't log sensitive information (passwords, tokens, personal data)
- Use structured logging with `extra` dict for machine-readable logs
- Log exceptions with `logger.exception()` to include stack traces

### Error Handling

Use custom exceptions from `utils/exceptions.py`:

```python
from utils.exceptions import (
    DownloadException,
    NetworkException,
    AuthenticationException,
    FormatException
)

def download_video(url: str) -> str:
    """Download video from URL."""
    try:
        # Download logic
        return file_path
    except ConnectionError as e:
        raise NetworkException(f"Failed to connect: {e}") from e
    except PermissionError as e:
        raise AuthenticationException(f"Authentication required: {e}") from e
    except ValueError as e:
        raise FormatException(f"Invalid format: {e}") from e
```

**Error Handling Guidelines:**
- Use specific exception types from the custom hierarchy
- Chain exceptions with `raise ... from e` to preserve context
- Catch specific exceptions, not bare `except:`
- Log exceptions before re-raising or handling
- Provide meaningful error messages to users

### Code Organization

#### Class Structure

Organize class members in this order:

1. Class variables
2. `__init__` method
3. Public methods
4. Private methods (prefixed with `_`)
5. Properties (`@property` decorated methods)
6. Static methods (`@staticmethod`)
7. Class methods (`@classmethod`)

```python
class DownloadManager:
    """Manages download operations."""
    
    # Class variables
    MAX_CONCURRENT_DOWNLOADS = 3
    
    def __init__(self):
        """Initialize the download manager."""
        self._active_downloads = []
        self._lock = threading.Lock()
    
    # Public methods
    def start_download(self, task: DownloadTask) -> None:
        """Start a download task."""
        pass
    
    def stop_download(self, task_id: str) -> None:
        """Stop a download task."""
        pass
    
    # Private methods
    def _process_task(self, task: DownloadTask) -> None:
        """Internal task processing."""
        pass
    
    # Properties
    @property
    def active_count(self) -> int:
        """Number of active downloads."""
        return len(self._active_downloads)
    
    # Static methods
    @staticmethod
    def validate_url(url: str) -> bool:
        """Validate a video URL."""
        pass
```

#### Import Organization

Group imports in this order:

```python
# Standard library imports
import os
import sys
import threading
from pathlib import Path
from typing import Optional, List, Dict

# Third-party imports
import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from yt_dlp import YoutubeDL

# Local imports
from models.data_models import VideoInfo, DownloadTask
from utils.logger import Logger
from utils.event_bus import EventBus
```

### Thread Safety

When working with shared state:

```python
import threading

class ThreadSafeManager:
    """Example of thread-safe implementation."""
    
    def __init__(self):
        self._lock = threading.RLock()  # Reentrant lock
        self._data = []
    
    def add_item(self, item):
        """Add item with thread safety."""
        with self._lock:
            self._data.append(item)
    
    def get_items(self):
        """Get items with thread safety."""
        with self._lock:
            return self._data.copy()  # Return copy to avoid external modification
```

**Thread Safety Guidelines:**
- Use `threading.RLock()` for reentrant locks (when same thread may acquire multiple times)
- Use `threading.Lock()` for simple mutual exclusion
- Always use context managers (`with lock:`) for lock acquisition
- Return copies of mutable data structures from locked sections
- Use `queue.Queue` for thread-safe communication
- Document thread-safety guarantees in docstrings

### Constants and Configuration

Define constants at module level:

```python
# Configuration constants
DEFAULT_DOWNLOAD_PATH = "~/Downloads"
MAX_RETRIES = 3
TIMEOUT_SECONDS = 30
SUPPORTED_FORMATS = ["mp4", "webm", "mkv"]

# Don't use magic numbers in code
def download_with_retry(url: str) -> bool:
    for attempt in range(MAX_RETRIES):  # Good
        # vs
        # for attempt in range(3):  # Bad - magic number
        pass
```


## Testing Strategy

Klyp uses pytest as its testing framework with a comprehensive test suite covering unit tests, integration tests, and stress tests.

### Testing Framework

**pytest** is used for all testing:
- Simple, Pythonic test syntax
- Powerful fixtures for setup/teardown
- Excellent plugin ecosystem
- Detailed test output and reporting

### Test Structure

Tests are organized in the `tests/` directory with one test file per module:

```
tests/
├── __init__.py
├── test_data_models.py              # Data model tests
├── test_download_manager.py         # Download manager tests
├── test_download_service.py         # Download service tests
├── test_queue_manager.py            # Queue manager tests
├── test_queue_manager_thread_safety.py  # Thread safety tests
├── test_search_manager.py           # Search functionality tests
├── test_settings_manager.py         # Settings tests
├── test_event_bus.py                # Event system tests
├── test_thread_pool_manager.py      # Thread pool tests
├── test_safe_callback_mixin.py      # Callback mixin tests
├── test_notification_manager.py     # Notification tests
├── test_metadata_enrichment.py      # Metadata tests
├── test_metadata_fetch.py           # Metadata fetching tests
├── test_recommendations.py          # Recommendation tests
├── test_advanced_features.py        # Advanced feature tests
├── test_data_compatibility.py       # Data compatibility tests
├── test_ui_components.py            # UI component tests
├── test_integration.py              # Integration tests
└── test_stress_stability.py         # Stress and stability tests
```

### Naming Conventions

#### Test Files

- Prefix with `test_`: `test_module_name.py`
- Mirror the structure of the source code
- One test file per source module

#### Test Functions

- Prefix with `test_`: `test_function_name()`
- Use descriptive names: `test_download_with_invalid_url()`
- Group related tests with common prefixes: `test_queue_add_*`, `test_queue_remove_*`

#### Test Classes

- Prefix with `Test`: `class TestDownloadManager:`
- Group related test methods
- Use for shared fixtures and setup

```python
class TestQueueManager:
    """Tests for QueueManager class."""
    
    def test_add_task(self):
        """Test adding a task to the queue."""
        pass
    
    def test_remove_task(self):
        """Test removing a task from the queue."""
        pass
    
    def test_clear_queue(self):
        """Test clearing all tasks."""
        pass
```

### Test Coverage by Module

#### Models (Domain Layer)

**test_data_models.py**
- VideoInfo dataclass validation
- DownloadTask state management
- DownloadHistory serialization
- SearchResult data structure
- DownloadStatus enum values

#### Controllers (Application Layer)

**test_download_manager.py**
- Download coordination (deprecated module)
- Legacy functionality tests

**test_download_service.py**
- Singleton pattern implementation
- Download lifecycle management
- Concurrent download limits
- Task start/stop operations

**test_queue_manager.py**
- Queue operations (add, remove, clear)
- Task prioritization
- Queue persistence
- State management

**test_queue_manager_thread_safety.py**
- Concurrent access tests
- Race condition prevention
- Lock mechanism validation
- Thread-safe operations

**test_search_manager.py**
- Video search functionality
- Filter application
- Result parsing
- Error handling

**test_settings_manager.py**
- Settings persistence
- Configuration validation
- Default values
- Settings updates

#### Utils (Infrastructure Layer)

**test_event_bus.py**
- Event publishing
- Subscription management
- Event processing
- Thread-safe event handling

**test_thread_pool_manager.py**
- Pool initialization
- Worker management
- Task submission
- Graceful shutdown

**test_safe_callback_mixin.py**
- Thread-safe callback execution
- UI thread scheduling
- Error handling in callbacks

**test_notification_manager.py**
- Desktop notification creation
- Platform-specific behavior
- Notification queuing

#### Advanced Features

**test_metadata_enrichment.py**
- Metadata extraction
- Data enrichment
- Format parsing

**test_metadata_fetch.py**
- Video info fetching
- Platform-specific extraction
- Error handling

**test_recommendations.py**
- Recommendation algorithm
- Related video suggestions
- Filtering logic

**test_advanced_features.py**
- Complex feature interactions
- Edge cases
- Advanced workflows

**test_data_compatibility.py**
- Backward compatibility
- Data migration
- Version compatibility

#### UI Components

**test_ui_components.py**
- Widget creation
- Event handling
- State updates
- Theme switching

#### Integration & Stress Tests

**test_integration.py**
- End-to-end workflows
- Component integration
- System-level tests

**test_stress_stability.py**
- High-load scenarios
- Memory leak detection
- Performance under stress
- Stability over time

### Test Types

#### Unit Tests

Test individual functions and methods in isolation:

```python
def test_validate_url():
    """Test URL validation logic."""
    assert validate_url("https://youtube.com/watch?v=123") is True
    assert validate_url("invalid-url") is False
    assert validate_url("") is False
```

#### Integration Tests

Test interactions between components:

```python
def test_download_workflow():
    """Test complete download workflow."""
    queue_manager = QueueManager()
    download_service = DownloadService()
    
    # Add task to queue
    task = DownloadTask(url="https://example.com/video")
    queue_manager.add_task(task)
    
    # Start download
    download_service.start_download(task)
    
    # Verify state changes
    assert task.status == DownloadStatus.IN_PROGRESS
```

#### Thread Safety Tests

Test concurrent access and race conditions:

```python
def test_concurrent_queue_access():
    """Test thread-safe queue operations."""
    queue_manager = QueueManager()
    
    def add_tasks():
        for i in range(100):
            task = DownloadTask(url=f"https://example.com/{i}")
            queue_manager.add_task(task)
    
    # Run multiple threads
    threads = [threading.Thread(target=add_tasks) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    
    # Verify all tasks added without corruption
    assert len(queue_manager.get_all_tasks()) == 1000
```

#### Stress Tests

Test system behavior under load:

```python
def test_high_load_downloads():
    """Test system stability with many concurrent downloads."""
    download_service = DownloadService()
    
    # Create many download tasks
    tasks = [DownloadTask(url=f"https://example.com/{i}") 
             for i in range(100)]
    
    # Start all downloads
    for task in tasks:
        download_service.start_download(task)
    
    # Verify system remains stable
    assert download_service.is_healthy()
```

### Test Fixtures

Use pytest fixtures for common setup:

```python
import pytest
from models.data_models import DownloadTask

@pytest.fixture
def sample_task():
    """Create a sample download task."""
    return DownloadTask(
        url="https://example.com/video",
        title="Test Video",
        quality="best"
    )

@pytest.fixture
def queue_manager():
    """Create a fresh QueueManager instance."""
    manager = QueueManager()
    yield manager
    manager.clear()  # Cleanup

def test_add_task(queue_manager, sample_task):
    """Test adding a task using fixtures."""
    queue_manager.add_task(sample_task)
    assert len(queue_manager.get_all_tasks()) == 1
```

### Mocking and Patching

Use pytest's monkeypatch or unittest.mock for external dependencies:

```python
from unittest.mock import Mock, patch

def test_download_with_mock():
    """Test download with mocked yt-dlp."""
    with patch('yt_dlp.YoutubeDL') as mock_ytdl:
        # Configure mock
        mock_instance = Mock()
        mock_instance.extract_info.return_value = {"title": "Test"}
        mock_ytdl.return_value.__enter__.return_value = mock_instance
        
        # Test code
        result = download_video("https://example.com/video")
        
        # Verify mock was called
        mock_instance.extract_info.assert_called_once()
```

### Coverage Goals

- **Overall coverage**: Aim for 80%+ code coverage
- **Critical paths**: 100% coverage for core functionality
- **Error handling**: Test all exception paths
- **Edge cases**: Cover boundary conditions and unusual inputs


## Running Tests

### Basic Test Execution

Run all tests:

```bash
pytest
```

Run with verbose output:

```bash
pytest -v
```

Run with extra verbose output (show all test names):

```bash
pytest -vv
```

### Running Specific Tests

Run a specific test file:

```bash
pytest tests/test_queue_manager.py
```

Run a specific test class:

```bash
pytest tests/test_queue_manager.py::TestQueueManager
```

Run a specific test function:

```bash
pytest tests/test_queue_manager.py::TestQueueManager::test_add_task
```

Run tests matching a pattern:

```bash
pytest -k "queue"  # Runs all tests with "queue" in the name
pytest -k "test_add or test_remove"  # Runs tests matching either pattern
```

### Test Coverage

Run tests with coverage report:

```bash
pytest --cov=. --cov-report=term
```

Generate HTML coverage report:

```bash
pytest --cov=. --cov-report=html
```

This creates a `htmlcov/` directory. Open `htmlcov/index.html` in a browser to view detailed coverage.

Generate coverage for specific modules:

```bash
pytest --cov=controllers --cov=models --cov-report=term
```

Show missing lines in coverage:

```bash
pytest --cov=. --cov-report=term-missing
```

### Test Output Options

Show print statements:

```bash
pytest -s
```

Show local variables on failure:

```bash
pytest -l
```

Stop on first failure:

```bash
pytest -x
```

Stop after N failures:

```bash
pytest --maxfail=3
```

### Parallel Test Execution

Install pytest-xdist:

```bash
pip install pytest-xdist
```

Run tests in parallel:

```bash
pytest -n auto  # Use all CPU cores
pytest -n 4     # Use 4 workers
```

### Test Markers

Run only fast tests (if markers are defined):

```bash
pytest -m "not slow"
```

Run only integration tests:

```bash
pytest -m integration
```

Skip certain tests:

```bash
pytest -m "not skip"
```

### Debugging Tests

Run with Python debugger on failure:

```bash
pytest --pdb
```

Run with debugger on first failure:

```bash
pytest -x --pdb
```

Show detailed traceback:

```bash
pytest --tb=long
```

Show short traceback:

```bash
pytest --tb=short
```

### Continuous Testing

Watch for file changes and re-run tests:

Install pytest-watch:

```bash
pip install pytest-watch
```

Run continuous testing:

```bash
ptw  # Watches all files
ptw -- -x  # Stop on first failure
```

### Test Reports

Generate JUnit XML report (for CI/CD):

```bash
pytest --junitxml=report.xml
```

Generate JSON report:

```bash
pip install pytest-json-report
pytest --json-report --json-report-file=report.json
```

### Common Test Commands

Quick test run (fast tests only):

```bash
pytest -x -v -m "not slow"
```

Full test suite with coverage:

```bash
pytest --cov=. --cov-report=html --cov-report=term-missing
```

Test specific module with debugging:

```bash
pytest tests/test_queue_manager.py -vv -s
```

Parallel execution with coverage:

```bash
pytest -n auto --cov=. --cov-report=term
```

### CI/CD Test Command

Recommended command for continuous integration:

```bash
pytest --cov=. --cov-report=xml --cov-report=term --junitxml=junit.xml -v
```

This generates:
- XML coverage report for tools like Codecov
- Terminal coverage summary
- JUnit XML for CI systems
- Verbose output for debugging


## Debugging

### Debug Mode

Klyp includes debug settings that can be enabled through the SettingsManager:

```python
from controllers.settings_manager import SettingsManager

settings = SettingsManager()
settings.set("debug_thread_safety", True)
```

**Available Debug Settings:**

- `debug_thread_safety`: Enable detailed thread-safety debugging logs

### Log Files

Klyp writes logs to a platform-specific location:

**Linux/macOS:**
```
~/.config/klyp/logs/
```

**Windows:**
```
%USERPROFILE%\.config\klyp\logs\
```

Log files are rotated and include:
- `klyp.log`: Main application log
- `klyp.log.1`, `klyp.log.2`, etc.: Rotated log files

### Viewing Logs

Tail logs in real-time (Linux/macOS):

```bash
tail -f ~/.config/klyp/logs/klyp.log
```

View recent logs (Windows PowerShell):

```powershell
Get-Content $env:USERPROFILE\.config\klyp\logs\klyp.log -Tail 50 -Wait
```

### Logging Levels

Adjust logging level in code:

```python
from utils.logger import get_logger
import logging

logger = get_logger()
logger.setLevel(logging.DEBUG)  # Show all debug messages
```

**Log Levels (from most to least verbose):**
- `DEBUG`: Detailed debugging information
- `INFO`: General informational messages
- `WARNING`: Warning messages for recoverable issues
- `ERROR`: Error messages for failures
- `CRITICAL`: Critical errors requiring immediate attention

### Python Debugger (pdb)

Insert breakpoints in code:

```python
import pdb

def problematic_function():
    # Code before breakpoint
    pdb.set_trace()  # Execution will pause here
    # Code after breakpoint
```

**Common pdb commands:**
- `n` (next): Execute next line
- `s` (step): Step into function
- `c` (continue): Continue execution
- `l` (list): Show current code
- `p variable`: Print variable value
- `pp variable`: Pretty-print variable
- `h` (help): Show help
- `q` (quit): Quit debugger

### IDE Debugging

#### VS Code

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: Klyp",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/main.py",
      "console": "integratedTerminal",
      "justMyCode": false
    },
    {
      "name": "Python: Current Test",
      "type": "python",
      "request": "launch",
      "module": "pytest",
      "args": ["${file}", "-v"],
      "console": "integratedTerminal",
      "justMyCode": false
    }
  ]
}
```

Set breakpoints by clicking in the gutter next to line numbers, then press F5 to start debugging.

#### PyCharm

1. Right-click `main.py` → "Debug 'main'"
2. Set breakpoints by clicking in the gutter
3. Use debug toolbar to step through code

### Thread-Safety Debugging

Enable thread-safety debugging to track lock acquisitions and potential deadlocks:

```python
from controllers.settings_manager import SettingsManager

settings = SettingsManager()
settings.set("debug_thread_safety", True)
```

This will log:
- Lock acquisition attempts
- Lock releases
- Thread IDs for each operation
- Potential deadlock warnings

### Common Debugging Scenarios

#### Download Not Starting

1. Check logs for error messages
2. Verify URL is valid
3. Check network connectivity
4. Verify yt-dlp is up to date: `pip install --upgrade yt-dlp`

#### UI Freezing

1. Enable thread-safety debugging
2. Check for blocking operations in UI thread
3. Verify EventBus is processing events
4. Look for deadlocks in logs

#### Memory Leaks

Use memory profiler:

```bash
pip install memory-profiler
python -m memory_profiler main.py
```

Or use tracemalloc in code:

```python
import tracemalloc

tracemalloc.start()

# Your code here

snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')

for stat in top_stats[:10]:
    print(stat)
```

#### Performance Issues

Use cProfile:

```bash
python -m cProfile -o profile.stats main.py
```

Analyze results:

```python
import pstats
p = pstats.Stats('profile.stats')
p.sort_stats('cumulative')
p.print_stats(20)  # Show top 20 functions
```

### Debugging Tests

Run tests with debugging:

```bash
# Drop into debugger on failure
pytest --pdb

# Drop into debugger on first failure
pytest -x --pdb

# Show local variables on failure
pytest -l

# Show print statements
pytest -s
```

Add breakpoints in tests:

```python
def test_something():
    import pdb; pdb.set_trace()
    # Test code
```

### Remote Debugging

For debugging in production-like environments, use remote debugging:

```python
import debugpy

# Start debug server
debugpy.listen(("0.0.0.0", 5678))
print("Waiting for debugger attach...")
debugpy.wait_for_client()
```

Connect from VS Code with this launch configuration:

```json
{
  "name": "Python: Remote Attach",
  "type": "python",
  "request": "attach",
  "connect": {
    "host": "localhost",
    "port": 5678
  }
}
```

### Debugging Tips

1. **Use logging liberally**: Add log statements to track execution flow
2. **Check thread IDs**: Use `threading.current_thread().name` to identify which thread is executing
3. **Verify locks**: Ensure locks are always released (use context managers)
4. **Test in isolation**: Isolate problematic code in a minimal test case
5. **Check event flow**: Verify events are published and received correctly
6. **Monitor resources**: Watch CPU, memory, and thread count during execution
7. **Use assertions**: Add assertions to catch invalid states early
8. **Review recent changes**: Use git to identify what changed before the bug appeared


## Build Process

Klyp uses PyInstaller to create standalone executables for Linux, Windows, and macOS. The build process is automated through platform-specific scripts.

### Prerequisites

Install PyInstaller:

```bash
pip install pyinstaller
```

Ensure all dependencies are installed:

```bash
pip install -r requirements.txt
```

### Build Configuration

The build is configured in `build_config.spec`, which defines:

- **Application metadata**: Name, version
- **Entry point**: `main.py`
- **Data files**: Assets, icons, package data
- **Hidden imports**: Modules not automatically detected
- **Excluded modules**: Unnecessary packages to reduce size
- **Platform settings**: Console mode, icon, etc.

Key configuration sections:

```python
# Application metadata
app_name = 'Klyp'
app_version = '1.1.0'

# Data files to include
datas = [
    ('assets', 'assets'),  # Include all assets
]
datas += collect_data_files('babelfish')
datas += collect_data_files('subliminal')

# Hidden imports (not auto-detected)
hiddenimports=[
    'ttkbootstrap',
    'yt_dlp',
    'duckduckgo_search',
    'static_ffmpeg',
    'subliminal',
    # ... more imports
]

# Excluded modules (reduce size)
excludes=[
    'matplotlib',
    'numpy',
    'pandas',
    'scipy',
    'pytest',
]
```

### Building on Linux

Use the provided build script:

```bash
chmod +x build_linux.sh
./build_linux.sh
```

**What the script does:**

1. Checks Python and pip installation
2. Installs dependencies from `requirements.txt`
3. Installs PyInstaller
4. Cleans previous builds (`build/` and `dist/`)
5. Runs PyInstaller with `build_config.spec`
6. Creates launcher script (`run.sh`)
7. Optionally creates `.deb` package

**Output:**

- Executable: `dist/Klyp/Klyp`
- Launcher: `dist/Klyp/run.sh`
- Optional: `dist/klyp_1.1.0.deb`

**Running the built application:**

```bash
cd dist/Klyp
./Klyp
# or
./run.sh
```

**Installing the .deb package:**

```bash
sudo dpkg -i dist/klyp_1.1.0.deb
```

### Building on Windows

Use the provided batch script:

```batch
build_windows.bat
```

**What the script does:**

1. Checks Python and pip installation
2. Installs dependencies from `requirements.txt`
3. Installs PyInstaller
4. Cleans previous builds
5. Runs PyInstaller with `build_config.spec`
6. Creates launcher script (`run.bat`)
7. Optionally creates Inno Setup installer script

**Output:**

- Executable: `dist\Klyp\Klyp.exe`
- Launcher: `dist\Klyp\run.bat`
- Optional: `installer_config.iss` (Inno Setup script)

**Running the built application:**

```batch
cd dist\Klyp
Klyp.exe
REM or
run.bat
```

**Creating Windows installer:**

If you have [Inno Setup](https://jrsoftware.org/isinfo.php) installed:

```batch
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer_config.iss
```

This creates `dist\Klyp_Setup.exe`.

### Building on macOS

The build process is similar to Linux:

```bash
chmod +x build_linux.sh
./build_linux.sh
```

**Output:**

- Application bundle: `dist/Klyp.app` (if configured)
- Or executable: `dist/Klyp/Klyp`

**Creating .dmg (optional):**

Use `create-dmg` tool:

```bash
brew install create-dmg
create-dmg \
  --volname "Klyp Installer" \
  --window-pos 200 120 \
  --window-size 800 400 \
  --icon-size 100 \
  --app-drop-link 600 185 \
  "Klyp-1.1.0.dmg" \
  "dist/Klyp.app"
```

### Manual Build

If you need to customize the build:

```bash
# Clean previous builds
rm -rf build dist

# Run PyInstaller directly
pyinstaller build_config.spec

# Or create a new spec file
pyi-makespec --onedir --windowed --name Klyp main.py
```

### Build Options

#### One-File vs One-Directory

**One-Directory (current):**
- Faster startup
- Easier to debug
- Larger distribution size
- Used by default in `build_config.spec`

**One-File:**
- Single executable
- Slower startup (extracts to temp)
- Smaller distribution
- Change in spec: `EXE(..., onefile=True)`

#### Console vs Windowed

**Windowed (current):**
- No console window
- GUI-only application
- Set in spec: `console=False`

**Console:**
- Shows console for debugging
- Useful during development
- Set in spec: `console=True`

### Troubleshooting Build Issues

#### Missing Modules

If PyInstaller doesn't detect a module:

1. Add to `hiddenimports` in `build_config.spec`:
   ```python
   hiddenimports=['missing_module']
   ```

2. Rebuild:
   ```bash
   pyinstaller build_config.spec
   ```

#### Missing Data Files

If assets or data files are missing:

1. Add to `datas` in `build_config.spec`:
   ```python
   datas=[('source_path', 'dest_path')]
   ```

2. Use `collect_data_files` for packages:
   ```python
   from PyInstaller.utils.hooks import collect_data_files
   datas += collect_data_files('package_name')
   ```

#### Large Executable Size

Reduce size by:

1. Excluding unnecessary packages in `build_config.spec`:
   ```python
   excludes=['matplotlib', 'numpy', 'pandas']
   ```

2. Using UPX compression (if available):
   ```python
   upx=True
   ```

3. Stripping debug symbols:
   ```python
   strip=True
   ```

#### Import Errors at Runtime

If the built app crashes with import errors:

1. Run with console enabled to see errors:
   ```python
   console=True  # in build_config.spec
   ```

2. Check PyInstaller warnings during build
3. Add missing imports to `hiddenimports`
4. Verify data files are included

#### Platform-Specific Issues

**Linux:**
- Missing system libraries: Install with package manager
- Permission issues: Ensure executable bit is set (`chmod +x`)

**Windows:**
- Antivirus false positives: Add exception for `dist/` folder
- Missing DLLs: Install Visual C++ Redistributable

**macOS:**
- Code signing: May need to sign the app for distribution
- Gatekeeper: Users may need to allow the app in Security settings

### Build Optimization

#### Faster Builds

1. Use `--noconfirm` to skip confirmation:
   ```bash
   pyinstaller --noconfirm build_config.spec
   ```

2. Keep `build/` folder between builds (incremental)

3. Use `--log-level ERROR` to reduce output:
   ```bash
   pyinstaller --log-level ERROR build_config.spec
   ```

#### Smaller Executables

1. Exclude test and development packages
2. Use one-file mode
3. Enable UPX compression
4. Strip debug symbols
5. Remove unused assets

### Distribution

#### Linux

- Distribute `.deb` package for Debian/Ubuntu
- Create `.rpm` for Fedora/RHEL
- Provide tarball with `run.sh` for other distros

#### Windows

- Distribute installer (`.exe` from Inno Setup)
- Or provide ZIP with `Klyp.exe` and dependencies

#### macOS

- Distribute `.dmg` with app bundle
- Or provide ZIP with `.app`

### Continuous Integration

Example GitHub Actions workflow:

```yaml
name: Build

on: [push, pull_request]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.10'
    
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install pyinstaller
    
    - name: Build
      run: pyinstaller build_config.spec
    
    - name: Upload artifact
      uses: actions/upload-artifact@v2
      with:
        name: klyp-${{ matrix.os }}
        path: dist/
```

---

## Additional Resources

- [PyInstaller Documentation](https://pyinstaller.org/)
- [ttkbootstrap Documentation](https://ttkbootstrap.readthedocs.io/)
- [yt-dlp Documentation](https://github.com/yt-dlp/yt-dlp)
- [pytest Documentation](https://docs.pytest.org/)
- [PEP 8 Style Guide](https://pep8.org/)

## Getting Help

- Check existing issues on GitHub
- Review logs in `~/.config/klyp/logs/`
- Enable debug mode for detailed logging
- Ask questions in GitHub Discussions
- Report bugs with logs and reproduction steps

