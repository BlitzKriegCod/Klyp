# Design Document: yt-dlp Maximization

## Overview

This design document outlines the architecture and implementation strategy for maximizing yt-dlp's 1,864 platform support through 10 substantial enhancements. The current application leverages approximately 5% of yt-dlp's capabilities, primarily focusing on OK.ru, YouTube, and a handful of anime platforms. This enhancement will transform the application into a comprehensive multi-platform video discovery and download tool.

The design follows a phased approach with three implementation stages:
- **Phase 1 (Quick Wins)**: Content Presets, Platform Categories, Smart Playlist Detection
- **Phase 2 (Core Features)**: Quality Pre-filtering, Metadata Enrichment, Download History Intelligence  
- **Phase 3 (Advanced)**: Smart Search Operators, Batch Search & Compare, Trending Sections, Platform Health Status

### Design Principles

1. **Backward Compatibility**: All enhancements must work alongside existing functionality
2. **Performance**: Search and metadata operations should not block the UI
3. **Extensibility**: Platform definitions and presets should be easily configurable
4. **User Experience**: Progressive disclosure - simple by default, powerful when needed
5. **Minimal Dependencies**: Leverage existing yt-dlp and DuckDuckGo capabilities

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      SearchScreen (View)                     │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Presets   │  │   Filters    │  │  Results Display │   │
│  │  Buttons   │  │   Advanced   │  │   + Metadata     │   │
│  └────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   SearchManager (Controller)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Preset     │  │   Advanced   │  │    Metadata     │  │
│  │   Search     │  │   Operators  │  │   Enrichment    │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Batch      │  │   Playlist   │  │    Trending     │  │
│  │   Compare    │  │   Detection  │  │    Discovery    │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   DuckDuckGo Search      │  │   yt-dlp Extractor       │
│   - Video search         │  │   - Metadata extraction  │
│   - Multi-site queries   │  │   - Quality detection    │
│   - Advanced operators   │  │   - Platform validation  │
└──────────────────────────┘  └──────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              HistoryManager + RecommendationEngine          │
│  - Pattern analysis                                          │
│  - Platform preferences                                      │
│  - Personalized suggestions                                  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Enhanced SearchManager

The `SearchManager` class will be extended with new methods and data structures.

#### New Data Structures

```python
# Platform Categories with visual indicators
PLATFORM_CATEGORIES = {
    "Video Streaming": {
        "platforms": ["YouTube", "Vimeo", "Dailymotion", "Rumble"],
        "icon": "🎬",
        "color": "#ef4444",
        "test_url": "https://youtube.com/watch?v=dQw4w9WgXcQ"
    },
    "Anime": {
        "platforms": ["Bilibili", "Niconico", "HiDive", "Crunchyroll"],
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

# Quality filters
QUALITY_FILTERS = {
    "Any": None,
    "4K (2160p)": "2160",
    "Full HD (1080p)": "1080",
    "HD (720p)": "720",
    "SD (480p)": "480"
}

FORMAT_FILTERS = {
    "Any": None,
    "Video + Audio": "best",
    "Video Only": "bestvideo",
    "Audio Only": "bestaudio"
}
```

#### New Methods

