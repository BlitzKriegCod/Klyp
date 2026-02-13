"""
EventBus for thread-safe communication between worker threads and UI thread.
Implements event-driven architecture for Klyp Video Downloader.
"""

import queue
import threading
import tkinter as tk
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional
import uuid

from utils.logger import get_logger


class EventType(Enum):
    """
    Enumeration of all event types in the application.
    
    Event Data Structures:
    
    DOWNLOAD_PROGRESS:
        - task_id: str - ID of the download task
        - progress: float - Progress percentage (0-100)
        - status: str - Current status (optional)
        - downloaded_bytes: int - Bytes downloaded (optional)
        - total_bytes: int - Total bytes (optional)
    
    DOWNLOAD_COMPLETE:
        - task_id: str - ID of the download task
        - file_path: str - Path to downloaded file
    
    DOWNLOAD_FAILED:
        - task_id: str - ID of the download task
        - error: str - Error message
        - error_type: str - Type of error (optional)
    
    DOWNLOAD_STOPPED:
        - task_id: str - ID of the download task
        - reason: str - Reason for stopping (optional)
    
    SEARCH_COMPLETE:
        - query: str - Search query
        - results: List[SearchResult] - Search results
        - result_count: int - Number of results
    
    SEARCH_FAILED:
        - query: str - Search query
        - error: str - Error message
    
    QUEUE_UPDATED:
        - action: str - Action performed (add, remove, update, clear)
        - task_id: str - ID of affected task (optional)
        - task_count: int - Total tasks in queue (optional)
    
    SETTINGS_CHANGED:
        - changed_keys: List[str] - List of setting keys that changed
        - settings: Dict[str, Any] - New settings values
    """
    DOWNLOAD_PROGRESS = "download_progress"
    DOWNLOAD_COMPLETE = "download_complete"
    DOWNLOAD_FAILED = "download_failed"
    DOWNLOAD_STOPPED = "download_stopped"
    SEARCH_COMPLETE = "search_complete"
    SEARCH_FAILED = "search_failed"
    QUEUE_UPDATED = "queue_updated"
    SETTINGS_CHANGED = "settings_changed"


@dataclass
class Event:
    """
    Represents an event in the system.
    
    Attributes:
        type: Type of the event
        data: Event-specific data dictionary
        timestamp: When the event was created
    """
    type: EventType
    data: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        """Validate Event after initialization."""
        if not isinstance(self.type, EventType):
            raise TypeError("type must be an EventType enum")
        if not isinstance(self.data, dict):
            raise TypeError("data must be a dictionary")


