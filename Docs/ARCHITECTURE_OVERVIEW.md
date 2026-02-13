# Architecture Overview - Klyp Video Downloader

## Introduction

This document provides a high-level overview of the Klyp Video Downloader architecture after the thread-safety refactoring. It explains the key components, their interactions, and the design principles that guide the implementation.

## Design Principles

### 1. Thread-Safety First
All components that handle shared state are designed with thread-safety as the primary concern. This prevents race conditions, deadlocks, and crashes.

### 2. Separation of Concerns
Business logic is separated from UI code through a service layer. This makes the code more testable and maintainable.

### 3. Event-Driven Architecture
Components communicate through an EventBus rather than direct method calls. This decouples components and ensures thread-safe communication.

### 4. Fail-Safe Design
Exceptions are caught and handled gracefully at every level. The application never crashes due to unhandled exceptions.

### 5. Resource Management
All resources (threads, callbacks, file handles) are properly managed with explicit lifecycle control.

## Core Components

### EventBus
**Purpose:** Thread-safe communication between worker threads and UI thread

**Key Features:**
- Queue-based event system using `queue.Queue`
- Publish from any thread, process in UI thread
- Subscription-based listener pattern
- Automatic event batching to prevent UI freezing

**Thread-Safety:**
- `queue.Queue` for thread-safe event queuing
- `threading.Lock` for protecting listener subscriptions
- All callbacks executed in UI thread via `after()`

### ThreadPoolManager
**Purpose:** Centralized management of all thread pools

**Key Features:**
- Singleton pattern with lazy initialization
- Separate pools for downloads (3 workers) and searches (3 workers)
- Graceful shutdown with timeout
- Thread-safe initialization using double-checked locking

**Thread-Safety:**
- Double-checked locking for singleton initialization
- Lazy initialization with lock protection
- Proper shutdown sequence

### DownloadService
**Purpose:** Business logic for download operations

**Key Features:**
- Singleton service layer
- Manages download lifecycle (start, stop, progress tracking)
- Publishes events for UI updates
- Handles errors and retries

**Thread-Safety:**
- `threading.RLock` for protecting active downloads state
- `threading.Event` for stop signals
- All UI updates via EventBus

### QueueManager
**Purpose:** Manages download queue with thread-safe operations

**Key Features:**
- Thread-safe CRUD operations on queue
- Persistence to JSON for auto-resume
- Status tracking and filtering

**Thread-Safety:**
- `threading.RLock` for all queue operations
- Returns copies of data to prevent external modification
- Atomic operations for state changes

### SafeCallbackMixin
**Purpose:** Provides safe UI update methods for screens

**Key Features:**
- Automatic callback tracking and cleanup
- Exception handling for destroyed widgets
- Thread-safety validation in debug mode
- Prevents crashes from late callbacks

**Thread-Safety:**
- Validates UI thread access in debug mode
- Tracks all callback IDs for cleanup
- Handles `TclError` gracefully

## Data Flow

### Download Flow

```
1. User clicks download button (UI Thread)
   ↓
2. QueueScreen calls DownloadService.start_download() (UI Thread)
   ↓
3. DownloadService submits worker to ThreadPoolManager (UI Thread)
   ↓
4. Worker executes in background thread (Worker Thread)
   ↓
5. Worker publishes progress events to EventBus (Worker Thread)
   ↓
6. EventBus queues events (Thread-Safe)
   ↓
7. EventBus processes events in UI thread (UI Thread)
   ↓
8. Event callbacks update UI widgets (UI Thread)
```

### Event Flow

```
Worker Thread                EventBus                    UI Thread
     |                          |                            |
     |-- publish(event) ------->|                            |
     |                          |-- queue.put() ------------>|
     |                          |                            |
     |                          |<-- process_events() -------|
     |                          |                            |
     |                          |-- dispatch_event() ------->|
     |                          |                            |
     |                          |                            |-- callback()
     |                          |                            |-- update UI
```

## Thread Model

### Main Thread (UI Thread)
- Handles all tkinter events
- Processes EventBus events
- Updates UI widgets
- Schedules callbacks with `after()`

