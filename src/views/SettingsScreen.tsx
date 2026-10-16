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
  Layers
} from 'lucide-react';
import { AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../controllers/settingsController';

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

  const cardClass = `rounded-xl border p-6 space-y-4 transition-colors ${
    isDark ? 'bg-[#252526] border-[#3c3c3c] shadow-xl' : 'bg-white border-slate-200 shadow-sm'
  }`;

  const rowClass = `flex items-center justify-between p-3.5 rounded-lg border transition-colors ${
    isDark ? 'bg-[#1e1e1e] border-[#3c3c3c]' : 'bg-slate-50 border-slate-200'
  }`;

  const inputClass = `px-4 py-2 rounded-lg border text-sm font-mono focus:outline-none focus:border-[#10b981] ${
    isDark ? 'bg-[#1e1e1e] border-[#454545] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
  }`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Settings className="w-6 h-6 text-[#10b981]" />
            Settings & Preferences
          </h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            Configure download directories, yt-dlp parameters, theme, and OpenSubtitles
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              isDark ? 'bg-[#252526] hover:bg-[#333] border-[#3c3c3c] text-gray-300' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold shadow-md shadow-[#10b981]/20 transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Save Changes
          </button>
        </div>
      </div>

      {savedToast && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] text-sm animate-fadeIn">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* 1. Download Directory Section */}
      <div className={cardClass}>
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-[#10b981]" />
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
            Download Directory
          </h2>
        </div>

        <div className="space-y-2">
          <label className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Target output location for files:</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={formData.download_directory}
              onChange={(e) => handleChange('download_directory', e.target.value)}
              className={`flex-1 ${inputClass}`}
            />
            <button
              type="button"
              onClick={() => handleChange('download_directory', '~/Downloads/Klyp')}
              className={`px-4 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                isDark ? 'bg-[#1e1e1e] hover:bg-[#333] border-[#3c3c3c] text-gray-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
            >
              Default
            </button>
          </div>
        </div>
      </div>

      {/* 2. Appearance Section */}
      <div className={cardClass}>
        <div className="flex items-center gap-2">
          {theme === 'dark' ? (
            <Moon className="w-5 h-5 text-amber-400" />
          ) : (
            <Sun className="w-5 h-5 text-amber-400" />
          )}
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
            Appearance & Theme
          </h2>
        </div>

        <div className={rowClass}>
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Application Theme</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              Klyp signature Emerald Green color scheme with Dark or Light backdrop
            </p>
          </div>

          <button
            onClick={() => {
              onToggleTheme();
              handleChange('theme', theme === 'dark' ? 'light' : 'dark');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              isDark ? 'bg-[#252526] hover:bg-[#333] border-[#3c3c3c] text-white' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-xs'
            }`}
          >
            {theme === 'dark' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-amber-400" /> Dark Mode
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" /> Light Mode
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Download Behavior (Sequential vs Parallel) */}
      <div className={cardClass}>
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#10b981]" />
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
            Download Behavior
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label
            onClick={() => handleChange('download_mode', 'sequential')}
            className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
              formData.download_mode === 'sequential'
                ? 'border-[#10b981] bg-[#10b981]/15 text-white'
                : isDark
                ? 'border-[#3c3c3c] bg-[#1e1e1e] text-gray-300 hover:bg-[#2a2a2b]'
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
              <p className={`font-semibold text-sm ${
                formData.download_mode === 'sequential' ? (isDark ? 'text-white' : 'text-[#10b981]') : (isDark ? 'text-white' : 'text-slate-900')
              }`}>Sequential Mode</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                Downloads one file at a time. Ideal for slower internet connections or avoiding rate limits.
              </p>
            </div>
          </label>

          <label
            onClick={() => handleChange('download_mode', 'parallel')}
            className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
              formData.download_mode === 'parallel'
                ? 'border-[#10b981] bg-[#10b981]/15 text-white'
                : isDark
                ? 'border-[#3c3c3c] bg-[#1e1e1e] text-gray-300 hover:bg-[#2a2a2b]'
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
              <p className={`font-semibold text-sm ${
                formData.download_mode === 'parallel' ? (isDark ? 'text-white' : 'text-[#10b981]') : (isDark ? 'text-white' : 'text-slate-900')
              }`}>Parallel Mode</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                Downloads up to 3 videos simultaneously using multi-threaded queues.
              </p>
            </div>
          </label>
        </div>

        <div className={rowClass}>
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Auto-Resume Interrupted Downloads</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              Automatically resume pending transfers when reopening Klyp
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

      {/* 4. Audio & yt-dlp Advanced Options */}
      <div className={cardClass}>
        <div className="flex items-center gap-2">
          <FileAudio className="w-5 h-5 text-[#10b981]" />
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
            Audio & Metadata Extraction
          </h2>
        </div>

        <div className="space-y-3">
          <div className={rowClass}>
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Preferred Audio Container Format</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Format used when extracting audio only</p>
            </div>
            <select
              value={formData.audio_format}
              onChange={(e) => handleChange('audio_format', e.target.value as any)}
              className={`px-3 py-1.5 rounded-md border text-xs font-semibold focus:outline-none focus:border-[#10b981] ${
                isDark ? 'bg-[#252526] border-[#454545] text-white' : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              {['mp3', 'aac', 'flac', 'opus', 'wav', 'm4a'].map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className={rowClass}>
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Embed Thumbnail</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Embed cover art thumbnail inside downloaded files</p>
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
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Embed Metadata & Chapters</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                Write artist, title, tags, and chapter markers into media container
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
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>SponsorBlock Integration</p>
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
      </div>

      {/* 5. Proxy Configuration */}
      <div className={cardClass}>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#10b981]" />
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
            Network & Proxy Settings
          </h2>
        </div>

        <div className="space-y-3">
          <div className={rowClass}>
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Enable Proxy</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Route downloads and search requests through proxy</p>
            </div>
            <input
              type="checkbox"
              checked={formData.proxy_enabled}
              onChange={(e) => handleChange('proxy_enabled', e.target.checked)}
              className="w-4 h-4 accent-[#10b981] rounded cursor-pointer"
            />
          </div>

          {formData.proxy_enabled && (
            <div className={`grid grid-cols-3 gap-3 p-3 rounded-lg border ${
              isDark ? 'bg-[#1e1e1e] border-[#3c3c3c]' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <label className={`text-xs block mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Protocol:</label>
                <select
                  value={formData.proxy_type}
                  onChange={(e) => handleChange('proxy_type', e.target.value as any)}
                  className={`w-full px-2.5 py-1.5 rounded border text-xs ${
                    isDark ? 'bg-[#252526] border-[#454545] text-white' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                  <option value="socks5">SOCKS5</option>
                </select>
              </div>
              <div>
                <label className={`text-xs block mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Host:</label>
                <input
                  type="text"
                  placeholder="127.0.0.1"
                  value={formData.proxy_host}
                  onChange={(e) => handleChange('proxy_host', e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded border text-xs font-mono ${
                    isDark ? 'bg-[#252526] border-[#454545] text-white' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>
              <div>
                <label className={`text-xs block mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Port:</label>
                <input
                  type="text"
                  placeholder="8080"
                  value={formData.proxy_port}
                  onChange={(e) => handleChange('proxy_port', e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded border text-xs font-mono ${
                    isDark ? 'bg-[#252526] border-[#454545] text-white' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. OpenSubtitles API Account */}
      <div className={cardClass}>
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-[#10b981]" />
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
            OpenSubtitles.com Credentials
          </h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className={`text-xs block mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>OpenSubtitles API Key:</label>
            <input
              type="text"
              value={formData.os_api_key}
              onChange={(e) => handleChange('os_api_key', e.target.value)}
              className={`w-full px-3 py-2 rounded border text-xs font-mono focus:outline-none focus:border-[#10b981] ${
                isDark ? 'bg-[#1e1e1e] border-[#454545] text-gray-200' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs block mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Username (Optional):</label>
              <input
                type="text"
                placeholder="User account"
                value={formData.os_username}
                onChange={(e) => handleChange('os_username', e.target.value)}
                className={`w-full px-3 py-1.5 rounded border text-xs ${
                  isDark ? 'bg-[#1e1e1e] border-[#454545] text-gray-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              />
            </div>
            <div>
              <label className={`text-xs block mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Password (Optional):</label>
              <input
                type="password"
                placeholder="••••••••"
                value={formData.os_password}
                onChange={(e) => handleChange('os_password', e.target.value)}
                className={`w-full px-3 py-1.5 rounded border text-xs ${
                  isDark ? 'bg-[#1e1e1e] border-[#454545] text-gray-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="flex justify-end pt-2 pb-6">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-sm font-semibold shadow-md shadow-[#10b981]/25 transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" />
          Save All Settings
        </button>
      </div>
    </div>
  );
};
