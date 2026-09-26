-- StockSense Products & Inventory Transaction Migration
-- Migration: 20260926000003_products_and_inventory.sql

-- 1. Ensure reorder_quantity exists on products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS reorder_quantity NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (reorder_quantity >= 0);

-- 2. Ensure RLS is enabled and comprehensive policies for Products & Categories
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Product Policies
DROP POLICY IF EXISTS "Allow read products" ON public.products;
CREATE POLICY "Allow read products" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert products" ON public.products;
CREATE POLICY "Allow insert products" ON public.products FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update products" ON public.products;
CREATE POLICY "Allow update products" ON public.products FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete products" ON public.products;
CREATE POLICY "Allow delete products" ON public.products FOR DELETE USING (true);

-- Category Policies
DROP POLICY IF EXISTS "Allow read categories" ON public.categories;
CREATE POLICY "Allow read categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert categories" ON public.categories;
CREATE POLICY "Allow insert categories" ON public.categories FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update categories" ON public.categories;
CREATE POLICY "Allow update categories" ON public.categories FOR UPDATE USING (true);

-- Warehouses & Locations
DROP POLICY IF EXISTS "Allow read warehouses" ON public.warehouses;
CREATE POLICY "Allow read warehouses" ON public.warehouses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow read locations" ON public.locations;
CREATE POLICY "Allow read locations" ON public.locations FOR SELECT USING (true);

-- Stock Policies
DROP POLICY IF EXISTS "Allow read stock" ON public.stock;
CREATE POLICY "Allow read stock" ON public.stock FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert stock" ON public.stock;
CREATE POLICY "Allow insert stock" ON public.stock FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update stock" ON public.stock;
CREATE POLICY "Allow update stock" ON public.stock FOR UPDATE USING (true);

-- Stock Ledger Policies
DROP POLICY IF EXISTS "Allow read stock_ledger" ON public.stock_ledger;
CREATE POLICY "Allow read stock_ledger" ON public.stock_ledger FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert stock_ledger" ON public.stock_ledger;
CREATE POLICY "Allow insert stock_ledger" ON public.stock_ledger FOR INSERT WITH CHECK (true);

-- 3. Stored Procedure for Recording Initial Stock / Inventory Movement Transaction
CREATE OR REPLACE FUNCTION public.record_initial_inventory(
    p_product_id UUID,
    p_warehouse_id UUID,
    p_location_id UUID,
    p_quantity NUMERIC,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_stock_id UUID;
    v_new_on_hand NUMERIC;
    v_ref TEXT;
    v_sku TEXT;
BEGIN
    IF p_quantity <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Initial quantity must be greater than zero');
    END IF;

    -- Get product SKU for reference
    SELECT sku INTO v_sku FROM public.products WHERE id = p_product_id;
    IF v_sku IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Product not found');
    END IF;

    v_ref := 'INIT/' || v_sku;

    -- Upsert stock record
    INSERT INTO public.stock (product_id, warehouse_id, location_id, on_hand, reserved, updated_at)
    VALUES (p_product_id, p_warehouse_id, p_location_id, p_quantity, 0, now())
    ON CONFLICT (product_id, warehouse_id, location_id) DO UPDATE
    SET on_hand = public.stock.on_hand + EXCLUDED.on_hand,
        updated_at = now()
    RETURNING id, on_hand INTO v_stock_id, v_new_on_hand;

    -- Insert into Stock Ledger Audit Trail
    INSERT INTO public.stock_ledger (
        entry_type,
        reference,
        product_id,
        warehouse_id,
        location_id,
        quantity_change,
        balance_after,
        user_id,
        created_at
    )
    VALUES (
        'initial',
        v_ref,
        p_product_id,
        p_warehouse_id,
        p_location_id,
        p_quantity,
        v_new_on_hand,
        p_user_id,
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'stock_id', v_stock_id,
        'on_hand', v_new_on_hand,
        'reference', v_ref
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
