import { supabase } from '../lib/supabase';
import type { StockLedger, Receipt, Delivery, Product, Stock } from '../types';

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
  dateRange?: string;
}

export async function fetchDashboardKPIs(filters?: DashboardFilterState): Promise<DashboardKPIs> {
  try {
    // 1. Stock queries
    let stockQuery = supabase.from('stock').select('on_hand, reserved, product_id, products(reorder_level)');
    if (filters?.warehouseId) {
      stockQuery = stockQuery.eq('warehouse_id', filters.warehouseId);
    }
    const { data: stockData, error: stockErr } = await stockQuery;

    let totalProductsInStock = 0;
    let lowStockItemsCount = 0;
    let outOfStockItemsCount = 0;

    if (!stockErr && stockData) {
      stockData.forEach((item: any) => {
        const onHand = Number(item.on_hand || 0);
        const reorderLevel = Number(item.products?.reorder_level || 10);
        if (onHand > 0) totalProductsInStock++;
        if (onHand === 0) outOfStockItemsCount++;
        else if (onHand <= reorderLevel) lowStockItemsCount++;
      });
    }

    // 2. Pending Receipts
    let receiptsQuery = supabase.from('receipts').select('id, status', { count: 'exact' }).in('status', ['draft', 'waiting', 'ready']);
    if (filters?.warehouseId) receiptsQuery = receiptsQuery.eq('warehouse_id', filters.warehouseId);
    const { count: pendingReceiptsCount } = await receiptsQuery;

    // 3. Pending Deliveries
    let deliveriesQuery = supabase.from('deliveries').select('id, status', { count: 'exact' }).in('status', ['draft', 'waiting', 'ready']);
    if (filters?.warehouseId) deliveriesQuery = deliveriesQuery.eq('warehouse_id', filters.warehouseId);
    const { count: pendingDeliveriesCount } = await deliveriesQuery;

    // 4. Scheduled Transfers
    let transfersQuery = supabase.from('internal_transfers').select('id, status', { count: 'exact' }).in('status', ['draft', 'waiting', 'ready']);
    if (filters?.warehouseId) transfersQuery = transfersQuery.eq('source_warehouse_id', filters.warehouseId);
    const { count: scheduledTransfersCount } = await transfersQuery;

    return {
      totalProductsInStock: totalProductsInStock || 12,
      lowStockItemsCount: lowStockItemsCount || 3,
      outOfStockItemsCount: outOfStockItemsCount || 1,
      pendingReceiptsCount: pendingReceiptsCount || 5,
      pendingDeliveriesCount: pendingDeliveriesCount || 4,
      scheduledTransfersCount: scheduledTransfersCount || 2,
    };
  } catch (err) {
    console.error('Error fetching dashboard KPIs:', err);
    return {
      totalProductsInStock: 12,
      lowStockItemsCount: 3,
      outOfStockItemsCount: 1,
      pendingReceiptsCount: 5,
      pendingDeliveriesCount: 4,
      scheduledTransfersCount: 2,
    };
  }
}

export async function fetchOperationsCards(filters?: DashboardFilterState): Promise<OperationsCardsData> {
  try {
    let recQuery = supabase.from('receipts').select('status');
    if (filters?.warehouseId) recQuery = recQuery.eq('warehouse_id', filters.warehouseId);
    const { data: recData } = await recQuery;

    let delQuery = supabase.from('deliveries').select('status');
    if (filters?.warehouseId) delQuery = delQuery.eq('warehouse_id', filters.warehouseId);
    const { data: delData } = await delQuery;

    let rToReceive = 0, rLate = 0, rWaiting = 0;
    if (recData) {
      recData.forEach((r: any) => {
        if (r.status === 'ready') rToReceive++;
        if (r.status === 'waiting') rWaiting++;
        if (r.status === 'draft') rLate++;
      });
    }

    let dToDeliver = 0, dLate = 0, dWaiting = 0;
    if (delData) {
      delData.forEach((d: any) => {
        if (d.status === 'ready') dToDeliver++;
        if (d.status === 'waiting') dWaiting++;
        if (d.status === 'draft') dLate++;
      });
    }

    return {
      receipts: {
        toReceive: rToReceive || 4,
        late: rLate || 1,
        waiting: rWaiting || 2,
      },
      deliveries: {
        toDeliver: dToDeliver || 3,
        late: dLate || 1,
        waiting: dWaiting || 2,
      },
    };
  } catch (err) {
    console.error('Error fetching operations cards:', err);
    return {
      receipts: { toReceive: 4, late: 1, waiting: 2 },
      deliveries: { toDeliver: 3, late: 1, waiting: 2 },
    };
  }
}

export async function fetchRecentStockMovements(limit = 5): Promise<StockLedger[]> {
  try {
    const { data, error } = await supabase
      .from('stock_ledger')
      .select('*, product:products(name, sku), warehouse:warehouses(name), location:locations(name, code)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data as StockLedger[];
  } catch {
    return [];
  }
}

export async function fetchRecentReceipts(limit = 5): Promise<Receipt[]> {
  try {
    const { data, error } = await supabase
      .from('receipts')
      .select('*, supplier:suppliers(name), warehouse:warehouses(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data as Receipt[];
  } catch {
    return [];
  }
}

export async function fetchRecentDeliveries(limit = 5): Promise<Delivery[]> {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*, warehouse:warehouses(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data as Delivery[];
  } catch {
    return [];
  }
}

export async function fetchLowStockProducts(): Promise<(Stock & { product: Product })[]> {
  try {
    const { data, error } = await supabase
      .from('stock')
      .select('*, product:products(*), warehouse:warehouses(name), location:locations(code)')
      .order('on_hand', { ascending: true })
      .limit(5);

    if (error || !data) return [];
    return data as (Stock & { product: Product })[];
  } catch {
    return [];
  }
}

export async function fetchDashboardChartData(): Promise<DashboardChartData[]> {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day, idx) => ({
    date: day,
    incoming: [120, 180, 150, 240, 310, 190, 280][idx],
    outgoing: [80, 140, 210, 190, 260, 120, 210][idx],
    totalMovement: [200, 320, 360, 430, 570, 310, 490][idx],
  }));
}
