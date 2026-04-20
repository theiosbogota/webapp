"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CheckCircle2, Package, ArrowRight, Smartphone } from "lucide-react";
import { trackPurchase } from "@/components/meta-pixel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, SITE_NAME } from "@/lib/constants";

interface OrderData {
  id: string;
  status: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  shipping_name: string;
  shipping_address: string;
  shipping_city: string;
  created_at: string;
}

function ConfirmacionContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const [order, setOrder] = useState<OrderData | null>(null);
  const purchaseFired = useRef(false);

  useEffect(() => {
    if (!orderId) return;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("orders")
        .select("*, items:order_items(product_id, quantity, unit_price)")
        .eq("id", orderId)
        .single();
      if (data) {
        setOrder(data);
        // Fire Purchase event once — server-side CAPI deduplicates if browser already fired it
        if (!purchaseFired.current) {
          purchaseFired.current = true;
          const contentIds = (data.items || []).map((i: { product_id: string }) => i.product_id);
          const numItems = (data.items || []).reduce(
            (sum: number, i: { quantity: number }) => sum + i.quantity,
            0
          );
          trackPurchase(data.total, "COP", contentIds, numItems);
        }
      }
    }
    load();
  }, [orderId]);

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="bg-primary text-primary-foreground rounded-lg p-2">
              <Smartphone className="h-6 w-6" />
            </div>
            <span className="font-bold text-2xl">{SITE_NAME}</span>
          </Link>
        </div>

        <Card>
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <div className="bg-green-100 rounded-full p-4 mx-auto w-fit">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>

            <div>
              <h1 className="text-2xl font-bold">¡Pedido confirmado!</h1>
              <p className="text-muted-foreground mt-1">
                Tu pedido ha sido recibido y está siendo procesado
              </p>
            </div>

            {order && (
              <>
                <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Nº de pedido</span>
                    <span className="font-mono font-medium">
                      {order.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fecha</span>
                    <span>
                      {new Date(order.created_at).toLocaleDateString("es-CO", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envío</span>
                    <span>
                      {order.shipping_cost === 0
                        ? "Gratis"
                        : formatPrice(order.shipping_cost)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-left space-y-1">
                  <p className="text-sm font-medium">Envío a:</p>
                  <p className="text-sm text-muted-foreground">
                    {order.shipping_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {order.shipping_address}, {order.shipping_city}
                  </p>
                </div>
              </>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button asChild className="flex-1">
                <Link href="/dashboard/pedidos">
                  <Package className="mr-2 h-4 w-4" />
                  Ver mis pedidos
                </Link>
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link href="/productos">
                  Seguir comprando
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ConfirmacionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Cargando...
        </div>
      }
    >
      <ConfirmacionContent />
    </Suspense>
  );
}
