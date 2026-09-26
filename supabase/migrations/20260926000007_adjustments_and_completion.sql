-- StockSense Inventory Adjustments Module & Atomic Transactional Completion
-- Migration: 20260926000007_adjustments_and_completion.sql

-- 1. Enhance inventory_adjustments table columns
ALTER TABLE public.inventory_adjustments
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS completed_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. RLS Policies for Inventory Adjustments
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read inventory_adjustments" ON public.inventory_adjustments;
CREATE POLICY "Allow read inventory_adjustments" ON public.inventory_adjustments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert inventory_adjustments" ON public.inventory_adjustments;
CREATE POLICY "Allow insert inventory_adjustments" ON public.inventory_adjustments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update inventory_adjustments" ON public.inventory_adjustments;
CREATE POLICY "Allow update inventory_adjustments" ON public.inventory_adjustments FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete inventory_adjustments" ON public.inventory_adjustments;
CREATE POLICY "Allow delete inventory_adjustments" ON public.inventory_adjustments FOR DELETE USING (true);

-- 3. Atomic Transactional RPC for Inventory Adjustment Completion
CREATE OR REPLACE FUNCTION public.complete_adjustment(
    p_adjustment_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_adj RECORD;
    v_stock RECORD;
    v_diff NUMERIC;
    v_effective_user UUID;
    v_new_on_hand NUMERIC;
BEGIN
    -- 1. Lock inventory adjustment header
    SELECT * INTO v_adj
    FROM public.inventory_adjustments
    WHERE id = p_adjustment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Inventory adjustment record not found.');
    END IF;

    -- Prevent double completion
    IF v_adj.status = 'done' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Adjustment has already been validated and processed.');
    END IF;

    -- Prevent validating canceled adjustments
    IF v_adj.status = 'canceled' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot validate a canceled inventory adjustment.');
    END IF;

    -- Validate Counted Quantity >= 0
    IF v_adj.real_quantity IS NULL OR v_adj.real_quantity < 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Counted quantity must be non-negative (>= 0).');
    END IF;

    -- Validate Product, Warehouse and Location
    IF v_adj.product_id IS NULL OR v_adj.warehouse_id IS NULL OR v_adj.location_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Valid product, warehouse, and location are required.');
    END IF;

    -- Verify location belongs to warehouse
    PERFORM id FROM public.locations
    WHERE id = v_adj.location_id AND warehouse_id = v_adj.warehouse_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Location does not belong to the selected warehouse.');
    END IF;

    v_effective_user := COALESCE(p_user_id, v_adj.responsible_id, v_adj.created_by);

    -- Calculate difference: Counted - Recorded
    v_diff := v_adj.real_quantity - v_adj.theoretical_quantity;

    -- 2. Atomically update stock record for product + warehouse + location
    INSERT INTO public.stock (product_id, warehouse_id, location_id, on_hand, reserved, updated_at)
    VALUES (v_adj.product_id, v_adj.warehouse_id, v_adj.location_id, v_adj.real_quantity, 0, now())
    ON CONFLICT (product_id, warehouse_id, location_id) DO UPDATE
    SET on_hand = EXCLUDED.on_hand,
        updated_at = now()
    RETURNING on_hand INTO v_new_on_hand;

    -- 3. Create audit trail entry in stock_ledger
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
        'adjustment',
        v_adj.reference,
        v_adj.product_id,
        v_adj.warehouse_id,
        v_adj.location_id,
        v_diff,
        v_new_on_hand,
        v_effective_user,
        now()
    );

    -- 4. Mark adjustment status as 'done'
    UPDATE public.inventory_adjustments
    SET status = 'done',
        completed_date = COALESCE(completed_date, now()),
        updated_at = now()
    WHERE id = p_adjustment_id;

    RETURN jsonb_build_object(
        'success', true,
        'reference', v_adj.reference,
        'difference', v_diff,
        'counted_quantity', v_adj.real_quantity,
        'status', 'done'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
