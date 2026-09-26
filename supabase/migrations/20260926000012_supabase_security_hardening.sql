-- StockSense Security Audit, Authorization & Hardening Migration
-- Migration: 20260926000012_supabase_security_hardening.sql

-- 1. Authorization Helper Functions (Server-Side Role Checks)
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.role() = 'authenticated';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role AS $$
DECLARE
    v_role public.user_role;
BEGIN
    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN COALESCE(v_role, 'inventory_user'::public.user_role);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN AS $$
DECLARE
    v_role public.user_role;
BEGIN
    IF NOT public.is_authenticated() THEN
        RETURN FALSE;
    END IF;
    
    v_role := public.get_current_user_role();
    RETURN v_role IN ('admin'::public.user_role, 'manager'::public.user_role);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Secure RPC Functions with Explicit Authorization Checks & Search Path Standard
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
    v_effective_user UUID;
BEGIN
    -- Authorization Check: Must be authenticated user with manager/admin/inventory_user role (audit_viewer cannot modify stock)
    IF NOT public.is_authenticated() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Authentication required.');
    END IF;

    IF public.get_current_user_role() = 'audit_viewer'::public.user_role THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Audit viewers do not have permission to receive inventory.');
    END IF;

    -- Fetch and lock receipt
    SELECT * INTO v_receipt
    FROM public.receipts
    WHERE id = p_receipt_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Receipt not found.');
    END IF;

    IF v_receipt.status = 'done' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Receipt is already completed and validated.');
    END IF;

    IF v_receipt.status = 'canceled' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot validate a canceled receipt.');
    END IF;

    IF v_receipt.warehouse_id IS NULL OR v_receipt.destination_location_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Destination warehouse and location are required.');
    END IF;

    PERFORM id FROM public.locations 
    WHERE id = v_receipt.destination_location_id AND warehouse_id = v_receipt.warehouse_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Destination location does not belong to the selected warehouse.');
    END IF;

    v_effective_user := COALESCE(auth.uid(), p_user_id, v_receipt.created_by);

    FOR v_item IN 
        SELECT * FROM public.receipt_items 
        WHERE receipt_id = p_receipt_id
    LOOP
        v_qty_to_receive := CASE 
            WHEN v_item.quantity_received > 0 THEN v_item.quantity_received 
            ELSE v_item.quantity_expected 
        END;

        IF v_qty_to_receive <= 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Quantity received must be greater than zero for all items.');
        END IF;

        IF v_item.quantity_received <= 0 THEN
            UPDATE public.receipt_items 
            SET quantity_received = v_qty_to_receive 
            WHERE id = v_item.id;
        END IF;

        INSERT INTO public.stock (product_id, warehouse_id, location_id, on_hand, reserved, updated_at)
        VALUES (v_item.product_id, v_receipt.warehouse_id, v_receipt.destination_location_id, v_qty_to_receive, 0, now())
        ON CONFLICT (product_id, warehouse_id, location_id) DO UPDATE
        SET on_hand = public.stock.on_hand + EXCLUDED.on_hand,
            updated_at = now()
        RETURNING id, on_hand INTO v_stock_id, v_new_on_hand;

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
            v_effective_user,
            now()
        );

        v_items_processed := v_items_processed + 1;
    END LOOP;

    IF v_items_processed = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Receipt has no items to process.');
    END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
    IF NOT public.is_authenticated() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Authentication required.');
    END IF;

    IF public.get_current_user_role() = 'audit_viewer'::public.user_role THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Audit viewers do not have permission to dispatch deliveries.');
    END IF;

    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE id = p_delivery_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Delivery order not found.');
    END IF;

    IF v_delivery.status = 'done' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Delivery order is already completed and validated.');
    END IF;

    IF v_delivery.status = 'canceled' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot validate a canceled delivery order.');
    END IF;

    IF v_delivery.warehouse_id IS NULL OR v_delivery.source_location_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Source warehouse and location are required.');
    END IF;

    PERFORM id FROM public.locations 
    WHERE id = v_delivery.source_location_id AND warehouse_id = v_delivery.warehouse_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Source location does not belong to the selected warehouse.');
    END IF;

    v_effective_user := COALESCE(auth.uid(), p_user_id, v_delivery.created_by);

    FOR v_item IN 
        SELECT * FROM public.delivery_items 
        WHERE delivery_id = p_delivery_id
    LOOP
        v_qty_to_deliver := CASE 
            WHEN v_item.quantity_delivered > 0 THEN v_item.quantity_delivered 
            ELSE v_item.quantity_demanded 
        END;

        IF v_qty_to_deliver <= 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Quantity delivered must be greater than zero.');
        END IF;

        IF v_item.quantity_delivered <= 0 THEN
            UPDATE public.delivery_items 
            SET quantity_delivered = v_qty_to_deliver 
            WHERE id = v_item.id;
        END IF;

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
                'error', format('No stock record exists for product at the source location. Demanded: %s.', v_qty_to_deliver)
            );
        END IF;

        IF v_source_stock.free_to_use < v_qty_to_deliver THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Insufficient stock at source location. Available free: %s, Demanded: %s.', v_source_stock.free_to_use, v_qty_to_deliver)
            );
        END IF;

        UPDATE public.stock
        SET on_hand = on_hand - v_qty_to_deliver,
            updated_at = now()
        WHERE id = v_source_stock.id
        RETURNING on_hand INTO v_new_on_hand;

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
        RETURN jsonb_build_object('success', false, 'error', 'Delivery order has no items to process.');
    END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
    IF NOT public.is_authenticated() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Authentication required.');
    END IF;

    IF public.get_current_user_role() = 'audit_viewer'::public.user_role THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Audit viewers do not have permission to execute transfers.');
    END IF;

    SELECT * INTO v_transfer
    FROM public.internal_transfers
    WHERE id = p_transfer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Internal transfer not found.');
    END IF;

    IF v_transfer.status = 'done' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transfer is already completed and validated.');
    END IF;

    IF v_transfer.status = 'canceled' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot validate a canceled transfer.');
    END IF;

    IF v_transfer.source_warehouse_id IS NULL OR v_transfer.source_location_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Source warehouse and location are required.');
    END IF;

    IF v_transfer.destination_warehouse_id IS NULL OR v_transfer.destination_location_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Destination warehouse and location are required.');
    END IF;

    IF v_transfer.source_warehouse_id = v_transfer.destination_warehouse_id 
       AND v_transfer.source_location_id = v_transfer.destination_location_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Source and destination locations must be different.');
    END IF;

    PERFORM id FROM public.locations 
    WHERE id = v_transfer.source_location_id AND warehouse_id = v_transfer.source_warehouse_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Source location does not belong to selected source warehouse.');
    END IF;

    PERFORM id FROM public.locations 
    WHERE id = v_transfer.destination_location_id AND warehouse_id = v_transfer.destination_warehouse_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Destination location does not belong to selected destination warehouse.');
    END IF;

    v_effective_user := COALESCE(auth.uid(), p_user_id, v_transfer.responsible_id, v_transfer.created_by);

    FOR v_item IN 
        SELECT * FROM public.internal_transfer_items 
        WHERE transfer_id = p_transfer_id
    LOOP
        IF v_item.quantity <= 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Transfer quantity must be greater than zero.');
        END IF;

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
                'error', format('No stock record exists at source location for product. Requested: %s.', v_item.quantity)
            );
        END IF;

        IF v_source_stock.free_to_use < v_item.quantity THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Insufficient free stock at source location. Available: %s, Requested: %s.', v_source_stock.free_to_use, v_item.quantity)
            );
        END IF;

        UPDATE public.stock
        SET on_hand = on_hand - v_item.quantity,
            updated_at = now()
        WHERE id = v_source_stock.id
        RETURNING on_hand INTO v_source_new_on_hand;

        INSERT INTO public.stock (product_id, warehouse_id, location_id, on_hand, reserved, updated_at)
        VALUES (v_item.product_id, v_transfer.destination_warehouse_id, v_transfer.destination_location_id, v_item.quantity, 0, now())
        ON CONFLICT (product_id, warehouse_id, location_id) DO UPDATE
        SET on_hand = public.stock.on_hand + EXCLUDED.on_hand,
            updated_at = now()
        RETURNING id, on_hand INTO v_dest_stock_id, v_dest_new_on_hand;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
    -- Authorization Check: Inventory Adjustments require Manager or Admin privilege
    IF NOT public.is_manager_or_admin() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Inventory adjustments require Manager or Admin privilege.');
    END IF;

    SELECT * INTO v_adj
    FROM public.inventory_adjustments
    WHERE id = p_adjustment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Inventory adjustment record not found.');
    END IF;

    IF v_adj.status = 'done' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Adjustment has already been validated.');
    END IF;

    IF v_adj.status = 'canceled' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot validate a canceled adjustment.');
    END IF;

    IF v_adj.real_quantity IS NULL OR v_adj.real_quantity < 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Counted quantity must be non-negative.');
    END IF;

    IF v_adj.product_id IS NULL OR v_adj.warehouse_id IS NULL OR v_adj.location_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Product, warehouse, and location are required.');
    END IF;

    PERFORM id FROM public.locations
    WHERE id = v_adj.location_id AND warehouse_id = v_adj.warehouse_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Location does not belong to selected warehouse.');
    END IF;

    v_effective_user := COALESCE(auth.uid(), p_user_id, v_adj.responsible_id, v_adj.created_by);
    v_diff := v_adj.real_quantity - v_adj.theoretical_quantity;

    INSERT INTO public.stock (product_id, warehouse_id, location_id, on_hand, reserved, updated_at)
    VALUES (v_adj.product_id, v_adj.warehouse_id, v_adj.location_id, v_adj.real_quantity, 0, now())
    ON CONFLICT (product_id, warehouse_id, location_id) DO UPDATE
    SET on_hand = EXCLUDED.on_hand,
        updated_at = now()
    RETURNING on_hand INTO v_new_on_hand;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Strict Audit Log Protection
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Prevent update stock_ledger" ON public.stock_ledger;
CREATE POLICY "Prevent update stock_ledger" ON public.stock_ledger FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Prevent delete stock_ledger" ON public.stock_ledger;
CREATE POLICY "Prevent delete stock_ledger" ON public.stock_ledger FOR DELETE USING (false);
