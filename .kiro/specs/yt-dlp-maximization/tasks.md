# Implementation Plan

- [x] 1. Phase 1: Platform Categories and Visual Indicators
  - Implement platform categorization system with icons and colors
  - Update search results display to show category indicators
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 1.1 Define PLATFORM_CATEGORIES data structure in SearchManager
  - Add PLATFORM_CATEGORIES dictionary with Video Streaming, Anime, Music, Social Media, Gaming, and Podcasts categories
  - Include icon, color, and test_url for each category
  - Map existing platforms to appropriate categories
  - _Requirements: 2.1, 2.3_

- [x] 1.2 Implement get_platform_category() method
  - Write method to lookup category info for a given platform name
  - Return dict with icon, color, and category_name
  - Handle unknown platforms with default category
  - _Requirements: 2.3_

- [x] 1.3 Update _detect_platform() to return category information
  - Modify method to include platform category in result
  - Add platform_icon and platform_color to returned data
  - _Requirements: 2.2_

- [x] 1.4 Update SearchScreen results display with category icons
  - Modify display_results() to show category icon before platform name
  - Apply color coding to result rows based on platform category
  - Update treeview columns to include category indicator
  - _Requirements: 2.2, 2.4_

- [x] 2. Phase 1: Smart Playlist Detection
  - Implement automatic detection of episodic content
  - Create UI for series confirmation and episode selection
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 2.1 Implement detect_series() method in SearchManager
  - Check query for series keywords (season, episode, ep, part, vol)
  - Return dict with series detection info or None
  - Extract base query by removing episode numbers
  - _Requirements: 9.1_

- [x] 2.2 Implement find_all_episodes() method
  - Search for episodes using pattern matching (EP01, EP02, etc.)
  - Search up to 24 episodes with sequential numbering
  - Return list of episode results with metadata
  - Stop searching when no results found for 3 consecutive episodes
  - _Requirements: 9.2, 9.4_

- [x] 2.3 Create SeriesDetectionDialog UI component
  - Build dialog showing detected episodes count
  - Add "Download All" and "Select Episodes" buttons
  - Implement episode selection checkboxes for manual selection
  - Return selected episode URLs when confirmed
  - _Requirements: 9.3_

- [x] 2.4 Integrate series detection into search flow
  - Call detect_series() after search completes
  - Show SeriesDetectionDialog when series detected
  - Add selected episodes to queue with user's quality preference
  - _Requirements: 9.3, 9.5_

- [x] 3. Phase 2: Quality and Format Pre-filtering
  - Add quality and format filters to search interface
  - Implement yt-dlp quality verification before displaying results
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3.1 Add QUALITY_FILTERS and FORMAT_FILTERS to SearchManager
  - Define quality filter options (4K, 1080p, 720p, 480p)
  - Define format filter options (Video+Audio, Video Only, Audio Only)
  - _Requirements: 4.1, 4.3_

- [x] 3.2 Implement check_video_quality() method
  - Use yt-dlp extract_info() to get available formats
  - Parse format list to extract quality options
  - Return list of available quality strings
  - Handle extraction failures gracefully
  - _Requirements: 4.2, 4.5_

- [x] 3.3 Implement search_with_quality_filter() method
  - Execute standard search first
  - Filter results by calling check_video_quality() for each
  - Exclude results not meeting quality/format criteria
  - Run quality checks in parallel using ThreadPoolExecutor
  - _Requirements: 4.2, 4.4_

- [x] 3.4 Add quality and format filter dropdowns to SearchScreen
  - Add Quality combobox with filter options
  - Add Format combobox with filter options
  - Update perform_search() to pass filter parameters
  - Show loading indicator during quality verification
  - _Requirements: 4.1, 4.3_

- [x] 4. Phase 2: Metadata Enrichment
  - Enrich search results with detailed metadata from yt-dlp
  - Display enriched metadata in results view
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4.1 Implement enrich_result() method in SearchManager
  - Extract view_count, like_count, upload_date from yt-dlp
  - Extract description (first 200 chars) and tags (first 5)
  - Extract available_qualities list
  - Handle extraction failures and return partial data
  - _Requirements: 5.1, 5.3_

- [x] 4.2 Implement enrich_results_batch() method
  - Use ThreadPoolExecutor for parallel enrichment
  - Set max_workers=5 to avoid rate limiting
  - Collect enriched results as they complete
  - Log enrichment failures without blocking
  - _Requirements: 5.1_

