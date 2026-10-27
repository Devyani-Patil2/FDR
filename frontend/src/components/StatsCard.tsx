import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'blue' | 'slate';
  onClick?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'indigo',
  onClick,
}) => {
  const getColorClasses = () => {
    switch (color) {
      case 'emerald':
        return {
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-600',
          border: 'border-emerald-100',
        };
      case 'amber':
        return {
          bg: 'bg-amber-500/10',
          text: 'text-amber-600',
          border: 'border-amber-100',
        };
      case 'rose':
        return {
          bg: 'bg-rose-500/10',
          text: 'text-rose-600',
          border: 'border-rose-100',
        };
      case 'blue':
        return {
          bg: 'bg-blue-500/10',
          text: 'text-blue-600',
          border: 'border-blue-100',
        };
      case 'slate':
        return {
          bg: 'bg-slate-500/10',
          text: 'text-slate-600',
          border: 'border-slate-100',
        };
      case 'indigo':
      default:
        return {
          bg: 'bg-indigo-500/10',
          text: 'text-indigo-600',
          border: 'border-indigo-100',
        };
    }
  };

  const colors = getColorClasses();

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg} ${colors.text}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-black text-slate-900 tracking-tight">
          {value}
        </span>
        {subtitle && (
          <span className="text-xs font-medium text-slate-400">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
