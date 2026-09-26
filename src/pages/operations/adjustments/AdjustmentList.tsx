import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sliders,
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
  TrendingDown,
  TrendingUp,
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
  fetchAdjustmentsList,
  validateAdjustment,
} from '../../../services/adjustmentService';
import { fetchWarehousesList } from '../../../services/warehouseService';
import type { InventoryAdjustment, Warehouse, OrderStatus, AdjustmentReason } from '../../../types';
import { cn } from '../../../utils/cn';

export const AdjustmentList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Standardized URL parameter syncing
  const { getParam, updateParams, resetParams } = useUrlFilterParams({
    q: '',
    status: 'all',
    warehouse_id: 'all',
    reason: 'all',
    start_date: '',
    end_date: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
    page: 1,
  });

  const search = getParam('q', '');
  const status = getParam('status', 'all') as OrderStatus | 'all';
  const warehouseId = getParam('warehouse_id', 'all');
  const reason = getParam('reason', 'all') as AdjustmentReason | 'all';
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
    loadAdjustments();
  }, [search, status, warehouseId, reason, startDate, endDate, sortBy, sortOrder, page]);

  const loadWarehouses = async () => {
    try {
      const data = await fetchWarehousesList();
      setWarehouses(data.warehouses || []);
    } catch (err) {
      console.error('Failed to load warehouses:', err);
    }
  };

  const loadAdjustments = async () => {
    try {
      setLoading(true);
      const res = await fetchAdjustmentsList({
        search,
        status,
        warehouseId,
        reason,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortOrder,
        page,
        pageSize: 10,
      });

      setAdjustments(res.adjustments);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
      setKanbanCounts(res.kanbanCounts);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch inventory adjustments', 'error');
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
  if (warehouseId !== 'all') {
    const wh = warehouses.find((w) => w.id === warehouseId);
    activeFilters.push({
      key: 'warehouse_id',
      label: 'Warehouse',
      valueDisplay: wh ? wh.code : warehouseId,
      rawVal: warehouseId,
    });
  }
  if (reason !== 'all') {
    activeFilters.push({ key: 'reason', label: 'Reason', valueDisplay: reason, rawVal: reason });
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

  const handleQuickValidate = async (adj: InventoryAdjustment, e: React.MouseEvent) => {
    e.stopPropagation();
    if (validatingId) return;

    try {
      setValidatingId(adj.id);
      const result = await validateAdjustment(adj.id, user?.id);
      showToast(result.message, 'success');
      loadAdjustments();
    } catch (err: any) {
      showToast(err.message || 'Failed to validate inventory adjustment', 'error');
    } finally {
      setValidatingId(null);
    }
  };

  const getReasonBadgeClass = (r?: string) => {
    switch (r) {
      case 'Damaged':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'Lost':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Found':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Counting Error':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title Header */}
      <PageHeader
        title="Inventory Adjustments"
        description="Reconcile system stock levels with physical inventory counts"
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAdjustments()}
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
              onClick={() => navigate('/operations/adjustments/new')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" /> New Adjustment
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
          <span>All Adjustments</span>
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
        searchPlaceholder="Search reference, product SKU/name, reason, notes..."
        warehouses={warehouses}
        selectedWarehouse={warehouseId}
        onWarehouseChange={(val) => updateParams({ warehouse_id: val, page: 1 })}
        warehouseLabel="All Warehouses"
        reasons={[
          { value: 'Damaged', label: 'Damaged' },
          { value: 'Lost', label: 'Lost' },
          { value: 'Found', label: 'Found' },
          { value: 'Counting Error', label: 'Counting Error' },
          { value: 'Other', label: 'Other' },
        ]}
        selectedReason={reason}
        onReasonChange={(val) => updateParams({ reason: val, page: 1 })}
        startDate={startDate}
        onStartDateChange={(val) => updateParams({ start_date: val, page: 1 })}
        endDate={endDate}
        onEndDateChange={(val) => updateParams({ end_date: val, page: 1 })}
        sortOptions={[
          { value: 'created_at', label: 'Creation Date' },
          { value: 'reference', label: 'Reference' },
          { value: 'product', label: 'Product Name' },
          { value: 'warehouse', label: 'Warehouse Code' },
          { value: 'difference', label: 'Variance / Difference' },
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
          <p className="text-sm text-slate-400 font-medium">Loading inventory adjustments...</p>
        </div>
      ) : adjustments.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
            <Sliders className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">No inventory adjustments found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No stock adjustments matched your filter criteria. Create an adjustment to reconcile physical stock counts with system records.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/operations/adjustments/new')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" /> Create First Adjustment
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
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('product')}>
                    <div className="flex items-center gap-1.5">
                      <span>Product</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('warehouse')}>
                    <div className="flex items-center gap-1.5">
                      <span>Warehouse / Location</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right">Recorded Qty</th>
                  <th className="py-3.5 px-4 text-right">Counted Qty</th>
                  <th className="py-3.5 px-4 text-right cursor-pointer hover:text-white" onClick={() => handleSort('difference')}>
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Difference</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Responsible</th>
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
                {adjustments.map((adj) => {
                  const isDone = adj.status === 'done';
                  const diff = adj.difference;

                  return (
                    <tr
                      key={adj.id}
                      onClick={() => navigate(`/operations/adjustments/${adj.id}`)}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                    >
                      {/* Reference */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-blue-400 group-hover:underline">
                        <div className="flex items-center gap-2">
                          <span>{adj.reference}</span>
                          <button
                            onClick={(e) => handleCopy(adj.reference, e)}
                            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                            title="Copy Reference"
                          >
                            {copiedRef === adj.reference ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Product */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-100">
                            {adj.product?.name || 'Product'}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {adj.product?.sku || 'SKU'}
                          </span>
                        </div>
                      </td>

                      {/* Warehouse & Location */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-200">
                            {adj.warehouse?.code} - {adj.warehouse?.name}
                          </span>
                          <span className="text-[11px] font-mono text-amber-400">
                            {adj.location?.code}
                          </span>
                        </div>
                      </td>

                      {/* Recorded Qty */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-300">
                        {adj.theoretical_quantity}
                      </td>

                      {/* Counted Qty */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                        {adj.real_quantity}
                      </td>

                      {/* Difference */}
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={cn(
                            'font-mono font-bold text-xs px-2 py-0.5 rounded border inline-flex items-center gap-1',
                            diff > 0
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : diff < 0
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          )}
                        >
                          {diff > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : diff < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : null}
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded font-medium text-[11px] border',
                            getReasonBadgeClass(adj.reason)
                          )}
                        >
                          {adj.reason || 'Counting Error'}
                        </span>
                      </td>

                      {/* Responsible */}
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span>{adj.responsible?.full_name || adj.creator?.full_name || 'Staff User'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={adj.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {!isDone && adj.status !== 'canceled' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={(e) => handleQuickValidate(adj, e)}
                              disabled={validatingId === adj.id}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] py-1 px-2.5"
                            >
                              {validatingId === adj.id ? (
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
                            onClick={() => navigate(`/operations/adjustments/${adj.id}`)}
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
              Showing <span className="font-semibold text-white">{adjustments.length}</span> of{' '}
              <span className="font-semibold text-white">{totalCount}</span> inventory adjustments
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
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {adjustments.map((adj) => {
            const diff = adj.difference;
            return (
              <div
                key={adj.id}
                onClick={() => navigate(`/operations/adjustments/${adj.id}`)}
                className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 rounded-xl p-4 space-y-4 cursor-pointer transition-all shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-400 group-hover:underline text-sm">
                    {adj.reference}
                  </span>
                  <StatusBadge status={adj.status} />
                </div>

                <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{adj.product?.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{adj.product?.sku}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Location: <span className="font-mono text-amber-400">{adj.location?.code}</span> ({adj.warehouse?.code})
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Recorded</span>
                    <span className="font-mono font-bold text-xs text-slate-300">{adj.theoretical_quantity}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Counted</span>
                    <span className="font-mono font-bold text-xs text-white">{adj.real_quantity}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Difference</span>
                    <span
                      className={cn(
                        'font-mono font-bold text-xs',
                        diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-slate-400'
                      )}
                    >
                      {diff > 0 ? `+${diff}` : diff}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className={cn('px-2 py-0.5 rounded text-[10px] border', getReasonBadgeClass(adj.reason))}>
                    {adj.reason || 'Counting Error'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-400 hover:text-blue-300 p-0 text-xs font-semibold"
                  >
                    View Details &rarr;
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