- [x] 4.3 Update SearchResult data model
  - Add view_count, like_count, upload_date fields
  - Add description, tags, available_qualities fields
  - Add enrichment_failed flag for error tracking
  - _Requirements: 5.1, 5.4_

- [x] 4.4 Create MetadataTooltip UI component
  - Build expandable panel showing enriched metadata
  - Display view count, likes, upload date
  - Show description preview and tags
  - Show available quality options
  - _Requirements: 5.2_

- [x] 4.5 Integrate metadata display into SearchScreen
  - Add expand/collapse button to each result row
  - Show MetadataTooltip when result is expanded
  - Call enrich_results_batch() after search completes
  - Display loading indicator during enrichment
  - _Requirements: 5.2_

- [x] 5. Phase 2: Download History Intelligence
  - Analyze download history to learn user preferences
  - Generate personalized recommendations
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 5.1 Create UserPreferences data model
  - Define fields for top_platforms, top_categories
  - Add preferred_quality and preferred_format
  - Add favorite_keywords list
  - Include last_updated timestamp
  - _Requirements: 7.1_

- [x] 5.2 Implement analyze_user_preferences() method
  - Count platform usage from download history
  - Identify top 3 most-used platforms
  - Extract common keywords from video titles
  - Determine most common quality selection
  - Return UserPreferences object
  - _Requirements: 7.1, 7.2_

- [x] 5.3 Implement get_recommendations() method
  - Call analyze_user_preferences() to get user profile
  - Search for latest content from top platforms
  - Use time limit of 1 week for recency
  - Return up to 20 recommended results
  - _Requirements: 7.2, 7.4_

- [x] 5.4 Create RecommendationsPanel UI component
  - Build tab showing "Recommended for You" section
  - Display recommendations in same format as search results
  - Add refresh button to regenerate recommendations
  - Show message when no history available
  - _Requirements: 7.3_

- [x] 5.5 Add Recommended tab to SearchScreen
  - Create tab alongside Search and Trending tabs
  - Load recommendations when tab is opened
  - Integrate with existing add-to-queue functionality
  - _Requirements: 7.3_

- [x] 6. Phase 3: Smart Search Operators
  - Implement advanced search operators interface
  - Build DuckDuckGo queries with operator syntax
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 6.1 Add SEARCH_OPERATORS dictionary to SearchManager
  - Define operator templates for exact_phrase, exclude, or_logic
  - Add site, filetype, intitle, inurl operators
  - _Requirements: 3.2_

- [x] 6.2 Implement build_advanced_query() method
  - Accept base query and operators_config dict
  - Apply operator templates to build final query string
  - Handle multiple operators in correct precedence
  - Return constructed query string
  - _Requirements: 3.3_

- [x] 6.3 Implement search_advanced() method
  - Accept base query and individual operator parameters
  - Build operators_config from parameters
  - Call build_advanced_query() to construct query
  - Execute search with constructed query
  - _Requirements: 3.2, 3.3_

- [x] 6.4 Create AdvancedSearchPanel UI component
  - Build expandable panel with operator inputs
  - Add exact phrase checkbox and entry field
  - Add exclude terms entry field
  - Add must contain entry field
  - Add filetype filter dropdown
  - Add "Build Query" button showing constructed query
  - _Requirements: 3.1, 3.4_

- [x] 6.5 Integrate AdvancedSearchPanel into SearchScreen
  - Add "Advanced" toggle button in filters section
  - Show/hide AdvancedSearchPanel when toggled
  - Update perform_search() to use advanced operators when active
  - Display constructed query for user verification
  - _Requirements: 3.1, 3.4_

- [x] 7. Phase 3: Batch Search and Platform Comparison
  - Implement multi-platform search with comparison view
  - Rank and display results side-by-side
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 7.1 Implement compare_platforms() method
  - Accept query and list of platforms
  - Execute parallel searches for each platform
  - Collect results in dict mapping platform to results
  - Set limit_per_platform to 5 results
  - _Requirements: 8.1, 8.2_

- [x] 7.2 Implement rank_comparison_results() method
  - Score results based on quality, view count, upload date
  - Assign weights: quality (40%), views (30%), recency (30%)
  - Sort results within each platform by score
  - Return ranked results dict
  - _Requirements: 8.4_

- [x] 7.3 Create BatchCompareDialog UI component
  - Build dialog with platform columns
  - Display results grouped by platform
  - Show quality, view count for each result
  - Add "Add to Queue" button for each result
  - Highlight best result across platforms
  - _Requirements: 8.3, 8.5_

