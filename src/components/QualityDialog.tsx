import React, { useState } from 'react';
import { VideoInfo } from '../types';
import { Check, Download, FileText, Music, Video, X } from 'lucide-react';

interface QualityDialogProps {
  videoInfo: VideoInfo;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedQuality: string, downloadSubtitles: boolean, format?: string) => void;
}

export const QualityDialog: React.FC<QualityDialogProps> = ({
  videoInfo,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [quality, setQuality] = useState<string>(
    videoInfo.selected_quality || (videoInfo.available_qualities && videoInfo.available_qualities[0]) || '1080p'
  );
  const [downloadSubs, setDownloadSubs] = useState<boolean>(videoInfo.download_subtitles ?? false);
  const [audioFormat, setAudioFormat] = useState<string>('mp3');

  if (!isOpen) return null;

  const isAudioOnly = quality.toLowerCase().includes('audio');

  const handleConfirm = () => {
    onConfirm(quality, downloadSubs, isAudioOnly ? audioFormat : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-lg rounded-xl bg-[#252526] border border-[#454545] shadow-2xl overflow-hidden text-[#d4d4d4]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3c3c3c] bg-[#1e1e1e]">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-[#10b981]" />
            <h3 className="font-semibold text-lg text-white">Select Download Quality</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#3c3c3c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Video Metadata Preview */}
          <div className="flex gap-4 p-3 rounded-lg bg-[#1e1e1e] border border-[#3c3c3c]">
            {videoInfo.thumbnail ? (
              <img
                src={videoInfo.thumbnail}
                alt={videoInfo.title}
                className="w-28 h-18 object-cover rounded-md shrink-0 border border-[#454545]"
              />
            ) : (
              <div className="w-28 h-18 rounded-md bg-[#3c3c3c] flex items-center justify-center shrink-0">
                <Video className="w-8 h-8 text-gray-500" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-white text-sm line-clamp-2">{videoInfo.title || 'Video Stream'}</h4>
              <p className="text-xs text-gray-400 mt-1">{videoInfo.author || 'Unknown Creator'}</p>
              {videoInfo.platform && (
                <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full bg-[#10b981]/20 text-[#10b981]">
                  {videoInfo.platform}
                </span>
              )}
            </div>
          </div>

          {/* Available Qualities */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">
              Available Formats & Resolutions
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {(videoInfo.available_qualities && videoInfo.available_qualities.length > 0
                ? videoInfo.available_qualities
                : ['1080p (Full HD)', '720p (HD)', '480p (SD)', '360p', 'Audio Only (MP3)']
              ).map((q) => {
                const isSelected = quality === q;
                const isAudio = q.toLowerCase().includes('audio');
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuality(q)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-sm font-medium transition-all text-left ${
                      isSelected
                        ? 'border-[#10b981] bg-[#10b981]/15 text-white'
                        : 'border-[#3c3c3c] bg-[#1e1e1e] text-gray-300 hover:border-gray-500 hover:bg-[#2a2a2b]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isAudio ? (
                        <Music className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#10b981]' : 'text-gray-400'}`} />
                      ) : (
                        <Video className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#10b981]' : 'text-gray-400'}`} />
                      )}
                      <span className="truncate">{q}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#10b981] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audio options if audio only */}
          {isAudioOnly && (
            <div className="p-3 rounded-lg bg-[#1e1e1e] border border-[#3c3c3c] space-y-2">
              <label className="block text-xs font-medium text-gray-400">Audio Container Format</label>
              <div className="flex gap-2">
                {['mp3', 'aac', 'flac', 'opus'].map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setAudioFormat(fmt)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase transition-all ${
                      audioFormat === fmt
                        ? 'bg-[#10b981] text-white'
                        : 'bg-[#2a2a2b] text-gray-400 hover:text-white'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subtitles Option */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#1e1e1e] border border-[#3c3c3c]">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-[#10b981]" />
              <div>
                <p className="text-sm font-medium text-white">Download Subtitles</p>
                <p className="text-xs text-gray-400">Download available captions (.srt)</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={downloadSubs}
              onChange={(e) => setDownloadSubs(e.target.checked)}
              className="w-4 h-4 accent-[#10b981] rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#3c3c3c] bg-[#1e1e1e]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-[#3c3c3c] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-[#10b981] hover:bg-[#059669] text-white shadow-lg shadow-[#10b981]/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Add to Queue
          </button>
        </div>
      </div>
    </div>
  );
};
