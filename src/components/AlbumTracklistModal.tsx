import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Download,
  CheckSquare,
  Square,
  Disc3,
  Layers,
  Loader2
} from 'lucide-react';
import type { MusicAlbum, MusicTrack } from '../types/music';

interface AlbumTracklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  album: MusicAlbum | null;
  theme: 'dark' | 'light';
  onDownloadTracks: (
    tracks: MusicTrack[],
    format: 'mp3' | 'flac',
    quality: '320kbps' | 'lossless'
  ) => void;
}

export const AlbumTracklistModal: React.FC<AlbumTracklistModalProps> = ({
  isOpen,
  onClose,
  album,
  theme,
  onDownloadTracks
}) => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio preview player state
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Format selection
  const [selectedFormat, setSelectedFormat] = useState<'mp3' | 'flac'>('mp3');
  const [selectedQuality, setSelectedQuality] = useState<'320kbps' | 'lossless'>('320kbps');

  // Load tracks when album opens
  useEffect(() => {
    if (!isOpen || !album) {
      setTracks([]);
      setSelectedIds(new Set());
      setPlayingTrackId(null);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/music/album/${album.id}/tracks`)
      .then((res) => {
        if (!res.ok) throw new Error('Could not fetch album tracklist');
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        const loadedTracks: MusicTrack[] = data.tracks || [];
        setTracks(loadedTracks);
        // By default select all tracks in the album
        setSelectedIds(new Set(loadedTracks.map((t) => t.id)));
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load tracks');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isOpen, album]);

  // Handle Audio preview toggle
  const togglePlayTrack = (track: MusicTrack) => {
    if (!track.previewUrl) return;

    if (playingTrackId === track.id) {
      if (audioRef.current) {
        if (audioRef.current.paused) {
          audioRef.current.play();
        } else {
          audioRef.current.pause();
          setPlayingTrackId(null);
        }
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(track.previewUrl);
      audioRef.current = audio;
      setPlayingTrackId(track.id);

      audio.onended = () => {
        setPlayingTrackId(null);
      };

      audio.play().catch(() => {
        setPlayingTrackId(null);
      });
    }
  };

  // Toggle selection
  const toggleTrackSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === tracks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tracks.map((t) => t.id)));
    }
  };

  const handleDownloadSelected = () => {
    const selectedTracks = tracks.filter((t) => selectedIds.has(t.id));
    if (selectedTracks.length === 0) return;
    onDownloadTracks(selectedTracks, selectedFormat, selectedQuality);
    onClose();
  };

  const handleDownloadFullAlbum = () => {
    if (tracks.length === 0) return;
    onDownloadTracks(tracks, selectedFormat, selectedQuality);
    onClose();
  };

  if (!isOpen || !album) return null;

  const isDark = theme === 'dark';
  const allSelected = tracks.length > 0 && selectedIds.size === tracks.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl border overflow-hidden transition-all ${
          isDark
            ? 'bg-[#252526] border-[#2d2d2d] text-[#d4d4d4]'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Modal Top Header with Album Hero */}
        <div
          className={`p-6 border-b flex flex-col md:flex-row gap-6 items-start relative ${
            isDark ? 'bg-[#1e1e1e] border-[#2d2d2d]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {/* High-res Album Artwork */}
          <div className="relative shrink-0 w-36 h-36 md:w-44 md:h-44 rounded-xl overflow-hidden shadow-xl border border-white/10 group">
            <img
              src={album.artworkUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500'}
              alt={album.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] text-[#10b981] font-mono font-medium">
              <Disc3 className="w-3 h-3 animate-spin text-[#10b981]" />
              <span>{album.type.toUpperCase()}</span>
            </div>
          </div>

          {/* Album Information */}
          <div className="flex-1 min-w-0 pr-8">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#10b981]">
                {album.genre}
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-xs font-mono text-gray-400">{album.releaseYear}</span>
            </div>

            <h2 className={`text-2xl md:text-3xl font-bold tracking-tight truncate mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {album.title}
            </h2>

            <p className="text-base text-[#10b981] font-medium mb-3 truncate">
              {album.artist}
            </p>

            {/* Zero-pill typographic metadata middot list */}
            <div className="text-xs text-gray-400 font-mono flex flex-wrap items-center gap-x-2 gap-y-1 mb-4">
              <span>{album.trackCount} Official Tracks</span>
              <span>·</span>
              <span>1200×1200px Cover Art</span>
              <span>·</span>
              <span>Full ID3v2 Tags</span>
              {album.copyright && (
                <>
                  <span>·</span>
                  <span className="truncate max-w-xs">{album.copyright}</span>
                </>
              )}
            </div>

            {/* Format & Quality Selector */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span>Format:</span>
                <div
                  className={`inline-flex rounded-lg p-0.5 border ${
                    isDark ? 'bg-[#252526] border-[#2d2d2d]' : 'bg-slate-200/60 border-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFormat('mp3');
                      setSelectedQuality('320kbps');
                    }}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      selectedFormat === 'mp3'
                        ? 'bg-[#10b981] text-black font-semibold shadow-sm'
                        : isDark
                        ? 'text-gray-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    MP3 (320k)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFormat('flac');
                      setSelectedQuality('lossless');
                    }}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      selectedFormat === 'flac'
                        ? 'bg-[#10b981] text-black font-semibold shadow-sm'
                        : isDark
                        ? 'text-gray-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    FLAC (Lossless)
                  </button>
                </div>
              </div>

              <div className="text-xs text-[#10b981] font-mono bg-[#10b981]/10 px-2.5 py-1 rounded-md border border-[#10b981]/20">
                ✓ Embedded Cover & Metadata Included
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-xl transition-colors cursor-pointer ${
              isDark ? 'hover:bg-[#282828] text-gray-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Header for Tracklist: Selection & Stats */}
        <div
          className={`px-6 py-3 border-b flex items-center justify-between text-xs ${
            isDark ? 'bg-[#1e1e1e]/60 border-[#2d2d2d]' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={handleSelectAll}
            className="flex items-center gap-2 font-medium text-[#10b981] hover:text-[#0ea571] cursor-pointer"
          >
            {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            <span>
              {allSelected ? 'Deselect All' : `Select All (${tracks.length} tracks)`}
            </span>
          </button>

          <div className="text-gray-400 font-mono">
            <span>{selectedIds.size} of {tracks.length} tracks selected</span>
          </div>
        </div>

        {/* Scrollable Tracklist */}
        <div className={`flex-1 overflow-y-auto min-h-[260px] p-4 divide-y ${isDark ? 'divide-[#2d2d2d]' : 'divide-slate-200'}`}>
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center text-gray-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#10b981]" />
              <p className="text-sm font-medium">Fetching complete tracklist & previews...</p>
            </div>
          )}

          {error && (
            <div className="py-12 text-center text-red-400 px-4">
              <p className="text-sm">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                }}
                className="mt-3 text-xs text-[#10b981] underline"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && tracks.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <p className="text-sm">No tracks available for this album release.</p>
            </div>
          )}

          {!loading &&
            !error &&
            tracks.map((track) => {
              const isSelected = selectedIds.has(track.id);
              const isPlaying = playingTrackId === track.id;

              return (
                <div
                  key={track.id}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isPlaying
                      ? isDark
                        ? 'bg-[#10b981]/15 border border-[#10b981]/30 text-white'
                        : 'bg-[#10b981]/10 border border-[#10b981]/30'
                      : isDark
                      ? 'hover:bg-[#1e1e1e]'
                      : 'hover:bg-slate-100'
                  }`}
                >
                  {/* Select Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleTrackSelection(track.id)}
                    className="p-1 text-gray-400 hover:text-[#10b981] cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#10b981]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  {/* Play preview button / Track Number */}
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    {track.previewUrl ? (
                      <button
                        type="button"
                        onClick={() => togglePlayTrack(track)}
                        title={isPlaying ? 'Pause 30s preview' : 'Play 30s audio preview'}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                          isPlaying
                            ? 'bg-[#10b981] text-black'
                            : 'bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981] hover:text-black'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                      </button>
                    ) : (
                      <span className="font-mono text-xs text-gray-500">
                        {String(track.trackNumber).padStart(2, '0')}
                      </span>
                    )}
                  </div>

                  {/* Track Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        onClick={() => toggleTrackSelection(track.id)}
                        className={`text-sm font-medium truncate cursor-pointer ${
                          isSelected ? (isDark ? 'text-white' : 'text-slate-900') : 'text-gray-400'
                        }`}
                      >
                        {track.title}
                      </p>
                      {isPlaying && (
                        <span className="flex items-center gap-0.5 h-3">
                          <span className="w-1 bg-[#10b981] rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
                          <span className="w-1 bg-[#10b981] rounded-full animate-bounce [animation-delay:-0.15s] h-2" />
                          <span className="w-1 bg-[#10b981] rounded-full animate-bounce h-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                      <span>{track.artist}</span>
                      {track.discNumber && track.discNumber > 1 && (
                        <>
                          <span>•</span>
                          <span>Disc {track.discNumber}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="text-xs font-mono text-gray-400 shrink-0">
                    {track.durationFormatted}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Modal Bottom Bar: Download Actions */}
        <div
          className={`p-4 px-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
            isDark ? 'bg-[#1e1e1e] border-[#2d2d2d]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="text-xs text-gray-400 font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span>Ready for batch download in {selectedFormat.toUpperCase()} ({selectedQuality})</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDownloadSelected}
              disabled={selectedIds.size === 0}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-medium text-xs bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white flex items-center justify-center gap-2 shadow-md shadow-[#10b981]/20 cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Selected ({selectedIds.size})</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadFullAlbum}
              disabled={tracks.length === 0}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-medium text-xs border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                isDark
                  ? 'border-[#2d2d2d] bg-[#252526] hover:bg-[#2d2d2d] text-white'
                  : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4 text-[#10b981]" />
              <span>Download Full Album ({tracks.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
