import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownLeft,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Building2,
  LayoutGrid,
  List as ListIcon,
  Copy,
  Check,
  CheckCheck,
  Clock,
  Ban,
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
  fetchReceiptsList,
  validateReceipt,
  updateReceiptStatus,
} from '../../../services/receiptService';
import { fetchWarehousesList } from '../../../services/warehouseService';
import type { Receipt, Warehouse, OrderStatus } from '../../../types';
import { cn } from '../../../utils/cn';

export const ReceiptList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Standardized URL query parameter syncing
  const { getParam, updateParams, resetParams } = useUrlFilterParams({
    q: '',
    status: 'all',
    warehouse_id: 'all',
    start_date: '',
    end_date: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
    page: 1,
  });

  const search = getParam('q', '');
  const status = getParam('status', 'all') as OrderStatus | 'all';
  const warehouseId = getParam('warehouse_id', 'all');
  const startDate = getParam('start_date', '');
  const endDate = getParam('end_date', '');
  const sortBy = getParam('sortBy', 'created_at');
  const sortOrder = getParam('sortOrder', 'desc') as 'asc' | 'desc';
  const currentPage = getParam('page', 1);

  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Kanban counts
  const [kanbanCounts, setKanbanCounts] = useState<Record<OrderStatus, number>>({
    draft: 0,
    waiting: 0,
    ready: 0,
    done: 0,
    canceled: 0,
  });

  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  useEffect(() => {
    fetchWarehousesList({ pageSize: 100 }).then((res) => setWarehouses(res.warehouses));
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchReceiptsList({
        search,
        status,
        warehouseId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortOrder,
        page: currentPage,
        pageSize,
      });

      setReceipts(res.receipts);
      setTotalRecords(res.totalCount);
      setTotalPages(res.totalPages);
      setKanbanCounts(res.kanbanCounts);
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to load receipts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, status, warehouseId, startDate, endDate, sortBy, sortOrder, currentPage, pageSize]);

  const handleSort = (field: any) => {
    if (sortBy === field) {
      updateParams({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc', page: 1 });
    } else {
      updateParams({ sortBy: field, sortOrder: 'asc', page: 1 });
    }
  };

  const handleCopyRef = (ref: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Quick Validate from List
  const handleValidate = async (receipt: Receipt, e: React.MouseEvent) => {
    e.stopPropagation();
    setValidatingId(receipt.id);
    try {
      const res = await validateReceipt(receipt.id, user?.id);
      showToast('Receipt Validated', res.message, 'success');
      loadData();
    } catch (err: any) {
      showToast('Validation Failed', err.message, 'error');
    } finally {
      setValidatingId(null);
    }
  };

  // Quick Cancel
  const handleCancel = async (receipt: Receipt, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateReceiptStatus(receipt.id, 'canceled');
      showToast('Receipt Canceled', `Receipt ${receipt.reference} marked as canceled.`, 'info');
      loadData();
    } catch (err: any) {
      showToast('Cancel Failed', err.message, 'error');
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
  if (startDate) {
    activeFilters.push({ key: 'start_date', label: 'From Date', valueDisplay: startDate, rawVal: startDate });
  }
  if (endDate) {
    activeFilters.push({ key: 'end_date', label: 'To Date', valueDisplay: endDate, rawVal: endDate });
  }

  const handleRemoveFilter = (key: string) => {
    updateParams({ [key]: undefined, page: 1 });
  };

  const kanbanColumns: { id: OrderStatus; label: string; icon: any; color: string }[] = [
    { id: 'draft', label: 'Draft', icon: Clock, color: 'border-slate-700' },
    { id: 'waiting', label: 'Waiting', icon: Clock, color: 'border-amber-500/40' },
    { id: 'ready', label: 'Ready', icon: CheckCircle2, color: 'border-blue-500/40' },
    { id: 'done', label: 'Done', icon: CheckCheck, color: 'border-emerald-500/40' },
    { id: 'canceled', label: 'Canceled', icon: Ban, color: 'border-red-500/40' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Operations', href: '/operations/receipts' },
          { label: 'Inbound Receipts' },
        ]}
        title="Inbound Receipts"
        description="Receive vendor shipments, inspect incoming goods, and book inventory into warehouses."
        actions={
          <div className="flex items-center gap-3">
            {/* View Switcher */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('list')}
                title="List View"
                className={cn(
                  'p-1.5 rounded-md text-xs transition-colors',
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <ListIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                title="Kanban Board"
                className={cn(
                  'p-1.5 rounded-md text-xs transition-colors',
                  viewMode === 'kanban'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/operations/receipts/new')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              New Receipt
            </Button>
          </div>
        }
      />

      {/* Status Segmented Tabs */}
      <div className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 text-xs overflow-x-auto">
        {[
          { id: 'all', label: 'All Receipts' },
          { id: 'draft', label: `Draft (${kanbanCounts.draft})` },
          { id: 'waiting', label: `Waiting (${kanbanCounts.waiting})` },
          { id: 'ready', label: `Ready (${kanbanCounts.ready})` },
          { id: 'done', label: `Done (${kanbanCounts.done})` },
          { id: 'canceled', label: `Canceled (${kanbanCounts.canceled})` },
        ].map((st) => (
          <button
            key={st.id}
            onClick={() => updateParams({ status: st.id as any, page: 1 })}
            className={cn(
              'px-3.5 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap',
              status === st.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            )}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Global Filter Toolbar */}
      <GlobalFilterToolbar
        search={search}
        onSearchChange={(val) => updateParams({ q: val, page: 1 })}
        searchPlaceholder="Search reference, vendor, contact, destination bin..."
        warehouses={warehouses}
        selectedWarehouse={warehouseId}
        onWarehouseChange={(val) => updateParams({ warehouse_id: val, page: 1 })}
        warehouseLabel="Destination WH: All"
        startDate={startDate}
        onStartDateChange={(val) => updateParams({ start_date: val, page: 1 })}
        endDate={endDate}
        onEndDateChange={(val) => updateParams({ end_date: val, page: 1 })}
        sortOptions={[
          { value: 'created_at', label: 'Creation Date' },
          { value: 'reference', label: 'Reference' },
          { value: 'supplier', label: 'Vendor' },
          { value: 'scheduled_date', label: 'Scheduled Date' },
          { value: 'quantity', label: 'Expected Quantity' },
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

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' ? (
        <div className="w-full overflow-x-auto pb-4">
          <div className="flex md:grid md:grid-cols-5 gap-4 min-w-[1000px] md:min-w-0">
            {kanbanColumns.map((col) => {
              const colReceipts = receipts.filter((r) => r.status === col.id);
              const Icon = col.icon;
              return (
                <div
                  key={col.id}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col min-h-[500px] w-72 md:w-auto shrink-0"
                >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      {col.label}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                    {colReceipts.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[70vh]">
                  {colReceipts.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-slate-500 italic">
                      No {col.label.toLowerCase()} receipts
                    </div>
                  ) : (
                    colReceipts.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => navigate(`/operations/receipts/${r.id}`)}
                        className="bg-slate-950/80 border border-slate-800 hover:border-blue-500/50 rounded-lg p-3 space-y-2 cursor-pointer transition-all shadow-sm group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-blue-300 group-hover:text-blue-400">
                            {r.reference}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {r.scheduled_date ? new Date(r.scheduled_date).toLocaleDateString() : '—'}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-white truncate">
                          {r.supplier?.name || <span className="text-slate-500 italic">No Vendor</span>}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                          <span className="truncate max-w-[100px]">
                            {r.warehouse?.code} / {r.destination_location?.code}
                          </span>
                          <span className="font-mono font-bold text-white">
                            {r.total_quantity_expected} units
                          </span>
                        </div>

                        {r.status !== 'done' && r.status !== 'canceled' && (
                          <div className="pt-2 flex justify-end">
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={validatingId === r.id}
                              onClick={(e) => handleValidate(r, e)}
                              className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-500"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {validatingId === r.id ? 'Validating...' : 'Validate'}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      ) : (
        /* LIST VIEW TABLE */
        <div className="w-full rounded-xl border border-slate-800 bg-slate-900/70 shadow-lg overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none">
                  <th
                    onClick={() => handleSort('reference')}
                    className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Reference</span>
                      {sortBy === 'reference' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('supplier')}
                    className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Vendor</span>
                      {sortBy === 'supplier' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('destination')}
                    className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Destination</span>
                      {sortBy === 'destination' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3.5">Contact</th>
                  <th
                    onClick={() => handleSort('scheduled_date')}
                    className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Scheduled Date</span>
                      {sortBy === 'scheduled_date' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('quantity')}
                    className="px-4 py-3.5 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Quantity</span>
                      {sortBy === 'quantity' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="px-4 py-3.5 text-center cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Status</span>
                      {sortBy === 'status' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                        <span className="text-xs font-medium">Loading inbound receipts...</span>
                      </div>
                    </td>
                  </tr>
                ) : receipts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                          <ArrowDownLeft className="w-6 h-6" />
                        </div>
                        <h4 className="text-base font-bold text-white">No Receipts Found</h4>
                        <p className="text-xs text-slate-400">
                          Create an inbound receipt order to receive goods and increase warehouse stock.
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate('/operations/receipts/new')}
                          className="mt-2"
                        >
                          <Plus className="w-4 h-4 mr-1.5" /> Create Receipt
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  receipts.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/operations/receipts/${r.id}`)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Reference */}
                      <td className="px-4 py-3.5">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                            {r.reference}
                          </span>
                          <button
                            onClick={(e) => handleCopyRef(r.reference, e)}
                            title="Copy Reference"
                            className="p-1 rounded text-slate-500 hover:text-slate-200"
                          >
                            {copiedRef === r.reference ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Vendor */}
                      <td className="px-4 py-3.5">
                        {r.supplier?.name ? (
                          <div className="font-semibold text-white truncate max-w-[180px]">
                            {r.supplier.name}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">No Vendor Assigned</span>
                        )}
                      </td>

                      {/* Destination */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>{r.warehouse?.name}</span>
                          <span className="font-mono text-purple-300 text-[11px] font-bold">
                            [{r.destination_location?.code || 'BIN'}]
                          </span>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3.5 text-slate-400 truncate max-w-[150px]">
                        {r.contact || r.supplier?.email || r.supplier?.phone || '—'}
                      </td>

                      {/* Scheduled Date */}
                      <td className="px-4 py-3.5 font-mono text-slate-300 text-xs">
                        {r.scheduled_date ? new Date(r.scheduled_date).toLocaleDateString() : '—'}
                      </td>

                      {/* Quantity */}
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-white">
                        {r.total_quantity_expected} units
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge status={r.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => navigate(`/operations/receipts/${r.id}`)}
                            title="View Receipt"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {r.status !== 'done' && r.status !== 'canceled' && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={validatingId === r.id}
                                onClick={(e) => handleValidate(r, e)}
                                className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-500"
                                title="Atomically validate receipt & book stock"
                              >
                                {validatingId === r.id ? 'Validating...' : 'Validate'}
                              </Button>
                              <button
                                onClick={(e) => handleCancel(r, e)}
                                title="Cancel Receipt"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer & Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="text-white">{receipts.length}</strong> of{' '}
                <strong className="text-white">{totalRecords}</strong> receipts
              </span>
              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    updateParams({ page: 1 });
                  }}
                  className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-white"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => updateParams({ page: currentPage - 1 })}
                className="h-8 px-2.5"
              >
                Previous
              </Button>
              <span className="px-2 font-mono text-slate-300">
                Page {currentPage} of {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || loading}
                onClick={() => updateParams({ page: currentPage + 1 })}
                className="h-8 px-2.5"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