```python
class SearchManager:
    def __init__(self):
        self.logger = logging.getLogger("Klyp.SearchManager")
        self.ddgs = DDGS()
        self.platform_health_cache = {}  # Cache health status
        self.cache_ttl = 3600  # 1 hour cache
        
    # Phase 1: Content Presets (EXISTING - already implemented)
    def search_preset(self, preset_name, query, limit=50, region="wt-wt"):
        """Search using content preset - already implemented."""
        pass
    
    # Phase 1: Smart Playlist Detection
    def detect_series(self, query):
        """
        Detect if query is for episodic content.
        Returns: dict with series info or None
        """
        pass
    
    def find_all_episodes(self, base_query, max_episodes=24):
        """
        Find all episodes of a series.
        Returns: list of episode results
        """
        pass
    
    # Phase 2: Quality Pre-filtering
    def search_with_quality_filter(self, query, min_quality=None, 
                                   format_type=None, **kwargs):
        """
        Search and filter by quality before returning results.
        Uses yt-dlp to verify available formats.
        """
        pass
    
    def check_video_quality(self, url):
        """
        Extract available qualities for a video URL.
        Returns: list of quality strings
        """
        pass
    
    # Phase 2: Metadata Enrichment
    def enrich_result(self, result):
        """
        Enrich search result with yt-dlp metadata.
        Adds: view_count, like_count, upload_date, description, tags, qualities
        """
        pass
    
    def enrich_results_batch(self, results, max_workers=5):
        """
        Enrich multiple results in parallel using ThreadPoolExecutor.
        """
        pass
    
    # Phase 2: Download History Intelligence
    def get_recommendations(self, history_manager, limit=20):
        """
        Generate recommendations based on download history.
        Analyzes platform and category preferences.
        """
        pass
    
    def analyze_user_preferences(self, history):
        """
        Analyze download history to extract preferences.
        Returns: dict with top_platforms, top_categories, keywords
        """
        pass
    
    # Phase 3: Advanced Search Operators
    def build_advanced_query(self, base_query, operators_config):
        """
        Build DuckDuckGo query with advanced operators.
        operators_config: dict with operator settings
        """
        pass
    
    def search_advanced(self, base_query, exact_phrases=None, 
                       exclude_terms=None, must_contain=None, 
                       filetypes=None, **kwargs):
        """
        Execute search with advanced operators.
        """
        pass
    
    # Phase 3: Batch Search & Compare
    def compare_platforms(self, query, platforms, limit_per_platform=5):
        """
        Search across multiple platforms and return comparison.
        Returns: dict mapping platform -> results
        """
        pass
    
    def rank_comparison_results(self, platform_results):
        """
        Rank and score results across platforms.
        Scoring based on: quality, views, recency, platform reliability
        """
        pass
    
    # Phase 3: Trending Discovery
    def get_trending(self, category="all", region="wt-wt", limit=20):
        """
        Get trending content for a category.
        Uses time-limited searches with trending keywords.
        """
        pass
    
    # Phase 3: Platform Health Status
    def check_platform_health(self, platform_name):
        """
        Test if yt-dlp extractor works for platform.
        Returns: "healthy", "degraded", "broken", "unknown"
        """
        pass
    
    def check_all_platforms_health(self):
        """
        Check health of all categorized platforms.
        Uses caching to avoid repeated tests.
        Returns: dict mapping platform -> health_status
        """
        pass
    
    def get_platform_category(self, platform_name):
        """
        Get category info for a platform.
        Returns: dict with icon, color, category_name
        """
        pass
```

### 2. Enhanced SearchScreen UI

The `SearchScreen` will be updated with new UI components for each feature.

#### UI Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Search Videos                                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─ Search Query ────────────────────────────────────────┐  │
│  │  [Search Input Field________________] [🔍 Search]     │  │
│  │                                                        │  │
│  │  Quick Search:                                         │  │
│  │  [🎌 Anime] [🎵 Music] [🎮 Gaming] [🎙️ Podcasts]      │  │
│  │  [📱 Social] [📚 Education]                            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ Search Filters ──────────────────────────────────────┐  │
│  │  Region: [wt-wt▼] Date: [Any▼] Duration: [Any▼]      │  │
│  │  Domain: [All▼] Content: [All▼]                       │  │
│  │  Quality: [Any▼] Format: [Any▼]  [⚙️ Advanced]        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  [Search] [Trending] [Recommended]  ← Tabs                   │
│                                                               │
│  ┌─ Results ─────────────────────────────────────────────┐  │
│  │  🎌 Bilibili | Attack on Titan EP01 | 24:30 | [+]    │  │
│  │     👁️ 1.2M views | 👍 45K | 📅 2024-01-15            │  │
│  │     🎬 4K, 1080p, 720p | 🏷️ anime, action, shonen     │  │
│  │                                                        │  │
│  │  🎵 SoundCloud | Lo-Fi Beats Mix | 45:00 | [+]        │  │
│  │     👁️ 500K views | 📅 2024-02-01                     │  │
│  │                                                        │  │
│  │  💡 Series detected! Found 12 episodes                │  │
│  │     [Download All] [Select Episodes]                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  [Add to Queue] [Clear Results]                              │
└─────────────────────────────────────────────────────────────┘
```

#### New UI Components

**1. Advanced Search Panel (Expandable)**
```python
class AdvancedSearchPanel(ttk.Frame):
    """Expandable panel for advanced search operators."""
    
    def __init__(self, parent):
        super().__init__(parent)
        self.setup_ui()
    
    def setup_ui(self):
        # Exact phrase checkbox + entry
        # Exclude terms entry
        # Must contain entry
        # File type filter
        # Build query button
        pass
    
    def get_operator_config(self):
        """Return dict with operator settings."""
        pass
```

**2. Metadata Display Widget**
```python
class MetadataTooltip(ttk.Frame):
    """Rich tooltip showing enriched metadata."""
    
    def show_metadata(self, result_data):
        """Display metadata in expandable section or tooltip."""
        # Show: views, likes, date, description, tags, qualities
        pass
```

**3. Platform Health Indicator**
```python
class PlatformHealthIndicator(ttk.Label):
    """Visual indicator for platform health status."""
    
    def set_status(self, status):
        """
        Set health status: healthy (✅), degraded (⚠️), broken (❌)
        """
        pass
