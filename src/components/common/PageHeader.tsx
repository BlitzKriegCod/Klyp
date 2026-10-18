import React from 'react';

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: {
    text: string;
    variant?: 'emerald' | 'neutral' | 'amber';
  };
  actionSlot?: React.ReactNode;
  theme?: 'dark' | 'light';
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  title,
  description,
  badge,
  actionSlot,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {title}
            </h1>
            {badge && (
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-medium border ${
                  badge.variant === 'amber'
                    ? isDark
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                    : badge.variant === 'neutral'
                    ? isDark
                      ? 'bg-[#2d2d2d] text-gray-300 border-[#3c3c3c]'
                      : 'bg-slate-200 text-slate-700 border-slate-300'
                    : isDark
                    ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {badge.text}
              </span>
            )}
          </div>
          <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            {description}
          </p>
        </div>
      </div>

      {actionSlot && (
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {actionSlot}
        </div>
      )}
    </div>
  );
};
