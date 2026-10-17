import React, { useState, useEffect } from 'react';
import { SearchResult } from '../types';
import { Film, Plus, X, CheckSquare, Square, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export interface SeriesEpisodeItem {
  id: string;
  episodeNumber: number;
  title: string;
  url: string;
  duration?: string;
  thumbnail?: string;
  author?: string;
}

interface SeriesDialogProps {
  item: SearchResult | any;
  isOpen: boolean;
  onClose: () => void;
  onAddEpisodes: (episodes: SeriesEpisodeItem[]) => void;
  theme?: 'dark' | 'light';
}

export const SeriesDialog: React.FC<SeriesDialogProps> = ({
  item,
  isOpen,
  onClose,
  onAddEpisodes,
  theme = 'dark',
}) => {
  const [episodes, setEpisodes] = useState<SeriesEpisodeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const seriesTitle = item.series_name || item.title?.replace(/ep(isode)?\s*\d+/i, '').trim() || 'Series / Playlist Package';

  const loadEpisodes = async () => {
    setLoading(true);
    setError(null);

    // If item already has real entries attached from /api/extract
    if (item.entries && Array.isArray(item.entries) && item.entries.length > 0) {
      const parsed: SeriesEpisodeItem[] = item.entries.map((e: any, idx: number) => ({
        id: e.id || `entry-${idx}`,
        episodeNumber: idx + 1,
        title: e.title || `Item ${idx + 1}`,
        url: e.url || item.url,
        duration: e.duration || 'Unknown',
        thumbnail: e.thumbnail || item.thumbnail || '',
        author: e.author || item.author || ''
      }));
      setEpisodes(parsed);
      setSelectedIds(new Set(parsed.map((p) => p.id)));
      setLoading(false);
      return;
    }

    // Call live playlist expansion API
    try {
      const res = await fetch('/api/playlist/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url, limit: 50 })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to expand playlist entries');
      }

      const data = await res.json();
      if (Array.isArray(data.entries) && data.entries.length > 0) {
        setEpisodes(data.entries);
        setSelectedIds(new Set(data.entries.map((e: SeriesEpisodeItem) => e.id)));
      } else {
        // Fallback to single item if no playlist entries
        const single: SeriesEpisodeItem = {
          id: item.id || `single-1`,
          episodeNumber: 1,
          title: item.title,
          url: item.url,
          duration: item.duration || 'Unknown',
          thumbnail: item.thumbnail || '',
          author: item.author || ''
        };
        setEpisodes([single]);
        setSelectedIds(new Set([single.id]));
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load real playlist entries from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && item?.url) {
      loadEpisodes();
    }
  }, [isOpen, item?.url]);

  if (!isOpen) return null;
  const isDark = theme === 'dark';

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

  const handleConfirm = () => {
    const toQueue = episodes.filter((e) => selectedIds.has(e.id));
    onAddEpisodes(toQueue);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn">
      <div className={`w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden transition-colors ${
        isDark ? 'bg-[#252526] border-[#454545] text-[#d4d4d4]' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'bg-[#1e1e1e] border-[#3c3c3c]' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-[#10b981]" />
            <div className="min-w-0">
              <h3 className={`font-semibold text-lg truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Series / Playlist Package
              </h3>
              <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{seriesTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadEpisodes}
              disabled={loading}
              title="Refresh playlist"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-gray-400 hover:text-white hover:bg-[#3c3c3c]' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#10b981]' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-gray-400 hover:text-white hover:bg-[#3c3c3c]' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className={`flex justify-between items-center text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            <span>
              {loading
                ? 'Resolving live playlist entries...'
                : error
                ? 'Playlist extraction report'
                : `Found ${episodes.length} real playlist items:`}
            </span>
            {episodes.length > 0 && !loading && (
              <button
                onClick={selectAll}
                className="text-[#10b981] hover:underline cursor-pointer font-medium"
              >
                {selectedIds.size === episodes.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-[#10b981]" />
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                Querying backend yt-dlp flat playlist engine...
              </p>
            </div>
          ) : error ? (
            <div className={`p-4 rounded-lg border text-sm flex items-start gap-3 ${
              isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <div>
                <p className="font-semibold text-sm">Extraction Error</p>
                <p className="text-xs mt-1">{error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {episodes.map((ep) => {
                const isSelected = selectedIds.has(ep.id);
                return (
                  <div
                    key={ep.id}
                    onClick={() => toggleSelect(ep.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-sm cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#10b981] bg-[#10b981]/15 text-[#10b981] font-semibold'
                        : isDark
                        ? 'border-[#3c3c3c] bg-[#1e1e1e] text-gray-400 hover:border-gray-500 hover:bg-[#2a2a2b]'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#10b981] shrink-0" />
                      ) : (
                        <Square className={`w-4 h-4 shrink-0 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />
                      )}
                      <div className="min-w-0">
                        <p className={`font-medium truncate ${isSelected ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-gray-200' : 'text-slate-800')}`}>
                          {ep.title}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                          Duration: {ep.duration}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded shrink-0 ml-2 ${
                      isDark ? 'bg-[#3c3c3c] text-gray-300' : 'bg-slate-200 text-slate-700'
                    }`}>
                      #{ep.episodeNumber}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${
          isDark ? 'bg-[#1e1e1e] border-[#3c3c3c]' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
              isDark ? 'text-gray-400 hover:text-white hover:bg-[#3c3c3c]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0 || loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-[#10b981] hover:bg-[#059669] text-white disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-[#10b981]/20"
          >
            <Plus className="w-4 h-4" />
            Queue {selectedIds.size} {selectedIds.size === 1 ? 'Item' : 'Items'}
          </button>
        </div>
      </div>
    </div>
  );
};
