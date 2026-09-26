-- StockSense Seed Data
-- Seed: supabase/seed.sql

-- 1. Initial Health Check
INSERT INTO public.health_check (status)
VALUES ('healthy')
ON CONFLICT DO NOTHING;

-- 2. Initial Warehouses
INSERT INTO public.warehouses (id, code, name, address)
VALUES
    ('a1b2c3d4-e5f6-7890-abcd-111111111111', 'WH01', 'Main Warehouse', 'Central Industrial Park, Zone A'),
    ('a1b2c3d4-e5f6-7890-abcd-222222222222', 'WH02', 'Secondary Warehouse', 'North Logistics Hub, Sector 4')
ON CONFLICT (code) DO NOTHING;

-- 3. Initial Locations
INSERT INTO public.locations (id, warehouse_id, code, name, type)
VALUES
    ('b1c2d3e4-f5a6-7890-bcde-111111111111', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'LOC-A1', 'Bin A1 - General Storage', 'internal'),
    ('b1c2d3e4-f5a6-7890-bcde-222222222222', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'LOC-B1', 'Bin B1 - High Density Rack', 'internal'),
    ('b1c2d3e4-f5a6-7890-bcde-333333333333', 'a1b2c3d4-e5f6-7890-abcd-222222222222', 'LOC-W2-A1', 'Warehouse 2 Main Shelf', 'internal')
ON CONFLICT (warehouse_id, code) DO NOTHING;

-- 4. Initial Categories
INSERT INTO public.categories (id, name, code, description)
VALUES
    ('c1d2e3f4-a5b6-7890-cdef-111111111111', 'Office Furniture', 'FURN', 'Desks, chairs, and office ergonomics'),
    ('c1d2e3f4-a5b6-7890-cdef-222222222222', 'Electronics & Hardware', 'ELEC', 'Computers, monitors, and peripherals')
ON CONFLICT (name) DO NOTHING;

-- 5. Initial Suppliers
INSERT INTO public.suppliers (id, name, code, email, phone)
VALUES
    ('d1e2f3a4-b5c6-7890-defa-111111111111', 'Global Logistics & Supply Co.', 'SUP-GLS', 'contact@globallogistics.example.com', '+1-800-555-0199'),
    ('d1e2f3a4-b5c6-7890-defa-222222222222', 'Apex Hardware Ltd.', 'SUP-APEX', 'sales@apexhardware.example.com', '+1-800-555-0288')
ON CONFLICT (code) DO NOTHING;

-- 6. Initial Products
INSERT INTO public.products (id, sku, name, description, category_id, unit_of_measure, cost_price, sale_price, reorder_level)
VALUES
    ('e1f2a3b4-c5d6-7890-efab-111111111111', 'DESK001', 'Ergonomic Executive Desk', 'Adjustable height standing executive desk', 'c1d2e3f4-a5b6-7890-cdef-111111111111', 'Units', 250.00, 450.00, 5),
    ('e1f2a3b4-c5d6-7890-efab-222222222222', 'MON002', 'UltraWide 34-inch Monitor', '4K USB-C IPS Office Monitor', 'c1d2e3f4-a5b6-7890-cdef-222222222222', 'Units', 320.00, 599.00, 8)
ON CONFLICT (sku) DO NOTHING;

-- 7. Initial Stock
INSERT INTO public.stock (product_id, warehouse_id, location_id, on_hand, reserved)
VALUES
    ('e1f2a3b4-c5d6-7890-efab-111111111111', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'b1c2d3e4-f5a6-7890-bcde-111111111111', 45.00, 5.00),
    ('e1f2a3b4-c5d6-7890-efab-222222222222', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'b1c2d3e4-f5a6-7890-bcde-222222222222', 28.00, 2.00)
ON CONFLICT (product_id, warehouse_id, location_id) DO UPDATE
SET on_hand = EXCLUDED.on_hand, reserved = EXCLUDED.reserved;
