"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CreditCard, ShieldCheck, Smartphone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice, SITE_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { createBoldOrder } from "./bold-actions";
import { trackInitCheckout, trackPurchase } from "@/components/meta-pixel";
import type { User } from "@supabase/supabase-js";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotal, clearCart } = useCartStore();
  const [user, setUser] = useState<User | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("bold");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boldReady, setBoldReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const boldContainerRef = useRef<HTMLDivElement>(null);

  // Wait for client-side mount (zustand persist hydrates from localStorage after mount)
  useEffect(() => {
    setMounted(true);
  }, []);

  const subtotal = getTotal();
  const shipping = subtotal >= 500000 ? 0 : 15000;
  const total = subtotal + shipping;

  // Load Bold payment button script
  useEffect(() => {
    if (document.querySelector('script[src*="boldPaymentButton"]')) {
      setBoldReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.bold.co/library/boldPaymentButton.js";
    script.async = true;
    script.onload = () => setBoldReady(true);
    script.onerror = () => console.error("Failed to load Bold script");
    document.head.appendChild(script);
  }, []);

  // Get user (optional — guests can still checkout)
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
    trackInitCheckout(subtotal, "COP");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getFormData() {
    const nameInput = document.getElementById("name") as HTMLInputElement;
    const emailInput = document.getElementById("email") as HTMLInputElement;
    const phoneInput = document.getElementById("phone") as HTMLInputElement;
    const addressInput = document.getElementById("address") as HTMLInputElement;
    const neighborhoodInput = document.getElementById("neighborhood") as HTMLInputElement;
    const notesInput = document.getElementById("notes") as HTMLInputElement;

    return {
      items: items.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        store_id: item.product.store_id,
      })),
      shippingName: nameInput?.value || "",
      shippingPhone: phoneInput?.value || "",
      shippingAddress: addressInput?.value || "",
      shippingCity: "Bogotá",
      shippingNeighborhood: neighborhoodInput?.value || "",
      shippingNotes: notesInput?.value || "",
      customerEmail: emailInput?.value || user?.email || "",
    };
  }

  async function handleBoldPayment() {
    setLoading(true);
    setError(null);

    const formData = getFormData();

    if (!formData.shippingName || !formData.shippingPhone || !formData.shippingAddress) {
      setError("Completa todos los datos de envío");
      setLoading(false);
      return;
    }

    if (!formData.customerEmail) {
      setError("Necesitamos tu email para enviar la confirmación del pedido");
      setLoading(false);
      return;
    }

    const result = await createBoldOrder({ ...formData, paymentMethod: "bold" });

    if ("error" in result && result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (!result.success || !result.signature) {
      setError("Error al preparar el pago con Bold");
      setLoading(false);
      return;
    }

    // Render Bold payment button into container
    if (boldContainerRef.current) {
      boldContainerRef.current.innerHTML = "";

      const boldScript = document.createElement("script");
      boldScript.setAttribute("data-bold-button", "dark-L");
      boldScript.setAttribute("data-api-key", result.apiKey);
      boldScript.setAttribute("data-order-id", result.boldOrderId);
      boldScript.setAttribute("data-currency", "COP");
      boldScript.setAttribute("data-amount", result.amount.toString());
      boldScript.setAttribute("data-integrity-signature", result.signature);
      boldScript.setAttribute("data-description", result.description);
      boldScript.setAttribute("data-redirection-url", `${window.location.origin}/checkout/confirmacion?order=${result.orderId}`);
      boldScript.setAttribute("data-tax", "vat-19");

      boldScript.setAttribute("data-customer-data", JSON.stringify({
        email: result.customerEmail || formData.customerEmail,
        fullName: formData.shippingName,
        phone: formData.shippingPhone.replace(/\s/g, ""),
        dialCode: "+57",
        documentNumber: "",
        documentType: "CC",
      }));

      boldScript.setAttribute("data-billing-address", JSON.stringify({
        address: formData.shippingAddress,
        city: "Bogota",
        state: "Cundinamarca",
        country: "CO",
      }));

      boldContainerRef.current.appendChild(boldScript);

      // NOTE: Don't clearCart() here! The component would re-render with empty cart
      // and unmount the Bold container before Bold can render its button.
      // Cart will be cleared after Bold redirects to confirmation page.

      // Reload Bold library so it picks up the newly inserted data-bold-button script
      const existingBoldLib = document.querySelector('script[src*="boldPaymentButton"]');
      if (existingBoldLib) existingBoldLib.remove();
      const boldLib = document.createElement("script");
      boldLib.src = "https://checkout.bold.co/library/boldPaymentButton.js";
      boldLib.async = true;
      document.head.appendChild(boldLib);

      // Wait for Bold to render the button, then auto-open checkout
      const tryClick = () => {
        const btn = boldContainerRef.current?.querySelector("button, a, [role='button']");
        if (btn) {
          (btn as HTMLElement).click();
          setLoading(false);
        } else {
          // Bold hasn't rendered yet, retry
          setTimeout(tryClick, 300);
        }
      };
      setTimeout(tryClick, 500);
    }
  }

  async function handleCashOnDelivery() {
    setLoading(true);
    setError(null);

    const formData = getFormData();

    if (!formData.shippingName || !formData.shippingPhone || !formData.shippingAddress) {
      setError("Completa todos los datos de envío");
      setLoading(false);
      return;
    }

    if (!formData.customerEmail) {
      setError("Necesitamos tu email para enviar la confirmación del pedido");
      setLoading(false);
      return;
    }

    const { createOrderAction } = await import("./actions");
    const result = await createOrderAction({ ...formData, paymentMethod: "efectivo" });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    trackPurchase(total, "COP");
    clearCart();
    router.push(`/checkout/confirmacion?order=${result.orderId}`);
  }

  // Don't show "empty cart" until client-side mount (zustand persist needs localStorage)
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="text-center space-y-4">
          <div className="bg-muted rounded-full p-6 mx-auto w-fit">
            <CreditCard className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Tu carrito está vacío</h1>
          <p className="text-muted-foreground">
            Agrega productos antes de continuar al checkout
          </p>
          <Button asChild>
            <Link href="/productos">Ver productos</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground rounded-lg p-1.5">
              <Smartphone className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl">{SITE_NAME}</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            Checkout seguro
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" className="mb-6" asChild>
          <Link href="/productos">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Seguir comprando
          </Link>
        </Button>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact info */}
            <Card>
              <CardHeader>
                <CardTitle>Datos de contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    defaultValue={user?.email || ""}
                    required
                  />
                  {!user && (
                    <p className="text-xs text-muted-foreground">
                      Crearemos una cuenta con tu email para que puedas hacer seguimiento de tu pedido
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Shipping info */}
            <Card>
              <CardHeader>
                <CardTitle>Información de envío</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo *</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Tu nombre"
                      defaultValue={user?.user_metadata?.full_name || ""}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="300 123 4567"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección *</Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="Calle, carrera, número..."
                    required
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Barrio / Localidad</Label>
                    <Input
                      id="neighborhood"
                      name="neighborhood"
                      placeholder="Ej: Chapinero"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input id="city" value="Bogotá" readOnly className="bg-muted" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas de entrega (opcional)</Label>
                  <Input
                    id="notes"
                    name="notes"
                    placeholder="Apartamento, torre, instrucciones especiales..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment method */}
            <Card>
              <CardHeader>
                <CardTitle>Método de pago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("bold")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      paymentMethod === "bold"
                        ? "border-gold bg-gold/5 shadow-md"
                        : "border-border hover:border-gold/50"
                    }`}
                  >
                    <p className="font-semibold text-sm">Pagar en línea</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tarjeta, PSE, Nequi, Daviplata
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("efectivo")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      paymentMethod === "efectivo"
                        ? "border-gold bg-gold/5 shadow-md"
                        : "border-border hover:border-gold/50"
                    }`}
                  >
                    <p className="font-semibold text-sm">Contra entrega</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Paga al recibir en Bogotá
                    </p>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {paymentMethod === "efectivo"
                    ? "Paga al recibir tu pedido en Bogotá"
                    : "Pagos procesados de forma segura por Bold"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Order summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Resumen del pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cant: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium shrink-0">
                      {formatPrice(item.product.price * item.quantity)}
                    </p>
                  </div>
                ))}

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Envío</span>
                    <span>
                      {shipping === 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          Gratis
                        </Badge>
                      ) : (
                        formatPrice(shipping)
                      )}
                    </span>
                  </div>
                  {shipping > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Envío gratis en compras desde {formatPrice(500000)}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>

                {/* Bold payment button container — Bold renders its button here */}
                <div ref={boldContainerRef} id="bold-button-container" className="min-h-0" />

                {paymentMethod === "bold" ? (
                  <Button
                    type="button"
                    className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
                    size="lg"
                    disabled={loading || !boldReady}
                    onClick={handleBoldPayment}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="mr-2 h-4 w-4" />
                    )}
                    {loading ? "Preparando pago..." : `Pagar ${formatPrice(total)}`}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="w-full"
                    size="lg"
                    disabled={loading}
                    onClick={handleCashOnDelivery}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="mr-2 h-4 w-4" />
                    )}
                    {loading ? "Procesando..." : `Confirmar pedido`}
                  </Button>
                )}

                <p className="text-xs text-center text-muted-foreground">
                  Al completar tu compra aceptas nuestros{" "}
                  <Link href="/terminos" className="underline">
                    términos y condiciones
                  </Link>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
