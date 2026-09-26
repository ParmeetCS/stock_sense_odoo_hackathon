-- StockSense Seed Data
INSERT INTO public.health_check (status)
VALUES ('healthy')
ON CONFLICT DO NOTHING;
