import React from 'react';
import { cn } from '../../utils/cn';
import type { OrderStatus } from '../../types';

interface StatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const normalized = (status || '').toLowerCase();

  const styles: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
    draft: {
      bg: 'bg-slate-800/80',
      text: 'text-slate-300',
      border: 'border-slate-700',
      dot: 'bg-slate-400',
      label: 'Draft',
    },
    waiting: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-300',
      border: 'border-amber-500/30',
      dot: 'bg-amber-400',
      label: 'Waiting',
    },
    ready: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-300',
      border: 'border-blue-500/30',
      dot: 'bg-blue-400',
      label: 'Ready',
    },
    done: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-300',
      border: 'border-emerald-500/30',
      dot: 'bg-emerald-400',
      label: 'Done',
    },
    canceled: {
      bg: 'bg-red-500/10',
      text: 'text-red-300',
      border: 'border-red-500/30',
      dot: 'bg-red-400',
      label: 'Canceled',
    },
  };

  const current = styles[normalized] || {
    bg: 'bg-slate-800',
    text: 'text-slate-300',
    border: 'border-slate-700',
    dot: 'bg-slate-400',
    label: status,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors',
        current.bg,
        current.text,
        current.border,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', current.dot)} />
      {current.label}
    </span>
  );
};
