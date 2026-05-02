import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Verify the caller is an authenticated admin */
async function verifyAdmin() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? user.id : null;
}

/**
 * GET /api/admin/products  — list all products (bypasses RLS)
 */
export async function GET(req: NextRequest) {
  const uid = await verifyAdmin();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const showDeleted = req.nextUrl.searchParams.get("deleted") === "1";
  const admin = createAdminClient();
  let q = admin
    .from("products")
    .select("*, store:stores(name)")
    .order("model")
    .order("color")
    .order("storage");

  if (!showDeleted) q = q.is("deleted_at", null);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/**
 * PATCH /api/admin/products  — bulk update products
 * Body: { updates: [{ id: string, ...fields }] }
 */
export async function PATCH(req: NextRequest) {
  const uid = await verifyAdmin();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { updates } = await req.json() as { updates: Array<{ id: string; [k: string]: unknown }> };
  if (!updates?.length) return NextResponse.json({ error: "No updates" }, { status: 400 });

  const admin = createAdminClient();
  let errors = 0;

  await Promise.all(
    updates.map(({ id, ...fields }) =>
      admin.from("products").update(fields).eq("id", id)
        .then(({ error }) => { if (error) errors++; })
    )
  );

  if (errors > 0) {
    return NextResponse.json({ error: `${errors} update(s) failed` }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * POST /api/admin/products  — create a product
 * Body: { product: {...} }
 */
export async function POST(req: NextRequest) {
  const uid = await verifyAdmin();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { product } = await req.json() as { product: Record<string, unknown> };
  if (!product) return NextResponse.json({ error: "No product" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("products").insert(product).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/**
 * DELETE /api/admin/products  — soft delete or restore
 * Body: { id: string, action: "delete" | "restore" }
 */
export async function DELETE(req: NextRequest) {
  const uid = await verifyAdmin();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, action } = await req.json() as { id: string; action: "delete" | "restore" };
  const admin = createAdminClient();

  const update = action === "restore"
    ? { deleted_at: null }
    : { deleted_at: new Date().toISOString(), active: false };

  const { error } = await admin.from("products").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
