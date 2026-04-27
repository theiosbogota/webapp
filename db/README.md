# Database bootstrap

## Recommended: `bootstrap-fixed.sql`

This is the file to run on a fresh or partially-populated Supabase project.
It contains all 7 migrations from `supabase/migrations/` plus fixes for
schema/code mismatches and admin RLS policies.

### What it does

1. Creates 24 tables (idempotent: `CREATE TABLE IF NOT EXISTS`)
2. Adds RLS for buyer/seller scopes (from original migrations)
3. Adds **admin RLS policies** for every table the `/admin` panel reads or
   writes — without these the panel returns empty results
4. **Schema fixes**:
   - `orders.metadata JSONB` (Bold checkout stores `bold_order_id` here)
   - `payments.gateway_id`, `payments.gateway_response` (used by Bold/Wompi
     webhook code; missing in original `001_initial_schema`)
   - Drops the rigid `payments_method_check` and `payments_status_check`
     constraints so new gateways can use new method/status names
   - Fixes `pos_sale_to_transaction` trigger to write the POS sale id into
     `transactions.reference_id` instead of `order_id` (which is FK to
     `orders` and would fail for POS sales)

### Steps

1. Open Supabase Studio → SQL Editor → New query
2. Paste all of [`bootstrap-fixed.sql`](./bootstrap-fixed.sql)
3. Run
4. Promote your user to admin:
   ```sql
   UPDATE public.profiles SET role = 'admin'
   WHERE email = 'YOUR_EMAIL@example.com';
   ```
5. Optional: `supabase/seed.sql` to insert the 10 iPhone categories.

### Re-running

`bootstrap-fixed.sql` is **idempotent** — re-runs are safe:
- `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`
- `DROP POLICY IF EXISTS` before every `CREATE POLICY`
- `DROP TRIGGER IF EXISTS` before every `CREATE TRIGGER`
- `CREATE OR REPLACE FUNCTION`
- `ADD COLUMN IF NOT EXISTS` for the schema fixes

If a previous attempt failed mid-way, just re-run.

## Reset (only if you want to start from scratch)

```sql
DROP TABLE IF EXISTS public.pos_sale_items, public.pos_sales,
  public.spare_part_compatibilities, public.spare_parts,
  public.appointments, public.deals, public.transactions,
  public.opportunities,
  public.bot_metrics, public.activities, public.messages,
  public.conversations, public.contacts,
  public.favorites, public.reviews, public.shipments,
  public.payments, public.order_items, public.orders,
  public.products, public.categories, public.stores,
  public.profiles
  CASCADE;

DROP SEQUENCE IF EXISTS pos_sale_seq;
DROP FUNCTION IF EXISTS public.handle_new_user, public.update_updated_at,
  public.decrement_stock, public.pos_sale_to_transaction,
  public.pos_sale_item_deduct_stock, public.pos_sale_item_restore_stock CASCADE;
```

Then run `bootstrap-fixed.sql`.

## Files in this folder

- `bootstrap-fixed.sql` — the one to run (~1054 lines)

## Source

`bootstrap-fixed.sql` is generated from `supabase/migrations/*.sql` (which
is gitignored) by a small script. If a migration changes, regenerate this
file rather than hand-editing.