- [x] 7.4 Add "Compare Platforms" button to SearchScreen
  - Show button in filters section
  - Open platform selection dialog when clicked
  - Launch BatchCompareDialog with selected platforms
  - _Requirements: 8.1_

- [x] 8. Phase 3: Trending and Popular Sections
  - Add trending content discovery by category
  - Implement trending tab with category filters
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 8.1 Implement get_trending() method in SearchManager
  - Define trending query templates for each category
  - Use time-limited search (past week) for recency
  - Return up to 20 trending results
  - Support "all" category for general trending
  - _Requirements: 6.2, 6.3_

- [x] 8.2 Create TrendingTab UI component
  - Build tab with category filter buttons
  - Display trending results in standard format
  - Add refresh button to reload trending content
  - Show loading indicator during fetch
  - _Requirements: 6.1, 6.4_

- [x] 8.3 Add Trending tab to SearchScreen
  - Create tab alongside Search tab
  - Load trending content when tab is opened
  - Integrate with existing add-to-queue functionality
  - Cache trending results for 15 minutes
  - _Requirements: 6.1, 6.4_

- [x] 9. Phase 3: Platform Health Status
  - Implement platform health checking system
  - Display health indicators in UI
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 9.1 Implement check_platform_health() method
  - Use test URLs from PLATFORM_CATEGORIES
  - Call yt-dlp extract_info() with test URL
  - Return "healthy" if extraction succeeds
  - Return "broken" if extraction fails
  - Return "unknown" if no test URL defined
  - _Requirements: 10.2, 10.3, 10.4, 10.5_

- [x] 9.2 Implement check_all_platforms_health() method
  - Iterate through all categorized platforms
  - Call check_platform_health() for each
  - Cache results with 1-hour TTL
  - Return dict mapping platform to health status
  - Run checks in parallel using ThreadPoolExecutor
  - _Requirements: 10.1, 10.2_

- [x] 9.3 Create PlatformHealthIndicator UI component
  - Build label with status icon (✅ ⚠️ ❌ ❓)
  - Update icon based on health status
  - Add tooltip showing last check time
  - _Requirements: 10.1_

- [x] 9.4 Add platform health indicators to SearchScreen
  - Show health status in domain filter dropdown
  - Display indicator next to each platform name
  - Update indicators when filter is opened
  - Add "Refresh Status" button
  - _Requirements: 10.1_

- [x] 10. Integration and Polish
  - Wire all components together
  - Add configuration settings
  - Implement caching and performance optimizations

- [x] 10.1 Add new settings to SettingsManager
  - Add search_enable_enrichment setting (default: True)
  - Add search_enable_quality_filter setting (default: True)
  - Add search_enable_recommendations setting (default: True)
  - Add search_cache_ttl setting (default: 3600)
  - Add search_max_parallel_enrichment setting (default: 5)
  - Add search_show_platform_health setting (default: True)

- [x] 10.2 Implement caching system in SearchManager
  - Add platform_health_cache dict with TTL tracking
  - Add trending_cache dict with 15-minute TTL
  - Implement cache cleanup on TTL expiration
  - Add functools.lru_cache for platform category lookups

- [x] 10.3 Add ThreadPoolExecutor management
  - Initialize executor in SearchManager.__init__()
  - Set max_workers=5 for parallel operations
  - Implement shutdown() method for clean executor shutdown
  - Ensure executor is shutdown when app closes

- [x] 10.4 Update SearchScreen tab navigation
  - Implement ttk.Notebook for Search/Trending/Recommended tabs
  - Load content lazily when tab is activated
  - Preserve search results when switching tabs
  - Add tab icons for visual clarity

- [x] 10.5 Add loading indicators and progress feedback
  - Show spinner during metadata enrichment
  - Display progress bar for batch operations
  - Add status messages for long-running operations
  - Implement cancellation for background tasks

- [x] 10.6 Implement error handling and logging
  - Add try-except blocks for all yt-dlp operations
  - Log errors with context (URL, operation, timestamp)
  - Show user-friendly error messages
  - Implement graceful degradation for failed enrichment

- [ ] 10.7 Write integration tests for complete workflows
  - Test preset search → series detection → batch add flow
  - Test advanced search → quality filter → enrichment flow
  - Test recommendations generation from history
  - Test batch compare across multiple platforms
  - Test platform health checking with mock responses

- [x] 10.8 Update documentation and help text
  - Add tooltips explaining new features
  - Update README with new capabilities
  - Create user guide for advanced search operators
  - Document platform categories and supported sites
