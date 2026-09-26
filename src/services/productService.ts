import { supabase } from '../lib/supabase';
import type {
  Product,
  Category,
  Warehouse,
  Location,
  Stock,
  StockLedger,
  CreateProductInput,
  UpdateProductInput,
} from '../types';

export interface ProductFilterOptions {
  search?: string;
  sku?: string;
  categoryId?: string;
  warehouseId?: string;
  locationId?: string;
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'active' | 'inactive';
  sortBy?: 'name' | 'sku' | 'category' | 'on_hand' | 'reserved' | 'free_to_use' | 'reorder_level' | 'created_at' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ProductsResponse {
  products: Product[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Fetch all categories for filter dropdowns and creation
 */
export async function fetchCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Error fetching categories:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Error fetching categories:', err);
    return [];
  }
}

/**
 * Quick Category Creation
 */
export async function createCategory(input: { name: string; code?: string; description?: string }): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert([
      {
        name: input.name.trim(),
        code: input.code?.trim().toUpperCase() || input.name.substring(0, 4).toUpperCase(),
        description: input.description?.trim() || null,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to create category');
  }
  return data;
}

/**
 * Fetch all warehouses
 */
export async function fetchWarehouses(): Promise<Warehouse[]> {
  try {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.warn('Error fetching warehouses:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Error fetching warehouses:', err);
    return [];
  }
}

/**
 * Fetch locations (optionally filtered by warehouse)
 */
export async function fetchLocations(warehouseId?: string): Promise<Location[]> {
  try {
    let query = supabase.from('locations').select('*, warehouse:warehouses(id, code, name)').order('name', { ascending: true });
    if (warehouseId) {
      query = query.eq('warehouse_id', warehouseId);
    }
    const { data, error } = await query;

    if (error) {
      console.warn('Error fetching locations:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Error fetching locations:', err);
    return [];
  }
}

/**
 * Check SKU Uniqueness in database
 */
export async function checkSkuUnique(sku: string, excludeProductId?: string): Promise<boolean> {
  try {
    const trimmed = sku.trim().toUpperCase();
    if (!trimmed) return false;

    let query = supabase.from('products').select('id', { count: 'exact', head: true }).ilike('sku', trimmed);

    if (excludeProductId) {
      query = query.neq('id', excludeProductId);
    }

    const { count, error } = await query;
    if (error) {
      console.warn('SKU uniqueness check warning:', error.message);
      return true;
    }
    return (count ?? 0) === 0;
  } catch {
    return true;
  }
}

/**
 * Fetch Products with real-time stock computation, filtering, sorting, and pagination
 */
export async function fetchProducts(options: ProductFilterOptions = {}): Promise<ProductsResponse> {
  const {
    search = '',
    sku = '',
    categoryId = '',
    warehouseId = '',
    locationId = '',
    stockStatus = 'all',
    sortBy = 'created_at',
    sortOrder = 'desc',
    page = 1,
    pageSize = 10,
  } = options;

  try {
    // 1. Fetch products with category and stock joined
    let query = supabase
      .from('products')
      .select(
        `
        *,
        category:categories(*),
        stock(
          id,
          product_id,
          warehouse_id,
          location_id,
          on_hand,
          reserved,
          free_to_use,
          warehouse:warehouses(id, code, name),
          location:locations(id, code, name)
        )
      `
      );

    // Filter by category if selected
    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }

    const { data: rawProducts, error } = await query;

    if (error) {
      console.error('Error fetching products from Supabase:', error.message);
      throw new Error(error.message);
    }

    if (!rawProducts) {
      return { products: [], totalCount: 0, totalPages: 0, currentPage: page };
    }

    // 2. Process and aggregate stock metrics per product
    let processedProducts: Product[] = rawProducts.map((p: any) => {
      const stockList: Stock[] = p.stock || [];
      
      // Calculate total on_hand, reserved, free_to_use
      let totalOnHand = 0;
      let totalReserved = 0;
      const warehouseNamesSet = new Set<string>();
      const locationNamesSet = new Set<string>();

      stockList.forEach((s) => {
        const onH = Number(s.on_hand) || 0;
        const res = Number(s.reserved) || 0;
        totalOnHand += onH;
        totalReserved += res;

        if (s.warehouse?.name) {
          warehouseNamesSet.add(s.warehouse.name);
        }
        if (s.location?.code || s.location?.name) {
          locationNamesSet.add(s.location?.code || s.location?.name || '');
        }
      });

      const totalFreeToUse = Math.max(0, totalOnHand - totalReserved);
      const reorderLevel = Number(p.reorder_level) || 0;

      let status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
      if (totalOnHand <= 0) {
        status = 'out_of_stock';
      } else if (totalOnHand <= reorderLevel) {
        status = 'low_stock';
      }

      const warehouseName = Array.from(warehouseNamesSet).join(', ') || 'Unassigned';
      const locationName = Array.from(locationNamesSet).join(', ') || 'Unassigned';

      return {
        ...p,
        cost_price: Number(p.cost_price) || 0,
        sale_price: Number(p.sale_price) || 0,
        reorder_level: Number(p.reorder_level) || 0,
        reorder_quantity: Number(p.reorder_quantity) || 0,
        on_hand: totalOnHand,
        reserved: totalReserved,
        free_to_use: totalFreeToUse,
        warehouse_name: warehouseName,
        location_name: locationName,
        stock_status: status,
        stocks: stockList,
      };
    });

    // 3. Apply Search & Specific Filters
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      processedProducts = processedProducts.filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.sku?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term) ||
          p.category?.name?.toLowerCase().includes(term)
      );
    }

