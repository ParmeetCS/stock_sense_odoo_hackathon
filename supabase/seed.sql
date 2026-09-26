-- StockSense Development Seed Data
-- Seed: supabase/seed.sql
-- Enforces realistic Indian Rupee (INR ₹) values, non-contradictory stock,
-- exact reference numbers (WH/IN/0001, WH/IN/0002, WH/OUT/0001, WH/OUT/0002, WH/INT/0001, ADJ/0001),
-- and accurate stock ledger audit history.

-- 1. Profiles & Roles (Inventory Manager & Warehouse Staff)
INSERT INTO public.profiles (id, email, phone, full_name, role)
VALUES
    ('66666666-6666-4000-8000-000000000001', 'manager@stocksense.in', '+91-9876543210', 'Rajesh Sharma', 'manager'),
    ('66666666-6666-4000-8000-000000000002', 'staff@stocksense.in', '+91-9876543211', 'Amit Kumar', 'inventory_user')
ON CONFLICT (id) DO UPDATE 
SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- 2. Categories (Steel, Furniture, Hardware)
INSERT INTO public.categories (id, name, code, description)
VALUES
    ('33333333-3333-4000-8000-000000000001', 'Steel', 'CAT-STEEL', 'Raw structural steel, sheets, and industrial rods'),
    ('33333333-3333-4000-8000-000000000002', 'Furniture', 'CAT-FURN', 'Commercial office ergonomic desks, chairs, and tables'),
    ('33333333-3333-4000-8000-000000000003', 'Hardware', 'CAT-HDW', 'Fasteners, industrial bolts, and structural hardware')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, code = EXCLUDED.code, description = EXCLUDED.description;

-- 3. Warehouses (Main Warehouse, Production Warehouse)
INSERT INTO public.warehouses (id, code, name, address)
VALUES
    ('11111111-1111-4000-8000-000000000001', 'WH-MAIN', 'Main Warehouse', 'Plot 42, GIDC Industrial Estate, Sriperumbudur, Tamil Nadu'),
    ('11111111-1111-4000-8000-000000000002', 'WH-PROD', 'Production Warehouse', 'Sector 18, MIDC Manufacturing Zone, Chakan, Pune, Maharashtra')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, address = EXCLUDED.address;

-- 4. Locations (Main Store, Rack A, Rack B, Dispatch Area, Production Floor, Finished Goods)
INSERT INTO public.locations (id, warehouse_id, code, name, type)
VALUES
    ('22222222-2222-4000-8000-000000000001', '11111111-1111-4000-8000-000000000001', 'LOC-MAIN-STORE', 'Main Store', 'internal'),
    ('22222222-2222-4000-8000-000000000002', '11111111-1111-4000-8000-000000000001', 'LOC-RACK-A', 'Rack A', 'internal'),
    ('22222222-2222-4000-8000-000000000003', '11111111-1111-4000-8000-000000000001', 'LOC-RACK-B', 'Rack B', 'internal'),
    ('22222222-2222-4000-8000-000000000004', '11111111-1111-4000-8000-000000000001', 'LOC-DISPATCH', 'Dispatch Area', 'internal'),
    ('22222222-2222-4000-8000-000000000005', '11111111-1111-4000-8000-000000000002', 'LOC-PROD-FLR', 'Production Floor', 'internal'),
    ('22222222-2222-4000-8000-000000000006', '11111111-1111-4000-8000-000000000002', 'LOC-FIN-GOODS', 'Finished Goods', 'internal')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, type = EXCLUDED.type;

-- 5. Suppliers (ABC Steel Suppliers, Industrial Materials Ltd)
INSERT INTO public.suppliers (id, name, code, email, phone, address)
VALUES
    ('44444444-4444-4000-8000-000000000001', 'ABC Steel Suppliers', 'SUP-ABC', 'orders@abcsteel.co.in', '+91-44-28190011', 'Industrial Area Ph-1, Jamshedpur, Jharkhand'),
    ('44444444-4444-4000-8000-000000000002', 'Industrial Materials Ltd', 'SUP-IND', 'sales@indmaterials.in', '+91-22-67123400', 'Nariman Point, Mumbai, Maharashtra')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone;

