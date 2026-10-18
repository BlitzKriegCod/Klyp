import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  Disc3,
  Search,
  ListVideo,
  MoreHorizontal,
  FileText,
  History,
  Settings,
  Activity,
  Sun,
  Moon,
  X
} from 'lucide-react';
import { ScreenType } from './Sidebar';

interface MobileNavBarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  queueCount: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenHealth: () => void;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  currentScreen,
  onNavigate,
  queueCount,
  theme,
  onToggleTheme,
  onOpenHealth
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const isDark = theme === 'dark';
  const menuRef = useRef<HTMLDivElement>(null);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    if (isMoreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreOpen]);

  const handleSelectScreen = (screen: ScreenType) => {
    onNavigate(screen);
    setIsMoreOpen(false);
  };

  const isMoreActive = ['subtitles', 'history', 'settings'].includes(currentScreen);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto md:hidden pointer-events-auto" ref={menuRef}>
      {/* Floating "More" Popup Drawer */}
      {isMoreOpen && (
        <div
          className={`mb-3 p-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            isDark
              ? 'bg-[#1e1e1e]/98 border-[#2d2d2d] text-[#d4d4d4] shadow-black/80'
              : 'bg-white/98 border-slate-200 text-slate-800 shadow-slate-400/40'
          }`}
        >
          <div className={`flex items-center justify-between px-2 pb-2.5 mb-2.5 border-b text-xs font-semibold uppercase tracking-wider ${
            isDark ? 'border-[#2d2d2d] text-gray-400' : 'border-slate-200 text-slate-500'
          }`}>
            <span>More Features</span>
            <button
              type="button"
              onClick={() => setIsMoreOpen(false)}
              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-gray-400 hover:text-white hover:bg-[#282828]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSelectScreen('subtitles')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                currentScreen === 'subtitles'
                  ? 'bg-[#10b981]/20 text-[#10b981] font-semibold'
                  : isDark
                  ? 'hover:bg-[#282828] text-gray-300'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Subtitles</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectScreen('history')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                currentScreen === 'history'
                  ? 'bg-[#10b981]/20 text-[#10b981] font-semibold'
                  : isDark
                  ? 'hover:bg-[#282828] text-gray-300'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <History className="w-4 h-4 text-purple-400 shrink-0" />
              <span>History</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectScreen('settings')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                currentScreen === 'settings'
                  ? 'bg-[#10b981]/20 text-[#10b981] font-semibold'
                  : isDark
                  ? 'hover:bg-[#282828] text-gray-300'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Settings className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Settings</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenHealth();
                setIsMoreOpen(false);
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                isDark ? 'hover:bg-[#282828] text-gray-300' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Engine Health</span>
            </button>
          </div>

          {/* Theme Switcher Row */}
          <div className={`mt-3 pt-2.5 border-t flex items-center justify-between px-2 ${
            isDark ? 'border-[#2d2d2d]' : 'border-slate-200'
          }`}>
            <span className="text-xs text-gray-400">Theme</span>
            <button
              type="button"
              onClick={onToggleTheme}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[#252526] border-[#2d2d2d] text-gray-200 hover:bg-[#2d2d2d]'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Primary Floating Rounded Bar */}
      <nav
        aria-label="Mobile Navigation"
        className={`flex items-center justify-around px-2 py-2 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all select-none ${
          isDark
            ? 'bg-[#1e1e1e]/95 border-[#2d2d2d] text-[#d4d4d4] shadow-black/80'
            : 'bg-white/95 border-slate-200 text-slate-700 shadow-slate-400/30'
        }`}
      >
        {/* 1. Home */}
        <button
          type="button"
          onClick={() => handleSelectScreen('home')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[46px] ${
            currentScreen === 'home'
              ? 'text-[#10b981]'
              : isDark
              ? 'text-gray-400 hover:text-white'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium leading-none">Home</span>
          {currentScreen === 'home' && (
            <span className="absolute -top-1 w-5 h-1 rounded-full bg-[#10b981]" />
          )}
        </button>

        {/* 2. Music & Discographies */}
        <button
          type="button"
          onClick={() => handleSelectScreen('music')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[46px] ${
            currentScreen === 'music'
              ? 'text-[#10b981]'
              : isDark
              ? 'text-gray-400 hover:text-white'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Disc3 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium leading-none">Music</span>
          {currentScreen === 'music' && (
            <span className="absolute -top-1 w-5 h-1 rounded-full bg-[#10b981]" />
          )}
        </button>

        {/* 3. Search Videos */}
        <button
          type="button"
          onClick={() => handleSelectScreen('search')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[46px] ${
            currentScreen === 'search'
              ? 'text-[#10b981]'
              : isDark
              ? 'text-gray-400 hover:text-white'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Search className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium leading-none">Search</span>
          {currentScreen === 'search' && (
            <span className="absolute -top-1 w-5 h-1 rounded-full bg-[#10b981]" />
          )}
        </button>

        {/* 4. Queue with Badge */}
        <button
          type="button"
          onClick={() => handleSelectScreen('queue')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[46px] ${
            currentScreen === 'queue'
              ? 'text-[#10b981]'
              : isDark
              ? 'text-gray-400 hover:text-white'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <div className="relative">
            <ListVideo className="w-5 h-5 mb-0.5" />
            {queueCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#10b981] text-black font-mono font-bold text-[9px] flex items-center justify-center shadow-sm">
                {queueCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium leading-none">Queue</span>
          {currentScreen === 'queue' && (
            <span className="absolute -top-1 w-5 h-1 rounded-full bg-[#10b981]" />
          )}
        </button>

        {/* 5. More Menu Toggle */}
        <button
          type="button"
          onClick={() => setIsMoreOpen((prev) => !prev)}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[46px] ${
            isMoreOpen || isMoreActive
              ? 'text-[#10b981]'
              : isDark
              ? 'text-gray-400 hover:text-white'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium leading-none">More</span>
          {isMoreActive && (
            <span className="absolute -top-1 w-5 h-1 rounded-full bg-[#10b981]" />
          )}
        </button>
      </nav>
    </div>
  );
};
