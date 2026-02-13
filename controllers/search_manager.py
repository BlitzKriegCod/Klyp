"""
Search Manager for Klyp Video Downloader.
Handles video search using DuckDuckGo.
"""

import logging
import warnings
from datetime import datetime
import functools
import time

# Suppress the duckduckgo_search rename warning globally for this module
warnings.filterwarnings("ignore", category=RuntimeWarning, message=".*duckduckgo_search.*")

from duckduckgo_search import DDGS
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

from utils.thread_pool_manager import ThreadPoolManager
from utils.event_bus import EventBus, Event, EventType
from utils.exceptions import SearchException, NetworkException, ExtractionException

# Platform Categories with visual indicators
PLATFORM_CATEGORIES = {
    "Video Streaming": {
        "platforms": ["YouTube", "Vimeo", "Dailymotion", "Rumble", "OK.ru"],
        "icon": "🎬",
        "color": "#ef4444",
        "test_url": "https://youtube.com/watch?v=dQw4w9WgXcQ"
    },
    "Anime": {
        "platforms": ["Bilibili", "Niconico", "HiDive", "iQiyi", "Youku", "AnimeFLV*", "JKAnime*"],
        "icon": "🎌",
        "color": "#f97316",
        "test_url": "https://bilibili.com/video/BV1xx411c7mD"
    },
    "Music": {
        "platforms": ["SoundCloud", "Bandcamp", "Audiomack", "Mixcloud"],
        "icon": "🎵",
        "color": "#8b5cf6",
        "test_url": None
    },
    "Social Media": {
        "platforms": ["TikTok", "Instagram", "Twitter", "Reddit"],
        "icon": "📱",
        "color": "#06b6d4",
        "test_url": None
    },
    "Gaming": {
        "platforms": ["Twitch", "YouTube Gaming", "Facebook Gaming"],
        "icon": "🎮",
        "color": "#a855f7",
        "test_url": None
    },
    "Podcasts": {
        "platforms": ["Apple Podcasts", "Spotify", "SoundCloud"],
        "icon": "🎙️",
        "color": "#10b981",
        "test_url": None
    }
}

# Anime platform definitions (kept for backward compatibility)
ANIME_PLATFORMS = {
    'bilibili.com': 'Bilibili',
    'nicovideo.jp': 'Niconico',
    'nico.ms': 'Niconico',
    'hidive.com': 'HiDive',
    'iqiyi.com': 'iQiyi',
    'youku.com': 'Youku',
    # Experimental (no official yt-dlp support)
    'animeflv.net': 'AnimeFLV*',
    'jkanime.net': 'JKAnime*'
}

# Content presets for quick searches
CONTENT_PRESETS = {
    'Anime': {
        'sites': ['bilibili.com', 'nicovideo.jp', 'hidive.com'],
        'keywords': ['anime', 'episode'],
        'icon': '🎌'
    },
    'Music': {
        'sites': ['soundcloud.com', 'bandcamp.com', 'audiomack.com'],
        'keywords': ['official', 'audio'],
        'icon': '🎵'
    },
    'Gaming': {
        'sites': ['twitch.tv', 'youtube.com'],
        'keywords': ['gameplay', 'stream', 'vod'],
        'icon': '🎮'
    },
    'Podcasts': {
        'sites': ['soundcloud.com', 'mixcloud.com'],
        'keywords': ['podcast', 'episode'],
        'icon': '🎙️'
    },
    'Social': {
        'sites': ['tiktok.com', 'instagram.com', 'twitter.com', 'reddit.com'],
        'keywords': [],
        'icon': '📱'
    },
    'Education': {
        'sites': ['ted.com', 'youtube.com'],
        'keywords': ['lecture', 'tutorial', 'course'],
        'icon': '📚'
    }
}

# Quality filters for pre-filtering search results
QUALITY_FILTERS = {
    "Any": None,
    "4K (2160p)": "2160",
    "Full HD (1080p)": "1080",
    "HD (720p)": "720",
    "SD (480p)": "480"
}

# Format filters for pre-filtering search results
FORMAT_FILTERS = {
    "Any": None,
    "Video + Audio": "best",
    "Video Only": "bestvideo",
    "Audio Only": "bestaudio"
}

# Search operators for advanced queries
SEARCH_OPERATORS = {
    "exact_phrase": '"{query}"',
    "exclude": "-{term}",
    "or_logic": "{term1} OR {term2}",
    "site": "site:{domain}",
    "filetype": "filetype:{ext}",
    "intitle": "intitle:{term}",
    "inurl": "inurl:{term}"
}

