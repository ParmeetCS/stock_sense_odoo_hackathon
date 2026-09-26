-- StockSense Dashboard Analytics & Real Data RPC Functions
-- Migration: 20260926000009_dashboard_rpc_views.sql

-- 1. Ensure scheduled_date exists on deliveries table
ALTER TABLE public.deliveries
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ;

-- 2. Dashboard KPIs Function
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(
    p_warehouse_id UUID DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_date_range TEXT DEFAULT '7d'
)
RETURNS JSONB AS $$
DECLARE
    v_date_from TIMESTAMPTZ;
    v_total_in_stock INT := 0;
    v_low_stock INT := 0;
    v_out_of_stock INT := 0;
    v_pending_receipts INT := 0;
    v_pending_deliveries INT := 0;
    v_scheduled_transfers INT := 0;
BEGIN
    -- Determine date threshold
    IF p_date_range = '7d' THEN
        v_date_from := now() - INTERVAL '7 days';
    ELSIF p_date_range = '30d' THEN
        v_date_from := now() - INTERVAL '30 days';
    ELSIF p_date_range = '90d' THEN
        v_date_from := now() - INTERVAL '90 days';
    ELSE
        v_date_from := NULL;
    END IF;

    -- 1. Total products in stock (on_hand > 0)
    SELECT COUNT(DISTINCT s.product_id) INTO v_total_in_stock
    FROM public.stock s
    JOIN public.products p ON p.id = s.product_id
    WHERE s.on_hand > 0
      AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
      AND (p_category_id IS NULL OR p.category_id = p_category_id);

    -- 2. Low stock items (total_on_hand > 0 AND total_on_hand <= reorder_level)
    SELECT COUNT(*) INTO v_low_stock
    FROM (
        SELECT s.product_id, SUM(s.on_hand) AS total_on_hand, p.reorder_level
        FROM public.stock s
        JOIN public.products p ON p.id = s.product_id
        WHERE (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
          AND (p_category_id IS NULL OR p.category_id = p_category_id)
        GROUP BY s.product_id, p.reorder_level
        HAVING SUM(s.on_hand) > 0 AND SUM(s.on_hand) <= p.reorder_level
    ) low_q;

    -- 3. Out of stock items (active products with total_on_hand = 0 or no stock entry)
    SELECT COUNT(*) INTO v_out_of_stock
    FROM public.products p
    WHERE p.is_active = true
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (
        NOT EXISTS (
            SELECT 1 FROM public.stock s
            WHERE s.product_id = p.id
              AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
        )
        OR (
            SELECT COALESCE(SUM(s.on_hand), 0)
            FROM public.stock s
            WHERE s.product_id = p.id
              AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
        ) = 0
      );

    -- 4. Pending Receipts (status in draft, waiting, ready)
    SELECT COUNT(*) INTO v_pending_receipts
    FROM public.receipts r
    WHERE r.status IN ('draft', 'waiting', 'ready')
      AND (p_warehouse_id IS NULL OR r.warehouse_id = p_warehouse_id)
      AND (p_status IS NULL OR p_status = '' OR r.status = p_status::public.order_status)
      AND (v_date_from IS NULL OR r.created_at >= v_date_from);

    -- 5. Pending Deliveries (status in draft, waiting, ready)
    SELECT COUNT(*) INTO v_pending_deliveries
    FROM public.deliveries d
    WHERE d.status IN ('draft', 'waiting', 'ready')
      AND (p_warehouse_id IS NULL OR d.warehouse_id = p_warehouse_id)
      AND (p_status IS NULL OR p_status = '' OR d.status = p_status::public.order_status)
      AND (v_date_from IS NULL OR d.created_at >= v_date_from);

    -- 6. Scheduled Transfers (status in draft, waiting, ready)
    SELECT COUNT(*) INTO v_scheduled_transfers
    FROM public.internal_transfers t
    WHERE t.status IN ('draft', 'waiting', 'ready')
      AND (p_warehouse_id IS NULL OR t.source_warehouse_id = p_warehouse_id OR t.destination_warehouse_id = p_warehouse_id)
      AND (p_status IS NULL OR p_status = '' OR t.status = p_status::public.order_status)
      AND (v_date_from IS NULL OR t.created_at >= v_date_from);

    RETURN jsonb_build_object(
        'totalProductsInStock', v_total_in_stock,
        'lowStockItemsCount', v_low_stock,
        'outOfStockItemsCount', v_out_of_stock,
        'pendingReceiptsCount', v_pending_receipts,
        'pendingDeliveriesCount', v_pending_deliveries,
        'scheduledTransfersCount', v_scheduled_transfers
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Operations Breakdown Cards Function
CREATE OR REPLACE FUNCTION public.get_dashboard_operations(
    p_warehouse_id UUID DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_date_range TEXT DEFAULT '7d'
)
RETURNS JSONB AS $$
DECLARE
    v_date_from TIMESTAMPTZ;
    v_r_to_receive INT := 0;
    v_r_late INT := 0;
    v_r_waiting INT := 0;
    v_d_to_deliver INT := 0;
    v_d_late INT := 0;
    v_d_waiting INT := 0;
BEGIN
    IF p_date_range = '7d' THEN
        v_date_from := now() - INTERVAL '7 days';
    ELSIF p_date_range = '30d' THEN
        v_date_from := now() - INTERVAL '30 days';
    ELSIF p_date_range = '90d' THEN
        v_date_from := now() - INTERVAL '90 days';
    ELSE
        v_date_from := NULL;
    END IF;

    -- Receipts
    SELECT 
        COUNT(*) FILTER (WHERE r.status = 'ready') AS to_receive,
        COUNT(*) FILTER (WHERE r.status = 'waiting') AS waiting,
        COUNT(*) FILTER (WHERE r.status NOT IN ('done', 'canceled') AND r.scheduled_date IS NOT NULL AND r.scheduled_date < now()) AS late
    INTO v_r_to_receive, v_r_waiting, v_r_late
    FROM public.receipts r
    WHERE (p_warehouse_id IS NULL OR r.warehouse_id = p_warehouse_id)
      AND (p_status IS NULL OR p_status = '' OR r.status = p_status::public.order_status)
      AND (v_date_from IS NULL OR r.created_at >= v_date_from);

    -- Deliveries
    SELECT 
        COUNT(*) FILTER (WHERE d.status = 'ready') AS to_deliver,
        COUNT(*) FILTER (WHERE d.status = 'waiting') AS waiting,
        COUNT(*) FILTER (WHERE d.status NOT IN ('done', 'canceled') AND d.scheduled_date IS NOT NULL AND d.scheduled_date < now()) AS late
    INTO v_d_to_deliver, v_d_waiting, v_d_late
    FROM public.deliveries d
    WHERE (p_warehouse_id IS NULL OR d.warehouse_id = p_warehouse_id)
      AND (p_status IS NULL OR p_status = '' OR d.status = p_status::public.order_status)
      AND (v_date_from IS NULL OR d.created_at >= v_date_from);

    RETURN jsonb_build_object(
        'receipts', jsonb_build_object(
            'toReceive', COALESCE(v_r_to_receive, 0),
            'late', COALESCE(v_r_late, 0),
            'waiting', COALESCE(v_r_waiting, 0)
        ),
        'deliveries', jsonb_build_object(
            'toDeliver', COALESCE(v_d_to_deliver, 0),
            'late', COALESCE(v_d_late, 0),
            'waiting', COALESCE(v_d_waiting, 0)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Chart Data Function
CREATE OR REPLACE FUNCTION public.get_dashboard_chart_data(
    p_warehouse_id UUID DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_date_range TEXT DEFAULT '7d'
)
RETURNS JSONB AS $$
DECLARE
    v_days_count INT := 7;
    v_result JSONB := '[]'::jsonb;
BEGIN
    IF p_date_range = '30d' THEN
        v_days_count := 30;
    ELSIF p_date_range = '90d' THEN
        v_days_count := 90;
    ELSE
        v_days_count := 7;
    END IF;

    WITH dates AS (
        SELECT generate_series(
            (current_date - (v_days_count - 1) * INTERVAL '1 day')::date,
            current_date::date,
            INTERVAL '1 day'
        )::date AS d_date
    ),
    ledger_agg AS (
        SELECT 
            sl.created_at::date AS m_date,
            SUM(CASE WHEN sl.entry_type IN ('receipt', 'transfer_in', 'initial') OR (sl.entry_type = 'adjustment' AND sl.quantity_change > 0) THEN ABS(sl.quantity_change) ELSE 0 END) AS incoming,
            SUM(CASE WHEN sl.entry_type IN ('delivery', 'transfer_out') OR (sl.entry_type = 'adjustment' AND sl.quantity_change < 0) THEN ABS(sl.quantity_change) ELSE 0 END) AS outgoing,
            SUM(ABS(sl.quantity_change)) AS total_movement
        FROM public.stock_ledger sl
        JOIN public.products p ON p.id = sl.product_id
        WHERE (p_warehouse_id IS NULL OR sl.warehouse_id = p_warehouse_id)
          AND (p_category_id IS NULL OR p.category_id = p_category_id)
          AND sl.created_at >= (current_date - (v_days_count - 1) * INTERVAL '1 day')
        GROUP BY sl.created_at::date
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', to_char(d.d_date, 'Mon DD'),
            'incoming', COALESCE(l.incoming, 0),
            'outgoing', COALESCE(l.outgoing, 0),
            'totalMovement', COALESCE(l.total_movement, 0)
        ) ORDER BY d.d_date ASC
    ) INTO v_result
    FROM dates d
    LEFT JOIN ledger_agg l ON l.m_date = d.d_date;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
