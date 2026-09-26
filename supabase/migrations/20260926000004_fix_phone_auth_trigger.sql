-- Migration: 20260926000004_fix_phone_auth_trigger.sql
-- Fix Phone/SMS (Textlocal) Auth profile trigger & constraints

-- 1. Alter profiles table to make email nullable and add phone column
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;

-- 2. Update handle_new_user() trigger function to support Phone/SMS users
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

-- Re-bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
