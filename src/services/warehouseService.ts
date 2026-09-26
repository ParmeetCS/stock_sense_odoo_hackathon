import { supabase } from '../lib/supabase';
import type {
  Warehouse,
  Location,
  CreateWarehouseInput,
  UpdateWarehouseInput,
  CreateLocationInput,
  UpdateLocationInput,
  Stock,
} from '../types';

export interface WarehouseFilterOptions {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  sortBy?: 'name' | 'code' | 'address' | 'location_count' | 'stock_quantity' | 'is_active' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface LocationFilterOptions {
  search?: string;
  warehouseId?: string;
  status?: 'all' | 'active' | 'inactive';
  sortBy?: 'name' | 'code' | 'warehouse' | 'stock_quantity' | 'is_active' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/* ==========================================================================
   WAREHOUSE SERVICES
   ========================================================================== */

/**
 * Check if warehouse short code is unique across database
 */
export async function checkWarehouseCodeUnique(code: string, excludeId?: string): Promise<boolean> {
  try {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return false;

    let query = supabase.from('warehouses').select('id', { count: 'exact', head: true }).ilike('code', trimmed);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { count, error } = await query;
    if (error) {
      console.warn('Warehouse code uniqueness check error:', error.message);
      return true;
    }
    return (count ?? 0) === 0;
  } catch {
    return true;
  }
}

/**
 * Fetch Warehouses with computed location counts and aggregate stock quantity
 */
export async function fetchWarehousesList(options: WarehouseFilterOptions = {}): Promise<{
  warehouses: Warehouse[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}> {
  const {
    search = '',
    status = 'all',
    sortBy = 'name',
    sortOrder = 'asc',
    page = 1,
    pageSize = 10,
  } = options;

  try {
    // 1. Fetch Warehouses with nested locations and stock
    const { data: rawWarehouses, error } = await supabase
      .from('warehouses')
      .select(`
        *,
        locations:locations(id, code, name, is_active),
        stock:stock(id, on_hand, reserved, free_to_use)
      `);

    if (error) {
      console.error('Error fetching warehouses:', error.message);
      throw new Error(error.message);
    }

    if (!rawWarehouses) {
      return { warehouses: [], totalCount: 0, totalPages: 0, currentPage: page };
    }

    // 2. Compute location count and stock quantities
    let processed: Warehouse[] = rawWarehouses.map((wh: any) => {
      const locs: Location[] = wh.locations || [];
      const stockList: Stock[] = wh.stock || [];

      let totalStock = 0;
      stockList.forEach((s) => {
        totalStock += Number(s.on_hand) || 0;
      });

      return {
        ...wh,
        is_active: wh.is_active ?? true,
        location_count: locs.length,
        stock_quantity: totalStock,
        locations: locs,
      };
    });

    // 3. Search Filter
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      processed = processed.filter(
        (w) =>
          w.name.toLowerCase().includes(term) ||
          w.code.toLowerCase().includes(term) ||
          (w.address && w.address.toLowerCase().includes(term))
      );
    }

    // 4. Status Filter
    if (status !== 'all') {
      if (status === 'active') {
        processed = processed.filter((w) => w.is_active);
      } else if (status === 'inactive') {
        processed = processed.filter((w) => !w.is_active);
      }
    }

    // 5. Sorting
    processed.sort((a, b) => {
      let aVal: any = a[sortBy as keyof Warehouse];
      let bVal: any = b[sortBy as keyof Warehouse];

      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(String(bVal || ''));
        return sortOrder === 'asc' ? cmp : -cmp;
      }

      const numA = Number(aVal) || 0;
      const numB = Number(bVal) || 0;
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });

    // 6. Pagination
    const totalCount = processed.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginated = processed.slice(startIndex, startIndex + pageSize);

    return {
      warehouses: paginated,
      totalCount,
      totalPages,
      currentPage: page,
    };
  } catch (err: any) {
    console.error('fetchWarehousesList failed:', err);
    throw new Error(err.message || 'Failed to fetch warehouses');
  }
}

/**
 * Fetch Single Warehouse by ID with detailed locations and stock
 */
export async function fetchWarehouseById(id: string): Promise<{
  warehouse: Warehouse;
  locations: (Location & { stock_quantity: number })[];
  stocks: Stock[];
}> {
  try {
    const { data: wh, error: whError } = await supabase
      .from('warehouses')
      .select('*')
      .eq('id', id)
      .single();

    if (whError || !wh) {
      throw new Error(whError?.message || 'Warehouse not found');
    }

    // Fetch locations for this warehouse
    const { data: locData, error: locError } = await supabase
      .from('locations')
      .select('*')
      .eq('warehouse_id', id)
      .order('code', { ascending: true });

    if (locError) {
      console.warn('Error fetching warehouse locations:', locError.message);
    }

    // Fetch stock for this warehouse
    const { data: stockData, error: stockError } = await supabase
      .from('stock')
      .select('*, product:products(*), location:locations(*)')
      .eq('warehouse_id', id);

    if (stockError) {
      console.warn('Error fetching warehouse stock:', stockError.message);
    }

    const rawStocks: Stock[] = stockData || [];
    let totalOnHand = 0;
    const locationStockMap: Record<string, number> = {};

    rawStocks.forEach((s) => {
      const qty = Number(s.on_hand) || 0;
      totalOnHand += qty;
      if (s.location_id) {
        locationStockMap[s.location_id] = (locationStockMap[s.location_id] || 0) + qty;
      }
    });

    const detailedLocations = (locData || []).map((l: any) => ({
      ...l,
      is_active: l.is_active ?? true,
      stock_quantity: locationStockMap[l.id] || 0,
    }));

    const warehouse: Warehouse = {
      ...wh,
      is_active: wh.is_active ?? true,
      location_count: detailedLocations.length,
      stock_quantity: totalOnHand,
      locations: detailedLocations,
      stocks: rawStocks,
    };

    return {
      warehouse,
      locations: detailedLocations,
      stocks: rawStocks,
    };
  } catch (err: any) {
    console.error('fetchWarehouseById failed:', err);
    throw new Error(err.message || 'Failed to load warehouse details');
  }
}

/**
 * Create Warehouse
 */
export async function createWarehouse(input: CreateWarehouseInput): Promise<Warehouse> {
  const cleanCode = input.code.trim().toUpperCase();

  if (!input.name.trim()) throw new Error('Warehouse name is required.');
  if (!cleanCode) throw new Error('Warehouse short code is required.');

  const isUnique = await checkWarehouseCodeUnique(cleanCode);
  if (!isUnique) {
    throw new Error(`Warehouse short code "${cleanCode}" is already in use.`);
  }

  const { data, error } = await supabase
    .from('warehouses')
    .insert([
      {
        name: input.name.trim(),
        code: cleanCode,
        address: input.address?.trim() || null,
        is_active: input.is_active !== undefined ? input.is_active : true,
      },
    ])
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create warehouse.');
  }

