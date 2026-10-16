import React, { useState } from 'react';
import {
  Search,
  Filter,
  Grid,
  List,
  Layers,
  Plus,
  Play,
  Download,
  ExternalLink,
  Film,
  Sparkles,
  Loader2,
  Check,
  CheckSquare,
  Square
} from 'lucide-react';
import { SearchResult } from '../types';

interface SearchScreenProps {
  onAddToQueue: (item: SearchResult) => void;
  onOpenCompare: (items: SearchResult[]) => void;
  onOpenSeries: (item: SearchResult) => void;
  onPreviewMedia: (title: string, url: string, thumb?: string) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({
  onAddToQueue,
  onOpenCompare,
  onOpenSeries,
  onPreviewMedia,
}) => {
  const [query, setQuery] = useState<string>('synthwave');
  const [region, setRegion] = useState<string>('wt-wt');
  const [domain, setDomain] = useState<string>('All');
  const [activePreset, setActivePreset] = useState<string>('All');
  const [qualityFilter, setQualityFilter] = useState<string>('Any');
  const [formatFilter, setFormatFilter] = useState<string>('Any');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());

  const presets = [
    { id: 'All', label: 'All Content', icon: '🌐' },
    { id: 'Anime', label: 'Anime & ACG', icon: '🎌', domain: 'Bilibili' },
    { id: 'Music', label: 'Music & Audio', icon: '🎵', domain: 'SoundCloud' },
    { id: 'Gaming', label: 'Gaming & Streams', icon: '🎮', domain: 'Twitch' },
    { id: 'Podcasts', label: 'Podcasts', icon: '🎙️', domain: 'Spotify' },
    { id: 'Social', label: 'Social & Shorts', icon: '📱', domain: 'TikTok' },
  ];

  const domainOptions = [
    'All',
    'YouTube',
    'Vimeo',
    'Dailymotion',
    'OK.ru',
    'Rumble',
    'Bilibili',
    'SoundCloud',
    'Bandcamp',
    'TikTok',
    'Twitch',
    'Spotify',
  ];

