import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  Grid,
  List,
  Layers,
  Plus,
  Play,
  Film,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  SlidersHorizontal,
  X,
  History,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  ExternalLink,
  Download,
  ArrowUpDown,
  Clock,
  Zap,
  Smartphone,
  Tv,
  Disc3,
  Video
} from 'lucide-react';
import { SearchResult } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { SurfaceCard } from '../components/common/SurfaceCard';
import { EmptyState } from '../components/common/EmptyState';

interface SearchScreenProps {
  onAddToQueue: (item: SearchResult) => void;
  onAddBatchToQueue?: (items: SearchResult[]) => void;
  onOpenCompare: (items: SearchResult[]) => void;
  onOpenSeries: (item: SearchResult) => void;
  onPreviewMedia: (title: string, url: string, thumb?: string) => void;
  onAddDirectUrl?: (url: string) => void;
  theme?: 'dark' | 'light';
}

const RECENT_SEARCHES_KEY = 'klyp_search_history';
const TRENDING_TAGS = [
  'Attack on Titan',
  'Solo Leveling',
  'Synthwave',
  'Spirited Away',
  'TikTok Dance',
  'Cyberpunk Edgerunners',
  '4K Nature HDR'
];

const AUDIOVISUAL_FORMATS = [
  { id: 'Any', label: 'All Formats', icon: '🌐', countDesc: 'All audiovisual media' },
  { id: 'movie', label: 'Movies & Films', icon: '🎬', countDesc: 'Feature films & OVAs (60+ min)' },
  { id: 'series', label: 'Series & Anime', icon: '🎌', countDesc: 'Episodic series & AnimeFLV packages' },
  { id: 'short', label: 'Shorts & Reels', icon: '⚡', countDesc: 'Clean vertical MP4 (TikTok / Shorts)' },
  { id: 'clip', label: 'Clips & Shows', icon: '📹', countDesc: 'General clips & documentaries' },
];

