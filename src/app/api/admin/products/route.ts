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
 * Auto-resolves slug collisions by appending -2, -3, -4 ... up to 50 attempts
 */
export async function POST(req: NextRequest) {
  const uid = await verifyAdmin();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { product } = await req.json() as { product: Record<string, unknown> };
  if (!product) return NextResponse.json({ error: "No product" }, { status: 400 });

  const admin = createAdminClient();
  const baseSlug = String(product.slug || "").trim() || `producto-${Date.now().toString(36)}`;
  let attempt = 0;
  let lastError: { message: string; code?: string } | null = null;

  while (attempt < 50) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const { data, error } = await admin
      .from("products")
      .insert({ ...product, slug })
      .select()
      .single();

    if (!error) return NextResponse.json(data);

    // Postgres unique violation code = 23505. Retry with new slug.
    if (error.code === "23505" && /slug/.test(error.message)) {
      attempt += 1;
      lastError = error;
      continue;
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { error: `No se pudo encontrar slug único después de 50 intentos: ${lastError?.message}` },
    { status: 500 }
  );
}

/**
 * DELETE /api/admin/products
 * Body variants:
 *   { id: string, action: "delete" | "restore" }      — soft delete / restore one
 *   { id: string, hard: true }                         — hard delete one
 *   { ids: string[], action: "delete" | "restore" }   — bulk soft delete / restore
 *   { ids: string[], hard: true }                      — bulk hard delete
 */
export async function DELETE(req: NextRequest) {
  const uid = await verifyAdmin();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    id?: string;
    ids?: string[];
    action?: "delete" | "restore";
    hard?: boolean;
  };
  const admin = createAdminClient();
  const ids = body.ids ?? (body.id ? [body.id] : []);
  if (ids.length === 0) return NextResponse.json({ error: "No id(s) provided" }, { status: 400 });

  if (body.hard) {
    const { error } = await admin.from("products").delete().in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: ids.length });
  }

  const update = body.action === "restore"
    ? { deleted_at: null }
    : { deleted_at: new Date().toISOString(), active: false };

  const { error } = await admin.from("products").update(update).in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, updated: ids.length });
}
