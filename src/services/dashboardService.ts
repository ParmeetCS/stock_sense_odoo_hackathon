import { supabase } from '../lib/supabase';
import type { StockLedger, Receipt, Delivery, Stock, Product, Warehouse, Category } from '../types';

export interface DashboardKPIs {
  totalProductsInStock: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
  pendingReceiptsCount: number;
  pendingDeliveriesCount: number;
  scheduledTransfersCount: number;
}

export interface OperationsCardsData {
  receipts: {
    toReceive: number;
    late: number;
    waiting: number;
  };
  deliveries: {
    toDeliver: number;
    late: number;
    waiting: number;
  };
}

export interface DashboardChartData {
  date: string;
  incoming: number;
  outgoing: number;
  totalMovement: number;
}

export interface DashboardFilterState {
  warehouseId?: string;
  categoryId?: string;
  status?: string;
  dateRange?: string; // '7d' | '30d' | '90d' | 'all'
}

/**
 * Helper to get date threshold timestamp based on date range filter
 */
function getDateThreshold(dateRange?: string): string | null {
  if (!dateRange || dateRange === 'all') return null;
  const now = new Date();
  if (dateRange === '7d') now.setDate(now.getDate() - 7);
  else if (dateRange === '30d') now.setDate(now.getDate() - 30);
  else if (dateRange === '90d') now.setDate(now.getDate() - 90);
  else return null;
  return now.toISOString();
}

/**
 * Fetch Warehouses list for filter dropdowns
 */
export async function fetchWarehouses(): Promise<Warehouse[]> {
  try {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error || !data) return [];
    return data as Warehouse[];
  } catch (err) {
    console.error('Error fetching warehouses for dashboard filter:', err);
    return [];
  }
}

/**
 * Fetch Categories list for filter dropdowns
 */
export async function fetchCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data) return [];
    return data as Category[];
  } catch (err) {
    console.error('Error fetching categories for dashboard filter:', err);
    return [];
  }
}

/**
 * Fetch Dashboard KPIs with filtering support
 */
