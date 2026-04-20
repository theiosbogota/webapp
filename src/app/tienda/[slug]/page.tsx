"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Star, CheckCircle2, ShoppingBag, Loader2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/products/product-card";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/types";

interface StoreProfile {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  rating: number;
  total_sales: number;
  verified: boolean;
  created_at: string;
}

export default function TiendaPublicaPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [store, setStore] = useState<StoreProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("slug", slug)
        .eq("active", true)
        .single();

      if (storeData) {
        setStore(storeData);

        const { data: prods } = await supabase
          .from("products")
          .select("*, store:stores(*), category:categories(*)")
          .eq("store_id", storeData.id)
          .eq("active", true)
          .order("created_at", { ascending: false });

        setProducts((prods as Product[]) || []);
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

  if (!store) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Tienda no encontrada</h1>
            <p className="text-muted-foreground mt-2">
              La tienda que buscas no existe o fue desactivada.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Store header */}
          <Card className="mb-8">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="bg-primary text-primary-foreground rounded-2xl p-6 w-fit">
                  <ShoppingBag className="h-10 w-10" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold">{store.name}</h1>
                    {store.verified && (
                      <CheckCircle2 className="h-6 w-6 text-blue-500" />
                    )}
                  </div>
                  {store.description && (
                    <p className="text-muted-foreground mt-1">{store.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{store.rating.toFixed(1)}</span>
                    </div>
                    <Badge variant="secondary">
                      {store.total_sales} ventas
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Desde {new Date(store.created_at).toLocaleDateString("es-CO", { year: "numeric", month: "long" })}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <div className="mb-4">
            <h2 className="text-xl font-bold">
              Productos ({products.length})
            </h2>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Esta tienda aún no tiene productos publicados
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
