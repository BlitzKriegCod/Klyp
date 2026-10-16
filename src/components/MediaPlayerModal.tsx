import React, { useRef, useState } from 'react';
import { Download, Play, Pause, Volume2, VolumeX, X, Maximize } from 'lucide-react';

interface MediaPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaTitle: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  isAudioOnly?: boolean;
}

export const MediaPlayerModal: React.FC<MediaPlayerModalProps> = ({
  isOpen,
  onClose,
  mediaTitle,
  mediaUrl,
  thumbnailUrl,
  isAudioOnly,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  if (!isOpen) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  // Safe fallback playable demo if custom url isn't directly streamed
  const playableSrc = mediaUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-3xl rounded-xl bg-[#252526] border border-[#454545] shadow-2xl overflow-hidden text-[#d4d4d4] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3c3c3c] bg-[#1e1e1e]">
          <h3 className="font-semibold text-white text-base truncate pr-4">{mediaTitle}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#3c3c3c] transition-colors"
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
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#3c3c3c] bg-[#1e1e1e]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span className="text-xs text-gray-400">Integrated Media Player</span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={playableSrc}
              download={`${mediaTitle || 'video'}.mp4`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#10b981] hover:bg-[#059669] text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Media File
            </a>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-[#3c3c3c]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
