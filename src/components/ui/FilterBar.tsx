import React from 'react';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';

export interface FilterChipProps {
  label: string;
  value: string;
  onRemove?: () => void;
  onClick?: () => void;
  active?: boolean;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  value,
  onRemove,
  onClick,
  active = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer select-none',
        active
          ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
          : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
      )}
    >
      <span>{label}:</span>
      <span className="font-semibold text-white">{value}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-0.5 rounded hover:bg-blue-500/30 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export const FilterBar: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 py-2', className)}>
      {children}
    </div>
  );
};
