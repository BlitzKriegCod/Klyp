
import unittest
from unittest.mock import MagicMock, patch
from controllers.search_manager import SearchManager

class TestSearchManager(unittest.TestCase):
    
    def setUp(self):
        self.search_manager = SearchManager()
    
    @patch('requests.Session.post')
    def test_search_success(self, mock_post):
        # Mock successful DDG response
        mock_response = MagicMock()
        mock_response.status_code = 200
        # Minimal HTML simulation of DDG results
        mock_response.text = """
        <html>
            <body>
                <div class="result">
                    <a class="result__a" href="https://ok.ru/video/12345">Test Video 1</a>
                </div>
                <div class="result">
                    <a class="result__a" href="/l/?kh=-1&uddg=https%3A%2F%2Fok.ru%2Fvideo%2F67890">Test Video 2</a>
                </div>
                <div class="result">
                    <a class="result__a" href="https://example.com/other">Irrelevant Link</a>
                </div>
            </body>
        </html>
        """
        mock_post.return_value = mock_response
        
        results = self.search_manager.search("test query")
        
        self.assertEqual(len(results), 2)
        
        # Check first result
        self.assertEqual(results[0]['id'], "12345")
        self.assertEqual(results[0]['url'], "https://ok.ru/video/12345")
        self.assertEqual(results[0]['title'], "Test Video 1")
        
        # Check second result (decoded from uddg)
        self.assertEqual(results[1]['id'], "67890")
        self.assertEqual(results[1]['url'], "https://ok.ru/video/67890")
        self.assertEqual(results[1]['title'], "Test Video 2")

    @patch('requests.Session.post')
    def test_search_failure(self, mock_post):
        # Mock failed request
        mock_post.side_effect = Exception("Connection error")
        
        results = self.search_manager.search("fail query")
        self.assertEqual(results, [])

    @patch('requests.Session.post')
    def test_search_empty_query(self, mock_post):
        results = self.search_manager.search("")
        self.assertEqual(results, [])
        mock_post.assert_not_called()

if __name__ == '__main__':
    unittest.main()
