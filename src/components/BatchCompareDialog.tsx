import React from 'react';
import { SearchResult } from '../types';
import { X, Layers, Plus, ExternalLink } from 'lucide-react';

interface BatchCompareDialogProps {
  items: SearchResult[];
  isOpen: boolean;
  onClose: () => void;
  onAddToQueue: (item: SearchResult) => void;
  theme?: 'dark' | 'light';
}

export const BatchCompareDialog: React.FC<BatchCompareDialogProps> = ({
  items,
  isOpen,
  onClose,
  onAddToQueue,
  theme = 'dark',
}) => {
  if (!isOpen || items.length === 0) return null;
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn">
      <div className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden transition-colors ${
        isDark ? 'bg-[#252526] border-[#454545] text-[#d4d4d4]' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'bg-[#1e1e1e] border-[#3c3c3c]' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#10b981]" />
            <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Compare Media Streams ({items.length})</h3>
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

        {/* Content Table / Columns */}
        <div className="flex-1 overflow-x-auto p-6">
          <div className="grid grid-flow-col auto-cols-[280px] gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col rounded-lg border overflow-hidden ${
                  isDark ? 'bg-[#1e1e1e] border-[#3c3c3c]' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video w-full bg-black">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-xs font-mono font-medium bg-black/80 text-white rounded">
                    {item.duration}
                  </span>
                  <span
                    className="absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold rounded-full text-white"
                    style={{ backgroundColor: item.platform_color || '#10b981' }}
                  >
                    {item.platform_icon} {item.platform}
                  </span>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className={`font-medium text-sm line-clamp-2 ${isDark ? 'text-white' : 'text-slate-900'}`} title={item.title}>
                      {item.title}
                    </h4>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{item.author}</p>
                  </div>

                  <div className={`space-y-2 text-xs border-t pt-3 ${isDark ? 'border-[#2a2a2b]' : 'border-slate-200'}`}>
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>Category:</span>
                      <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>{item.platform_category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>Views:</span>
                      <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>
                        {item.view_count ? item.view_count.toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>Likes:</span>
                      <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>
                        {item.like_count ? item.like_count.toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>Uploaded:</span>
                      <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>{item.upload_date || 'Recent'}</span>
                    </div>
                    <div>
                      <span className={`block mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Qualities:</span>
                      <div className="flex flex-wrap gap-1">
                        {(item.available_qualities || ['1080p', '720p', 'Audio Only']).map((q) => (
                          <span
                            key={q}
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              isDark ? 'bg-[#2a2a2b] text-gray-300' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {q}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => onAddToQueue(item)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold shadow transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add to Queue
                    </button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                        isDark ? 'bg-[#2a2a2b] hover:bg-[#3c3c3c] text-gray-300 hover:text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Stream Link
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end px-6 py-3 border-t ${
          isDark ? 'bg-[#1e1e1e] border-[#3c3c3c]' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              isDark ? 'text-gray-400 hover:text-white hover:bg-[#3c3c3c]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