**Rules:**
- ONLY thread that can modify UI widgets
- Processes events from EventBus every 100ms
- All callbacks must be scheduled via `after()` or `after_idle()`

### Download Worker Threads (Pool of 3)
- Execute download operations
- Report progress via EventBus
- Check stop signals
- Handle download errors

**Rules:**
- NEVER access UI widgets directly
- ALWAYS publish events for UI updates
- Check stop_event regularly for cancellation
- Handle all exceptions

### Search Worker Threads (Pool of 3)
- Execute search operations
- Report results via EventBus
- Handle search errors

**Rules:**
- NEVER access UI widgets directly
- ALWAYS publish events for UI updates
- Handle all exceptions

## Synchronization Mechanisms

### Locks

**RLock (Reentrant Lock):**
- Used in: QueueManager, DownloadService
- Purpose: Protect shared state that may be accessed by methods calling other methods
- Example: `add_task()` calls `is_url_in_queue()`, both need lock

**Lock (Regular Lock):**
- Used in: EventBus, ThreadPoolManager
- Purpose: Protect simple shared state
- Example: Listener subscriptions in EventBus

### Events

**threading.Event:**
- Used in: DownloadService for stop signals
- Purpose: Signal worker threads to stop gracefully
- Thread-safe by design

### Queues

**queue.Queue:**
- Used in: EventBus for event queuing
- Purpose: Thread-safe communication between threads
- Thread-safe by design

## Error Handling Strategy

### Exception Hierarchy

```
KlypException (base)
├── DownloadException
│   ├── NetworkException
│   ├── AuthenticationException
│   ├── FormatException
│   └── ExtractionException
└── ThreadSafetyViolation (debug only)
```

### Error Handling Levels

**1. Worker Thread Level:**
- Catch all exceptions in worker functions
- Classify error type
- Publish failure event with error details
- Log with structured context

**2. Callback Level:**
- Wrap all callbacks with try-except
- Catch `TclError` for destroyed widgets (expected)
- Catch other exceptions and log (unexpected)
- Never crash the application

**3. Service Level:**
- Validate inputs before operations
- Handle business logic errors
- Update task status appropriately
- Publish appropriate events

## Lifecycle Management

### Application Startup

```
1. Create EventBus instance
2. Initialize managers (singleton instances created on first access)
3. Create UI screens with EventBus reference
4. Subscribe screens to relevant events
5. Start EventBus processing loop
6. Load pending downloads from disk
```

### Application Shutdown

```
1. User clicks close button
2. Stop all active downloads (set stop events)
3. Save pending downloads to disk
4. Stop EventBus processing loop
5. Shutdown ThreadPoolManager (wait up to 10s)
6. Cleanup all screen callbacks
7. Destroy UI
```

### Screen Lifecycle

```
1. Screen created and added to notebook
2. Screen subscribes to EventBus events
3. Screen schedules callbacks with safe_after()
4. User switches to different screen
5. Previous screen cleanup() called
6. Callbacks cancelled
7. Events unsubscribed
8. Screen remains in memory but inactive
```

## Performance Considerations

### Event Throttling
- Progress events limited to every 5% change
- Prevents event queue overflow
- Reduces UI update overhead

### Event Batching
- EventBus processes up to 100 events per cycle
- Prevents UI freezing from event backlog
- Balances responsiveness and throughput

### Lazy Initialization
- Thread pools created only when needed
- Reduces startup time
- Saves resources if features not used

### Debouncing
- UI refresh operations debounced to 500ms
- Prevents excessive redraws
- Improves perceived performance

## Testing Strategy

### Unit Tests
- Test individual components in isolation
- Mock dependencies
- Focus on thread-safety guarantees
- Test error handling paths

### Integration Tests
- Test component interactions
- Test complete workflows (add task → download → history)
- Test concurrent operations
- Test error propagation

### Thread-Safety Tests
- Test concurrent access to shared state
- Test race conditions
- Test deadlock scenarios
- Use stress testing with many threads

