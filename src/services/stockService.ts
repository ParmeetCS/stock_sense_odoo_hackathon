import { supabase } from '../lib/supabase';
import type {
  Stock,
  Product,
  Category,
  Warehouse,
  Location,
  StockLedger,
} from '../types';

export interface StockFilterOptions {
  search?: string;
  productId?: string;
  categoryId?: string;
  warehouseId?: string;
  locationId?: string;
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  sortBy?:
    | 'product_name'
    | 'sku'
    | 'cost_price'
    | 'on_hand'
    | 'reserved'
    | 'free_to_use'
    | 'warehouse'
    | 'location'
    | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface StockInventoryItem extends Stock {
  unit_cost: number;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  total_valuation: number;
}

export interface StockInventoryResponse {
  items: StockInventoryItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  kpis: {
    totalOnHand: number;
    totalReserved: number;
    totalFreeToUse: number;
    totalValuation: number;
    inStockCount: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
}

/**
 * Fetch Stock Inventory directly from Supabase inventory records
 */
export async function fetchStockInventory(
  options: StockFilterOptions = {}
): Promise<StockInventoryResponse> {
  const {
    search = '',
    productId = 'all',
    categoryId = 'all',
    warehouseId = 'all',
    locationId = 'all',
    stockStatus = 'all',
    sortBy = 'product_name',
    sortOrder = 'asc',
    page = 1,
    pageSize = 10,
  } = options;

  try {
    let query = supabase.from('stock').select(`
      *,
      product:products(
        id,
        sku,
        name,
        description,
        category_id,
        unit_of_measure,
        cost_price,
        sale_price,
        reorder_level,
        reorder_quantity,
        is_active,
        category:categories(id, name, code)
      ),
      warehouse:warehouses(id, code, name, address, is_active),
      location:locations(id, code, name, type, is_active)
    `);

    // Apply database-level filters
    if (productId && productId !== 'all') {
      query = query.eq('product_id', productId);
    }
    if (warehouseId && warehouseId !== 'all') {
      query = query.eq('warehouse_id', warehouseId);
    }
    if (locationId && locationId !== 'all') {
      query = query.eq('location_id', locationId);
    }

    const { data: rawStock, error } = await query;

    if (error) {
      console.error('Error fetching stock from Supabase:', error.message);
      throw new Error(error.message);
    }

    if (!rawStock) {
      return {
        items: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: page,
        kpis: {
          totalOnHand: 0,
          totalReserved: 0,
          totalFreeToUse: 0,
          totalValuation: 0,
          inStockCount: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
        },
      };
    }

    // Process and enrich stock items
    let processed: StockInventoryItem[] = rawStock.map((row: any) => {
      const onHand = Number(row.on_hand) || 0;
      const reserved = Number(row.reserved) || 0;
      const freeToUse = Math.max(0, onHand - reserved);
      const unitCost = Number(row.product?.cost_price) || 0;
      const reorderLevel = Number(row.product?.reorder_level) || 10;

      let status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
      if (onHand <= 0) {
        status = 'out_of_stock';
      } else if (onHand <= reorderLevel) {
        status = 'low_stock';
      }

      return {
        ...row,
        on_hand: onHand,
        reserved: reserved,
        free_to_use: freeToUse,
        unit_cost: unitCost,
        stock_status: status,
        total_valuation: onHand * unitCost,
      };
    });

    // Category Filter
    if (categoryId && categoryId !== 'all') {
      processed = processed.filter(
        (item) => item.product?.category_id === categoryId
      );
    }

    // Stock Status Filter
    if (stockStatus && stockStatus !== 'all') {
      processed = processed.filter((item) => item.stock_status === stockStatus);
    }

    // Full-Text Search
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      processed = processed.filter(
        (item) =>
          item.product?.name?.toLowerCase().includes(term) ||
          item.product?.sku?.toLowerCase().includes(term) ||
          item.warehouse?.name?.toLowerCase().includes(term) ||
          item.warehouse?.code?.toLowerCase().includes(term) ||
          item.location?.name?.toLowerCase().includes(term) ||
          item.location?.code?.toLowerCase().includes(term) ||
          item.product?.category?.name?.toLowerCase().includes(term)
      );
    }

    // Global KPIs before pagination
    let totalOnHand = 0;
    let totalReserved = 0;
    let totalFreeToUse = 0;
    let totalValuation = 0;
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    processed.forEach((item) => {
      totalOnHand += item.on_hand;
      totalReserved += item.reserved;
      totalFreeToUse += item.free_to_use;
      totalValuation += item.total_valuation;

      if (item.stock_status === 'in_stock') inStockCount++;
      else if (item.stock_status === 'low_stock') lowStockCount++;
      else if (item.stock_status === 'out_of_stock') outOfStockCount++;
    });

    // Sorting
    processed.sort((a, b) => {
      let aVal: any = 0;
      let bVal: any = 0;

      switch (sortBy) {
        case 'product_name':
          aVal = a.product?.name || '';
          bVal = b.product?.name || '';
          break;
        case 'sku':
          aVal = a.product?.sku || '';
          bVal = b.product?.sku || '';
          break;
        case 'cost_price':
          aVal = a.unit_cost;
          bVal = b.unit_cost;
          break;
        case 'on_hand':
          aVal = a.on_hand;
          bVal = b.on_hand;
          break;
        case 'reserved':
          aVal = a.reserved;
          bVal = b.reserved;
          break;
        case 'free_to_use':
          aVal = a.free_to_use;
          bVal = b.free_to_use;
          break;
        case 'warehouse':
          aVal = a.warehouse?.name || '';
          bVal = b.warehouse?.name || '';
          break;
        case 'location':
          aVal = a.location?.code || '';
          bVal = b.location?.code || '';
          break;
        case 'status':
          aVal = a.stock_status;
          bVal = b.stock_status;
          break;
        default:
          aVal = a.product?.name || '';
          bVal = b.product?.name || '';
      }

      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(String(bVal || ''));
        return sortOrder === 'asc' ? cmp : -cmp;
      }

      const numA = Number(aVal) || 0;
      const numB = Number(bVal) || 0;
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });

