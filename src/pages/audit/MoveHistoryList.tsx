import React, { useState, useEffect } from 'react';
import {
  History,
  Download,
  ArrowUpDown,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Lock,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import {
  GlobalFilterToolbar,
  type ActiveFilter,
} from '../../components/ui/GlobalFilterToolbar';
import { useUrlFilterParams } from '../../hooks/useUrlFilterParams';
import {
  fetchMoveHistory,
  fetchMoveHistoryMetadata,
  fetchMovementDetail,
  exportMoveHistoryCSV,
} from '../../services/moveHistoryService';
import type { MoveHistoryItem, MoveOperationType } from '../../services/moveHistoryService';
import type { Warehouse, Location } from '../../types';
import { cn } from '../../utils/cn';

export const MoveHistoryList: React.FC = () => {
  const { showToast } = useToast();

  const [movements, setMovements] = useState<MoveHistoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Standardized URL query parameter syncing
  const { getParam, updateParams, resetParams } = useUrlFilterParams({
    q: '',
    product_search: '',
    contact_search: '',
    warehouse_id: 'all',
    location_id: 'all',
    operation: 'all',
    start_date: '',
    end_date: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
    page: 1,
  });

  const search = getParam('q', '');
  const productSearch = getParam('product_search', '');
  const contactSearch = getParam('contact_search', '');
  const warehouseId = getParam('warehouse_id', 'all');
  const locationId = getParam('location_id', 'all');
  const operationType = getParam('operation', 'all') as MoveOperationType;
  const startDate = getParam('start_date', '');
  const endDate = getParam('end_date', '');
  const sortBy = getParam('sortBy', 'created_at');
  const sortOrder = getParam('sortOrder', 'desc') as 'asc' | 'desc';
  const page = getParam('page', 1);

  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // KPI metrics
  const [kpis, setKpis] = useState({
    totalMovements: 0,
    totalInboundQty: 0,
    totalOutboundQty: 0,
    netQtyChange: 0,
  });

  // Selected movement for slide-over drawer
  const [selectedMovement, setSelectedMovement] = useState<MoveHistoryItem | null>(null);

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadMoveHistory();
  }, [
    search,
    productSearch,
    contactSearch,
    warehouseId,
    locationId,
    operationType,
    startDate,
    endDate,
    sortBy,
    sortOrder,
    page,
  ]);

  const loadMetadata = async () => {
    try {
      const meta = await fetchMoveHistoryMetadata();
      setWarehouses(meta.warehouses);
      setLocations(meta.locations);
    } catch (err) {
      console.error('Failed to load move history metadata:', err);
    }
  };

  const loadMoveHistory = async () => {
    try {
      setLoading(true);
      const res = await fetchMoveHistory({
        search,
        productSearch,
        contactSearch,
        warehouseId,
        locationId,
        operationType,
        startDate,
        endDate,
        sortBy,
        sortOrder,
        page,
        pageSize: 15,
      });

      setMovements(res.movements);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
      setKpis(res.kpis);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch stock move history', 'error');
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
  if (productSearch) {
    activeFilters.push({ key: 'product_search', label: 'Product', valueDisplay: productSearch, rawVal: productSearch });
  }
  if (contactSearch) {
    activeFilters.push({ key: 'contact_search', label: 'Contact', valueDisplay: contactSearch, rawVal: contactSearch });
  }
  if (operationType !== 'all') {
    activeFilters.push({ key: 'operation', label: 'Operation', valueDisplay: operationType, rawVal: operationType });
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
  if (locationId !== 'all') {
    const loc = locations.find((l) => l.id === locationId);
    activeFilters.push({
      key: 'location_id',
      label: 'Location',
      valueDisplay: loc ? loc.code : locationId,
      rawVal: locationId,
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

  const handleInspectMovement = async (id: string) => {
    try {
      const detail = await fetchMovementDetail(id);
      setSelectedMovement(detail);
    } catch (err: any) {
      showToast(err.message || 'Failed to load movement detail', 'error');
    }
  };

  const handleExportCSV = () => {
    if (movements.length === 0) {
      showToast('No movements to export.', 'warning');
      return;
    }
    exportMoveHistoryCSV(movements);
    showToast(`Exported ${movements.length} audit records to CSV`, 'success');
  };

  const filteredLocations =
    warehouseId && warehouseId !== 'all'
      ? locations.filter((loc) => loc.warehouse_id === warehouseId)
      : locations;

  const getOperationBadge = (type: string) => {
    if (type.includes('Receipt')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
    if (type.includes('Delivery')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
    if (type.includes('Transfer')) {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
    if (type.includes('Adjustment')) {
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Page Title Header */}
      <PageHeader
        title="Move History & Audit Trail"
        description="Immutable stock ledger tracking all inbound, outbound & internal movements"
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadMoveHistory()}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleExportCSV}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        }
      />

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Movements</span>
            <p className="text-xl font-extrabold text-white mt-1 font-mono">{kpis.totalMovements}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Total Inbound</span>
            <p className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">+{kpis.totalInboundQty}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Total Outbound</span>
            <p className="text-xl font-extrabold text-amber-400 mt-1 font-mono">-{kpis.totalOutboundQty}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Net Stock Variance</span>
            <p
              className={cn(
                'text-xl font-extrabold mt-1 font-mono',
                kpis.netQtyChange >= 0 ? 'text-blue-400' : 'text-rose-400'
              )}
            >
              {kpis.netQtyChange >= 0 ? `+${kpis.netQtyChange}` : kpis.netQtyChange}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-800 text-blue-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Global Filter Toolbar */}
      <GlobalFilterToolbar
        search={search}
        onSearchChange={(val) => updateParams({ q: val, page: 1 })}
        searchPlaceholder="Search reference, SKU, user..."
        secondarySearch={{
          value: productSearch,
          onChange: (val) => updateParams({ product_search: val, page: 1 }),
          placeholder: "Filter by product...",
        }}
        operations={[
          { value: 'receipt', label: 'Receipt (Inbound)' },
          { value: 'delivery', label: 'Delivery (Outbound)' },
          { value: 'transfer', label: 'Internal Transfer' },
          { value: 'adjustment', label: 'Stock Adjustment' },
          { value: 'initial', label: 'Initial Setup' },
        ]}
        selectedOperation={operationType}
        onOperationChange={(val) => updateParams({ operation: val, page: 1 })}
        warehouses={warehouses}
        selectedWarehouse={warehouseId}
        onWarehouseChange={(val) => updateParams({ warehouse_id: val, location_id: 'all', page: 1 })}
        warehouseLabel="All Warehouses"
        locations={filteredLocations}
        selectedLocation={locationId}
        onLocationChange={(val) => updateParams({ location_id: val, page: 1 })}
        startDate={startDate}
        onStartDateChange={(val) => updateParams({ start_date: val, page: 1 })}
        endDate={endDate}
        onEndDateChange={(val) => updateParams({ end_date: val, page: 1 })}
        sortOptions={[
          { value: 'created_at', label: 'Date & Time' },
          { value: 'reference', label: 'Reference' },
          { value: 'product', label: 'Product Name' },
          { value: 'entry_type', label: 'Operation Type' },
          { value: 'quantity', label: 'Quantity' },
          { value: 'warehouse', label: 'Warehouse Code' },
        ]}
        sortBy={sortBy}
        onSortByChange={(val) => updateParams({ sortBy: val, page: 1 })}
        sortOrder={sortOrder}
        onToggleSortOrder={() => updateParams({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc', page: 1 })}
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={resetParams}
      />

      {/* Main Audit Data Table */}
      {loading ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center space-y-3 text-center">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Loading stock ledger audit movements...</p>
        </div>
      ) : movements.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center space-y-4">
          <History className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No move history records found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No stock movements match the specified search and filter criteria. Try adjusting your filters.
          </p>
        </div>
      ) : (
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
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('created_at')}>
                    <div className="flex items-center gap-1.5">
                      <span>Date & Time</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('product')}>
                    <div className="flex items-center gap-1.5">
                      <span>Product</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('entry_type')}>
                    <div className="flex items-center gap-1.5">
                      <span>Operation Type</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">From</th>
                  <th className="py-3.5 px-4">To</th>
                  <th className="py-3.5 px-4 text-right cursor-pointer hover:text-white" onClick={() => handleSort('quantity')}>
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Quantity</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('warehouse')}>
                    <div className="flex items-center gap-1.5">
                      <span>Warehouse / Loc</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Responsible</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {movements.map((m) => {
                  const isPositive = m.quantity_change > 0;
                  return (
                    <tr
                      key={m.id}
                      onClick={() => handleInspectMovement(m.id)}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                    >
                      {/* Reference */}
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-400 group-hover:underline">
                        {m.reference}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-300">
                        {m.created_at
                          ? new Date(m.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>

                      {/* Product */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">{m.product?.name}</span>
                          <span className="text-[11px] font-mono text-slate-400">{m.product?.sku}</span>
                        </div>
                      </td>

                      {/* Operation Type */}
                      <td className="py-3.5 px-4">
                        <span className={cn('px-2 py-0.5 rounded text-[11px] font-semibold border', getOperationBadge(m.operation_display))}>
                          {m.operation_display}
                        </span>
                      </td>

                      {/* From */}
                      <td className="py-3.5 px-4 text-slate-300 truncate max-w-[120px]" title={m.from_display}>
                        {m.from_display}
                      </td>

                      {/* To */}
                      <td className="py-3.5 px-4 text-slate-300 truncate max-w-[120px]" title={m.to_display}>
                        {m.to_display}
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={cn(
                            'font-mono font-bold text-xs px-2 py-0.5 rounded border inline-flex items-center gap-1',
                            isPositive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          )}
                        >
                          {isPositive ? `+${m.quantity_change}` : m.quantity_change}
                        </span>
                      </td>

                      {/* Warehouse / Location */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-200">{m.warehouse?.code}</span> /{' '}
                        <span className="font-mono text-amber-400">{m.location?.code}</span>
                      </td>

                      {/* Responsible */}
                      <td className="py-3.5 px-4 text-slate-300">
                        {m.user?.full_name || m.user?.email || 'System'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase inline-flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Audited
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInspectMovement(m.id);
                          }}
                          className="text-blue-400 hover:text-blue-300 text-xs py-1"
                        >
                          Details &rarr;
                        </Button>
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
              Showing <span className="font-semibold text-white">{movements.length}</span> of{' '}
              <span className="font-semibold text-white">{totalCount}</span> audit ledger movements
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
      )}

      {/* Movement Detail Slide-Over Drawer */}
      {selectedMovement && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-400">{selectedMovement.reference}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase inline-flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Immutable Audit Record
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">Movement Details</h3>
                </div>
                <button
                  onClick={() => setSelectedMovement(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* RLS Security Banner */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center gap-3 text-xs text-slate-400">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-slate-200">Supabase RLS Enforced: </span>
                  Historical stock ledger records are read-only and immutable. Editing or deleting audit trails is prohibited.
                </div>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Stock Before</span>
                  <span className="text-lg font-bold font-mono text-slate-300">
                    {selectedMovement.balance_before} {selectedMovement.product?.unit_of_measure}
                  </span>
                </div>

                <div className="bg-slate-950 border border-blue-500/30 rounded-xl p-4">
                  <span className="text-[10px] uppercase font-bold text-blue-400 block mb-1">Stock After</span>
                  <span className="text-lg font-bold font-mono text-white">
                    {selectedMovement.balance_after} {selectedMovement.product?.unit_of_measure}
                  </span>
                </div>
              </div>

              {/* Detail List */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-medium">Operation Type</span>
                  <span className="font-semibold text-white">{selectedMovement.operation_display}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-medium">Quantity Change</span>
                  <span
                    className={cn(
                      'font-mono font-bold text-sm',
                      selectedMovement.quantity_change > 0 ? 'text-emerald-400' : 'text-amber-400'
                    )}
                  >
                    {selectedMovement.quantity_change > 0 ? `+${selectedMovement.quantity_change}` : selectedMovement.quantity_change}{' '}
                    {selectedMovement.product?.unit_of_measure}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-medium">Source (From)</span>
                  <span className="font-semibold text-slate-200">{selectedMovement.from_display}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-medium">Destination (To)</span>
                  <span className="font-semibold text-slate-200">{selectedMovement.to_display}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-medium">Warehouse Facility</span>
                  <span className="font-semibold text-slate-200">
                    {selectedMovement.warehouse?.name} ({selectedMovement.warehouse?.code})
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-medium">Storage Location / Bin</span>
                  <span className="font-mono font-bold text-amber-400">{selectedMovement.location?.code}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-medium">Recorded By</span>
                  <span className="font-semibold text-slate-200">
                    {selectedMovement.user?.full_name || selectedMovement.user?.email || 'System'} ({selectedMovement.user?.role || 'user'})
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-medium">Audit Timestamp</span>
                  <span className="font-mono text-slate-300">
                    {selectedMovement.created_at ? new Date(selectedMovement.created_at).toLocaleString() : '—'}
                  </span>
                </div>

                {selectedMovement.reason && (
                  <div className="pt-1">
                    <span className="text-slate-400 font-medium block mb-1">Reason / Notes:</span>
                    <p className="p-2 rounded bg-slate-900 text-slate-300 font-sans">{selectedMovement.reason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Close */}
            <div className="pt-4 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMovement(null)}
                className="w-full border-slate-800 text-slate-300 hover:bg-slate-800"
              >
                Close Audit Inspection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
