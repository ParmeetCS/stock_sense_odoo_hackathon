-- StockSense Internal Transfers Module & Atomic Transactional Completion
-- Migration: 20260926000006_transfers_and_completion.sql

-- 1. Enhance internal_transfers table columns
ALTER TABLE public.internal_transfers
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS completed_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Comprehensive RLS Policies for Internal Transfers & Items
ALTER TABLE public.internal_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_transfer_items ENABLE ROW LEVEL SECURITY;

-- Internal Transfers RLS
DROP POLICY IF EXISTS "Allow read internal_transfers" ON public.internal_transfers;
CREATE POLICY "Allow read internal_transfers" ON public.internal_transfers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert internal_transfers" ON public.internal_transfers;
CREATE POLICY "Allow insert internal_transfers" ON public.internal_transfers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update internal_transfers" ON public.internal_transfers;
CREATE POLICY "Allow update internal_transfers" ON public.internal_transfers FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete internal_transfers" ON public.internal_transfers;
CREATE POLICY "Allow delete internal_transfers" ON public.internal_transfers FOR DELETE USING (true);

-- Internal Transfer Items RLS
DROP POLICY IF EXISTS "Allow read internal_transfer_items" ON public.internal_transfer_items;
CREATE POLICY "Allow read internal_transfer_items" ON public.internal_transfer_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert internal_transfer_items" ON public.internal_transfer_items;
CREATE POLICY "Allow insert internal_transfer_items" ON public.internal_transfer_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update internal_transfer_items" ON public.internal_transfer_items;
CREATE POLICY "Allow update internal_transfer_items" ON public.internal_transfer_items FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete internal_transfer_items" ON public.internal_transfer_items;
CREATE POLICY "Allow delete internal_transfer_items" ON public.internal_transfer_items FOR DELETE USING (true);

-- 3. Atomic Transactional RPC for Internal Transfer Completion
CREATE OR REPLACE FUNCTION public.complete_transfer(
    p_transfer_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_transfer RECORD;
    v_item RECORD;
    v_source_stock RECORD;
    v_dest_stock_id UUID;
    v_source_new_on_hand NUMERIC;
    v_dest_new_on_hand NUMERIC;
    v_items_processed INT := 0;
    v_effective_user UUID;
BEGIN
    -- 1. Fetch and lock transfer header
    SELECT * INTO v_transfer
    FROM public.internal_transfers
    WHERE id = p_transfer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Internal transfer not found.');
    END IF;

    -- Prevent double completion
    IF v_transfer.status = 'done' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transfer is already completed and validated.');
    END IF;

    -- Prevent validating canceled transfers
    IF v_transfer.status = 'canceled' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot validate a canceled transfer.');
    END IF;

    -- Validate Source & Destination Warehouses and Locations
    IF v_transfer.source_warehouse_id IS NULL OR v_transfer.source_location_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Valid source warehouse and location are required.');
    END IF;

    IF v_transfer.destination_warehouse_id IS NULL OR v_transfer.destination_location_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Valid destination warehouse and location are required.');
    END IF;

    -- Validate Source != Destination
    IF v_transfer.source_warehouse_id = v_transfer.destination_warehouse_id 
       AND v_transfer.source_location_id = v_transfer.destination_location_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Source location and destination location must be different (source != destination).');
    END IF;

    -- Verify source location belongs to source warehouse
    PERFORM id FROM public.locations 
    WHERE id = v_transfer.source_location_id AND warehouse_id = v_transfer.source_warehouse_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Source location does not belong to the selected source warehouse.');
    END IF;

    -- Verify destination location belongs to destination warehouse
    PERFORM id FROM public.locations 
    WHERE id = v_transfer.destination_location_id AND warehouse_id = v_transfer.destination_warehouse_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Destination location does not belong to the selected destination warehouse.');
    END IF;

    v_effective_user := COALESCE(p_user_id, v_transfer.responsible_id, v_transfer.created_by);

    -- 2. Process each line item atomically
    FOR v_item IN 
        SELECT * FROM public.internal_transfer_items 
        WHERE transfer_id = p_transfer_id
    LOOP
        IF v_item.quantity <= 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Transfer quantity must be greater than zero for all line items.');
        END IF;

        -- Fetch and lock source stock row
        SELECT id, on_hand, reserved, (on_hand - reserved) AS free_to_use
        INTO v_source_stock
        FROM public.stock
        WHERE product_id = v_item.product_id
          AND warehouse_id = v_transfer.source_warehouse_id
          AND location_id = v_transfer.source_location_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', format('No stock record exists for product ID %s at the source location. Available: 0, Requested: %s.', v_item.product_id, v_item.quantity)
            );
        END IF;

        -- Validate Free To Use Stock
        IF v_source_stock.free_to_use < v_item.quantity THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Insufficient Free To Use stock at source location. Available: %s, Requested: %s.', v_source_stock.free_to_use, v_item.quantity)
            );
        END IF;

        -- Atomically decrease source stock
        UPDATE public.stock
        SET on_hand = on_hand - v_item.quantity,
            updated_at = now()
        WHERE id = v_source_stock.id
        RETURNING on_hand INTO v_source_new_on_hand;

        -- Atomically increase destination stock (upsert)
        INSERT INTO public.stock (product_id, warehouse_id, location_id, on_hand, reserved, updated_at)
        VALUES (v_item.product_id, v_transfer.destination_warehouse_id, v_transfer.destination_location_id, v_item.quantity, 0, now())
        ON CONFLICT (product_id, warehouse_id, location_id) DO UPDATE
        SET on_hand = public.stock.on_hand + EXCLUDED.on_hand,
            updated_at = now()
        RETURNING id, on_hand INTO v_dest_stock_id, v_dest_new_on_hand;

        -- Insert audit entry into stock_ledger for Source Outbound (-quantity)
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
            'transfer_out',
            v_transfer.reference,
            v_item.product_id,
            v_transfer.source_warehouse_id,
            v_transfer.source_location_id,
            -v_item.quantity,
            v_source_new_on_hand,
            v_effective_user,
            now()
        );

        -- Insert audit entry into stock_ledger for Destination Inbound (+quantity)
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
            'transfer_in',
            v_transfer.reference,
            v_item.product_id,
            v_transfer.destination_warehouse_id,
            v_transfer.destination_location_id,
            v_item.quantity,
            v_dest_new_on_hand,
            v_effective_user,
            now()
        );

        v_items_processed := v_items_processed + 1;
    END LOOP;

    IF v_items_processed = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Internal transfer has no items to process.');
    END IF;

    -- 3. Update Transfer Document Status to 'done'
    UPDATE public.internal_transfers
    SET status = 'done',
        completed_date = COALESCE(completed_date, now()),
        updated_at = now()
    WHERE id = p_transfer_id;

    RETURN jsonb_build_object(
        'success', true,
        'reference', v_transfer.reference,
        'items_processed', v_items_processed,
        'status', 'done'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
