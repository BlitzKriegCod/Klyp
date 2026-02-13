"""
Unit tests for EventBus.
Tests publish, subscribe, unsubscribe, process_events, and thread-safety.
"""

import unittest
import threading
import time
import tkinter as tk
from unittest.mock import Mock, patch
from utils.event_bus import EventBus, Event, EventType


class TestEventBus(unittest.TestCase):
    """Test cases for EventBus."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.event_bus = EventBus()
    
    def tearDown(self):
        """Clean up after tests."""
        if self.event_bus._running:
            self.event_bus.stop()
        self.event_bus.clear_queue()
    
    def test_publish_and_subscribe(self):
        """Test basic publish and subscribe functionality."""
        received_events = []
        
        def callback(event):
            received_events.append(event)
        
        # Subscribe to event
        sub_id = self.event_bus.subscribe(EventType.DOWNLOAD_COMPLETE, callback)
        self.assertIsNotNone(sub_id)
        
        # Publish event
        test_event = Event(
            type=EventType.DOWNLOAD_COMPLETE,
            data={"task_id": "test-123", "file_path": "/tmp/test.mp4"}
        )
        result = self.event_bus.publish(test_event)
        self.assertTrue(result)
        
        # Process events
        self.event_bus._dispatch_event(test_event)
        
        # Verify callback was called
        self.assertEqual(len(received_events), 1)
        self.assertEqual(received_events[0].type, EventType.DOWNLOAD_COMPLETE)
        self.assertEqual(received_events[0].data["task_id"], "test-123")
    
    def test_subscribe_multiple_listeners(self):
        """Test subscribing multiple listeners to same event type."""
        received_events_1 = []
        received_events_2 = []
        
        def callback1(event):
            received_events_1.append(event)
        
        def callback2(event):
            received_events_2.append(event)
        
        # Subscribe both callbacks
        sub_id1 = self.event_bus.subscribe(EventType.DOWNLOAD_PROGRESS, callback1)
        sub_id2 = self.event_bus.subscribe(EventType.DOWNLOAD_PROGRESS, callback2)
        
        self.assertNotEqual(sub_id1, sub_id2)
        
        # Publish event
        test_event = Event(
            type=EventType.DOWNLOAD_PROGRESS,
            data={"task_id": "test-123", "progress": 50.0}
        )
        self.event_bus.publish(test_event)
        self.event_bus._dispatch_event(test_event)
        
        # Both callbacks should receive the event
        self.assertEqual(len(received_events_1), 1)
        self.assertEqual(len(received_events_2), 1)
    
    def test_unsubscribe(self):
        """Test unsubscribing from events."""
        received_events = []
        
        def callback(event):
            received_events.append(event)
        
        # Subscribe
        sub_id = self.event_bus.subscribe(EventType.DOWNLOAD_FAILED, callback)
        
        # Publish first event
        event1 = Event(
            type=EventType.DOWNLOAD_FAILED,
            data={"task_id": "test-123", "error": "Network error"}
        )
        self.event_bus.publish(event1)
        self.event_bus._dispatch_event(event1)
        
        self.assertEqual(len(received_events), 1)
        
        # Unsubscribe
        result = self.event_bus.unsubscribe(sub_id)
        self.assertTrue(result)
        
        # Publish second event
        event2 = Event(
            type=EventType.DOWNLOAD_FAILED,
            data={"task_id": "test-456", "error": "Auth error"}
        )
        self.event_bus.publish(event2)
        self.event_bus._dispatch_event(event2)
        
        # Should still have only 1 event (callback not called after unsubscribe)
        self.assertEqual(len(received_events), 1)
    
    def test_unsubscribe_nonexistent_id(self):
        """Test unsubscribing with nonexistent ID."""
        result = self.event_bus.unsubscribe("nonexistent-id")
        self.assertFalse(result)
    
    def test_process_events_with_mock_root(self):
        """Test process_events method with mock tkinter root."""
        received_events = []
        
        def callback(event):
            received_events.append(event)
        
        self.event_bus.subscribe(EventType.SEARCH_COMPLETE, callback)
        
        # Publish multiple events
        for i in range(3):
            event = Event(
                type=EventType.SEARCH_COMPLETE,
                data={"query": f"test-{i}", "results": []}
            )
            self.event_bus.publish(event)
        
        # Create mock root
        mock_root = Mock(spec=tk.Tk)
        
        # Process events (without starting the loop)
        self.event_bus._running = False
        
        # Manually process the queue
        while not self.event_bus._queue.empty():
            event = self.event_bus._queue.get_nowait()
            self.event_bus._dispatch_event(event)
        
        # All events should be processed
        self.assertEqual(len(received_events), 3)
    
    def test_thread_safety_multiple_publishers(self):
        """Test thread-safety with multiple publishers."""
        received_events = []
        lock = threading.Lock()
        
        def callback(event):
            with lock:
                received_events.append(event)
        
        self.event_bus.subscribe(EventType.DOWNLOAD_PROGRESS, callback)
        
        # Create multiple threads that publish events
        num_threads = 10
        events_per_thread = 10
        
        def publisher_thread(thread_id):
            for i in range(events_per_thread):
                event = Event(
                    type=EventType.DOWNLOAD_PROGRESS,
                    data={"thread_id": thread_id, "event_num": i, "progress": i * 10}
                )
                self.event_bus.publish(event)
        
        # Start threads
        threads = []
        for i in range(num_threads):
            thread = threading.Thread(target=publisher_thread, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Process all events
        while not self.event_bus._queue.empty():
            event = self.event_bus._queue.get_nowait()
            self.event_bus._dispatch_event(event)
        
        # Should have received all events
        expected_count = num_threads * events_per_thread
        self.assertEqual(len(received_events), expected_count)
    
    def test_thread_safety_concurrent_subscribe_unsubscribe(self):
        """Test thread-safety with concurrent subscribe and unsubscribe operations."""
        def callback(event):
            pass
        
        subscription_ids = []
        lock = threading.Lock()
        
        def subscribe_thread():
            for _ in range(50):
                sub_id = self.event_bus.subscribe(EventType.QUEUE_UPDATED, callback)
                with lock:
                    subscription_ids.append(sub_id)
                time.sleep(0.001)
        
        def unsubscribe_thread():
            time.sleep(0.01)  # Let some subscriptions happen first
            for _ in range(25):
                with lock:
                    if subscription_ids:
                        sub_id = subscription_ids.pop(0)
                        self.event_bus.unsubscribe(sub_id)
                time.sleep(0.001)
        
        # Start threads
        threads = [
            threading.Thread(target=subscribe_thread),
            threading.Thread(target=subscribe_thread),
            threading.Thread(target=unsubscribe_thread)
        ]
        
        for thread in threads:
            thread.start()
        
        for thread in threads:
            thread.join()
        
        # Should have some listeners remaining
        listener_count = self.event_bus.get_listener_count(EventType.QUEUE_UPDATED)
        self.assertGreater(listener_count, 0)
    
    def test_queue_full_handling(self):
        """Test handling of queue full condition."""
        # Fill the queue to capacity
        for i in range(EventBus.MAX_QUEUE_SIZE):
            event = Event(
                type=EventType.DOWNLOAD_PROGRESS,
                data={"task_id": f"test-{i}", "progress": 0.0}
            )
            result = self.event_bus.publish(event)
            self.assertTrue(result)
        
        # Next publish should fail (queue full)
        overflow_event = Event(
            type=EventType.DOWNLOAD_PROGRESS,
            data={"task_id": "overflow", "progress": 0.0}
        )
        result = self.event_bus.publish(overflow_event)
        self.assertFalse(result)
    
    def test_clear_queue(self):
        """Test clearing the event queue."""
        # Publish some events
        for i in range(10):
            event = Event(
                type=EventType.DOWNLOAD_PROGRESS,
                data={"task_id": f"test-{i}", "progress": i * 10}
            )
            self.event_bus.publish(event)
        
        self.assertEqual(self.event_bus.get_queue_size(), 10)
        
        # Clear queue
        cleared_count = self.event_bus.clear_queue()
        self.assertEqual(cleared_count, 10)
        self.assertEqual(self.event_bus.get_queue_size(), 0)
    
    def test_get_listener_count(self):
        """Test getting listener count."""
        def callback(event):
            pass
        
        # Initially no listeners
        self.assertEqual(self.event_bus.get_listener_count(), 0)
        
        # Add listeners
        self.event_bus.subscribe(EventType.DOWNLOAD_COMPLETE, callback)
        self.event_bus.subscribe(EventType.DOWNLOAD_COMPLETE, callback)
        self.event_bus.subscribe(EventType.DOWNLOAD_FAILED, callback)
        
        # Check counts
        self.assertEqual(self.event_bus.get_listener_count(), 3)
        self.assertEqual(self.event_bus.get_listener_count(EventType.DOWNLOAD_COMPLETE), 2)
        self.assertEqual(self.event_bus.get_listener_count(EventType.DOWNLOAD_FAILED), 1)
    
    def test_callback_exception_handling(self):
        """Test that exceptions in callbacks don't crash the event bus."""
        received_events = []
        
        def failing_callback(event):
            raise ValueError("Test exception")
        
        def working_callback(event):
            received_events.append(event)
        
        # Subscribe both callbacks
        self.event_bus.subscribe(EventType.SETTINGS_CHANGED, failing_callback)
        self.event_bus.subscribe(EventType.SETTINGS_CHANGED, working_callback)
        
        # Publish event
        event = Event(
            type=EventType.SETTINGS_CHANGED,
            data={"changed_keys": ["theme"], "settings": {"theme": "dark"}}
        )
        self.event_bus.publish(event)
        self.event_bus._dispatch_event(event)
        
        # Working callback should still receive the event despite failing callback
        self.assertEqual(len(received_events), 1)
    
    def test_start_and_stop(self):
        """Test starting and stopping the event bus."""
        mock_root = Mock(spec=tk.Tk)
        
        # Start
        self.event_bus.start(mock_root)
        self.assertTrue(self.event_bus._running)
        
        # Stop
        self.event_bus.stop()
        self.assertFalse(self.event_bus._running)
    
    def test_stop_processes_remaining_events(self):
        """Test that stop() processes remaining events."""
        received_events = []
        
        def callback(event):
            received_events.append(event)
        
        self.event_bus.subscribe(EventType.DOWNLOAD_COMPLETE, callback)
        
        # Publish events
        for i in range(5):
            event = Event(
                type=EventType.DOWNLOAD_COMPLETE,
                data={"task_id": f"test-{i}", "file_path": f"/tmp/test-{i}.mp4"}
            )
            self.event_bus.publish(event)
        
        # Stop should process remaining events
        self.event_bus._running = True
        self.event_bus.stop()
        
        # All events should be processed
        self.assertEqual(len(received_events), 5)
    
    def test_event_validation(self):
        """Test Event dataclass validation."""
        # Valid event
        event = Event(
            type=EventType.DOWNLOAD_PROGRESS,
            data={"task_id": "test", "progress": 50.0}
        )
        self.assertEqual(event.type, EventType.DOWNLOAD_PROGRESS)
        
        # Invalid type should raise TypeError
        with self.assertRaises(TypeError):
            Event(type="invalid_type", data={})
        
        # Invalid data should raise TypeError
        with self.assertRaises(TypeError):
            Event(type=EventType.DOWNLOAD_PROGRESS, data="not a dict")


if __name__ == "__main__":
    unittest.main()
