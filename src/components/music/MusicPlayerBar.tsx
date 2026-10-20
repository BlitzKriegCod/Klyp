import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  ListMusic,
  Download,
  X,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Loader2,
  Disc3,
  Radio,
  Check,
  Music2
} from 'lucide-react';
import type { MusicTrack } from '../../types/music';

export interface MusicPlayerBarProps {
  currentTrack: MusicTrack | null;
  queue: MusicTrack[];
  currentIndex: number;
  isPlaying: boolean;
  theme: 'dark' | 'light';
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onSelectQueueIndex: (index: number) => void;
  onClearQueue: () => void;
  onClosePlayer: () => void;
  onDownloadTrack?: (track: MusicTrack) => void;
  onDownloadAllInQueue?: (tracks: MusicTrack[]) => void;
  showToast: (msg: string) => void;
}

export const MusicPlayerBar: React.FC<MusicPlayerBarProps> = ({
  currentTrack,
  queue,
  currentIndex,
  isPlaying,
  theme,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onSelectQueueIndex,
  onClearQueue,
  onClosePlayer,
  onDownloadTrack,
  onDownloadAllInQueue,
  showToast
}) => {
  const isDark = theme === 'dark';
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Playback state
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('klyp_music_volume');
      return saved ? parseFloat(saved) : 0.85;
    } catch {
      return 0.85;
    }
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  // Stream resolution state
  const [resolvedStreamUrl, setResolvedStreamUrl] = useState<string | null>(null);
  const [streamSource, setStreamSource] = useState<'stream' | 'local' | 'preview' | 'sample'>('preview');
  const [isResolving, setIsResolving] = useState<boolean>(false);

  // UI Drawer State
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Format time helper (mm:ss)
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Sync volume with HTML audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    try {
      localStorage.setItem('klyp_music_volume', String(volume));
    } catch {}
  }, [volume, isMuted]);

  // Resolve audio stream whenever currentTrack changes
  useEffect(() => {
    if (!currentTrack) {
      setResolvedStreamUrl(null);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    let isCancelled = false;
    setIsResolving(true);

    const resolveStream = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (currentTrack.artist) queryParams.set('artist', currentTrack.artist);
        if (currentTrack.title) queryParams.set('title', currentTrack.title);
        if (currentTrack.album) queryParams.set('album', currentTrack.album);
        if (currentTrack.previewUrl) queryParams.set('previewUrl', currentTrack.previewUrl);
        if (currentTrack.id) queryParams.set('id', currentTrack.id);

        const res = await fetch(`/api/music/stream?${queryParams.toString()}`);
        if (!res.ok) throw new Error('Stream resolver failed');

        const data = await res.json();
        if (isCancelled) return;

        if (data.streamUrl) {
          setResolvedStreamUrl(data.streamUrl);
          setStreamSource(data.source || 'preview');
        } else if (currentTrack.previewUrl) {
          setResolvedStreamUrl(currentTrack.previewUrl);
          setStreamSource('preview');
        } else {
          setResolvedStreamUrl('/api/media/sample');
          setStreamSource('sample');
        }
      } catch (err) {
        if (isCancelled) return;
        // Direct fallback to previewUrl if backend resolution timed out
        if (currentTrack.previewUrl) {
          setResolvedStreamUrl(currentTrack.previewUrl);
          setStreamSource('preview');
        } else {
          setResolvedStreamUrl('/api/media/sample');
          setStreamSource('sample');
        }
      } finally {
        if (!isCancelled) {
          setIsResolving(false);
        }
      }
    };

    resolveStream();

    return () => {
      isCancelled = true;
    };
  }, [currentTrack]);

  // Handle Play/Pause synchronization with HTML Audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying && resolvedStreamUrl) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // Auto-play was prevented or audio failed to load
          console.warn('[MusicPlayerBar] Play was prevented:', err);
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, resolvedStreamUrl]);

  // Handle Track Completion (Auto-advance with shuffle & repeat)
  const handleTrackEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      return;
    }

    if (isShuffle && queue.length > 1) {
      let nextIdx = currentIndex;
      while (nextIdx === currentIndex) {
        nextIdx = Math.floor(Math.random() * queue.length);
      }
      onSelectQueueIndex(nextIdx);
      return;
    }

    if (currentIndex < queue.length - 1) {
      onNextTrack();
    } else if (repeatMode === 'all' && queue.length > 0) {
      onSelectQueueIndex(0);
    } else {
      // Reached the end of the queue
      onTogglePlay(); // Pause
    }
  };

  // Handle Audio Error fallback
  const handleAudioError = () => {
    console.warn('[MusicPlayerBar] Audio stream error encountered. Attempting preview fallback...');
    if (currentTrack?.previewUrl && resolvedStreamUrl !== currentTrack.previewUrl) {
      setResolvedStreamUrl(currentTrack.previewUrl);
      setStreamSource('preview');
      showToast('Switched to high-fidelity AAC preview stream');
    } else {
      showToast(`Unable to play "${currentTrack?.title || 'track'}". Advancing...`);
      if (queue.length > 1) {
        onNextTrack();
      }
    }
  };

  // Seek bar handling
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const handlePrevWithRewind = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    } else {
      onPrevTrack();
    }
  };

  const toggleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <>
      {/* Invisible HTML5 Audio Element */}
      {resolvedStreamUrl && (
        <audio
          ref={audioRef}
          src={resolvedStreamUrl}
          preload="auto"
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration || (currentTrack.durationMs ? currentTrack.durationMs / 1000 : 30));
              if (isPlaying) {
                audioRef.current.play().catch(() => {});
              }
            }
          }}
          onEnded={handleTrackEnded}
          onError={handleAudioError}
        />
      )}

      {/* Main Persistent Bottom Player Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 shadow-2xl border-t ${
          isMinimized ? 'translate-y-[calc(100%-2.5rem)]' : 'translate-y-0'
        } ${
          isDark
            ? 'bg-[#18181b]/95 backdrop-blur-xl border-[#27272a] text-[#f4f4f5]'
            : 'bg-white/95 backdrop-blur-xl border-slate-200 text-slate-800'
        }`}
      >
        {/* Top Slim Scrub Bar for Quick Seek */}
        <div className="relative w-full h-1 bg-transparent group cursor-pointer">
          <div
            className="h-1 bg-[#10b981] group-hover:h-2 transition-all relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-sm transition-opacity" />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            title="Seek playback"
          />
        </div>

        {/* Minimal Expand/Collapse Handle Bar */}
        <div className="flex items-center justify-between px-3 py-0.5 border-b border-black/5 dark:border-white/5 text-[10px] text-gray-500 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
            <span className="truncate">
              {streamSource === 'local'
                ? 'Local File'
                : streamSource === 'stream'
                ? 'Full Stream (Lossless / High-Res)'
                : '30s AAC High-Fidelity Preview'}
            </span>
            {isResolving && (
              <span className="flex items-center gap-1 text-[#10b981]">
                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Resolving Audio...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="hover:text-[#10b981] transition-colors p-0.5"
              title={isMinimized ? 'Expand music player' : 'Minimize player'}
            >
              {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onClosePlayer}
              className="hover:text-red-400 transition-colors p-0.5"
              title="Stop and close music player"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Player Controls Container */}
        <div className="px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
          {/* Left: Track Metadata & Artwork */}
          <div className="flex items-center gap-3 w-full md:w-1/4 min-w-0">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 shadow-md border border-white/10 group">
              <img
                src={currentTrack.artworkUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200'}
                alt={currentTrack.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div
                className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                  isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                {isPlaying ? (
                  <span className="flex items-center gap-0.5 h-3">
                    <span className="w-0.5 bg-[#10b981] rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
                    <span className="w-0.5 bg-[#10b981] rounded-full animate-bounce [animation-delay:-0.15s] h-2" />
                    <span className="w-0.5 bg-[#10b981] rounded-full animate-bounce h-3.5" />
                  </span>
                ) : (
                  <Music2 className="w-4 h-4 text-white" />
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate hover:underline cursor-pointer">
                  {currentTrack.title}
                </p>
              </div>
              <p className="text-xs text-gray-400 truncate">
                {currentTrack.artist} {currentTrack.album ? `• ${currentTrack.album}` : ''}
              </p>
            </div>

            {onDownloadTrack && (
              <button
                type="button"
                onClick={() => onDownloadTrack(currentTrack)}
                className="p-1.5 text-gray-400 hover:text-[#10b981] transition-colors rounded-lg hover:bg-white/5 shrink-0"
                title="Download this track (MP3 320k with embedded art)"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Center: Playback Controls & Progress Bar */}
          <div className="flex flex-col items-center gap-1 w-full md:w-2/4 max-w-xl">
            {/* Control Buttons */}
            <div className="flex items-center gap-3">
              {/* Shuffle */}
              <button
                type="button"
                onClick={() => {
                  const next = !isShuffle;
                  setIsShuffle(next);
                  showToast(next ? 'Shuffle enabled' : 'Shuffle disabled');
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isShuffle ? 'text-[#10b981] bg-[#10b981]/10' : 'text-gray-400 hover:text-white'
                }`}
                title={isShuffle ? 'Shuffle on' : 'Shuffle off'}
              >
                <Shuffle className="w-4 h-4" />
              </button>

              {/* Prev */}
              <button
                type="button"
                onClick={handlePrevWithRewind}
                className="p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Previous track"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              {/* Play / Pause Primary Button */}
              <button
                type="button"
                onClick={onTogglePlay}
                disabled={isResolving && !resolvedStreamUrl}
                className="w-9 h-9 rounded-full bg-[#10b981] hover:bg-[#059669] text-black flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-md shadow-[#10b981]/20 cursor-pointer disabled:opacity-50"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isResolving && !resolvedStreamUrl ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              {/* Next */}
              <button
                type="button"
                onClick={onNextTrack}
                className="p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Next track"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Repeat Mode */}
              <button
                type="button"
                onClick={toggleRepeat}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer relative ${
                  repeatMode !== 'off' ? 'text-[#10b981] bg-[#10b981]/10' : 'text-gray-400 hover:text-white'
                }`}
                title={`Repeat: ${repeatMode}`}
              >
                {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              </button>
            </div>

            {/* Time & Interactive Scrubber Bar */}
            <div className="w-full flex items-center gap-2.5 text-xs font-mono text-gray-400">
              <span className="w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
              <div className="relative flex-1 flex items-center h-4">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-gray-700/60 rounded-lg appearance-none cursor-pointer accent-[#10b981] hover:h-1.5 transition-all"
                />
              </div>
              <span className="w-10 text-left tabular-nums">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right: Volume & Queue Drawer Toggle */}
          <div className="flex items-center justify-end gap-3 w-full md:w-1/4">
            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (isMuted) setIsMuted(false);
                }}
                className="w-16 h-1 bg-gray-700/60 rounded-lg appearance-none cursor-pointer accent-[#10b981]"
                title={`Volume ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
            </div>

            {/* Queue Toggle with Badge */}
            <button
              type="button"
              onClick={() => setIsQueueOpen(!isQueueOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                isQueueOpen
                  ? 'bg-[#10b981] text-black border-[#10b981]'
                  : isDark
                  ? 'bg-[#27272a] hover:bg-[#3f3f46] text-gray-300 border-[#3f3f46]'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title="Toggle playback queue"
            >
              <ListMusic className="w-4 h-4" />
              <span className="font-mono">{queue.length}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Slide-over Queue Drawer */}
      {isQueueOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-md h-full flex flex-col shadow-2xl border-l transition-transform ${
              isDark ? 'bg-[#18181b] border-[#27272a] text-[#f4f4f5]' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {/* Queue Header */}
            <div className="p-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <ListMusic className="w-5 h-5 text-[#10b981]" />
                  <span>Playback Queue</span>
                </h3>
                <p className="text-xs text-gray-400 font-mono">
                  {queue.length} tracks • {currentIndex + 1} of {queue.length}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {queue.length > 0 && onDownloadAllInQueue && (
                  <button
                    type="button"
                    onClick={() => {
                      onDownloadAllInQueue(queue);
                      showToast(`Enqueued ${queue.length} tracks from active playlist to batch download!`);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-[#10b981] transition-colors"
                    title="Download entire queue as MP3 320k"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClearQueue}
                  className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors font-medium"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setIsQueueOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Queue Tracklist */}
            <div className="flex-1 overflow-y-auto divide-y divide-black/5 dark:divide-white/5 p-2">
              {queue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                  <Disc3 className="w-12 h-12 stroke-[1.5] text-gray-500 mb-3 animate-pulse" />
                  <p className="text-sm font-semibold">Your queue is empty</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Click "Play Album" or any song in the Music Explorer to start streaming!
                  </p>
                </div>
              ) : (
                queue.map((track, idx) => {
                  const isCurrent = idx === currentIndex;
                  return (
                    <div
                      key={`${track.id}-${idx}`}
                      onClick={() => onSelectQueueIndex(idx)}
                      className={`group flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                        isCurrent
                          ? isDark
                            ? 'bg-[#10b981]/15 border border-[#10b981]/30 text-white'
                            : 'bg-[#10b981]/10 border border-[#10b981]/30 text-slate-900'
                          : isDark
                          ? 'hover:bg-white/5'
                          : 'hover:bg-slate-100'
                      }`}
                    >
                      {/* Artwork or Track number */}
                      <div className="relative w-10 h-10 rounded overflow-hidden shrink-0">
                        <img
                          src={track.artworkUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                        {isCurrent && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            {isPlaying ? (
                              <span className="flex items-center gap-0.5 h-3">
                                <span className="w-0.5 bg-[#10b981] rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
                                <span className="w-0.5 bg-[#10b981] rounded-full animate-bounce [animation-delay:-0.15s] h-2" />
                                <span className="w-0.5 bg-[#10b981] rounded-full animate-bounce h-3.5" />
                              </span>
                            ) : (
                              <Pause className="w-3.5 h-3.5 text-[#10b981] fill-current" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-medium truncate ${
                            isCurrent ? 'text-[#10b981] font-semibold' : ''
                          }`}
                        >
                          {track.title}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">
                          {track.artist}
                        </p>
                      </div>

                      {/* Duration */}
                      <div className="text-[11px] font-mono text-gray-400 shrink-0">
                        {track.durationFormatted || '03:30'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
