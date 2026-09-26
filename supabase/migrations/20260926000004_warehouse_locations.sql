-- StockSense Warehouse & Location Management Migration
-- Migration: 20260926000004_warehouse_locations.sql

-- 1. Ensure is_active column exists on locations table
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. Ensure RLS Policies for Warehouses
DROP POLICY IF EXISTS "Allow read warehouses" ON public.warehouses;
CREATE POLICY "Allow read warehouses" ON public.warehouses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert warehouses" ON public.warehouses;
CREATE POLICY "Allow insert warehouses" ON public.warehouses FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update warehouses" ON public.warehouses;
CREATE POLICY "Allow update warehouses" ON public.warehouses FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete warehouses" ON public.warehouses;
CREATE POLICY "Allow delete warehouses" ON public.warehouses FOR DELETE USING (true);

-- 3. Ensure RLS Policies for Locations
DROP POLICY IF EXISTS "Allow read locations" ON public.locations;
CREATE POLICY "Allow read locations" ON public.locations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert locations" ON public.locations;
CREATE POLICY "Allow insert locations" ON public.locations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update locations" ON public.locations;
CREATE POLICY "Allow update locations" ON public.locations FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete locations" ON public.locations;
CREATE POLICY "Allow delete locations" ON public.locations FOR DELETE USING (true);
