"""
Custom exception hierarchy for Klyp Video Downloader.
Provides specific exception types for better error handling and classification.
"""


class KlypException(Exception):
    """
    Base exception for all Klyp-specific exceptions.
    
    All custom exceptions in the application should inherit from this class.
    This allows for catching all application-specific errors with a single
    except clause if needed.
    
    Usage:
        try:
            # Some operation
            pass
        except KlypException as e:
            # Handle any Klyp-specific error
            logger.error(f"Application error: {e}")
    """
    pass


class DownloadException(KlypException):
    """
    Base exception for download-related errors.
    
    This exception and its subclasses are raised when errors occur during
    the download process. Use specific subclasses when the error type is known.
    
    When to use:
        - Generic download failures that don't fit other categories
        - When wrapping yt-dlp exceptions that don't have a specific category
        - As a base class for more specific download exceptions
    
    Usage:
        try:
            downloader.download(url)
        except DownloadException as e:
            # Handle any download-related error
            logger.error(f"Download failed: {e}")
    """
    pass


class NetworkException(DownloadException):
    """
    Exception for network-related download errors.
    
    Raised when download fails due to network issues such as:
    - Connection timeouts
    - DNS resolution failures
    - Network unreachable
    - Connection refused
    - SSL/TLS errors
    
    When to use:
        - When yt-dlp raises network-related errors
        - When requests fail due to network issues
        - When connection cannot be established
    
    Usage:
        try:
            response = requests.get(url, timeout=10)
        except requests.exceptions.ConnectionError as e:
            raise NetworkException(f"Network error: {e}") from e
    
    Recovery strategy:
        - Retry with exponential backoff
        - Check network connectivity
        - Verify proxy settings if applicable
    """
    pass


class AuthenticationException(DownloadException):
    """
    Exception for authentication-related errors.
    
    Raised when download fails due to authentication or authorization issues:
    - Login required but credentials not provided
    - Invalid credentials
    - Account suspended or banned
    - Geographic restrictions
    - Age-restricted content without authentication
    
    When to use:
        - When yt-dlp raises authentication errors
        - When API returns 401 or 403 status codes
        - When content requires login but user is not authenticated
    
    Usage:
        if response.status_code == 401:
            raise AuthenticationException("Login required to download this video")
    
    Recovery strategy:
        - Prompt user for credentials
        - Check if cookies are valid
        - Inform user about geographic or age restrictions
    """
    pass


class FormatException(DownloadException):
    """
    Exception for format/codec-related errors.
    
    Raised when download fails due to format or codec issues:
    - Requested quality not available
    - Unsupported video format
    - Codec not supported
    - Format extraction failed
    - Corrupted video stream
    
    When to use:
        - When yt-dlp cannot extract video formats
        - When requested quality is not available
        - When video format is not supported
        - When post-processing fails due to codec issues
    
    Usage:
        if not available_formats:
            raise FormatException("No suitable video format found")
    
    Recovery strategy:
        - Try alternative quality settings
        - Fall back to "best" quality
        - Check if ffmpeg is installed for post-processing
    """
    pass


class ExtractionException(DownloadException):
    """
    Exception for video information extraction errors.
    
    Raised when extracting video metadata fails:
    - Invalid or unsupported URL
    - Video not found (404)
    - Video removed or deleted
    - Private video
    - Extractor not available for platform
    
    When to use:
        - When yt-dlp cannot extract video information
        - When URL is invalid or malformed
        - When video is not accessible
    
    Usage:
        try:
            info = ydl.extract_info(url, download=False)
        except yt_dlp.utils.ExtractorError as e:
            raise ExtractionException(f"Failed to extract video info: {e}") from e
    
    Recovery strategy:
        - Verify URL is correct
        - Check if video is still available
        - Try alternative extractors if available
    """
    pass