    // Pagination
    const totalCount = processed.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginated = processed.slice(startIndex, startIndex + pageSize);

    return {
      items: paginated,
      totalCount,
      totalPages,
      currentPage: page,
      kpis: {
        totalOnHand,
        totalReserved,
        totalFreeToUse,
        totalValuation,
        inStockCount,
        lowStockCount,
        outOfStockCount,
      },
    };
  } catch (err: any) {
    console.error('fetchStockInventory failed:', err);
    throw new Error(err.message || 'Failed to fetch live stock inventory');
  }
}

/**
 * Fetch Recent Stock Ledger Movements for a specific stock row
 */
export async function fetchStockRowLedger(
  productId: string,
  warehouseId: string,
  locationId?: string,
  limit = 8
): Promise<StockLedger[]> {
  try {
    let query = supabase
      .from('stock_ledger')
      .select(`
        *,
        user:profiles(full_name, email),
        warehouse:warehouses(code, name),
        location:locations(code, name)
      `)
      .eq('product_id', productId)
      .eq('warehouse_id', warehouseId);

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Error fetching stock row ledger:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('fetchStockRowLedger error:', err);
    return [];
  }
}

/**
 * Fetch all filter dropdown metadata (Products, Categories, Warehouses, Locations)
 */
export async function fetchStockFilterMetadata(): Promise<{
  products: Product[];
  categories: Category[];
  warehouses: Warehouse[];
  locations: Location[];
}> {
  try {
    const [prodRes, catRes, whRes, locRes] = await Promise.all([
      supabase.from('products').select('id, name, sku, category_id').order('name', { ascending: true }),
      supabase.from('categories').select('*').order('name', { ascending: true }),
      supabase.from('warehouses').select('*').eq('is_active', true).order('name', { ascending: true }),
      supabase.from('locations').select('*, warehouse:warehouses(id, code, name)').order('code', { ascending: true }),
    ]);

    return {
      products: prodRes.data || [],
      categories: catRes.data || [],
      warehouses: whRes.data || [],
      locations: locRes.data || [],
    };
  } catch (err) {
    console.error('Error fetching stock filter metadata:', err);
    return {
      products: [],
      categories: [],
      warehouses: [],
      locations: [],
    };
  }
}