-- 6. Products (Indian Rupee INR Values)
INSERT INTO public.products (id, sku, name, description, category_id, unit_of_measure, cost_price, sale_price, reorder_level)
VALUES
    ('55555555-5555-4000-8000-000000000001', 'STL-ROD-01', 'Steel Rods', 'High tensile reinforced TMT steel rods 12mm', '33333333-3333-4000-8000-000000000001', 'Meters', 450.00, 750.00, 50.00),
    ('55555555-5555-4000-8000-000000000002', 'STL-SHT-02', 'Steel Sheets', 'Hot rolled 2mm thick structural steel plates', '33333333-3333-4000-8000-000000000001', 'Sheets', 1200.00, 1800.00, 30.00),
    ('55555555-5555-4000-8000-000000000003', 'FUR-DSK-01', 'Office Desk', 'Dual-motor electric height adjustable standing desk', '33333333-3333-4000-8000-000000000002', 'Units', 8500.00, 14000.00, 10.00),
    ('55555555-5555-4000-8000-000000000004', 'FUR-CHR-02', 'Office Chair', 'High back mesh ergonomic chair with lumbar support', '33333333-3333-4000-8000-000000000002', 'Units', 4200.00, 7500.00, 15.00),
    ('55555555-5555-4000-8000-000000000005', 'FUR-TBL-03', 'Wooden Table', 'Solid teak wood conference & dining table', '33333333-3333-4000-8000-000000000002', 'Units', 6000.00, 10500.00, 8.00),
    ('55555555-5555-4000-8000-000000000006', 'HDW-BLT-01', 'Industrial Bolts', 'M10 stainless steel hex flange bolts (Box of 100)', '33333333-3333-4000-8000-000000000003', 'Boxes', 150.00, 250.00, 100.00)
ON CONFLICT (id) DO UPDATE 
SET cost_price = EXCLUDED.cost_price, sale_price = EXCLUDED.sale_price, reorder_level = EXCLUDED.reorder_level;

-- 7. Receipts Sample Documents
INSERT INTO public.receipts (id, reference, supplier_id, warehouse_id, destination_location_id, status, notes, created_by, created_at)
VALUES
    (
        '77777777-7777-4000-8000-000000000001', 
        'WH/IN/0001', 
        '44444444-4444-4000-8000-000000000001', 
        '11111111-1111-4000-8000-000000000001', 
        '22222222-2222-4000-8000-000000000001', 
        'done', 
        'Initial bulk inbound delivery of structural steel rods & sheets', 
        '66666666-6666-4000-8000-000000000001',
        now() - INTERVAL '3 days'
    ),
    (
        '77777777-7777-4000-8000-000000000002', 
        'WH/IN/0002', 
        '44444444-4444-4000-8000-000000000002', 
        '11111111-1111-4000-8000-000000000001', 
        '22222222-2222-4000-8000-000000000002', 
        'ready', 
        'Inbound shipment of M10 industrial bolts awaiting dock inspection', 
        '66666666-6666-4000-8000-000000000002',
        now() - INTERVAL '1 day'
    )
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- Receipt Line Items
INSERT INTO public.receipt_items (id, receipt_id, product_id, quantity_expected, quantity_received, unit_cost)
VALUES
    ('77777777-7777-4000-8001-000000000001', '77777777-7777-4000-8000-000000000001', '55555555-5555-4000-8000-000000000001', 100.00, 100.00, 450.00),
    ('77777777-7777-4000-8001-000000000002', '77777777-7777-4000-8000-000000000001', '55555555-5555-4000-8000-000000000002', 50.00, 50.00, 1200.00),
    ('77777777-7777-4000-8001-000000000003', '77777777-7777-4000-8000-000000000002', '55555555-5555-4000-8000-000000000006', 500.00, 0.00, 150.00)
ON CONFLICT (id) DO UPDATE SET quantity_received = EXCLUDED.quantity_received;

-- 8. Outbound Deliveries Sample Documents
INSERT INTO public.deliveries (id, reference, customer_name, warehouse_id, source_location_id, status, notes, created_by, created_at)
VALUES
    (
        '88888888-8888-4000-8000-000000000001', 
        'WH/OUT/0001', 
        'TechCorp India Pvt Ltd', 
        '11111111-1111-4000-8000-000000000001', 
        '22222222-2222-4000-8000-000000000004', 
        'done', 
        'Dispatched office workstation desks & chairs for new Bangalore office', 
        '66666666-6666-4000-8000-000000000001',
        now() - INTERVAL '2 days'
    ),
    (
        '88888888-8888-4000-8000-000000000002', 
        'WH/OUT/0002', 
        'Bharat Heavy Engineering', 
        '11111111-1111-4000-8000-000000000002', 
        '22222222-2222-4000-8000-000000000006', 
        'ready', 
        'Scheduled delivery of structural steel plates for plant fabrication', 
        '66666666-6666-4000-8000-000000000002',
        now() - INTERVAL '12 hours'
    )
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- Delivery Line Items
INSERT INTO public.delivery_items (id, delivery_id, product_id, quantity_demanded, quantity_delivered)
VALUES
    ('88888888-8888-4000-8001-000000000001', '88888888-8888-4000-8000-000000000001', '55555555-5555-4000-8000-000000000003', 5.00, 5.00),
    ('88888888-8888-4000-8001-000000000002', '88888888-8888-4000-8000-000000000001', '55555555-5555-4000-8000-000000000004', 10.00, 10.00),
    ('88888888-8888-4000-8001-000000000003', '88888888-8888-4000-8000-000000000002', '55555555-5555-4000-8000-000000000002', 15.00, 0.00)
