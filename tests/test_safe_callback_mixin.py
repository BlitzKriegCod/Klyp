"""
Unit tests for SafeCallbackMixin.
Tests safe_after with destroyed widgets, cleanup_callbacks, and TclError handling.
"""

import unittest
import tkinter as tk
from tkinter import ttk
import time
from utils.safe_callback_mixin import SafeCallbackMixin


class TestWidget(SafeCallbackMixin, ttk.Frame):
    """Test widget that uses SafeCallbackMixin."""
    
    def __init__(self, parent):
        ttk.Frame.__init__(self, parent)
        SafeCallbackMixin.__init__(self)
        self.callback_executed = []
    
    def test_callback(self, value):
        """Test callback that records execution."""
        self.callback_executed.append(value)


class TestSafeCallbackMixin(unittest.TestCase):
    """Test cases for SafeCallbackMixin."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.root = tk.Tk()
        self.root.withdraw()  # Hide window during tests
        self.widget = TestWidget(self.root)
    
    def tearDown(self):
        """Clean up after tests."""
        try:
            if self.widget and not self.widget.is_destroyed():
                self.widget.cleanup_callbacks()
            if self.root:
                self.root.destroy()
        except tk.TclError:
            pass
    
    def test_safe_after_executes_callback(self):
        """Test that safe_after executes callback."""
        callback_executed = []
        
        def callback():
            callback_executed.append(True)
        
        # Schedule callback
        callback_id = self.widget.safe_after(100, callback)
        self.assertIsNotNone(callback_id)
        self.assertNotEqual(callback_id, "")
        
        # Wait for callback to execute
        self.root.update()
        time.sleep(0.15)
        self.root.update()
        
        # Callback should have executed
        self.assertEqual(len(callback_executed), 1)
    
    def test_safe_after_with_args(self):
        """Test safe_after with arguments."""
        # Schedule callback with args
        callback_id = self.widget.safe_after(100, self.widget.test_callback, "test_value")
        self.assertIsNotNone(callback_id)
        
        # Wait for callback
        self.root.update()
        time.sleep(0.15)
        self.root.update()
        
        # Callback should have executed with correct args
        self.assertEqual(len(self.widget.callback_executed), 1)
        self.assertEqual(self.widget.callback_executed[0], "test_value")
    
    def test_safe_after_idle_executes_callback(self):
        """Test that safe_after_idle executes callback."""
        callback_executed = []
        
        def callback():
            callback_executed.append(True)
        
        # Schedule idle callback
        callback_id = self.widget.safe_after_idle(callback)
        self.assertIsNotNone(callback_id)
        self.assertNotEqual(callback_id, "")
        
        # Process idle events
        self.root.update_idletasks()
        self.root.update()
        
        # Callback should have executed
        self.assertEqual(len(callback_executed), 1)
    
    def test_safe_after_idle_with_args(self):
        """Test safe_after_idle with arguments."""
        # Schedule idle callback with args
        callback_id = self.widget.safe_after_idle(self.widget.test_callback, "idle_value")
        self.assertIsNotNone(callback_id)
        
        # Process idle events
        self.root.update_idletasks()
        self.root.update()
        
        # Callback should have executed with correct args
        self.assertEqual(len(self.widget.callback_executed), 1)
        self.assertEqual(self.widget.callback_executed[0], "idle_value")
    
    def test_safe_after_with_destroyed_widget(self):
        """Test safe_after with destroyed widget doesn't crash."""
        # Destroy widget
        self.widget.cleanup_callbacks()
        
        # Try to schedule callback on destroyed widget
        callback_id = self.widget.safe_after(100, lambda: None)
        
        # Should return empty string
        self.assertEqual(callback_id, "")
    
    def test_safe_after_idle_with_destroyed_widget(self):
        """Test safe_after_idle with destroyed widget doesn't crash."""
        # Destroy widget
        self.widget.cleanup_callbacks()
        
        # Try to schedule idle callback on destroyed widget
        callback_id = self.widget.safe_after_idle(lambda: None)
        
        # Should return empty string
        self.assertEqual(callback_id, "")
    
    def test_cleanup_callbacks_cancels_pending(self):
        """Test that cleanup_callbacks cancels pending callbacks."""
        callback_executed = []
        
        def callback():
            callback_executed.append(True)
        
        # Schedule multiple callbacks
        for i in range(5):
            self.widget.safe_after(1000, callback)  # Long delay
        
        # Cleanup before they execute
        self.widget.cleanup_callbacks()
        
        # Wait to ensure callbacks would have executed
        time.sleep(1.5)
        self.root.update()
        
        # No callbacks should have executed
        self.assertEqual(len(callback_executed), 0)
    
    def test_cleanup_callbacks_marks_destroyed(self):
        """Test that cleanup_callbacks marks widget as destroyed."""
        self.assertFalse(self.widget.is_destroyed())
        
        self.widget.cleanup_callbacks()
        
        self.assertTrue(self.widget.is_destroyed())
    
    def test_cleanup_callbacks_clears_callback_list(self):
        """Test that cleanup_callbacks clears the callback list."""
        # Schedule some callbacks
        for i in range(3):
            self.widget.safe_after(1000, lambda: None)
        
        # Should have 3 pending callbacks
        self.assertEqual(self.widget.get_pending_callback_count(), 3)
        
        # Cleanup
        self.widget.cleanup_callbacks()
        
        # Should have 0 pending callbacks
        self.assertEqual(self.widget.get_pending_callback_count(), 0)
    
    def test_tcl_error_handling(self):
        """Test that TclError is caught when widget is destroyed."""
        callback_executed = []
        
        def callback():
            # Try to access widget that might be destroyed
            try:
                self.widget.winfo_exists()
            except tk.TclError:
                pass
            callback_executed.append(True)
        
        # Schedule callback
        self.widget.safe_after(100, callback)
        
        # Destroy widget before callback executes
        self.widget.destroy()
        
        # Wait for callback time
        time.sleep(0.15)
        try:
            self.root.update()
        except tk.TclError:
            pass
        
        # Should not crash (TclError should be caught)
        # Note: callback might not execute if widget is destroyed
    
    def test_exception_in_callback_is_caught(self):
        """Test that exceptions in callbacks are caught and logged."""
        def failing_callback():
            raise ValueError("Test exception")
        
        # Schedule failing callback
        self.widget.safe_after(100, failing_callback)
        
        # Wait for callback
        self.root.update()
        time.sleep(0.15)
        self.root.update()
        
        # Should not crash (exception should be caught)
        # Widget should still be functional
        self.assertFalse(self.widget.is_destroyed())
    
    def test_multiple_callbacks_tracked(self):
        """Test that multiple callbacks are tracked."""
        # Schedule multiple callbacks
        for i in range(10):
            self.widget.safe_after(1000, lambda: None)
        
        # Should have 10 pending callbacks
        self.assertEqual(self.widget.get_pending_callback_count(), 10)
    
    def test_destroy_calls_cleanup(self):
        """Test that destroy() calls cleanup_callbacks()."""
        # Schedule callbacks
        for i in range(3):
            self.widget.safe_after(1000, lambda: None)
        
        self.assertEqual(self.widget.get_pending_callback_count(), 3)
        
        # Destroy widget
        self.widget.destroy()
        
        # Should be marked as destroyed
        self.assertTrue(self.widget.is_destroyed())
        
        # Callbacks should be cleaned up
        self.assertEqual(self.widget.get_pending_callback_count(), 0)
    
    def test_callback_not_executed_after_cleanup(self):
        """Test that callbacks don't execute after cleanup."""
        callback_executed = []
        
        def callback():
            callback_executed.append(True)
        
        # Schedule callback
        self.widget.safe_after(100, callback)
        
        # Cleanup immediately
        self.widget.cleanup_callbacks()
        
        # Wait for callback time
        time.sleep(0.15)
        self.root.update()
        
        # Callback should not have executed
        self.assertEqual(len(callback_executed), 0)
    
    def test_safe_after_returns_different_ids(self):
        """Test that safe_after returns different callback IDs."""
        callback_ids = []
        
        for i in range(5):
            callback_id = self.widget.safe_after(1000, lambda: None)
            callback_ids.append(callback_id)
        
        # All IDs should be different
        self.assertEqual(len(callback_ids), len(set(callback_ids)))
    
    def test_safe_after_idle_returns_different_ids(self):
        """Test that safe_after_idle returns different callback IDs."""
        callback_ids = []
        
        for i in range(5):
            callback_id = self.widget.safe_after_idle(lambda: None)
            callback_ids.append(callback_id)
        
        # All IDs should be different
        self.assertEqual(len(callback_ids), len(set(callback_ids)))
    
    def test_get_pending_callback_count(self):
        """Test get_pending_callback_count method."""
        # Initially should be 0
        self.assertEqual(self.widget.get_pending_callback_count(), 0)
        
        # Add some callbacks
        self.widget.safe_after(1000, lambda: None)
        self.assertEqual(self.widget.get_pending_callback_count(), 1)
        
        self.widget.safe_after(1000, lambda: None)
        self.assertEqual(self.widget.get_pending_callback_count(), 2)
        
        self.widget.safe_after_idle(lambda: None)
        self.assertEqual(self.widget.get_pending_callback_count(), 3)
    
    def test_is_destroyed_initial_state(self):
        """Test is_destroyed returns False initially."""
        self.assertFalse(self.widget.is_destroyed())
    
    def test_is_destroyed_after_cleanup(self):
        """Test is_destroyed returns True after cleanup."""
        self.widget.cleanup_callbacks()
        self.assertTrue(self.widget.is_destroyed())
    
    def test_is_destroyed_after_destroy(self):
        """Test is_destroyed returns True after destroy."""
        self.widget.destroy()
        self.assertTrue(self.widget.is_destroyed())
    
    def test_callback_with_kwargs(self):
        """Test safe_after with keyword arguments."""
        callback_executed = []
        
        def callback(value, name="default"):
            callback_executed.append((value, name))
        
        # Schedule callback with kwargs
        self.widget.safe_after(100, callback, 42, name="test")
        
        # Wait for callback
        self.root.update()
        time.sleep(0.15)
        self.root.update()
        
        # Callback should have executed with correct args
        self.assertEqual(len(callback_executed), 1)
        self.assertEqual(callback_executed[0], (42, "test"))
    
    def test_cleanup_idempotent(self):
        """Test that cleanup_callbacks can be called multiple times."""
        # Schedule callbacks
        for i in range(3):
            self.widget.safe_after(1000, lambda: None)
        
        # First cleanup
        self.widget.cleanup_callbacks()
        self.assertEqual(self.widget.get_pending_callback_count(), 0)
        
        # Second cleanup should not fail
        self.widget.cleanup_callbacks()
        self.assertEqual(self.widget.get_pending_callback_count(), 0)
    
    def test_mixed_after_and_after_idle(self):
        """Test mixing safe_after and safe_after_idle."""
        callback_executed = []
        
        def callback(value):
            callback_executed.append(value)
        
        # Schedule mixed callbacks
        self.widget.safe_after(100, callback, "after_1")
        self.widget.safe_after_idle(callback, "idle_1")
        self.widget.safe_after(150, callback, "after_2")
        self.widget.safe_after_idle(callback, "idle_2")
        
        # Should have 4 pending callbacks
        self.assertEqual(self.widget.get_pending_callback_count(), 4)
        
        # Process events
        self.root.update_idletasks()
        self.root.update()
        time.sleep(0.2)
        self.root.update()
        
        # All callbacks should have executed
        self.assertEqual(len(callback_executed), 4)


if __name__ == "__main__":
    unittest.main()