```

**4. Trending Tab**
```python
class TrendingTab(ttk.Frame):
    """Tab for displaying trending content."""
    
    def __init__(self, parent, search_manager):
        super().__init__(parent)
        self.search_manager = search_manager
        self.setup_ui()
    
    def load_trending(self, category="all"):
        """Load and display trending content."""
        pass
```

**5. Recommendations Panel**
```python
class RecommendationsPanel(ttk.Frame):
    """Panel showing personalized recommendations."""
    
    def load_recommendations(self, history_manager):
        """Generate and display recommendations."""
        pass
```

**6. Batch Compare View**
```python
class BatchCompareDialog(ttk.Toplevel):
    """Dialog for comparing search results across platforms."""
    
    def __init__(self, parent, query, platforms):
        super().__init__(parent)
        self.query = query
        self.platforms = platforms
        self.setup_ui()
        self.perform_comparison()
    
    def display_comparison(self, results):
        """Display side-by-side comparison."""
        pass
```

**7. Series Detection Dialog**
```python
class SeriesDetectionDialog(ttk.Toplevel):
    """Dialog for handling detected series/playlists."""
    
    def __init__(self, parent, episodes):
        super().__init__(parent)
        self.episodes = episodes
        self.setup_ui()
    
    def get_selected_episodes(self):
        """Return list of selected episode URLs."""
        pass
```

### 3. Data Models

#### Enhanced VideoInfo

```python
@dataclass
class VideoInfo:
    """Extended with enriched metadata."""
    url: str
    title: str = ""
    thumbnail: str = ""
    duration: int = 0
    author: str = ""
    available_qualities: List[str] = field(default_factory=list)
    selected_quality: str = "best"
    filename: str = ""
    download_subtitles: bool = False
    
    # NEW: Enriched metadata fields
    view_count: int = 0
    like_count: int = 0
    upload_date: str = ""
    description: str = ""
    tags: List[str] = field(default_factory=list)
    platform: str = ""
    platform_category: str = ""
    platform_icon: str = ""
    platform_color: str = ""
```

#### New: SearchResult

```python
@dataclass
class SearchResult:
    """Structured search result with metadata."""
    id: str
    url: str
    title: str
    author: str
    duration: str
    thumbnail: str
    platform: str
    platform_category: str
    platform_icon: str
    platform_color: str
    
    # Enriched metadata (optional)
    view_count: Optional[int] = None
    like_count: Optional[int] = None
    upload_date: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    available_qualities: List[str] = field(default_factory=list)
    
    # Series detection
    is_part_of_series: bool = False
    series_name: Optional[str] = None
    episode_number: Optional[int] = None
```

#### New: UserPreferences

```python
@dataclass
class UserPreferences:
    """User preferences learned from history."""
    top_platforms: List[str] = field(default_factory=list)
    top_categories: List[str] = field(default_factory=list)
    preferred_quality: str = "1080p"
    preferred_format: str = "best"
    favorite_keywords: List[str] = field(default_factory=list)
    last_updated: datetime = field(default_factory=datetime.now)
```

## Error Handling

### Graceful Degradation

1. **Metadata Enrichment Failures**: If yt-dlp extraction fails for a result, display basic info and continue
2. **Platform Health Checks**: Use cached results, mark as "unknown" if test fails
3. **Series Detection**: If pattern matching fails, treat as single video
4. **Batch Search**: If one platform fails, continue with others
5. **Quality Pre-filtering**: If quality check fails, include result with warning

### Error Recovery Strategies

```python
class SearchManager:
    def enrich_result_safe(self, result):
        """Enrich with error handling."""
        try:
            return self.enrich_result(result)
        except Exception as e:
            self.logger.warning(f"Enrichment failed for {result['url']}: {e}")
            result['enrichment_failed'] = True
            return result
    
    def check_platform_health_safe(self, platform):
        """Check health with caching and fallback."""
        # Check cache first
        if platform in self.platform_health_cache:
            cached_time, status = self.platform_health_cache[platform]
            if time.time() - cached_time < self.cache_ttl:
                return status
        
        # Perform check with timeout
        try:
            status = self.check_platform_health(platform)
            self.platform_health_cache[platform] = (time.time(), status)
            return status
        except Exception:
            return "unknown"