ON CONFLICT (id) DO UPDATE SET quantity_delivered = EXCLUDED.quantity_delivered;

-- 9. Internal Transfers Sample Documents
INSERT INTO public.internal_transfers (id, reference, source_warehouse_id, source_location_id, destination_warehouse_id, destination_location_id, status, notes, created_by, created_at)
VALUES
    (
        '99999999-9999-4000-8000-000000000001',
        'WH/INT/0001',
        '11111111-1111-4000-8000-000000000001',
        '22222222-2222-4000-8000-000000000001',
        '11111111-1111-4000-8000-000000000002',
        '22222222-2222-4000-8000-000000000005',
        'done',
        'Transfer of steel TMT rods from Main Store to Pune Production Floor',
        '66666666-6666-4000-8000-000000000001',
        now() - INTERVAL '1 day'
    )
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- Transfer Line Items
INSERT INTO public.internal_transfer_items (id, transfer_id, product_id, quantity)
VALUES
    ('99999999-9999-4000-8001-000000000001', '99999999-9999-4000-8000-000000000001', '55555555-5555-4000-8000-000000000001', 30.00)
ON CONFLICT (id) DO UPDATE SET quantity = EXCLUDED.quantity;

-- 10. Inventory Adjustments Sample Documents
INSERT INTO public.inventory_adjustments (id, reference, warehouse_id, location_id, product_id, theoretical_quantity, real_quantity, reason, status, created_by, created_at)
VALUES
    (
        'aaaaaaaa-aaaa-4000-8000-000000000001',
        'ADJ/0001',
        '11111111-1111-4000-8000-000000000001',
        '22222222-2222-4000-8000-000000000003',
        '55555555-5555-4000-8000-000000000006',
        200.00,
        195.00,
        'Annual physical audit stock variance adjustment (5 boxes damaged in transit)',
        'done',
        '66666666-6666-4000-8000-000000000001',
        now() - INTERVAL '12 hours'
    )
ON CONFLICT (id) DO UPDATE SET real_quantity = EXCLUDED.real_quantity, status = EXCLUDED.status;

-- 11. Consistent Stock Balances across product locations
INSERT INTO public.stock (product_id, warehouse_id, location_id, on_hand, reserved)
VALUES
    -- Steel Rods: 100 received in WH/IN/0001 minus 30 transferred in WH/INT/0001 = 70 at Main Store
    ('55555555-5555-4000-8000-000000000001', '11111111-1111-4000-8000-000000000001', '22222222-2222-4000-8000-000000000001', 70.00, 0.00),
    -- Steel Rods: 30 transferred in WH/INT/0001 at Production Floor
    ('55555555-5555-4000-8000-000000000001', '11111111-1111-4000-8000-000000000002', '22222222-2222-4000-8000-000000000005', 30.00, 0.00),
    -- Steel Sheets: 50 received in WH/IN/0001 at Main Store
    ('55555555-5555-4000-8000-000000000002', '11111111-1111-4000-8000-000000000001', '22222222-2222-4000-8000-000000000001', 50.00, 0.00),
    -- Steel Sheets: 25 staged stock at Finished Goods
    ('55555555-5555-4000-8000-000000000002', '11111111-1111-4000-8000-000000000002', '22222222-2222-4000-8000-000000000006', 25.00, 15.00),
    -- Office Desk: 20 initial stock minus 5 delivered in WH/OUT/0001 = 15 at Dispatch Area
    ('55555555-5555-4000-8000-000000000003', '11111111-1111-4000-8000-000000000001', '22222222-2222-4000-8000-000000000004', 15.00, 0.00),
    -- Office Chair: 40 initial stock minus 10 delivered in WH/OUT/0001 = 30 at Dispatch Area
    ('55555555-5555-4000-8000-000000000004', '11111111-1111-4000-8000-000000000001', '22222222-2222-4000-8000-000000000004', 30.00, 0.00),
    -- Wooden Table: 12 initial stock at Main Store
    ('55555555-5555-4000-8000-000000000005', '11111111-1111-4000-8000-000000000001', '22222222-2222-4000-8000-000000000001', 12.00, 0.00),
    -- Industrial Bolts: 200 recorded minus 5 adjusted in ADJ/0001 = 195 at Rack B
    ('55555555-5555-4000-8000-000000000006', '11111111-1111-4000-8000-000000000001', '22222222-2222-4000-8000-000000000003', 195.00, 0.00)
