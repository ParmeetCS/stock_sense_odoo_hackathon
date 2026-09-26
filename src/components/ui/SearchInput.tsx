import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearchChange?: (val: string) => void;
  shortcutBadge?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  className,
  value,
  onChange,
  onSearchChange,
  shortcutBadge = '⌘K',
  placeholder = 'Search movements, SKUs, references...',
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) onChange(e);
    if (onSearchChange) onSearchChange(e.target.value);
  };

  return (
    <div className={cn('relative w-full max-w-md', className)}>
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full h-9 pl-9 pr-12 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        {...props}
      />
      {shortcutBadge && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px] font-semibold border border-slate-700 pointer-events-none">
          {shortcutBadge}
        </span>
      )}
    </div>
  );
};
