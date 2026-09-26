import React from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none';

    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700 shadow-sm border border-blue-500/30',
      secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 active:bg-slate-800 border border-slate-700/80',
      outline: 'border border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:text-white active:bg-slate-900',
      ghost: 'text-slate-300 hover:bg-slate-800/80 hover:text-white active:bg-slate-800',
      danger: 'bg-red-600 text-white hover:bg-red-500 active:bg-red-700 shadow-sm border border-red-500/30',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-9 px-4 text-xs gap-2',
      lg: 'h-11 px-6 text-sm gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        aria-disabled={disabled}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
