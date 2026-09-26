-- Supabase Health Check table
CREATE TABLE IF NOT EXISTS public.health_check (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'healthy',
    checked_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.health_check ENABLE ROW LEVEL SECURITY;

-- Allow public read access for health check
CREATE POLICY "Allow public health check read"
    ON public.health_check
    FOR SELECT
    USING (true);
