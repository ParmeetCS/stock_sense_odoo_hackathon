import { supabase } from '../lib/supabase';
import type {
  StockLedger,
  Product,
  Warehouse,
  Location,
  LedgerEntryType,
} from '../types';

export type MoveOperationType =
  | 'all'
  | 'receipt'
  | 'delivery'
  | 'transfer'
  | 'adjustment'
  | 'initial';

export interface MoveHistoryFilterOptions {
  search?: string;
  productSearch?: string;
  contactSearch?: string;
  warehouseId?: string;
  locationId?: string;
  operationType?: MoveOperationType;
  status?: string;
  startDate?: string;
  endDate?: string;
  sortBy?:
    | 'created_at'
    | 'reference'
    | 'product'
    | 'entry_type'
    | 'quantity'
    | 'balance_after'
    | 'warehouse'
    | 'location';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface MoveHistoryItem extends StockLedger {
  balance_before: number;
  operation_display: string;
  from_display: string;
  to_display: string;
  contact_name?: string;
  reason?: string;
  source_document_url?: string;
  status_display: 'Completed' | 'Audited';
}

export interface MoveHistoryResponse {
  movements: MoveHistoryItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  kpis: {
    totalMovements: number;
    totalInboundQty: number;
    totalOutboundQty: number;
    netQtyChange: number;
  };
}

/**
 * Fetch Filter Metadata (Warehouses, Locations, Products)
 */
export async function fetchMoveHistoryMetadata(): Promise<{
  warehouses: Warehouse[];
  locations: Location[];
  products: Product[];
}> {
  try {
    const [whRes, locRes, prodRes] = await Promise.all([
      supabase.from('warehouses').select('*').order('code', { ascending: true }),
      supabase.from('locations').select('*, warehouse:warehouses(code, name)').order('code', { ascending: true }),
      supabase.from('products').select('*').order('name', { ascending: true }),
    ]);

    return {
      warehouses: whRes.data || [],
      locations: locRes.data || [],
      products: prodRes.data || [],
    };
  } catch (err) {
    console.error('Error fetching move history metadata:', err);
    return { warehouses: [], locations: [], products: [] };
  }
}

/**
 * Fetch Move History (Stock Ledger Audit Records) from Supabase
 */
export async function fetchMoveHistory(
  options: MoveHistoryFilterOptions = {}
): Promise<MoveHistoryResponse> {
  const {
    search = '',
    productSearch = '',
    contactSearch = '',
    warehouseId = 'all',
    locationId = 'all',
    operationType = 'all',
    startDate,
    endDate,
    sortBy = 'created_at',
    sortOrder = 'desc',
    page = 1,
    pageSize = 15,
  } = options;

  try {
    let query = supabase.from('stock_ledger').select(`
      *,
      product:products(id, sku, name, unit_of_measure, category_id),
      warehouse:warehouses(id, code, name),
      location:locations(id, code, name, type),
      user:profiles(id, full_name, email, role)
    `);

    if (warehouseId && warehouseId !== 'all') {
      query = query.eq('warehouse_id', warehouseId);
    }
    if (locationId && locationId !== 'all') {
      query = query.eq('location_id', locationId);
    }

    const { data: rawLedger, error } = await query;

    if (error) {
      console.error('Error fetching stock ledger:', error.message);
      throw new Error(error.message);
    }

    if (!rawLedger) {
      return {
        movements: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: page,
        kpis: {
          totalMovements: 0,
          totalInboundQty: 0,
          totalOutboundQty: 0,
          netQtyChange: 0,
        },
      };
    }

    // Enrich and process each ledger record
    let processed: MoveHistoryItem[] = rawLedger.map((row: any) => {
      const qtyChange = Number(row.quantity_change) || 0;
      const balanceAfter = Number(row.balance_after) || 0;
      const balanceBefore = balanceAfter - qtyChange;
      const entryType: LedgerEntryType = row.entry_type;

      let opDisplay = 'Stock Movement';
      let fromDisplay = '—';
      let toDisplay = '—';

      const whCode = row.warehouse?.code || 'WH';
      const locCode = row.location?.code || 'Bin';
      const whLocStr = `${whCode}/${locCode}`;

      if (entryType === 'receipt') {
        opDisplay = 'Receipt (Inbound)';
        fromDisplay = 'Supplier / External Vendor';
        toDisplay = whLocStr;
      } else if (entryType === 'delivery') {
        opDisplay = 'Delivery (Outbound)';
        fromDisplay = whLocStr;
        toDisplay = 'Customer / External Delivery';
      } else if (entryType === 'transfer_out') {
        opDisplay = 'Internal Transfer (Outbound)';
        fromDisplay = whLocStr;
        toDisplay = 'Relocation Target Bin';
      } else if (entryType === 'transfer_in') {
        opDisplay = 'Internal Transfer (Inbound)';
        fromDisplay = 'Relocation Source Bin';
        toDisplay = whLocStr;
      } else if (entryType === 'adjustment') {
        opDisplay = 'Stock Adjustment';
        fromDisplay = whLocStr;
        toDisplay = whLocStr;
      } else if (entryType === 'initial') {
        opDisplay = 'Initial Setup';
        fromDisplay = 'System Initialization';
        toDisplay = whLocStr;
      }

      return {
        ...row,
        quantity_change: qtyChange,
        balance_after: balanceAfter,
        balance_before: balanceBefore,
        operation_display: opDisplay,
        from_display: fromDisplay,
        to_display: toDisplay,
        status_display: 'Audited' as const,
      };
    });

    // Operation Filter
    if (operationType && operationType !== 'all') {
      processed = processed.filter((item) => {
        if (operationType === 'receipt') return item.entry_type === 'receipt';
        if (operationType === 'delivery') return item.entry_type === 'delivery';
        if (operationType === 'transfer') {
          return item.entry_type === 'transfer_out' || item.entry_type === 'transfer_in';
        }
        if (operationType === 'adjustment') return item.entry_type === 'adjustment';
        if (operationType === 'initial') return item.entry_type === 'initial';
        return true;
      });
    }

    // Full-Text Search
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      processed = processed.filter(
        (item) =>
          item.reference?.toLowerCase().includes(term) ||
          item.product?.name?.toLowerCase().includes(term) ||
          item.product?.sku?.toLowerCase().includes(term) ||
          item.warehouse?.name?.toLowerCase().includes(term) ||
          item.warehouse?.code?.toLowerCase().includes(term) ||
          item.location?.code?.toLowerCase().includes(term) ||
          item.user?.full_name?.toLowerCase().includes(term) ||
          item.user?.email?.toLowerCase().includes(term) ||
          item.operation_display.toLowerCase().includes(term)
      );
    }

    // Specific Product Search
    if (productSearch.trim()) {
      const term = productSearch.trim().toLowerCase();
      processed = processed.filter(
        (item) =>
          item.product?.name?.toLowerCase().includes(term) ||
          item.product?.sku?.toLowerCase().includes(term)
      );
    }

    // Contact Search (Supplier / Customer / User)
    if (contactSearch.trim()) {
      const term = contactSearch.trim().toLowerCase();
      processed = processed.filter(
        (item) =>
          item.from_display.toLowerCase().includes(term) ||
          item.to_display.toLowerCase().includes(term) ||
          item.user?.full_name?.toLowerCase().includes(term) ||
          item.user?.email?.toLowerCase().includes(term)
      );
    }

    // Date Range Filter
    if (startDate) {
      const start = new Date(startDate).getTime();
      processed = processed.filter((item) => {
        const itemDate = new Date(item.created_at || '').getTime();
        return itemDate >= start;
      });
    }
    if (endDate) {
      const end = new Date(endDate).getTime();
      processed = processed.filter((item) => {
        const itemDate = new Date(item.created_at || '').getTime();
        return itemDate <= end;
      });
    }

    // KPI Metrics calculation
    let totalInboundQty = 0;
    let totalOutboundQty = 0;
    let netQtyChange = 0;

    processed.forEach((item) => {
      if (item.quantity_change > 0) {
        totalInboundQty += item.quantity_change;
      } else {
        totalOutboundQty += Math.abs(item.quantity_change);
      }
      netQtyChange += item.quantity_change;
    });

    // Sorting
    processed.sort((a, b) => {
      let aVal: any = a[sortBy as keyof MoveHistoryItem];
      let bVal: any = b[sortBy as keyof MoveHistoryItem];

      if (sortBy === 'product') {
        aVal = a.product?.name || '';
        bVal = b.product?.name || '';
      } else if (sortBy === 'warehouse') {
        aVal = a.warehouse?.code || '';
        bVal = b.warehouse?.code || '';
      } else if (sortBy === 'location') {
        aVal = a.location?.code || '';
        bVal = b.location?.code || '';
      } else if (sortBy === 'quantity') {
        aVal = a.quantity_change;
        bVal = b.quantity_change;
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
      movements: paginated,
      totalCount,
      totalPages,
      currentPage: page,
      kpis: {
        totalMovements: totalCount,
        totalInboundQty,
        totalOutboundQty,
        netQtyChange,
      },
    };
  } catch (err: any) {
    console.error('fetchMoveHistory failed:', err);
    throw new Error(err.message || 'Failed to fetch move history audit trail');
  }
}

/**
 * Fetch Detailed Movement Info (joining document notes/reason where available)
 */
export async function fetchMovementDetail(id: string): Promise<MoveHistoryItem> {
  try {
    const { data: row, error } = await supabase
      .from('stock_ledger')
      .select(`
        *,
        product:products(id, sku, name, unit_of_measure, cost_price, category:categories(name)),
        warehouse:warehouses(id, code, name, address),
        location:locations(id, code, name, type),
        user:profiles(id, full_name, email, role)
      `)
      .eq('id', id)
      .single();

    if (error || !row) throw new Error(error?.message || 'Movement record not found');

    const qtyChange = Number(row.quantity_change) || 0;
    const balanceAfter = Number(row.balance_after) || 0;
    const balanceBefore = balanceAfter - qtyChange;
    const entryType: LedgerEntryType = row.entry_type;

    let opDisplay = 'Stock Movement';
    let fromDisplay = '—';
    let toDisplay = '—';
    let docUrl = '';
    let reason = '';
    let contactName = '';

    const whCode = row.warehouse?.code || 'WH';
    const locCode = row.location?.code || 'Bin';
    const whLocStr = `${whCode}/${locCode}`;

    if (entryType === 'receipt') {
      opDisplay = 'Receipt (Inbound)';
      fromDisplay = 'Supplier / External Vendor';
      toDisplay = whLocStr;
      docUrl = `/operations/receipts`;

      // Fetch receipt details for contact
      const { data: rec } = await supabase
        .from('receipts')
        .select('contact, supplier:suppliers(name)')
        .eq('reference', row.reference)
        .maybeSingle();

      if (rec) {
        contactName = (rec.supplier as any)?.name || rec.contact || '';
      }
    } else if (entryType === 'delivery') {
      opDisplay = 'Delivery (Outbound)';
      fromDisplay = whLocStr;
      toDisplay = 'Customer Delivery';
      docUrl = `/operations/deliveries`;

      const { data: del } = await supabase
        .from('deliveries')
        .select('customer_name')
        .eq('reference', row.reference)
        .maybeSingle();

      if (del) {
        contactName = del.customer_name || '';
      }
    } else if (entryType === 'transfer_out' || entryType === 'transfer_in') {
      opDisplay = entryType === 'transfer_out' ? 'Internal Transfer (Outbound)' : 'Internal Transfer (Inbound)';
      docUrl = `/operations/transfers`;

      const { data: tr } = await supabase
        .from('internal_transfers')
        .select(`
          source_warehouse:warehouses!source_warehouse_id(code),
          source_location:locations!source_location_id(code),
          destination_warehouse:warehouses!destination_warehouse_id(code),
          destination_location:locations!destination_location_id(code),
          notes
        `)
        .eq('reference', row.reference)
        .maybeSingle();

      if (tr) {
        const srcWhCode = (tr.source_warehouse as any)?.code || 'WH';
        const srcLocCode = (tr.source_location as any)?.code || 'Bin';
        const destWhCode = (tr.destination_warehouse as any)?.code || 'WH';
        const destLocCode = (tr.destination_location as any)?.code || 'Bin';
        fromDisplay = `${srcWhCode}/${srcLocCode}`;
        toDisplay = `${destWhCode}/${destLocCode}`;
        reason = tr.notes || 'Internal Relocation';
      } else {
        fromDisplay = whLocStr;
        toDisplay = 'Relocation Target';
      }
    } else if (entryType === 'adjustment') {
      opDisplay = 'Stock Adjustment';
      fromDisplay = whLocStr;
      toDisplay = whLocStr;
      docUrl = `/operations/adjustments`;

      const { data: adj } = await supabase
        .from('inventory_adjustments')
        .select('reason, notes')
        .eq('reference', row.reference)
        .maybeSingle();

      if (adj) {
        reason = `${adj.reason || 'Reconciliation'}${adj.notes ? ` - ${adj.notes}` : ''}`;
      }
    } else if (entryType === 'initial') {
      opDisplay = 'Initial Stock Setup';
      fromDisplay = 'System Setup';
      toDisplay = whLocStr;
      reason = 'Initial Inventory Creation';
    }

    return {
      ...row,
      quantity_change: qtyChange,
      balance_after: balanceAfter,
      balance_before: balanceBefore,
      operation_display: opDisplay,
      from_display: fromDisplay,
      to_display: toDisplay,
      contact_name: contactName,
      reason: reason || 'Audit Recorded Movement',
      source_document_url: docUrl,
      status_display: 'Audited' as const,
    };
  } catch (err: any) {
    console.error('fetchMovementDetail failed:', err);
    throw new Error(err.message || 'Failed to load movement details');
  }
}

/**
 * Export filtered Move History to CSV download file
 */
export function exportMoveHistoryCSV(movements: MoveHistoryItem[]) {
  if (!movements || movements.length === 0) return;

  const headers = [
    'Reference',
    'Date & Time',
    'Product SKU',
    'Product Name',
    'Operation Type',
    'From (Origin)',
    'To (Destination)',
    'Quantity Change',
    'Balance Before',
    'Balance After',
    'Warehouse',
    'Location',
    'Responsible User',
    'Status',
  ];

  const rows = movements.map((m) => [
    `"${m.reference}"`,
    `"${m.created_at ? new Date(m.created_at).toLocaleString() : ''}"`,
    `"${m.product?.sku || ''}"`,
    `"${m.product?.name || ''}"`,
    `"${m.operation_display}"`,
    `"${m.from_display}"`,
    `"${m.to_display}"`,
    m.quantity_change > 0 ? `+${m.quantity_change}` : `${m.quantity_change}`,
    m.balance_before,
    m.balance_after,
    `"${m.warehouse?.code || ''} - ${m.warehouse?.name || ''}"`,
    `"${m.location?.code || ''}"`,
    `"${m.user?.full_name || m.user?.email || 'System'}"`,
    `"${m.status_display}"`,
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  link.setAttribute('download', `StockSense_Move_History_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
