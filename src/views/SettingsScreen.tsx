import React, { useState } from 'react';
import {
  Settings,
  FolderOpen,
  Moon,
  Sun,
  Shield,
  FileAudio,
  Key,
  RotateCcw,
  Save,
  CheckCircle,
  Layers,
  Sparkles
} from 'lucide-react';
import { AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../controllers/settingsController';
import { PageHeader } from '../components/common/PageHeader';
import { SurfaceCard } from '../components/common/SurfaceCard';

interface SettingsScreenProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onSaveSettings,
  theme,
  onToggleTheme,
}) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [savedToast, setSavedToast] = useState<boolean>(false);

  const isDark = theme === 'dark';

  const handleChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSaveSettings(formData);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleReset = () => {
    if (confirm('Reset all settings to default configuration?')) {
      setFormData({ ...DEFAULT_SETTINGS });
      onSaveSettings({ ...DEFAULT_SETTINGS });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
    }
  };

  const rowClass = `flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border transition-colors ${
    isDark ? 'bg-[#1e1e1e] border-[#2d2d2d]' : 'bg-slate-50 border-slate-200'
  }`;

  const inputClass = `px-3.5 py-2 rounded-lg border text-xs sm:text-sm font-mono focus:outline-none focus:border-[#10b981] ${
    isDark ? 'bg-[#1e1e1e] border-[#2d2d2d] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
  }`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Standardized PageHeader with Save & Reset Actions */}
      <PageHeader
        icon={<Settings className="w-6 h-6" />}
        title="Settings & Preferences"
        description="Configure download paths, performance concurrency, media formats, and network proxies"
        theme={theme}
        actionSlot={
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[#252526] hover:bg-[#2d2d2d] border-[#2d2d2d] text-gray-300'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold shadow-md shadow-[#10b981]/20 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        }
      />

      {savedToast && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] text-xs sm:text-sm font-medium animate-fadeIn">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>All preferences saved successfully to local storage!</span>
        </div>
      )}

      {/* 2. Group 1: Storage & Download Concurrency (Hick's Law Chunking) */}
      <SurfaceCard theme={theme} className="p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 pb-1 border-b border-[#2d2d2d]">
          <FolderOpen className="w-4 h-4 text-[#10b981]" />
          <h2 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
            Storage & Concurrency
          </h2>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
              Target Download Directory:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.download_directory}
                onChange={(e) => handleChange('download_directory', e.target.value)}
                className={`flex-1 ${inputClass}`}
              />
              <button
                type="button"
                onClick={() => handleChange('download_directory', '~/Downloads/Klyp')}
                className={`px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer ${
                  isDark ? 'bg-[#1e1e1e] border-[#2d2d2d] text-gray-300 hover:bg-[#282828]' : 'bg-slate-100 border-slate-300 text-slate-700'
                }`}
              >
                Default
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label
              onClick={() => handleChange('download_mode', 'sequential')}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                formData.download_mode === 'sequential'
                  ? 'border-[#10b981] bg-[#10b981]/10 text-white'
                  : isDark
                  ? 'border-[#2d2d2d] bg-[#1e1e1e] text-gray-300 hover:bg-[#282828]'
                  : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <input
                type="radio"
                name="download_mode"
                checked={formData.download_mode === 'sequential'}
                onChange={() => handleChange('download_mode', 'sequential')}
                className="mt-1 accent-[#10b981]"
              />
              <div>
                <p className={`font-semibold text-xs sm:text-sm ${
                  formData.download_mode === 'sequential' ? (isDark ? 'text-white' : 'text-[#10b981]') : (isDark ? 'text-white' : 'text-slate-900')
                }`}>Sequential Mode</p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  Single stream execution. Best for conservative bandwidth.
                </p>
              </div>
            </label>

            <label
              onClick={() => handleChange('download_mode', 'parallel')}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                formData.download_mode === 'parallel'
                  ? 'border-[#10b981] bg-[#10b981]/10 text-white'
                  : isDark
                  ? 'border-[#2d2d2d] bg-[#1e1e1e] text-gray-300 hover:bg-[#282828]'
                  : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <input
                type="radio"
                name="download_mode"
                checked={formData.download_mode === 'parallel'}
                onChange={() => handleChange('download_mode', 'parallel')}
                className="mt-1 accent-[#10b981]"
              />
              <div>
                <p className={`font-semibold text-xs sm:text-sm ${
                  formData.download_mode === 'parallel' ? (isDark ? 'text-white' : 'text-[#10b981]') : (isDark ? 'text-white' : 'text-slate-900')
                }`}>Parallel Mode</p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  Up to 3 concurrent downloads running simultaneously.
                </p>
              </div>
            </label>
          </div>

          <div className={rowClass}>
            <div>
              <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Auto-Resume Pending Downloads</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                Automatically resume queued items when launching the application
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.auto_resume}
              onChange={(e) => handleChange('auto_resume', e.target.checked)}
              className="w-4 h-4 accent-[#10b981] rounded cursor-pointer"
            />
          </div>
        </div>
      </SurfaceCard>

      {/* 3. Group 2: Media Formats & Metadata Extraction */}
      <SurfaceCard theme={theme} className="p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 pb-1 border-b border-[#2d2d2d]">
          <FileAudio className="w-4 h-4 text-[#10b981]" />
          <h2 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
            Media Formats & Tagging
          </h2>
        </div>

        <div className="space-y-3">
          <div className={rowClass}>
            <div>
              <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Preferred Audio Container</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Format used when saving audio and discographies</p>
            </div>
            <select
              value={formData.audio_format}
              onChange={(e) => handleChange('audio_format', e.target.value as any)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold focus:outline-none focus:border-[#10b981] ${
                isDark ? 'bg-[#252526] border-[#2d2d2d] text-white' : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              {['mp3', 'flac', 'aac', 'opus', 'wav', 'm4a'].map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className={rowClass}>
            <div>
              <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Embed High-Resolution Album Art</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Embed front cover image directly into MP3 ID3v2 and FLAC containers</p>
            </div>
            <input
              type="checkbox"
              checked={formData.embed_thumbnail}
              onChange={(e) => handleChange('embed_thumbnail', e.target.checked)}
              className="w-4 h-4 accent-[#10b981] rounded cursor-pointer"
            />
          </div>

          <div className={rowClass}>
            <div>
              <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Embed Chapter Markers & Metadata</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                Write artist, album title, track numbers, and chapters
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.embed_metadata}
              onChange={(e) => handleChange('embed_metadata', e.target.checked)}
              className="w-4 h-4 accent-[#10b981] rounded cursor-pointer"
            />
          </div>

          <div className={rowClass}>
            <div>
              <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>SponsorBlock Integration</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                Automatically skip sponsor and self-promotion segments in YouTube videos
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.sponsorblock_enabled}
              onChange={(e) => handleChange('sponsorblock_enabled', e.target.checked)}
              className="w-4 h-4 accent-[#10b981] rounded cursor-pointer"
            />
          </div>
        </div>
      </SurfaceCard>

      {/* 4. Group 3: Network & Proxy Configuration */}
      <SurfaceCard theme={theme} className="p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 pb-1 border-b border-[#2d2d2d]">
          <Shield className="w-4 h-4 text-[#10b981]" />
          <h2 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
            Network & Proxy
          </h2>
        </div>

        <div className="space-y-3">
          <div className={rowClass}>
            <div>
              <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Enable Proxy</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Route media stream extraction through proxy</p>
            </div>
            <input
              type="checkbox"
              checked={formData.proxy_enabled}
              onChange={(e) => handleChange('proxy_enabled', e.target.checked)}
              className="w-4 h-4 accent-[#10b981] rounded cursor-pointer"
            />
          </div>

          {formData.proxy_enabled && (
            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border ${
              isDark ? 'bg-[#1e1e1e] border-[#2d2d2d]' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <label className={`text-xs block mb-1 font-mono ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Protocol:</label>
                <select
                  value={formData.proxy_type}
                  onChange={(e) => handleChange('proxy_type', e.target.value as any)}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${
                    isDark ? 'bg-[#252526] border-[#2d2d2d] text-white' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                  <option value="socks5">SOCKS5</option>
                </select>
              </div>
              <div>
                <label className={`text-xs block mb-1 font-mono ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Host:</label>
                <input
                  type="text"
                  placeholder="127.0.0.1"
                  value={formData.proxy_host}
                  onChange={(e) => handleChange('proxy_host', e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono ${
                    isDark ? 'bg-[#252526] border-[#2d2d2d] text-white' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>
              <div>
                <label className={`text-xs block mb-1 font-mono ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Port:</label>
                <input
                  type="text"
                  placeholder="8080"
                  value={formData.proxy_port}
                  onChange={(e) => handleChange('proxy_port', e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono ${
                    isDark ? 'bg-[#252526] border-[#2d2d2d] text-white' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            </div>
          )}
        </div>
      </SurfaceCard>

      {/* 5. Group 4: OpenSubtitles & Interface Theme */}
      <SurfaceCard theme={theme} className="p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 pb-1 border-b border-[#2d2d2d]">
          <Key className="w-4 h-4 text-[#10b981]" />
          <h2 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
            API Credentials & Appearance
          </h2>
        </div>

        <div className="space-y-3">
          <div className={rowClass}>
            <div>
              <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Visual Theme</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                Toggle between core emerald workstation dark mode and high-contrast light mode
              </p>
            </div>
            <button
              onClick={() => {
                onToggleTheme();
                handleChange('theme', theme === 'dark' ? 'light' : 'dark');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                isDark ? 'bg-[#252526] hover:bg-[#2d2d2d] border-[#2d2d2d] text-white' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-xs'
              }`}
            >
              {theme === 'dark' ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light Mode</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
              OpenSubtitles API Key (Optional):
            </label>
            <input
              type="text"
              value={formData.os_api_key}
              onChange={(e) => handleChange('os_api_key', e.target.value)}
              placeholder="Paste your OpenSubtitles API key for unlimited rate quotas..."
              className={`w-full ${inputClass}`}
            />
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
};
