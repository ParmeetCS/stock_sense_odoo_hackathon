-- StockSense Complete Inventory Engine Audit & Delivery RPC Migration
-- Migration: 20260926000010_inventory_engine_audit_and_delivery.sql

-- 1. Ensure Table Check Constraints and Columns for Deliveries & Inventory
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS delivered_date TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_stock_on_hand_non_negative'
    ) THEN
        ALTER TABLE public.stock ADD CONSTRAINT check_stock_on_hand_non_negative CHECK (on_hand >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_stock_reserved_non_negative'
    ) THEN
        ALTER TABLE public.stock ADD CONSTRAINT check_stock_reserved_non_negative CHECK (reserved >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_stock_reserved_lte_on_hand'
    ) THEN
        ALTER TABLE public.stock ADD CONSTRAINT check_stock_reserved_lte_on_hand CHECK (reserved <= on_hand);
    END IF;
END $$;

-- 2. Atomic Transactional RPC for Outbound Delivery Completion
CREATE OR REPLACE FUNCTION public.complete_delivery(
    p_delivery_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_delivery RECORD;
    v_item RECORD;
    v_source_stock RECORD;
    v_new_on_hand NUMERIC;
    v_qty_to_deliver NUMERIC;
    v_items_processed INT := 0;
    v_effective_user UUID;
BEGIN
    -- 1. Fetch and lock delivery header
    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE id = p_delivery_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Delivery order not found.');
    END IF;

    -- Prevent double completion
    IF v_delivery.status = 'done' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Delivery order is already completed and validated.');
    END IF;

    -- Prevent completing canceled deliveries
    IF v_delivery.status = 'canceled' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot validate a canceled delivery order.');
    END IF;

    -- Validate Source Warehouse and Location
    IF v_delivery.warehouse_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Source warehouse is required for delivery.');
    END IF;

    IF v_delivery.source_location_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Source location is required for delivery.');
    END IF;

    -- Verify source location belongs to the specified warehouse
    PERFORM id FROM public.locations 
    WHERE id = v_delivery.source_location_id AND warehouse_id = v_delivery.warehouse_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Source location does not belong to the selected source warehouse.');
    END IF;

    v_effective_user := COALESCE(p_user_id, v_delivery.created_by);

    -- 2. Process each delivery line item atomically
    FOR v_item IN 
        SELECT * FROM public.delivery_items 
        WHERE delivery_id = p_delivery_id
    LOOP
        -- Determine quantity to deliver
        v_qty_to_deliver := CASE 
            WHEN v_item.quantity_delivered > 0 THEN v_item.quantity_delivered 
            ELSE v_item.quantity_demanded 
        END;

        IF v_qty_to_deliver <= 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Quantity delivered must be greater than zero for all items.');
        END IF;

        -- Update delivery_item delivered quantity if not set
        IF v_item.quantity_delivered <= 0 THEN
            UPDATE public.delivery_items 
            SET quantity_delivered = v_qty_to_deliver 
            WHERE id = v_item.id;
        END IF;

        -- Fetch and lock source stock row
        SELECT id, on_hand, reserved, (on_hand - reserved) AS free_to_use
        INTO v_source_stock
        FROM public.stock
        WHERE product_id = v_item.product_id
          AND warehouse_id = v_delivery.warehouse_id
          AND location_id = v_delivery.source_location_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', format('No stock record exists for product at the specified source location. Available: 0, Requested: %s.', v_qty_to_deliver)
            );
        END IF;

        -- Verify sufficient Free To Use stock
        IF v_source_stock.free_to_use < v_qty_to_deliver THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Insufficient stock at source location. Available free stock: %s, Demanded: %s.', v_source_stock.free_to_use, v_qty_to_deliver)
            );
        END IF;

        -- Atomically decrease stock on_hand
        UPDATE public.stock
        SET on_hand = on_hand - v_qty_to_deliver,
            updated_at = now()
        WHERE id = v_source_stock.id
        RETURNING on_hand INTO v_new_on_hand;

        -- Insert audit entry into stock_ledger (-quantity)
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
            'delivery',
            v_delivery.reference,
            v_item.product_id,
            v_delivery.warehouse_id,
            v_delivery.source_location_id,
            -v_qty_to_deliver,
            v_new_on_hand,
            v_effective_user,
            now()
        );

        v_items_processed := v_items_processed + 1;
    END LOOP;

    IF v_items_processed = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Delivery order has no line items to process.');
    END IF;

    -- 3. Update Delivery Document Status to 'done'
    UPDATE public.deliveries
    SET status = 'done',
        delivered_date = COALESCE(delivered_date, now()),
        updated_at = now()
    WHERE id = p_delivery_id;

    RETURN jsonb_build_object(
        'success', true,
        'reference', v_delivery.reference,
        'items_processed', v_items_processed,
        'status', 'done'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Audit & Enforce Strict Immutability & Permissions on stock_ledger
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Prevent update stock_ledger" ON public.stock_ledger;
CREATE POLICY "Prevent update stock_ledger" ON public.stock_ledger FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Prevent delete stock_ledger" ON public.stock_ledger;
CREATE POLICY "Prevent delete stock_ledger" ON public.stock_ledger FOR DELETE USING (false);

-- Grant execution privileges on completion functions to authenticated users
GRANT EXECUTE ON FUNCTION public.complete_receipt(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_delivery(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_transfer(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_adjustment(UUID, UUID) TO authenticated;