class SearchManager:
    """Manages video searches using DuckDuckGo."""
    
    def __init__(self):
        self.logger = logging.getLogger("Klyp.SearchManager")
        self.ddgs = DDGS()
        self.series_keywords = ['season', 'episode', 'ep', 'part', 'vol', 'volume', 'chapter']
        self.platform_health_cache = {}  # Cache for platform health status with TTL tracking
        self.trending_cache = {}  # Cache for trending results with 15-minute TTL
        self.cache_ttl = 3600  # 1 hour cache TTL in seconds
        self.trending_cache_ttl = 900  # 15 minutes in seconds
        
        # Get ThreadPoolManager and EventBus instances
        self._thread_pool_manager = ThreadPoolManager()
        self._event_bus = EventBus()
        
        self.logger.info("SearchManager initialized")
    
    def search(self, 
               query: str, 
               limit: int = 50,
               region: str = "wt-wt",
               timelimit: Optional[str] = None,
               duration: Optional[str] = None,
               site: Optional[str] = None,
               content_type: str = "All") -> List[Dict[str, Any]]:
        """
        Search for videos using DuckDuckGo.
        
        Args:
            query: Search query string.
            limit: Maximum number of results to return.
            region: Region code (e.g. 'wt-wt', 'us-en', 'ru-ru').
            timelimit: Time limit ('d', 'w', 'm').
            duration: Video duration ('short', 'medium', 'long').
            site: Optional domain to restrict search to (e.g. 'youtube.com').
            content_type: Content filter ('All', 'Anime', 'General').
            
        Returns:
            List of dictionaries containing video metadata.
        """
        if not query:
            return []
            
        try:
            # Handle anime-specific search
            if content_type == "Anime":
                results = self._search_anime(query, limit, region, timelimit, duration)
                # Publish search complete event
                self._event_bus.publish(Event(
                    type=EventType.SEARCH_COMPLETE,
                    data={
                        "query": query,
                        "results": results,
                        "result_count": len(results),
                        "content_type": content_type
                    }
                ))
                return results
            
            # Append site operator if domain is specified
            search_query = query
            if site and site.lower() != "all":
                search_query = f"{query} site:{site}"
                
            # Perform video search
            results = []
            ddgs_gen = self.ddgs.videos(
                keywords=search_query,
                region=region,
                safesearch="off",
                timelimit=timelimit,
                duration=duration,
                max_results=limit
            )
            
            for r in ddgs_gen:
                # Extract relevant fields
                url = r.get("content", "")
                if not url:
                    continue
                
                platform_info = self._detect_platform(url)
                video_data = {
                    "id": self._extract_id(url),
                    "url": url,
                    "title": r.get("title", "Unknown"),
                    "duration": r.get("duration", "Unknown"),
                    "author": r.get("uploader", "Unknown"),
                    "thumbnail": r.get("images", {}).get("large", ""),
                    "platform": platform_info["name"],
                    "platform_icon": platform_info["icon"],
                    "platform_color": platform_info["color"],
                    "platform_category": platform_info["category_name"]
                }
                results.append(video_data)
            
            # Publish search complete event
            self._event_bus.publish(Event(
                type=EventType.SEARCH_COMPLETE,
                data={
                    "query": query,
                    "results": results,
                    "result_count": len(results),
                    "content_type": content_type
                }
            ))
            
            return results
            
        except Exception as e:
            # Log with structured context
            self.logger.log_exception_structured(
                exception=e,
                context={
                    "query": query,
                    "content_type": content_type,
                    "operation": "search"
                },
                message=f"Search failed for query: {query}"
            )
            
            # Classify the error type
            error_msg = str(e).lower()
            error_type = "unknown"
            
            # Network errors
            if any(keyword in error_msg for keyword in [
                'network', 'connection', 'timeout', 'unreachable', 'dns', 'ssl'
            ]):
                error_type = "network"
            # API errors
            elif any(keyword in error_msg for keyword in [
                'api', 'rate limit', 'quota', 'forbidden', '403', '429'
            ]):
                error_type = "api"
            # Parsing errors
            elif any(keyword in error_msg for keyword in [
                'parse', 'json', 'decode', 'invalid response'
            ]):
                error_type = "parsing"
            
            # Publish search failed event with error classification
            self._event_bus.publish(Event(
                type=EventType.SEARCH_FAILED,
                data={
                    "query": query,
                    "error": str(e),
                    "error_type": error_type,
                    "content_type": content_type
                }
            ))
            return []
    
    def search_preset(self, preset_name: str, query: str, limit: int = 50, 
                     region: str = "wt-wt") -> List[Dict[str, Any]]:
        """
        Search using a content preset.
        
        Args:
            preset_name: Name of preset ('Anime', 'Music', etc.).
            query: Search query.
            limit: Max results.
            region: Region code.
            
        Returns:
            Search results from preset platforms.
        """
        preset = CONTENT_PRESETS.get(preset_name)
        if not preset:
            self.logger.warning(f"Unknown preset: {preset_name}")
            return self.search(query, limit=limit, region=region)
        
        # Enhance query with preset keywords
        enhanced_query = query
        if preset['keywords']:
            keyword_str = ' OR '.join(preset['keywords'])
            enhanced_query = f"{query} ({keyword_str})"
        
        # Search across preset sites
        all_results = []
        results_per_site = max(limit // len(preset['sites']), 5)
        
        for site in preset['sites']:
            site_query = f"{enhanced_query} site:{site}"
            try:
                ddgs_gen = self.ddgs.videos(
                    keywords=site_query,
                    region=region,
                    safesearch="off",
                    max_results=results_per_site
                )
                
                for r in ddgs_gen:
                    url = r.get("content", "")
                    if not url:
                        continue
                    
                    platform_info = self._detect_platform(url)
                    video_data = {
                        "id": self._extract_id(url),
                        "url": url,
                        "title": r.get("title", "Unknown"),
                        "duration": r.get("duration", "Unknown"),
                        "author": r.get("uploader", "Unknown"),
                        "thumbnail": r.get("images", {}).get("large", ""),
                        "platform": platform_info["name"],
                        "platform_icon": platform_info["icon"],
                        "platform_color": platform_info["color"],
                        "platform_category": platform_info["category_name"],
                        "preset": preset_name
                    }
                    all_results.append(video_data)
            except Exception as e:
                self.logger.warning(f"Failed to search {site}: {e}")
                continue
        
        return all_results[:limit]
    
    def _search_anime(self, query: str, limit: int, region: str, 
                     timelimit: Optional[str], duration: Optional[str]) -> List[Dict[str, Any]]:
        """
        Perform anime-specific search across supported platforms.
        
        Args:
            query: Search query.
            limit: Max results.
            region: Region code.
            timelimit: Time limit.
            duration: Duration filter.
            
        Returns:
            Combined results from anime platforms.
        """
        anime_sites = ['bilibili.com', 'nicovideo.jp', 'hidive.com']
        all_results = []
        results_per_site = max(limit // len(anime_sites), 10)
        
        for site in anime_sites:
            site_query = f"{query} site:{site}"
            try:
                ddgs_gen = self.ddgs.videos(
                    keywords=site_query,
                    region=region,
                    safesearch="off",
                    timelimit=timelimit,
                    duration=duration,
                    max_results=results_per_site
                )
                
                for r in ddgs_gen:
                    url = r.get("content", "")
                    if not url:
                        continue
                    
                    platform_info = self._detect_platform(url)
                    video_data = {
                        "id": self._extract_id(url),
                        "url": url,
                        "title": r.get("title", "Unknown"),
                        "duration": r.get("duration", "Unknown"),
                        "author": r.get("uploader", "Unknown"),
                        "thumbnail": r.get("images", {}).get("large", ""),
                        "platform": platform_info["name"],
                        "platform_icon": platform_info["icon"],
                        "platform_color": platform_info["color"],
                        "platform_category": platform_info["category_name"]
                    }
                    all_results.append(video_data)
            except Exception as e:
                self.logger.warning(f"Failed to search {site}: {e}")
                continue
        
        return all_results[:limit]
            
    def _detect_platform(self, url: str) -> Dict[str, Any]:
        """
        Detect video platform from URL and return platform info with category.
        
        Args:
            url: Video URL.
            
        Returns:
            Dictionary with platform name, icon, color, and category_name.
        """
        url_lower = url.lower()
        platform_name = "Other"
        
        # Check anime platforms first
        for domain, platform in ANIME_PLATFORMS.items():
            if domain in url_lower:
                platform_name = platform
                break
        
        # Check general platforms if not found in anime platforms
        if platform_name == "Other":
            if 'youtube.com' in url_lower or 'youtu.be' in url_lower:
                platform_name = 'YouTube'
            elif 'vimeo.com' in url_lower:
                platform_name = 'Vimeo'
            elif 'dailymotion.com' in url_lower:
                platform_name = 'Dailymotion'
            elif 'ok.ru' in url_lower:
                platform_name = 'OK.ru'
            elif 'soundcloud.com' in url_lower:
                platform_name = 'SoundCloud'
            elif 'bandcamp.com' in url_lower:
                platform_name = 'Bandcamp'
            elif 'tiktok.com' in url_lower:
                platform_name = 'TikTok'
            elif 'instagram.com' in url_lower:
                platform_name = 'Instagram'
            elif 'twitter.com' in url_lower or 'x.com' in url_lower:
                platform_name = 'Twitter'
            elif 'reddit.com' in url_lower:
                platform_name = 'Reddit'
            elif 'twitch.tv' in url_lower:
                platform_name = 'Twitch'
            elif 'rumble.com' in url_lower:
                platform_name = 'Rumble'
        
        # Get category information for the platform
        category_info = self.get_platform_category(platform_name)
        
        return {
            "name": platform_name,
            "icon": category_info["icon"],
            "color": category_info["color"],
            "category_name": category_info["category_name"]
        }

    def _extract_id(self, url: str) -> str:
        """Extract video ID from URL or generate a unique hash if not possible."""
        if not url:
            return ""
            
        # Try OK.ru format
        import re
        ok_match = re.search(r'ok\.ru/video/(\d+)', url)
        if ok_match:
            return ok_match.group(1)
            
        # Try YouTube format
        yt_match = re.search(r'(?:v=|\/)([0-9A-Za-z_-]{11}).*', url)
        if yt_match:
            return yt_match.group(1)
            
        # Generic fallback: hash the URL
        import hashlib
        return hashlib.md5(url.encode()).hexdigest()[:12]
    
    @functools.lru_cache(maxsize=128)
    def get_platform_category(self, platform_name: str) -> Dict[str, Any]:
        """
        Get category information for a given platform name.
        Uses LRU cache for fast repeated lookups.
        
        Args:
            platform_name: Name of the platform (e.g., 'YouTube', 'Bilibili').
            
        Returns:
            Dictionary with icon, color, and category_name.
            Returns default category if platform not found.
        """
        # Search through all categories to find the platform
        for category_name, category_info in PLATFORM_CATEGORIES.items():
            if platform_name in category_info["platforms"]:
                return {
                    "icon": category_info["icon"],
                    "color": category_info["color"],
                    "category_name": category_name
                }
        
        # Default category for unknown platforms
        return {
            "icon": "🌐",
            "color": "#6b7280",
            "category_name": "Other"
        }
    
    def detect_series(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Detect if query is for episodic content.
        
        Args:
            query: Search query string.
            
        Returns:
            Dictionary with series detection info or None if not detected.
            Contains: 'is_series', 'base_query', 'episode_number', 'detected_keyword'
        """
        import re
        
        query_lower = query.lower()
        
        # Try to extract episode number first
        episode_number = None
        detected_keyword = None
        
        # Pattern 1: "S01E01", "Season 1 Episode 1" (check this first)
        season_ep_pattern = r's(?:eason)?\s*(\d+)\s*e(?:pisode)?\s*(\d+)'
        match = re.search(season_ep_pattern, query_lower)
        if match:
            episode_number = int(match.group(2))
            detected_keyword = 'season'
        
        # Pattern 2: "EP01", "EP 01", "Episode 01", etc.
        if not detected_keyword:
            ep_pattern = r'(?:ep|episode|part|vol|volume|chapter)\s*(\d+)'
            match = re.search(ep_pattern, query_lower)
            if match:
                episode_number = int(match.group(1))
                # Find which keyword was used
                for keyword in self.series_keywords:
                    if keyword in query_lower:
                        detected_keyword = keyword
                        break
        
        # Check for series keywords if no pattern matched
        if not detected_keyword:
            for keyword in self.series_keywords:
                if keyword in query_lower:
                    detected_keyword = keyword
                    break
        
        if not detected_keyword:
            return None
        
        # Extract base query by removing episode indicators
        base_query = query
        
        # Remove episode patterns
        base_query = re.sub(r'(?:ep|episode|part|vol|volume|chapter)\s*\d+', '', base_query, flags=re.IGNORECASE)
        base_query = re.sub(r's(?:eason)?\s*\d+\s*e(?:pisode)?\s*\d+', '', base_query, flags=re.IGNORECASE)
        base_query = re.sub(r'\b(?:season|episode|ep|part|vol|volume|chapter)\b', '', base_query, flags=re.IGNORECASE)
        
        # Clean up extra spaces
        base_query = ' '.join(base_query.split()).strip()
        
        if not base_query:
            base_query = query  # Fallback to original if cleaning removed everything
        
        return {
            'is_series': True,
            'base_query': base_query,
            'episode_number': episode_number,
            'detected_keyword': detected_keyword
        }
    
    def find_all_episodes(self, base_query: str, max_episodes: int = 24, 
                         region: str = "wt-wt", site: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Find all episodes of a series using pattern matching.
        
        Args:
            base_query: Base search query without episode numbers.
            max_episodes: Maximum number of episodes to search for (default: 24).
            region: Region code for search.
            site: Optional site to restrict search to.
            
        Returns:
            List of episode results with metadata.
            Stops searching when no results found for 3 consecutive episodes.
        """
        all_episodes = []
        consecutive_failures = 0
        max_consecutive_failures = 3
        
        for ep_num in range(1, max_episodes + 1):
            # Try multiple episode number formats
            episode_queries = [
                f"{base_query} EP{ep_num:02d}",  # EP01, EP02, etc.
                f"{base_query} Episode {ep_num}",  # Episode 1, Episode 2, etc.
                f"{base_query} E{ep_num:02d}",  # E01, E02, etc.
            ]
            
            episode_found = False
            
            for ep_query in episode_queries:
                try:
                    # Search with limit of 5 results per episode query
                    search_query = ep_query
                    if site and site.lower() != "all":
                        search_query = f"{ep_query} site:{site}"
                    
                    results = []
                    ddgs_gen = self.ddgs.videos(
                        keywords=search_query,
                        region=region,
                        safesearch="off",
                        max_results=5
                    )
                    
                    for r in ddgs_gen:
                        url = r.get("content", "")
                        if not url:
                            continue
                        
                        platform_info = self._detect_platform(url)
                        video_data = {
                            "id": self._extract_id(url),
                            "url": url,
                            "title": r.get("title", "Unknown"),
                            "duration": r.get("duration", "Unknown"),
                            "author": r.get("uploader", "Unknown"),
                            "thumbnail": r.get("images", {}).get("large", ""),
                            "platform": platform_info["name"],
                            "platform_icon": platform_info["icon"],
                            "platform_color": platform_info["color"],
                            "platform_category": platform_info["category_name"],
                            "episode_number": ep_num,
                            "episode_query": ep_query
                        }
                        results.append(video_data)
                    
                    if results:
                        # Found results for this episode
                        all_episodes.extend(results)
                        episode_found = True
                        consecutive_failures = 0
                        self.logger.info(f"Found {len(results)} results for episode {ep_num}")
                        break  # Stop trying other formats for this episode
                    
                except Exception as e:
                    self.logger.warning(f"Failed to search episode {ep_num} with query '{ep_query}': {e}")
                    continue
            
            if not episode_found:
                consecutive_failures += 1
                self.logger.info(f"No results for episode {ep_num} (consecutive failures: {consecutive_failures})")
                
                if consecutive_failures >= max_consecutive_failures:
                    self.logger.info(f"Stopping search after {consecutive_failures} consecutive failures")
                    break
        
        return all_episodes
    
    def check_video_quality(self, url: str) -> List[str]:
        """
        Extract available qualities for a video URL using yt-dlp.
        
        Args:
            url: Video URL to check.
            
        Returns:
            List of available quality strings (e.g., ['2160', '1080', '720']).
            Returns empty list if extraction fails.
        """
        try:
            import yt_dlp
            
            # Configure yt-dlp to extract info without downloading
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
                'skip_download': True,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                if not info:
                    return []
                
                # Extract available qualities from formats
                qualities = set()
                
                if 'formats' in info:
                    for fmt in info['formats']:
                        # Get height (vertical resolution)
                        height = fmt.get('height')
                        if height:
                            # Map to standard quality labels
                            if height >= 2160:
                                qualities.add('2160')
                            elif height >= 1440:
                                qualities.add('1440')
                            elif height >= 1080:
                                qualities.add('1080')
                            elif height >= 720:
                                qualities.add('720')
                            elif height >= 480:
                                qualities.add('480')
                            elif height >= 360:
                                qualities.add('360')
                
                # Sort qualities in descending order
                return sorted(list(qualities), key=lambda x: int(x), reverse=True)
                
        except Exception as e:
            self.logger.warning(f"Failed to check quality for {url}: {e}")
            return []
    
    def search_with_quality_filter(self, 
                                   query: str,
                                   min_quality: Optional[str] = None,
                                   format_type: Optional[str] = None,
                                   limit: int = 50,
                                   region: str = "wt-wt",
                                   timelimit: Optional[str] = None,
                                   duration: Optional[str] = None,
                                   site: Optional[str] = None,
                                   content_type: str = "All") -> List[Dict[str, Any]]:
        """
        Search for videos and filter by quality before returning results.
        Uses yt-dlp to verify available formats in parallel.
        
        Args:
            query: Search query string.
            min_quality: Minimum quality required (e.g., '1080', '720').
            format_type: Format type filter ('best', 'bestvideo', 'bestaudio').
            limit: Maximum number of results to return.
            region: Region code.
            timelimit: Time limit filter.
            duration: Duration filter.
            site: Optional domain to restrict search to.
            content_type: Content filter.
            
        Returns:
            List of filtered video results with quality information.
        """
        # First, perform standard search with higher limit to account for filtering
        search_limit = limit * 2 if min_quality or format_type else limit
        
        results = self.search(
            query=query,
            limit=search_limit,
            region=region,
            timelimit=timelimit,
            duration=duration,
            site=site,
            content_type=content_type
        )
        
        # If no quality/format filters, return results as-is
        if not min_quality and not format_type:
            return results[:limit]
        
        # Filter results by quality in parallel
        filtered_results = []
        
        def check_and_filter(result):
            """Check if result meets quality/format criteria."""
            url = result.get('url')
            if not url:
                return None
            
            qualities = self.check_video_quality(url)
            
            # Check if result meets minimum quality requirement
            if min_quality:
                min_quality_int = int(min_quality)
                has_required_quality = any(int(q) >= min_quality_int for q in qualities)
                
                if not has_required_quality:
                    self.logger.debug(f"Filtered out {url}: quality {qualities} below {min_quality}")
                    return None
            
            # Check format type (for audio-only, we accept any result)
            # For video formats, we already checked quality above
            if format_type == 'bestaudio':
                # Audio-only: accept all results
                pass
            elif format_type in ['best', 'bestvideo']:
                # Video formats: already checked quality above
                pass
            
            # Add available qualities to result
            result['available_qualities'] = qualities
            return result
        
        # Use ThreadPoolManager search_pool for parallel quality checks
        executor = self._thread_pool_manager.search_pool
        future_to_result = {
            executor.submit(check_and_filter, result): result 
            for result in results
        }
        
        for future in as_completed(future_to_result):
                try:
                    filtered_result = future.result()
                    if filtered_result:
                        filtered_results.append(filtered_result)
                        
                        # Stop once we have enough results
                        if len(filtered_results) >= limit:
                            break
                except Exception as e:
                    self.logger.warning(f"Error filtering result: {e}")
                    continue
        
        self.logger.info(f"Filtered {len(results)} results to {len(filtered_results)} matching quality criteria")
        return filtered_results[:limit]
    
    def enrich_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enrich search result with detailed metadata from yt-dlp.
        
        Args:
            result: Search result dictionary with at least 'url' field.
            
        Returns:
            Enriched result dictionary with additional metadata fields:
            - view_count: Number of views (int)
            - like_count: Number of likes (int)
            - upload_date: Upload date string (YYYYMMDD format)
            - description: First 200 characters of description
            - tags: First 5 tags
            - available_qualities: List of available quality strings
            - enrichment_failed: Boolean flag indicating if enrichment failed
        """
        url = result.get('url')
        if not url:
            result['enrichment_failed'] = True
            return result
        
        try:
            import yt_dlp
            
            # Configure yt-dlp for metadata extraction only
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
                'skip_download': True,
                'socket_timeout': 5,  # 5 second timeout (reduced from 10)
                'no_check_certificate': True,  # Skip SSL verification for speed
                'prefer_insecure': True,  # Use HTTP when possible for speed
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                if not info:
                    result['enrichment_failed'] = True
                    return result
                
                # Extract view count
                result['view_count'] = info.get('view_count', 0) or 0
                
                # Extract like count
                result['like_count'] = info.get('like_count', 0) or 0
                
                # Extract upload date
                upload_date = info.get('upload_date', '')
                result['upload_date'] = upload_date if upload_date else ''
                
                # Extract description (first 200 chars)
                description = info.get('description', '')
                if description:
                    result['description'] = description[:200]
                else:
                    result['description'] = ''
                
                # Extract tags (first 5)
                tags = info.get('tags', [])
                if tags and isinstance(tags, list):
                    result['tags'] = tags[:5]
                else:
                    result['tags'] = []
                
                # Extract available qualities from formats
                qualities = set()
                if 'formats' in info:
                    for fmt in info['formats']:
                        height = fmt.get('height')
                        if height:
                            if height >= 2160:
                                qualities.add('2160')
                            elif height >= 1440:
                                qualities.add('1440')
                            elif height >= 1080:
                                qualities.add('1080')
                            elif height >= 720:
                                qualities.add('720')
                            elif height >= 480:
                                qualities.add('480')
                            elif height >= 360:
                                qualities.add('360')
                
                # Sort qualities in descending order
                result['available_qualities'] = sorted(list(qualities), key=lambda x: int(x), reverse=True)
                
                # Mark enrichment as successful
                result['enrichment_failed'] = False
                
                self.logger.debug(f"Successfully enriched: {result.get('title', url)}")
                return result
                
        except Exception as e:
            # Log with structured context
            self.logger.log_exception_structured(
                exception=e,
                context={
                    "url": url,
                    "title": result.get('title', 'Unknown'),
                    "operation": "enrich_result"
                },
                message=f"Failed to enrich result for: {url}"
            )
            
            # Return partial data with enrichment_failed flag
            result['enrichment_failed'] = True
            result['view_count'] = 0
            result['like_count'] = 0
            result['upload_date'] = ''
            result['description'] = ''
            result['tags'] = []
            result['available_qualities'] = []
            return result
    
    def enrich_results_batch(self, results: List[Dict[str, Any]], max_workers: int = 5) -> List[Dict[str, Any]]:
        """
        Enrich multiple search results in parallel using ThreadPoolExecutor.
        
        Args:
            results: List of search result dictionaries to enrich.
            max_workers: Maximum number of parallel workers (default: 5).
            
        Returns:
            List of enriched results. Results are returned in the order they complete,
            not in the original order. Failed enrichments are logged but included
            with enrichment_failed flag set to True.
        """
        if not results:
            return []
        
        enriched_results = []
        
        # Limit to first 10 results to prevent freezing
        results_to_enrich = results[:10]
        remaining_results = results[10:]
        
        self.logger.info(f"Starting batch enrichment of {len(results_to_enrich)} results (limited from {len(results)}) with {max_workers} workers")
        
        # Use ThreadPoolManager search_pool for parallel enrichment
        executor = self._thread_pool_manager.search_pool
        # Submit all enrichment tasks
        future_to_result = {
            executor.submit(self.enrich_result, result): result
            for result in results_to_enrich
        }
        
        # Collect results as they complete with timeout
        import concurrent.futures
        try:
            for future in concurrent.futures.as_completed(future_to_result, timeout=30):
                try:
                    enriched_result = future.result(timeout=5)
                    enriched_results.append(enriched_result)
                    
                    # Log progress
                    if len(enriched_results) % 5 == 0:
                        self.logger.info(f"Enriched {len(enriched_results)}/{len(results_to_enrich)} results")
                        
                except concurrent.futures.TimeoutError:
                    # Timeout on individual result
                    original_result = future_to_result[future]
                    self.logger.warning(f"Timeout enriching result: {original_result.get('title', 'Unknown')}")
                    original_result['enrichment_failed'] = True
                    enriched_results.append(original_result)
                except Exception as e:
                    # This should rarely happen since enrich_result handles its own exceptions
                    original_result = future_to_result[future]
                    self.logger.error(f"Unexpected error enriching result: {e}")
                    
                    # Add the original result with enrichment_failed flag
                    original_result['enrichment_failed'] = True
                    enriched_results.append(original_result)
        except concurrent.futures.TimeoutError:
            # Overall timeout - add remaining results as failed
            self.logger.warning(f"Overall enrichment timeout after 30s")
            for future, original_result in future_to_result.items():
                if not future.done():
                    original_result['enrichment_failed'] = True
                    enriched_results.append(original_result)
        
        # Add remaining results without enrichment
        for result in remaining_results:
            result['enrichment_failed'] = True
            enriched_results.append(result)
        
        self.logger.info(f"Batch enrichment complete: {len(enriched_results)} results processed")
        
        # Count successful vs failed enrichments
        successful = sum(1 for r in enriched_results if not r.get('enrichment_failed', True))
        failed = len(enriched_results) - successful
        self.logger.info(f"Enrichment stats: {successful} successful, {failed} failed")
        
        return enriched_results

    def analyze_user_preferences(self, history_items: List[Dict[str, Any]]) -> 'UserPreferences':
        """
        Analyze download history to extract user preferences.
        
        Args:
            history_items: List of download history items with video metadata.
                          Each item should have: title, platform, platform_category, selected_quality
            
        Returns:
            UserPreferences object with analyzed preferences.
        """
        from models.data_models import UserPreferences
        from collections import Counter
        import re
        
        if not history_items:
            # Return default preferences if no history
            return UserPreferences()
        
        # Count platform usage
        platform_counts = Counter()
        category_counts = Counter()
        quality_counts = Counter()
        all_keywords = []
        
        for item in history_items:
            # Count platforms
            platform = item.get('platform', 'Unknown')
            if platform and platform != 'Unknown':
                platform_counts[platform] += 1
            
            # Count categories
            category = item.get('platform_category', 'Other')
            if category and category != 'Other':
                category_counts[category] += 1
            
            # Count quality selections
            quality = item.get('selected_quality', 'best')
            if quality:
                quality_counts[quality] += 1
            
            # Extract keywords from title
            title = item.get('title', '')
            if title:
                # Remove common words and extract meaningful keywords
                words = re.findall(r'\b[a-zA-Z]{4,}\b', title.lower())
                # Filter out common words
                common_words = {'video', 'episode', 'part', 'full', 'official', 'with', 'from', 'this', 'that'}
                keywords = [w for w in words if w not in common_words]
                all_keywords.extend(keywords)
        
        # Get top 3 platforms
        top_platforms = [platform for platform, count in platform_counts.most_common(3)]
        
        # Get top 3 categories
        top_categories = [category for category, count in category_counts.most_common(3)]
        
        # Get most common quality
        if quality_counts:
            preferred_quality = quality_counts.most_common(1)[0][0]
        else:
            preferred_quality = "1080p"
        
        # Get top 10 keywords
        keyword_counts = Counter(all_keywords)
        favorite_keywords = [keyword for keyword, count in keyword_counts.most_common(10)]
        
        # Create and return UserPreferences
        preferences = UserPreferences(
            top_platforms=top_platforms,
            top_categories=top_categories,
            preferred_quality=preferred_quality,
            preferred_format="best",
            favorite_keywords=favorite_keywords,
            last_updated=datetime.now()
        )
        
        self.logger.info(f"Analyzed preferences: {len(top_platforms)} platforms, {len(top_categories)} categories, {len(favorite_keywords)} keywords")
        
        return preferences

    def get_recommendations(self, history_items: List[Dict[str, Any]], 
                           limit: int = 20, region: str = "wt-wt") -> List[Dict[str, Any]]:
        """
        Generate personalized recommendations based on download history.
        
        Args:
            history_items: List of download history items with video metadata.
            limit: Maximum number of recommendations to return (default: 20).
            region: Region code for search (default: "wt-wt").
            
        Returns:
            List of recommended video results.
        """
        if not history_items:
            self.logger.info("No history available for recommendations")
            return []
        
        # Analyze user preferences
        preferences = self.analyze_user_preferences(history_items)
        
        if not preferences.top_platforms:
            self.logger.info("No platform preferences found")
            return []
        
        self.logger.info(f"Generating recommendations based on: {preferences.top_platforms}")
        
        all_recommendations = []
        results_per_platform = max(limit // len(preferences.top_platforms), 5)
        
        # Search for latest content from top platforms
        for platform in preferences.top_platforms:
            # Build search query using favorite keywords if available
            if preferences.favorite_keywords:
                # Use top 3 keywords
                keywords = ' OR '.join(preferences.favorite_keywords[:3])
                query = f"({keywords})"
            else:
                # Generic query for the platform
                query = "latest"
            
            # Map platform name to domain
            platform_domain_map = {
                'YouTube': 'youtube.com',
                'Bilibili': 'bilibili.com',
                'Vimeo': 'vimeo.com',
                'Dailymotion': 'dailymotion.com',
                'OK.ru': 'ok.ru',
                'SoundCloud': 'soundcloud.com',
                'Bandcamp': 'bandcamp.com',
                'TikTok': 'tiktok.com',
                'Instagram': 'instagram.com',
                'Twitter': 'twitter.com',
                'Reddit': 'reddit.com',
                'Twitch': 'twitch.tv',
                'Niconico': 'nicovideo.jp',
                'HiDive': 'hidive.com',
                'iQiyi': 'iqiyi.com',
                'Youku': 'youku.com',
                'Rumble': 'rumble.com',
            }
            
            domain = platform_domain_map.get(platform)
            if not domain:
                self.logger.warning(f"Unknown platform domain for: {platform}")
                continue
            
            # Search with site filter and time limit (1 week for recency)
            search_query = f"{query} site:{domain}"
            
            try:
                ddgs_gen = self.ddgs.videos(
                    keywords=search_query,
                    region=region,
                    safesearch="off",
                    timelimit="w",  # Past week for recency
                    max_results=results_per_platform
                )
                
                for r in ddgs_gen:
                    url = r.get("content", "")
                    if not url:
                        continue
                    
                    platform_info = self._detect_platform(url)
                    video_data = {
                        "id": self._extract_id(url),
                        "url": url,
                        "title": r.get("title", "Unknown"),
                        "duration": r.get("duration", "Unknown"),
                        "author": r.get("uploader", "Unknown"),
                        "thumbnail": r.get("images", {}).get("large", ""),
                        "platform": platform_info["name"],
                        "platform_icon": platform_info["icon"],
                        "platform_color": platform_info["color"],
                        "platform_category": platform_info["category_name"],
                        "recommended": True
                    }
                    all_recommendations.append(video_data)
                    
            except Exception as e:
                self.logger.warning(f"Failed to get recommendations from {platform}: {e}")
                continue
        
        # Limit to requested number of recommendations
        recommendations = all_recommendations[:limit]
        
        self.logger.info(f"Generated {len(recommendations)} recommendations from {len(preferences.top_platforms)} platforms")
        
        return recommendations

    def build_advanced_query(self, base_query: str, operators_config: Dict[str, Any]) -> str:
        """
        Build DuckDuckGo query with advanced operators.
        
        Args:
            base_query: Base search query string.
            operators_config: Dictionary with operator settings:
                - exact_phrases: List of phrases to match exactly
                - exclude_terms: List of terms to exclude
                - or_terms: List of terms to combine with OR logic
                - must_contain: List of terms that must be present
                - site: Domain to restrict search to
                - filetype: File extension filter
                - intitle_terms: List of terms that must appear in title
                - inurl_terms: List of terms that must appear in URL
                
        Returns:
            Constructed query string with operators applied.
        """
        query_parts = []
        
        # Start with base query
        if base_query:
            query_parts.append(base_query)
        
        # Apply exact phrase matching
        exact_phrases = operators_config.get('exact_phrases', [])
        if exact_phrases:
            for phrase in exact_phrases:
                if phrase:
                    query_parts.append(f'"{phrase}"')
        
        # Apply exclusions (highest precedence for filtering)
        exclude_terms = operators_config.get('exclude_terms', [])
        if exclude_terms:
            for term in exclude_terms:
                if term:
                    query_parts.append(f"-{term}")
        
        # Apply OR logic
        or_terms = operators_config.get('or_terms', [])
        if or_terms and len(or_terms) > 1:
            # Filter out empty terms
            valid_or_terms = [term for term in or_terms if term]
            if len(valid_or_terms) > 1:
                or_query = " OR ".join(valid_or_terms)
                query_parts.append(f"({or_query})")
            elif len(valid_or_terms) == 1:
                query_parts.append(valid_or_terms[0])
        
        # Apply must contain terms
        must_contain = operators_config.get('must_contain', [])
        if must_contain:
            for term in must_contain:
                if term:
                    query_parts.append(term)
        
        # Apply intitle operator
        intitle_terms = operators_config.get('intitle_terms', [])
        if intitle_terms:
            for term in intitle_terms:
                if term:
                    query_parts.append(f"intitle:{term}")
        
        # Apply inurl operator
        inurl_terms = operators_config.get('inurl_terms', [])
        if inurl_terms:
            for term in inurl_terms:
                if term:
                    query_parts.append(f"inurl:{term}")
        
        # Apply site operator
        site = operators_config.get('site')
        if site:
            query_parts.append(f"site:{site}")
        
        # Apply filetype operator
        filetype = operators_config.get('filetype')
        if filetype:
            query_parts.append(f"filetype:{filetype}")
        
        # Combine all parts with spaces
        constructed_query = " ".join(query_parts)
        
        self.logger.debug(f"Built advanced query: {constructed_query}")
        
        return constructed_query

    def search_advanced(self,
                       base_query: str,
                       exact_phrases: Optional[List[str]] = None,
                       exclude_terms: Optional[List[str]] = None,
                       or_terms: Optional[List[str]] = None,
                       must_contain: Optional[List[str]] = None,
                       site: Optional[str] = None,
                       filetype: Optional[str] = None,
                       intitle_terms: Optional[List[str]] = None,
                       inurl_terms: Optional[List[str]] = None,
                       limit: int = 50,
                       region: str = "wt-wt",
                       timelimit: Optional[str] = None,
                       duration: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Execute search with advanced operators.
        
        Args:
            base_query: Base search query string.
            exact_phrases: List of phrases to match exactly.
            exclude_terms: List of terms to exclude from results.
            or_terms: List of terms to combine with OR logic.
            must_contain: List of terms that must be present.
            site: Domain to restrict search to (e.g., 'youtube.com').
            filetype: File extension filter (e.g., 'mp4').
            intitle_terms: List of terms that must appear in title.
            inurl_terms: List of terms that must appear in URL.
            limit: Maximum number of results to return.
            region: Region code for search.
            timelimit: Time limit filter ('d', 'w', 'm').
            duration: Duration filter ('short', 'medium', 'long').
            
        Returns:
            List of search results matching the advanced query.
        """
        # Build operators_config from parameters
        operators_config = {
            'exact_phrases': exact_phrases or [],
            'exclude_terms': exclude_terms or [],
            'or_terms': or_terms or [],
            'must_contain': must_contain or [],
            'site': site,
            'filetype': filetype,
            'intitle_terms': intitle_terms or [],
            'inurl_terms': inurl_terms or []
        }
        
        # Build the advanced query
        constructed_query = self.build_advanced_query(base_query, operators_config)
        
        if not constructed_query:
            self.logger.warning("Advanced query construction resulted in empty query")
            return []
        
        self.logger.info(f"Executing advanced search: {constructed_query}")
        
        # Execute search with the constructed query
        try:
            results = []
            ddgs_gen = self.ddgs.videos(
                keywords=constructed_query,
                region=region,
                safesearch="off",
                timelimit=timelimit,
                duration=duration,
                max_results=limit
            )
            
            for r in ddgs_gen:
                url = r.get("content", "")
                if not url:
                    continue
                
                platform_info = self._detect_platform(url)
                video_data = {
                    "id": self._extract_id(url),
                    "url": url,
                    "title": r.get("title", "Unknown"),
                    "duration": r.get("duration", "Unknown"),
                    "author": r.get("uploader", "Unknown"),
                    "thumbnail": r.get("images", {}).get("large", ""),
                    "platform": platform_info["name"],
                    "platform_icon": platform_info["icon"],
                    "platform_color": platform_info["color"],
                    "platform_category": platform_info["category_name"],
                    "advanced_search": True,
                    "query_used": constructed_query
                }
                results.append(video_data)
            
            self.logger.info(f"Advanced search returned {len(results)} results")
            
            # Publish search complete event
            self._event_bus.publish(Event(
                type=EventType.SEARCH_COMPLETE,
                data={
                    "query": constructed_query,
                    "results": results,
                    "result_count": len(results),
                    "advanced_search": True
                }
            ))
            
            return results
            
        except Exception as e:
            # Log with structured context
            self.logger.log_exception_structured(
                exception=e,
                context={
                    "query": constructed_query,
                    "filters": filters,
                    "operation": "advanced_search"
                },
                message=f"Advanced search failed for query: {constructed_query}"
            )
            
            # Classify the error type
            error_msg = str(e).lower()
            error_type = "unknown"
            
            if any(keyword in error_msg for keyword in [
                'network', 'connection', 'timeout', 'unreachable', 'dns', 'ssl'
            ]):
                error_type = "network"
            elif any(keyword in error_msg for keyword in [
                'api', 'rate limit', 'quota', 'forbidden', '403', '429'
            ]):
                error_type = "api"
            elif any(keyword in error_msg for keyword in [
                'parse', 'json', 'decode', 'invalid response'
            ]):
                error_type = "parsing"
            
            # Publish search failed event
            self._event_bus.publish(Event(
                type=EventType.SEARCH_FAILED,
                data={
                    "query": constructed_query,
                    "error": str(e),
                    "error_type": error_type,
                    "advanced_search": True
                }
            ))
            
            return []

    def compare_platforms(self, 
                         query: str, 
                         platforms: List[str], 
                         limit_per_platform: int = 5,
                         region: str = "wt-wt",
                         timelimit: Optional[str] = None,
                         duration: Optional[str] = None) -> Dict[str, List[Dict[str, Any]]]:
        """
        Search across multiple platforms and return comparison results.
        Executes parallel searches for each platform.
        
        Args:
            query: Search query string.
            platforms: List of platform names to search (e.g., ['YouTube', 'Vimeo', 'Bilibili']).
            limit_per_platform: Maximum number of results per platform (default: 5).
            region: Region code for search.
            timelimit: Time limit filter ('d', 'w', 'm').
            duration: Duration filter ('short', 'medium', 'long').
            
        Returns:
            Dictionary mapping platform name to list of search results.
            Example: {'YouTube': [...], 'Vimeo': [...], 'Bilibili': [...]}
        """
        if not query or not platforms:
            self.logger.warning("Empty query or platforms list for comparison")
            return {}
        
        self.logger.info(f"Starting batch comparison for query '{query}' across {len(platforms)} platforms")
        
        # Map platform names to domains
        platform_domain_map = {
            'YouTube': 'youtube.com',
            'Bilibili': 'bilibili.com',
            'Vimeo': 'vimeo.com',
            'Dailymotion': 'dailymotion.com',
            'OK.ru': 'ok.ru',
            'SoundCloud': 'soundcloud.com',
            'Bandcamp': 'bandcamp.com',
            'TikTok': 'tiktok.com',
            'Instagram': 'instagram.com',
            'Twitter': 'twitter.com',
            'Reddit': 'reddit.com',
            'Twitch': 'twitch.tv',
            'Niconico': 'nicovideo.jp',
            'HiDive': 'hidive.com',
            'iQiyi': 'iqiyi.com',
            'Youku': 'youku.com',
            'Rumble': 'rumble.com',
            'Audiomack': 'audiomack.com',
            'Mixcloud': 'mixcloud.com',
        }
        
        # Function to search a single platform
        def search_platform(platform_name):
            """Search a single platform and return results."""
            domain = platform_domain_map.get(platform_name)
            if not domain:
                self.logger.warning(f"Unknown platform domain for: {platform_name}")
                return platform_name, []
            
            try:
                # Search with site filter
                search_query = f"{query} site:{domain}"
                
                results = []
                ddgs_gen = self.ddgs.videos(
                    keywords=search_query,
                    region=region,
                    safesearch="off",
                    timelimit=timelimit,
                    duration=duration,
                    max_results=limit_per_platform
                )
                
                for r in ddgs_gen:
                    url = r.get("content", "")
                    if not url:
                        continue
                    
                    platform_info = self._detect_platform(url)
                    video_data = {
                        "id": self._extract_id(url),
                        "url": url,
                        "title": r.get("title", "Unknown"),
                        "duration": r.get("duration", "Unknown"),
                        "author": r.get("uploader", "Unknown"),
                        "thumbnail": r.get("images", {}).get("large", ""),
                        "platform": platform_info["name"],
                        "platform_icon": platform_info["icon"],
                        "platform_color": platform_info["color"],
                        "platform_category": platform_info["category_name"],
                        "comparison_search": True
                    }
                    results.append(video_data)
                
                self.logger.info(f"Found {len(results)} results for {platform_name}")
                return platform_name, results
                
            except Exception as e:
                self.logger.warning(f"Failed to search {platform_name}: {e}")
                return platform_name, []
        
        # Execute parallel searches using ThreadPoolManager search_pool
        comparison_results = {}
        
        executor = self._thread_pool_manager.search_pool
        # Submit all platform searches
        future_to_platform = {
            executor.submit(search_platform, platform): platform
            for platform in platforms
        }
        
        # Collect results as they complete
        for future in as_completed(future_to_platform):
            try:
                platform_name, results = future.result()
                comparison_results[platform_name] = results
            except Exception as e:
                platform = future_to_platform[future]
                self.logger.error(f"Unexpected error searching {platform}: {e}")
                comparison_results[platform] = []
        
        # Log summary
        total_results = sum(len(results) for results in comparison_results.values())
        self.logger.info(f"Batch comparison complete: {total_results} total results across {len(platforms)} platforms")
        
        return comparison_results

    def rank_comparison_results(self, 
                                platform_results: Dict[str, List[Dict[str, Any]]]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Rank and score results within each platform based on quality, view count, and upload date.
        
        Args:
            platform_results: Dictionary mapping platform name to list of results.
            
        Returns:
            Dictionary with same structure but results sorted by score within each platform.
            Each result will have an added 'comparison_score' field.
        """
        if not platform_results:
            return {}
        
        self.logger.info("Ranking comparison results")
        
        from datetime import datetime
        
        ranked_results = {}
        
        for platform_name, results in platform_results.items():
            if not results:
                ranked_results[platform_name] = []
                continue
            
            # Score each result
            scored_results = []
            
            for result in results:
                score = 0.0
                
                # Quality score (40% weight)
                # Check if result has available_qualities from enrichment
                available_qualities = result.get('available_qualities', [])
                if available_qualities:
                    # Get highest quality
                    try:
                        max_quality = max([int(q) for q in available_qualities])
                        # Normalize to 0-1 scale (assuming max is 2160p)
                        quality_score = min(max_quality / 2160.0, 1.0)
                    except (ValueError, TypeError):
                        quality_score = 0.5  # Default if parsing fails
                else:
                    # No quality info available, use default
                    quality_score = 0.5
                
                score += quality_score * 0.4
                
                # View count score (30% weight)
                view_count = result.get('view_count', 0)
                if view_count > 0:
                    # Logarithmic scale for views (normalize to 0-1)
                    # Assume 10M views is "max" for normalization
                    import math
                    view_score = min(math.log10(view_count + 1) / math.log10(10_000_000), 1.0)
                else:
                    view_score = 0.0
                
                score += view_score * 0.3
                
                # Recency score (30% weight)
                upload_date = result.get('upload_date', '')
                if upload_date and len(upload_date) == 8:
                    try:
                        # Parse YYYYMMDD format
                        upload_dt = datetime.strptime(upload_date, "%Y%m%d")
                        now = datetime.now()
                        
                        # Calculate days since upload
                        days_old = (now - upload_dt).days
                        
                        # Recency score: newer is better
                        # Videos from today = 1.0, videos from 1 year ago = ~0.0
                        recency_score = max(1.0 - (days_old / 365.0), 0.0)
                    except (ValueError, TypeError):
                        recency_score = 0.5  # Default if parsing fails
                else:
                    recency_score = 0.5  # Default if no date available
                
                score += recency_score * 0.3
                
                # Add score to result
                result['comparison_score'] = round(score, 3)
                scored_results.append(result)
            
            # Sort results by score (highest first)
            scored_results.sort(key=lambda x: x['comparison_score'], reverse=True)
            
            ranked_results[platform_name] = scored_results
            
            # Log top result for this platform
            if scored_results:
                top_result = scored_results[0]
                self.logger.debug(
                    f"{platform_name} top result: '{top_result.get('title', 'Unknown')}' "
                    f"(score: {top_result['comparison_score']})"
                )
        
        self.logger.info("Ranking complete")
        return ranked_results
    
    def get_trending(self, 
                     category: str = "all", 
                     region: str = "wt-wt", 
                     limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get trending content for a category.
        Uses time-limited searches with trending keywords.
        
        Args:
            category: Category name ('all', 'Video Streaming', 'Anime', 'Music', 
                     'Social Media', 'Gaming', 'Podcasts') or 'all' for general trending.
            region: Region code for search (default: "wt-wt").
            limit: Maximum number of trending results to return (default: 20).
            
        Returns:
            List of trending video results with metadata.
        """
        self.logger.info(f"Fetching trending content for category: {category}")
        
        # Define trending query templates for each category
        trending_queries = {
            "all": "trending viral popular",
            "Video Streaming": "trending video viral popular",
            "Anime": "trending anime popular new episode",
            "Music": "trending music viral hit song",
            "Social Media": "trending viral tiktok instagram",
            "Gaming": "trending gaming gameplay stream",
            "Podcasts": "trending podcast popular episode"
        }
        
        # Get the appropriate query for the category
        base_query = trending_queries.get(category, trending_queries["all"])
        
        # If category is not "all", add site filters for that category's platforms
        if category != "all" and category in PLATFORM_CATEGORIES:
            category_info = PLATFORM_CATEGORIES[category]
            platforms = category_info["platforms"]
            
            # Map platform names to domains
            platform_domain_map = {
                'YouTube': 'youtube.com',
                'Bilibili': 'bilibili.com',
                'Vimeo': 'vimeo.com',
                'Dailymotion': 'dailymotion.com',
                'OK.ru': 'ok.ru',
                'SoundCloud': 'soundcloud.com',
                'Bandcamp': 'bandcamp.com',
                'TikTok': 'tiktok.com',
                'Instagram': 'instagram.com',
                'Twitter': 'twitter.com',
                'Reddit': 'reddit.com',
                'Twitch': 'twitch.tv',
                'Niconico': 'nicovideo.jp',
                'HiDive': 'hidive.com',
                'iQiyi': 'iqiyi.com',
                'Youku': 'youku.com',
                'Rumble': 'rumble.com',
                'Audiomack': 'audiomack.com',
                'Mixcloud': 'mixcloud.com',
                'Apple Podcasts': 'podcasts.apple.com',
                'Spotify': 'spotify.com',
                'YouTube Gaming': 'youtube.com',
                'Facebook Gaming': 'facebook.com',
            }
            
            # Search across category platforms
            all_results = []
            results_per_platform = max(limit // len(platforms), 3)
            
            for platform in platforms:
                domain = platform_domain_map.get(platform)
                if not domain:
                    self.logger.debug(f"No domain mapping for platform: {platform}")
                    continue
                
                # Build query with site filter
                search_query = f"{base_query} site:{domain}"
                
                try:
                    ddgs_gen = self.ddgs.videos(
                        keywords=search_query,
                        region=region,
                        safesearch="off",
                        timelimit="w",  # Past week for recency
                        max_results=results_per_platform
                    )
                    
                    for r in ddgs_gen:
                        url = r.get("content", "")
                        if not url:
                            continue
                        
                        platform_info = self._detect_platform(url)
                        video_data = {
                            "id": self._extract_id(url),
                            "url": url,
                            "title": r.get("title", "Unknown"),
                            "duration": r.get("duration", "Unknown"),
                            "author": r.get("uploader", "Unknown"),
                            "thumbnail": r.get("images", {}).get("large", ""),
                            "platform": platform_info["name"],
                            "platform_icon": platform_info["icon"],
                            "platform_color": platform_info["color"],
                            "platform_category": platform_info["category_name"],
                            "trending": True,
                            "trending_category": category
                        }
                        all_results.append(video_data)
                        
                except Exception as e:
                    self.logger.warning(f"Failed to fetch trending from {platform}: {e}")
                    continue
            
            # Return up to limit results
            trending_results = all_results[:limit]
            self.logger.info(f"Found {len(trending_results)} trending results for {category}")
            return trending_results
        
        else:
            # General trending search (no category filter)
            try:
                results = []
                ddgs_gen = self.ddgs.videos(
                    keywords=base_query,
                    region=region,
                    safesearch="off",
                    timelimit="w",  # Past week for recency
                    max_results=limit
                )
                
                for r in ddgs_gen:
                    url = r.get("content", "")
                    if not url:
                        continue
                    
                    platform_info = self._detect_platform(url)
                    video_data = {
                        "id": self._extract_id(url),
                        "url": url,
                        "title": r.get("title", "Unknown"),
                        "duration": r.get("duration", "Unknown"),
                        "author": r.get("uploader", "Unknown"),
                        "thumbnail": r.get("images", {}).get("large", ""),
                        "platform": platform_info["name"],
                        "platform_icon": platform_info["icon"],
                        "platform_color": platform_info["color"],
                        "platform_category": platform_info["category_name"],
                        "trending": True,
                        "trending_category": "all"
                    }
                    results.append(video_data)
                
                self.logger.info(f"Found {len(results)} general trending results")
                return results
                
            except Exception as e:
                self.logger.error(f"Failed to fetch general trending content: {e}")
                return []

    def check_platform_health(self, platform_name: str) -> str:
        """
        Test if yt-dlp extractor works for a platform.
        Uses test URLs from PLATFORM_CATEGORIES to verify platform functionality.
        
        Args:
            platform_name: Name of the platform to check (e.g., 'YouTube', 'Bilibili').
            
        Returns:
            Health status string:
            - "healthy": Extraction succeeded with valid metadata
            - "broken": Extraction failed with exceptions
            - "unknown": No test URL defined for platform
        """
        import time
        
        # Check if we have a cached result
        if platform_name in self.platform_health_cache:
            cached_time, status = self.platform_health_cache[platform_name]
            if time.time() - cached_time < self.cache_ttl:
                self.logger.debug(f"Using cached health status for {platform_name}: {status}")
                return status
        
        # Find the platform's test URL
        test_url = None
        for category_name, category_info in PLATFORM_CATEGORIES.items():
            if platform_name in category_info["platforms"]:
                test_url = category_info.get("test_url")
                break
        
        # If no test URL is defined, return unknown
        if not test_url:
            self.logger.debug(f"No test URL defined for platform: {platform_name}")
            status = "unknown"
            self.platform_health_cache[platform_name] = (time.time(), status)
            return status
        
        # Try to extract info using yt-dlp
        try:
            import yt_dlp
            
            self.logger.info(f"Checking health for {platform_name} with URL: {test_url}")
            
            # Configure yt-dlp for quick health check
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
                'skip_download': True,
                'socket_timeout': 15,  # 15 second timeout
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(test_url, download=False)
                
                # Check if we got valid metadata
                if info and (info.get('title') or info.get('id')):
                    status = "healthy"
                    self.logger.info(f"Platform {platform_name} is healthy")
                else:
                    status = "broken"
                    self.logger.warning(f"Platform {platform_name} returned no metadata")
            
            # Cache the result
            self.platform_health_cache[platform_name] = (time.time(), status)
            return status
            
        except Exception as e:
            self.logger.warning(f"Platform {platform_name} health check failed: {e}")
            status = "broken"
            self.platform_health_cache[platform_name] = (time.time(), status)
            return status
    
    def check_all_platforms_health(self) -> Dict[str, str]:
        """
        Check health of all categorized platforms.
        Runs checks in parallel using ThreadPoolExecutor.
        Results are cached with 1-hour TTL.
        
        Returns:
            Dictionary mapping platform name to health status.
            Example: {'YouTube': 'healthy', 'Bilibili': 'healthy', 'SoundCloud': 'unknown'}
        """
        self.logger.info("Checking health of all platforms")
        
        # Collect all unique platforms from categories
        all_platforms = set()
        for category_info in PLATFORM_CATEGORIES.values():
            all_platforms.update(category_info["platforms"])
        
        self.logger.info(f"Found {len(all_platforms)} platforms to check")
        
        # Function to check a single platform
        def check_single_platform(platform_name):
            """Check health of a single platform."""
            try:
                status = self.check_platform_health(platform_name)
                return platform_name, status
            except Exception as e:
                self.logger.error(f"Unexpected error checking {platform_name}: {e}")
                return platform_name, "unknown"
        
        # Execute parallel health checks using ThreadPoolManager search_pool
        health_results = {}
        
        executor = self._thread_pool_manager.search_pool
        # Submit all platform health checks
        future_to_platform = {
            executor.submit(check_single_platform, platform): platform
            for platform in all_platforms
        }
        
        # Collect results as they complete
        for future in as_completed(future_to_platform):
            try:
                platform_name, status = future.result()
                health_results[platform_name] = status
                
                # Log progress
                if len(health_results) % 5 == 0:
                    self.logger.info(f"Checked {len(health_results)}/{len(all_platforms)} platforms")
                    
            except Exception as e:
                platform = future_to_platform[future]
                self.logger.error(f"Unexpected error processing {platform}: {e}")
                health_results[platform] = "unknown"
        
        # Log summary
        healthy_count = sum(1 for status in health_results.values() if status == "healthy")
        broken_count = sum(1 for status in health_results.values() if status == "broken")
        unknown_count = sum(1 for status in health_results.values() if status == "unknown")
        
        self.logger.info(
            f"Platform health check complete: "
            f"{healthy_count} healthy, {broken_count} broken, {unknown_count} unknown"
        )
        
        return health_results

    def cleanup_expired_cache(self):
        """
        Clean up expired cache entries for platform health and trending results.
        Removes entries that have exceeded their TTL.
        """
        current_time = time.time()
        
        # Clean up platform health cache
        expired_health = []
        for platform_name, (cached_time, status) in self.platform_health_cache.items():
            if current_time - cached_time >= self.cache_ttl:
                expired_health.append(platform_name)
        
        for platform_name in expired_health:
            del self.platform_health_cache[platform_name]
            self.logger.debug(f"Removed expired health cache for {platform_name}")
        
        # Clean up trending cache
        expired_trending = []
        for cache_key, (cached_time, results) in self.trending_cache.items():
            if current_time - cached_time >= self.trending_cache_ttl:
                expired_trending.append(cache_key)
        
        for cache_key in expired_trending:
            del self.trending_cache[cache_key]
            self.logger.debug(f"Removed expired trending cache for {cache_key}")
        
        if expired_health or expired_trending:
            self.logger.info(
                f"Cache cleanup: removed {len(expired_health)} health entries, "
                f"{len(expired_trending)} trending entries"
            )
    
    def get_trending_cached(self, category: str = "all", region: str = "wt-wt", 
                           limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get trending content with caching support.
        Uses 15-minute cache to avoid repeated searches.
        
        Args:
            category: Category name for trending content.
            region: Region code for search.
            limit: Maximum number of results.
            
        Returns:
            List of trending video results (cached or fresh).
        """
        cache_key = f"trending_{category}_{region}_{limit}"
        current_time = time.time()
        
        # Check if we have a valid cached result
        if cache_key in self.trending_cache:
            cached_time, cached_results = self.trending_cache[cache_key]
            
            # Check if cache is still valid
            if current_time - cached_time < self.trending_cache_ttl:
                self.logger.info(f"Using cached trending results for {category}")
                return cached_results
        
        # Cache miss or expired - fetch fresh trending content
        self.logger.info(f"Fetching fresh trending content for {category}")
        results = self.get_trending(category=category, region=region, limit=limit)
        
        # Cache the results
        self.trending_cache[cache_key] = (current_time, results)
        
        return results

    def shutdown(self):
        """
        Clean shutdown of search operations.
        
        This method is maintained for backward compatibility but now delegates
        to ThreadPoolManager for actual shutdown. The ThreadPoolManager handles
        shutdown of all thread pools centrally when the application closes.
        
        Note: This method is deprecated. Thread pool shutdown is now handled
        by ThreadPoolManager.shutdown() called from the main application.
        """
        self.logger.info("SearchManager shutdown called (delegating to ThreadPoolManager)")
        # ThreadPoolManager handles shutdown centrally, so this is now a no-op
        # Kept for backward compatibility with existing code that calls this method
