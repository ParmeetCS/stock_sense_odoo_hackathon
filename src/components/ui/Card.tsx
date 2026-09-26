import React from 'react';
import { cn } from '../../utils/cn';

export const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-slate-800/90 rounded-xl border border-slate-700/80 shadow-md p-6 backdrop-blur-sm', className)} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-4 pb-3 border-b border-slate-700/60', className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-lg font-semibold text-slate-100', className)} {...props}>
    {children}
  </h3>
);