  return data;
}

/**
 * Update Warehouse
 */
export async function updateWarehouse(id: string, input: UpdateWarehouseInput): Promise<Warehouse> {
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    if (!input.name.trim()) throw new Error('Warehouse name cannot be empty.');
    payload.name = input.name.trim();
  }

  if (input.code !== undefined) {
    const cleanCode = input.code.trim().toUpperCase();
    if (!cleanCode) throw new Error('Warehouse short code cannot be empty.');
    const isUnique = await checkWarehouseCodeUnique(cleanCode, id);
    if (!isUnique) {
      throw new Error(`Warehouse short code "${cleanCode}" is already in use.`);
    }
    payload.code = cleanCode;
  }

  if (input.address !== undefined) {
    payload.address = input.address?.trim() || null;
  }

  if (input.is_active !== undefined) {
    payload.is_active = input.is_active;
  }

  const { data, error } = await supabase
    .from('warehouses')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update warehouse.');
  }

  return data;
}

/**
 * Check if a warehouse can be deleted or if it has inventory/transaction relationships
 */
export async function checkWarehouseCanDelete(id: string): Promise<{
  canDelete: boolean;
  reason?: string;
  stockQuantity: number;
  locationCount: number;
}> {
  try {
    // 1. Check stock in this warehouse
    const { data: stockData } = await supabase
      .from('stock')
      .select('on_hand')
      .eq('warehouse_id', id);

    let totalStock = 0;
    if (stockData) {
      stockData.forEach((s) => (totalStock += Number(s.on_hand) || 0));
    }

    if (totalStock > 0) {
      return {
        canDelete: false,
        reason: `Warehouse contains ${totalStock.toLocaleString()} active units of inventory on hand.`,
        stockQuantity: totalStock,
        locationCount: 0,
      };
    }

    // 2. Check locations
    const { count: locCount } = await supabase
      .from('locations')
      .select('id', { count: 'exact', head: true })
      .eq('warehouse_id', id);

    // 3. Check receipts/deliveries/transfers
    const { count: receiptsCount } = await supabase
      .from('receipts')
      .select('id', { count: 'exact', head: true })
      .eq('warehouse_id', id);

    const { count: deliveriesCount } = await supabase
      .from('deliveries')
      .select('id', { count: 'exact', head: true })
      .eq('warehouse_id', id);

    if ((receiptsCount ?? 0) > 0 || (deliveriesCount ?? 0) > 0) {
      return {
        canDelete: false,
        reason: `Warehouse is referenced in ${ (receiptsCount || 0) + (deliveriesCount || 0) } historical operations orders.`,
        stockQuantity: totalStock,
        locationCount: locCount ?? 0,
      };
    }

    return {
      canDelete: true,
      stockQuantity: totalStock,
      locationCount: locCount ?? 0,
    };
  } catch (err: any) {
    return {
      canDelete: false,
      reason: err.message,
      stockQuantity: 0,
      locationCount: 0,
    };
  }
}

