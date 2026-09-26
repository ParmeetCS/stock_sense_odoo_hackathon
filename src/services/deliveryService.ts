import { supabase } from '../lib/supabase';
import type {
  Delivery,
  DeliveryItem,
  OrderStatus,
} from '../types';

export interface CreateDeliveryInput {
  reference?: string;
  customer_name?: string;
  warehouse_id: string;
  source_location_id: string;
  scheduled_date?: string;
  notes?: string;
  items: {
    product_id: string;
    quantity_demanded: number;
    quantity_delivered?: number;
  }[];
}

export interface UpdateDeliveryInput {
  customer_name?: string;
  warehouse_id?: string;
  source_location_id?: string;
  scheduled_date?: string;
  notes?: string;
  items?: {
    product_id: string;
    quantity_demanded: number;
    quantity_delivered?: number;
  }[];
}

/**
 * Auto-generate next sequential delivery reference (e.g. WH/OUT/0001)
 */
export async function generateDeliveryReference(): Promise<string> {
  try {
    const { count, error } = await supabase
      .from('deliveries')
      .select('id', { count: 'exact', head: true });

    if (error) {
      return `WH/OUT/${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const nextSeq = (count ?? 0) + 1;
    const padded = String(nextSeq).padStart(4, '0');
    return `WH/OUT/${padded}`;
  } catch {
    return `WH/OUT/${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

/**
 * Fetch list of deliveries with optional filters
 */
export async function fetchDeliveries(filters?: {
  status?: string;
  warehouseId?: string;
}): Promise<Delivery[]> {
  try {
    let query = supabase
      .from('deliveries')
      .select('*, warehouse:warehouses(name, code), source_location:locations(name, code)')
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.warehouseId) {
      query = query.eq('warehouse_id', filters.warehouseId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data as Delivery[]) || [];
  } catch (err) {
    console.error('Error fetching deliveries:', err);
    return [];
  }
}

/**
 * Fetch delivery by ID with line items
 */
export async function fetchDeliveryById(id: string): Promise<(Delivery & { items: DeliveryItem[] }) | null> {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*, warehouse:warehouses(*), source_location:locations(*), items:delivery_items(*, product:products(*))')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as any;
  } catch (err) {
    console.error('Error fetching delivery by ID:', err);
    return null;
  }
}

/**
 * Create a new Outbound Delivery Order
 */
export async function createDelivery(input: CreateDeliveryInput, userId?: string): Promise<Delivery> {
  const reference = input.reference || (await generateDeliveryReference());

  const { data: deliveryData, error: deliveryErr } = await supabase
    .from('deliveries')
    .insert([
      {
        reference,
        customer_name: input.customer_name?.trim() || null,
        warehouse_id: input.warehouse_id,
        source_location_id: input.source_location_id,
        scheduled_date: input.scheduled_date || new Date().toISOString(),
        notes: input.notes?.trim() || null,
        status: 'draft',
        created_by: userId || null,
      },
    ])
    .select()
    .single();

  if (deliveryErr || !deliveryData) {
    throw new Error(deliveryErr?.message || 'Failed to create delivery order header.');
  }

  const itemsToInsert = input.items.map((item) => ({
    delivery_id: deliveryData.id,
    product_id: item.product_id,
    quantity_demanded: item.quantity_demanded,
    quantity_delivered: item.quantity_delivered || 0,
  }));

  const { error: itemsErr } = await supabase.from('delivery_items').insert(itemsToInsert);

  if (itemsErr) {
    // Rollback header if items fail
    await supabase.from('deliveries').delete().eq('id', deliveryData.id);
    throw new Error(itemsErr.message || 'Failed to create delivery order items.');
  }

  return deliveryData as Delivery;
}

/**
 * Validate / Complete Delivery Order Atomically
 * Enforces server-side transaction rules:
 * 1. Checks status != 'done' / 'canceled'.
 * 2. Checks source location stock availability (free_to_use >= demanded).
 * 3. Decreases stock on_hand exactly once.
 * 4. Logs audit entry in stock_ledger with entry_type = 'delivery' (-qty).
 * 5. Marks delivery status as 'done'.
 */
export async function validateDelivery(
  deliveryId: string,
  userId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('complete_delivery', {
      p_delivery_id: deliveryId,
      p_user_id: userId || null,
    });

    if (rpcErr) {
      console.warn('RPC complete_delivery error:', rpcErr.message);
      throw new Error(rpcErr.message);
    }

    if (!rpcRes?.success) {
      throw new Error(rpcRes?.error || 'Failed to complete delivery transaction.');
    }

    return {
      success: true,
      message: `Delivery ${rpcRes.reference} successfully validated and inventory dispatched.`,
    };
  } catch (err: any) {
    console.error('validateDelivery failed:', err);
    throw new Error(err.message || 'Validation transaction failed.');
  }
}

/**
 * Update Delivery Status
 */
export async function updateDeliveryStatus(
  deliveryId: string,
  newStatus: OrderStatus
): Promise<void> {
  const { data: current } = await supabase
    .from('deliveries')
    .select('status')
    .eq('id', deliveryId)
    .single();

  if (current?.status === 'done' && newStatus !== 'done') {
    throw new Error('Completed delivery orders cannot have their status reversed.');
  }

  const { error } = await supabase
    .from('deliveries')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', deliveryId);

  if (error) {
    throw new Error(error.message || `Failed to set status to ${newStatus}`);
  }
}
