-- Auth & Profile Trigger Migration
-- Migration: 20260926000002_auth_and_rls.sql

-- Trigger function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      CASE 
        WHEN NEW.email IS NOT NULL THEN SPLIT_PART(NEW.email, '@', 1)
        WHEN NEW.phone IS NOT NULL THEN 'User ' || RIGHT(NEW.phone, 4)
        ELSE 'StockSense User'
      END
    ),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'inventory_user'::public.user_role)
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Comprehensive RLS Policies for Profiles
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Allow authenticated users to perform operations on core data tables
CREATE POLICY "Authenticated users can insert stock" ON public.stock FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update stock" ON public.stock FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create receipts" ON public.receipts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update receipts" ON public.receipts FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create receipt items" ON public.receipt_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create deliveries" ON public.deliveries FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update deliveries" ON public.deliveries FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create delivery items" ON public.delivery_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create transfers" ON public.internal_transfers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update transfers" ON public.internal_transfers FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create transfer items" ON public.internal_transfer_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create adjustments" ON public.inventory_adjustments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update adjustments" ON public.inventory_adjustments FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert stock ledger" ON public.stock_ledger FOR INSERT WITH CHECK (auth.role() = 'authenticated');
