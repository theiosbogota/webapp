"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  Share2,
  ShieldCheck,
  Star,
  Truck,
  ShoppingCart,
  Minus,
  Plus,
  Store,
  CheckCircle2,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice, CONDITION_LABELS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { ProductReviews } from "@/components/products/product-reviews";
import { useFavorites } from "@/hooks/use-favorites";
import { trackViewContent, trackAddToCart, trackContact } from "@/components/meta-pixel";
import type { Product } from "@/types";

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addItem, openCart } = useCartStore();
  const { toggleFavorite, isFavorite, isLoggedIn } = useFavorites();
  const isFav = product ? isFavorite(product.id) : false;

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select("*, store:stores(*), category:categories(*)")
        .eq("slug", slug)
        .single();

      if (data) {
        setProduct(data as Product);
        trackViewContent(data.name, data.id);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Producto no encontrado</h1>
            <p className="text-muted-foreground mt-2">
              El producto que buscas no existe o fue removido.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/productos">Ver todos los productos</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem(product, quantity);
    openCart();
    trackAddToCart(product.price * quantity, "COP", product.name, product.id);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link href="/" className="hover:text-foreground">
              Inicio
            </Link>
            <span>/</span>
            <Link href="/productos" className="hover:text-foreground">
              Productos
            </Link>
            <span>/</span>
            <span className="text-foreground">{product.name}</span>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Product image */}
            <div className="space-y-4">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-muted to-muted/50 border flex items-center justify-center overflow-hidden">
                {product.images?.[0] ? (
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    width={600}
                    height={600}
                    className="object-contain p-8"
                    priority
                  />
                ) : (
                  <div className="text-center space-y-3">
                    <div className="bg-background/80 rounded-full p-6 mx-auto w-fit">
                      <ShoppingCart className="h-16 w-16 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      {product.model}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {product.color} · {product.storage}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Product info */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{product.model}</Badge>
                  <Badge
                    className={
                      product.condition === "nuevo"
                        ? "bg-green-600 hover:bg-green-700"
                        : ""
                    }
                  >
                    {CONDITION_LABELS[product.condition]}
                  </Badge>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {product.name}
                </h1>

                {product.store && (
                  <div className="flex items-center gap-2 mt-3">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <Link
                      href={`/tienda/${product.store.slug}`}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {product.store.name}
                    </Link>
                    {product.store.verified && (
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    )}
                    {product.store.rating != null && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">
                          {product.store.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="space-y-1">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold">
                    {formatPrice(product.price)}
                  </span>
                  {product.compare_at_price &&
                    product.compare_at_price > product.price && (
                      <span className="text-lg text-muted-foreground line-through">
                        {formatPrice(product.compare_at_price)}
                      </span>
                    )}
                </div>
                {product.compare_at_price &&
                  product.compare_at_price > product.price && (
                    <Badge variant="destructive">
                      Ahorras{" "}
                      {formatPrice(product.compare_at_price - product.price)}
                    </Badge>
                  )}
              </div>

              <Separator />

              {/* Specs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Almacenamiento
                  </p>
                  <p className="font-medium">{product.storage}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Color</p>
                  <p className="font-medium">{product.color}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <p className="font-medium">
                    {CONDITION_LABELS[product.condition]}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Disponibles</p>
                  <p className="font-medium">{product.stock} unidades</p>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div>
                <h3 className="font-semibold mb-2">Descripción</h3>
                <p className="text-muted-foreground">{product.description || "Sin descripción disponible"}</p>
              </div>

              <Separator />

              {/* Quantity & Add to cart */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Cantidad:</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-10 text-center font-medium">
                      {quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() =>
                        setQuantity(Math.min(product.stock, quantity + 1))
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    size="lg"
                    className="flex-1 h-12 text-base"
                    onClick={handleAddToCart}
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Agregar al carrito
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12"
                    onClick={() => product && toggleFavorite(product.id)}
                    disabled={!isLoggedIn}
                  >
                    <Heart className={`h-5 w-5 ${isFav ? "fill-red-500 text-red-500" : ""}`} />
                  </Button>
                  <Button variant="outline" size="lg" className="h-12">
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>

                {/* WhatsApp contact */}
                {product.store && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full h-12 border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                    asChild
                  >
                    <a
                      href={`https://wa.me/57?text=${encodeURIComponent(
                        `Hola, me interesa el ${product.name} que vi en IOSBogotá. ¿Está disponible?`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackContact()}
                    >
                      <MessageCircle className="mr-2 h-5 w-5" />
                      Contactar por WhatsApp
                    </a>
                  </Button>
                )}
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: ShieldCheck, label: "Garantía incluida" },
                  { icon: Truck, label: "Envío a Bogotá" },
                  { icon: CheckCircle2, label: "Producto verificado" },
                ].map((item) => (
                  <Card key={item.label}>
                    <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
                      <item.icon className="h-5 w-5 text-primary" />
                      <span className="text-xs font-medium">{item.label}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Reviews section */}
          <div className="mt-12">
            <Separator className="mb-8" />
            <ProductReviews productId={product.id} storeId={product.store_id} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
