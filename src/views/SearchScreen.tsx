import React, { useState } from 'react';
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
  SlidersHorizontal
} from 'lucide-react';
import { SearchResult } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { SurfaceCard } from '../components/common/SurfaceCard';
import { EmptyState } from '../components/common/EmptyState';

interface SearchScreenProps {
  onAddToQueue: (item: SearchResult) => void;
  onOpenCompare: (items: SearchResult[]) => void;
  onOpenSeries: (item: SearchResult) => void;
  onPreviewMedia: (title: string, url: string, thumb?: string) => void;
  theme?: 'dark' | 'light';
}

export const SearchScreen: React.FC<SearchScreenProps> = ({
  onAddToQueue,
  onOpenCompare,
  onOpenSeries,
  onPreviewMedia,
  theme = 'dark',
}) => {
  const [query, setQuery] = useState<string>('synthwave');
  const [region, setRegion] = useState<string>('wt-wt');
  const [domain, setDomain] = useState<string>('All');
  const [activePreset, setActivePreset] = useState<string>('All');
  const [qualityFilter, setQualityFilter] = useState<string>('Any');
  const [formatFilter, setFormatFilter] = useState<string>('Any');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());

  const isDark = theme === 'dark';

  const presets = [
    { id: 'All', label: 'All Content', icon: '🌐' },
    { id: 'Music', label: 'Music & Audio', icon: '🎵', domain: 'SoundCloud' },
    { id: 'Anime', label: 'Anime & ACG', icon: '🎌', domain: 'Bilibili' },
    { id: 'Gaming', label: 'Gaming & Streams', icon: '🎮', domain: 'Twitch' },
    { id: 'Podcasts', label: 'Podcasts', icon: '🎙️', domain: 'Spotify' },
    { id: 'Social', label: 'Social & Shorts', icon: '📱', domain: 'TikTok' },
  ];

  const domainOptions = [
    'All',
    'YouTube',
    'Vimeo',
    'Bilibili',
    'TikTok',
    'SoundCloud',
    'Twitch',
  ];

  const performSearch = async (
    searchQuery = query,
    searchDomain = domain,
    searchQuality = qualityFilter,
    searchFormat = formatFilter
  ) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          region,
          domain: searchDomain,
          quality: searchQuality,
          format: searchFormat,
        }),
      });

      if (!res.ok) {
        throw new Error('Search failed');
      }

      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Failed to perform search:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetClick = (preset: typeof presets[0]) => {
    setActivePreset(preset.id);
    const newDomain = preset.domain || 'All';
    setDomain(newDomain);
    performSearch(query, newDomain);
  };

  const toggleCompare = (id: string) => {
    const next = new Set(selectedForCompare);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedForCompare(next);
  };

  const openCompareModal = () => {
    const items = results.filter((r) => selectedForCompare.has(r.id));
    if (items.length > 0) {
      onOpenCompare(items);
    }
  };

  const activeFiltersCount =
    (domain !== 'All' ? 1 : 0) +
    (qualityFilter !== 'Any' ? 1 : 0) +
    (formatFilter !== 'Any' ? 1 : 0) +
    (region !== 'wt-wt' ? 1 : 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 1. Standardized PageHeader */}
      <PageHeader
        icon={<Search className="w-6 h-6" />}
        title="Search Videos & Streams"
        description="Discover and enqueue media across YouTube, Vimeo, SoundCloud, Bilibili, and TikTok"
        theme={theme}
        actionSlot={
          <div className="flex items-center gap-2">
            {selectedForCompare.size > 0 && (
              <button
                onClick={openCompareModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10b981] text-white text-xs font-semibold shadow-md shadow-[#10b981]/20 hover:bg-[#059669] transition-all cursor-pointer animate-fadeIn"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Compare ({selectedForCompare.size})</span>
              </button>
            )}

            {/* View Mode Toggle Buttons */}
            <div className={`flex rounded-lg border p-0.5 ${
              isDark ? 'border-[#2d2d2d] bg-[#1e1e1e]' : 'border-slate-300 bg-slate-100'
            }`}>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                  viewMode === 'grid'
                    ? isDark ? 'bg-[#252526] text-white' : 'bg-white text-slate-900 shadow-xs'
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
                    ? isDark ? 'bg-[#252526] text-white' : 'bg-white text-slate-900 shadow-xs'
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

      {/* 2. Primary Search Box with Hick's Law Progressive Disclosure */}
      <SurfaceCard theme={theme} className="p-5 space-y-4 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            performSearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className={`w-4 h-4 absolute left-3.5 top-3.5 ${isDark ? 'text-gray-400' : 'text-slate-400'}`} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by keywords, titles, or creator names..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm font-mono focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] ${
                isDark
                  ? 'bg-[#1e1e1e] border-[#2d2d2d] text-white placeholder:text-gray-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
              }`}
            />
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

        {/* Content Presets (Fast segmented choices) */}
        <div className={`flex flex-wrap items-center gap-2 border-t pt-3 ${isDark ? 'border-[#2d2d2d]' : 'border-slate-200'}`}>
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

        {/* Collapsible Advanced Filters Drawer (Hick's Law) */}
        {showAdvancedFilters && (
          <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 border-t pt-3.5 text-xs animate-in fade-in duration-200 ${
            isDark ? 'border-[#2d2d2d]' : 'border-slate-200'
          }`}>
            <div>
              <label className={`block mb-1 font-mono text-[11px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Region / Language:</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-[#10b981] ${
                  isDark ? 'bg-[#1e1e1e] border-[#2d2d2d] text-gray-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                <option value="wt-wt">Worldwide (wt-wt)</option>
                <option value="us-en">United States (us-en)</option>
                <option value="ru-ru">Russia (ru-ru)</option>
                <option value="de-de">Germany (de-de)</option>
                <option value="fr-fr">France (fr-fr)</option>
              </select>
            </div>

            <div>
              <label className={`block mb-1 font-mono text-[11px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Platform Scope:</label>
              <select
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value);
                  performSearch(query, e.target.value);
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
                  performSearch(query, domain, e.target.value, formatFilter);
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
                  performSearch(query, domain, qualityFilter, e.target.value);
                }}
                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-[#10b981] ${
                  isDark ? 'bg-[#1e1e1e] border-[#2d2d2d] text-gray-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                <option value="Any">Any Format</option>
                <option value="video">Video + Audio</option>
                <option value="audio">Audio Only</option>
              </select>
            </div>
          </div>
        )}
      </SurfaceCard>

      {/* 3. Results Status Bar */}
      <div className={`flex items-center justify-between text-xs px-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
        <span>
          {loading
            ? 'Searching platform catalog...'
            : hasSearched
            ? `Found ${results.length} results for "${query}"`
            : 'Enter query above to search'}
        </span>
        {selectedForCompare.size > 0 && (
          <span className="text-[#10b981] font-medium">
            {selectedForCompare.size} items selected for side-by-side comparison
          </span>
        )}
      </div>

      {/* 4. Results Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#10b981]" />
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Fetching media streams...</p>
        </div>
      ) : results.length === 0 ? (
        <SurfaceCard theme={theme} className="p-8 max-w-lg mx-auto">
          <EmptyState
            icon={<Search className="w-6 h-6" />}
            title="No media found"
            description={`No results discovered for "${query}". Try resetting filters or exploring YouTube directly.`}
            action={{
              label: 'Reset Filters & Search',
              onClick: () => {
                setDomain('All');
                setQualityFilter('Any');
                setFormatFilter('Any');
                performSearch(query, 'All', 'Any', 'Any');
              }
            }}
            theme={theme}
          />
        </SurfaceCard>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((item) => {
            const isCompared = selectedForCompare.has(item.id);
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
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />

                  {/* Duration badge */}
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-xs font-mono font-medium bg-black/80 text-white rounded">
                    {item.duration}
                  </span>

                  {/* Platform badge */}
                  <span
                    className="absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold rounded-md text-white shadow-md"
                    style={{ backgroundColor: item.platform_color || '#10b981' }}
                  >
                    {item.platform_icon} {item.platform}
                  </span>

                  {/* Series badge */}
                  {item.is_part_of_series && (
                    <button
                      onClick={() => onOpenSeries(item)}
                      title="Part of a series. Click to inspect episodes."
                      className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-purple-600/90 text-white hover:bg-purple-500 transition-colors cursor-pointer"
                    >
                      <Film className="w-3 h-3" />
                      Series Ep {item.episode_number || 1}
                    </button>
                  )}

                  {/* Hover play preview overlay */}
                  <button
                    onClick={() => onPreviewMedia(item.title, item.url, item.thumbnail)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
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

                  {/* Zero-pill metadata */}
                  <div className={`flex items-center justify-between text-xs border-t pt-2 font-mono ${
                    isDark ? 'text-gray-400 border-[#2d2d2d]' : 'text-slate-500 border-slate-200'
                  }`}>
                    <span>{item.view_count ? `${item.view_count.toLocaleString()} views` : 'Popular'}</span>
                    <span>{item.upload_date}</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onAddToQueue(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold shadow-md shadow-[#10b981]/20 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add to Queue
                    </button>

                    <button
                      onClick={() => toggleCompare(item.id)}
                      title="Select for batch comparison"
                      className={`p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                        isCompared
                          ? 'border-[#10b981] bg-[#10b981]/20 text-[#10b981]'
                          : isDark
                          ? 'border-[#2d2d2d] bg-[#1e1e1e] text-gray-400 hover:text-white'
                          : 'border-slate-300 bg-slate-50 text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
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
                  <th className="py-3 px-4 w-10">Compare</th>
                  <th className="py-3 px-4">Title & Channel</th>
                  <th className="py-3 px-4">Platform</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Views</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-[#2d2d2d]' : 'divide-slate-200'}`}>
                {results.map((item) => {
                  const isCompared = selectedForCompare.has(item.id);
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
                            src={item.thumbnail}
                            alt=""
                            className="w-14 h-9 object-cover rounded bg-black shrink-0 border border-white/5"
                          />
                          <div className="min-w-0">
                            <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.title}</p>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{item.author}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 text-xs font-semibold rounded text-white"
                          style={{ backgroundColor: item.platform_color || '#10b981' }}
                        >
                          {item.platform_icon} {item.platform}
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
                          <button
                            onClick={() => onPreviewMedia(item.title, item.url, item.thumbnail)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isDark ? 'bg-[#1e1e1e] hover:bg-[#282828] border-[#2d2d2d] text-gray-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                            }`}
                            title="Preview"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onAddToQueue(item)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold shadow transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add to Queue
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
    </div>
  );
};