  const performSearch = async (overrideQuery?: string, overrideDomain?: string) => {
    const q = overrideQuery ?? query;
    const dom = overrideDomain ?? domain;
    if (!q.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          site: dom === 'All' ? undefined : dom,
          region,
          limit: 18,
        }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setLoading(false);
    }
  };

  // Initial auto search on first load
  React.useEffect(() => {
    performSearch('synthwave');
  }, []);

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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Search className="w-6 h-6 text-[#10b981]" />
            Search Videos & Streams
          </h1>
          <p className="text-sm text-gray-400">
            Find and download media across YouTube, Vimeo, SoundCloud, Bilibili, and more
          </p>
        </div>

        {/* View mode toggle & Compare Button */}
        <div className="flex items-center gap-2">
          {selectedForCompare.size > 0 && (
            <button
              onClick={openCompareModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10b981] text-white text-xs font-semibold shadow-md shadow-[#10b981]/20 hover:bg-[#059669] transition-all cursor-pointer animate-fadeIn"
            >
              <Layers className="w-3.5 h-3.5" />
              Compare Selected ({selectedForCompare.size})
            </button>
          )}

          <div className="flex rounded-lg border border-[#3c3c3c] bg-[#1e1e1e] p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md ${
                viewMode === 'grid' ? 'bg-[#3c3c3c] text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md ${
                viewMode === 'list' ? 'bg-[#3c3c3c] text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="rounded-xl bg-[#252526] border border-[#3c3c3c] p-5 shadow-xl space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            performSearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by keywords, titles, or authors..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#1e1e1e] border border-[#454545] text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-sm font-semibold shadow-lg shadow-[#10b981]/20 disabled:opacity-50 transition-all cursor-pointer shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </form>

        {/* Content Presets */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[#333] pt-3">
          <span className="text-xs text-gray-400 font-medium mr-1">Presets:</span>
          {presets.map((preset) => {
            const isActive = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#10b981] text-white font-semibold'
                    : 'bg-[#1e1e1e] border border-[#3c3c3c] text-gray-300 hover:text-white hover:bg-[#2a2a2b]'
                }`}
              >
                <span>{preset.icon}</span>
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filters Bar: Region, Domain, Quality */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-[#333] pt-3 text-xs">
          <div>
            <label className="text-gray-400 block mb-1">Region:</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-[#1e1e1e] border border-[#454545] text-gray-200 focus:outline-none focus:border-[#10b981]"
            >
              <option value="wt-wt">Worldwide (wt-wt)</option>
              <option value="us-en">United States (us-en)</option>
              <option value="ru-ru">Russia (ru-ru)</option>
              <option value="de-de">Germany (de-de)</option>
              <option value="fr-fr">France (fr-fr)</option>
            </select>
          </div>

          <div>
            <label className="text-gray-400 block mb-1">Domain / Platform:</label>
            <select
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
                performSearch(query, e.target.value);
              }}
              className="w-full px-2.5 py-1.5 rounded-md bg-[#1e1e1e] border border-[#454545] text-gray-200 focus:outline-none focus:border-[#10b981]"
            >
              {domainOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-400 block mb-1">Quality Filter:</label>
            <select
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-[#1e1e1e] border border-[#454545] text-gray-200 focus:outline-none focus:border-[#10b981]"
            >
              <option value="Any">Any Quality</option>
              <option value="2160">4K (2160p)</option>
              <option value="1080">Full HD (1080p)</option>
              <option value="720">HD (720p)</option>
              <option value="480">SD (480p)</option>
            </select>
          </div>

          <div>
            <label className="text-gray-400 block mb-1">Format Filter:</label>
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-[#1e1e1e] border border-[#454545] text-gray-200 focus:outline-none focus:border-[#10b981]"
            >
              <option value="Any">Any Format</option>
              <option value="video">Video + Audio</option>
              <option value="audio">Audio Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-gray-400 px-1">
        <span>
          {loading
            ? 'Searching DuckDuckGo and platform extractors...'
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

      {/* Results Rendering */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#10b981]" />
          <p className="text-sm text-gray-400">Fetching high quality metadata...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-xl bg-[#252526] border border-[#3c3c3c] p-12 text-center text-gray-400 space-y-3">
          <Search className="w-10 h-10 mx-auto text-gray-500" />
          <p className="text-base text-gray-300 font-medium">No results found</p>
          <p className="text-xs">Try different keywords or switch the domain filter to "All".</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((item) => {
            const isCompared = selectedForCompare.has(item.id);
            return (
              <div
                key={item.id}
                className={`group flex flex-col rounded-xl bg-[#252526] border transition-all overflow-hidden ${
                  isCompared
                    ? 'border-[#10b981] ring-1 ring-[#10b981]'
                    : 'border-[#3c3c3c] hover:border-[#10b981]/50'
                }`}
              >
                {/* Thumbnail Header */}
                <div className="relative aspect-video w-full bg-[#1e1e1e] overflow-hidden">
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
                    className="absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold rounded-full text-white shadow-md"
                    style={{ backgroundColor: item.platform_color || '#10b981' }}
                  >
                    {item.platform_icon} {item.platform}
                  </span>

                  {/* Series badge */}
                  {item.is_part_of_series && (
                    <button
                      onClick={() => onOpenSeries(item)}
                      title="Part of a series. Click to inspect episodes."
                      className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-purple-600/90 text-white hover:bg-purple-500 transition-colors cursor-pointer"
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
                      className="font-semibold text-white text-sm line-clamp-2 group-hover:text-[#10b981] transition-colors"
                      title={item.title}
                    >
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">{item.author}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400 border-t border-[#333] pt-2">
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
                          : 'border-[#3c3c3c] bg-[#1e1e1e] text-gray-400 hover:text-white'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onPreviewMedia(item.title, item.url, item.thumbnail)}
                      title="Preview stream"
                      className="p-2 rounded-lg border border-[#3c3c3c] bg-[#1e1e1e] text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List / Table View */
        <div className="rounded-xl bg-[#252526] border border-[#3c3c3c] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#d4d4d4]">
              <thead className="bg-[#1e1e1e] border-b border-[#3c3c3c] text-xs uppercase text-gray-400">
                <tr>
                  <th className="py-3 px-4 w-10">Compare</th>
                  <th className="py-3 px-4">Title & Channel</th>
                  <th className="py-3 px-4">Platform</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Views</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333]">
                {results.map((item) => {
                  const isCompared = selectedForCompare.has(item.id);
                  return (
                    <tr key={item.id} className="hover:bg-[#2a2a2b] transition-colors">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleCompare(item.id)}
                          className="cursor-pointer text-gray-400 hover:text-white"
                        >
                          {isCompared ? (
                            <CheckSquare className="w-4 h-4 text-[#10b981]" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 max-w-md">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.thumbnail}
                            alt=""
                            className="w-14 h-9 object-cover rounded bg-[#111] shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate">{item.title}</p>
                            <p className="text-xs text-gray-400">{item.author}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 text-xs font-semibold rounded-full text-white"
                          style={{ backgroundColor: item.platform_color || '#10b981' }}
                        >
                          {item.platform_icon} {item.platform}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-xs text-gray-300">
                        {item.duration}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-gray-300">
                        {item.view_count ? item.view_count.toLocaleString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => onPreviewMedia(item.title, item.url, item.thumbnail)}
                            className="p-1.5 rounded-md bg-[#1e1e1e] hover:bg-[#3c3c3c] text-gray-300 hover:text-white transition-colors"
                            title="Preview"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onAddToQueue(item)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold shadow transition-colors cursor-pointer"
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
        </div>
      )}
    </div>
  );
};
