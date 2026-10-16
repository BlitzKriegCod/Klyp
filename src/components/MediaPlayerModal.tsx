import React, { useRef, useState } from 'react';
import { Download, X } from 'lucide-react';

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
  theme = 'dark',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  // Safe fallback playable demo if custom url isn't directly streamed
  const playableSrc = mediaUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className={`w-full max-w-3xl rounded-xl border shadow-2xl overflow-hidden flex flex-col transition-colors ${
        isDark ? 'bg-[#252526] border-[#454545] text-[#d4d4d4]' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'bg-[#1e1e1e] border-[#3c3c3c]' : 'bg-slate-50 border-slate-200'
        }`}>
          <h3 className={`font-semibold text-base truncate pr-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>{mediaTitle}</h3>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'text-gray-400 hover:text-white hover:bg-[#3c3c3c]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Container */}
        <div className="relative bg-black flex items-center justify-center min-h-[360px]">
          <video
            ref={videoRef}
            src={playableSrc}
            poster={thumbnailUrl}
            autoPlay
            controls
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="w-full max-h-[60vh] object-contain"
          />
        </div>

        {/* Footer info & download option */}
        <div className={`flex items-center justify-between px-6 py-3 border-t ${
          isDark ? 'bg-[#1e1e1e] border-[#3c3c3c]' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Integrated Media Player</span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={playableSrc}
              download={`${mediaTitle || 'video'}.mp4`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#10b981] hover:bg-[#059669] text-white transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download Media File
            </a>
            <button
              onClick={onClose}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isDark ? 'text-gray-400 hover:text-white hover:bg-[#3c3c3c]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
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
