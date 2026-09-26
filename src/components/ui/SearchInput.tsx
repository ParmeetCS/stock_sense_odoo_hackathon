import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearchChange?: (val: string) => void;
  onClear?: () => void;
  shortcutBadge?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  className,
  value,
  onChange,
  onSearchChange,
  onClear,
  shortcutBadge = '⌘K',
  placeholder = 'Search movements, SKUs, references...',
  'aria-label': ariaLabel = 'Search input',
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) onChange(e);
    if (onSearchChange) onSearchChange(e.target.value);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onSearchChange) {
      onSearchChange('');
    }
  };

  return (
    <div className={cn('relative w-full max-w-md', className)}>
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full h-9 pl-9 pr-14 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
        {...props}
      />
      {value && String(value).length > 0 ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : shortcutBadge ? (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px] font-semibold border border-slate-700 pointer-events-none">
          {shortcutBadge}
        </span>
      ) : null}
    </div>
  );
};