/**
 * Delete Warehouse
 */
export async function deleteWarehouse(id: string): Promise<void> {
  const check = await checkWarehouseCanDelete(id);
  if (!check.canDelete) {
    throw new Error(
      `Cannot delete warehouse: ${check.reason} Please de-activate the warehouse instead.`
    );
  }

  const { error } = await supabase.from('warehouses').delete().eq('id', id);
  if (error) {
    throw new Error(error.message || 'Failed to delete warehouse.');
  }
}

/* ==========================================================================
   LOCATION SERVICES
   ========================================================================== */

/**
 * Check Location Code Uniqueness within a Warehouse
 * Rule: Location codes must be unique within a warehouse.
 */
export async function checkLocationCodeUnique(
  warehouseId: string,
  code: string,
  excludeId?: string
): Promise<boolean> {
  try {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || !warehouseId) return false;

    let query = supabase
      .from('locations')
      .select('id', { count: 'exact', head: true })
      .eq('warehouse_id', warehouseId)
      .ilike('code', trimmed);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { count, error } = await query;
    if (error) {
      console.warn('Location code check warning:', error.message);
      return true;
    }
    return (count ?? 0) === 0;
  } catch {
    return true;
  }
}

/**
 * Fetch Locations List with Warehouse join and computed stock quantity
 */
