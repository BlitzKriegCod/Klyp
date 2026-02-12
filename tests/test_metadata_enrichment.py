"""
Tests for metadata enrichment functionality.
"""

import unittest
from unittest.mock import MagicMock, patch
from controllers.search_manager import SearchManager


class TestMetadataEnrichment(unittest.TestCase):
    """Test metadata enrichment features."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.search_manager = SearchManager()
    
    def test_enrich_result_with_mock_data(self):
        """Test enriching a single result with mocked yt-dlp data."""
        # Create a sample result
        result = {
            'url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'title': 'Test Video',
            'platform': 'YouTube'
        }
        
        # Mock yt-dlp extract_info
        mock_info = {
            'view_count': 1234567,
            'like_count': 45678,
            'upload_date': '20240115',
            'description': 'This is a test video description that is longer than 200 characters. ' * 5,
            'tags': ['test', 'video', 'sample', 'demo', 'example', 'extra'],
            'formats': [
                {'height': 2160},
                {'height': 1080},
                {'height': 720},
                {'height': 480}
            ]
        }
        
        with patch('yt_dlp.YoutubeDL') as mock_ydl_class:
            mock_ydl = MagicMock()
            mock_ydl.__enter__ = MagicMock(return_value=mock_ydl)
            mock_ydl.__exit__ = MagicMock(return_value=False)
            mock_ydl.extract_info = MagicMock(return_value=mock_info)
            mock_ydl_class.return_value = mock_ydl
            
            # Enrich the result
            enriched = self.search_manager.enrich_result(result)
            
            # Verify enrichment
            self.assertEqual(enriched['view_count'], 1234567)
            self.assertEqual(enriched['like_count'], 45678)
            self.assertEqual(enriched['upload_date'], '20240115')
            self.assertEqual(len(enriched['description']), 200)  # Truncated to 200 chars
            self.assertEqual(len(enriched['tags']), 5)  # Limited to 5 tags
            self.assertIn('2160', enriched['available_qualities'])
            self.assertIn('1080', enriched['available_qualities'])
            self.assertFalse(enriched['enrichment_failed'])
    
    def test_enrich_result_handles_failure(self):
        """Test that enrichment handles failures gracefully."""
        result = {
            'url': 'https://invalid-url.com/video',
            'title': 'Invalid Video'
        }
        
        with patch('yt_dlp.YoutubeDL') as mock_ydl_class:
            mock_ydl = MagicMock()
            mock_ydl.__enter__ = MagicMock(return_value=mock_ydl)
            mock_ydl.__exit__ = MagicMock(return_value=False)
            mock_ydl.extract_info = MagicMock(side_effect=Exception("Extraction failed"))
            mock_ydl_class.return_value = mock_ydl
            
            # Enrich the result
            enriched = self.search_manager.enrich_result(result)
            
            # Verify failure handling
            self.assertTrue(enriched['enrichment_failed'])
            self.assertEqual(enriched['view_count'], 0)
            self.assertEqual(enriched['like_count'], 0)
            self.assertEqual(enriched['description'], '')
            self.assertEqual(enriched['tags'], [])
            self.assertEqual(enriched['available_qualities'], [])
    
    def test_enrich_results_batch(self):
        """Test batch enrichment of multiple results."""
        results = [
            {'url': f'https://example.com/video{i}', 'title': f'Video {i}'}
            for i in range(3)
        ]
        
        mock_info = {
            'view_count': 1000,
            'like_count': 100,
            'upload_date': '20240101',
            'description': 'Test description',
            'tags': ['test'],
            'formats': [{'height': 1080}]
        }
        
        with patch('yt_dlp.YoutubeDL') as mock_ydl_class:
            mock_ydl = MagicMock()
            mock_ydl.__enter__ = MagicMock(return_value=mock_ydl)
            mock_ydl.__exit__ = MagicMock(return_value=False)
            mock_ydl.extract_info = MagicMock(return_value=mock_info)
            mock_ydl_class.return_value = mock_ydl
            
            # Enrich batch
            enriched_results = self.search_manager.enrich_results_batch(results, max_workers=2)
            
            # Verify all results were enriched
            self.assertEqual(len(enriched_results), 3)
            for result in enriched_results:
                self.assertEqual(result['view_count'], 1000)
                self.assertFalse(result['enrichment_failed'])
    
    def test_enrich_result_missing_url(self):
        """Test enrichment with missing URL."""
        result = {'title': 'No URL Video'}
        
        enriched = self.search_manager.enrich_result(result)
        
        self.assertTrue(enriched['enrichment_failed'])


if __name__ == '__main__':
    unittest.main()
