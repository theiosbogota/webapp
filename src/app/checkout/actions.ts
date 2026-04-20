import { createClient } from "@/lib/supabase/client";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  store_id?: string;
}

interface CheckoutData {
  items: CartItem[];
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingNeighborhood: string;
  shippingNotes: string;
  paymentMethod: string;
}

export async function createOrderAction(data: CheckoutData) {
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
    store_id: item.store_id || item.id, // fallback
    quantity: item.quantity,
    unit_price: item.price,
    total: item.price * item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    // Rollback order if items fail
    await supabase.from("orders").delete().eq("id", order.id);
    return { error: "Error al crear los items del pedido: " + itemsError.message };
  }

  // Create payment record
  const { error: paymentError } = await supabase.from("payments").insert({
    order_id: order.id,
    method: data.paymentMethod || "efectivo",
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

  // Update product stock
  for (const item of data.items) {
    await supabase.rpc("decrement_stock", {
      product_id: item.id,
      qty: item.quantity,
    });
  }

  return { success: true, orderId: order.id };
}