export async function fetchLocationsList(options: LocationFilterOptions = {}): Promise<{
  locations: Location[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}> {
  const {
    search = '',
    warehouseId = 'all',
    status = 'all',
    sortBy = 'name',
    sortOrder = 'asc',
    page = 1,
    pageSize = 10,
  } = options;

  try {
    let query = supabase
      .from('locations')
      .select(`
        *,
        warehouse:warehouses(id, code, name, is_active),
        stock:stock(id, on_hand, reserved, free_to_use)
      `);

    if (warehouseId && warehouseId !== 'all') {
      query = query.eq('warehouse_id', warehouseId);
    }

    const { data: rawLocations, error } = await query;

    if (error) {
      console.error('Error fetching locations:', error.message);
      throw new Error(error.message);
    }

    if (!rawLocations) {
      return { locations: [], totalCount: 0, totalPages: 0, currentPage: page };
    }

    // Process Stock Quantity
    let processed: Location[] = rawLocations.map((loc: any) => {
      const stockList: Stock[] = loc.stock || [];
      let totalStock = 0;
      stockList.forEach((s) => {
        totalStock += Number(s.on_hand) || 0;
      });

      return {
        ...loc,
        is_active: loc.is_active ?? true,
        stock_quantity: totalStock,
      };
    });

    // Search Filter
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      processed = processed.filter(
        (l) =>
          l.name.toLowerCase().includes(term) ||
          l.code.toLowerCase().includes(term) ||
          l.warehouse?.name?.toLowerCase().includes(term) ||
          l.warehouse?.code?.toLowerCase().includes(term)
      );
    }

    // Status Filter
    if (status !== 'all') {
      if (status === 'active') {
        processed = processed.filter((l) => l.is_active);
      } else if (status === 'inactive') {
        processed = processed.filter((l) => !l.is_active);
      }
    }

    // Sorting
    processed.sort((a, b) => {
      let aVal: any = a[sortBy as keyof Location];
      let bVal: any = b[sortBy as keyof Location];

      if (sortBy === 'warehouse') {
        aVal = a.warehouse?.name || '';
        bVal = b.warehouse?.name || '';
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
      locations: paginated,
      totalCount,
      totalPages,
      currentPage: page,
    };
  } catch (err: any) {
    console.error('fetchLocationsList failed:', err);
    throw new Error(err.message || 'Failed to fetch locations');
  }
}

/**
 * Fetch Single Location by ID with stock inventory
 */
export async function fetchLocationById(id: string): Promise<{
  location: Location;
  stocks: Stock[];
}> {
  try {
    const { data: loc, error: locError } = await supabase
      .from('locations')
      .select('*, warehouse:warehouses(*)')
      .eq('id', id)
      .single();

    if (locError || !loc) {
      throw new Error(locError?.message || 'Location not found');
    }

    // Fetch stock in this location
    const { data: stockData, error: stockError } = await supabase
      .from('stock')
      .select('*, product:products(*)')
      .eq('location_id', id);

    if (stockError) {
      console.warn('Error fetching location stock:', stockError.message);
    }

    const rawStocks: Stock[] = stockData || [];
    let totalStock = 0;
    rawStocks.forEach((s) => {
      totalStock += Number(s.on_hand) || 0;
    });

    const location: Location = {
      ...loc,
      is_active: loc.is_active ?? true,
      stock_quantity: totalStock,
      stocks: rawStocks,
    };

    return {
      location,
      stocks: rawStocks,
    };
  } catch (err: any) {
    console.error('fetchLocationById failed:', err);
    throw new Error(err.message || 'Failed to load location details');
  }
}

/**
 * Create Location
 */
export async function createLocation(input: CreateLocationInput): Promise<Location> {
  const cleanCode = input.code.trim().toUpperCase();

  if (!input.name.trim()) throw new Error('Location name is required.');
  if (!cleanCode) throw new Error('Location short code is required.');
  if (!input.warehouse_id) throw new Error('A location must belong to a warehouse.');

  // Validate code uniqueness within the warehouse
  const isUnique = await checkLocationCodeUnique(input.warehouse_id, cleanCode);
  if (!isUnique) {
    throw new Error(`Location code "${cleanCode}" is already in use within this warehouse.`);
  }

  const { data, error } = await supabase
    .from('locations')
    .insert([
      {
        warehouse_id: input.warehouse_id,
        name: input.name.trim(),
        code: cleanCode,
        type: input.type?.trim() || 'internal',
        is_active: input.is_active !== undefined ? input.is_active : true,
      },
    ])
    .select('*, warehouse:warehouses(*)')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create location.');
  }

  return {
    ...data,
    is_active: data.is_active ?? true,
  };
}

/**
 * Update Location
 */
export async function updateLocation(id: string, input: UpdateLocationInput): Promise<Location> {
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  // Get current location if needed for warehouse_id
  let targetWarehouseId = input.warehouse_id;
  if (!targetWarehouseId && input.code) {
    const { data: current } = await supabase.from('locations').select('warehouse_id').eq('id', id).single();
    targetWarehouseId = current?.warehouse_id;
  }

  if (input.warehouse_id !== undefined) {
    payload.warehouse_id = input.warehouse_id;
  }

  if (input.name !== undefined) {
    if (!input.name.trim()) throw new Error('Location name cannot be empty.');
    payload.name = input.name.trim();
  }

  if (input.code !== undefined) {
    const cleanCode = input.code.trim().toUpperCase();
    if (!cleanCode) throw new Error('Location short code cannot be empty.');
    if (targetWarehouseId) {
      const isUnique = await checkLocationCodeUnique(targetWarehouseId, cleanCode, id);
      if (!isUnique) {
        throw new Error(`Location code "${cleanCode}" is already in use in this warehouse.`);
      }
    }
    payload.code = cleanCode;
  }

  if (input.type !== undefined) {
    payload.type = input.type.trim() || 'internal';
  }

  if (input.is_active !== undefined) {
    payload.is_active = input.is_active;
  }

  const { data, error } = await supabase
    .from('locations')
    .update(payload)
    .eq('id', id)
    .select('*, warehouse:warehouses(*)')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update location.');
  }

  return {
    ...data,
    is_active: data.is_active ?? true,
  };
}

