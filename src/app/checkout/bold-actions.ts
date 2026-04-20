"use server";

import { createClient } from "@/lib/supabase/client";
import crypto from "crypto";

const BOLD_SECRET_KEY = process.env.BOLD_SECRET_KEY || "";
const BOLD_API_KEY = process.env.NEXT_PUBLIC_BOLD_API_KEY || "";

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
 * Create order and prepare Bold payment data
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
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Debes iniciar sesión para realizar un pedido" };
  }

  if (!data.items || data.items.length === 0) {
    return { error: "El carrito está vacío" };
  }

  if (!data.shippingName || !data.shippingPhone || !data.shippingAddress) {
    return { error: "Completa todos los datos de envío" };
  }

  const subtotal = data.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shippingCost = subtotal >= 500000 ? 0 : 15000;
  const total = subtotal + shippingCost;

  // Create order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      buyer_id: user.id,
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

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    await supabase.from("orders").delete().eq("id", order.id);
    return { error: "Error al crear los items del pedido: " + itemsError.message };
  }

  // Create payment record
  const { error: paymentError } = await supabase.from("payments").insert({
    order_id: order.id,
    method: data.paymentMethod || "bold",
    status: "pendiente",
    amount: total,
  });

  if (paymentError) {
    console.error("Payment record error:", paymentError);
  }

  // Create shipment record
  await supabase.from("shipments").insert({
    order_id: order.id,
    status: "preparando",
  });

  // Generate Bold integrity signature
  const orderId = `ORD-${order.id}-${Date.now()}`;
  const signatureResult = await generateBoldSignature(orderId, total, "COP");

  if ("error" in signatureResult) {
    return { error: signatureResult.error };
  }

  // Update order with Bold reference
  await supabase
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
  };
}
