import React from 'react';
import {
  Search,
  X,
  Filter,
  ArrowUpDown,
  Calendar,
  Package,
  RotateCcw,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

export interface ActiveFilter {
  key: string;
  label: string;
  valueDisplay: string;
  rawVal: any;
}

export interface GlobalFilterToolbarProps {
  // Search
  search?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;

  // Additional text searches (e.g. SKU, Contact, Product)
  secondarySearch?: {
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
    icon?: React.ReactNode;
  };

  // Dropdown Selectors
  categories?: { id: string; name: string }[];
  selectedCategory?: string;
  onCategoryChange?: (val: string) => void;

  warehouses?: { id: string; code: string; name: string }[];
  selectedWarehouse?: string;
  onWarehouseChange?: (val: string) => void;
  warehouseLabel?: string;

  destinationWarehouses?: { id: string; code: string; name: string }[];
  selectedDestinationWarehouse?: string;
  onDestinationWarehouseChange?: (val: string) => void;

  locations?: { id: string; code: string; name: string }[];
  selectedLocation?: string;
  onLocationChange?: (val: string) => void;

  statuses?: { value: string; label: string }[];
  selectedStatus?: string;
  onStatusChange?: (val: string) => void;

  reasons?: { value: string; label: string }[];
  selectedReason?: string;
  onReasonChange?: (val: string) => void;

  operations?: { value: string; label: string }[];
  selectedOperation?: string;
  onOperationChange?: (val: string) => void;

  // Date Range
  startDate?: string;
  onStartDateChange?: (val: string) => void;

  endDate?: string;
  onEndDateChange?: (val: string) => void;

  // Active Filter Chips
  activeFilters?: ActiveFilter[];
  onRemoveFilter?: (key: string) => void;
  onClearAll?: () => void;

  // Sorting
  sortOptions?: { value: string; label: string }[];
  sortBy?: string;
  onSortByChange?: (val: string) => void;
  sortOrder?: 'asc' | 'desc';
  onToggleSortOrder?: () => void;

  className?: string;
}

export const GlobalFilterToolbar: React.FC<GlobalFilterToolbarProps> = ({
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search items, references...',
  secondarySearch,
  categories,
  selectedCategory = 'all',
  onCategoryChange,
  warehouses,
  selectedWarehouse = 'all',
  onWarehouseChange,
  warehouseLabel = 'All Warehouses',
  destinationWarehouses,
  selectedDestinationWarehouse = 'all',
  onDestinationWarehouseChange,
  locations,
  selectedLocation = 'all',
  onLocationChange,
  statuses,
  selectedStatus = 'all',
  onStatusChange,
  reasons,
  selectedReason = 'all',
  onReasonChange,
  operations,
  selectedOperation = 'all',
  onOperationChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  activeFilters = [],
  onRemoveFilter,
  onClearAll,
  sortOptions,
  sortBy,
  onSortByChange,
  sortOrder,
  onToggleSortOrder,
  className,
}) => {
  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className={cn('bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-xl', className)}>
      {/* Primary Row: Searches, Dropdown Selectors, Sorting */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Main Search Input */}
        {onSearchChange && (
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full h-9 pl-9 pr-8 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Secondary Search (SKU / Contact / Product) */}
        {secondarySearch && (
          <div className="relative flex-1 min-w-[180px]">
            <span className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
              {secondarySearch.icon || <Package className="w-4 h-4" />}
            </span>
            <input
              type="text"
              value={secondarySearch.value}
              onChange={(e) => secondarySearch.onChange(e.target.value)}
              placeholder={secondarySearch.placeholder}
              aria-label={secondarySearch.placeholder}
              className="w-full h-9 pl-9 pr-8 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
            />
            {secondarySearch.value && (
              <button
                type="button"
                onClick={() => secondarySearch.onChange('')}
                aria-label="Clear secondary search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Category Dropdown */}
        {categories && onCategoryChange && (
          <div className="flex items-center gap-1.5">
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              aria-label="Category filter"
              className="h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Warehouse Dropdown */}
        {warehouses && onWarehouseChange && (
          <div className="flex items-center gap-1.5">
            <select
              value={selectedWarehouse}
              onChange={(e) => onWarehouseChange(e.target.value)}
              aria-label="Warehouse filter"
              className="h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="all">{warehouseLabel}</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} - {w.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Destination Warehouse Dropdown (for Transfers) */}
        {destinationWarehouses && onDestinationWarehouseChange && (
          <div className="flex items-center gap-1.5">
            <select
              value={selectedDestinationWarehouse}
              onChange={(e) => onDestinationWarehouseChange(e.target.value)}
              aria-label="Destination warehouse filter"
              className="h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="all">Dest WH: All</option>
              {destinationWarehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  To: {w.code} - {w.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Location Dropdown */}
        {locations && onLocationChange && (
          <div className="flex items-center gap-1.5">
            <select
              value={selectedLocation}
              onChange={(e) => onLocationChange(e.target.value)}
              aria-label="Location filter"
              className="h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} - {loc.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Dropdown */}
        {statuses && onStatusChange && (
          <div className="flex items-center gap-1.5">
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label="Status filter"
              className="h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Reason Dropdown */}
        {reasons && onReasonChange && (
          <div className="flex items-center gap-1.5">
            <select
              value={selectedReason}
              onChange={(e) => onReasonChange(e.target.value)}
              aria-label="Reason filter"
              className="h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="all">All Reasons</option>
              {reasons.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Operation Type Dropdown */}
        {operations && onOperationChange && (
          <div className="flex items-center gap-1.5">
            <select
              value={selectedOperation}
              onChange={(e) => onOperationChange(e.target.value)}
              aria-label="Operation filter"
              className="h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="all">All Operations</option>
              {operations.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date Pickers */}
        {onStartDateChange && (
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
            <input
              type="date"
              value={startDate || ''}
              onChange={(e) => onStartDateChange(e.target.value)}
              aria-label="Start date filter"
              className="h-9 bg-slate-950 border border-slate-800 rounded-lg px-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
              title="Start Date"
            />
            {onEndDateChange && (
              <>
                <span className="text-slate-600 text-xs">to</span>
                <input
                  type="date"
                  value={endDate || ''}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  aria-label="End date filter"
                  className="h-9 bg-slate-950 border border-slate-800 rounded-lg px-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                  title="End Date"
                />
              </>
            )}
          </div>
        )}

        {/* Sort Controls */}
        {sortOptions && onSortByChange && (
          <div className="flex items-center gap-1.5 ml-auto">
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              aria-label="Sort by options"
              className="h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort by: {opt.label}
                </option>
              ))}
            </select>

            {onToggleSortOrder && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleSortOrder}
                className="h-9 px-2.5 border-slate-800 text-slate-300 hover:bg-slate-800"
                title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                aria-label={`Toggle sort order, current: ${sortOrder}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
                <span className="text-[11px] uppercase font-bold">{sortOrder}</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Active Filter Chips & Clear All Bar */}
      {hasActiveFilters && (
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3 h-3 text-blue-400" /> Active Filters:
            </span>

            {activeFilters.map((chip) => (
              <div
                key={chip.key}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-blue-600/15 border border-blue-500/30 text-blue-300 font-medium"
              >
                <span>{chip.label}:</span>
                <span className="font-bold text-white">{chip.valueDisplay}</span>
                {onRemoveFilter && (
                  <button
                    type="button"
                    onClick={() => onRemoveFilter(chip.key)}
                    className="p-0.5 rounded hover:bg-blue-500/30 text-blue-400 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {onClearAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-slate-400 hover:text-white text-xs py-1 px-2"
            >
              <RotateCcw className="w-3 h-3 mr-1 text-slate-400" /> Clear All Filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
