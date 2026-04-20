import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getAdminClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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
  customerEmail?: string;
}

async function ensureUser(email: string, name: string, phone: string): Promise<{ userId: string } | { error: string }> {
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

  return { userId };
}

export async function createOrderAction(data: CheckoutData) {
  if (!data.items || data.items.length === 0) {
    return { error: "El carrito está vacío" };
  }

  if (!data.shippingName || !data.shippingPhone || !data.shippingAddress) {
    return { error: "Completa todos los datos de envío" };
  }

  const userResult = await ensureUser(
    data.customerEmail || "",
    data.shippingName,
    data.shippingPhone
  );

  if ("error" in userResult) return { error: userResult.error };

  const admin = getAdminClient();

  const subtotal = data.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shippingCost = subtotal >= 500000 ? 0 : 15000;
  const total = subtotal + shippingCost;

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      buyer_id: userResult.userId,
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

  const orderItems = data.items.map((item) => ({
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

  return { success: true, orderId: order.id };
}