export async function fetchDashboardKPIs(filters?: DashboardFilterState): Promise<DashboardKPIs> {
  // 1. Try RPC function first
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_dashboard_kpis', {
      p_warehouse_id: filters?.warehouseId || null,
      p_category_id: filters?.categoryId || null,
      p_status: filters?.status || null,
      p_date_range: filters?.dateRange || '7d',
    });

    if (!rpcErr && rpcData && typeof rpcData === 'object') {
      return rpcData as DashboardKPIs;
    }
  } catch {
    // Fall back to direct query builder if RPC is unavailable
  }

  // 2. Direct Supabase Query Fallback
  try {
    const dateThreshold = getDateThreshold(filters?.dateRange);

    // Stock query for in_stock, low_stock, out_of_stock
    let stockQuery = supabase
      .from('stock')
      .select('product_id, warehouse_id, on_hand, reserved, product:products!inner(id, reorder_level, category_id, is_active)');

    if (filters?.warehouseId) {
      stockQuery = stockQuery.eq('warehouse_id', filters.warehouseId);
    }
    if (filters?.categoryId) {
      stockQuery = stockQuery.eq('product.category_id', filters.categoryId);
    }

    const { data: stockData } = await stockQuery;

    // Aggregate on-hand by product
    const productOnHandMap = new Map<string, { totalOnHand: number; reorderLevel: number }>();
    if (stockData) {
      stockData.forEach((item: any) => {
        const pId = item.product_id;
        const onHand = Number(item.on_hand || 0);
        const reorderLevel = Number(item.product?.reorder_level || 10);
        const existing = productOnHandMap.get(pId) || { totalOnHand: 0, reorderLevel };
        productOnHandMap.set(pId, {
          totalOnHand: existing.totalOnHand + onHand,
          reorderLevel,
        });
      });
    }

    let totalProductsInStock = 0;
    let lowStockItemsCount = 0;

    productOnHandMap.forEach(({ totalOnHand, reorderLevel }) => {
      if (totalOnHand > 0) {
        totalProductsInStock++;
        if (totalOnHand <= reorderLevel) {
          lowStockItemsCount++;
        }
      }
    });

    // Fetch active products count for out_of_stock calculation
    let productsQuery = supabase.from('products').select('id', { count: 'exact' }).eq('is_active', true);
    if (filters?.categoryId) {
      productsQuery = productsQuery.eq('category_id', filters.categoryId);
    }
    const { count: totalActiveProducts } = await productsQuery;

    const outOfStockItemsCount = Math.max(0, (totalActiveProducts || 0) - totalProductsInStock);

    // Pending Receipts
    let receiptsQuery = supabase
      .from('receipts')
      .select('id', { count: 'exact' })
      .in('status', ['draft', 'waiting', 'ready']);

    if (filters?.warehouseId) receiptsQuery = receiptsQuery.eq('warehouse_id', filters.warehouseId);
    if (filters?.status) receiptsQuery = receiptsQuery.eq('status', filters.status);
    if (dateThreshold) receiptsQuery = receiptsQuery.gte('created_at', dateThreshold);

    const { count: pendingReceiptsCount } = await receiptsQuery;

    // Pending Deliveries
    let deliveriesQuery = supabase
      .from('deliveries')
      .select('id', { count: 'exact' })
      .in('status', ['draft', 'waiting', 'ready']);

    if (filters?.warehouseId) deliveriesQuery = deliveriesQuery.eq('warehouse_id', filters.warehouseId);
    if (filters?.status) deliveriesQuery = deliveriesQuery.eq('status', filters.status);
    if (dateThreshold) deliveriesQuery = deliveriesQuery.gte('created_at', dateThreshold);

    const { count: pendingDeliveriesCount } = await deliveriesQuery;

    // Scheduled Transfers
    let transfersQuery = supabase
      .from('internal_transfers')
      .select('id', { count: 'exact' })
      .in('status', ['draft', 'waiting', 'ready']);

    if (filters?.warehouseId) {
      transfersQuery = transfersQuery.or(`source_warehouse_id.eq.${filters.warehouseId},destination_warehouse_id.eq.${filters.warehouseId}`);
    }
    if (filters?.status) transfersQuery = transfersQuery.eq('status', filters.status);
    if (dateThreshold) transfersQuery = transfersQuery.gte('created_at', dateThreshold);

    const { count: scheduledTransfersCount } = await transfersQuery;

    return {
      totalProductsInStock,
      lowStockItemsCount,
      outOfStockItemsCount,
      pendingReceiptsCount: pendingReceiptsCount || 0,
      pendingDeliveriesCount: pendingDeliveriesCount || 0,
      scheduledTransfersCount: scheduledTransfersCount || 0,
    };
  } catch (err) {
    console.error('Error fetching dashboard KPIs:', err);
    return {
      totalProductsInStock: 0,
      lowStockItemsCount: 0,
      outOfStockItemsCount: 0,
      pendingReceiptsCount: 0,
      pendingDeliveriesCount: 0,
      scheduledTransfersCount: 0,
    };
  }
}

/**
 * Fetch Operations Breakdown Cards (Receipts & Deliveries status pipeline)
 */
