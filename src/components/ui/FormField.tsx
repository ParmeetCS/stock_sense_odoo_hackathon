import React from 'react';
import { cn } from '../../utils/cn';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  helperText,
  children,
  className,
}) => {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error ? (
        <span className="block text-xs text-red-400 font-medium">{error}</span>
      ) : helperText ? (
        <span className="block text-xs text-slate-500">{helperText}</span>
      ) : null}
    </div>
  );
};
