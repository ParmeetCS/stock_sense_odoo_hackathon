-- StockSense Receipts Module & Atomic Transactional Completion
-- Migration: 20260926000005_receipts_and_completion.sql

-- 1. Enhance receipts table columns
ALTER TABLE public.receipts
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS received_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS contact TEXT;

-- 2. Comprehensive RLS Policies for Receipts & Receipt Items
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Receipts RLS
DROP POLICY IF EXISTS "Allow read receipts" ON public.receipts;
CREATE POLICY "Allow read receipts" ON public.receipts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert receipts" ON public.receipts;
CREATE POLICY "Allow insert receipts" ON public.receipts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update receipts" ON public.receipts;
CREATE POLICY "Allow update receipts" ON public.receipts FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete receipts" ON public.receipts;
CREATE POLICY "Allow delete receipts" ON public.receipts FOR DELETE USING (true);

-- Receipt Items RLS
DROP POLICY IF EXISTS "Allow read receipt_items" ON public.receipt_items;
CREATE POLICY "Allow read receipt_items" ON public.receipt_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert receipt_items" ON public.receipt_items;
CREATE POLICY "Allow insert receipt_items" ON public.receipt_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update receipt_items" ON public.receipt_items;
CREATE POLICY "Allow update receipt_items" ON public.receipt_items FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete receipt_items" ON public.receipt_items;
CREATE POLICY "Allow delete receipt_items" ON public.receipt_items FOR DELETE USING (true);

-- Suppliers RLS
DROP POLICY IF EXISTS "Allow read suppliers" ON public.suppliers;
CREATE POLICY "Allow read suppliers" ON public.suppliers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert suppliers" ON public.suppliers;
CREATE POLICY "Allow insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update suppliers" ON public.suppliers;
CREATE POLICY "Allow update suppliers" ON public.suppliers FOR UPDATE USING (true);

-- 3. Atomic Transactional RPC for Receipt Completion
CREATE OR REPLACE FUNCTION public.complete_receipt(
    p_receipt_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_receipt RECORD;
    v_item RECORD;
    v_stock_id UUID;
    v_new_on_hand NUMERIC;
    v_qty_to_receive NUMERIC;
    v_items_processed INT := 0;
BEGIN
    -- 1. Fetch and lock receipt
    SELECT * INTO v_receipt
    FROM public.receipts
    WHERE id = p_receipt_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Receipt not found.');
    END IF;

    -- Prevent duplicate completion
    IF v_receipt.status = 'done' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Receipt is already completed and validated.');
    END IF;

    -- Prevent completing canceled receipts
    IF v_receipt.status = 'canceled' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot validate a canceled receipt.');
    END IF;

    -- Validate Destination Warehouse and Location
    IF v_receipt.warehouse_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Destination warehouse is required.');
    END IF;

    IF v_receipt.destination_location_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Destination bin location is required.');
    END IF;

    -- Verify location belongs to the warehouse
    PERFORM id FROM public.locations 
    WHERE id = v_receipt.destination_location_id AND warehouse_id = v_receipt.warehouse_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Destination location does not belong to the selected warehouse.');
    END IF;

    -- 2. Process each receipt line item atomically
    FOR v_item IN 
        SELECT * FROM public.receipt_items 
        WHERE receipt_id = p_receipt_id
    LOOP
        -- Determine quantity to book
        v_qty_to_receive := CASE 
            WHEN v_item.quantity_received > 0 THEN v_item.quantity_received 
            ELSE v_item.quantity_expected 
        END;

        IF v_qty_to_receive <= 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Quantity received must be greater than zero for all items.');
        END IF;

        -- Update receipt_item received quantity if not set
        IF v_item.quantity_received <= 0 THEN
            UPDATE public.receipt_items 
            SET quantity_received = v_qty_to_receive 
            WHERE id = v_item.id;
        END IF;

        -- Upsert stock record for product + warehouse + location
        INSERT INTO public.stock (product_id, warehouse_id, location_id, on_hand, reserved, updated_at)
        VALUES (v_item.product_id, v_receipt.warehouse_id, v_receipt.destination_location_id, v_qty_to_receive, 0, now())
        ON CONFLICT (product_id, warehouse_id, location_id) DO UPDATE
        SET on_hand = public.stock.on_hand + EXCLUDED.on_hand,
            updated_at = now()
        RETURNING id, on_hand INTO v_stock_id, v_new_on_hand;

        -- Insert audit entry into stock_ledger
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
            'receipt',
            v_receipt.reference,
            v_item.product_id,
            v_receipt.warehouse_id,
            v_receipt.destination_location_id,
            v_qty_to_receive,
            v_new_on_hand,
            COALESCE(p_user_id, v_receipt.created_by),
            now()
        );

        v_items_processed := v_items_processed + 1;
    END LOOP;

    IF v_items_processed = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Receipt has no items to process.');
    END IF;

    -- 3. Update Receipt Document Status to 'done'
    UPDATE public.receipts
    SET status = 'done',
        received_date = COALESCE(received_date, now()),
        updated_at = now()
    WHERE id = p_receipt_id;

    RETURN jsonb_build_object(
        'success', true,
        'reference', v_receipt.reference,
        'items_processed', v_items_processed,
        'status', 'done'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
