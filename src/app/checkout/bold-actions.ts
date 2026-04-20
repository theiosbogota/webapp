"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

const BOLD_SECRET_KEY = (process.env.BOLD_SECRET_KEY || "").trim();
const BOLD_API_KEY = (process.env.NEXT_PUBLIC_BOLD_API_KEY || "").trim();
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

function getAdminClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_RE.test(id);
}

/**
 * Generate Bold integrity signature server-side
 * SHA256({orderId}{amount}{currency}{secretKey})
 */
export async function generateBoldSignature(
  orderId: string,
  amount: number,
  currency: string = "COP"
): Promise<{ signature: string; apiKey: string } | { error: string }> {
  if (!BOLD_SECRET_KEY || !BOLD_API_KEY) {
    return { error: "Bold no está configurado. Faltan las llaves de integración." };
  }

  const concatenated = `${orderId}${amount}${currency}${BOLD_SECRET_KEY}`;
  const signature = crypto.createHash("sha256").update(concatenated).digest("hex");

  return { signature, apiKey: BOLD_API_KEY };
}

/**
 * Ensure user exists in auth.users AND profiles table.
 * FK constraint: orders.buyer_id -> profiles.id
 * Must have a matching row in profiles before inserting order.
 */
async function ensureUser(email: string, name: string, phone: string): Promise<{ userId: string; email: string } | { error: string }> {
  if (!email) return { error: "Necesitamos tu email para procesar el pedido" };

  const admin = getAdminClient();

  // Check if user already exists by email in auth.users
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

  let userId: string;

  if (existing) {
    userId = existing.id;
  } else {
    // Create new user with random password
    const randomPass = crypto.randomBytes(16).toString("base64url");
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: randomPass,
      email_confirm: true,
      user_metadata: { full_name: name, phone },
    });

    if (createErr || !newUser.user) {
      return { error: "Error creando tu cuenta: " + (createErr?.message || "intenta de nuevo") };
    }
    userId = newUser.user.id;
  }

  // Ensure profile exists (FK: orders.buyer_id -> profiles.id)
  const { data: profile } = await admin.from("profiles").select("id").eq("id", userId).single();

  if (!profile) {
    const { error: profileErr } = await admin.from("profiles").insert({
      id: userId,
      full_name: name,
      phone,
      email,
    });
    if (profileErr) {
      console.error("Profile creation error:", profileErr);
      return { error: "Error creando tu perfil. Intenta de nuevo." };
    }
  }

  return { userId, email };
}

/**
 * Create order and prepare Bold payment data — supports guest checkout
 */
export async function createBoldOrder(data: {
  items: { id: string; name: string; price: number; quantity: number; store_id?: string }[];
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingNeighborhood: string;
  shippingNotes: string;
  paymentMethod: string;
  customerEmail?: string;
}) {
  if (!data.items || data.items.length === 0) {
    return { error: "El carrito está vacío" };
  }

  if (!data.shippingName || !data.shippingPhone || !data.shippingAddress) {
    return { error: "Completa todos los datos de envío" };
  }

  // Validate product IDs are real UUIDs (not mock data like "prod-1")
  const invalidIds = data.items.filter(item => !isValidUUID(item.id));
  if (invalidIds.length > 0) {
    return { error: "Tu carrito tiene productos inválidos. Por favor vacía el carrito y agrega los productos nuevamente desde la tienda." };
  }

  // Ensure user exists (auto-create for guests)
  const userResult = await ensureUser(
    data.customerEmail || "",
    data.shippingName,
    data.shippingPhone
  );

  if ("error" in userResult) return { error: userResult.error };

  const userId = userResult.userId;
  const userEmail = userResult.email;

  const admin = getAdminClient();

  // Verify products exist in DB and get real prices (don't trust client prices)
  const productIds = data.items.map(item => item.id);
  const { data: dbProducts, error: productErr } = await admin
    .from("products")
    .select("id, price, name, stock")
    .in("id", productIds);

  if (productErr || !dbProducts || dbProducts.length !== productIds.length) {
    return { error: `Algunos productos ya no están disponibles. Por favor vacía el carrito y agrega los productos nuevamente.` };
  }

  // Build price map from DB
  const priceMap = new Map(dbProducts.map(p => [p.id, p]));

  // Use DB prices, not client-submitted prices
  const verifiedItems = data.items.map(item => ({
    ...item,
    price: priceMap.get(item.id)?.price ?? item.price,
    name: priceMap.get(item.id)?.name ?? item.name,
  }));

  const subtotal = verifiedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shippingCost = subtotal >= 500000 ? 0 : 15000;
  const total = subtotal + shippingCost;

  // Create order using admin to bypass RLS
  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      buyer_id: userId,
      status: "pendiente",
      subtotal,
      shipping_cost: shippingCost,
      total,
      shipping_name: data.shippingName,
      shipping_phone: data.shippingPhone,
      shipping_address: data.shippingAddress,
      shipping_city: data.shippingCity || "Bogotá",
      shipping_neighborhood: data.shippingNeighborhood || "",
      shipping_notes: data.shippingNotes || null,
    })
    .select()
    .single();

  if (orderError) {
    return { error: "Error al crear el pedido: " + orderError.message };
  }

  // Create order items with verified DB prices
  const orderItems = verifiedItems.map((item) => ({
    order_id: order.id,
    product_id: item.id,
    quantity: item.quantity,
    unit_price: item.price,
    subtotal: item.price * item.quantity,
  }));

  const { error: itemsError } = await admin
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    await admin.from("orders").delete().eq("id", order.id);
    return { error: "Error al crear los items del pedido: " + itemsError.message };
  }

  // Generate Bold integrity signature
  const orderId = `ORD-${order.id}-${Date.now()}`;
  const signatureResult = await generateBoldSignature(orderId, total, "COP");

  if ("error" in signatureResult) {
    return { error: signatureResult.error };
  }

  // Update order with Bold reference
  await admin
    .from("orders")
    .update({ metadata: { bold_order_id: orderId } })
    .eq("id", order.id);

  return {
    success: true,
    orderId: order.id,
    boldOrderId: orderId,
    signature: signatureResult.signature,
    apiKey: signatureResult.apiKey,
    amount: total,
    description: `Pedido IOSBogota #${order.id}`,
    customerEmail: userEmail,
  };
}