class ThreadSafetyViolation(KlypException):
    """
    Exception raised when UI is accessed from wrong thread (debug mode only).
    
    This exception is raised in debug mode when code attempts to update
    tkinter widgets from a thread other than the main UI thread. This helps
    identify thread-safety violations during development.
    
    When to use:
        - In debug mode, when detecting UI updates from worker threads
        - When validating that callbacks run in the correct thread
        - During development to catch threading bugs
    
    Usage:
        if DEBUG_MODE and threading.current_thread() != main_thread:
            raise ThreadSafetyViolation(
                f"UI update attempted from {threading.current_thread().name}"
            )
    
    Note:
        This exception should only be raised in debug mode. In production,
        log a warning instead of raising the exception.
    
    Recovery strategy:
        - Use EventBus to publish events from worker threads
        - Use safe_after() or safe_after_idle() for UI updates
        - Ensure all UI updates happen in the main thread
    """
    pass


class QueueException(KlypException):
    """
    Exception for queue management errors.
    
    Raised when operations on the download queue fail:
    - Duplicate URL in queue
    - Task not found
    - Invalid task state transition
    - Queue persistence errors
    
    When to use:
        - When adding duplicate tasks to queue
        - When trying to operate on non-existent tasks
        - When queue save/load fails
    
    Usage:
        if self.is_url_in_queue(url):
            raise QueueException(f"URL already in queue: {url}")
    
    Recovery strategy:
        - Check if task already exists before adding
        - Validate task IDs before operations
        - Handle queue persistence errors gracefully
    """
    pass


class SettingsException(KlypException):
    """
    Exception for settings management errors.
    
    Raised when settings operations fail:
    - Invalid setting value
    - Settings file corrupted
    - Settings file not found
    - Permission denied when saving settings
    
    When to use:
        - When settings validation fails
        - When settings file cannot be read or written
        - When settings have invalid values
    
    Usage:
        if not os.path.exists(settings_file):
            raise SettingsException(f"Settings file not found: {settings_file}")
    
    Recovery strategy:
        - Use default settings if file is corrupted
        - Create new settings file if missing
        - Validate settings before saving
    """
    pass


class SearchException(KlypException):
    """
    Exception for search-related errors.
    
    Raised when search operations fail:
    - Search query invalid
    - Search API unavailable
    - Search timeout
    - No results found (optional, can also return empty list)
    
    When to use:
        - When search API returns errors
        - When search times out
        - When search query is malformed
    
    Usage:
        try:
            results = search_api.search(query)
        except requests.exceptions.Timeout:
            raise SearchException("Search timed out") from e
    
    Recovery strategy:
        - Retry search with timeout
        - Validate query before searching
        - Fall back to alternative search methods
    """
    pass


# Exception mapping for yt-dlp errors
# This can be used to convert yt-dlp exceptions to our custom exceptions
YT_DLP_EXCEPTION_MAP = {
    'network': NetworkException,
    'authentication': AuthenticationException,
    'format': FormatException,
    'extraction': ExtractionException,
}


def classify_yt_dlp_error(error_message: str) -> type:
    """
    Classify yt-dlp error message and return appropriate exception class.
    
    This helper function analyzes yt-dlp error messages and returns the
    most appropriate custom exception class to use.
    
    Args:
        error_message: Error message from yt-dlp
    
    Returns:
        Exception class to use (subclass of DownloadException)
    
    Usage:
        try:
            ydl.download([url])
        except Exception as e:
            error_msg = str(e).lower()
            exception_class = classify_yt_dlp_error(error_msg)
            raise exception_class(str(e)) from e
    """
    error_lower = error_message.lower()
    
    # Network errors
    if any(keyword in error_lower for keyword in [
        'network', 'connection', 'timeout', 'unreachable',
        'dns', 'ssl', 'certificate', 'timed out'
    ]):
        return NetworkException
    
    # Authentication errors
    if any(keyword in error_lower for keyword in [
        'login', 'authentication', 'credentials', 'forbidden',
        'unauthorized', '401', '403', 'geo', 'region', 'country'
    ]):
        return AuthenticationException
    
    # Format errors
    if any(keyword in error_lower for keyword in [
        'format', 'quality', 'codec', 'unsupported format',
        'no suitable', 'postprocessing'
    ]):
        return FormatException
    
    # Extraction errors
    if any(keyword in error_lower for keyword in [
        'extract', 'not found', '404', 'removed', 'deleted',
        'private', 'unavailable', 'invalid url'
    ]):
        return ExtractionException
    
    # Default to generic DownloadException
    return DownloadException
