import React, { useState } from 'react';
import {
  Settings,
  FolderOpen,
  Moon,
  Sun,
  Shield,
  FileAudio,
  Radio,
  Key,
  RotateCcw,
  Save,
  CheckCircle,
  HelpCircle,
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#10b981]" />
            Settings & Preferences
          </h1>
          <p className="text-sm text-gray-400">
            Configure download directories, yt-dlp parameters, theme, and OpenSubtitles
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#252526] hover:bg-[#333] border border-[#3c3c3c] text-gray-300 text-xs font-medium transition-colors cursor-pointer"
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
      <div className="rounded-xl bg-[#252526] border border-[#3c3c3c] p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-[#10b981]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300">
            Download Directory
          </h2>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-400">Target output location for files:</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={formData.download_directory}
              onChange={(e) => handleChange('download_directory', e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg bg-[#1e1e1e] border border-[#454545] text-white font-mono text-sm focus:outline-none focus:border-[#10b981]"
            />
            <button
              type="button"
              onClick={() => handleChange('download_directory', '~/Downloads/Klyp')}
              className="px-4 py-2 rounded-lg bg-[#1e1e1e] hover:bg-[#333] border border-[#3c3c3c] text-gray-300 text-xs font-medium transition-colors"
            >
              Default
            </button>
          </div>
        </div>
      </div>

      {/* 2. Appearance Section */}
      <div className="rounded-xl bg-[#252526] border border-[#3c3c3c] p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          {theme === 'dark' ? (
            <Moon className="w-5 h-5 text-amber-400" />
          ) : (
            <Sun className="w-5 h-5 text-amber-400" />
          )}
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300">
            Appearance & Theme
          </h2>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-[#1e1e1e] border border-[#3c3c3c]">
          <div>
            <p className="text-sm font-medium text-white">Application Theme</p>
            <p className="text-xs text-gray-400">
              Klyp signature Emerald Green color scheme with Dark or Light backdrop
            </p>
          </div>

          <button
            onClick={() => {
              onToggleTheme();
              handleChange('theme', theme === 'dark' ? 'light' : 'dark');
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#252526] hover:bg-[#333] border border-[#3c3c3c] text-xs font-medium text-white transition-colors cursor-pointer"
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
      <div className="rounded-xl bg-[#252526] border border-[#3c3c3c] p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#10b981]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300">
            Download Behavior
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label
            onClick={() => handleChange('download_mode', 'sequential')}
            className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
              formData.download_mode === 'sequential'
                ? 'border-[#10b981] bg-[#10b981]/15 text-white'
                : 'border-[#3c3c3c] bg-[#1e1e1e] text-gray-300 hover:bg-[#2a2a2b]'
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
              <p className="font-semibold text-sm">Sequential Mode</p>
              <p className="text-xs text-gray-400 mt-1">
                Downloads one file at a time. Ideal for slower internet connections or avoiding rate limits.
              </p>
            </div>
          </label>

          <label
            onClick={() => handleChange('download_mode', 'parallel')}
            className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
              formData.download_mode === 'parallel'
                ? 'border-[#10b981] bg-[#10b981]/15 text-white'
                : 'border-[#3c3c3c] bg-[#1e1e1e] text-gray-300 hover:bg-[#2a2a2b]'
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
              <p className="font-semibold text-sm">Parallel Mode</p>
              <p className="text-xs text-gray-400 mt-1">
                Downloads up to 3 videos simultaneously using multi-threaded queues.
              </p>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-[#1e1e1e] border border-[#3c3c3c]">
          <div>
            <p className="text-sm font-medium text-white">Auto-Resume Interrupted Downloads</p>
            <p className="text-xs text-gray-400">
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
      <div className="rounded-xl bg-[#252526] border border-[#3c3c3c] p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <FileAudio className="w-5 h-5 text-[#10b981]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300">
            Audio & Metadata Extraction
          </h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#1e1e1e] border border-[#3c3c3c]">
            <div>
              <p className="text-sm font-medium text-white">Preferred Audio Container Format</p>
              <p className="text-xs text-gray-400">Format used when extracting audio only</p>
            </div>
            <select
              value={formData.audio_format}
              onChange={(e) => handleChange('audio_format', e.target.value as any)}
              className="px-3 py-1.5 rounded-md bg-[#252526] border border-[#454545] text-xs font-semibold text-white focus:outline-none focus:border-[#10b981]"
            >
              {['mp3', 'aac', 'flac', 'opus', 'wav', 'm4a'].map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-[#1e1e1e] border border-[#3c3c3c]">
            <div>
              <p className="text-sm font-medium text-white">Embed Thumbnail</p>
              <p className="text-xs text-gray-400">Embed cover art thumbnail inside downloaded files</p>
            </div>
            <input
              type="checkbox"
              checked={formData.embed_thumbnail}
              onChange={(e) => handleChange('embed_thumbnail', e.target.checked)}
              className="w-4 h-4 accent-[#10b981] rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-[#1e1e1e] border border-[#3c3c3c]">
            <div>
              <p className="text-sm font-medium text-white">Embed Metadata & Chapters</p>
              <p className="text-xs text-gray-400">
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

          <div className="flex items-center justify-between p-3 rounded-lg bg-[#1e1e1e] border border-[#3c3c3c]">
            <div>
              <p className="text-sm font-medium text-white">SponsorBlock Integration</p>
              <p className="text-xs text-gray-400">
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
      <div className="rounded-xl bg-[#252526] border border-[#3c3c3c] p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#10b981]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300">
            Network & Proxy Settings
          </h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#1e1e1e] border border-[#3c3c3c]">
            <div>
              <p className="text-sm font-medium text-white">Enable Proxy</p>
              <p className="text-xs text-gray-400">Route downloads and search requests through proxy</p>
            </div>
            <input
              type="checkbox"
              checked={formData.proxy_enabled}
              onChange={(e) => handleChange('proxy_enabled', e.target.checked)}
              className="w-4 h-4 accent-[#10b981] rounded cursor-pointer"
            />
          </div>

          {formData.proxy_enabled && (
            <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-[#1e1e1e] border border-[#3c3c3c]">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Protocol:</label>
                <select
                  value={formData.proxy_type}
                  onChange={(e) => handleChange('proxy_type', e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded bg-[#252526] border border-[#454545] text-xs text-white"
                >
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                  <option value="socks5">SOCKS5</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Host:</label>
                <input
                  type="text"
                  placeholder="127.0.0.1"
                  value={formData.proxy_host}
                  onChange={(e) => handleChange('proxy_host', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-[#252526] border border-[#454545] text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Port:</label>
                <input
                  type="text"
                  placeholder="8080"
                  value={formData.proxy_port}
                  onChange={(e) => handleChange('proxy_port', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-[#252526] border border-[#454545] text-xs text-white font-mono"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. OpenSubtitles API Account */}
      <div className="rounded-xl bg-[#252526] border border-[#3c3c3c] p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-[#10b981]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300">
            OpenSubtitles.com Credentials
          </h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">OpenSubtitles API Key:</label>
            <input
              type="text"
              value={formData.os_api_key}
              onChange={(e) => handleChange('os_api_key', e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#1e1e1e] border border-[#454545] text-xs font-mono text-gray-200 focus:outline-none focus:border-[#10b981]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Username (Optional):</label>
              <input
                type="text"
                placeholder="User account"
                value={formData.os_username}
                onChange={(e) => handleChange('os_username', e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-[#1e1e1e] border border-[#454545] text-xs text-gray-200"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Password (Optional):</label>
              <input
                type="password"
                placeholder="••••••••"
                value={formData.os_password}
                onChange={(e) => handleChange('os_password', e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-[#1e1e1e] border border-[#454545] text-xs text-gray-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="flex justify-end pt-2 pb-6">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-sm font-semibold shadow-lg shadow-[#10b981]/25 transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" />
          Save All Settings
        </button>
      </div>
    </div>
  );
};
