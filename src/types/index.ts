export type OrderStatus = 'draft' | 'waiting' | 'ready' | 'done' | 'canceled';
export type UserRole = 'admin' | 'manager' | 'inventory_user' | 'audit_viewer';
export type LedgerEntryType = 'receipt' | 'delivery' | 'transfer_in' | 'transfer_out' | 'adjustment' | 'initial';

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  code?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  unit_of_measure: string;
  cost_price: number;
  sale_price: number;
  reorder_level: number;
  reorder_quantity?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  category?: Category;
  // Computed & aggregated inventory values for views
  on_hand?: number;
  reserved?: number;
  free_to_use?: number;
  warehouse_name?: string;
  location_name?: string;
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  stocks?: Stock[];
}

export interface CreateProductInput {
  name: string;
  sku: string;
  category_id?: string;
  unit_of_measure: string;
  cost_price?: number;
  sale_price?: number;
  reorder_level?: number;
  reorder_quantity?: number;
  is_active?: boolean;
  description?: string;
  initial_stock?: {
    warehouse_id: string;
    location_id: string;
    quantity: number;
  };
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  category_id?: string;
  unit_of_measure?: string;
  cost_price?: number;
  sale_price?: number;
  reorder_level?: number;
  reorder_quantity?: number;
  is_active?: boolean;
  description?: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  // Computed fields
  location_count?: number;
  stock_quantity?: number;
  locations?: Location[];
  stocks?: Stock[];
}

export interface CreateWarehouseInput {
  name: string;
  code: string;
  address?: string;
  is_active?: boolean;
}

export interface UpdateWarehouseInput {
  name?: string;
  code?: string;
  address?: string;
  is_active?: boolean;
}

export interface Location {
  id: string;
  warehouse_id: string;
  code: string;
  name: string;
  type: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  warehouse?: Warehouse;
  // Computed fields
  stock_quantity?: number;
  stocks?: Stock[];
}

export interface CreateLocationInput {
  warehouse_id: string;
  code: string;
  name: string;
  type?: string;
  is_active?: boolean;
}

export interface UpdateLocationInput {
  warehouse_id?: string;
  code?: string;
  name?: string;
  type?: string;
  is_active?: boolean;
}

export interface Stock {
  id: string;
  product_id: string;
  warehouse_id: string;
  location_id: string;
  on_hand: number;
  reserved: number;
  free_to_use: number;
  updated_at?: string;
  product?: Product;
  warehouse?: Warehouse;
  location?: Location;
}

export interface Receipt {
  id: string;
  reference: string;
  supplier_id?: string;
  warehouse_id: string;
  destination_location_id?: string;
  status: OrderStatus;
  notes?: string;
  scheduled_date?: string;
  received_date?: string;
  contact?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  supplier?: Supplier;
  warehouse?: Warehouse;
  destination_location?: Location;
  creator?: Profile;
  items?: ReceiptItem[];
  // Computed fields
  total_quantity_expected?: number;
  total_quantity_received?: number;
  total_cost?: number;
}

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  product_id: string;
  quantity_expected: number;
  quantity_received: number;
  unit_cost: number;
  created_at?: string;
  product?: Product;
}

export interface CreateReceiptItemInput {
  product_id: string;
  quantity_expected: number;
  unit_cost?: number;
}

export interface CreateReceiptInput {
  reference?: string;
  supplier_id?: string;
  warehouse_id: string;
  destination_location_id: string;
  status?: OrderStatus;
  scheduled_date?: string;
  contact?: string;
  notes?: string;
  items: CreateReceiptItemInput[];
}

export interface UpdateReceiptInput {
  reference?: string;
  supplier_id?: string;
  warehouse_id?: string;
  destination_location_id?: string;
  status?: OrderStatus;
  scheduled_date?: string;
  received_date?: string;
  contact?: string;
  notes?: string;
  items?: {
    id?: string;
    product_id: string;
    quantity_expected: number;
    quantity_received?: number;
    unit_cost?: number;
  }[];
}

export interface Delivery {
  id: string;
  reference: string;
  customer_name?: string;
  warehouse_id: string;
  source_location_id?: string;
  status: OrderStatus;
  scheduled_date?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  warehouse?: Warehouse;
  source_location?: Location;
  items?: DeliveryItem[];
}

export interface DeliveryItem {
  id: string;
  delivery_id: string;
  product_id: string;
  quantity_demanded: number;
  quantity_delivered: number;
  created_at?: string;
  product?: Product;
}

export interface InternalTransfer {
  id: string;
  reference: string;
  source_warehouse_id: string;
  source_location_id: string;
  destination_warehouse_id: string;
  destination_location_id: string;
  status: OrderStatus;
  notes?: string;
  scheduled_date?: string;
  completed_date?: string;
  responsible_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  source_warehouse?: Warehouse;
  destination_warehouse?: Warehouse;
  source_location?: Location;
  destination_location?: Location;
  responsible?: Profile;
  creator?: Profile;
  items?: InternalTransferItem[];
  // Computed fields
  total_quantity?: number;
  total_items?: number;
}

export interface InternalTransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  quantity: number;
  created_at?: string;
  product?: Product;
  // Stock availability at time of query
  available_stock?: number;
}

export interface CreateInternalTransferItemInput {
  product_id: string;
  quantity: number;
}

export interface CreateInternalTransferInput {
  reference?: string;
  source_warehouse_id: string;
  source_location_id: string;
  destination_warehouse_id: string;
  destination_location_id: string;
  status?: OrderStatus;
  scheduled_date?: string;
  responsible_id?: string;
  notes?: string;
  items: CreateInternalTransferItemInput[];
}

export interface UpdateInternalTransferInput {
  reference?: string;
  source_warehouse_id?: string;
  source_location_id?: string;
  destination_warehouse_id?: string;
  destination_location_id?: string;
  status?: OrderStatus;
  scheduled_date?: string;
  responsible_id?: string;
  notes?: string;
  items?: {
    id?: string;
    product_id: string;
    quantity: number;
  }[];
}

export type AdjustmentReason =
  | 'Damaged'
  | 'Lost'
  | 'Found'
  | 'Counting Error'
  | 'Other';

export interface InventoryAdjustment {
  id: string;
  reference: string;
  warehouse_id: string;
  location_id: string;
  product_id: string;
  theoretical_quantity: number;
  real_quantity: number;
  difference: number;
  reason?: string;
  notes?: string;
  status: OrderStatus;
  completed_date?: string;
  responsible_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  warehouse?: Warehouse;
  location?: Location;
  product?: Product;
  responsible?: Profile;
  creator?: Profile;
}

export interface CreateInventoryAdjustmentInput {
  reference?: string;
  warehouse_id: string;
  location_id: string;
  product_id: string;
  theoretical_quantity: number;
  real_quantity: number;
  reason?: string;
  notes?: string;
  responsible_id?: string;
  status?: OrderStatus;
}

export interface UpdateInventoryAdjustmentInput {
  reference?: string;
  warehouse_id?: string;
  location_id?: string;
  product_id?: string;
  theoretical_quantity?: number;
  real_quantity?: number;
  reason?: string;
  notes?: string;
  responsible_id?: string;
  status?: OrderStatus;
}

export interface StockLedger {
  id: string;
  entry_type: LedgerEntryType;
  reference: string;
  product_id: string;
  warehouse_id: string;
  location_id: string;
  quantity_change: number;
  balance_after: number;
  user_id?: string;
  created_at?: string;
  product?: Product;
  warehouse?: Warehouse;
  location?: Location;
  user?: Profile;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  databaseConnected: boolean;
  timestamp: string;
}