export const SearchScreen: React.FC<SearchScreenProps> = ({
  onAddToQueue,
  onAddBatchToQueue,
  onOpenCompare,
  onOpenSeries,
  onPreviewMedia,
  onAddDirectUrl,
  theme = 'dark',
}) => {
  const [query, setQuery] = useState<string>('Attack on Titan');
  const [region, setRegion] = useState<string>('wt-wt');
  const [domain, setDomain] = useState<string>('All');
  const [activePreset, setActivePreset] = useState<string>('All');
  const [qualityFilter, setQualityFilter] = useState<string>('Any');
  const [formatFilter, setFormatFilter] = useState<string>('Any');
  const [durationFilter, setDurationFilter] = useState<string>('Any');
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Suggestions & History State
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState<number>(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);

  const searchBoxRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isDark = theme === 'dark';

  // Detect direct URL pasted in search bar
  const isDirectUrl = /^(https?:\/\/)/i.test(query.trim());

  const presets = [
    { id: 'All', label: 'All Content', icon: '🌐' },
    { id: 'Anime', label: 'Anime & Series', icon: '🎌', domain: 'AnimeFLV' },
    { id: 'Movies', label: 'Feature Films', icon: '🎬', format: 'movie' },
    { id: 'Shorts', label: 'Shorts & TikTok', icon: '⚡', domain: 'TikTok', format: 'short' },
    { id: 'Music', label: 'Music & Audio', icon: '🎵', domain: 'SoundCloud' },
    { id: 'Gaming', label: 'Gaming & Streams', icon: '🎮', domain: 'Twitch' },
  ];

  const domainOptions = [
    'All',
    'AnimeFLV',
    'YouTube',
    'SoundCloud',
    'Vimeo',
    'Bilibili',
    'TikTok',
    'Twitch',
    'Dailymotion'
  ];

  // Save query to recent searches
  const saveRecentSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || isDirectUrl) return;
    setRecentSearches((prev) => {
      const updated = [trimmed, ...prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const removeRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== term);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {}
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live autocomplete debouncing
  useEffect(() => {
    if (!query.trim() || isDirectUrl) {
      setSuggestions([]);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.suggestions)) {
            setSuggestions(data.suggestions.slice(0, 6));
          }
        }
      } catch {
        // Non-fatal suggestion failure
      }
    }, 280);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, isDirectUrl]);

  // Main search execution function
  const performSearch = async (
    searchQuery = query,
    searchDomain = domain,
    searchQuality = qualityFilter,
    searchFormat = formatFilter,
    searchDuration = durationFilter,
    searchSortBy = sortBy,
    offset = 0,
    append = false
  ) => {
    if (!searchQuery.trim()) return;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
      setHasSearched(true);
      setSelectedForCompare(new Set());
    }

    setShowSuggestions(false);
    saveRecentSearch(searchQuery);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery.trim(),
          region,
          domain: searchDomain,
          quality: searchQuality,
          format: searchFormat,
          duration: searchDuration,
          sortBy: searchSortBy,
          limit: 18,
          offset
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Search failed with status ${res.status}`);
      }

      const data = await res.json();
      const newItems: SearchResult[] = data.results || [];

      if (append) {
        setResults((prev) => [...prev, ...newItems]);
      } else {
        setResults(newItems);
      }

      setHasMore(Boolean(data.has_more));
      setTotalCount(data.total || (append ? results.length + newItems.length : newItems.length));
    } catch (err: any) {
      console.error('Failed to perform search:', err);
      if (!append) {
        setResults([]);
        setError(err.message || 'Unable to connect to search service. Please retry.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    performSearch(
      query,
      domain,
      qualityFilter,
      formatFilter,
      durationFilter,
      sortBy,
      results.length,
      true
    );
  };

  const handlePresetClick = (preset: typeof presets[0]) => {
    setActivePreset(preset.id);
    const newDomain = preset.domain || 'All';
    const newFormat = preset.format || formatFilter;
    setDomain(newDomain);
    if (preset.format) setFormatFilter(preset.format);
    performSearch(query, newDomain, qualityFilter, newFormat, durationFilter, sortBy, 0, false);
  };

  const handleResetFilters = () => {
    setDomain('All');
    setActivePreset('All');
    setQualityFilter('Any');
    setFormatFilter('Any');
    setDurationFilter('Any');
    setSortBy('relevance');
    performSearch(query, 'All', 'Any', 'Any', 'Any', 'relevance', 0, false);
  };

  const toggleCompare = (id: string) => {
    setSelectedForCompare((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedForCompare.size === displayedResults.length && displayedResults.length > 0) {
      setSelectedForCompare(new Set());
    } else {
      setSelectedForCompare(new Set(displayedResults.map((r) => r.id)));
    }
  };

  const openCompareModal = () => {
    const selected = results.filter((r) => selectedForCompare.has(r.id));
    if (selected.length > 0) {
      onOpenCompare(selected);
    }
  };

  const handleBatchEnqueue = () => {
    const selected = displayedResults.filter((r) => selectedForCompare.has(r.id));
    if (selected.length === 0) return;
    if (onAddBatchToQueue) {
      onAddBatchToQueue(selected);
    } else {
      selected.forEach((item) => onAddToQueue(item));
    }
    setSelectedForCompare(new Set());
  };

  const handleCopyUrl = (url: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedUrlId(id);
    setTimeout(() => {
      setCopiedUrlId(null);
    }, 2000);
  };

  const handleDirectDownload = () => {
    if (!query.trim() || !isDirectUrl) return;
    if (onAddDirectUrl) {
      onAddDirectUrl(query.trim());
    } else {
      onAddToQueue({
        id: `direct-${Date.now()}`,
        url: query.trim(),
        title: query.trim(),
        author: 'Direct URL Stream',
        duration: 'Unknown',
        thumbnail: '',
        platform: 'Web',
        platform_category: 'Direct Download',
        platform_icon: '⚡',
        platform_color: '#10b981'
      });
    }
  };

  // Perform initial search on mount
  useEffect(() => {
    performSearch();
  }, []);

  const activeFiltersCount =
    (domain !== 'All' ? 1 : 0) +
    (qualityFilter !== 'Any' ? 1 : 0) +
    (formatFilter !== 'Any' ? 1 : 0) +
    (durationFilter !== 'Any' ? 1 : 0) +
    (sortBy !== 'relevance' ? 1 : 0);

  // Client-side quick filter view
  const displayedResults = results.filter((item) => {
    if (formatFilter === 'Any') return true;
    if (formatFilter === 'movie') return item.format_type === 'movie';
    if (formatFilter === 'series') return item.format_type === 'series' || item.is_part_of_series;
    if (formatFilter === 'short') return item.format_type === 'short';
    if (formatFilter === 'clip') return item.format_type === 'clip' || (!item.format_type && !item.is_part_of_series);
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* 1. Header Bar */}
      <PageHeader
        icon={<Search className="w-5 h-5 text-[#10b981]" />}
        title="Universal Audiovisual Search"
        description="Search movies, multi-episode series (AnimeFLV, YouTube), clean vertical shorts, documentaries and music across multiple platforms."
        theme={theme}
        actionSlot={
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className={`flex items-center p-0.5 rounded-lg border ${
              isDark ? 'bg-[#1e1e1e] border-[#2d2d2d]' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                  viewMode === 'grid'
                    ? isDark ? 'bg-[#252526] text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                    : isDark ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                  viewMode === 'list'
                    ? isDark ? 'bg-[#252526] text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                    : isDark ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        }
      />

      {/* 2. Primary Search Box with Autocomplete & Direct Link Detection */}
      <SurfaceCard theme={theme} className="p-5 space-y-4 shadow-sm relative">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            performSearch();
          }}
          className="flex flex-col sm:flex-row gap-3 relative"
        >
          <div ref={searchBoxRef} className="relative flex-1">
            <Search className={`w-4 h-4 absolute left-3.5 top-3.5 ${isDark ? 'text-gray-400' : 'text-slate-400'}`} />
            
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
                setSelectedSuggestionIdx(-1);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                const totalOptions = suggestions.length > 0 ? suggestions.length : 0;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedSuggestionIdx((prev) => (prev < totalOptions - 1 ? prev + 1 : 0));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedSuggestionIdx((prev) => (prev > 0 ? prev - 1 : totalOptions - 1));
                } else if (e.key === 'Enter' && selectedSuggestionIdx >= 0 && suggestions[selectedSuggestionIdx]) {
                  e.preventDefault();
                  const chosen = suggestions[selectedSuggestionIdx];
                  setQuery(chosen);
                  performSearch(chosen);
                } else if (e.key === 'Escape') {
                  setShowSuggestions(false);
                }
              }}
              placeholder="Search movies, anime series, TikTok shorts, YouTube, AnimeFLV or paste URL..."
              className={`w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm font-mono focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all ${
                isDark
                  ? 'bg-[#1e1e1e] border-[#2d2d2d] text-white placeholder:text-gray-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
              }`}
            />

            {/* Clear button */}
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSuggestions([]);
                }}
                className={`absolute right-3 top-3 p-0.5 rounded hover:bg-gray-700/50 cursor-pointer ${
                  isDark ? 'text-gray-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Autocomplete & Recent Searches Dropdown */}
            {showSuggestions && (suggestions.length > 0 || recentSearches.length > 0) && (
              <div
                className={`absolute left-0 right-0 top-full mt-1.5 z-40 rounded-lg border shadow-xl overflow-hidden backdrop-blur-md ${
                  isDark
                    ? 'bg-[#1f1f23]/95 border-[#2d2d2d] text-gray-200'
                    : 'bg-white/95 border-slate-200 text-slate-800'
                }`}
              >
                {/* Real-time suggestions */}
                {suggestions.length > 0 && (
                  <div className="py-1">
                    <div className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                      isDark ? 'text-gray-400' : 'text-slate-400'
                    }`}>
                      Suggestions
                    </div>
                    {suggestions.map((item, idx) => (
                      <button
                        key={`sug-${idx}`}
                        type="button"
                        onClick={() => {
                          setQuery(item);
                          performSearch(item);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          selectedSuggestionIdx === idx
                            ? 'bg-[#10b981]/20 text-[#10b981]'
                            : isDark
                            ? 'hover:bg-[#2a2a2f] text-gray-200'
                            : 'hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Search className="w-3.5 h-3.5 opacity-60" />
                          <span>{item}</span>
                        </span>
                        <span className="text-[10px] opacity-40 font-mono">Select</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Recent searches */}
                {recentSearches.length > 0 && (
                  <div className={`py-1 border-t ${isDark ? 'border-[#2d2d2d]' : 'border-slate-100'}`}>
                    <div className="flex items-center justify-between px-3 py-1">
                      <span className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                        isDark ? 'text-gray-400' : 'text-slate-400'
                      }`}>
                        <History className="w-3 h-3" />
                        Recent Searches
                      </span>
                      <button
                        type="button"
                        onClick={clearRecentSearches}
                        className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                    {recentSearches.map((term, idx) => (
                      <div
                        key={`rec-${idx}`}
                        onClick={() => {
                          setQuery(term);
                          performSearch(term);
                        }}
                        className={`px-3.5 py-1.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isDark ? 'hover:bg-[#2a2a2f] text-gray-300' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          <span>{term}</span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => removeRecentSearch(term, e)}
                          className="text-gray-500 hover:text-red-400 p-1"
                          title="Remove from history"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                showAdvancedFilters || activeFiltersCount > 0
                  ? 'border-[#10b981]/50 bg-[#10b981]/15 text-[#10b981]'
                  : isDark
                  ? 'bg-[#1e1e1e] border-[#2d2d2d] text-gray-300 hover:bg-[#282828]'
                  : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#10b981] text-black text-[10px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
              {showAdvancedFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-sm font-semibold shadow-md shadow-[#10b981]/20 disabled:opacity-50 transition-all cursor-pointer shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Search</span>
            </button>
          </div>
        </form>

        {/* Direct Link Detection Callout Banner */}
        {isDirectUrl && (
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg border animate-fadeIn ${
            isDark ? 'bg-[#10b981]/10 border-[#10b981]/30 text-white' : 'bg-emerald-50 border-emerald-200 text-emerald-950'
          }`}>
            <div className="flex items-center gap-2.5 text-xs font-mono">
              <Sparkles className="w-4 h-4 text-[#10b981] shrink-0" />
              <span>Direct media link detected! You can download this URL directly without searching catalog.</span>
            </div>
            <button
              type="button"
              onClick={handleDirectDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold shadow cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Extract & Download Now</span>
            </button>
          </div>
        )}

        {/* Content Presets & Trending Tags */}
        <div className={`flex flex-wrap items-center justify-between gap-2 border-t pt-3 ${isDark ? 'border-[#2d2d2d]' : 'border-slate-200'}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-medium mr-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Category:</span>
            {presets.map((preset) => {
              const isActive = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                    isActive
                      ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/40 font-semibold'
                      : isDark
                      ? 'bg-[#1e1e1e] border-[#2d2d2d] text-gray-300 hover:text-white hover:bg-[#282828]'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick trending suggestions pills */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs">
            <span className={`text-[11px] font-mono ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Trending:</span>
            {TRENDING_TAGS.slice(0, 4).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setQuery(tag);
                  performSearch(tag);
                }}
                className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  isDark
                    ? 'border-[#2d2d2d] bg-[#1a1a1e] text-gray-400 hover:text-[#10b981] hover:border-[#10b981]/40'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 border-t pt-3.5 text-xs animate-in fade-in duration-200 ${
            isDark ? 'border-[#2d2d2d]' : 'border-slate-200'
          }`}>
            <div>
              <label className={`block mb-1 font-mono text-[11px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Platform Scope:</label>
              <select
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value);
                  performSearch(query, e.target.value, qualityFilter, formatFilter, durationFilter, sortBy, 0, false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-[#10b981] ${
                  isDark ? 'bg-[#1e1e1e] border-[#2d2d2d] text-gray-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                {domainOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block mb-1 font-mono text-[11px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Quality Filter:</label>
              <select
                value={qualityFilter}
                onChange={(e) => {
                  setQualityFilter(e.target.value);
                  performSearch(query, domain, e.target.value, formatFilter, durationFilter, sortBy, 0, false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-[#10b981] ${
                  isDark ? 'bg-[#1e1e1e] border-[#2d2d2d] text-gray-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                <option value="Any">Any Quality</option>
                <option value="2160">4K (2160p)</option>
                <option value="1080">Full HD (1080p)</option>
                <option value="720">HD (720p)</option>
                <option value="480">SD (480p)</option>
              </select>
            </div>

            <div>
              <label className={`block mb-1 font-mono text-[11px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Format Stream:</label>
              <select
                value={formatFilter}
                onChange={(e) => {
                  setFormatFilter(e.target.value);
                  performSearch(query, domain, qualityFilter, e.target.value, durationFilter, sortBy, 0, false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-[#10b981] ${
                  isDark ? 'bg-[#1e1e1e] border-[#2d2d2d] text-gray-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                <option value="Any">Any Format</option>
                <option value="movie">Movies & Films</option>
                <option value="series">Series & Anime</option>
                <option value="short">Shorts & Reels</option>
                <option value="clip">Clips & Video</option>
                <option value="audio">Audio Only (MP3/FLAC)</option>
              </select>
            </div>

            <div>
              <label className={`block mb-1 font-mono text-[11px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Duration:</label>
              <select
                value={durationFilter}
                onChange={(e) => {
                  setDurationFilter(e.target.value);
                  performSearch(query, domain, qualityFilter, formatFilter, e.target.value, sortBy, 0, false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-[#10b981] ${
                  isDark ? 'bg-[#1e1e1e] border-[#2d2d2d] text-gray-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                <option value="Any">Any Duration</option>
                <option value="short">Short (&lt; 4 min)</option>
                <option value="medium">Medium (4 - 20 min)</option>
                <option value="long">Long (&gt; 20 min)</option>
              </select>
            </div>

            <div>
              <label className={`block mb-1 font-mono text-[11px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Sort By:</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  performSearch(query, domain, qualityFilter, formatFilter, durationFilter, e.target.value, 0, false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-[#10b981] ${
                  isDark ? 'bg-[#1e1e1e] border-[#2d2d2d] text-gray-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                <option value="relevance">Relevance</option>
                <option value="views">Most Viewed</option>
                <option value="date">Newest First</option>
                <option value="duration_desc">Longest First</option>
                <option value="duration_asc">Shortest First</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                  isDark
                    ? 'border-[#2d2d2d] bg-[#1e1e1e] text-gray-400 hover:text-white hover:bg-[#282828]'
                    : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All</span>
              </button>
            </div>
          </div>
        )}
      </SurfaceCard>

      {/* 2.5 Audiovisual Format Tabs (Zero-Pill Discipline) */}
      <div className={`p-1.5 rounded-xl border flex flex-wrap items-center gap-1.5 shadow-xs ${
        isDark ? 'bg-[#252526] border-[#333333]' : 'bg-slate-100 border-slate-200'
      }`}>
        {AUDIOVISUAL_FORMATS.map((fmt) => {
          const isActive = formatFilter === fmt.id;
          const count = fmt.id === 'Any'
            ? results.length
            : results.filter((r) => {
                if (fmt.id === 'movie') return r.format_type === 'movie';
                if (fmt.id === 'series') return r.format_type === 'series' || r.is_part_of_series;
                if (fmt.id === 'short') return r.format_type === 'short';
                if (fmt.id === 'clip') return r.format_type === 'clip' || (!r.format_type && !r.is_part_of_series);
                return true;
              }).length;

          return (
            <button
              key={fmt.id}
              onClick={() => {
                setFormatFilter(fmt.id);
                performSearch(query, domain, qualityFilter, fmt.id, durationFilter, sortBy, 0, false);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#10b981] text-white shadow-sm font-semibold'
                  : isDark
                  ? 'text-gray-300 hover:text-white hover:bg-white/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
              title={fmt.countDesc}
            >
              <span>{fmt.icon}</span>
              <span>{fmt.label}</span>
              {hasSearched && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums font-mono ${
                  isActive ? 'bg-black/25 text-white' : isDark ? 'bg-white/10 text-gray-400' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Floating Batch Action Bar */}
      {selectedForCompare.size > 0 && (
        <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 shadow-lg animate-fadeIn ${
          isDark ? 'bg-[#1f1f23] border-[#10b981]/50 text-white' : 'bg-white border-[#10b981]/60 text-slate-900'
        }`}>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-[#10b981]"
            >
              {selectedForCompare.size === displayedResults.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>{selectedForCompare.size} of {displayedResults.length} selected</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchEnqueue}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold shadow cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Selected ({selectedForCompare.size}) to Queue</span>
            </button>

            <button
              onClick={openCompareModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow cursor-pointer transition-all"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Compare ({selectedForCompare.size})</span>
            </button>

            <button
              onClick={() => setSelectedForCompare(new Set())}
              className={`px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer ${
                isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* 4. Results Status Bar */}
      <div className={`flex flex-wrap items-center justify-between text-xs px-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
        <div className="flex items-center gap-3">
          <span>
            {loading
              ? 'Searching multi-platform catalog...'
              : hasSearched
              ? `Showing ${displayedResults.length} items for "${query}"`
              : 'Enter keywords above to explore catalog'}
          </span>
          {displayedResults.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="text-[#10b981] hover:underline cursor-pointer font-mono"
            >
              {selectedForCompare.size === displayedResults.length ? 'Deselect all' : 'Select all'}
            </button>
          )}
        </div>

        {displayedResults.length > 0 && (
          <span className="font-mono text-[11px]">
            Platform: {domain} • Format: {formatFilter} • Sort: {sortBy}
          </span>
        )}
      </div>

      {/* 5. Actionable Error State */}
      {error && !loading && (
        <SurfaceCard theme={theme} className="p-6 border-red-500/40 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <h4 className="font-semibold text-sm text-red-400">Search Failed</h4>
              <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{error}</p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => performSearch()}
                  className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow cursor-pointer transition-all"
                >
                  Retry Search
                </button>
                <button
                  onClick={() => {
                    setDomain('YouTube');
                    performSearch(query, 'YouTube');
                  }}
                  className={`px-3 py-1.5 rounded-md border text-xs cursor-pointer ${
                    isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Try YouTube Fallback
                </button>
              </div>
            </div>
          </div>
        </SurfaceCard>
      )}

      {/* 6. Results Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#10b981]" />
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Fetching media streams across networks...</p>
        </div>
      ) : displayedResults.length === 0 && !error ? (
        <SurfaceCard theme={theme} className="p-8 max-w-lg mx-auto">
          <EmptyState
            icon={<Search className="w-6 h-6" />}
            title="No media found"
            description={`No results discovered for "${query}". Try resetting filters or searching with alternative keywords.`}
            action={{
              label: 'Reset Filters & Search',
              onClick: handleResetFilters
            }}
            theme={theme}
          />
        </SurfaceCard>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedResults.map((item) => {
            const isCompared = selectedForCompare.has(item.id);
            const isCopied = copiedUrlId === item.id;
            const isMovie = item.format_type === 'movie';
            const isSeries = item.format_type === 'series' || item.is_part_of_series;
            const isShort = item.format_type === 'short';

            return (
              <SurfaceCard
                key={item.id}
                theme={theme}
                className={`group flex flex-col overflow-hidden transition-all ${
                  isCompared
                    ? 'border-[#10b981] ring-1 ring-[#10b981]'
                    : isDark
                    ? 'hover:border-[#10b981]/50'
                    : 'hover:border-[#10b981]/50'
                }`}
              >
                {/* Thumbnail Header */}
                <div className="relative aspect-video w-full bg-black overflow-hidden">
                  <img
                    src={item.thumbnail || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400'}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Format Typographic Badge (Zero-Pill Discipline) */}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                    {isMovie ? (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider rounded bg-indigo-500/90 text-white shadow-md uppercase">
                        MOVIE · {item.duration}
                      </span>
                    ) : item.total_seasons && item.total_seasons > 1 ? (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider rounded bg-purple-600/90 text-white shadow-md uppercase">
                        FRANCHISE · {item.total_seasons} SEASONS · {item.total_episodes || 'EPS'}
                      </span>
                    ) : isSeries ? (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider rounded bg-emerald-600/90 text-white shadow-md uppercase">
                        SERIES · {item.total_episodes ? `${item.total_episodes} EPS` : 'EPISODES'}
                      </span>
                    ) : isShort ? (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider rounded bg-cyan-600/90 text-white shadow-md uppercase">
                        SHORT · {item.duration}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider rounded bg-slate-700/90 text-white shadow-md uppercase">
                        CLIP · {item.duration}
                      </span>
                    )}
                  </div>

                  {/* Platform badge */}
                  <span
                    className="absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold rounded-md text-white shadow-md flex items-center gap-1 z-10"
                    style={{ backgroundColor: item.platform_color || '#10b981' }}
                  >
                    <span>{item.platform_icon}</span>
                    <span>{item.platform}</span>
                  </span>

                  {/* Duration badge */}
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-xs font-mono font-medium bg-black/80 text-white rounded z-10">
                    {item.duration}
                  </span>

                  {/* Checkbox badge for multi-select */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCompare(item.id);
                    }}
                    className={`absolute bottom-2 left-2 p-1 rounded-md backdrop-blur-md transition-colors cursor-pointer z-10 ${
                      isCompared
                        ? 'bg-[#10b981] text-black font-bold'
                        : 'bg-black/60 text-white hover:bg-black/80'
                    }`}
                    title={isCompared ? 'Deselect item' : 'Select item for batch download'}
                  >
                    {isCompared ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>

                  {/* Hover play preview overlay */}
                  <button
                    onClick={() => onPreviewMedia(item.title, item.url, item.thumbnail)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer z-20"
                    title="Preview stream"
                  >
                    <div className="p-3 rounded-full bg-[#10b981] text-white shadow-xl hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 fill-current" />
                    </div>
                  </button>
                </div>

                {/* Content Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3
                      className={`font-semibold text-sm line-clamp-2 group-hover:text-[#10b981] transition-colors ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                      title={item.title}
                    >
                      {item.title}
                    </h3>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{item.author}</p>
                  </div>

                  {/* Metadata line */}
                  <div className={`flex items-center justify-between text-xs border-t pt-2 font-mono ${
                    isDark ? 'text-gray-400 border-[#2d2d2d]' : 'text-slate-500 border-slate-200'
                  }`}>
                    <span>{item.view_count ? `${item.view_count.toLocaleString()} views` : 'High Definition'}</span>
                    <span>{item.upload_date}</span>
                  </div>

                  {/* Tailored Audiovisual Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {isSeries ? (
                      <button
                        onClick={() => onOpenSeries(item)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-white text-xs font-bold shadow-md transition-all cursor-pointer ${
                          item.total_seasons && item.total_seasons > 1
                            ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20'
                            : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                        }`}
                        title={item.total_seasons && item.total_seasons > 1 ? `Open franchise with ${item.total_seasons} seasons` : 'Open interactive episode package modal'}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>{item.total_seasons && item.total_seasons > 1 ? `Franchise (${item.total_seasons} Seasons)` : 'Episodes Package'}</span>
                      </button>
                    ) : isMovie ? (
                      <button
                        onClick={() => onOpenSeries(item)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                        title="Inspect feature film and host mirrors"
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>Inspect Film & Mirrors</span>
                      </button>
                    ) : isShort ? (
                      <button
                        onClick={() => onAddToQueue(item)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
                        title="1-Click clean unwatermarked vertical MP4 stream"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Clean Vertical MP4</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onAddToQueue(item)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold shadow-md shadow-[#10b981]/20 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Queue</span>
                      </button>
                    )}

                    <button
                      onClick={(e) => handleCopyUrl(item.url, item.id, e)}
                      title={isCopied ? 'URL copied!' : 'Copy media link'}
                      className={`p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                        isCopied
                          ? 'border-[#10b981] bg-[#10b981]/20 text-[#10b981]'
                          : isDark
                          ? 'border-[#2d2d2d] bg-[#1e1e1e] text-gray-400 hover:text-white'
                          : 'border-slate-300 bg-slate-50 text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {isCopied ? <Check className="w-4 h-4 text-[#10b981]" /> : <Copy className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => onPreviewMedia(item.title, item.url, item.thumbnail)}
                      title="Preview stream"
                      className={`p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                        isDark
                          ? 'border-[#2d2d2d] bg-[#1e1e1e] text-gray-400 hover:text-white'
                          : 'border-slate-300 bg-slate-50 text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      ) : (
        /* List / Table View */
        <SurfaceCard theme={theme} className="overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={`border-b text-xs uppercase ${
                isDark ? 'bg-[#1e1e1e] border-[#2d2d2d] text-gray-400' : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}>
                <tr>
                  <th className="py-3 px-4 w-10">
                    <button
                      onClick={toggleSelectAll}
                      className="cursor-pointer text-gray-400 hover:text-white"
                      title="Select all"
                    >
                      {selectedForCompare.size === displayedResults.length && displayedResults.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[#10b981]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Title & Channel</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Platform</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Views</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-[#2d2d2d]' : 'divide-slate-200'}`}>
                {displayedResults.map((item) => {
                  const isCompared = selectedForCompare.has(item.id);
                  const isCopied = copiedUrlId === item.id;
                  const isMovie = item.format_type === 'movie';
                  const isSeries = item.format_type === 'series' || item.is_part_of_series;
                  const isShort = item.format_type === 'short';

                  return (
                    <tr key={item.id} className={`transition-colors ${isDark ? 'hover:bg-[#1e1e1e]' : 'hover:bg-slate-50'}`}>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleCompare(item.id)}
                          className={`cursor-pointer ${isDark ? 'text-gray-400 hover:text-white' : 'text-slate-400 hover:text-slate-800'}`}
                        >
                          {isCompared ? (
                            <CheckSquare className="w-4 h-4 text-[#10b981]" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 max-w-md">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.thumbnail || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400'}
                            alt=""
                            className="w-14 h-9 object-cover rounded bg-black shrink-0 border border-white/5"
                            loading="lazy"
                          />
                          <div className="min-w-0">
                            <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.title}</p>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{item.author}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isMovie ? (
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                            MOVIE
                          </span>
                        ) : item.total_seasons && item.total_seasons > 1 ? (
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            FRANCHISE ({item.total_seasons}S)
                          </span>
                        ) : isSeries ? (
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/20 text-[#10b981] border border-emerald-500/30">
                            SERIES
                          </span>
                        ) : isShort ? (
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                            SHORT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded bg-slate-500/20 text-slate-400 border border-slate-500/30">
                            CLIP
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 text-xs font-semibold rounded text-white inline-flex items-center gap-1"
                          style={{ backgroundColor: item.platform_color || '#10b981' }}
                        >
                          <span>{item.platform_icon}</span>
                          <span>{item.platform}</span>
                        </span>
                      </td>
                      <td className={`py-3 px-4 whitespace-nowrap font-mono text-xs ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                        {item.duration}
                      </td>
                      <td className={`py-3 px-4 whitespace-nowrap text-xs font-mono tabular-nums ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                        {item.view_count ? item.view_count.toLocaleString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {isSeries || isMovie ? (
                            <button
                              onClick={() => onOpenSeries(item)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow cursor-pointer transition-colors"
                              title="Inspect package episodes / movie"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>{isMovie ? 'Film' : 'Episodes'}</span>
                            </button>
                          ) : isShort ? (
                            <button
                              onClick={() => onAddToQueue(item)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow cursor-pointer transition-colors"
                              title="Clean vertical MP4 stream"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>Clean MP4</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onAddToQueue(item)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold shadow transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Queue</span>
                            </button>
                          )}

                          <button
                            onClick={(e) => handleCopyUrl(item.url, item.id, e)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isCopied
                                ? 'border-[#10b981] bg-[#10b981]/20 text-[#10b981]'
                                : isDark
                                ? 'bg-[#1e1e1e] hover:bg-[#282828] border-[#2d2d2d] text-gray-300'
                                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                            }`}
                            title={isCopied ? 'URL copied!' : 'Copy link'}
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => onPreviewMedia(item.title, item.url, item.thumbnail)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isDark ? 'bg-[#1e1e1e] hover:bg-[#282828] border-[#2d2d2d] text-gray-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                            }`}
                            title="Preview"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      )}

      {/* 7. Load More Results Button */}
      {displayedResults.length > 0 && hasMore && (
        <div className="flex justify-center pt-2 pb-6">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg border font-semibold text-xs transition-all shadow cursor-pointer ${
              isDark
                ? 'border-[#2d2d2d] bg-[#1e1e1e] hover:bg-[#282828] text-white hover:border-[#10b981]'
                : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800 hover:border-[#10b981]'
            }`}
          >
            {loadingMore ? <Loader2 className="w-4 h-4 animate-spin text-[#10b981]" /> : <ArrowUpDown className="w-4 h-4" />}
            <span>{loadingMore ? 'Loading Next Batch...' : 'Load More Search Results'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