class EventBus:
    """
    Thread-safe event bus for cross-thread communication.
    
    Singleton class to ensure all parts of the application use the same event bus.
    
    The EventBus allows worker threads to publish events that are processed
    in the UI thread, ensuring thread-safe UI updates. It uses a queue.Queue
    for thread-safe event queuing and processes events in the main UI thread
    using tkinter's after() mechanism.
    
    Usage:
        # In main application
        event_bus = EventBus()
        event_bus.start(root)
        
        # Subscribe to events
        sub_id = event_bus.subscribe(EventType.DOWNLOAD_COMPLETE, on_download_complete)
        
        # Publish events from worker thread
        event_bus.publish(Event(
            type=EventType.DOWNLOAD_PROGRESS,
            data={"task_id": "123", "progress": 50.0}
        ))
        
        # Unsubscribe when done
        event_bus.unsubscribe(sub_id)
        
        # Stop when closing application
        event_bus.stop()
    """
    
    _instance: Optional['EventBus'] = None
    _class_lock = threading.Lock()
    _initialized = False
    
    # Maximum number of events in queue to prevent memory leaks
    MAX_QUEUE_SIZE = 1000
    
    # Event processing interval in milliseconds
    PROCESS_INTERVAL_MS = 100
    
    def __new__(cls):
        """
        Implement singleton pattern with thread-safe initialization.
        
        Uses double-checked locking to ensure only one instance is created
        even in multi-threaded environments.
        """
        if cls._instance is None:
            with cls._class_lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize the EventBus."""
        # Prevent re-initialization
        if EventBus._initialized:
            return
        
        EventBus._initialized = True
        self._queue: queue.Queue = queue.Queue(maxsize=self.MAX_QUEUE_SIZE)
        self._listeners: Dict[EventType, List[tuple]] = defaultdict(list)
        self._lock = threading.Lock()
        self._running = False
        self._logger = get_logger()
        self._logger.info("EventBus initialized (singleton)")
    
    def publish(self, event: Event) -> bool:
        """
        Publish an event from any thread.
        
        This method is thread-safe and can be called from worker threads.
        Events are queued and processed in the UI thread.
        
        Args:
            event: Event to publish
        
        Returns:
            True if event was queued successfully, False if queue is full
        """
        try:
            thread = threading.current_thread()
            # THREAD-SAFE: queue.Queue.put_nowait() is thread-safe
            # This allows worker threads to safely publish events without locks
            self._queue.put_nowait(event)
            self._logger.debug(
                f"[Thread-{thread.ident}:{thread.name}] Event published: {event.type.value}"
            )
            return True
        except queue.Full:
            thread = threading.current_thread()
            self._logger.warning(
                f"[Thread-{thread.ident}:{thread.name}] Event queue full, dropping event: {event.type.value}"
            )
            return False
    
    def subscribe(self, event_type: EventType, callback: Callable[[Event], None]) -> str:
        """
        Subscribe to an event type.
        
        The callback will be invoked in the UI thread when events of the
        specified type are published.
        
        Args:
            event_type: Type of event to subscribe to
            callback: Function to call when event occurs. Receives Event as parameter.
        
        Returns:
            Subscription ID that can be used to unsubscribe
        """
        # THREAD-SAFE: Lock protects _listeners dict from concurrent modification
        # This ensures that subscribe/unsubscribe operations are atomic
        with self._lock:
            sub_id = str(uuid.uuid4())
            self._listeners[event_type].append((sub_id, callback))
            self._logger.debug(
                f"Subscribed to {event_type.value} with ID {sub_id}"
            )
            return sub_id
    
    def unsubscribe(self, sub_id: str) -> bool:
        """
        Unsubscribe using subscription ID.
        
        Args:
            sub_id: Subscription ID returned by subscribe()
        
        Returns:
            True if subscription was found and removed, False otherwise
        """
        with self._lock:
            found = False
            for event_type, listeners in list(self._listeners.items()):
                original_count = len(listeners)
                self._listeners[event_type] = [
                    (sid, cb) for sid, cb in listeners if sid != sub_id
                ]
                if len(self._listeners[event_type]) < original_count:
                    found = True
                    self._logger.debug(
                        f"Unsubscribed {sub_id} from {event_type.value}"
                    )
                # Clean up empty listener lists
                if not self._listeners[event_type]:
                    del self._listeners[event_type]
            
            if not found:
                self._logger.warning(f"Subscription ID not found: {sub_id}")
            
            return found
    
    def process_events(self, root: tk.Tk) -> None:
        """
        Process pending events in UI thread.
        
        This method should only be called from the UI thread. It processes
        all pending events in the queue and dispatches them to subscribers.
        
        Args:
            root: Tkinter root window for scheduling next processing cycle
        """
        try:
            # CRITICAL: This method MUST only be called from the UI thread
            # It processes events from the queue and invokes callbacks that update UI
            # Processing is batched (max 100 events per cycle) to prevent UI freezing
            events_processed = 0
            while not self._queue.empty() and events_processed < 100:
                try:
                    event = self._queue.get_nowait()
                    self._dispatch_event(event)
                    events_processed += 1
                except queue.Empty:
                    break
            
            if events_processed > 0:
                self._logger.debug(f"Processed {events_processed} events")
        
        except Exception as e:
            self._logger.error(
                f"Error processing events: {str(e)}",
                exc_info=True
            )
        
        finally:
            # Schedule next processing cycle if still running
            # This creates a continuous event processing loop in the UI thread
            if self._running:
                root.after(self.PROCESS_INTERVAL_MS, lambda: self.process_events(root))
    
    def _dispatch_event(self, event: Event) -> None:
        """
        Dispatch event to all subscribers.
        
        This method is called in the UI thread and invokes all callbacks
        registered for the event type.
        
        Args:
            event: Event to dispatch
        """
        thread = threading.current_thread()
        
        with self._lock:
            listeners = self._listeners.get(event.type, []).copy()
        
        if not listeners:
            self._logger.debug(
                f"[Thread-{thread.ident}:{thread.name}] No listeners for event: {event.type.value}"
            )
            return
        
        self._logger.debug(
            f"[Thread-{thread.ident}:{thread.name}] Dispatching {event.type.value} to {len(listeners)} listener(s)"
        )
        
        for sub_id, callback in listeners:
            try:
                callback(event)
            except Exception as e:
                self._logger.error(
                    f"[Thread-{thread.ident}:{thread.name}] Error in event callback {sub_id} for {event.type.value}: {str(e)}",
                    exc_info=True
                )
    
    def start(self, root: tk.Tk) -> None:
        """
        Start event processing loop.
        
        This should be called after the UI is initialized but before
        the mainloop starts.
        
        Args:
            root: Tkinter root window
        """
        if self._running:
            self._logger.warning("EventBus already running")
            return
        
        self._running = True
        self._logger.info("EventBus started")
        self.process_events(root)
    
    def stop(self) -> None:
        """
        Stop event processing loop.
        
        This should be called when the application is closing to ensure
        graceful shutdown.
        """
        if not self._running:
            return
        
        self._running = False
        self._logger.info("EventBus stopped")
        
        # Process any remaining events
        remaining = self._queue.qsize()
        if remaining > 0:
            self._logger.info(f"Processing {remaining} remaining events")
            try:
                while not self._queue.empty():
                    event = self._queue.get_nowait()
                    self._dispatch_event(event)
            except queue.Empty:
                pass
    
    def clear_queue(self) -> int:
        """
        Clear all pending events from the queue.
        
        Returns:
            Number of events cleared
        """
        count = 0
        try:
            while not self._queue.empty():
                self._queue.get_nowait()
                count += 1
        except queue.Empty:
            pass
        
        if count > 0:
            self._logger.info(f"Cleared {count} events from queue")
        
        return count
    
    def get_queue_size(self) -> int:
        """
        Get the current number of events in the queue.
        
        Returns:
            Number of pending events
        """
        return self._queue.qsize()
    
    def get_listener_count(self, event_type: Optional[EventType] = None) -> int:
        """
        Get the number of listeners.
        
        Args:
            event_type: If specified, count listeners for this event type only.
                       If None, count all listeners.
        
        Returns:
            Number of listeners
        """
        with self._lock:
            if event_type is not None:
                return len(self._listeners.get(event_type, []))
            else:
                return sum(len(listeners) for listeners in self._listeners.values())
