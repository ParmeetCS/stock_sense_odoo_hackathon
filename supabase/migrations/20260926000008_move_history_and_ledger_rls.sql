-- StockSense Move History & Ledger Audit RLS Policies Migration
-- Migration: 20260926000008_move_history_and_ledger_rls.sql

-- 1. Ensure RLS is enabled on stock_ledger
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;

-- 2. Permissive Read Policy for stock_ledger
DROP POLICY IF EXISTS "Allow read stock_ledger" ON public.stock_ledger;
CREATE POLICY "Allow read stock_ledger" ON public.stock_ledger FOR SELECT USING (true);

-- 3. Authenticated Insert Policy for stock_ledger (Generated via RPC/Transactions)
DROP POLICY IF EXISTS "Authenticated users can insert stock ledger" ON public.stock_ledger;
CREATE POLICY "Authenticated users can insert stock ledger" ON public.stock_ledger FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Explicitly prevent UPDATE and DELETE on stock_ledger for normal users to maintain immutable audit trail
DROP POLICY IF EXISTS "Prevent update stock_ledger" ON public.stock_ledger;
CREATE POLICY "Prevent update stock_ledger" ON public.stock_ledger FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Prevent delete stock_ledger" ON public.stock_ledger;
CREATE POLICY "Prevent delete stock_ledger" ON public.stock_ledger FOR DELETE USING (false);
