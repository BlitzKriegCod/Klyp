import React from 'react';
import {
  Home,
  Search,
  ListVideo,
  FileText,
  History,
  Settings,
  Activity,
  Sun,
  Moon,
  FolderOpen
} from 'lucide-react';

export type ScreenType = 'home' | 'search' | 'queue' | 'subtitles' | 'history' | 'settings';

interface SidebarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  queueCount: number;
  activeDownloadsCount: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenHealth: () => void;
  downloadDir: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  queueCount,
  activeDownloadsCount,
  theme,
  onToggleTheme,
  onOpenHealth,
  downloadDir,
}) => {
  const navItems: { id: ScreenType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'search', label: 'Search Videos', icon: <Search className="w-5 h-5" /> },
    {
      id: 'queue',
      label: 'Download Queue',
      icon: <ListVideo className="w-5 h-5" />,
      badge: queueCount > 0 ? queueCount : undefined,
    },
    { id: 'subtitles', label: 'Subtitles', icon: <FileText className="w-5 h-5" /> },
    { id: 'history', label: 'History', icon: <History className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside
      className={`w-64 shrink-0 border-r flex flex-col justify-between select-none transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-[#18181b] border-[#27272a] text-[#d4d4d4]'
          : 'bg-white border-slate-200 text-slate-700'
      }`}
    >
      {/* Top Header with Brand */}
      <div>
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 px-5 py-5 border-b border-inherit cursor-pointer group"
        >
          <img
            src="/assets/klyp_logo.svg"
            alt="Klyp Logo"
            className="w-8 h-8 group-hover:scale-105 transition-transform"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xl tracking-tight text-[#10b981]">Klyp</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#10b981]/20 text-[#10b981] font-semibold">
                v2.0
              </span>
            </div>
            <p className="text-[11px] text-gray-400">Universal Video Downloader</p>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#10b981] text-white shadow-md shadow-[#10b981]/20 font-semibold'
                    : theme === 'dark'
                    ? 'text-gray-300 hover:bg-[#27272a] hover:text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-gray-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      isActive
                        ? 'bg-white text-[#10b981]'
                        : activeDownloadsCount > 0
                        ? 'bg-[#10b981] text-white animate-pulse'
                        : theme === 'dark'
                        ? 'bg-[#3f3f46] text-gray-200'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom status and utilities */}
      <div className="p-4 border-t border-inherit space-y-3">
        {/* Active downloads mini pill */}
        {activeDownloadsCount > 0 && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#10b981]/15 border border-[#10b981]/30">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
              <span className="text-xs font-medium text-[#10b981]">
                Downloading ({activeDownloadsCount})
              </span>
            </div>
            <button
              onClick={() => onNavigate('queue')}
              className="text-xs font-semibold text-[#10b981] hover:underline"
            >
              View
            </button>
          </div>
        )}

        {/* Download path info */}
        <div
          title={downloadDir}
          className="flex items-center gap-2 px-2 py-1 text-xs text-gray-400 truncate"
        >
          <FolderOpen className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{downloadDir}</span>
        </div>

        {/* Health status & Theme toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-inherit/50">
          <button
            onClick={onOpenHealth}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-400 hover:text-white hover:bg-inherit transition-colors cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-[#10b981]" />
            <span>Engines</span>
          </button>

          <button
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-inherit transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>
    </aside>
  );
};
