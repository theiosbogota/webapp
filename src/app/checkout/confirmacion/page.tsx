"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CheckCircle2, Package, ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { trackPurchase } from "@/components/meta-pixel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice, SITE_NAME } from "@/lib/constants";
import { sendInvoiceEmail } from "./send-invoice";

interface OrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products?: { name: string } | null;
}

interface OrderData {
  id: string;
  status: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_neighborhood: string;
  buyer_id: string;
  created_at: string;
  items: OrderItem[];
  email?: string;
}

function ConfirmacionContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [invoiceSent, setInvoiceSent] = useState(false);
  const purchaseFired = useRef(false);
  const { clearCart } = useCartStore();

  useEffect(() => {
    clearCart();
    if (!orderId) return;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("orders")
        .select("*, items:order_items(product_id, quantity, unit_price, subtotal, products(name))")
        .eq("id", orderId)
        .single();
      if (data) {
        setOrder(data as OrderData);
        if (!purchaseFired.current) {
          purchaseFired.current = true;
          const contentIds = (data.items || []).map((i: { product_id: string }) => i.product_id);
          const numItems = (data.items || []).reduce(
            (sum: number, i: { quantity: number }) => sum + i.quantity,
            0
          );
          trackPurchase(data.total, "COP", contentIds, numItems);
        }

        // Send invoice email
        // Try to get email from auth.users
        const { data: { user } } = await supabase.auth.getUser();
        const email = user?.email || searchParams.get("email") || "";
        if (email && !invoiceSent) {
          setInvoiceSent(true);
          const invoiceItems = (data.items || []).map((i: OrderItem) => ({
            product_name: i.products?.name || "Producto",
            quantity: i.quantity,
            unit_price: i.unit_price,
            subtotal: i.subtotal,
          }));
          sendInvoiceEmail({
            orderId: data.id,
            customerName: data.shipping_name,
            customerEmail: email,
            items: invoiceItems,
            subtotal: data.subtotal,
            shippingCost: data.shipping_cost,
            total: data.total,
            shippingAddress: data.shipping_address,
            shippingCity: data.shipping_city,
            date: new Date(data.created_at).toLocaleDateString("es-CO", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          });
        }
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image
              src="/logo.png"
              alt={SITE_NAME}
              width={160}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>
        </div>

        {/* Gold divider */}
        <div className="gold-divider" />

        {/* Success badge */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-5 py-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-green-400 font-semibold text-sm">Pedido confirmado</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-4">¡Gracias por tu compra!</h1>
          <p className="text-[#888] text-sm mt-1">Tu pedido ha sido recibido y está siendo procesado</p>
          {invoiceSent && (
            <p className="text-[#555] text-xs mt-2 flex items-center justify-center gap-1">
              <Mail className="h-3 w-3" />
              Factura enviada a tu correo
            </p>
          )}
        </div>

        {order && (
          <>
            {/* Order details card */}
            <Card className="bg-[#111] border-[rgba(212,168,67,0.12)] rounded-2xl overflow-hidden">
              <CardContent className="p-6 space-y-4">
                {/* Order header */}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-[#555] uppercase tracking-widest">Pedido</p>
                    <p className="text-lg font-bold text-[#D4A843] font-mono mt-0.5">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest">Fecha</p>
                    <p className="text-sm text-white mt-0.5">
                      {new Date(order.created_at).toLocaleDateString("es-CO", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="gold-divider" />

                {/* Items */}
                <div className="space-y-3">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">
                          {item.products?.name || "Producto"}
                        </p>
                        <p className="text-xs text-[#888]">Cant: {item.quantity}</p>
                      </div>
                      <p className="text-sm text-[#D4A843] font-semibold">
                        {formatPrice(item.subtotal)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="gold-divider" />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#888]">Subtotal</span>
                    <span className="text-white">{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#888]">Envío</span>
                    <span className="text-white">
                      {order.shipping_cost === 0 ? "Gratis" : formatPrice(order.shipping_cost)}
                    </span>
                  </div>
                  <Separator className="bg-[rgba(212,168,67,0.15)]" />
                  <div className="flex justify-between">
                    <span className="text-[#D4A843] font-bold text-base">Total</span>
                    <span className="text-[#D4A843] font-bold text-lg">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping card */}
            <Card className="bg-[#111] border-[rgba(212,168,67,0.12)] rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="bg-[rgba(212,168,67,0.1)] rounded-lg p-2 mt-0.5">
                    <MapPin className="h-4 w-4 text-[#D4A843]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#555] uppercase tracking-widest">Envío a</p>
                    <p className="text-sm text-white font-medium mt-1">{order.shipping_name}</p>
                    {order.shipping_phone && (
                      <p className="text-xs text-[#888] flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" /> {order.shipping_phone}
                      </p>
                    )}
                    <p className="text-xs text-[#888] mt-0.5">
                      {order.shipping_address}
                      {order.shipping_neighborhood && `, ${order.shipping_neighborhood}`}
                    </p>
                    <p className="text-xs text-[#888]">{order.shipping_city}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            asChild
            className="flex-1 bg-gradient-to-r from-[#8B6914] to-[#D4A843] text-[#0A0A0A] hover:from-[#D4A843] hover:to-[#F0D78C] font-semibold border-0"
            size="lg"
          >
            <Link href="/dashboard/pedidos">
              <Package className="mr-2 h-4 w-4" />
              Ver mis pedidos
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="flex-1 border-[rgba(212,168,67,0.2)] text-[#D4A843] hover:bg-[rgba(212,168,67,0.08)] hover:text-[#F0D78C]"
            size="lg"
          >
            <Link href="/productos">
              Seguir comprando
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Footer */}
        <div className="gold-divider mt-6" />
        <p className="text-center text-[#333] text-xs">
          The iOS Bogotá — El marketplace #1 de iPhones en Bogotá
        </p>
      </div>
    </div>
  );
}

export default function ConfirmacionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <div className="text-[#D4A843] animate-pulse">Cargando...</div>
        </div>
      }
    >
      <ConfirmacionContent />
    </Suspense>
  );
}
