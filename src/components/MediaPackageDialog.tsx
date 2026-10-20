import React, { useState, useEffect } from 'react';
import { SearchResult } from '../types';
import {
  Film,
  Plus,
  X,
  CheckSquare,
  Square,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Layers,
  Sliders,
  Check,
  Server,
  ExternalLink,
  ChevronRight,
  Disc3,
  Calendar,
  Play,
  Tv
} from 'lucide-react';

export interface SeriesEpisodeItem {
  id: string;
  episodeNumber: number;
  title: string;
  url: string;
  duration?: string;
  thumbnail?: string;
  author?: string;
  format_type?: string;
  is_movie?: boolean;
}

export interface AnimeSeasonPack {
  id: string;
  seasonNumber: number;
  title: string;
  type: 'series' | 'movie' | 'ova';
  episodesCount: number;
  slug: string;
  coverUrl?: string;
  entries: SeriesEpisodeItem[];
}

export interface MediaMirrorHost {
  server: string;
  title: string;
  code: string;
}

interface MediaPackageDialogProps {
  item: SearchResult | any;
  isOpen: boolean;
  onClose: () => void;
  onAddEpisodes: (episodes: SeriesEpisodeItem[], quality?: string) => void;
  onPreviewMedia?: (title: string, url: string, thumb?: string) => void;
  theme?: 'dark' | 'light';
}

const QUALITY_PRESETS = [
  { id: '1080p', label: '1080p (Full HD)', desc: 'Best visual clarity' },
  { id: '720p', label: '720p (HD Ready)', desc: 'Fast & lightweight' },
  { id: '480p', label: '480p (Standard)', desc: 'Data saver' },
  { id: 'Audio Only (MP3)', label: 'Audio Only (MP3)', desc: 'Soundtrack / Audio' }
];

