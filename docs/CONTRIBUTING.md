# Contributing to Klyp

Thank you for your interest in contributing to Klyp - Universal Video Downloader! We welcome contributions from the community and appreciate your help in making Klyp better.

This guide will help you understand our development process and how to contribute effectively.

## Table of Contents

- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Reporting Issues](#reporting-issues)
- [Proposing Features](#proposing-features)
- [Code Review Process](#code-review-process)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community Guidelines](#community-guidelines)

---

## Getting Started

Before you start contributing, make sure you have:

1. **Read the documentation**:
   - [README.md](../README.md) - Project overview and usage
   - [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and design patterns
   - [DEVELOPMENT.md](DEVELOPMENT.md) - Development environment setup

2. **Set up your development environment**:
   ```bash
   # Fork and clone the repository
   git clone https://github.com/YOUR_USERNAME/klyp.git
   cd klyp
   
   # Create a virtual environment
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   pip install pytest pytest-cov  # Development dependencies
   
   # Verify installation
   python main.py
   ```

3. **Familiarize yourself with the codebase**:
   - Explore the project structure in [DEVELOPMENT.md](DEVELOPMENT.md#project-structure)
   - Review existing code to understand patterns and conventions
   - Run the test suite: `pytest`

---

## How to Contribute

### Contribution Workflow

We follow a standard fork-and-pull-request workflow:

#### 1. Fork the Repository

Click the "Fork" button on the GitHub repository page to create your own copy.

#### 2. Create a Feature Branch

Always create a new branch for your work. Never commit directly to `main`.

```bash
# Update your fork's main branch
git checkout main
git pull upstream main

# Create a new branch with a descriptive name
git checkout -b feature/add-playlist-support
# or
git checkout -b fix/subtitle-download-error
# or
git checkout -b docs/improve-installation-guide
```

**Branch Naming Conventions**:
- `feature/` - New features or enhancements
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring without behavior changes
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks, dependency updates

#### 3. Make Your Changes

- Write clean, readable code following our [Code Style Guidelines](#code-style-guidelines)
- Add or update tests for your changes
- Update documentation if needed
- Test your changes thoroughly

#### 4. Commit Your Changes

Write clear, descriptive commit messages following these conventions:

**Commit Message Format**:
```
<type>: <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:

```bash
# Good commit messages
git commit -m "feat: add support for playlist downloads"
git commit -m "fix: resolve subtitle encoding issue on Windows"
git commit -m "docs: update installation instructions for macOS"
git commit -m "refactor: simplify queue manager locking mechanism"

# Detailed commit with body
git commit -m "feat: implement advanced search filters

Add support for filtering search results by:
- Video duration (short, medium, long)
- Upload date (today, week, month, year)
- Quality (HD, 4K)

Closes #123"
```

**Commit Message Guidelines**:
- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- Keep subject line under 50 characters
- Capitalize the subject line
- Don't end subject line with a period
- Separate subject from body with a blank line
- Wrap body at 72 characters
- Reference issues and pull requests in the footer

#### 5. Push to Your Fork

```bash
git push origin feature/add-playlist-support
```

#### 6. Open a Pull Request

1. Go to your fork on GitHub
2. Click "New Pull Request"
3. Select your feature branch
4. Fill out the pull request template with:
   - **Title**: Clear, concise description of changes
   - **Description**: Detailed explanation of what and why
   - **Related Issues**: Link to related issues (e.g., "Closes #123")
   - **Testing**: Describe how you tested the changes
   - **Screenshots**: Include if UI changes are involved

**Pull Request Title Format**:
```
<type>: <description>
```

Examples:
- `feat: Add playlist download support`
- `fix: Resolve subtitle encoding issue on Windows`
- `docs: Update installation instructions`

**Pull Request Description Template**:
```markdown
## Description
Brief description of the changes and their purpose.

## Related Issues
Closes #123
Related to #456

## Changes Made
- Added playlist parsing functionality
- Updated UI to show playlist items
- Added tests for playlist handling

## Testing
- [ ] Tested on Linux
- [ ] Tested on Windows
- [ ] Tested on macOS
- [ ] All existing tests pass
- [ ] New tests added and passing

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [ ] Code follows project style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented if necessary)
```

---

## Reporting Issues

Found a bug or problem? Please help us by reporting it!

### Before Reporting

1. **Search existing issues**: Check if the issue has already been reported
2. **Update to latest version**: Verify the issue exists in the latest release
3. **Check documentation**: Make sure it's not a usage issue

### Issue Template

When creating a new issue, include:

#### Bug Reports

```markdown
## Bug Description
Clear and concise description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Enter '...'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- **OS**: [e.g., Ubuntu 22.04, Windows 11, macOS 13]
- **Python Version**: [e.g., 3.10.5]
- **Klyp Version**: [e.g., 1.0.0]
- **Installation Method**: [source, binary]

## Logs
Please attach relevant log files from `~/.config/klyp/logs/`

```
[Paste log content here]
```

## Screenshots
If applicable, add screenshots to help explain the problem.

## Additional Context
Any other information that might be helpful.
```

#### Information to Include

**Required**:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- System information (OS, Python version)

**Highly Recommended**:
- Log files from `~/.config/klyp/logs/` (or `%APPDATA%\klyp\logs\` on Windows)
- Screenshots or screen recordings
- Error messages (full text, not paraphrased)
- Video URL that caused the issue (if applicable)

**Optional but Helpful**:
- Configuration files (with sensitive data removed)
- Network conditions (if relevant)
- Recent changes to your system

### Issue Categories

Label your issue appropriately:

- **bug**: Something isn't working correctly
- **crash**: Application crashes or freezes
- **performance**: Slow performance or high resource usage
- **ui**: User interface issues
- **download**: Download-related problems
- **search**: Search functionality issues
- **platform**: Platform-specific issues (Linux, Windows, macOS)
- **documentation**: Documentation problems or suggestions

### Security Issues

**Do not report security vulnerabilities in public issues!**

Instead, email security concerns to: [security@example.com]

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

---

## Proposing Features

Have an idea for a new feature? We'd love to hear it!

### Before Proposing

1. **Check existing issues**: See if someone else has proposed it
2. **Review project goals**: Ensure it aligns with Klyp's purpose
3. **Consider scope**: Is it a core feature or better as a plugin?

### Feature Request Template

```markdown
## Feature Description
Clear and concise description of the proposed feature.

## Problem Statement
What problem does this feature solve? What use case does it address?

## Proposed Solution
Detailed description of how the feature should work.

## Alternative Solutions
Have you considered any alternative approaches?

## Use Cases
Describe specific scenarios where this feature would be useful:
1. Use case 1...
2. Use case 2...

## Implementation Ideas
If you have technical suggestions for implementation:
- Affected components
- Potential challenges
- Required dependencies

## Mockups/Examples
If applicable, include:
- UI mockups
- Code examples
- Screenshots from similar features in other apps

## Priority
How important is this feature to you?
- [ ] Critical - Blocking my workflow
- [ ] High - Would significantly improve my experience
- [ ] Medium - Nice to have
- [ ] Low - Minor enhancement
```

### Feature Discussion Process

1. **Open an issue** with the `feature-request` label
2. **Community discussion**: Others can comment and provide feedback
3. **Maintainer review**: Core team evaluates feasibility and alignment
4. **Decision**: Feature is approved, rejected, or needs more discussion
5. **Implementation**: If approved, work can begin (by you or others)

### Design Proposals

For significant features, we may request a design proposal including:

- **Architecture**: How it fits into existing system
- **API Design**: Public interfaces and contracts
- **Data Models**: New or modified data structures
- **UI/UX**: User interface changes
- **Testing Strategy**: How to test the feature
- **Migration**: Impact on existing users
- **Documentation**: What docs need updating

---

## Code Review Process

All contributions go through code review before merging. This ensures code quality and knowledge sharing.

### Review Criteria

Your pull request will be evaluated on:

#### 1. Functionality

- **Correctness**: Does the code work as intended?
- **Completeness**: Are all requirements addressed?
- **Edge Cases**: Are edge cases handled?
- **Error Handling**: Are errors handled gracefully?

#### 2. Code Quality

- **Readability**: Is the code easy to understand?
- **Maintainability**: Will it be easy to modify later?
- **Simplicity**: Is it as simple as possible?
- **No Code Smells**: No obvious anti-patterns or bad practices

#### 3. Testing

- **Test Coverage**: Are there tests for new code?
- **Test Quality**: Do tests actually verify behavior?
- **All Tests Pass**: Does the full test suite pass?
- **No Regressions**: Are existing features still working?

#### 4. Documentation

- **Code Comments**: Complex logic is explained
- **Docstrings**: Public APIs have docstrings
- **User Documentation**: User-facing changes are documented
- **Changelog**: Significant changes noted

#### 5. Style Compliance

- **PEP 8**: Follows Python style guide
- **Type Hints**: Type annotations where appropriate
- **Naming**: Consistent with project conventions
- **Formatting**: Properly formatted and indented

### Review Process

1. **Automated Checks**: CI runs tests and linters
2. **Maintainer Review**: Core team reviews the code
3. **Feedback**: Reviewers provide comments and suggestions
4. **Iteration**: You address feedback and update the PR
5. **Approval**: Once approved, PR is merged

### Responding to Feedback

- **Be receptive**: Feedback helps improve the code
- **Ask questions**: If something is unclear, ask
- **Explain decisions**: If you disagree, explain your reasoning
- **Make changes**: Address feedback promptly
- **Mark resolved**: Mark conversations as resolved when addressed

### Review Timeline

- **Initial review**: Within 3-5 business days
- **Follow-up reviews**: Within 1-2 business days
- **Urgent fixes**: Prioritized for faster review

---

## Code Style Guidelines

Consistent code style makes the codebase easier to read and maintain.

### Python Style Guide

Follow [PEP 8](https://pep8.org/) with these project-specific guidelines:

#### Line Length

- **Maximum 100 characters** per line (slightly relaxed from PEP 8's 79)
- Break long lines at logical points
- Use parentheses for implicit line continuation

```python
# Good
result = some_function(
    argument1, argument2,
    argument3, argument4
)

# Bad
result = some_function(argument1, argument2, argument3, argument4, argument5, argument6)
```

#### Indentation

- **4 spaces** per indentation level
- **No tabs** - configure your editor to use spaces
- Align continuation lines appropriately

```python
# Good
def long_function_name(
        var_one, var_two, var_three,
        var_four):
    print(var_one)

# Also good
def long_function_name(
    var_one, var_two,
    var_three, var_four
):
    print(var_one)
```

#### Imports

Group imports in this order with blank lines between groups:

1. Standard library imports
2. Third-party imports
3. Local application imports

```python
# Standard library
import os
import sys
import threading
from pathlib import Path
from typing import Optional, List, Dict

# Third-party
import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from yt_dlp import YoutubeDL

# Local
from models.data_models import VideoInfo, DownloadTask
from utils.logger import Logger
from utils.event_bus import EventBus
```

#### Naming Conventions

- **Modules**: `snake_case` (e.g., `download_manager.py`)
- **Classes**: `PascalCase` (e.g., `DownloadManager`, `EventBus`)
- **Functions/Methods**: `snake_case` (e.g., `download_video()`, `process_queue()`)
- **Variables**: `snake_case` (e.g., `download_task`, `video_info`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_WORKERS`, `DEFAULT_TIMEOUT`)
- **Private**: Prefix with `_` (e.g., `_internal_method()`, `_private_var`)

### Type Hints

Use type hints for all public functions and methods:

```python
from typing import Optional, List, Dict, Callable

def download_video(
    url: str,
    quality: str = "best",
    output_path: Optional[str] = None
) -> Optional[str]:
    """Download a video and return the file path."""
    pass

def process_callback(
    progress: float,
    status: str,
    callback: Optional[Callable[[float, str], None]] = None
) -> None:
    """Process download progress with optional callback."""
    if callback:
        callback(progress, status)
```

### Docstrings

Use Google-style docstrings for all public classes, methods, and functions:

```python
def download_video(url: str, quality: str = "best") -> Optional[str]:
    """Download a video from the given URL.
    
    This function extracts video information, selects the appropriate
    format based on quality preference, and downloads the video.
    
    Args:
        url: The video URL to download.
        quality: Desired video quality. Options: "best", "1080p", "720p", etc.
            Defaults to "best".
    
    Returns:
        Path to the downloaded video file, or None if download failed.
    
    Raises:
        NetworkException: If network connection fails.
        FormatException: If requested quality is unavailable.
    
    Example:
        >>> path = download_video("https://youtube.com/watch?v=123", quality="720p")
        >>> if path:
        ...     print(f"Downloaded to: {path}")
    """
    pass
```

**Required Sections**:
- Summary line (one sentence)
- Args (if function has parameters)
- Returns (if function returns a value)
- Raises (if function raises exceptions)

**Optional Sections**:
- Detailed description (for complex functions)
- Example (recommended for public APIs)
- Note/Warning (for important information)

### Code Organization

#### Class Structure

Organize class members in this order:

1. Class docstring
2. Class variables
3. `__init__` method
4. Public methods (alphabetically)
5. Private methods (alphabetically)
6. Properties
7. Static methods
8. Class methods

```python
class DownloadManager:
    """Manages video download operations.
    
    This class coordinates download tasks, manages concurrent downloads,
    and provides progress tracking.
    """
    
    # Class variables
    MAX_CONCURRENT_DOWNLOADS = 3
    
    def __init__(self):
        """Initialize the download manager."""
        self._active_downloads: List[DownloadTask] = []
        self._lock = threading.RLock()
    
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

### Comments

- **Use sparingly**: Code should be self-explanatory
- **Explain why, not what**: Comment the reasoning, not the obvious
- **Keep updated**: Update comments when code changes
- **No commented code**: Remove it or use version control

```python
# Good - explains why
# Use RLock instead of Lock because download_video may call itself recursively
self._lock = threading.RLock()

# Bad - states the obvious
# Create a lock
self._lock = threading.RLock()

# Good - explains complex logic
# Calculate exponential backoff: 2^attempt * base_delay, capped at max_delay
delay = min(2 ** attempt * base_delay, max_delay)

# Bad - commented out code (remove it!)
# old_method()
# legacy_code()
```

### Error Handling

Use specific exceptions from `utils/exceptions.py`:

```python
from utils.exceptions import (
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
        # Chain exceptions to preserve context
        raise NetworkException(f"Failed to connect to {url}") from e
    except PermissionError as e:
        raise AuthenticationException(f"Authentication required for {url}") from e
```

**Guidelines**:
- Use specific exception types, not bare `except:`
- Chain exceptions with `raise ... from e`
- Provide meaningful error messages
- Log exceptions before re-raising
- Handle exceptions at appropriate level

### Logging

Use the structured logger from `utils/logger.py`:

```python
from utils.logger import Logger

logger = Logger(__name__)

# Use appropriate log levels
logger.debug("Detailed debugging information")
logger.info("General informational messages")
logger.warning("Warning messages for recoverable issues")
logger.error("Error messages for failures")

# Include context in logs
logger.info("Download started", extra={
    "url": video_url,
    "quality": selected_quality,
    "task_id": task.id
})
```

**Guidelines**:
- Use appropriate log levels
- Include context (IDs, URLs, user actions)
- Don't log sensitive information (passwords, tokens)
- Use structured logging with `extra` dict
- Log exceptions with `logger.exception()`

---

## Testing Requirements

All code contributions must include appropriate tests.

### Test Coverage

- **New features**: Must include tests covering main functionality
- **Bug fixes**: Must include test reproducing the bug
- **Refactoring**: Existing tests must pass
- **Minimum coverage**: Aim for 80%+ coverage of new code

### Writing Tests

Use pytest for all tests:

```python
import pytest
from models.data_models import DownloadTask
from controllers.queue_manager import QueueManager

class TestQueueManager:
    """Tests for QueueManager class."""
    
    @pytest.fixture
    def queue_manager(self):
        """Create a fresh QueueManager instance."""
        manager = QueueManager()
        yield manager
        manager.clear()  # Cleanup
    
    @pytest.fixture
    def sample_task(self):
        """Create a sample download task."""
        return DownloadTask(
            url="https://example.com/video",
            title="Test Video",
            quality="best"
        )
    
    def test_add_task(self, queue_manager, sample_task):
        """Test adding a task to the queue."""
        queue_manager.add_task(sample_task)
        tasks = queue_manager.get_all_tasks()
        
        assert len(tasks) == 1
        assert tasks[0].url == sample_task.url
    
    def test_remove_task(self, queue_manager, sample_task):
        """Test removing a task from the queue."""
        queue_manager.add_task(sample_task)
        queue_manager.remove_task(sample_task.id)
        
        assert len(queue_manager.get_all_tasks()) == 0
    
    def test_concurrent_access(self, queue_manager):
        """Test thread-safe concurrent access."""
        import threading
        
        def add_tasks():
            for i in range(100):
                task = DownloadTask(url=f"https://example.com/{i}")
                queue_manager.add_task(task)
        
        threads = [threading.Thread(target=add_tasks) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        
        assert len(queue_manager.get_all_tasks()) == 1000
```

### Test Guidelines

- **One assertion per test**: Test one thing at a time
- **Descriptive names**: Test name should describe what it tests
- **Arrange-Act-Assert**: Structure tests clearly
- **Use fixtures**: Share setup code with fixtures
- **Mock external services**: Don't make real network calls
- **Test edge cases**: Empty inputs, None values, boundary conditions
- **Test error paths**: Verify exception handling

### Running Tests

Before submitting a PR:

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=term-missing

# Run specific test file
pytest tests/test_queue_manager.py

# Run tests matching pattern
pytest -k "queue"
```

All tests must pass before your PR can be merged.

---

## Documentation

Good documentation is as important as good code.

### When to Update Documentation

Update documentation when you:

- Add a new feature
- Change existing behavior
- Fix a bug that affects usage
- Modify public APIs
- Add configuration options

### Documentation Types

#### Code Documentation

- **Docstrings**: All public classes, methods, and functions
- **Comments**: Complex logic that needs explanation
- **Type hints**: Function signatures and class attributes

#### User Documentation

- **README.md**: Update if adding user-facing features
- **DEVELOPMENT.md**: Update if changing development workflow
- **ARCHITECTURE.md**: Update if modifying architecture

#### API Documentation

- **API_REFERENCE.md**: Document new public APIs
- **Examples**: Include usage examples
- **Migration guides**: For breaking changes

### Documentation Style

- **Clear and concise**: Get to the point
- **Use examples**: Show, don't just tell
- **Keep updated**: Documentation should match code
- **Check formatting**: Ensure Markdown renders correctly
- **Test examples**: Verify code examples work

---

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. All contributors must:

- **Be respectful**: Treat everyone with respect and kindness
- **Be constructive**: Provide helpful, actionable feedback
- **Be collaborative**: Work together towards common goals
- **Be patient**: Remember that everyone is learning
- **Be inclusive**: Welcome contributors of all backgrounds and skill levels

### Communication Channels

- **GitHub Issues**: Bug reports, feature requests, discussions
- **Pull Requests**: Code contributions and reviews
- **Discussions**: General questions and community chat

### Getting Help

If you need help:

1. **Check documentation**: README, DEVELOPMENT, ARCHITECTURE
2. **Search issues**: Someone may have asked before
3. **Ask in discussions**: Community can help
4. **Open an issue**: For specific problems

### Recognition

Contributors are recognized in:

- **Git history**: Your commits are part of the project
- **Release notes**: Significant contributions are mentioned
- **Contributors list**: All contributors are acknowledged

---

## Thank You!

Thank you for contributing to Klyp! Your efforts help make this project better for everyone.

If you have questions about contributing, feel free to open an issue or start a discussion.

Happy coding! 🚀
