"use server";

import { createClient } from "@/lib/supabase/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

const BOLD_SECRET_KEY = process.env.BOLD_SECRET_KEY || "";
const BOLD_API_KEY = process.env.NEXT_PUBLIC_BOLD_API_KEY || "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getAdminClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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
 * Ensure user exists — if logged in, return their ID.
 * If guest, auto-create account with email + random password.
 * Supabase sends confirmation email automatically.
 */
async function ensureUser(email: string, name: string, phone: string): Promise<{ userId: string; email: string } | { error: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) return { userId: user.id, email: user.email || email };

  if (!email) return { error: "Necesitamos tu email para procesar el pedido" };

  // Check if user already exists by email using admin
  const admin = getAdminClient();
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(u => u.email === email);

  if (existing) {
    // User exists but not logged in — return their ID
    // They'll get a confirmation email to set their password
    return { userId: existing.id, email };
  }

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

  // Create profile
  await admin.from("profiles").upsert({
    id: newUser.user.id,
    full_name: name,
    phone,
    email,
  });

  return { userId: newUser.user.id, email };
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

  const subtotal = data.items.reduce(
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

  // Create order items
  const orderItems = data.items.map((item) => ({
    order_id: order.id,
    product_id: item.id,
    store_id: item.store_id || item.id,
    quantity: item.quantity,
    unit_price: item.price,
    total: item.price * item.quantity,
  }));

  const { error: itemsError } = await admin
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    await admin.from("orders").delete().eq("id", order.id);
    return { error: "Error al crear los items del pedido: " + itemsError.message };
  }

  // Create payment record
  const { error: paymentError } = await admin.from("payments").insert({
    order_id: order.id,
    method: data.paymentMethod || "bold",
    status: "pendiente",
    amount: total,
  });

  if (paymentError) {
    console.error("Payment record error:", paymentError);
  }

  // Create shipment record
  await admin.from("shipments").insert({
    order_id: order.id,
    status: "preparando",
  });

  // Update product stock
  for (const item of data.items) {
    await admin.rpc("decrement_stock", {
      product_id: item.id,
      qty: item.quantity,
    });
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