export const MediaPackageDialog: React.FC<MediaPackageDialogProps> = ({
  item,
  isOpen,
  onClose,
  onAddEpisodes,
  onPreviewMedia,
  theme = 'dark',
}) => {
  const [episodes, setEpisodes] = useState<SeriesEpisodeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [seasons, setSeasons] = useState<AnimeSeasonPack[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<string>('');
  const [packageMeta, setPackageMeta] = useState<{
    title: string;
    synopsis: string;
    coverUrl: string;
    format_type: 'movie' | 'series';
    genres: string[];
    totalEpisodes: number;
  } | null>(null);

  // Range and filter state
  const [selectedQuality, setSelectedQuality] = useState<string>('1080p');
  const [rangeFilter, setRangeFilter] = useState<'all' | 'cour1' | 'cour2' | 'custom'>('all');
  const [customStart, setCustomStart] = useState<number>(1);
  const [customEnd, setCustomEnd] = useState<number>(12);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Mirrors state for movies or single episode
  const [mirrors, setMirrors] = useState<MediaMirrorHost[]>([]);
  const [loadingMirrors, setLoadingMirrors] = useState<boolean>(false);
  const [selectedMirror, setSelectedMirror] = useState<string>('');

  const isDark = theme === 'dark';

  const isMovie = item?.format_type === 'movie' ||
    /pelicula|película|movie|ova|film/i.test(item?.title || '') ||
    packageMeta?.format_type === 'movie';

  const seriesTitle = packageMeta?.title || item?.series_name || item?.title?.replace(/ep(isode)?\s*\d+/i, '').trim() || 'Media Package';

  // Load package metadata and episode list
  const loadPackage = async () => {
    if (!item?.url) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/media/package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url, limit: 100 })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to expand media package');
      }

      const data = await res.json();
      const meta = {
        title: data.title || seriesTitle,
        synopsis: data.synopsis || item.description || '',
        coverUrl: data.coverUrl || item.thumbnail || '',
        format_type: data.format_type || (isMovie ? 'movie' : 'series'),
        genres: data.genres || ['Audiovisual', item.platform || 'Streaming'],
        totalEpisodes: data.totalEpisodes || data.entries?.length || 1
      };
      setPackageMeta(meta);

      if (Array.isArray(data.seasons) && data.seasons.length > 0) {
        setSeasons(data.seasons);
        const firstSeason = data.seasons[0];
        setActiveSeasonId(firstSeason.id);
        const seasonEntries: SeriesEpisodeItem[] = firstSeason.entries || [];
        setEpisodes(seasonEntries);
        setSelectedIds(new Set(seasonEntries.map((e) => e.id)));
        setCustomEnd(Math.min(12, seasonEntries.length));
      } else if (Array.isArray(data.entries) && data.entries.length > 0) {
        setSeasons([]);
        setEpisodes(data.entries);
        setSelectedIds(new Set(data.entries.map((e: SeriesEpisodeItem) => e.id)));
        setCustomEnd(Math.min(12, data.entries.length));
      } else {
        // Fallback to single episode/film
        const single: SeriesEpisodeItem = {
          id: item.id || `entry-1`,
          episodeNumber: 1,
          title: item.title,
          url: item.url,
          duration: item.duration || '01:45:00',
          thumbnail: item.thumbnail || '',
          author: item.author || ''
        };
        setSeasons([]);
        setEpisodes([single]);
        setSelectedIds(new Set([single.id]));
      }

      // If movie or single entry on AnimeFLV, fetch mirror host options
      if (item.url.includes('animeflv.net')) {
        fetchMirrors(data.entries?.[0]?.url || item.url);
      }
    } catch (err: any) {
      console.warn('[MediaPackageDialog] Live fetch note:', err);
      // Graceful fallback from item directly - zero broken UI
      const single: SeriesEpisodeItem = {
        id: item.id || `entry-1`,
        episodeNumber: 1,
        title: item.title,
        url: item.url,
        duration: item.duration || 'Direct Stream',
        thumbnail: item.thumbnail || '',
        author: item.author || 'Streaming Media'
      };
      setEpisodes([single]);
      setSelectedIds(new Set([single.id]));
      setSeasons([]);
      setPackageMeta({
        title: item.title,
        synopsis: item.description || 'Contenido audiovisual listo para reproducción y descarga en alta definición.',
        coverUrl: item.thumbnail || '',
        format_type: isMovie ? 'movie' : 'series',
        genres: [item.platform || 'Streaming', 'HD Video'],
        totalEpisodes: 1
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMirrors = async (targetUrl: string) => {
    setLoadingMirrors(true);
    try {
      const res = await fetch('/api/media/mirrors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.mirrors) && data.mirrors.length > 0) {
          setMirrors(data.mirrors);
          setSelectedMirror(data.mirrors[0].server);
        }
      }
    } catch {}
    finally {
      setLoadingMirrors(false);
    }
  };

  // Switch season tab
  const handleSelectSeason = (seasonId: string) => {
    const chosen = seasons.find((s) => s.id === seasonId);
    if (!chosen) return;
    setActiveSeasonId(seasonId);
    setEpisodes(chosen.entries);
    setSelectedIds(new Set(chosen.entries.map((e) => e.id)));
    setRangeFilter('all');
    setCustomStart(1);
    setCustomEnd(Math.min(12, chosen.entries.length));
  };

  useEffect(() => {
    if (isOpen && item?.url) {
      loadPackage();
    }
  }, [isOpen, item?.url]);

  if (!isOpen) return null;

  // Apply Cour / Range selections
  const applyRange = (type: 'all' | 'cour1' | 'cour2' | 'custom', start?: number, end?: number) => {
    setRangeFilter(type);
    let filtered: SeriesEpisodeItem[] = [];

    if (type === 'all') {
      filtered = episodes;
    } else if (type === 'cour1') {
      filtered = episodes.filter((e) => e.episodeNumber >= 1 && e.episodeNumber <= 12);
    } else if (type === 'cour2') {
      filtered = episodes.filter((e) => e.episodeNumber >= 13 && e.episodeNumber <= 24);
    } else if (type === 'custom') {
      const s = start !== undefined ? start : customStart;
      const e = end !== undefined ? end : customEnd;
      filtered = episodes.filter((ep) => ep.episodeNumber >= s && ep.episodeNumber <= e);
    }

    setSelectedIds(new Set(filtered.map((e) => e.id)));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === episodes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(episodes.map((e) => e.id)));
    }
  };

  // Queue selected episodes in current season
  const handleConfirmSeason = () => {
    let toQueue = episodes.filter((e) => selectedIds.has(e.id));
    if (toQueue.length === 0 && episodes.length > 0) {
      toQueue = [episodes[0]];
    }
    onAddEpisodes(toQueue, selectedQuality);
    onClose();
  };

  // Queue all episodes across ALL seasons
  const handleQueueAllFranchise = () => {
    if (seasons.length > 0) {
      const allEntries = seasons.flatMap((s) => s.entries);
      onAddEpisodes(allEntries, selectedQuality);
    } else {
      onAddEpisodes(episodes, selectedQuality);
    }
    onClose();
  };

  const filteredEpisodes = episodes.filter((ep) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return ep.title.toLowerCase().includes(term) || String(ep.episodeNumber).includes(term);
  });

  const activeSeason = seasons.find((s) => s.id === activeSeasonId);
  const totalFranchiseCount = seasons.length > 0
    ? seasons.reduce((acc, s) => acc + s.episodesCount, 0)
    : episodes.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn">
      <div
        className={`w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-colors ${
          isDark ? 'bg-[#1e1e1e] border-[#333333] text-[#d4d4d4]' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Hero Header with Artwork & Synopsis */}
        <div className="relative overflow-hidden border-b shrink-0 border-white/10 bg-black">
          {/* Blurred Background Art */}
          {(packageMeta?.coverUrl || item?.thumbnail) && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-25 blur-xl scale-110 pointer-events-none"
              style={{ backgroundImage: `url(${packageMeta?.coverUrl || item?.thumbnail})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] via-[#1e1e1e]/80 to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Hero Content */}
          <div className="relative z-10 p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
            <img
              src={packageMeta?.coverUrl || item?.thumbnail || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400'}
              alt={packageMeta?.title || item?.title}
              className="w-20 h-28 sm:w-24 sm:h-34 object-cover rounded-xl shadow-2xl shrink-0 border border-white/10 bg-black/50"
            />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider font-bold ${
                  seasons.length > 1
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : isMovie
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    : 'bg-emerald-500/20 text-[#10b981] border border-emerald-500/30'
                }`}>
                  <Film className="w-3 h-3" />
                  {seasons.length > 1
                    ? `FRANCHISE · ${seasons.length} SEASONS`
                    : isMovie
                    ? 'FEATURE FILM'
                    : 'SERIES / ANIME'}
                </span>

                <span className="text-xs font-mono text-gray-400">
                  {totalFranchiseCount > 1 ? `${totalFranchiseCount} Episodes Total` : (item.duration || 'Feature Film')}
                </span>

                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-xs font-mono text-gray-300">
                  {item.platform || 'AnimeFLV'}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                {packageMeta?.title || seriesTitle}
              </h2>

              <p className="text-xs sm:text-sm text-gray-300 line-clamp-2 leading-relaxed">
                {packageMeta?.synopsis || item.description || 'Full high-definition audiovisual release ready for queueing.'}
              </p>

              {/* Genre Chips */}
              {packageMeta?.genres && packageMeta.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {packageMeta.genres.slice(0, 5).map((g, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-white/10 text-gray-300"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Multi-Season & Movies Navigation Tabs (When franchise contains multiple releases) */}
        {seasons.length > 1 && (
          <div className={`px-4 py-2.5 border-b shrink-0 flex items-center gap-2 overflow-x-auto ${
            isDark ? 'bg-[#1b1b1e] border-[#303033]' : 'bg-slate-100 border-slate-200'
          }`}>
            <div className="flex items-center gap-1 text-xs font-mono text-gray-400 shrink-0 mr-1">
              <Tv className="w-3.5 h-3.5 text-[#10b981]" />
              <span className="font-semibold">Seasons & Movies:</span>
            </div>

            <div className="flex items-center gap-1.5 py-0.5">
              {seasons.map((s) => {
                const isActive = activeSeasonId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSeason(s.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-[#10b981] text-white font-bold shadow-sm'
                        : isDark
                        ? 'bg-[#252526] text-gray-300 hover:text-white hover:bg-[#2e2e2e] border border-[#3c3c3c]'
                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                    }`}
                  >
                    <span>{s.title}</span>
                    <span className={`text-[10px] px-1 py-0.2 rounded font-bold ${
                      isActive ? 'bg-black/25 text-white' : 'bg-white/10 text-gray-400'
                    }`}>
                      {s.episodesCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Global Quality & Range Controls Toolbar */}
        <div className={`p-4 border-b shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs ${
          isDark ? 'bg-[#252526] border-[#333333]' : 'bg-slate-50 border-slate-200'
        }`}>
          {/* Quality selector */}
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Quality:</span>
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {QUALITY_PRESETS.map((q) => {
                const active = selectedQuality === q.id;
                return (
                  <button
                    key={q.id}
                    onClick={() => setSelectedQuality(q.id)}
                    className={`px-2.5 py-1 rounded-lg font-mono font-medium text-xs whitespace-nowrap transition-all cursor-pointer ${
                      active
                        ? 'bg-[#10b981] text-white shadow-sm'
                        : isDark
                        ? 'bg-[#1e1e1e] text-gray-300 hover:bg-[#333333] border border-[#3c3c3c]'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {q.id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Range Selector (for series with multiple episodes) */}
          {episodes.length > 1 && (
            <div className="flex items-center gap-1">
              <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Range:</span>
              <button
                onClick={() => applyRange('all')}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                  rangeFilter === 'all'
                    ? 'bg-purple-600 text-white'
                    : isDark
                    ? 'bg-[#1e1e1e] text-gray-300 hover:bg-[#333]'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                All ({episodes.length})
              </button>
              {episodes.length >= 12 && (
                <button
                  onClick={() => applyRange('cour1')}
                  className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                    rangeFilter === 'cour1'
                      ? 'bg-purple-600 text-white'
                      : isDark
                      ? 'bg-[#1e1e1e] text-gray-300 hover:bg-[#333]'
                      : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cour 1 (1–12)
                </button>
              )}
              {episodes.length > 12 && (
                <button
                  onClick={() => applyRange('cour2')}
                  className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                    rangeFilter === 'cour2'
                      ? 'bg-purple-600 text-white'
                      : isDark
                      ? 'bg-[#1e1e1e] text-gray-300 hover:bg-[#333]'
                      : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cour 2 (13–{Math.min(24, episodes.length)})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Custom Min-Max Range inputs if multiple episodes */}
        {episodes.length > 2 && (
          <div className={`px-4 py-2 border-b shrink-0 flex items-center justify-between text-xs font-mono ${
            isDark ? 'bg-[#1e1e1e] border-[#2e2e2e] text-gray-400' : 'bg-slate-100/70 border-slate-200 text-slate-600'
          }`}>
            <div className="flex items-center gap-2">
              <span>Select Range:</span>
              <span>Ep</span>
              <input
                type="number"
                min={1}
                max={episodes.length}
                value={customStart}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(episodes.length, parseInt(e.target.value) || 1));
                  setCustomStart(val);
                  applyRange('custom', val, customEnd);
                }}
                className={`w-12 px-1.5 py-0.5 rounded border text-center ${
                  isDark ? 'bg-[#2a2a2a] border-[#444] text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
              <span>to</span>
              <input
                type="number"
                min={customStart}
                max={episodes.length}
                value={customEnd}
                onChange={(e) => {
                  const val = Math.max(customStart, Math.min(episodes.length, parseInt(e.target.value) || episodes.length));
                  setCustomEnd(val);
                  applyRange('custom', customStart, val);
                }}
                className={`w-12 px-1.5 py-0.5 rounded border text-center ${
                  isDark ? 'bg-[#2a2a2a] border-[#444] text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
              <button
                onClick={() => applyRange('custom', customStart, customEnd)}
                className="px-2 py-0.5 rounded bg-[#10b981] hover:bg-[#059669] text-white font-sans text-xs cursor-pointer"
              >
                Apply Range
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="tabular-nums">
                {selectedIds.size} / {episodes.length} selected
              </span>
              <button
                onClick={selectAll}
                className="text-[#10b981] hover:underline cursor-pointer"
              >
                {selectedIds.size === episodes.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>
        )}

        {/* Available Mirrors (for Movie or Single Episode) */}
        {mirrors.length > 0 && (
          <div className={`px-4 py-2.5 border-b shrink-0 flex items-center gap-2 text-xs ${
            isDark ? 'bg-[#252526] border-[#333]' : 'bg-slate-100 border-slate-200'
          }`}>
            <Server className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="font-semibold text-gray-300">Available Host Mirrors:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {mirrors.map((m) => (
                <button
                  key={m.server}
                  onClick={() => setSelectedMirror(m.server)}
                  className={`px-2 py-0.5 rounded font-mono uppercase text-[11px] transition-colors cursor-pointer ${
                    selectedMirror === m.server
                      ? 'bg-indigo-600 text-white'
                      : isDark
                      ? 'bg-[#1e1e1e] text-gray-300 hover:bg-[#333]'
                      : 'bg-white text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {m.server}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main List Section */}
        <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[380px] divide-y divide-white/5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#10b981]" />
              <p className="text-xs font-mono text-gray-400">Expanding multi-season package & episodes...</p>
            </div>
          ) : filteredEpisodes.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No episodes matching filter.
            </div>
          ) : (
            filteredEpisodes.map((ep) => {
              const isSelected = selectedIds.has(ep.id);
              return (
                <div
                  key={ep.id}
                  onClick={() => toggleSelect(ep.id)}
                  className={`px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'bg-[#10b981]/10'
                        : 'bg-emerald-50'
                      : isDark
                      ? 'hover:bg-white/5'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(ep.id);
                      }}
                      className="cursor-pointer text-[#10b981]"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 fill-[#10b981] text-black" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    <span className="w-8 shrink-0 text-center font-mono text-xs font-bold text-gray-400">
                      {String(ep.episodeNumber).padStart(2, '0')}
                    </span>

                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${isSelected ? 'text-[#10b981] font-semibold' : isDark ? 'text-white' : 'text-slate-900'}`}>
                        {ep.title}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">
                        {ep.duration || '24:00'} · Stream Directo
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onPreviewMedia && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewMedia(ep.title, ep.url, ep.thumbnail || packageMeta?.coverUrl);
                        }}
                        className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                          isDark ? 'border-[#333] hover:bg-[#333] text-gray-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                        }`}
                        title="Preview Stream in Embedded Player"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Actions Footer */}
        <div className={`p-4 border-t shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
          isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="text-xs font-mono text-gray-400 flex items-center gap-2">
            <span>Quality: <strong className="text-[#10b981]">{selectedQuality}</strong></span>
            {activeSeason && (
              <span>• Season: <strong className="text-white">{activeSeason.title}</strong></span>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onClose}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                isDark ? 'border-[#3c3c3c] hover:bg-[#2d2d2d] text-gray-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              Cancel
            </button>

            {seasons.length > 1 && (
              <button
                onClick={handleQueueAllFranchise}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                title="Queue all episodes across all seasons of this franchise"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Queue Entire Franchise ({totalFranchiseCount})</span>
              </button>
            )}

            <button
              onClick={handleConfirmSeason}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-[#10b981]/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                {isMovie
                  ? `Download Movie (${selectedQuality})`
                  : `Queue ${selectedIds.size} Episodes (${selectedQuality})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