ON CONFLICT (product_id, warehouse_id, location_id) DO UPDATE 
SET on_hand = EXCLUDED.on_hand, reserved = EXCLUDED.reserved;

-- 12. Stock Ledger Audit Trail (Complete Traceability)
INSERT INTO public.stock_ledger (entry_type, reference, product_id, warehouse_id, location_id, quantity_change, balance_after, user_id, created_at)
VALUES
    -- WH/IN/0001: Receipt Steel Rods +100
    ('receipt', 'WH/IN/0001', '55555555-5555-4000-8000-000000000001', '11111111-1111-4000-8000-000000000001', '22222222-2222-4000-8000-000000000001', 100.00, 100.00, '66666666-6666-4000-8000-000000000001', now() - INTERVAL '3 days'),
    -- WH/IN/0001: Receipt Steel Sheets +50
    ('receipt', 'WH/IN/0001', '55555555-5555-4000-8000-000000000002', '11111111-1111-4000-8000-000000000001', '22222222-2222-4000-8000-000000000001', 50.00, 50.00, '66666666-6666-4000-8000-000000000001', now() - INTERVAL '3 days'),
    -- Initial balance for Office Desks
    ('initial', 'INIT/FUR-DSK-01', '55555555-5555-4000-8000-000000000003', '11111111-1111-4000-8000-000000000001', '22222222-2222-4000-8000-000000000004', 20.00, 20.00, '66666666-6666-4000-8000-000000000001', now() - INTERVAL '3 days'),
    -- Initial balance for Office Chairs
    ('initial', 'INIT/FUR-CHR-02', '55555555-5555-4000-8000-000000000004', '11111111-1111-4000-8000-000000000001', '22222222-2222-4000-8000-000000000004', 40.00, 40.00, '66666666-6666-4000-8000-000000000001', now() - INTERVAL '3 days'),
    -- WH/OUT/0001: Delivery Office Desk -5
    ('delivery', 'WH/OUT/0001', '55555555-5555-4000-8000-000000000003', '11111111-1111-4000-8000-000000000001', '22222222-2222-4000-8000-000000000004', -5.00, 15.00, '66666666-6666-4000-8000-000000000001', now() - INTERVAL '2 days'),
    -- WH/OUT/0001: Delivery Office Chair -10
    ('delivery', 'WH/OUT/0001', '55555555-5555-4000-8000-000000000004', '11111111-1111-4000-8000-000000000001', '22222222-2222-4000-8000-000000000004', -10.00, 30.00, '66666666-6666-4000-8000-000000000001', now() - INTERVAL '2 days'),
    -- WH/INT/0001: Transfer Out Steel Rods -30 at Main Store
    ('transfer_out', 'WH/INT/0001', '55555555-5555-4000-8000-000000000001', '11111111-1111-4000-8000-000000000001', '22222222-2222-4000-8000-000000000001', -30.00, 70.00, '66666666-6666-4000-8000-000000000001', now() - INTERVAL '1 day'),
    -- WH/INT/0001: Transfer In Steel Rods +30 at Production Floor
    ('transfer_in', 'WH/INT/0001', '55555555-5555-4000-8000-000000000001', '11111111-1111-4000-8000-000000000002', '22222222-2222-4000-8000-000000000005', 30.00, 30.00, '66666666-6666-4000-8000-000000000001', now() - INTERVAL '1 day'),
    -- Initial balance for Industrial Bolts
    ('initial', 'INIT/HDW-BLT-01', '55555555-5555-4000-8000-000000000006', '11111111-1111-4000-8000-000000000001', '22222222-2222-4000-8000-000000000003', 200.00, 200.00, '66666666-6666-4000-8000-000000000001', now() - INTERVAL '1 day'),
    -- ADJ/0001: Inventory Adjustment Industrial Bolts -5
    ('adjustment', 'ADJ/0001', '55555555-5555-4000-8000-000000000006', '11111111-1111-4000-8000-000000000001', '22222222-2222-4000-8000-000000000003', -5.00, 195.00, '66666666-6666-4000-8000-000000000001', now() - INTERVAL '12 hours');