export async function fetchOperationsCards(filters?: DashboardFilterState): Promise<OperationsCardsData> {
  // 1. Try RPC function first
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_dashboard_operations', {
      p_warehouse_id: filters?.warehouseId || null,
      p_category_id: filters?.categoryId || null,
      p_status: filters?.status || null,
      p_date_range: filters?.dateRange || '7d',
    });

    if (!rpcErr && rpcData && typeof rpcData === 'object') {
      return rpcData as OperationsCardsData;
    }
  } catch {
    // Fall back to direct table queries
  }

  // 2. Direct Supabase Query Fallback
  try {
    const dateThreshold = getDateThreshold(filters?.dateRange);
    const nowIso = new Date().toISOString();

    // Receipts breakdown
    let recQuery = supabase.from('receipts').select('id, status, scheduled_date, created_at');
    if (filters?.warehouseId) recQuery = recQuery.eq('warehouse_id', filters.warehouseId);
    if (filters?.status) recQuery = recQuery.eq('status', filters.status);
    if (dateThreshold) recQuery = recQuery.gte('created_at', dateThreshold);

    const { data: recData } = await recQuery;

    let rToReceive = 0;
    let rLate = 0;
    let rWaiting = 0;

    if (recData) {
      recData.forEach((r: any) => {
        if (r.status === 'ready') rToReceive++;
        if (r.status === 'waiting') rWaiting++;
        const isCompleted = r.status === 'done' || r.status === 'canceled';
        const scheduledPast = r.scheduled_date ? r.scheduled_date < nowIso : false;
        if (!isCompleted && scheduledPast) {
          rLate++;
        }
      });
    }

    // Deliveries breakdown
    let delQuery = supabase.from('deliveries').select('id, status, scheduled_date, created_at');
    if (filters?.warehouseId) delQuery = delQuery.eq('warehouse_id', filters.warehouseId);
    if (filters?.status) delQuery = delQuery.eq('status', filters.status);
    if (dateThreshold) delQuery = delQuery.gte('created_at', dateThreshold);

    const { data: delData } = await delQuery;

    let dToDeliver = 0;
    let dLate = 0;
    let dWaiting = 0;

    if (delData) {
      delData.forEach((d: any) => {
        if (d.status === 'ready') dToDeliver++;
        if (d.status === 'waiting') dWaiting++;
        const isCompleted = d.status === 'done' || d.status === 'canceled';
        const scheduledPast = d.scheduled_date ? d.scheduled_date < nowIso : false;
        if (!isCompleted && scheduledPast) {
          dLate++;
        }
      });
    }

    return {
      receipts: {
        toReceive: rToReceive,
        late: rLate,
        waiting: rWaiting,
      },
      deliveries: {
        toDeliver: dToDeliver,
        late: dLate,
        waiting: dWaiting,
      },
    };
  } catch (err) {
    console.error('Error fetching operations cards:', err);
    return {
      receipts: { toReceive: 0, late: 0, waiting: 0 },
      deliveries: { toDeliver: 0, late: 0, waiting: 0 },
    };
  }
}

/**
 * Fetch Recent Stock Movements (Audit Trail)
 */
