import React from 'react';
import { PackageOpen, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data Found',
  description = 'There are no records matching your current filter criteria.',
  icon,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 my-4',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-4">
        {icon || <PackageOpen className="w-6 h-6 text-slate-400" />}
      </div>
      <h3 className="text-base font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export const LoadingState: React.FC<{ message?: string; className?: string }> = ({
  message = 'Loading operational data...',
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-12 my-4', className)}>
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
      <span className="text-xs font-medium text-slate-400">{message}</span>
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}> = ({ title = 'Failed to Load Data', message = 'An error occurred while fetching records.', onRetry, className }) => {
  return (
    <div
      className={cn(
        'p-6 rounded-xl bg-red-500/10 border border-red-500/30 text-center my-4 max-w-md mx-auto',
        className
      )}
    >
      <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
      <h4 className="text-sm font-bold text-red-300 mb-1">{title}</h4>
      <p className="text-xs text-red-400/80 mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="border-red-500/30 text-red-300 hover:bg-red-500/20">
          Try Again
        </Button>
      )}
    </div>
  );
};
