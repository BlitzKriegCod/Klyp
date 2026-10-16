import React, { useState } from 'react';
import { SearchResult } from '../types';
import { Film, Plus, X, CheckSquare, Square } from 'lucide-react';

interface SeriesDialogProps {
  item: SearchResult;
  isOpen: boolean;
  onClose: () => void;
  onAddEpisodes: (episodes: { title: string; episodeNumber: number; url: string; duration?: string }[]) => void;
}

export const SeriesDialog: React.FC<SeriesDialogProps> = ({
  item,
  isOpen,
  onClose,
  onAddEpisodes,
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
      <div className="w-full max-w-lg rounded-xl bg-[#252526] border border-[#454545] shadow-2xl overflow-hidden text-[#d4d4d4]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3c3c3c] bg-[#1e1e1e]">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-[#10b981]" />
            <div>
              <h3 className="font-semibold text-lg text-white">Series / Episode Detected</h3>
              <p className="text-xs text-gray-400">{seriesTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#3c3c3c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>Select episodes to add to queue in sequence:</span>
            <button
              onClick={selectAll}
              className="text-[#10b981] hover:underline cursor-pointer"
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
                      ? 'border-[#10b981] bg-[#10b981]/15 text-white'
                      : 'border-[#3c3c3c] bg-[#1e1e1e] text-gray-400 hover:border-gray-500 hover:bg-[#2a2a2b]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#10b981]" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-500" />
                    )}
                    <div>
                      <p className="font-medium text-white">{ep.title}</p>
                      <p className="text-xs text-gray-400">Duration: {ep.duration}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#3c3c3c] text-gray-300">
                    Ep {ep.episodeNumber}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#3c3c3c] bg-[#1e1e1e]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#3c3c3c]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-[#10b981] hover:bg-[#059669] text-white disabled:opacity-50 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Queue {selectedIds.size} Episodes
          </button>
        </div>
      </div>
    </div>
  );
};