export async function fetchRecentStockMovements(limit = 5, filters?: DashboardFilterState): Promise<StockLedger[]> {
  try {
    let query = supabase
      .from('stock_ledger')
      .select('*, product:products!inner(name, sku, category_id), warehouse:warehouses(name), location:locations(name, code)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters?.warehouseId) query = query.eq('warehouse_id', filters.warehouseId);
    if (filters?.categoryId) query = query.eq('product.category_id', filters.categoryId);

    const dateThreshold = getDateThreshold(filters?.dateRange);
    if (dateThreshold) query = query.gte('created_at', dateThreshold);

    const { data, error } = await query;
    if (error || !data) return [];
    return data as StockLedger[];
  } catch (err) {
    console.error('Error fetching recent stock movements:', err);
    return [];
  }
}

/**
 * Fetch Recent Inbound Receipts
 */
export async function fetchRecentReceipts(limit = 5, filters?: DashboardFilterState): Promise<Receipt[]> {
  try {
    let query = supabase
      .from('receipts')
      .select('*, supplier:suppliers(name), warehouse:warehouses(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters?.warehouseId) query = query.eq('warehouse_id', filters.warehouseId);
    if (filters?.status) query = query.eq('status', filters.status);

    const dateThreshold = getDateThreshold(filters?.dateRange);
    if (dateThreshold) query = query.gte('created_at', dateThreshold);

    const { data, error } = await query;
    if (error || !data) return [];
    return data as Receipt[];
  } catch (err) {
    console.error('Error fetching recent receipts:', err);
    return [];
  }
}

/**
 * Fetch Recent Outbound Deliveries
 */
export async function fetchRecentDeliveries(limit = 5, filters?: DashboardFilterState): Promise<Delivery[]> {
  try {
    let query = supabase
      .from('deliveries')
      .select('*, warehouse:warehouses(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters?.warehouseId) query = query.eq('warehouse_id', filters.warehouseId);
    if (filters?.status) query = query.eq('status', filters.status);

    const dateThreshold = getDateThreshold(filters?.dateRange);
    if (dateThreshold) query = query.gte('created_at', dateThreshold);

    const { data, error } = await query;
    if (error || !data) return [];
    return data as Delivery[];
  } catch (err) {
    console.error('Error fetching recent deliveries:', err);
    return [];
  }
}

/**
 * Fetch Low Stock Alert Products
 */
export async function fetchLowStockProducts(filters?: DashboardFilterState): Promise<(Stock & { product: Product })[]> {
  try {
    let query = supabase
      .from('stock')
      .select('*, product:products!inner(*), warehouse:warehouses(name), location:locations(code)')
      .gt('on_hand', 0)
      .order('on_hand', { ascending: true })
      .limit(10);

    if (filters?.warehouseId) query = query.eq('warehouse_id', filters.warehouseId);
    if (filters?.categoryId) query = query.eq('product.category_id', filters.categoryId);

    const { data, error } = await query;
    if (error || !data) return [];

    // Filter items where on_hand <= reorder_level
    const lowStockOnly = (data as (Stock & { product: Product })[]).filter((st) => {
      const reorderLevel = st.product?.reorder_level || 10;
      return Number(st.on_hand) <= Number(reorderLevel);
    });

    return lowStockOnly.slice(0, 5);
  } catch (err) {
    console.error('Error fetching low stock products:', err);
    return [];
  }
}

/**
 * Fetch Dashboard Chart Analytics Data
 */
export async function fetchDashboardChartData(filters?: DashboardFilterState): Promise<DashboardChartData[]> {
  // 1. Try RPC function first
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_dashboard_chart_data', {
      p_warehouse_id: filters?.warehouseId || null,
      p_category_id: filters?.categoryId || null,
      p_date_range: filters?.dateRange || '7d',
    });

    if (!rpcErr && rpcData && Array.isArray(rpcData)) {
      return rpcData as DashboardChartData[];
    }
  } catch {
    // Fall back to client calculation
  }

  // 2. Direct Supabase Ledger Query Calculation
  try {
    const daysCount = filters?.dateRange === '30d' ? 30 : filters?.dateRange === '90d' ? 90 : 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (daysCount - 1));
    startDate.setHours(0, 0, 0, 0);

    let query = supabase
      .from('stock_ledger')
      .select('created_at, quantity_change, entry_type, product:products!inner(category_id)')
      .gte('created_at', startDate.toISOString());

    if (filters?.warehouseId) query = query.eq('warehouse_id', filters.warehouseId);
    if (filters?.categoryId) query = query.eq('product.category_id', filters.categoryId);

    const { data: ledgerData } = await query;

    // Generate date map
    const dateMap = new Map<string, { incoming: number; outgoing: number; totalMovement: number }>();
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateMap.set(dateKey, { incoming: 0, outgoing: 0, totalMovement: 0 });
    }

    if (ledgerData) {
      ledgerData.forEach((row: any) => {
        const rowDate = new Date(row.created_at);
        const dateKey = rowDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const existing = dateMap.get(dateKey);
        if (existing) {
          const qty = Math.abs(Number(row.quantity_change || 0));
          const isIncoming =
            ['receipt', 'transfer_in', 'initial'].includes(row.entry_type) ||
            (row.entry_type === 'adjustment' && row.quantity_change > 0);
          const isOutgoing =
            ['delivery', 'transfer_out'].includes(row.entry_type) ||
            (row.entry_type === 'adjustment' && row.quantity_change < 0);

          if (isIncoming) existing.incoming += qty;
          if (isOutgoing) existing.outgoing += qty;
          existing.totalMovement += qty;
        }
      });
    }

    const result: DashboardChartData[] = [];
    dateMap.forEach((val, key) => {
      result.push({
        date: key,
        incoming: val.incoming,
        outgoing: val.outgoing,
        totalMovement: val.totalMovement,
      });
    });

    return result;
  } catch (err) {
    console.error('Error calculating dashboard chart data:', err);
    return [];
  }
}