    if (sku.trim()) {
      const skuTerm = sku.trim().toLowerCase();
      processedProducts = processedProducts.filter((p) =>
        p.sku?.toLowerCase().includes(skuTerm)
      );
    }

    if (warehouseId && warehouseId !== 'all') {
      processedProducts = processedProducts.filter((p) =>
        p.stocks?.some((s) => s.warehouse_id === warehouseId)
      );
    }

    if (locationId && locationId !== 'all') {
      processedProducts = processedProducts.filter((p) =>
        p.stocks?.some((s) => s.location_id === locationId)
      );
    }

    if (stockStatus && stockStatus !== 'all') {
      if (stockStatus === 'active') {
        processedProducts = processedProducts.filter((p) => p.is_active);
      } else if (stockStatus === 'inactive') {
        processedProducts = processedProducts.filter((p) => !p.is_active);
      } else {
        processedProducts = processedProducts.filter((p) => p.stock_status === stockStatus);
      }
    }

    // 4. Sorting
    processedProducts.sort((a, b) => {
      let aVal: any = a[sortBy as keyof Product];
      let bVal: any = b[sortBy as keyof Product];

      if (sortBy === 'category') {
        aVal = a.category?.name || '';
        bVal = b.category?.name || '';
      } else if (sortBy === 'status') {
        aVal = a.stock_status || '';
        bVal = b.stock_status || '';
      }

      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(String(bVal || ''));
        return sortOrder === 'asc' ? cmp : -cmp;
      }

      const numA = Number(aVal) || 0;
      const numB = Number(bVal) || 0;
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });

    // 5. Pagination
    const totalCount = processedProducts.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedProducts = processedProducts.slice(startIndex, startIndex + pageSize);

    return {
      products: paginatedProducts,
      totalCount,
      totalPages,
      currentPage: page,
    };
  } catch (err: any) {
    console.error('fetchProducts failed:', err);
    throw new Error(err.message || 'Failed to fetch products');
  }
}

/**
 * Fetch Single Product Details by ID (including all stock locations and ledger history)
 */
export async function fetchProductById(id: string): Promise<{
  product: Product;
  stocks: Stock[];
  ledger: StockLedger[];
}> {
  try {
    // 1. Fetch Product with Category
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('id', id)
      .single();

    if (productError || !productData) {
      throw new Error(productError?.message || 'Product not found');
    }

    // 2. Fetch all stock balances for this product
    const { data: stockData, error: stockError } = await supabase
      .from('stock')
      .select('*, warehouse:warehouses(id, code, name), location:locations(id, code, name)')
      .eq('product_id', id);

    if (stockError) {
      console.warn('Error fetching product stock:', stockError.message);
    }

    const stocks: Stock[] = stockData || [];

    // Aggregate totals
    let totalOnHand = 0;
    let totalReserved = 0;
    stocks.forEach((s) => {
      totalOnHand += Number(s.on_hand) || 0;
      totalReserved += Number(s.reserved) || 0;
    });
    const totalFreeToUse = Math.max(0, totalOnHand - totalReserved);
    const reorderLevel = Number(productData.reorder_level) || 0;

    let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
    if (totalOnHand <= 0) {
      stockStatus = 'out_of_stock';
    } else if (totalOnHand <= reorderLevel) {
      stockStatus = 'low_stock';
    }

    // 3. Fetch stock ledger / audit trail history for this product
    const { data: ledgerData, error: ledgerError } = await supabase
      .from('stock_ledger')
      .select('*, warehouse:warehouses(code, name), location:locations(code, name), user:profiles(full_name, email)')
      .eq('product_id', id)
      .order('created_at', { ascending: false });

    if (ledgerError) {
      console.warn('Error fetching product stock ledger:', ledgerError.message);
    }

    const product: Product = {
      ...productData,
      cost_price: Number(productData.cost_price) || 0,
      sale_price: Number(productData.sale_price) || 0,
      reorder_level: Number(productData.reorder_level) || 0,
      reorder_quantity: Number(productData.reorder_quantity) || 0,
      on_hand: totalOnHand,
      reserved: totalReserved,
      free_to_use: totalFreeToUse,
      stock_status: stockStatus,
      stocks,
    };

    return {
      product,
      stocks,
      ledger: ledgerData || [],
    };
  } catch (err: any) {
    console.error('fetchProductById failed:', err);
    throw new Error(err.message || 'Failed to load product details');
  }
}

/**
 * Create Product with optional Initial Stock Transaction
 * Initial stock MUST use the inventory transaction mechanism, never direct client-side stock editing.
 */
