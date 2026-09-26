-- StockSense Migration: Add missing delivered_date column to public.deliveries
-- Migration: 20260926000013_add_delivered_date_to_deliveries.sql

ALTER TABLE public.deliveries
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_date TIMESTAMPTZ;