### UI Tests
- Test screen lifecycle
- Test callback cleanup
- Test event subscription/unsubscription
- Test rapid screen switching

## Common Patterns

### Publishing Events from Worker Thread

```python
def worker_function(task_id):
    event_bus = EventBus()
    
    # Do work
    result = perform_work()
    
    # Publish event
    event_bus.publish(Event(
        type=EventType.WORK_COMPLETE,
        data={"task_id": task_id, "result": result}
    ))
```

### Subscribing to Events in UI

```python
class MyScreen(SafeCallbackMixin, ttk.Frame):
    def __init__(self, parent, event_bus):
        ttk.Frame.__init__(self, parent)
        SafeCallbackMixin.__init__(self)
        
        self.event_bus = event_bus
        self.sub_id = event_bus.subscribe(
            EventType.WORK_COMPLETE,
            self._on_work_complete
        )
    
    def _on_work_complete(self, event):
        # Update UI (already in UI thread)
        self.update_display(event.data["result"])
    
    def cleanup(self):
        self.event_bus.unsubscribe(self.sub_id)
        self.cleanup_callbacks()
```

### Thread-Safe State Access

```python
class Manager:
    def __init__(self):
        self._state = {}
        self._lock = threading.RLock()
    
    def update_state(self, key, value):
        with self._lock:
            self._state[key] = value
    
    def get_state(self, key):
        with self._lock:
            return self._state.get(key)
```

### Safe UI Updates

```python
class MyScreen(SafeCallbackMixin, ttk.Frame):
    def schedule_update(self):
        # Safe - tracks callback and handles errors
        self.safe_after(1000, self.update_display)
    
    def update_display(self):
        # This is safe even if widget is destroyed
        self.label.config(text="Updated")
```

## Debugging

### Thread-Safety Debugging

Enable debug mode to catch thread-safety violations:

```python
screen.set_debug_thread_safety(True)
```

This will raise `ThreadSafetyViolation` if UI operations are called from non-UI threads.

### Logging

All components log thread IDs for debugging:

```
[Thread-12345:download_worker_0] Starting download for task abc123
[Thread-1:MainThread] Processing event: DOWNLOAD_PROGRESS
```

### Common Issues

**Issue:** Application crashes when switching screens
**Cause:** Callbacks executing after widget destruction
**Solution:** Use SafeCallbackMixin and call cleanup()

**Issue:** UI freezes during downloads
**Cause:** Too many progress events
**Solution:** Throttle events (already implemented)

**Issue:** Downloads don't stop when requested
**Cause:** Worker not checking stop_event
**Solution:** Check stop_event in progress callback

**Issue:** Race condition in shared state
**Cause:** Missing lock protection
**Solution:** Add RLock and use `with` statement

## Future Enhancements

### Potential Improvements

1. **Priority Queue:** Allow users to prioritize certain downloads
2. **Bandwidth Limiting:** Limit download speed per task or globally
3. **Retry Logic:** Automatic retry with exponential backoff
4. **Download Scheduling:** Schedule downloads for specific times
5. **Parallel Chunk Downloads:** Download large files in parallel chunks

### Architectural Considerations

All future enhancements should follow these principles:
- Maintain thread-safety guarantees
- Use EventBus for cross-thread communication
- Keep business logic in service layer
- Properly manage resource lifecycle
- Handle errors gracefully

## References

- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Guide for developers migrating to new architecture
- [requirements.md](../.kiro/specs/architecture-refactoring/requirements.md) - Detailed requirements
- [design.md](../.kiro/specs/architecture-refactoring/design.md) - Detailed design document
- [tasks.md](../.kiro/specs/architecture-refactoring/tasks.md) - Implementation tasks

## Conclusion

The refactored architecture provides a solid foundation for a stable, maintainable application. By following the patterns and principles outlined in this document, developers can confidently add new features without introducing thread-safety issues or crashes.

The key to success is:
1. Always use EventBus for cross-thread communication
2. Never access UI from worker threads
3. Always protect shared state with locks
4. Always cleanup resources properly
5. Handle all exceptions gracefully
