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
  FolderOpen,
  PanelLeftClose,
  PanelLeft
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
  isCollapsed: boolean;
  onToggleCollapse: () => void;
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
  isCollapsed,
  onToggleCollapse,
}) => {
  const logoSrc = theme === 'dark' ? '/assets/klyp_logo.svg' : '/assets/klyp_logo_light.svg';

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
      className={`shrink-0 border-r flex flex-col justify-between select-none transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-18' : 'w-64'
      } ${
        theme === 'dark'
          ? 'bg-[#1e1e1e] border-[#2d2d2d] text-[#d4d4d4]'
          : 'bg-slate-50 border-slate-200 text-slate-700'
      }`}
    >
      {/* Top Header with Brand & Toggle Button - No harsh borders */}
      <div>
        <div
          className={`flex items-center py-4.5 transition-all ${
            isCollapsed ? 'flex-col gap-3 px-2 justify-center' : 'justify-between px-4'
          }`}
        >
          {/* Logo & Brand title */}
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 cursor-pointer group min-w-0"
            title="Klyp - Home"
          >
            <img
              src={logoSrc}
              alt="Klyp Logo"
              className="w-8 h-8 group-hover:scale-105 transition-transform shrink-0"
            />
            {!isCollapsed && (
              <div className="min-w-0 overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xl tracking-tight text-[#10b981]">Klyp</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#10b981]/20 text-[#10b981] font-semibold">
                    v2.0
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 truncate">Universal Video Downloader</p>
              </div>
            )}
          </div>

          {/* Toggle Sidebar Button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'hover:bg-[#282828] active:bg-[#333]'
                : 'hover:bg-slate-200/70 hover:text-slate-900 active:bg-slate-300'
            }`}
          >
            {isCollapsed ? (
              <PanelLeft className="w-5 h-5 text-[#10b981]" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation items */}
        <nav className={`p-2.5 space-y-1.5 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {navItems.map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`relative flex items-center rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  isCollapsed
                    ? 'w-12 h-12 justify-center p-0'
                    : 'w-full justify-between px-3.5 py-2.5'
                } ${
                  isActive
                    ? 'bg-[#10b981] text-white shadow-md shadow-[#10b981]/25 font-semibold'
                    : theme === 'dark'
                    ? 'text-gray-300 hover:bg-[#282828] hover:text-white'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                  <span className={isActive ? 'text-white' : 'text-gray-400'}>{item.icon}</span>
                  {!isCollapsed && <span>{item.label}</span>}
                </div>

                {/* Badge rendering */}
                {item.badge !== undefined && (
                  isCollapsed ? (
                    <span
                      className={`absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold rounded-full ${
                        isActive
                          ? 'bg-white text-[#10b981]'
                          : activeDownloadsCount > 0
                          ? 'bg-[#10b981] text-white animate-pulse'
                          : theme === 'dark'
                          ? 'bg-[#3f3f46] text-gray-200'
                          : 'bg-slate-300 text-slate-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : (
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
                  )
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom status and utilities - Cleaned from visual incoherent border lines */}
      <div className={`p-3 space-y-3 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
        {/* Active downloads indicator */}
        {activeDownloadsCount > 0 && (
          isCollapsed ? (
            <button
              onClick={() => onNavigate('queue')}
              title={`Downloading ${activeDownloadsCount} items - View Queue`}
              className="w-11 h-11 flex items-center justify-center rounded-lg bg-[#10b981]/15 border border-[#10b981]/30 cursor-pointer"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-ping" />
            </button>
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#10b981]/15 border border-[#10b981]/30">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
                <span className="text-xs font-medium text-[#10b981]">
                  Downloading ({activeDownloadsCount})
                </span>
              </div>
              <button
                onClick={() => onNavigate('queue')}
                className="text-xs font-semibold text-[#10b981] hover:underline cursor-pointer"
              >
                View
              </button>
            </div>
          )
        )}

        {/* Download path info (when expanded) */}
        {!isCollapsed && (
          <div
            title={downloadDir}
            className="flex items-center gap-2 px-2 py-1 text-xs text-gray-400 truncate"
          >
            <FolderOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{downloadDir}</span>
          </div>
        )}

        {/* Health status & Theme toggle */}
        <div
          className={`flex items-center pt-1 ${
            isCollapsed ? 'flex-col gap-2 w-full justify-center' : 'justify-between'
          }`}
        >
          <button
            onClick={onOpenHealth}
            title="Engine Health & Status"
            className={`flex items-center gap-1.5 p-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-[#282828]'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Activity className="w-4 h-4 text-[#10b981]" />
            {!isCollapsed && <span>Engines</span>}
          </button>

          <button
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            className={`p-2 rounded-md transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-[#282828]'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
