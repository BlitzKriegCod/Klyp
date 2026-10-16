import React, { useState } from 'react';
import {
  FileText,
  Search,
  Download,
  Eye,
  CheckCircle,
  FileCode,
  Globe,
  Upload,
  Loader2,
  X,
  Volume2
} from 'lucide-react';
import { SubtitleItem } from '../types';

export const SubtitlesScreen: React.FC = () => {
  const [query, setQuery] = useState<string>('Interstellar');
  const [language, setLanguage] = useState<string>('eng');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<SubtitleItem[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [selectedPreview, setSelectedPreview] = useState<SubtitleItem | null>(null);
  const [droppedFileName, setDroppedFileName] = useState<string>('');

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
      const data = await res.json();
      setResults(data.results || []);
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

  const handleDownloadSrt = (sub: SubtitleItem) => {
    const content =
      sub.srt_content ||
      `1\n00:00:01,000 --> 00:00:04,500\n[Klyp Subtitle Engine]\nSynchronized Subtitles for ${sub.movie_name}\n\n2\n00:00:05,000 --> 00:00:09,000\nLanguage: ${sub.language} (SRT)\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = sub.file_name.endsWith('.srt') ? sub.file_name : `${sub.file_name}.srt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-[#10b981]" />
          Subtitles Manager
        </h1>
        <p className="text-sm text-gray-400">
          Search and download synchronized subtitles (.SRT) via OpenSubtitles
        </p>
      </div>

      {/* Search & File Drop Container */}
      <div className="rounded-xl bg-[#252526] border border-[#3c3c3c] p-6 shadow-xl space-y-4">
        {/* Drag and drop local video file box */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className="border-2 border-dashed border-[#454545] hover:border-[#10b981] rounded-lg p-4 text-center bg-[#1e1e1e] transition-colors cursor-pointer"
        >
          <Upload className="w-6 h-6 mx-auto text-[#10b981] mb-2" />
          <p className="text-xs text-gray-300 font-medium">
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
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subtitle by movie or series title (e.g. Inception, Dune)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#1e1e1e] border border-[#454545] text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[#10b981]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-3 py-2.5 rounded-lg bg-[#1e1e1e] border border-[#454545] text-gray-200 text-sm focus:outline-none focus:border-[#10b981]"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-sm font-semibold shadow-lg shadow-[#10b981]/20 disabled:opacity-50 transition-all cursor-pointer shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Find Subtitles
          </button>
        </form>
      </div>

      {/* Subtitles Results Table */}
      <div className="rounded-xl bg-[#252526] border border-[#3c3c3c] overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#3c3c3c] bg-[#1e1e1e]">
          <h3 className="font-semibold text-sm text-gray-300">
            Available Subtitles ({results.length})
          </h3>
          <span className="text-xs text-gray-500">Format: SubRip (.SRT)</span>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#10b981]" />
            <p className="text-xs text-gray-400">Searching OpenSubtitles repository...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <FileCode className="w-10 h-10 mx-auto text-gray-500" />
            <p className="text-sm font-medium text-gray-300">No subtitles found</p>
            <p className="text-xs">Try searching for the title in another language or keywords.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#d4d4d4]">
              <thead className="bg-[#1e1e1e] border-b border-[#3c3c3c] text-xs uppercase text-gray-400">
                <tr>
                  <th className="py-3 px-5">Release / File Name</th>
                  <th className="py-3 px-4">Language</th>
                  <th className="py-3 px-4">Downloads</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333]">
                {results.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#2a2a2b] transition-colors">
                    <td className="py-3 px-5 max-w-md">
                      <div className="flex items-center gap-2.5">
                        <FileCode className="w-4 h-4 text-[#10b981] shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate font-mono text-xs">
                            {sub.file_name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-400">{sub.movie_name}</span>
                            {sub.hearing_impaired && (
                              <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400">
                                <Volume2 className="w-2.5 h-2.5" /> HI
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] text-xs font-medium text-[#10b981]">
                        {sub.language}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-xs text-gray-300 font-mono">
                      {sub.download_count.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-xs text-amber-400 font-semibold">
                      ★ {sub.rating}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setSelectedPreview(sub)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#1e1e1e] hover:bg-[#3c3c3c] text-gray-300 hover:text-white text-xs transition-colors cursor-pointer"
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
          <div className="w-full max-w-xl rounded-xl bg-[#252526] border border-[#454545] shadow-2xl overflow-hidden text-[#d4d4d4]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#3c3c3c] bg-[#1e1e1e]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#10b981]" />
                <h3 className="font-semibold text-white text-sm truncate">
                  Subtitle Preview: {selectedPreview.file_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPreview(null)}
                className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-[#3c3c3c]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <pre className="p-4 rounded-lg bg-[#1e1e1e] border border-[#3c3c3c] text-xs font-mono text-gray-200 overflow-y-auto max-h-80 whitespace-pre-wrap">
                {selectedPreview.srt_content || 'No preview available.'}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-[#3c3c3c] bg-[#1e1e1e]">
              <button
                onClick={() => setSelectedPreview(null)}
                className="px-4 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleDownloadSrt(selectedPreview);
                  setSelectedPreview(null);
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#10b981] hover:bg-[#059669] text-white"
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