/**
 * Check if a Location can be safely deleted
 */
export async function checkLocationCanDelete(id: string): Promise<{
  canDelete: boolean;
  reason?: string;
  stockQuantity: number;
}> {
  try {
    const { data: stockData } = await supabase
      .from('stock')
      .select('on_hand')
      .eq('location_id', id);

    let totalStock = 0;
    if (stockData) {
      stockData.forEach((s) => (totalStock += Number(s.on_hand) || 0));
    }

    if (totalStock > 0) {
      return {
        canDelete: false,
        reason: `Location currently contains ${totalStock.toLocaleString()} units of physical stock on hand.`,
        stockQuantity: totalStock,
      };
    }

    // Check receipts / deliveries destination / source
    const { count: receiptCount } = await supabase
      .from('receipts')
      .select('id', { count: 'exact', head: true })
      .eq('destination_location_id', id);

    const { count: deliveryCount } = await supabase
      .from('deliveries')
      .select('id', { count: 'exact', head: true })
      .eq('source_location_id', id);

    if ((receiptCount ?? 0) > 0 || (deliveryCount ?? 0) > 0) {
      return {
        canDelete: false,
        reason: `Location is linked to historical inbound or outbound operations orders.`,
        stockQuantity: totalStock,
      };
    }

    return {
      canDelete: true,
      stockQuantity: totalStock,
    };
  } catch (err: any) {
    return {
      canDelete: false,
      reason: err.message,
      stockQuantity: 0,
    };
  }
}

/**
 * Delete Location
 */
export async function deleteLocation(id: string): Promise<void> {
  const check = await checkLocationCanDelete(id);
  if (!check.canDelete) {
    throw new Error(`Cannot delete location: ${check.reason} Please de-activate the location instead.`);
  }

  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) {
    throw new Error(error.message || 'Failed to delete location.');
  }
}
