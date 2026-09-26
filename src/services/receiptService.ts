import { supabase } from '../lib/supabase';
import type {
  Receipt,
  ReceiptItem,
  Supplier,
  StockLedger,
  OrderStatus,
  CreateReceiptInput,
  UpdateReceiptInput,
} from '../types';

export interface ReceiptFilterOptions {
  search?: string;
  status?: OrderStatus | 'all';
  warehouseId?: string;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'reference' | 'supplier' | 'destination' | 'scheduled_date' | 'created_at' | 'quantity' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ReceiptsListResponse {
  receipts: Receipt[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  kanbanCounts: Record<OrderStatus, number>;
}

/**
 * Fetch all suppliers/vendors
 */
export async function fetchSuppliers(): Promise<Supplier[]> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Error fetching suppliers:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Error fetching suppliers:', err);
    return [];
  }
}

/**
 * Quick inline supplier creation
 */
export async function createSupplier(input: {
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
}): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .insert([
      {
        name: input.name.trim(),
        code: input.code?.trim().toUpperCase() || input.name.substring(0, 4).toUpperCase(),
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
      },
    ])
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create supplier.');
  }
  return data;
}

/**
 * Auto-generate next sequential receipt reference (e.g. WH/IN/0001)
 */
export async function generateReceiptReference(): Promise<string> {
  try {
    const { count, error } = await supabase
      .from('receipts')
      .select('id', { count: 'exact', head: true });

    if (error) {
      return `WH/IN/${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const nextSeq = (count ?? 0) + 1;
    const padded = String(nextSeq).padStart(4, '0');
    return `WH/IN/${padded}`;
  } catch {
    return `WH/IN/${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

/**
 * Fetch Receipts List with filters, search, sorting, and kanban metrics
 */
export async function fetchReceiptsList(
  options: ReceiptFilterOptions = {}
): Promise<ReceiptsListResponse> {
  const {
    search = '',
    status = 'all',
    warehouseId = 'all',
    startDate,
    endDate,
    sortBy = 'created_at',
    sortOrder = 'desc',
    page = 1,
    pageSize = 10,
  } = options;

  try {
    let query = supabase
      .from('receipts')
      .select(`
        *,
        supplier:suppliers(*),
        warehouse:warehouses(*),
        destination_location:locations(*),
        creator:profiles(id, email, full_name),
        items:receipt_items(
          id,
          product_id,
          quantity_expected,
          quantity_received,
          unit_cost,
          product:products(id, sku, name, unit_of_measure, cost_price)
        )
      `);

    if (warehouseId && warehouseId !== 'all') {
      query = query.eq('warehouse_id', warehouseId);
    }

    const { data: rawReceipts, error } = await query;

    if (error) {
      console.error('Error fetching receipts:', error.message);
      throw new Error(error.message);
    }

    if (!rawReceipts) {
      return {
        receipts: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: page,
        kanbanCounts: { draft: 0, waiting: 0, ready: 0, done: 0, canceled: 0 },
      };
    }

    // Kanban counts across the full dataset
    const kanbanCounts: Record<OrderStatus, number> = {
      draft: 0,
      waiting: 0,
      ready: 0,
      done: 0,
      canceled: 0,
    };

    rawReceipts.forEach((r: any) => {
      const st = (r.status || 'draft') as OrderStatus;
      if (kanbanCounts[st] !== undefined) {
        kanbanCounts[st]++;
      }
    });

    // Process each receipt
    let processed: Receipt[] = rawReceipts.map((r: any) => {
      const itemsList: ReceiptItem[] = r.items || [];
      let totalQtyExpected = 0;
      let totalQtyReceived = 0;
      let totalCost = 0;

      itemsList.forEach((it) => {
        const exp = Number(it.quantity_expected) || 0;
        const rec = Number(it.quantity_received) || 0;
        const cost = Number(it.unit_cost) || 0;
        totalQtyExpected += exp;
        totalQtyReceived += rec;
        totalCost += exp * cost;
      });

      return {
        ...r,
        total_quantity_expected: totalQtyExpected,
        total_quantity_received: totalQtyReceived,
        total_cost: totalCost,
        items: itemsList,
      };
    });

    // Filter by Status
    if (status && status !== 'all') {
      processed = processed.filter((r) => r.status === status);
    }

    // Filter by Search Query
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      processed = processed.filter(
        (r) =>
          r.reference?.toLowerCase().includes(term) ||
          r.supplier?.name?.toLowerCase().includes(term) ||
          r.supplier?.code?.toLowerCase().includes(term) ||
          r.warehouse?.name?.toLowerCase().includes(term) ||
          r.destination_location?.code?.toLowerCase().includes(term) ||
          r.notes?.toLowerCase().includes(term) ||
          r.contact?.toLowerCase().includes(term)
      );
    }

    // Filter by Date Range
    if (startDate) {
      const start = new Date(startDate).getTime();
      processed = processed.filter((r) => {
        const itemDate = new Date(r.scheduled_date || r.created_at || '').getTime();
        return itemDate >= start;
      });
    }
    if (endDate) {
      const end = new Date(endDate).getTime();
      processed = processed.filter((r) => {
        const itemDate = new Date(r.scheduled_date || r.created_at || '').getTime();
        return itemDate <= end;
      });
    }

    // Sorting
    processed.sort((a, b) => {
      let aVal: any = a[sortBy as keyof Receipt];
      let bVal: any = b[sortBy as keyof Receipt];

      if (sortBy === 'supplier') {
        aVal = a.supplier?.name || '';
        bVal = b.supplier?.name || '';
      } else if (sortBy === 'destination') {
        aVal = `${a.warehouse?.code || ''} ${a.destination_location?.code || ''}`;
        bVal = `${b.warehouse?.code || ''} ${b.destination_location?.code || ''}`;
      } else if (sortBy === 'quantity') {
        aVal = a.total_quantity_expected || 0;
        bVal = b.total_quantity_expected || 0;
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
      receipts: paginated,
      totalCount,
      totalPages,
      currentPage: page,
      kanbanCounts,
    };
  } catch (err: any) {
    console.error('fetchReceiptsList failed:', err);
    throw new Error(err.message || 'Failed to fetch inbound receipts');
  }
}

/**
 * Fetch Single Receipt with Items, Stock Ledger audit trail, and stock impact preview
 */
export async function fetchReceiptById(id: string): Promise<{
  receipt: Receipt;
  ledger: StockLedger[];
  stockImpact: Array<{
    product_id: string;
    product_name: string;
    sku: string;
    unit_of_measure: string;
    current_on_hand: number;
    expected_quantity: number;
    received_quantity: number;
  }>;
}> {
  try {
    const { data: receiptData, error: receiptError } = await supabase
      .from('receipts')
      .select(`
        *,
        supplier:suppliers(*),
        warehouse:warehouses(*),
        destination_location:locations(*),
        creator:profiles(id, email, full_name),
        items:receipt_items(
          id,
          product_id,
          quantity_expected,
          quantity_received,
          unit_cost,
          product:products(id, sku, name, unit_of_measure, cost_price)
        )
      `)
      .eq('id', id)
      .single();

    if (receiptError || !receiptData) {
      throw new Error(receiptError?.message || 'Receipt not found');
    }

    const itemsList: ReceiptItem[] = receiptData.items || [];
    let totalQtyExpected = 0;
    let totalQtyReceived = 0;
    let totalCost = 0;

    itemsList.forEach((it) => {
      const exp = Number(it.quantity_expected) || 0;
      const rec = Number(it.quantity_received) || 0;
      const cost = Number(it.unit_cost) || 0;
      totalQtyExpected += exp;
      totalQtyReceived += rec;
      totalCost += exp * cost;
    });

    const receipt: Receipt = {
      ...receiptData,
      total_quantity_expected: totalQtyExpected,
      total_quantity_received: totalQtyReceived,
      total_cost: totalCost,
      items: itemsList,
    };

    // 2. Fetch stock ledger entries generated for this receipt
    const { data: ledgerData, error: ledgerError } = await supabase
      .from('stock_ledger')
      .select(`
        *,
        user:profiles(full_name, email),
        warehouse:warehouses(code, name),
        location:locations(code, name),
        product:products(sku, name, unit_of_measure)
      `)
      .eq('reference', receipt.reference)
      .order('created_at', { ascending: false });

    if (ledgerError) {
      console.warn('Error fetching receipt ledger:', ledgerError.message);
    }

    // 3. Compute current on_hand stock impact
    const productIds = itemsList.map((it) => it.product_id);
    let currentStockMap: Record<string, number> = {};

    if (productIds.length > 0 && receipt.warehouse_id && receipt.destination_location_id) {
      const { data: stockData } = await supabase
        .from('stock')
        .select('product_id, on_hand')
        .in('product_id', productIds)
        .eq('warehouse_id', receipt.warehouse_id)
        .eq('location_id', receipt.destination_location_id);

      if (stockData) {
        stockData.forEach((s: any) => {
          currentStockMap[s.product_id] = Number(s.on_hand) || 0;
        });
      }
    }

    const stockImpact = itemsList.map((it) => ({
      product_id: it.product_id,
      product_name: it.product?.name || 'Product',
      sku: it.product?.sku || 'SKU',
      unit_of_measure: it.product?.unit_of_measure || 'Units',
      current_on_hand: currentStockMap[it.product_id] || 0,
      expected_quantity: Number(it.quantity_expected) || 0,
      received_quantity: Number(it.quantity_received) || 0,
    }));

    return {
      receipt,
      ledger: ledgerData || [],
      stockImpact,
    };
  } catch (err: any) {
    console.error('fetchReceiptById failed:', err);
    throw new Error(err.message || 'Failed to load receipt details');
  }
}

/**
 * Create Inbound Receipt
 * Business rule: Draft creation must NOT change stock.
 */
export async function createReceipt(
  input: CreateReceiptInput,
  userId?: string
): Promise<Receipt> {
  if (!input.warehouse_id) throw new Error('Destination warehouse is required.');
  if (!input.destination_location_id) throw new Error('Destination location is required.');
  if (!input.items || input.items.length === 0) {
    throw new Error('At least one product item is required.');
  }

  // Validate quantities
  for (const item of input.items) {
    if (Number(item.quantity_expected) <= 0) {
      throw new Error('Expected quantity must be greater than zero for all line items.');
    }
  }

  // Generate reference if needed
  const ref = input.reference?.trim() || (await generateReceiptReference());

  // 1. Insert Receipt header
  const { data: newReceipt, error: receiptError } = await supabase
    .from('receipts')
    .insert([
      {
        reference: ref,
        supplier_id: input.supplier_id || null,
        warehouse_id: input.warehouse_id,
        destination_location_id: input.destination_location_id,
        status: input.status || 'draft',
        scheduled_date: input.scheduled_date || new Date().toISOString(),
        contact: input.contact?.trim() || null,
        notes: input.notes?.trim() || null,
        created_by: userId || null,
      },
    ])
    .select('*, supplier:suppliers(*), warehouse:warehouses(*), destination_location:locations(*)')
    .single();

  if (receiptError || !newReceipt) {
    throw new Error(receiptError?.message || 'Failed to create receipt header.');
  }

  // 2. Insert Line Items
  const itemsToInsert = input.items.map((it) => ({
    receipt_id: newReceipt.id,
    product_id: it.product_id,
    quantity_expected: Number(it.quantity_expected),
    quantity_received: 0, // In draft/waiting state, quantity received is 0
    unit_cost: Number(it.unit_cost) || 0,
  }));

  const { data: insertedItems, error: itemsError } = await supabase
    .from('receipt_items')
    .insert(itemsToInsert)
    .select('*, product:products(*)');

  if (itemsError) {
    console.error('Failed to insert receipt items:', itemsError.message);
  }

  return {
    ...newReceipt,
    items: insertedItems || [],
  };
}

/**
 * Update Receipt
 */
export async function updateReceipt(
  id: string,
  input: UpdateReceiptInput
): Promise<Receipt> {
  // Check if receipt is already done
  const { data: current } = await supabase.from('receipts').select('status').eq('id', id).single();
  if (current?.status === 'done') {
    throw new Error('Validated receipts cannot be modified.');
  }

  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.reference !== undefined) payload.reference = input.reference.trim();
  if (input.supplier_id !== undefined) payload.supplier_id = input.supplier_id || null;
  if (input.warehouse_id !== undefined) payload.warehouse_id = input.warehouse_id;
  if (input.destination_location_id !== undefined) payload.destination_location_id = input.destination_location_id;
  if (input.status !== undefined) payload.status = input.status;
  if (input.scheduled_date !== undefined) payload.scheduled_date = input.scheduled_date || null;
  if (input.received_date !== undefined) payload.received_date = input.received_date || null;
  if (input.contact !== undefined) payload.contact = input.contact?.trim() || null;
  if (input.notes !== undefined) payload.notes = input.notes?.trim() || null;

  const { data, error } = await supabase
    .from('receipts')
    .update(payload)
    .eq('id', id)
    .select('*, supplier:suppliers(*), warehouse:warehouses(*), destination_location:locations(*)')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update receipt.');
  }

  // Update items if supplied
  if (input.items && input.items.length > 0) {
    // Delete existing items and re-insert
    await supabase.from('receipt_items').delete().eq('receipt_id', id);

    const itemsToInsert = input.items.map((it) => ({
      receipt_id: id,
      product_id: it.product_id,
      quantity_expected: Number(it.quantity_expected),
      quantity_received: Number(it.quantity_received) || 0,
      unit_cost: Number(it.unit_cost) || 0,
    }));

    await supabase.from('receipt_items').insert(itemsToInsert);
  }

  return data;
}

/**
 * Validate / Complete Receipt Atomically
 * Business rule:
 * 1. Increase stock.
 * 2. Create ledger entries.
 * 3. Update location stock.
 * 4. Record user/time.
 * 5. Change document status to 'done'.
 * Atomically executed via Postgres RPC.
 */
export async function validateReceipt(
  receiptId: string,
  userId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Call atomic database RPC function
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('complete_receipt', {
      p_receipt_id: receiptId,
      p_user_id: userId || null,
    });

    if (rpcErr) {
      console.warn('RPC complete_receipt error:', rpcErr.message);
      throw new Error(rpcErr.message);
    }

    if (!rpcRes?.success) {
      throw new Error(rpcRes?.error || 'Failed to complete receipt transaction.');
    }

    return {
      success: true,
      message: `Receipt ${rpcRes.reference} successfully validated and inventory received into warehouse.`,
    };
  } catch (err: any) {
    console.error('validateReceipt failed:', err);
    throw new Error(err.message || 'Validation transaction failed.');
  }
}

/**
 * Update Receipt Status (e.g. to 'waiting' or 'ready' or 'canceled')
 */
export async function updateReceiptStatus(
  receiptId: string,
  newStatus: OrderStatus
): Promise<void> {
  const { data: current } = await supabase
    .from('receipts')
    .select('status')
    .eq('id', receiptId)
    .single();

  if (current?.status === 'done' && newStatus !== 'done') {
    throw new Error('Completed receipts cannot have their status reversed.');
  }

  const { error } = await supabase
    .from('receipts')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', receiptId);

  if (error) {
    throw new Error(error.message || `Failed to set status to ${newStatus}`);
  }
}
