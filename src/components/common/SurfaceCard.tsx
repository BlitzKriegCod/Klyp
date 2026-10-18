import React from 'react';

interface SurfaceCardProps {
  children: React.ReactNode;
  className?: string;
  theme?: 'dark' | 'light';
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const SurfaceCard: React.FC<SurfaceCardProps> = ({
  children,
  className = '',
  theme = 'dark',
  onClick,
  hoverEffect = false
}) => {
  const isDark = theme === 'dark';

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border transition-all ${
        isDark
          ? `bg-[#252526] border-[#2d2d2d] text-[#d4d4d4] ${
              hoverEffect ? 'hover:border-[#10b981]/50 hover:bg-[#282828] cursor-pointer' : ''
            }`
          : `bg-white border-slate-200 text-slate-800 shadow-xs ${
              hoverEffect ? 'hover:border-[#10b981]/50 hover:bg-slate-50 cursor-pointer' : ''
            }`
      } ${className}`}
    >
      {children}
    </div>
  );
};
