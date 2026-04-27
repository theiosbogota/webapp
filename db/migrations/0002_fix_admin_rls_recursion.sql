-- =====================================================================
-- 0002_fix_admin_rls_recursion.sql
--
-- Bug: the admin policies in bootstrap-fixed.sql check
--   EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
-- inline. When that subquery runs against profiles, it triggers the
-- profiles RLS, which contains the same EXISTS — infinite recursion that
-- Supabase serves as a 500. Symptom: /dashboard hits /rest/v1/orders and
-- /rest/v1/stores → 500 Internal Server Error.
--
-- Fix: wrap the admin check in a SECURITY DEFINER function so it bypasses
-- RLS, and rewrite every admin policy to call the function instead.
--
-- Idempotent: safe to re-run.
-- Run in: Supabase Studio → SQL Editor.
-- =====================================================================

-- 1. The non-recursive admin check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- 2. Drop the recursive policies
DROP POLICY IF EXISTS "Admin full access profiles"      ON public.profiles;
DROP POLICY IF EXISTS "Admin full access stores"        ON public.stores;
DROP POLICY IF EXISTS "Admin write categories"          ON public.categories;
DROP POLICY IF EXISTS "Admin full access products"      ON public.products;
DROP POLICY IF EXISTS "Admin full access orders"        ON public.orders;
DROP POLICY IF EXISTS "Admin full access order_items"   ON public.order_items;
DROP POLICY IF EXISTS "Admin full access payments"      ON public.payments;
DROP POLICY IF EXISTS "Admin full access shipments"     ON public.shipments;
DROP POLICY IF EXISTS "Admin full access contacts"      ON public.contacts;
DROP POLICY IF EXISTS "Admin full access conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admin full access messages"      ON public.messages;
DROP POLICY IF EXISTS "Admin full access activities"    ON public.activities;
DROP POLICY IF EXISTS "Admin full access opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Admin read favorites"            ON public.favorites;
DROP POLICY IF EXISTS "Admin moderate reviews"          ON public.reviews;

-- profiles: split into self + admin (cannot be FOR ALL because the
-- self-update needs id = auth.uid() check, but admin needs all rows)
CREATE POLICY "Admin manage profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin() OR auth.uid() = id)
  WITH CHECK (public.is_admin() OR auth.uid() = id);

-- 3. Recreate every admin policy using the function
CREATE POLICY "Admin full access stores" ON public.stores
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin write categories" ON public.categories
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin full access products" ON public.products
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin full access orders" ON public.orders
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin full access order_items" ON public.order_items
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin full access payments" ON public.payments
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin full access shipments" ON public.shipments
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin full access contacts" ON public.contacts
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin full access conversations" ON public.conversations
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin full access messages" ON public.messages
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin full access activities" ON public.activities
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin full access opportunities" ON public.opportunities
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin read favorites" ON public.favorites
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Admin moderate reviews" ON public.reviews
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. The pre-existing admin policies in admin_tables.sql, pos_tables.sql
-- and bot_metrics.sql also use the inline EXISTS pattern. Rewrite them too.
DROP POLICY IF EXISTS "Admin can manage spare_parts"               ON public.spare_parts;
DROP POLICY IF EXISTS "Admin can view spare_parts"                 ON public.spare_parts;
DROP POLICY IF EXISTS "Admin can manage spare_part_compatibilities" ON public.spare_part_compatibilities;
DROP POLICY IF EXISTS "Admin can manage deals"                     ON public.deals;
DROP POLICY IF EXISTS "Admin can view deals"                       ON public.deals;
DROP POLICY IF EXISTS "Admin can manage appointments"              ON public.appointments;
DROP POLICY IF EXISTS "Admin can view appointments"                ON public.appointments;
DROP POLICY IF EXISTS "Admin can manage transactions"              ON public.transactions;
DROP POLICY IF EXISTS "Admin can view transactions"                ON public.transactions;
DROP POLICY IF EXISTS "Admin full access pos_sales"                ON public.pos_sales;
DROP POLICY IF EXISTS "Admin full access pos_sale_items"           ON public.pos_sale_items;
DROP POLICY IF EXISTS "bot_metrics_admin_read"                     ON public.bot_metrics;
DROP POLICY IF EXISTS "Admin can read bot metrics"                 ON public.bot_metrics;

CREATE POLICY "Admin manage spare_parts" ON public.spare_parts
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin manage spare_part_compatibilities" ON public.spare_part_compatibilities
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin manage deals" ON public.deals
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin manage appointments" ON public.appointments
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin manage transactions" ON public.transactions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin manage pos_sales" ON public.pos_sales
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin manage pos_sale_items" ON public.pos_sale_items
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin read bot_metrics" ON public.bot_metrics
  FOR SELECT TO authenticated USING (public.is_admin());
