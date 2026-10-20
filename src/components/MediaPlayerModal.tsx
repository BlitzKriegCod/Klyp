import React, { useRef, useState, useEffect } from 'react';
import {
  Download,
  X,
  Play,
  ExternalLink,
  Maximize2,
  Volume2,
  AlertCircle,
  Server,
  Layers,
  Sparkles
} from 'lucide-react';

interface MediaMirrorItem {
  server: string;
  title: string;
  code: string;
}

interface MediaPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaTitle: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  isAudioOnly?: boolean;
  theme?: 'dark' | 'light';
}

export const MediaPlayerModal: React.FC<MediaPlayerModalProps> = ({
  isOpen,
  onClose,
  mediaTitle,
  mediaUrl,
  thumbnailUrl,
  isAudioOnly = false,
  theme = 'dark',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [mirrors, setMirrors] = useState<MediaMirrorItem[]>([]);
  const [activeMirror, setActiveMirror] = useState<MediaMirrorItem | null>(null);
  const [loadingMirrors, setLoadingMirrors] = useState<boolean>(false);
  const [hasIframeError, setHasIframeError] = useState<boolean>(false);

  const isDark = theme === 'dark';

  // Analyze media URL to determine appropriate playback engine
  const getPlaybackInfo = (url: string) => {
    const raw = (url || '').trim();

    // 1. YouTube Detection
    const ytMatch = raw.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return {
        type: 'youtube' as const,
        embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1`,
        badge: 'YouTube Embed (Privacy-Enhanced)',
        canEmbed: true,
        directDownload: false
      };
    }

    // 2. Vimeo Detection
    const vimeoMatch = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
      return {
        type: 'vimeo' as const,
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
        badge: 'Vimeo Player',
        canEmbed: true,
        directDownload: false
      };
    }

    // 3. Dailymotion Detection
    const dmMatch = raw.match(/dailymotion\.com\/(?:video\/|embed\/video\/)([a-zA-Z0-9]+)/i);
    if (dmMatch && dmMatch[1]) {
      return {
        type: 'dailymotion' as const,
        embedUrl: `https://www.dailymotion.com/embed/video/${dmMatch[1]}?autoplay=1`,
        badge: 'Dailymotion Stream',
        canEmbed: true,
        directDownload: false
      };
    }

    // 4. AnimeFLV / Video Host Mirrors
    if (raw.includes('animeflv.net') || raw.includes('streamtape') || raw.includes('yourupload') || raw.includes('mp4upload') || raw.includes('mega.nz')) {
      return {
        type: 'mirror' as const,
        embedUrl: raw,
        badge: 'Anime & Mirror Host',
        canEmbed: true,
        directDownload: true
      };
    }

    // 5. Direct Stream / Local Media File
    const isDirect = /\.(mp4|webm|mkv|mov|mp3|ogg|wav|m4a)($|\?)/i.test(raw) || raw.startsWith('/media/') || raw.startsWith('blob:');
    return {
      type: 'native' as const,
      embedUrl: raw,
      badge: isAudioOnly ? 'Native Audio Stream' : 'Native HTML5 Video',
      canEmbed: false,
      directDownload: true
    };
  };

  const playbackInfo = getPlaybackInfo(activeMirror ? activeMirror.code : mediaUrl);

  // If URL is from AnimeFLV, fetch available mirror video servers
  useEffect(() => {
    if (!isOpen || !mediaUrl) return;

    setHasIframeError(false);
    setActiveMirror(null);

    if (mediaUrl.includes('animeflv.net')) {
      setLoadingMirrors(true);
      fetch('/api/media/mirrors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: mediaUrl })
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.mirrors) && data.mirrors.length > 0) {
            setMirrors(data.mirrors);
            setActiveMirror(data.mirrors[0]);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingMirrors(false));
    } else {
      setMirrors([]);
    }
  }, [isOpen, mediaUrl]);

  if (!isOpen) return null;

  const currentPlayUrl = activeMirror ? activeMirror.code : (playbackInfo.embedUrl || mediaUrl);

  const handleOpenExternal = () => {
    window.open(currentPlayUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-fadeIn">
      <div
        className={`w-full max-w-4xl max-h-[92vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-colors ${
          isDark ? 'bg-[#1e1e1e] border-[#333333] text-[#d4d4d4]' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
            isDark ? 'bg-[#252526] border-[#333333]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shrink-0" />
            <div className="min-w-0">
              <h3 className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {mediaTitle || 'Media Player'}
              </h3>
              <p className="text-[11px] font-mono text-gray-400 truncate">
                {playbackInfo.badge}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleOpenExternal}
              title="Open video in external popout window"
              className={`p-2 rounded-lg text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                isDark ? 'bg-[#1e1e1e] hover:bg-[#2d2d2d] text-gray-300' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <ExternalLink className="w-4 h-4 text-[#10b981]" />
              <span className="hidden sm:inline">Popout</span>
            </button>

            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-gray-400 hover:text-white hover:bg-[#333333]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
              }`}
              aria-label="Close media player"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mirror Server Switcher Tabs (For AnimeFLV or multi-host items) */}
        {mirrors.length > 0 && (
          <div
            className={`px-4 py-2 border-b shrink-0 flex items-center gap-2 text-xs overflow-x-auto ${
              isDark ? 'bg-[#1b1b1e] border-[#2c2c2f]' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="font-mono text-gray-400 shrink-0">Mirror Hosts:</span>
            <div className="flex items-center gap-1.5 py-0.5">
              {mirrors.map((m) => {
                const isActive = activeMirror?.server === m.server;
                return (
                  <button
                    key={m.server}
                    onClick={() => {
                      setActiveMirror(m);
                      setHasIframeError(false);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium uppercase transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isDark
                        ? 'bg-[#252526] text-gray-300 hover:bg-[#333333] border border-[#3a3a3a]'
                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                    }`}
                  >
                    {m.server}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Video / Player Container */}
        <div className="relative bg-black flex-1 flex items-center justify-center min-h-[320px] sm:min-h-[460px] overflow-hidden">
          {playbackInfo.type === 'native' ? (
            /* Mode A: Native HTML5 Direct Stream */
            <video
              ref={videoRef}
              src={currentPlayUrl}
              poster={thumbnailUrl}
              autoPlay
              controls
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full h-full max-h-[70vh] object-contain"
            />
          ) : (
            /* Mode B & C: Responsive Embedded Iframe (YouTube nocookie, Vimeo, or Mirror Embed) */
            <div className="relative w-full h-full min-h-[320px] sm:min-h-[460px] flex items-center justify-center bg-black">
              <iframe
                src={playbackInfo.type === 'youtube' ? playbackInfo.embedUrl : currentPlayUrl}
                title={mediaTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
                className="w-full h-full min-h-[320px] sm:min-h-[460px] border-0"
                onError={() => setHasIframeError(true)}
              />

              {/* Informational overlay notice for iframe restricted servers */}
              {playbackInfo.type === 'mirror' && (
                <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 flex items-center justify-between text-xs text-gray-300 pointer-events-auto">
                  <span className="truncate pr-2">
                    Si el reproductor del servidor no inicia por políticas de iframe, pulsa Popout.
                  </span>
                  <button
                    onClick={handleOpenExternal}
                    className="flex items-center gap-1 px-3 py-1 rounded bg-[#10b981] hover:bg-[#059669] text-white font-semibold text-xs shrink-0 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir Ventana</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer controls & download options */}
        <div
          className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-3.5 border-t shrink-0 ${
            isDark ? 'bg-[#252526] border-[#333333]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="text-xs font-mono text-gray-400 truncate">
            {currentPlayUrl}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <a
              href={currentPlayUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={`${mediaTitle || 'klyp_media'}.mp4`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#10b981] hover:bg-[#059669] text-white transition-all cursor-pointer shadow-md shadow-[#10b981]/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Stream</span>
            </a>

            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                isDark ? 'text-gray-400 hover:text-white hover:bg-[#333333]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
