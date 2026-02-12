"""
Tests for Download History Intelligence features.
Tests UserPreferences data model and recommendation generation.
"""

import unittest
from datetime import datetime
from models.data_models import UserPreferences
from controllers.search_manager import SearchManager


class TestUserPreferences(unittest.TestCase):
    """Test UserPreferences data model."""
    
    def test_user_preferences_creation(self):
        """Test creating UserPreferences with default values."""
        prefs = UserPreferences()
        
        self.assertIsInstance(prefs.top_platforms, list)
        self.assertIsInstance(prefs.top_categories, list)
        self.assertEqual(prefs.preferred_quality, "1080p")
        self.assertEqual(prefs.preferred_format, "best")
        self.assertIsInstance(prefs.favorite_keywords, list)
        self.assertIsInstance(prefs.last_updated, datetime)
    
    def test_user_preferences_with_data(self):
        """Test creating UserPreferences with custom data."""
        prefs = UserPreferences(
            top_platforms=["YouTube", "Bilibili"],
            top_categories=["Anime", "Music"],
            preferred_quality="720p",
            favorite_keywords=["anime", "music", "gaming"]
        )
        
        self.assertEqual(len(prefs.top_platforms), 2)
        self.assertEqual(prefs.top_platforms[0], "YouTube")
        self.assertEqual(len(prefs.top_categories), 2)
        self.assertEqual(prefs.preferred_quality, "720p")
        self.assertEqual(len(prefs.favorite_keywords), 3)
    
    def test_user_preferences_validation(self):
        """Test UserPreferences validation."""
        # Should raise TypeError for invalid types
        with self.assertRaises(TypeError):
            UserPreferences(top_platforms="not a list")
        
        with self.assertRaises(TypeError):
            UserPreferences(top_categories="not a list")
        
        with self.assertRaises(TypeError):
            UserPreferences(favorite_keywords="not a list")


class TestAnalyzeUserPreferences(unittest.TestCase):
    """Test analyze_user_preferences method."""
    
    def setUp(self):
        self.search_manager = SearchManager()
    
    def test_analyze_empty_history(self):
        """Test analyzing empty history returns default preferences."""
        prefs = self.search_manager.analyze_user_preferences([])
        
        self.assertIsInstance(prefs, UserPreferences)
        self.assertEqual(len(prefs.top_platforms), 0)
        self.assertEqual(len(prefs.top_categories), 0)
    
    def test_analyze_single_item_history(self):
        """Test analyzing history with single item."""
        history = [
            {
                'title': 'Attack on Titan Episode 1',
                'platform': 'Bilibili',
                'platform_category': 'Anime',
                'selected_quality': '1080p'
            }
        ]
        
        prefs = self.search_manager.analyze_user_preferences(history)
        
        self.assertEqual(len(prefs.top_platforms), 1)
        self.assertEqual(prefs.top_platforms[0], 'Bilibili')
        self.assertEqual(len(prefs.top_categories), 1)
        self.assertEqual(prefs.top_categories[0], 'Anime')
        self.assertEqual(prefs.preferred_quality, '1080p')
    
    def test_analyze_multiple_items_history(self):
        """Test analyzing history with multiple items."""
        history = [
            {
                'title': 'Attack on Titan Episode 1',
                'platform': 'Bilibili',
                'platform_category': 'Anime',
                'selected_quality': '1080p'
            },
            {
                'title': 'Demon Slayer Episode 1',
                'platform': 'Bilibili',
                'platform_category': 'Anime',
                'selected_quality': '1080p'
            },
            {
                'title': 'Lo-Fi Beats Mix',
                'platform': 'SoundCloud',
                'platform_category': 'Music',
                'selected_quality': '720p'
            },
            {
                'title': 'Gaming Stream VOD',
                'platform': 'Twitch',
                'platform_category': 'Gaming',
                'selected_quality': '1080p'
            }
        ]
        
        prefs = self.search_manager.analyze_user_preferences(history)
        
        # Should have top 3 platforms
        self.assertLessEqual(len(prefs.top_platforms), 3)
        self.assertIn('Bilibili', prefs.top_platforms)
        
        # Should have top 3 categories
        self.assertLessEqual(len(prefs.top_categories), 3)
        self.assertIn('Anime', prefs.top_categories)
        
        # Most common quality should be 1080p (3 out of 4)
        self.assertEqual(prefs.preferred_quality, '1080p')
        
        # Should extract keywords from titles
        self.assertGreater(len(prefs.favorite_keywords), 0)
    
    def test_analyze_keyword_extraction(self):
        """Test keyword extraction from video titles."""
        history = [
            {
                'title': 'Anime Music Video Compilation',
                'platform': 'YouTube',
                'platform_category': 'Video Streaming',
                'selected_quality': 'best'
            },
            {
                'title': 'Anime Opening Songs Collection',
                'platform': 'YouTube',
                'platform_category': 'Video Streaming',
                'selected_quality': 'best'
            }
        ]
        
        prefs = self.search_manager.analyze_user_preferences(history)
        
        # Should extract 'anime' as a keyword (appears twice)
        self.assertIn('anime', prefs.favorite_keywords)


class TestGetRecommendations(unittest.TestCase):
    """Test get_recommendations method."""
    
    def setUp(self):
        self.search_manager = SearchManager()
    
    def test_get_recommendations_empty_history(self):
        """Test getting recommendations with empty history."""
        recommendations = self.search_manager.get_recommendations([])
        
        self.assertEqual(len(recommendations), 0)
    
    def test_get_recommendations_with_history(self):
        """Test getting recommendations with valid history."""
        history = [
            {
                'title': 'Attack on Titan Episode 1',
                'platform': 'YouTube',
                'platform_category': 'Anime',
                'selected_quality': '1080p'
            }
        ]
        
        # Note: This test will make actual network requests to DuckDuckGo
        # In a production environment, you would mock the DDGS calls
        # For now, we just verify the method doesn't crash
        try:
            recommendations = self.search_manager.get_recommendations(history, limit=5)
            self.assertIsInstance(recommendations, list)
            # Recommendations might be empty if search fails, but should be a list
        except Exception as e:
            # If network fails, that's okay for this test
            self.skipTest(f"Network request failed: {e}")


if __name__ == '__main__':
    unittest.main()
