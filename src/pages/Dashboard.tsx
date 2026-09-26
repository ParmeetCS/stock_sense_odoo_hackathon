import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/EmptyState';
import {
  fetchDashboardKPIs,
  fetchOperationsCards,
  fetchRecentStockMovements,
  fetchRecentReceipts,
  fetchRecentDeliveries,
  fetchLowStockProducts,
  fetchDashboardChartData,
  fetchWarehouses,
  fetchCategories,
} from '../services/dashboardService';
import type {
  DashboardKPIs,
  OperationsCardsData,
  DashboardChartData,
  DashboardFilterState,
} from '../services/dashboardService';
import type { StockLedger, Receipt, Delivery, Stock, Product, Warehouse, Category } from '../types';
import {
  Package,
  AlertTriangle,
  PackageX,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Filter,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Clock,
  ChevronRight,
  Warehouse as WarehouseIcon,
  Calendar,
  FolderGrid,
  RotateCcw,
} from 'lucide-react';
import { cn } from '../utils/cn';

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Metadata Dropdowns
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Filter States
  const [filters, setFilters] = useState<DashboardFilterState>({
    warehouseId: '',
    categoryId: '',
    status: '',
    dateRange: '7d',
  });

  // Data States
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [operations, setOperations] = useState<OperationsCardsData | null>(null);
  const [recentMovements, setRecentMovements] = useState<StockLedger[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([]);
  const [recentDeliveries, setRecentDeliveries] = useState<Delivery[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<(Stock & { product: Product })[]>([]);
  const [chartData, setChartData] = useState<DashboardChartData[]>([]);

  // Initial load for metadata options (warehouses, categories)
  useEffect(() => {
    let isMounted = true;
    async function loadMetadata() {
      try {
        const [whList, catList] = await Promise.all([fetchWarehouses(), fetchCategories()]);
        if (isMounted) {
          setWarehouses(whList);
          setCategories(catList);
        }
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      }
    }
    loadMetadata();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiRes, opRes, moveRes, recRes, delRes, lowRes, chartRes] = await Promise.all([
        fetchDashboardKPIs(filters),
        fetchOperationsCards(filters),
        fetchRecentStockMovements(5, filters),
        fetchRecentReceipts(5, filters),
        fetchRecentDeliveries(5, filters),
        fetchLowStockProducts(filters),
        fetchDashboardChartData(filters),
      ]);

      setKpis(kpiRes);
      setOperations(opRes);
      setRecentMovements(moveRes);
      setRecentReceipts(recRes);
      setRecentDeliveries(delRes);
      setLowStockProducts(lowRes);
      setChartData(chartRes);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Unable to load real dashboard metrics from Supabase database.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const resetFilters = () => {
    setFilters({
      warehouseId: '',
      categoryId: '',
      status: '',
      dateRange: '7d',
    });
  };

  if (loading) {
    return <LoadingState message="Connecting to Supabase and fetching live dashboard metrics..." />;
  }

  if (error) {
    return <ErrorState title="Dashboard Connection Error" message={error} onRetry={loadData} />;
  }

  // Dynamic calculations for chart bar scaling
  const maxMovementVal = Math.max(10, ...chartData.map((d) => d.totalMovement));
  const maxFlowVal = Math.max(10, ...chartData.map((d) => Math.max(d.incoming, d.outgoing)));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Enterprise Operations Dashboard"
        description="Real-time live Supabase stock monitoring, operational pipeline metrics, and high-density inventory analytics"
        breadcrumbs={[{ label: 'Main' }, { label: 'Dashboard' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="flex items-center gap-1.5 text-xs text-slate-300"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Live Sync
            </Button>
            <Link to="/products/new">
              <Button variant="primary" size="sm" className="font-semibold text-xs">
                New Product
              </Button>
            </Link>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Filter className="w-4 h-4 text-blue-400" /> Operational Filters
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Warehouse Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
            <WarehouseIcon className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filters.warehouseId}
              onChange={(e) => setFilters((prev) => ({ ...prev, warehouseId: e.target.value }))}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} [{wh.code}]
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
            <FolderGrid className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters((prev) => ({ ...prev, categoryId: e.target.value }))}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Document Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="waiting">Waiting</option>
              <option value="ready">Ready</option>
              <option value="done">Done</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateRange: e.target.value }))}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">This Quarter (90d)</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {(filters.warehouseId || filters.categoryId || filters.status || filters.dateRange !== '7d') && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* 6 Core KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">In Stock</span>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{kpis?.totalProductsInStock ?? 0}</div>
          <div className="text-[10px] text-emerald-400 font-medium">Available Products</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 font-mono">{kpis?.lowStockItemsCount ?? 0}</div>
          <div className="text-[10px] text-amber-400 font-medium">Reorder Required</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Out of Stock</span>
            <PackageX className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono">{kpis?.outOfStockItemsCount ?? 0}</div>
          <div className="text-[10px] text-red-400 font-medium">Depleted SKUs</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Inbound POs</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{kpis?.pendingReceiptsCount ?? 0}</div>
          <div className="text-[10px] text-slate-400 font-medium">Pending Receipts</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Outbound Orders</span>
            <ArrowUpRight className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{kpis?.pendingDeliveriesCount ?? 0}</div>
          <div className="text-[10px] text-slate-400 font-medium">Pending Deliveries</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Transfers</span>
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{kpis?.scheduledTransfersCount ?? 0}</div>
          <div className="text-[10px] text-slate-400 font-medium">Scheduled Moves</div>
        </div>
      </div>

      {/* Operational Breakdown Cards (Receipts & Deliveries) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Receipts Breakdown */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-white text-base">Inbound Receipts Execution</h3>
            </div>
            <Link to="/operations/receipts" className="text-xs text-blue-400 hover:underline flex items-center">
              View All Pipeline <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium block">To Receive</span>
              <span className="text-xl font-bold text-blue-400 font-mono mt-1 block">
                {operations?.receipts.toReceive ?? 0}
              </span>
              <span className="text-[10px] text-slate-500">Ready Status</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium block">Late / Overdue</span>
              <span className="text-xl font-bold text-red-400 font-mono mt-1 block">
                {operations?.receipts.late ?? 0}
              </span>
              <span className="text-[10px] text-red-400/80">Scheduled & Past</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium block">Waiting Stock</span>
              <span className="text-xl font-bold text-amber-300 font-mono mt-1 block">
                {operations?.receipts.waiting ?? 0}
              </span>
              <span className="text-[10px] text-amber-400/80">Awaiting Inspection</span>
            </div>
          </div>
        </div>

        {/* Deliveries Breakdown */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-white text-base">Outbound Deliveries Execution</h3>
            </div>
            <Link to="/operations/deliveries" className="text-xs text-purple-400 hover:underline flex items-center">
              View All Orders <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium block">To Deliver</span>
              <span className="text-xl font-bold text-purple-400 font-mono mt-1 block">
                {operations?.deliveries.toDeliver ?? 0}
              </span>
              <span className="text-[10px] text-slate-500">Staged & Ready</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium block">Late Shipments</span>
              <span className="text-xl font-bold text-red-400 font-mono mt-1 block">
                {operations?.deliveries.late ?? 0}
              </span>
              <span className="text-[10px] text-red-400/80">Scheduled & Past</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium block">Waiting Pick</span>
              <span className="text-xl font-bold text-amber-300 font-mono mt-1 block">
                {operations?.deliveries.waiting ?? 0}
              </span>
              <span className="text-[10px] text-amber-400/80">Pending Allocation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Stock Movement Over Time */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-white text-base">Stock Movement Volume Over Time</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">Total Audit Units</span>
          </div>

          {chartData.length === 0 ? (
            <EmptyState title="No Stock Movements" description="No inventory transactions recorded for the selected filter." />
          ) : (
            <div className="h-48 w-full flex items-end justify-between gap-2 pt-4 px-2">
              {chartData.map((d, i) => {
                const heightPct = d.totalMovement > 0 ? Math.min(100, Math.max(8, (d.totalMovement / maxMovementVal) * 100)) : 2;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                    <div className="absolute -top-8 bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded shadow border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {d.totalMovement} Units
                    </div>
                    <div className="w-full bg-slate-950 rounded-t-lg h-36 flex items-end overflow-hidden">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={cn(
                          'w-full rounded-t transition-all duration-500 group-hover:brightness-125',
                          d.totalMovement > 0 ? 'bg-gradient-to-t from-blue-600 to-cyan-400' : 'bg-slate-800/40'
                        )}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-full">{d.date}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart 2: Incoming vs Outgoing Stock */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-white text-base">Incoming vs Outgoing Stock Flow</h3>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Receipts / In
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Deliveries / Out
              </span>
            </div>
          </div>

          {chartData.length === 0 ? (
            <EmptyState title="No Stock Movements" description="No inventory transactions recorded for the selected filter." />
          ) : (
            <div className="h-48 w-full flex items-end justify-between gap-2 pt-4 px-2">
              {chartData.map((d, i) => {
                const inPct = d.incoming > 0 ? Math.min(100, Math.max(6, (d.incoming / maxFlowVal) * 100)) : 2;
                const outPct = d.outgoing > 0 ? Math.min(100, Math.max(6, (d.outgoing / maxFlowVal) * 100)) : 2;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-slate-950 rounded-t-lg h-36 flex items-end justify-center gap-1 px-1">
                      <div
                        style={{ height: `${inPct}%` }}
                        className={cn(
                          'w-1/2 rounded-t transition-all duration-500 hover:brightness-110',
                          d.incoming > 0 ? 'bg-emerald-500' : 'bg-slate-800/30'
                        )}
                        title={`Incoming: ${d.incoming}`}
                      />
                      <div
                        style={{ height: `${outPct}%` }}
                        className={cn(
                          'w-1/2 rounded-t transition-all duration-500 hover:brightness-110',
                          d.outgoing > 0 ? 'bg-purple-500' : 'bg-slate-800/30'
                        )}
                        title={`Outgoing: ${d.outgoing}`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-full">{d.date}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4 Data Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Recent Stock Movements */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-white text-sm">Recent Stock Movements</h3>
            </div>
            <Link to="/move-history" className="text-xs text-blue-400 hover:underline">
              View Audit Trail
            </Link>
          </div>

          {recentMovements.length === 0 ? (
            <EmptyState title="No Movements Found" description="Stock ledger transactions matching filters will appear here." />
          ) : (
            <div className="divide-y divide-slate-800/80">
              {recentMovements.map((m) => (
                <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white block">{m.product?.name || 'Unknown Product'}</span>
                    <span className="text-[11px] text-slate-400 font-mono">Ref: {m.reference}</span>
                  </div>
                  <div className="text-right">
                    <span
                      className={cn(
                        'font-bold font-mono text-sm block',
                        m.quantity_change > 0 ? 'text-emerald-400' : 'text-red-400'
                      )}
                    >
                      {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                    </span>
                    <span className="text-[10px] text-slate-500">Balance: {m.balance_after}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Low Stock Alert Products */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-white text-sm">Low Stock Alert SKUs</h3>
            </div>
            <Link to="/products" className="text-xs text-amber-400 hover:underline">
              Manage Reorder Levels
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <EmptyState title="All Stock Levels Optimal" description="No products currently below safety reorder threshold for selected filter." />
          ) : (
            <div className="divide-y divide-slate-800/80">
              {lowStockProducts.map((st) => (
                <div key={st.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white block">{st.product?.name || 'Product'}</span>
                    <span className="text-[11px] font-mono text-slate-400">SKU: {st.product?.sku}</span>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-xs">
                      On Hand: {st.on_hand}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Reorder: {st.product?.reorder_level || 10}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Recent Receipts */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">Recent Inbound Receipts</h3>
            </div>
            <Link to="/operations/receipts" className="text-xs text-emerald-400 hover:underline">
              Receipt Register
            </Link>
          </div>

          {recentReceipts.length === 0 ? (
            <EmptyState title="No Receipts Found" description="Inbound receipts matching filters will populate after creation." />
          ) : (
            <div className="divide-y divide-slate-800/80">
              {recentReceipts.map((r) => (
                <div key={r.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold font-mono text-white block">{r.reference}</span>
                    <span className="text-[11px] text-slate-400">{r.supplier?.name || 'No Supplier'}</span>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Recent Deliveries */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-white text-sm">Recent Outbound Deliveries</h3>
            </div>
            <Link to="/operations/deliveries" className="text-xs text-purple-400 hover:underline">
              Deliveries Register
            </Link>
          </div>

          {recentDeliveries.length === 0 ? (
            <EmptyState title="No Deliveries Found" description="Outbound shipments matching filters will populate after creation." />
          ) : (
            <div className="divide-y divide-slate-800/80">
              {recentDeliveries.map((d) => (
                <div key={d.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold font-mono text-white block">{d.reference}</span>
                    <span className="text-[11px] text-slate-400">{d.customer_name || 'No Customer Specified'}</span>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
