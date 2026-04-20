"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface PosProduct {
  id: string; name: string; model: string; price: number;
  stock: number; images: string[]; condition: string; storage: string; color: string;
}

export interface PosCustomer {
  id: string; full_name: string; phone: string; email: string;
}

export async function searchProducts(query: string): Promise<PosProduct[]> {
  if (!query || query.length < 2) return [];
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, model, price, stock, images, condition, storage, color")
    .eq("active", true).gt("stock", 0)
    .or(`name.ilike.%${query}%,model.ilike.%${query}%,storage.ilike.%${query}%,color.ilike.%${query}%`)
    .limit(20);
  if (error) { console.error("[POS] searchProducts:", error); return []; }
  return (data || []) as PosProduct[];
}

export async function searchCustomers(query: string): Promise<PosCustomer[]> {
  if (!query || query.length < 2) return [];
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email")
    .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10);
  if (error) { console.error("[POS] searchCustomers:", error); return []; }
  return (data || []) as PosCustomer[];
}

export async function createQuickCustomer(name: string, phone: string, document: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .insert({ full_name: name, phone, document_number: document, role: "customer" })
    .select("id").single();
  if (error) return { error: error.message };
  return { id: data.id };
}

interface SaleItemInput {
  productId: string; productName: string; quantity: number; unitPrice: number; subtotal: number;
}

export async function createPosSale(input: {
  items: SaleItemInput[]; customerId?: string; customerName?: string;
  customerPhone?: string; customerDocument?: string; paymentMethod: string;
  discount?: number; notes?: string;
}) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const subtotal = input.items.reduce((s, i) => s + i.subtotal, 0);
  const discount = input.discount || 0;
  const total = subtotal - discount;

  const { data: sale, error: saleError } = await supabase
    .from("pos_sales")
    .insert({
      customer_id: input.customerId || null, customer_name: input.customerName || null,
      customer_phone: input.customerPhone || null, customer_document: input.customerDocument || null,
      subtotal, discount, total, payment_method: input.paymentMethod,
      notes: input.notes || null, created_by: user?.id || null,
    }).select("id, sale_number").single();

  if (saleError || !sale) return { error: saleError?.message || "Error al crear la venta" };

  const saleItems = input.items.map((item) => ({
    sale_id: sale.id, product_id: item.productId, product_name: item.productName,
    quantity: item.quantity, unit_price: item.unitPrice, subtotal: item.subtotal,
  }));

  const { error: itemsError } = await supabase.from("pos_sale_items").insert(saleItems);
  if (itemsError) {
    // Rollback: delete the sale
    await supabase.from("pos_sales").delete().eq("id", sale.id);
    return { error: itemsError.message };
  }

  return { saleId: sale.id, saleNumber: sale.sale_number };
}

export async function getPosSales(filters?: { date?: string; method?: string; limit?: number }) {
  const supabase = createServerSupabaseClient();
  let query = supabase.from("pos_sales").select("*").order("created_at", { ascending: false });
  if (filters?.method) query = query.eq("payment_method", filters.method);
  if (filters?.limit) query = query.limit(filters.limit);
  const { data, error } = await query;
  if (error) return [];
  return data;
}

export async function getPosSaleDetail(saleId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("pos_sales").select("*, items:pos_sale_items(*)").eq("id", saleId).single();
  if (error) return null;
  return data;
}

export async function voidPosSale(saleId: string) {
  const supabase = createServerSupabaseClient();
  // Delete items first (triggers restore stock), then delete sale
  const { error: itemsError } = await supabase.from("pos_sale_items").delete().eq("sale_id", saleId);
  if (itemsError) return { error: itemsError.message };
  const { error } = await supabase.from("pos_sales").update({ status: "devuelta" }).eq("id", saleId);
  if (error) return { error: error.message };
  // Also mark the related transaction as reversed (delete it)
  await supabase.from("transactions").delete().eq("order_id", saleId);
  return { success: true };
}
