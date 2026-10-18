import React, { useState } from 'react';
import {
  FileText,
  Search,
  Download,
  Eye,
  FileCode,
  Globe,
  Upload,
  Loader2,
  X,
  Volume2,
  ExternalLink
} from 'lucide-react';
import { SubtitleItem, AppSettings } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { SurfaceCard } from '../components/common/SurfaceCard';
import { EmptyState } from '../components/common/EmptyState';

interface SubtitlesScreenProps {
  theme?: 'dark' | 'light';
  settings?: AppSettings;
}

export const SubtitlesScreen: React.FC<SubtitlesScreenProps> = ({ theme = 'dark', settings }) => {
  const [query, setQuery] = useState<string>('Interstellar');
  const [language, setLanguage] = useState<string>('eng');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<SubtitleItem[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [selectedPreview, setSelectedPreview] = useState<SubtitleItem | null>(null);
  const [droppedFileName, setDroppedFileName] = useState<string>('');
  const [dataSource, setDataSource] = useState<string>('');

  const isDark = theme === 'dark';

  const languages = [
    { code: 'eng', name: 'English' },
    { code: 'spa', name: 'Spanish' },
    { code: 'fra', name: 'French' },
    { code: 'deu', name: 'German' },
    { code: 'ita', name: 'Italian' },
    { code: 'por', name: 'Portuguese' },
    { code: 'rus', name: 'Russian' },
    { code: 'jpn', name: 'Japanese' },
    { code: 'zho', name: 'Chinese' },
    { code: 'kor', name: 'Korean' },
    { code: 'ara', name: 'Arabic' },
    { code: 'hin', name: 'Hindi' },
  ];

  const handleSearch = async (overrideQuery?: string) => {
    const q = overrideQuery ?? query;
    if (!q.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch('/api/subtitles/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          language,
        }),
      });

      if (!res.ok) {
        throw new Error('Subtitle search query failed');
      }

      const data = await res.json();
      setResults(data.subtitles || []);
      setDataSource(data.source || 'OpenSubtitles REST API');
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      setDroppedFileName(file.name);
      const cleanTitle = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[._]/g, ' ')
        .replace(/\b(1080p|720p|480p|BluRay|WEBRip|x264|AAC)\b/gi, '')
        .trim();
      setQuery(cleanTitle);
      handleSearch(cleanTitle);
    }
  };

  const handleDownloadSrt = (sub: SubtitleItem) => {
    const blob = new Blob([sub.srt_content || '1\n00:00:01,000 --> 00:00:04,000\n[Synchronized Subtitle]\n'], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sub.file_name.endsWith('.srt') ? sub.file_name : `${sub.file_name}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 1. Standardized PageHeader */}
      <PageHeader
        icon={<FileText className="w-6 h-6" />}
        title="Subtitles Manager"
        description="Search, preview, and download synchronized .SRT subtitles from OpenSubtitles"
        badge={dataSource ? { text: dataSource, variant: 'emerald' } : undefined}
        theme={theme}
      />

      {/* 2. Drag & Drop + Search Bar Card */}
      <SurfaceCard theme={theme} className="p-5 sm:p-6 space-y-4 shadow-sm">
        {/* Drag and drop local video file box */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${
            isDark
              ? 'border-[#2d2d2d] hover:border-[#10b981] bg-[#1e1e1e]'
              : 'border-slate-300 hover:border-[#10b981] bg-slate-50'
          }`}
        >
          <Upload className="w-5 h-5 mx-auto text-[#10b981] mb-1.5" />
          <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
            {droppedFileName ? (
              <span className="text-[#10b981]">Matched local media: {droppedFileName}</span>
            ) : (
              'Drag and drop a local video file here to auto-match subtitles by filename'
            )}
          </p>
        </div>

        {/* Query Input + Language Selector */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subtitle by movie, anime, or video title..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm font-mono transition-all focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] ${
                isDark
                  ? 'bg-[#1e1e1e] border-[#2d2d2d] text-white placeholder-gray-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <div className="flex gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={`px-3 py-2.5 rounded-lg border text-xs sm:text-sm font-mono focus:outline-none focus:border-[#10b981] ${
                isDark ? 'bg-[#1e1e1e] border-[#2d2d2d] text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-[#10b981]/20 disabled:opacity-50 cursor-pointer shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Search</span>
            </button>
          </div>
        </form>
      </SurfaceCard>

      {/* 3. Subtitles Results Section */}
      <SurfaceCard theme={theme} className="overflow-hidden shadow-sm">
        <div className={`px-6 py-3.5 border-b flex items-center justify-between text-xs ${
          isDark ? 'bg-[#1e1e1e] border-[#2d2d2d]' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-[#10b981]" />
            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Available Subtitles ({results.length})
            </h2>
          </div>
          <span className={`font-mono text-[11px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            Format: Standard .SRT
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#10b981] animate-spin mx-auto" />
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              Querying OpenSubtitles for synchronized tracks...
            </p>
          </div>
        ) : results.length === 0 ? (
          <EmptyState
            icon={<Globe className="w-6 h-6" />}
            title={hasSearched ? 'No matching subtitles found' : 'Search or drop a video file'}
            description="Try searching with a different language or general film title keyword."
            theme={theme}
          />
        ) : (
          <>
            {/* Desktop View: High Density Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className={`border-b text-xs uppercase tracking-wider font-semibold ${
                    isDark ? 'border-[#2d2d2d] text-gray-400 bg-[#1e1e1e]/60' : 'border-slate-200 text-slate-500 bg-slate-50'
                  }`}>
                    <th className="py-3 px-4">Release & File Name</th>
                    <th className="py-3 px-4">Language</th>
                    <th className="py-3 px-4">Downloads</th>
                    <th className="py-3 px-4">Rating</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-[#2d2d2d]' : 'divide-slate-100'}`}>
                  {results.map((sub) => (
                    <tr
                      key={sub.id}
                      className={`transition-colors ${
                        isDark ? 'hover:bg-[#1e1e1e]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-[#10b981] shrink-0" />
                          <div className="min-w-0">
                            <p className={`font-medium text-xs sm:text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`} title={sub.file_name}>
                              {sub.file_name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px]">
                              <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>
                                {sub.movie_name}
                              </span>
                              {sub.hearing_impaired && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-blue-500/20 text-blue-400 font-mono">
                                  <Volume2 className="w-2.5 h-2.5" /> HI
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-[#10b981] font-medium">
                          {sub.language}
                        </span>
                      </td>

                      <td className={`py-3 px-4 whitespace-nowrap text-xs font-mono tabular-nums ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                        {sub.download_count.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-xs text-amber-500 font-semibold font-mono">
                        ★ {sub.rating}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {sub.download_url && (
                            <a
                              href={sub.download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                isDark ? 'bg-[#1e1e1e] hover:bg-[#282828] border-[#2d2d2d] text-gray-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                              }`}
                              title="Open on OpenSubtitles"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => setSelectedPreview(sub)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                              isDark ? 'bg-[#1e1e1e] hover:bg-[#282828] border-[#2d2d2d] text-gray-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                          <button
                            onClick={() => handleDownloadSrt(sub)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold shadow transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download .SRT</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Adaptive Card Stack */}
            <div className="block md:hidden divide-y divide-[#2d2d2d] p-3 space-y-3">
              {results.map((sub) => (
                <div
                  key={sub.id}
                  className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-colors ${
                    isDark ? 'bg-[#1e1e1e] border-[#2d2d2d]' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <h4 className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {sub.file_name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-gray-400">
                      <span>{sub.movie_name}</span>
                      <span>·</span>
                      <span className="text-[#10b981]">{sub.language}</span>
                      <span>·</span>
                      <span>★ {sub.rating}</span>
                    </div>
                  </div>

                  <div className={`pt-2 border-t flex items-center justify-between gap-2 ${
                    isDark ? 'border-[#2d2d2d]' : 'border-slate-200'
                  }`}>
                    <span className="text-[11px] font-mono text-gray-400">
                      {sub.download_count.toLocaleString()} dl
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedPreview(sub)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer ${
                          isDark ? 'bg-[#252526] border-[#2d2d2d] text-gray-300' : 'bg-white border-slate-300 text-slate-700'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <button
                        onClick={() => handleDownloadSrt(sub)}
                        className="px-3 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>.SRT</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </SurfaceCard>

      {/* Subtitle Preview Modal */}
      {selectedPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fadeIn">
          <div className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#252526] border-[#2d2d2d] text-[#d4d4d4]' : 'bg-white border-slate-300 text-slate-800'
          }`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${
              isDark ? 'bg-[#1e1e1e] border-[#2d2d2d]' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center gap-2 min-w-0 pr-4">
                <FileText className="w-5 h-5 text-[#10b981] shrink-0" />
                <h3 className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Subtitle Preview: {selectedPreview.file_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPreview(null)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDark ? 'text-gray-400 hover:text-white hover:bg-[#282828]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <pre className={`p-4 rounded-xl border text-xs font-mono overflow-y-auto max-h-80 whitespace-pre-wrap ${
                isDark ? 'bg-[#1e1e1e] border-[#2d2d2d] text-gray-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}>
                {selectedPreview.srt_content || 'No preview available.'}
              </pre>
            </div>

            <div className={`flex items-center justify-end gap-3 px-6 py-3 border-t ${
              isDark ? 'bg-[#1e1e1e] border-[#2d2d2d]' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setSelectedPreview(null)}
                className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer ${
                  isDark ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleDownloadSrt(selectedPreview);
                  setSelectedPreview(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#10b981] hover:bg-[#059669] text-white shadow-md cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .SRT</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
