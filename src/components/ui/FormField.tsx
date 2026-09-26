import React from 'react';
import { cn } from '../../utils/cn';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  required = false,
  error,
  helperText,
  children,
  className,
}) => {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
      >
        {label} {required && <span className="text-red-400" aria-hidden="true">*</span>}
      </label>
      {children}
      {error ? (
        <span role="alert" className="block text-xs text-red-400 font-medium animate-fade-in">
          {error}
        </span>
      ) : helperText ? (
        <span className="block text-[11px] text-slate-400">{helperText}</span>
      ) : null}
    </div>
  );
};
