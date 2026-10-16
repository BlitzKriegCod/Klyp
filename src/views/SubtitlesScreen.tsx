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
          apiKey: settings?.os_api_key
        }),
      });
      const data = await res.json();
      setResults(data.results || []);
      setDataSource(data.source === 'opensubtitles_live' ? 'Live OpenSubtitles REST API' : 'Cached / Local Subtitle Engine');
    } catch (e) {
      console.error('Subtitle search error:', e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    handleSearch('Interstellar');
  }, [language]);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const name = files[0].name.replace(/\.[^/.]+$/, '');
      setDroppedFileName(files[0].name);
      setQuery(name);
      handleSearch(name);
    }
  };

  const handleDownloadSrt = async (sub: SubtitleItem) => {
    try {
      const res = await fetch('/api/subtitles/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: (sub as any).file_id,
          query: sub.movie_name,
          language: sub.language_code,
          apiKey: settings?.os_api_key,
          osUsername: settings?.os_username,
          osPassword: settings?.os_password
        })
      });

      const data = await res.json();
      const content =
        data.srt_content ||
        sub.srt_content ||
        `1\n00:00:01,000 --> 00:00:04,500\n[Klyp Subtitle Engine]\nSynchronized Subtitles for ${sub.movie_name}\n\n2\n00:00:05,000 --> 00:00:09,000\nLanguage: ${sub.language} (SRT)\n`;

      const fileName = data.file_name || sub.file_name || `${sub.movie_name}.srt`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.endsWith('.srt') ? fileName : `${fileName}.srt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading subtitle:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <FileText className="w-6 h-6 text-[#10b981]" />
            Subtitles Manager
          </h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            Search and download synchronized subtitles (.SRT) via OpenSubtitles REST API
          </p>
        </div>
        {dataSource && (
          <span className={`text-xs px-2.5 py-1 rounded-full font-mono border self-start ${
            isDark ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            ● {dataSource}
          </span>
        )}
      </div>

      {/* Search & File Drop Container Card */}
      <div className={`rounded-xl border p-6 space-y-4 transition-colors ${
        isDark ? 'bg-[#252526] border-[#3c3c3c] shadow-xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {/* Drag and drop local video file box */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
            isDark
              ? 'border-[#454545] hover:border-[#10b981] bg-[#1e1e1e]'
              : 'border-slate-300 hover:border-[#10b981] bg-slate-50'
          }`}
        >
          <Upload className="w-6 h-6 mx-auto text-[#10b981] mb-2" />
          <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
            {droppedFileName ? (
              <span className="text-[#10b981]">Matched local video: {droppedFileName}</span>
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
              placeholder="Search subtitle by movie, anime, or video name..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] ${
                isDark
                  ? 'bg-[#1e1e1e] border-[#3c3c3c] text-white placeholder-gray-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <div className="flex gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={`px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:border-[#10b981] ${
                isDark ? 'bg-[#1e1e1e] border-[#3c3c3c] text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-sm font-semibold transition-all shadow-md shadow-[#10b981]/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Subtitles Results Table */}
      <div className={`rounded-xl border overflow-hidden transition-colors ${
        isDark ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white border-slate-200'
      }`}>
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-[#1e1e1e] border-[#3c3c3c]' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-[#10b981]" />
            <h2 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Available Subtitles ({results.length})
            </h2>
          </div>
          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            Format: Standard .SRT
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#10b981] animate-spin mx-auto" />
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              Querying OpenSubtitles REST API for synchronized subtitle files...
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Globe className="w-8 h-8 text-gray-500 mx-auto" />
            <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
              {hasSearched ? 'No matching subtitles found' : 'Enter a title or drag a file to search'}
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
              Try selecting a different language or general title keyword
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className={`border-b text-xs uppercase tracking-wider font-semibold ${
                  isDark ? 'border-[#3c3c3c] text-gray-400 bg-[#1e1e1e]/50' : 'border-slate-200 text-slate-500 bg-slate-50'
                }`}>
                  <th className="py-3 px-4">Release & File Name</th>
                  <th className="py-3 px-4">Language</th>
                  <th className="py-3 px-4">Downloads</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-[#333]' : 'divide-slate-100'}`}>
                {results.map((sub) => (
                  <tr
                    key={sub.id}
                    className={`transition-colors ${
                      isDark ? 'hover:bg-[#1e1e1e]/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-[#10b981] shrink-0" />
                        <div className="min-w-0">
                          <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`} title={sub.file_name}>
                            {sub.file_name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
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
                      <span className={`px-2 py-0.5 rounded border text-xs font-medium text-[#10b981] ${
                        isDark ? 'bg-[#1e1e1e] border-[#3c3c3c]' : 'bg-slate-100 border-slate-200'
                      }`}>
                        {sub.language}
                      </span>
                    </td>

                    <td className={`py-3 px-4 whitespace-nowrap text-xs font-mono ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                      {sub.download_count.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-xs text-amber-500 font-semibold">
                      ★ {sub.rating}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {sub.download_url && (
                          <a
                            href={sub.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                              isDark ? 'bg-[#1e1e1e] hover:bg-[#3c3c3c] text-gray-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                            title="Open in OpenSubtitles.com"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => setSelectedPreview(sub)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                            isDark ? 'bg-[#1e1e1e] hover:bg-[#3c3c3c] text-gray-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Preview
                        </button>
                        <button
                          onClick={() => handleDownloadSrt(sub)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold shadow transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download .SRT
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subtitle Preview Modal */}
      {selectedPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn">
          <div className={`w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#252526] border-[#454545] text-[#d4d4d4]' : 'bg-white border-slate-300 text-slate-800'
          }`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${
              isDark ? 'bg-[#1e1e1e] border-[#3c3c3c]' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#10b981]" />
                <h3 className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Subtitle Preview: {selectedPreview.file_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPreview(null)}
                className={`p-1 rounded-md transition-colors ${
                  isDark ? 'text-gray-400 hover:text-white hover:bg-[#3c3c3c]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <pre className={`p-4 rounded-lg border text-xs font-mono overflow-y-auto max-h-80 whitespace-pre-wrap ${
                isDark ? 'bg-[#1e1e1e] border-[#3c3c3c] text-gray-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}>
                {selectedPreview.srt_content || 'No preview available.'}
              </pre>
            </div>

            <div className={`flex items-center justify-end gap-3 px-6 py-3 border-t ${
              isDark ? 'bg-[#1e1e1e] border-[#3c3c3c]' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setSelectedPreview(null)}
                className={`px-4 py-1.5 rounded-lg text-xs ${isDark ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleDownloadSrt(selectedPreview);
                  setSelectedPreview(null);
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#10b981] hover:bg-[#059669] text-white cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
