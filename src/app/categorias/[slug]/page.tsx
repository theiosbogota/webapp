"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/products/product-card";
import { createClient } from "@/lib/supabase/client";
import type { Product, Category } from "@/types";

export default function CategoriaPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: cat } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .single();

      if (cat) {
        setCategory(cat);

        const { data: prods } = await supabase
          .from("products")
          .select("*, store:stores(*), category:categories(*)")
          .eq("category_id", cat.id)
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

  if (!category) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Categoría no encontrada</h1>
            <p className="text-muted-foreground mt-2">
              La categoría que buscas no existe.
            </p>
            <Button className="mt-4" asChild>
              <a href="/categorias">Ver todas las categorías</a>
            </Button>
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold">{category.name}</h1>
            <p className="text-muted-foreground mt-1">
              {products.length} producto{products.length !== 1 ? "s" : ""} disponible{products.length !== 1 ? "s" : ""}
            </p>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <SlidersHorizontal className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg">No hay productos en esta categoría</h3>
              <p className="text-muted-foreground mt-1">
                Pronto habrá productos disponibles
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <a href="/productos">Ver todos los productos</a>
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
