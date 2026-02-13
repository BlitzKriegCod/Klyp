# Migration Guide - Architecture Refactoring

## Overview

This guide helps developers understand the architectural changes made during the refactoring and how to adapt their code to use the new patterns.

## Table of Contents

1. [Key Architectural Changes](#key-architectural-changes)
2. [Deprecated Patterns](#deprecated-patterns)
3. [New Patterns and Best Practices](#new-patterns-and-best-practices)
4. [Component-Specific Migration](#component-specific-migration)
5. [Thread-Safety Guidelines](#thread-safety-guidelines)
6. [Common Migration Scenarios](#common-migration-scenarios)

---

## Key Architectural Changes

### 1. Event-Driven Architecture

**Before:** Direct callbacks and method calls between components
**After:** EventBus-based communication for cross-thread operations

The application now uses an EventBus for all communication between worker threads and the UI thread. This ensures thread-safe updates and decouples components.

### 2. Centralized Thread Pool Management

**Before:** Each component created its own ThreadPoolExecutor
**After:** Single ThreadPoolManager singleton manages all thread pools

All thread pools are now managed centrally, ensuring proper lifecycle management and preventing resource leaks.

### 3. Service Layer Separation

**Before:** Business logic mixed with UI code
**After:** Separate service layer (DownloadService) handles business logic

Business logic has been extracted into service classes that are independent of the UI layer.

### 4. Safe Callback Pattern

**Before:** Direct use of `after()` and `after_idle()` without cleanup
**After:** SafeCallbackMixin provides automatic cleanup and error handling

All UI screens now use SafeCallbackMixin to prevent crashes from callbacks executing after widget destruction.

---

## Deprecated Patterns

### ❌ Creating ThreadPoolExecutor Instances

**Deprecated:**
```python
class MyManager:
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=3)
```

**Use Instead:**
```python
from utils.thread_pool_manager import ThreadPoolManager

class MyManager:
    def __init__(self):
        self.thread_pool = ThreadPoolManager()
    
    def submit_task(self, func, *args):
        future = self.thread_pool.download_pool.submit(func, *args)
        return future
```

### ❌ Direct UI Updates from Worker Threads

**Deprecated:**
```python
def worker_function():
    # This will cause crashes!
    label.config(text="Updated")
```

**Use Instead:**
```python
from utils.event_bus import EventBus, Event, EventType

def worker_function():
    event_bus = EventBus()
    event_bus.publish(Event(
        type=EventType.DOWNLOAD_PROGRESS,
        data={"task_id": "123", "progress": 50.0}
    ))
```

### ❌ Using `after()` Without Cleanup

**Deprecated:**
```python
class MyScreen(ttk.Frame):
    def update_ui(self):
        self.after(1000, self.update_ui)  # No cleanup!
```

**Use Instead:**
```python
from utils.safe_callback_mixin import SafeCallbackMixin

class MyScreen(SafeCallbackMixin, ttk.Frame):
    def __init__(self, parent):
        ttk.Frame.__init__(self, parent)
        SafeCallbackMixin.__init__(self)
    
    def update_ui(self):
        self.safe_after(1000, self.update_ui)
    
    def cleanup(self):
        self.cleanup_callbacks()
```

### ❌ Polling for Status Updates

**Deprecated:**
```python
def auto_refresh(self):
    self.refresh_queue()
    self.after(1000, self.auto_refresh)  # Polling every second
```

**Use Instead:**
```python
def __init__(self, parent):
    # Subscribe to events instead of polling
    self.event_bus.subscribe(EventType.QUEUE_UPDATED, self._on_queue_updated)

def _on_queue_updated(self, event):
    self.refresh_queue()
```

### ❌ Creating Multiple SettingsManager Instances

**Deprecated:**
```python
def get_setting(self):
    settings = SettingsManager()  # Creates new instance each time
    return settings.get("key")
```

**Use Instead:**
```python
def __init__(self):
    self.settings = SettingsManager()  # Singleton - reuses instance

def get_setting(self):
    return self.settings.get("key")
```

---

## New Patterns and Best Practices

### ✅ Event-Based Communication

**Pattern:** Publish events from worker threads, subscribe in UI thread

```python
# In worker thread
from utils.event_bus import EventBus, Event, EventType

def download_worker(task_id):
    event_bus = EventBus()
    
    # Publish progress
    event_bus.publish(Event(
        type=EventType.DOWNLOAD_PROGRESS,
        data={"task_id": task_id, "progress": 25.0}
    ))
    
    # Publish completion
    event_bus.publish(Event(
        type=EventType.DOWNLOAD_COMPLETE,
        data={"task_id": task_id, "file_path": "/path/to/file"}
    ))

# In UI screen
class QueueScreen(SafeCallbackMixin, ttk.Frame):
    def __init__(self, parent, event_bus):
        ttk.Frame.__init__(self, parent)
        SafeCallbackMixin.__init__(self)
        
        self.event_bus = event_bus
        
        # Subscribe to events
        self.sub_progress = event_bus.subscribe(
            EventType.DOWNLOAD_PROGRESS,
            self._on_download_progress
        )
        self.sub_complete = event_bus.subscribe(
            EventType.DOWNLOAD_COMPLETE,
            self._on_download_complete
        )
    
    def _on_download_progress(self, event):
        task_id = event.data["task_id"]
        progress = event.data["progress"]
        # Update UI safely (already in UI thread)
        self.update_progress_bar(task_id, progress)
    
    def cleanup(self):
        # Unsubscribe when screen is destroyed
        self.event_bus.unsubscribe(self.sub_progress)
        self.event_bus.unsubscribe(self.sub_complete)
        self.cleanup_callbacks()
```

### ✅ Using ThreadPoolManager

**Pattern:** Get singleton instance and use appropriate pool

```python
from utils.thread_pool_manager import ThreadPoolManager

class SearchManager:
    def __init__(self):
        self.thread_pool = ThreadPoolManager()
    
    def search(self, query):
        # Use search_pool for search operations
        future = self.thread_pool.search_pool.submit(
            self._search_worker,
            query
        )
        return future
    
    def _search_worker(self, query):
        # Perform search
        results = perform_search(query)
        
        # Publish results via EventBus
        event_bus = EventBus()
        event_bus.publish(Event(
            type=EventType.SEARCH_COMPLETE,
            data={"query": query, "results": results}
        ))
```

### ✅ Using SafeCallbackMixin

**Pattern:** Inherit from SafeCallbackMixin and use safe methods

```python
from utils.safe_callback_mixin import SafeCallbackMixin
import tkinter.ttk as ttk

class MyScreen(SafeCallbackMixin, ttk.Frame):
    def __init__(self, parent):
        ttk.Frame.__init__(self, parent)
        SafeCallbackMixin.__init__(self)
        
        # Use safe_after instead of after
        self.safe_after(1000, self.delayed_update)
        
        # Use safe_after_idle instead of after_idle
        self.safe_after_idle(self.idle_update)
    
    def delayed_update(self):
        # This is safe even if widget is destroyed
        self.label.config(text="Updated")
    
    def cleanup(self):
        # Always call cleanup when screen is destroyed
        self.cleanup_callbacks()
```

### ✅ Thread-Safe State Access

**Pattern:** Use locks for shared state

```python
import threading

class MyManager:
    def __init__(self):
        self._data = {}
        self._lock = threading.RLock()  # Reentrant lock
    
    def update_data(self, key, value):
        with self._lock:
            self._data[key] = value
    
    def get_data(self, key):
        with self._lock:
            return self._data.get(key)
    
    def get_all_data(self):
        with self._lock:
            # Return a copy to prevent external modification
            return self._data.copy()
```

---

## Component-Specific Migration

### QueueManager

**Changes:**
- All methods are now thread-safe with RLock
- `get_all_tasks()` returns a copy of the list
- New methods: `save_pending_downloads()`, `load_pending_downloads()`, `restore_pending_downloads()`

**Migration:**
```python
# No changes needed for basic usage
queue_manager = QueueManager()
task = queue_manager.add_task(video_info, download_path)

# But now safe to call from any thread
threading.Thread(target=lambda: queue_manager.update_task_status(
    task_id, DownloadStatus.COMPLETED
)).start()
```

### DownloadManager → DownloadService

**Changes:**
- Business logic moved to DownloadService
- DownloadManager is now a thin wrapper (deprecated)
- Use DownloadService directly for new code

**Migration:**
```python
# Old way (still works but deprecated)
from controllers.download_manager import DownloadManager
manager = DownloadManager(queue_manager, history_manager, settings_manager)
manager.start_task(task_id)

# New way (recommended)
from controllers.download_service import DownloadService
service = DownloadService()  # Singleton
service.start_download(task_id)
```

### SearchManager

**Changes:**
- Now uses ThreadPoolManager instead of own executor
- Publishes events instead of direct callbacks
- Proper shutdown handling

**Migration:**
```python
# Old way
search_manager = SearchManager()
search_manager.search(query, callback=on_results)

# New way
search_manager = SearchManager()
event_bus = EventBus()

# Subscribe to search events
event_bus.subscribe(EventType.SEARCH_COMPLETE, on_search_complete)
event_bus.subscribe(EventType.SEARCH_FAILED, on_search_failed)

# Perform search (still publishes events internally)
search_manager.search(query)
```

### UI Screens

**Changes:**
- All screens now inherit from SafeCallbackMixin
- Subscribe to EventBus instead of polling
- Must implement cleanup() method

**Migration:**
```python
# Old way
class QueueScreen(ttk.Frame):
    def __init__(self, parent, queue_manager):
        super().__init__(parent)
        self.queue_manager = queue_manager
        self.auto_refresh()
    
    def auto_refresh(self):
        self.refresh_queue()
        self.after(1000, self.auto_refresh)

# New way
from utils.safe_callback_mixin import SafeCallbackMixin

class QueueScreen(SafeCallbackMixin, ttk.Frame):
    def __init__(self, parent, queue_manager, event_bus):
        ttk.Frame.__init__(self, parent)
        SafeCallbackMixin.__init__(self)
        
        self.queue_manager = queue_manager
        self.event_bus = event_bus
        
        # Subscribe to events instead of polling
        self.sub_ids = []
        self.sub_ids.append(
            event_bus.subscribe(EventType.QUEUE_UPDATED, self._on_queue_updated)
        )
        self.sub_ids.append(
            event_bus.subscribe(EventType.DOWNLOAD_PROGRESS, self._on_download_progress)
        )
    
    def _on_queue_updated(self, event):
        # Debounce refresh
        self.safe_after(500, self.refresh_queue)
    
    def cleanup(self):
        # Unsubscribe from events
        for sub_id in self.sub_ids:
            self.event_bus.unsubscribe(sub_id)
        # Cleanup callbacks
        self.cleanup_callbacks()
```

---

## Thread-Safety Guidelines

### Rule 1: Never Access UI from Worker Threads

**❌ Wrong:**
```python
def worker():
    label.config(text="Done")  # CRASH!
```

**✅ Correct:**
```python
def worker():
    event_bus = EventBus()
    event_bus.publish(Event(
        type=EventType.CUSTOM_EVENT,
        data={"message": "Done"}
    ))

# In UI thread
def on_custom_event(event):
    label.config(text=event.data["message"])
```

### Rule 2: Protect Shared State with Locks

**❌ Wrong:**
```python
class Manager:
    def __init__(self):
        self.counter = 0
    
    def increment(self):
        self.counter += 1  # Race condition!
```

**✅ Correct:**
```python
class Manager:
    def __init__(self):
        self.counter = 0
        self._lock = threading.Lock()
    
    def increment(self):
        with self._lock:
            self.counter += 1
```

### Rule 3: Use RLock for Reentrant Methods

**❌ Wrong:**
```python
class Manager:
    def __init__(self):
        self._lock = threading.Lock()
    
    def method_a(self):
        with self._lock:
            self.method_b()  # Deadlock!
    
    def method_b(self):
        with self._lock:
            pass
```

**✅ Correct:**
```python
class Manager:
    def __init__(self):
        self._lock = threading.RLock()  # Reentrant
    
    def method_a(self):
        with self._lock:
            self.method_b()  # OK
    
    def method_b(self):
        with self._lock:
            pass
```

### Rule 4: Always Cleanup Resources

**❌ Wrong:**
```python
class Screen(ttk.Frame):
    def __init__(self, parent):
        super().__init__(parent)
        self.after(1000, self.update)
    # No cleanup - callbacks continue after destroy!
```

**✅ Correct:**
```python
class Screen(SafeCallbackMixin, ttk.Frame):
    def __init__(self, parent):
        ttk.Frame.__init__(self, parent)
        SafeCallbackMixin.__init__(self)
        self.safe_after(1000, self.update)
    
    def cleanup(self):
        self.cleanup_callbacks()
```

### Rule 5: Use EventBus for Cross-Thread Communication

**❌ Wrong:**
```python
def worker(callback):
    result = do_work()
    callback(result)  # May crash if callback touches UI
```

**✅ Correct:**
```python
def worker(task_id):
    result = do_work()
    event_bus = EventBus()
    event_bus.publish(Event(
        type=EventType.WORK_COMPLETE,
        data={"task_id": task_id, "result": result}
    ))
```

---

## Common Migration Scenarios

### Scenario 1: Adding a New Download Feature

```python
# 1. Modify DownloadService to add new functionality
class DownloadService:
    def download_with_custom_option(self, task_id, option):
        task = self._queue_manager.get_task(task_id)
        # ... implement download logic ...
        
        # Publish events for UI updates
        self._event_bus.publish(Event(
            type=EventType.DOWNLOAD_PROGRESS,
            data={"task_id": task_id, "progress": 50.0}
        ))

# 2. Subscribe to events in UI
class QueueScreen(SafeCallbackMixin, ttk.Frame):
    def __init__(self, parent, event_bus):
        # ... initialization ...
        event_bus.subscribe(
            EventType.DOWNLOAD_PROGRESS,
            self._on_download_progress
        )
    
    def _on_download_progress(self, event):
        # Update UI based on event data
        pass
```

### Scenario 2: Creating a New UI Screen

```python
from utils.safe_callback_mixin import SafeCallbackMixin
import tkinter.ttk as ttk

class NewScreen(SafeCallbackMixin, ttk.Frame):
    def __init__(self, parent, event_bus):
        # Initialize both parent classes
        ttk.Frame.__init__(self, parent)
        SafeCallbackMixin.__init__(self)
        
        self.event_bus = event_bus
        self.subscription_ids = []
        
        # Subscribe to relevant events
        self.subscription_ids.append(
            event_bus.subscribe(EventType.SOME_EVENT, self._on_some_event)
        )
        
        # Use safe_after for delayed operations
        self.safe_after(1000, self.delayed_init)
    
    def _on_some_event(self, event):
        # Handle event (already in UI thread)
        pass
    
    def cleanup(self):
        # Unsubscribe from all events
        for sub_id in self.subscription_ids:
            self.event_bus.unsubscribe(sub_id)
        
        # Cleanup callbacks
        self.cleanup_callbacks()
```

### Scenario 3: Adding a New Background Task

```python
from utils.thread_pool_manager import ThreadPoolManager
from utils.event_bus import EventBus, Event, EventType

class MyService:
    def __init__(self):
        self.thread_pool = ThreadPoolManager()
        self.event_bus = EventBus()
    
    def start_background_task(self, task_id):
        # Submit to appropriate pool
        future = self.thread_pool.download_pool.submit(
            self._background_worker,
            task_id
        )
        
        # Add completion callback
        future.add_done_callback(
            lambda f: self._on_task_complete(task_id, f)
        )
    
    def _background_worker(self, task_id):
        # Do work in background
        result = perform_work()
        
        # Publish progress events
        self.event_bus.publish(Event(
            type=EventType.CUSTOM_PROGRESS,
            data={"task_id": task_id, "progress": 50.0}
        ))
        
        return result
    
    def _on_task_complete(self, task_id, future):
        try:
            result = future.result()
            self.event_bus.publish(Event(
                type=EventType.CUSTOM_COMPLETE,
                data={"task_id": task_id, "result": result}
            ))
        except Exception as e:
            self.event_bus.publish(Event(
                type=EventType.CUSTOM_FAILED,
                data={"task_id": task_id, "error": str(e)}
            ))
```

---

## Testing Your Migration

### Checklist

- [ ] No direct UI access from worker threads
- [ ] All shared state protected with locks
- [ ] All screens inherit from SafeCallbackMixin
- [ ] All screens implement cleanup() method
- [ ] Using ThreadPoolManager instead of creating executors
- [ ] Using EventBus for cross-thread communication
- [ ] Proper shutdown handling in application close
- [ ] No memory leaks from uncancelled callbacks
- [ ] No crashes when switching screens during operations

### Debug Mode

Enable thread-safety debugging to catch violations:

```python
# In your screen
class MyScreen(SafeCallbackMixin, ttk.Frame):
    def __init__(self, parent):
        ttk.Frame.__init__(self, parent)
        SafeCallbackMixin.__init__(self)
        
        # Enable debug mode
        self.set_debug_thread_safety(True)
```

This will raise `ThreadSafetyViolation` exceptions if UI operations are called from non-UI threads.

---

## Getting Help

If you encounter issues during migration:

1. Check the logs for thread-safety warnings
2. Review the requirements document for thread-safety guarantees
3. Look at existing refactored screens as examples
4. Enable debug mode to catch thread-safety violations

## Summary

The key principles of the new architecture:

1. **Event-Driven**: Use EventBus for all cross-thread communication
2. **Centralized**: Use ThreadPoolManager for all thread pools
3. **Safe**: Use SafeCallbackMixin for all UI screens
4. **Separated**: Keep business logic in service layer
5. **Protected**: Use locks for all shared state

Following these patterns will ensure your code is thread-safe, maintainable, and crash-free.
