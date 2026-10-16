import React, { useState } from 'react';
import { SearchResult } from '../types';
import { Film, Plus, X, CheckSquare, Square } from 'lucide-react';

interface SeriesDialogProps {
  item: SearchResult;
  isOpen: boolean;
  onClose: () => void;
  onAddEpisodes: (episodes: { title: string; episodeNumber: number; url: string; duration?: string }[]) => void;
  theme?: 'dark' | 'light';
}

export const SeriesDialog: React.FC<SeriesDialogProps> = ({
  item,
  isOpen,
  onClose,
  onAddEpisodes,
  theme = 'dark',
}) => {
  const seriesTitle = item.series_name || item.title.replace(/ep(isode)?\s*\d+/i, '').trim() || 'Series Package';
  const currentEp = item.episode_number || 1;

  // Generate 6 episodes around this one
  const generatedEpisodes = Array.from({ length: 6 }, (_, idx) => {
    const epNum = Math.max(1, currentEp - 1 + idx);
    return {
      id: `ep-${epNum}`,
      episodeNumber: epNum,
      title: `${seriesTitle} - Episode ${epNum}`,
      duration: '24:15',
      url: `${item.url.split('&')[0]}#ep${epNum}`
    };
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(generatedEpisodes.slice(0, 3).map((e) => e.id))
  );

  if (!isOpen) return null;
  const isDark = theme === 'dark';

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    setSelectedIds(new Set(generatedEpisodes.map((e) => e.id)));
  };

  const handleConfirm = () => {
    const toQueue = generatedEpisodes.filter((e) => selectedIds.has(e.id));
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
            <div>
              <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Series / Episode Detected</h3>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{seriesTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'text-gray-400 hover:text-white hover:bg-[#3c3c3c]' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className={`flex justify-between items-center text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            <span>Select episodes to add to queue in sequence:</span>
            <button
              onClick={selectAll}
              className="text-[#10b981] hover:underline cursor-pointer font-medium"
            >
              Select All
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {generatedEpisodes.map((ep) => {
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
                  <div className="flex items-center gap-3">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#10b981]" />
                    ) : (
                      <Square className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />
                    )}
                    <div>
                      <p className={`font-medium ${isSelected ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-gray-200' : 'text-slate-800')}`}>{ep.title}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Duration: {ep.duration}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                    isDark ? 'bg-[#3c3c3c] text-gray-300' : 'bg-slate-200 text-slate-700'
                  }`}>
                    Ep {ep.episodeNumber}
                  </span>
                </div>
              );
            })}
          </div>
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
            disabled={selectedIds.size === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-[#10b981] hover:bg-[#059669] text-white disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-[#10b981]/20"
          >
            <Plus className="w-4 h-4" />
            Queue {selectedIds.size} Episodes
          </button>
        </div>
      </div>
    </div>
  );
};