```

## Testing Strategy

### Unit Tests

1. **SearchManager Methods**
   - Test preset search with mock DuckDuckGo responses
   - Test series detection with various query patterns
   - Test advanced query building with different operator combinations
   - Test metadata enrichment with mock yt-dlp responses
   - Test platform health checking with mock extractors

2. **Data Models**
   - Test SearchResult creation and validation
   - Test UserPreferences serialization
   - Test VideoInfo with enriched metadata

3. **UI Components**
   - Test AdvancedSearchPanel query building
   - Test MetadataTooltip rendering
   - Test SeriesDetectionDialog episode selection

### Integration Tests

1. **End-to-End Search Flow**
   - Preset search → results display → add to queue
   - Advanced search → quality filter → metadata enrichment
   - Series detection → episode selection → batch add

2. **Recommendation Engine**
   - Build history → analyze preferences → generate recommendations
   - Test with various history patterns

3. **Batch Compare**
   - Multi-platform search → ranking → display comparison

### Performance Tests

1. **Metadata Enrichment**
   - Test parallel enrichment with ThreadPoolExecutor
   - Measure time for 50 results enrichment
   - Target: < 5 seconds for 50 results

2. **Platform Health Checks**
   - Test caching effectiveness
   - Measure time for checking all platforms
   - Target: < 10 seconds for initial check, < 1 second for cached

3. **Series Detection**
   - Test with 24 episode search
   - Measure total search time
   - Target: < 15 seconds for full series detection

## Performance Considerations

### Optimization Strategies

1. **Parallel Processing**
   - Use `ThreadPoolExecutor` for metadata enrichment
   - Parallel platform health checks
   - Concurrent batch searches

2. **Caching**
   - Cache platform health status (1 hour TTL)
   - Cache user preferences (update on new download)
   - Cache trending results (15 minutes TTL)

3. **Lazy Loading**
   - Load metadata on-demand (expand to view)
   - Paginate search results if > 50
   - Load trending content only when tab is opened

4. **Rate Limiting**
   - Respect DuckDuckGo rate limits
   - Throttle yt-dlp extraction requests
   - Implement exponential backoff on failures

### Resource Management

```python
from concurrent.futures import ThreadPoolExecutor
import functools

class SearchManager:
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=5)
        self.rate_limiter = RateLimiter(max_calls=10, period=1)
    
    @functools.lru_cache(maxsize=100)
    def get_platform_category_cached(self, platform):
        """Cached platform category lookup."""
        return self.get_platform_category(platform)
    
    def shutdown(self):
        """Clean shutdown of thread pool."""
        self.executor.shutdown(wait=True)
```

## Security Considerations

1. **Input Validation**
   - Sanitize search queries to prevent injection
   - Validate URLs before passing to yt-dlp
   - Limit query length and complexity

2. **Rate Limiting**
   - Prevent abuse of search functionality
   - Implement cooldown between searches

3. **Error Information**
   - Don't expose internal paths in error messages
   - Log detailed errors, show generic messages to users

## Migration and Backward Compatibility

### Phased Rollout

**Phase 1 (Days 1-2)**
- Content presets (already implemented)
- Platform categories with icons
- Smart playlist detection
- No breaking changes to existing code

**Phase 2 (Days 3-5)**
- Quality pre-filtering
- Metadata enrichment
- Download history intelligence
- Extends existing SearchManager methods

**Phase 3 (Days 6-8)**
- Advanced search operators
- Batch compare
- Trending sections
- Platform health status
- New UI tabs and dialogs

### Configuration

New settings in `settings_manager`:
```python
{
    "search_enable_enrichment": True,
    "search_enable_quality_filter": True,
    "search_enable_recommendations": True,
    "search_cache_ttl": 3600,
    "search_max_parallel_enrichment": 5,
    "search_default_preset": None,
    "search_show_platform_health": True
}
```

## Dependencies

### Existing Dependencies (No Changes)
- `yt-dlp`: Video extraction and metadata
- `duckduckgo-search`: Search functionality
- `ttkbootstrap`: UI framework

### New Internal Dependencies
- `concurrent.futures`: Parallel processing
- `functools.lru_cache`: Caching
- `re`: Pattern matching for series detection
- `time`: Cache TTL management

No new external dependencies required.

## Deployment Considerations

1. **Settings Migration**: Add new settings with defaults
2. **UI Updates**: Gradual rollout of new UI components
3. **Performance Monitoring**: Log search times and enrichment success rates
4. **User Feedback**: Add telemetry for feature usage (opt-in)

## Future Enhancements

1. **Machine Learning Recommendations**: Use ML for better preference analysis
2. **Custom Platform Definitions**: Allow users to add custom platforms
3. **Search History**: Track and suggest previous searches
4. **Collaborative Filtering**: Recommend based on similar users (if cloud sync added)
5. **Advanced Filters**: Language, subtitles, codec, file size
6. **Search Scheduling**: Schedule searches for new episodes
7. **RSS/Atom Feeds**: Subscribe to channels/series
