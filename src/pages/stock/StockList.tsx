import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Layers,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  RefreshCw,
  Building2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  DollarSign,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Sliders,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import {
  fetchStockInventory,
  fetchStockRowLedger,
  fetchStockFilterMetadata,
  type StockInventoryItem,
} from '../../services/stockService';
import type { Product, Category, Warehouse, Location, StockLedger } from '../../types';
import { cn } from '../../utils/cn';

export const StockList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const [stockItems, setStockItems] = useState<StockInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Metadata dropdowns
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Filter States
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [productId, setProductId] = useState(searchParams.get('product_id') || 'all');
  const [categoryId, setCategoryId] = useState(searchParams.get('category_id') || 'all');
  const [warehouseId, setWarehouseId] = useState(searchParams.get('warehouse_id') || 'all');
  const [locationId, setLocationId] = useState(searchParams.get('location_id') || 'all');
  const [stockStatus, setStockStatus] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>(
    (searchParams.get('status') as any) || 'all'
  );

  // Sorting
  const [sortBy, setSortBy] = useState<any>(searchParams.get('sortBy') || 'product_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as any) || 'asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // KPIs
  const [kpis, setKpis] = useState({
    totalOnHand: 0,
    totalReserved: 0,
    totalFreeToUse: 0,
    totalValuation: 0,
    inStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });

  // Selected Stock Row Detail Modal
  const [selectedStock, setSelectedStock] = useState<StockInventoryItem | null>(null);
  const [rowLedger, setRowLedger] = useState<StockLedger[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [copiedSku, setCopiedSku] = useState(false);

  // Load filter metadata
  useEffect(() => {
    fetchStockFilterMetadata().then((meta) => {
      setProductsList(meta.products);
      setCategories(meta.categories);
      setWarehouses(meta.warehouses);
      setLocations(meta.locations);
    });
  }, []);

  // Filter locations if warehouse selected
  const availableLocations = warehouseId !== 'all'
    ? locations.filter((loc) => loc.warehouse_id === warehouseId)
    : locations;

  // Load stock data from Supabase
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchStockInventory({
        search,
        productId,
        categoryId,
        warehouseId,
        locationId,
        stockStatus,
        sortBy,
        sortOrder,
        page: currentPage,
        pageSize,
      });

      setStockItems(res.items);
      setTotalRecords(res.totalCount);
      setTotalPages(res.totalPages);
      setKpis(res.kpis);

      // Sync URL parameters
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (productId !== 'all') params.set('product_id', productId);
      if (categoryId !== 'all') params.set('category_id', categoryId);
      if (warehouseId !== 'all') params.set('warehouse_id', warehouseId);
      if (locationId !== 'all') params.set('location_id', locationId);
      if (stockStatus !== 'all') params.set('status', stockStatus);
      if (sortBy !== 'product_name') params.set('sortBy', sortBy);
      if (sortOrder !== 'asc') params.set('sortOrder', sortOrder);
      if (currentPage > 1) params.set('page', String(currentPage));
      setSearchParams(params, { replace: true });
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to query inventory stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [
    search,
    productId,
    categoryId,
    warehouseId,
    locationId,
    stockStatus,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
  ]);

  // Handle Sort
  const handleSort = (field: any) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setProductId('all');
    setCategoryId('all');
    setWarehouseId('all');
    setLocationId('all');
    setStockStatus('all');
    setSortBy('product_name');
    setSortOrder('asc');
    setCurrentPage(1);
  };

  // Open Stock Row Detail
  const openStockDetail = async (stock: StockInventoryItem) => {
    setSelectedStock(stock);
    setLoadingLedger(true);
    try {
      const ledgerEntries = await fetchStockRowLedger(
        stock.product_id,
        stock.warehouse_id,
        stock.location_id,
        10
      );
      setRowLedger(ledgerEntries);
    } catch (err) {
      console.error('Failed to load ledger for stock row:', err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleCopySku = (sku: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(sku);
    setCopiedSku(true);
    setTimeout(() => setCopiedSku(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Inventory', href: '/stock' },
          { label: 'Stock Levels' },
        ]}
        title="Live Stock Levels & Inventory Ledger"
        description="Real-time physical stock on hand, reserved quantities, bin allocations, and safety reorder tracking."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              Refresh Balances
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/move-history')}
              className="text-purple-300 border-purple-500/30 hover:bg-purple-500/10"
            >
              <History className="w-4 h-4 mr-1.5" />
              Move History
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/operations/adjustments/new')}
              className="bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20"
            >
              <Sliders className="w-4 h-4 mr-1.5" />
              Stock Adjustment
            </Button>
          </div>
        }
      />

      {/* KPI Statistic Ribbons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total On Hand</div>
            <div className="text-xl font-bold text-white font-mono">{kpis.totalOnHand.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Reserved / Demanded</div>
            <div className="text-xl font-bold text-amber-400 font-mono">{kpis.totalReserved.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Free To Use</div>
            <div className="text-xl font-bold text-emerald-400 font-mono">{kpis.totalFreeToUse.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Asset Valuation</div>
            <div className="text-xl font-bold text-white font-mono">
              ${kpis.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 space-y-3.5 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search product, SKU, warehouse, bin location..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Stock Status Buttons */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs overflow-x-auto">
            {[
              { id: 'all', label: 'All Stock' },
              { id: 'in_stock', label: `In Stock (${kpis.inStockCount})` },
              { id: 'low_stock', label: `Low Stock (${kpis.lowStockCount})` },
              { id: 'out_of_stock', label: `Out of Stock (${kpis.outOfStockCount})` },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  setStockStatus(st.id as any);
                  setCurrentPage(1);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-md font-medium transition-all whitespace-nowrap',
                  stockStatus === st.id
                    ? st.id === 'low_stock'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : st.id === 'out_of_stock'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                )}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-800/60">
          {/* Product Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Product
            </label>
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 px-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Products</option>
              {productsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} [{p.sku}]
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 px-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Warehouse
            </label>
            <select
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
                setLocationId('all');
                setCurrentPage(1);
              }}
              className="w-full h-8 px-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} [{w.code}]
                </option>
              ))}
            </select>
          </div>

          {/* Location / Bin Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Bin Location
            </label>
            <select
              value={locationId}
              onChange={(e) => {
                setLocationId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 px-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Locations</option>
              {availableLocations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} [{l.code}]
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="w-full h-8 text-xs text-slate-400 hover:text-white"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="w-full rounded-xl border border-slate-800 bg-slate-900/70 shadow-lg overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none">
                <th
                  onClick={() => handleSort('product_name')}
                  className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Product</span>
                    {sortBy === 'product_name' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('sku')}
                  className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>SKU</span>
                    {sortBy === 'sku' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('cost_price')}
                  className="px-4 py-3.5 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Unit Cost</span>
                    {sortBy === 'cost_price' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('on_hand')}
                  className="px-4 py-3.5 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>On Hand</span>
                    {sortBy === 'on_hand' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('reserved')}
                  className="px-4 py-3.5 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Reserved</span>
                    {sortBy === 'reserved' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('free_to_use')}
                  className="px-4 py-3.5 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Free To Use</span>
                    {sortBy === 'free_to_use' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('warehouse')}
                  className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Warehouse</span>
                    {sortBy === 'warehouse' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('location')}
                  className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Location</span>
                    {sortBy === 'location' ? (
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
                    <span>Stock Status</span>
                    {sortBy === 'status' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3.5 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                      <span className="text-xs font-medium">Querying live Supabase inventory allocations...</span>
                    </div>
                  </td>
                </tr>
              ) : stockItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                        <Layers className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold text-white">No Inventory Matches</h4>
                      <p className="text-xs text-slate-400">
                        No active stock allocations match your selected filters.
                      </p>
                      <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-2">
                        Reset All Filters
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                stockItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => openStockDetail(item)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    {/* Product Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0">
                          {item.product?.name?.charAt(0) || 'P'}
                        </div>
                        <div className="min-w-0 max-w-[200px]">
                          <span className="font-semibold text-white truncate block group-hover:text-blue-400 transition-colors">
                            {item.product?.name}
                          </span>
                          {item.product?.category?.name && (
                            <span className="text-[10px] text-slate-400">
                              {item.product.category.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {item.product?.sku}
                      </span>
                    </td>

                    {/* Unit Cost */}
                    <td className="px-4 py-3.5 text-right font-mono text-slate-300">
                      ${item.unit_cost.toFixed(2)}
                    </td>

                    {/* On Hand */}
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-white">
                      {item.on_hand.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">{item.product?.unit_of_measure}</span>
                    </td>

                    {/* Reserved */}
                    <td className="px-4 py-3.5 text-right font-mono text-amber-400">
                      {item.reserved > 0 ? (
                        <span>{item.reserved.toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>

                    {/* Free To Use */}
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-400">
                      {item.free_to_use.toLocaleString()}
                    </td>

                    {/* Warehouse */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.warehouse?.name}</span>
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1 py-0.2 rounded">
                          {item.warehouse?.code}
                        </span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 font-mono text-purple-300 font-semibold text-xs">
                        <MapPin className="w-3.5 h-3.5 text-purple-400" />
                        <span>{item.location?.code}</span>
                      </div>
                    </td>

                    {/* Stock Status */}
                    <td className="px-4 py-3.5 text-center">
                      {item.stock_status === 'out_of_stock' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          Out of Stock
                        </span>
                      ) : item.stock_status === 'low_stock' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          In Stock
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openStockDetail(item);
                        }}
                        title="View Stock Breakdown"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-white">{stockItems.length}</strong> of{' '}
              <strong className="text-white">{totalRecords}</strong> stock allocations
            </span>
            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
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
              onClick={() => setCurrentPage(currentPage - 1)}
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
              onClick={() => setCurrentPage(currentPage + 1)}
              className="h-8 px-2.5"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Stock Row Detail Modal */}
      {selectedStock && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedStock(null)}
          title={`Stock Allocation: ${selectedStock.product?.name || 'Product'}`}
          subtitle={`${selectedStock.warehouse?.name || 'Warehouse'} > ${selectedStock.location?.code || 'Bin'}`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            {/* Integrity Notice */}
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Direct Stock Editing Restricted:</span> To ensure complete inventory accounting integrity, stock counts must only be updated through documented operation orders (Receipts, Deliveries, Internal Transfers, or Adjustments).
              </div>
            </div>

            {/* Allocation Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">On Hand</span>
                <div className="text-xl font-bold font-mono text-white mt-0.5">
                  {selectedStock.on_hand.toLocaleString()} <span className="text-xs text-slate-500">{selectedStock.product?.unit_of_measure}</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Reserved</span>
                <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                  {selectedStock.reserved.toLocaleString()}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Free To Use</span>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                  {selectedStock.free_to_use.toLocaleString()}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Valuation</span>
                <div className="text-xl font-bold font-mono text-white mt-0.5">
                  ${selectedStock.total_valuation.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Master Specifications */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">SKU Code</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-blue-300">{selectedStock.product?.sku}</span>
                  <button
                    onClick={(e) => selectedStock.product?.sku && handleCopySku(selectedStock.product.sku, e)}
                    className="p-0.5 text-slate-500 hover:text-slate-200"
                    title="Copy SKU"
                  >
                    {copiedSku ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Facility / Warehouse</span>
                <span className="text-white font-semibold">{selectedStock.warehouse?.name} [{selectedStock.warehouse?.code}]</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Storage Location Bin</span>
                <span className="font-mono text-purple-300 font-bold">{selectedStock.location?.name} ({selectedStock.location?.code})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Unit Cost / Price</span>
                <span className="font-mono text-slate-200">${selectedStock.unit_cost.toFixed(2)} / ${Number(selectedStock.product?.sale_price || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Reorder Safety Level</span>
                <span className="font-mono text-amber-300">≤ {selectedStock.product?.reorder_level || 10} {selectedStock.product?.unit_of_measure}</span>
              </div>
            </div>

            {/* Recent Movements Audit Trail */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-purple-400" /> Recent Move History for this Bin
                </h4>
                <button
                  onClick={() => navigate('/move-history')}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  View Full Audit Log <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-bold uppercase text-slate-400">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Operation</th>
                      <th className="px-3 py-2">Reference</th>
                      <th className="px-3 py-2 text-right">Delta</th>
                      <th className="px-3 py-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {loadingLedger ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          <RefreshCw className="w-4 h-4 animate-spin inline-block mr-1 text-blue-400" /> Loading movement records...
                        </td>
                      </tr>
                    ) : rowLedger.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          No recent transactions recorded for this location bin.
                        </td>
                      </tr>
                    ) : (
                      rowLedger.map((mov) => {
                        const isPos = Number(mov.quantity_change) > 0;
                        return (
                          <tr key={mov.id} className="hover:bg-slate-800/30">
                            <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                              {mov.created_at ? new Date(mov.created_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-3 py-2 capitalize font-semibold text-slate-200">
                              {mov.entry_type}
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-400">
                              {mov.reference}
                            </td>
                            <td className={cn('px-3 py-2 text-right font-mono font-bold', isPos ? 'text-emerald-400' : 'text-red-400')}>
                              {isPos ? `+${mov.quantity_change}` : mov.quantity_change}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-white">
                              {Number(mov.balance_after).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Operational Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/operations/adjustments/new')}
                  className="text-xs text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
                >
                  <Sliders className="w-3.5 h-3.5 mr-1" /> Adjust Stock
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/operations/receipts/new')}
                  className="text-xs text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 mr-1" /> Receive Stock
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/operations/transfers/new')}
                  className="text-xs text-blue-300 border-blue-500/30 hover:bg-blue-500/10"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Transfer Stock
                </Button>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => selectedStock.product_id && navigate(`/products/${selectedStock.product_id}`)}
              >
                View Product Master
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
