import React from 'react';
import { cn } from '../../utils/cn';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { EmptyState, LoadingState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  keyExtractor?: (row: T, index: number) => string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyTitle,
  emptyDescription,
  onRowClick,
  keyExtractor,
  className,
}: DataTableProps<T>) {
  if (loading) {
    return <LoadingState />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={cn('w-full overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60 shadow-sm', className)}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-900 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={cn(
                  'px-4 py-3',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center'
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200 font-normal">
          {data.map((row, idx) => {
            const key = keyExtractor ? keyExtractor(row, idx) : row.id || String(idx);
            return (
              <tr
                key={key}
                onClick={() => onRowClick && onRowClick(row)}
                className={cn(
                  'hover:bg-slate-800/50 transition-colors',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 font-mono-data',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center'
                    )}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalRecords?: number;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalRecords,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-between px-2 py-3 border-t border-slate-800/80 text-xs text-slate-400', className)}>
      <div>
        {totalRecords !== undefined ? (
          <span>Total Records: <strong className="text-white">{totalRecords}</strong></span>
        ) : (
          <span>Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong></span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-8 px-2.5"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Prev
        </Button>

        <span className="px-2 font-mono text-slate-300">
          {currentPage} / {totalPages || 1}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-8 px-2.5"
        >
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