export async function createProduct(input: CreateProductInput, userId?: string): Promise<Product> {
  const cleanSku = input.sku.trim().toUpperCase();

  // 1. SKU uniqueness validation
  const isUnique = await checkSkuUnique(cleanSku);
  if (!isUnique) {
    throw new Error(`SKU "${cleanSku}" is already in use. Please provide a unique SKU.`);
  }

  if (!input.name.trim()) {
    throw new Error('Product name is required.');
  }

  // 2. Insert Product
  const { data: newProduct, error: insertError } = await supabase
    .from('products')
    .insert([
      {
        name: input.name.trim(),
        sku: cleanSku,
        category_id: input.category_id || null,
        unit_of_measure: input.unit_of_measure?.trim() || 'Units',
        cost_price: Math.max(0, Number(input.cost_price) || 0),
        sale_price: Math.max(0, Number(input.sale_price) || 0),
        reorder_level: Math.max(0, Number(input.reorder_level) || 0),
        reorder_quantity: Math.max(0, Number(input.reorder_quantity) || 0),
        is_active: input.is_active !== undefined ? input.is_active : true,
        description: input.description?.trim() || null,
      },
    ])
    .select('*, category:categories(*)')
    .single();

  if (insertError || !newProduct) {
    throw new Error(insertError?.message || 'Failed to create product.');
  }

  // 3. Process Initial Stock Transaction if specified
  if (
    input.initial_stock &&
    input.initial_stock.quantity > 0 &&
    input.initial_stock.warehouse_id &&
    input.initial_stock.location_id
  ) {
    const qty = Number(input.initial_stock.quantity);
    const whId = input.initial_stock.warehouse_id;
    const locId = input.initial_stock.location_id;

    try {
      // First attempt database stored procedure
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('record_initial_inventory', {
        p_product_id: newProduct.id,
        p_warehouse_id: whId,
        p_location_id: locId,
        p_quantity: qty,
        p_user_id: userId || null,
      });

      if (rpcErr || !rpcRes?.success) {
        // Fallback transaction: upsert stock record & record stock ledger
        const { error: stockUpsertErr } = await supabase
          .from('stock')
          .upsert(
            [
              {
                product_id: newProduct.id,
                warehouse_id: whId,
                location_id: locId,
                on_hand: qty,
                reserved: 0,
                updated_at: new Date().toISOString(),
              },
            ],
            { onConflict: 'product_id,warehouse_id,location_id' }
          );

        if (stockUpsertErr) {
          console.error('Failed to create initial stock row:', stockUpsertErr.message);
        }

        // Record in stock_ledger
        await supabase.from('stock_ledger').insert([
          {
            entry_type: 'initial',
            reference: `INIT/${cleanSku}`,
            product_id: newProduct.id,
            warehouse_id: whId,
            location_id: locId,
            quantity_change: qty,
            balance_after: qty,
            user_id: userId || null,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (stockErr) {
      console.error('Initial stock inventory transaction error:', stockErr);
    }
  }

  return newProduct;
}

/**
 * Update Product details.
 * NOTE: Does NOT allow direct updates to on_hand, reserved, or free_to_use.
 */
export async function updateProduct(
  id: string,
  input: UpdateProductInput
): Promise<Product> {
  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    if (!input.name.trim()) throw new Error('Product name cannot be empty.');
    updatePayload.name = input.name.trim();
  }

  if (input.sku !== undefined) {
    const cleanSku = input.sku.trim().toUpperCase();
    if (!cleanSku) throw new Error('SKU cannot be empty.');
    const isUnique = await checkSkuUnique(cleanSku, id);
    if (!isUnique) {
      throw new Error(`SKU "${cleanSku}" is already in use by another product.`);
    }
    updatePayload.sku = cleanSku;
  }

  if (input.category_id !== undefined) {
    updatePayload.category_id = input.category_id || null;
  }

  if (input.unit_of_measure !== undefined) {
    updatePayload.unit_of_measure = input.unit_of_measure.trim() || 'Units';
  }

  if (input.cost_price !== undefined) {
    updatePayload.cost_price = Math.max(0, Number(input.cost_price) || 0);
  }

  if (input.sale_price !== undefined) {
    updatePayload.sale_price = Math.max(0, Number(input.sale_price) || 0);
  }

  if (input.reorder_level !== undefined) {
    updatePayload.reorder_level = Math.max(0, Number(input.reorder_level) || 0);
  }

  if (input.reorder_quantity !== undefined) {
    updatePayload.reorder_quantity = Math.max(0, Number(input.reorder_quantity) || 0);
  }

  if (input.is_active !== undefined) {
    updatePayload.is_active = input.is_active;
  }

  if (input.description !== undefined) {
    updatePayload.description = input.description?.trim() || null;
  }

  const { data, error } = await supabase
    .from('products')
    .update(updatePayload)
    .eq('id', id)
    .select('*, category:categories(*)')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update product.');
  }

  return data;
}

/**
 * Toggle active status
 */
export async function toggleProductActive(id: string, isActive: boolean): Promise<Product> {
  return updateProduct(id, { is_active: isActive });
}

/**
 * Delete Product
 */
export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) {
    throw new Error(error.message || 'Failed to delete product.');
  }
}
