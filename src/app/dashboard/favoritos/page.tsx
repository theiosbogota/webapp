"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Heart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, CONDITION_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

interface FavoriteProduct {
  id: string;
  product_id: string;
  product: {
    id: string;
    name: string;
    slug: string;
    model: string;
    condition: string;
    storage: string;
    price: number;
    images: string[];
    active: boolean;
  };
}

export default function FavoritosPage() {
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("favorites")
        .select("id, product_id, product:products(id, name, slug, model, condition, storage, price, images, active)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setFavorites((data as unknown as FavoriteProduct[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  async function removeFavorite(favId: string) {
    const supabase = createClient();
    await supabase.from("favorites").delete().eq("id", favId);
    setFavorites(favorites.filter((f) => f.id !== favId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Mis Favoritos</h1>
        <p className="text-muted-foreground">
          {favorites.length} producto{favorites.length !== 1 ? "s" : ""} guardado{favorites.length !== 1 ? "s" : ""}
        </p>
      </div>

      {favorites.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Aún no has guardado ningún producto como favorito
            </p>
            <Button asChild>
              <Link href="/productos">Explorar productos</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((fav) => (
            <Card key={fav.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/productos/${fav.product.slug}`}
                      className="font-medium text-sm hover:underline line-clamp-2"
                    >
                      {fav.product.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {fav.product.model}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {CONDITION_LABELS[fav.product.condition as keyof typeof CONDITION_LABELS]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {fav.product.storage}
                    </p>
                    <p className="font-bold mt-2">{formatPrice(fav.product.price)}</p>
                    {!fav.product.active && (
                      <p className="text-xs text-destructive mt-1">Producto no disponible</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeFavorite(fav.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
