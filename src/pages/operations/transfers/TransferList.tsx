import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  Plus,
  ArrowUpDown,
  Eye,
  CheckCircle2,
  RefreshCw,
  LayoutGrid,
  List as ListIcon,
  Copy,
  Check,
  User,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../context/AuthContext';
import {
  GlobalFilterToolbar,
  type ActiveFilter,
} from '../../../components/ui/GlobalFilterToolbar';
import { useUrlFilterParams } from '../../../hooks/useUrlFilterParams';
import {
  fetchTransfersList,
  validateTransfer,
} from '../../../services/transferService';
import { fetchWarehousesList } from '../../../services/warehouseService';
import type { InternalTransfer, Warehouse, OrderStatus } from '../../../types';
import { cn } from '../../../utils/cn';

export const TransferList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [transfers, setTransfers] = useState<InternalTransfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Standardized URL query parameter syncing
  const { getParam, updateParams, resetParams } = useUrlFilterParams({
    q: '',
    status: 'all',
    source_warehouse_id: 'all',
    dest_warehouse_id: 'all',
    start_date: '',
    end_date: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
    page: 1,
  });

  const search = getParam('q', '');
  const status = getParam('status', 'all') as OrderStatus | 'all';
  const sourceWarehouseId = getParam('source_warehouse_id', 'all');
  const destinationWarehouseId = getParam('dest_warehouse_id', 'all');
  const startDate = getParam('start_date', '');
  const endDate = getParam('end_date', '');
  const sortBy = getParam('sortBy', 'created_at');
  const sortOrder = getParam('sortOrder', 'desc') as 'asc' | 'desc';
  const page = getParam('page', 1);

  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Kanban counts
  const [kanbanCounts, setKanbanCounts] = useState<Record<OrderStatus, number>>({
    draft: 0,
    waiting: 0,
    ready: 0,
    done: 0,
    canceled: 0,
  });

  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    loadTransfers();
  }, [search, status, sourceWarehouseId, destinationWarehouseId, startDate, endDate, sortBy, sortOrder, page]);

  const loadWarehouses = async () => {
    try {
      const data = await fetchWarehousesList();
      setWarehouses(data.warehouses || []);
    } catch (err) {
      console.error('Failed to load warehouses:', err);
    }
  };

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const res = await fetchTransfersList({
        search,
        status,
        sourceWarehouseId,
        destinationWarehouseId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortOrder,
        page,
        pageSize: 10,
      });

      setTransfers(res.transfers);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
      setKanbanCounts(res.kanbanCounts);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch internal transfers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      updateParams({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc', page: 1 });
    } else {
      updateParams({ sortBy: field, sortOrder: 'asc', page: 1 });
    }
  };

  // Build active filter chips
  const activeFilters: ActiveFilter[] = [];
  if (search) {
    activeFilters.push({ key: 'q', label: 'Search', valueDisplay: search, rawVal: search });
  }
  if (status !== 'all') {
    activeFilters.push({ key: 'status', label: 'Status', valueDisplay: status, rawVal: status });
  }
  if (sourceWarehouseId !== 'all') {
    const sw = warehouses.find((w) => w.id === sourceWarehouseId);
    activeFilters.push({
      key: 'source_warehouse_id',
      label: 'Source WH',
      valueDisplay: sw ? sw.code : sourceWarehouseId,
      rawVal: sourceWarehouseId,
    });
  }
  if (destinationWarehouseId !== 'all') {
    const dw = warehouses.find((w) => w.id === destinationWarehouseId);
    activeFilters.push({
      key: 'dest_warehouse_id',
      label: 'Dest WH',
      valueDisplay: dw ? dw.code : destinationWarehouseId,
      rawVal: destinationWarehouseId,
    });
  }
  if (startDate) {
    activeFilters.push({ key: 'start_date', label: 'From Date', valueDisplay: startDate, rawVal: startDate });
  }
  if (endDate) {
    activeFilters.push({ key: 'end_date', label: 'To Date', valueDisplay: endDate, rawVal: endDate });
  }

  const handleRemoveFilter = (key: string) => {
    updateParams({ [key]: undefined, page: 1 });
  };

  const handleCopy = (ref: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    showToast(`Reference ${ref} copied to clipboard`, 'info');
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleQuickValidate = async (transfer: InternalTransfer, e: React.MouseEvent) => {
    e.stopPropagation();
    if (validatingId) return;

    try {
      setValidatingId(transfer.id);
      const result = await validateTransfer(transfer.id, user?.id);
      showToast(result.message, 'success');
      loadTransfers();
    } catch (err: any) {
      showToast(err.message || 'Failed to complete internal transfer validation', 'error');
    } finally {
      setValidatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title Header */}
      <PageHeader
        title="Internal Transfers"
        description="Manage inventory relocation between warehouses and storage locations"
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadTransfers()}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>

            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors',
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <ListIcon className="w-3.5 h-3.5" /> List
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors',
                  viewMode === 'kanban'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Kanban
              </button>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/operations/transfers/new')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" /> New Transfer
            </Button>
          </div>
        }
      />

      {/* Kanban Status Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => updateParams({ status: 'all', page: 1 })}
          className={cn(
            'px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all',
            status === 'all'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
          )}
        >
          <span>All Transfers</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">
            {Object.values(kanbanCounts).reduce((a, b) => a + b, 0)}
          </span>
        </button>

        <button
          onClick={() => updateParams({ status: 'draft', page: 1 })}
          className={cn(
            'px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all',
            status === 'draft'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-300 hover:bg-slate-800'
          )}
        >
          <span>Draft</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-amber-400 text-[10px]">
            {kanbanCounts.draft}
          </span>
        </button>

        <button
          onClick={() => updateParams({ status: 'waiting', page: 1 })}
          className={cn(
            'px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all',
            status === 'waiting'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-indigo-300 hover:bg-slate-800'
          )}
        >
          <span>Waiting</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-indigo-400 text-[10px]">
            {kanbanCounts.waiting}
          </span>
        </button>

        <button
          onClick={() => updateParams({ status: 'ready', page: 1 })}
          className={cn(
            'px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all',
            status === 'ready'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:bg-slate-800'
          )}
        >
          <span>Ready for Validation</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-cyan-400 text-[10px]">
            {kanbanCounts.ready}
          </span>
        </button>

        <button
          onClick={() => updateParams({ status: 'done', page: 1 })}
          className={cn(
            'px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all',
            status === 'done'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
          )}
        >
          <span>Completed (Done)</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 text-[10px]">
            {kanbanCounts.done}
          </span>
        </button>

        <button
          onClick={() => updateParams({ status: 'canceled', page: 1 })}
          className={cn(
            'px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all',
            status === 'canceled'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-300 hover:bg-slate-800'
          )}
        >
          <span>Canceled</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-rose-400 text-[10px]">
            {kanbanCounts.canceled}
          </span>
        </button>
      </div>

      {/* Global Filter Toolbar */}
      <GlobalFilterToolbar
        search={search}
        onSearchChange={(val) => updateParams({ q: val, page: 1 })}
        searchPlaceholder="Search reference, SKU, location, responsible..."
        warehouses={warehouses}
        selectedWarehouse={sourceWarehouseId}
        onWarehouseChange={(val) => updateParams({ source_warehouse_id: val, page: 1 })}
        warehouseLabel="Source WH: All"
        destinationWarehouses={warehouses}
        selectedDestinationWarehouse={destinationWarehouseId}
        onDestinationWarehouseChange={(val) => updateParams({ dest_warehouse_id: val, page: 1 })}
        startDate={startDate}
        onStartDateChange={(val) => updateParams({ start_date: val, page: 1 })}
        endDate={endDate}
        onEndDateChange={(val) => updateParams({ end_date: val, page: 1 })}
        sortOptions={[
          { value: 'created_at', label: 'Creation Date' },
          { value: 'reference', label: 'Reference' },
          { value: 'scheduled_date', label: 'Scheduled Date' },
          { value: 'source', label: 'Source Location' },
          { value: 'destination', label: 'Destination Location' },
          { value: 'quantity', label: 'Total Quantity' },
          { value: 'status', label: 'Status' },
        ]}
        sortBy={sortBy}
        onSortByChange={(val) => updateParams({ sortBy: val, page: 1 })}
        sortOrder={sortOrder}
        onToggleSortOrder={() => updateParams({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc', page: 1 })}
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={resetParams}
      />

      {/* Main Content: List or Kanban */}
      {loading ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center space-y-3 text-center">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Loading internal transfers...</p>
        </div>
      ) : transfers.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
            <ArrowRightLeft className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">No internal transfers found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No stock transfers matched your filter criteria. Create a new internal transfer to shift stock between locations.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/operations/transfers/new')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" /> Create First Transfer
          </Button>
        </div>
      ) : viewMode === 'list' ? (
        /* Table View */
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('reference')}>
                    <div className="flex items-center gap-1.5">
                      <span>Reference</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('source')}>
                    <div className="flex items-center gap-1.5">
                      <span>Source Location</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('destination')}>
                    <div className="flex items-center gap-1.5">
                      <span>Destination Location</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('scheduled_date')}>
                    <div className="flex items-center gap-1.5">
                      <span>Scheduled Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Responsible</th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('quantity')}>
                    <div className="flex items-center gap-1.5">
                      <span>Items & Quantity</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transfers.map((tr) => {
                  const isDone = tr.status === 'done';

                  return (
                    <tr
                      key={tr.id}
                      onClick={() => navigate(`/operations/transfers/${tr.id}`)}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                    >
                      {/* Reference */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-blue-400 group-hover:underline">
                        <div className="flex items-center gap-2">
                          <span>{tr.reference}</span>
                          <button
                            onClick={(e) => handleCopy(tr.reference, e)}
                            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                            title="Copy Reference"
                          >
                            {copiedRef === tr.reference ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Source Location */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-200">
                            {tr.source_warehouse?.name || 'WH'}
                          </span>
                          <span className="text-[11px] font-mono text-amber-400">
                            {tr.source_location?.code || 'Bin'}
                          </span>
                        </div>
                      </td>

                      {/* Destination Location */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-200">
                            {tr.destination_warehouse?.name || 'WH'}
                          </span>
                          <span className="text-[11px] font-mono text-emerald-400">
                            {tr.destination_location?.code || 'Bin'}
                          </span>
                        </div>
                      </td>

                      {/* Scheduled Date */}
                      <td className="py-3.5 px-4 text-slate-300">
                        {tr.scheduled_date
                          ? new Date(tr.scheduled_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>

                      {/* Responsible */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-slate-300 font-medium">
                            {tr.responsible?.full_name || tr.creator?.full_name || 'Staff User'}
                          </span>
                        </div>
                      </td>

                      {/* Items & Quantity */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-white">
                            {tr.total_quantity || 0} Units
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {tr.total_items || tr.items?.length || 0} line item(s)
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={tr.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {!isDone && tr.status !== 'canceled' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={(e) => handleQuickValidate(tr, e)}
                              disabled={validatingId === tr.id}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] py-1 px-2.5"
                            >
                              {validatingId === tr.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                              )}
                              Validate
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/operations/transfers/${tr.id}`)}
                            className="border-slate-700 text-slate-300 hover:bg-slate-800 text-[11px] py-1 px-2.5"
                          >
                            <Eye className="w-3 h-3 mr-1" /> View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing <span className="font-semibold text-white">{transfers.length}</span> of{' '}
              <span className="font-semibold text-white">{totalCount}</span> internal transfers
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateParams({ page: page - 1 })}
                className="border-slate-800 text-slate-300 py-1 px-3"
              >
                Previous
              </Button>
              <span className="font-medium text-slate-300 px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: page + 1 })}
                className="border-slate-800 text-slate-300 py-1 px-3"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Kanban Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {transfers.map((tr) => (
            <div
              key={tr.id}
              onClick={() => navigate(`/operations/transfers/${tr.id}`)}
              className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 rounded-xl p-4 space-y-4 cursor-pointer transition-all shadow-md group"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-blue-400 group-hover:underline text-sm">
                  {tr.reference}
                </span>
                <StatusBadge status={tr.status} />
              </div>

              {/* Source -> Destination visual block */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">From (Source)</span>
                  <span className="text-xs font-bold text-slate-200">{tr.source_warehouse?.code}</span>
                  <span className="text-[11px] font-mono text-amber-400">{tr.source_location?.code}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="flex flex-col text-right">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">To (Destination)</span>
                  <span className="text-xs font-bold text-slate-200">{tr.destination_warehouse?.code}</span>
                  <span className="text-[11px] font-mono text-emerald-400">{tr.destination_location?.code}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <div>
                  <span className="text-slate-500">Scheduled: </span>
                  <span className="text-slate-200 font-medium">
                    {tr.scheduled_date ? new Date(tr.scheduled_date).toLocaleDateString() : 'Today'}
                  </span>
                </div>
                <div className="font-bold text-white">
                  {tr.total_quantity || 0} Units
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>{tr.responsible?.full_name || 'Staff User'}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-400 hover:text-blue-300 p-0 text-xs font-semibold"
                >
                  View Details &rarr;
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
