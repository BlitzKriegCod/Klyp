import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  theme?: 'dark' | 'light';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';

  return (
    <div className="py-16 sm:py-20 px-4 text-center flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
        isDark ? 'bg-[#1e1e1e] text-gray-400 border border-[#2d2d2d]' : 'bg-slate-100 text-slate-400 border border-slate-200'
      }`}>
        {icon}
      </div>
      <div>
        <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {title}
        </h3>
        <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
          {description}
        </p>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold shadow-md shadow-[#10b981]/20 transition-all cursor-pointer"
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
};
