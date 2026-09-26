-- StockSense Complete Database Schema Migration
-- Migration: 20260926000001_complete_schema.sql

-- Enums
CREATE TYPE public.order_status AS ENUM ('draft', 'waiting', 'ready', 'done', 'canceled');
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'inventory_user', 'audit_viewer');
CREATE TYPE public.ledger_entry_type AS ENUM ('receipt', 'delivery', 'transfer_in', 'transfer_out', 'adjustment', 'initial');

-- 1. Profiles (User representation)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role public.user_role NOT NULL DEFAULT 'inventory_user',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    unit_of_measure TEXT NOT NULL DEFAULT 'Units',
    cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (cost_price >= 0),
    sale_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (sale_price >= 0),
    reorder_level NUMERIC(15, 2) NOT NULL DEFAULT 10.00 CHECK (reorder_level >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Warehouses
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Locations
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'internal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_location_code_per_warehouse UNIQUE (warehouse_id, code)
);

-- 7. Stock (Product + Warehouse + Location)
CREATE TABLE IF NOT EXISTS public.stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    on_hand NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (on_hand >= 0),
    reserved NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (reserved >= 0),
    free_to_use NUMERIC(15, 2) GENERATED ALWAYS AS (on_hand - reserved) STORED,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_product_location_stock UNIQUE (product_id, warehouse_id, location_id),
    CONSTRAINT check_reserved_lte_on_hand CHECK (reserved <= on_hand)
);

-- 8. Receipts (Inbound Operations)
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference TEXT NOT NULL UNIQUE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    destination_location_id UUID REFERENCES public.locations(id) ON DELETE RESTRICT,
    status public.order_status NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Receipt Items
CREATE TABLE IF NOT EXISTS public.receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity_expected NUMERIC(15, 2) NOT NULL CHECK (quantity_expected > 0),
    quantity_received NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (quantity_received >= 0),
    unit_cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Deliveries (Outbound Operations)
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference TEXT NOT NULL UNIQUE,
    customer_name TEXT,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    source_location_id UUID REFERENCES public.locations(id) ON DELETE RESTRICT,
    status public.order_status NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Delivery Items
CREATE TABLE IF NOT EXISTS public.delivery_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity_demanded NUMERIC(15, 2) NOT NULL CHECK (quantity_demanded > 0),
    quantity_delivered NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (quantity_delivered >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Internal Transfers
CREATE TABLE IF NOT EXISTS public.internal_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference TEXT NOT NULL UNIQUE,
    source_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    source_location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    destination_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    destination_location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    status public.order_status NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Internal Transfer Items
CREATE TABLE IF NOT EXISTS public.internal_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES public.internal_transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(15, 2) NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Inventory Adjustments
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference TEXT NOT NULL UNIQUE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    theoretical_quantity NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    real_quantity NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    difference NUMERIC(15, 2) GENERATED ALWAYS AS (real_quantity - theoretical_quantity) STORED,
    reason TEXT,
    status public.order_status NOT NULL DEFAULT 'draft',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Stock Ledger (Audit Trail)
CREATE TABLE IF NOT EXISTS public.stock_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_type public.ledger_entry_type NOT NULL,
    reference TEXT NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    quantity_change NUMERIC(15, 2) NOT NULL,
    balance_after NUMERIC(15, 2) NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_locations_warehouse ON public.locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_lookup ON public.stock(product_id, warehouse_id, location_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON public.receipts(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON public.internal_transfers(status);
CREATE INDEX IF NOT EXISTS idx_adjustments_status ON public.inventory_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_ledger_product ON public.stock_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON public.stock_ledger(created_at DESC);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies for initial operations
CREATE POLICY "Allow read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow read suppliers" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Allow read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow read warehouses" ON public.warehouses FOR SELECT USING (true);
CREATE POLICY "Allow read locations" ON public.locations FOR SELECT USING (true);
CREATE POLICY "Allow read stock" ON public.stock FOR SELECT USING (true);
CREATE POLICY "Allow read receipts" ON public.receipts FOR SELECT USING (true);
CREATE POLICY "Allow read receipt_items" ON public.receipt_items FOR SELECT USING (true);
CREATE POLICY "Allow read deliveries" ON public.deliveries FOR SELECT USING (true);
CREATE POLICY "Allow read delivery_items" ON public.delivery_items FOR SELECT USING (true);
CREATE POLICY "Allow read internal_transfers" ON public.internal_transfers FOR SELECT USING (true);
CREATE POLICY "Allow read internal_transfer_items" ON public.internal_transfer_items FOR SELECT USING (true);
CREATE POLICY "Allow read inventory_adjustments" ON public.inventory_adjustments FOR SELECT USING (true);
CREATE POLICY "Allow read stock_ledger" ON public.stock_ledger FOR SELECT USING (true);
