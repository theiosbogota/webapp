"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice, CONDITION_LABELS } from "@/lib/constants";
import { useCartStore } from "@/stores/cart-store";
import { trackAddToCart } from "@/components/meta-pixel";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, openCart } = useCartStore();

  const discount =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round(
          ((product.compare_at_price - product.price) /
            product.compare_at_price) *
            100
        )
      : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    openCart();
    trackAddToCart(product.price, "COP", product.name, product.id);
  };

  return (
    <Card className="card-3d group overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm">
      <Link href={`/productos/${product.slug}`}>
        <div className="relative aspect-square bg-muted/30 overflow-hidden">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-muted/30 to-muted/10">
              <div className="text-center">
                <div className="bg-gold/10 rounded-full p-4 mx-auto w-fit mb-2">
                  <ShoppingCart className="h-8 w-8 text-gold" />
                </div>
                <p className="text-xs text-muted-foreground">{product.model}</p>
              </div>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {discount && (
              <Badge className="text-xs bg-gold text-gold-foreground hover:bg-gold/90">
                -{discount}%
              </Badge>
            )}
            {product.condition === "nuevo" && (
              <Badge className="text-xs bg-foreground text-background hover:bg-foreground/90">
                Nuevo
              </Badge>
            )}
            {product.featured && (
              <Badge variant="outline" className="text-xs border-gold/40 text-gold">
                Destacado
              </Badge>
            )}
          </div>

          {/* Quick actions */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full shadow-md"
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {product.model}
              </p>
              <h3 className="font-semibold text-sm line-clamp-2 mt-0.5 group-hover:text-primary transition-colors">
                {product.name}
              </h3>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {product.storage}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {CONDITION_LABELS[product.condition] || product.condition}
              </Badge>
            </div>

            {product.store && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {product.store.rating != null && (
                  <>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{product.store.rating.toFixed(1)}</span>
                  </>
                )}
                <span>· {product.store.name}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="font-bold text-lg text-gold gold-glow-text">
                  {formatPrice(product.price)}
                </p>
                {product.compare_at_price &&
                  product.compare_at_price > product.price && (
                    <p className="text-xs text-muted-foreground line-through">
                      {formatPrice(product.compare_at_price)}
                    </p>
                  )}
              </div>
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-gold text-gold-foreground hover:bg-gold/90"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Agregar</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
