"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/products/product-card";
import { CONDITION_LABELS, STORAGE_OPTIONS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { trackSearch } from "@/components/meta-pixel";
import type { Product } from "@/types";

function ProductosContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const [sortBy, setSortBy] = useState("newest");
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [selectedStorage, setSelectedStorage] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    async function loadProducts() {
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select("*, store:stores(*), category:categories(*)")
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setAllProducts(data as Product[]);
      }
    }
    loadProducts();
  }, []);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  let filtered = [...allProducts];

  // Text search
  const q = localSearch.toLowerCase();
  if (q) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        p.color.toLowerCase().includes(q) ||
        p.storage.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }

  if (selectedCondition) {
    filtered = filtered.filter((p) => p.condition === selectedCondition);
  }
  if (selectedStorage) {
    filtered = filtered.filter((p) => p.storage === selectedStorage);
  }

  if (sortBy === "price_asc") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortBy === "price_desc") {
    filtered.sort((a, b) => b.price - a.price);
  }

  const clearFilters = () => {
    setSelectedCondition(null);
    setSelectedStorage(null);
  };

  const hasFilters = selectedCondition || selectedStorage;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Todos los iPhones</h1>
            <p className="text-muted-foreground mt-1">
              {filtered.length} productos disponibles
            </p>
          </div>

          {/* Filters bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por modelo, color..."
                className="pl-10"
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  if (e.target.value.length >= 3) trackSearch(e.target.value);
                }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select
                value={selectedCondition || ""}
                onValueChange={(v) => setSelectedCondition(v || null)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONDITION_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedStorage || ""}
                onValueChange={(v) => setSelectedStorage(v || null)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Almacenamiento" />
                </SelectTrigger>
                <SelectContent>
                  {STORAGE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Más recientes</SelectItem>
                  <SelectItem value="price_asc">Menor precio</SelectItem>
                  <SelectItem value="price_desc">Mayor precio</SelectItem>
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Active filters */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedCondition && (
                <Badge variant="secondary" className="gap-1">
                  {CONDITION_LABELS[selectedCondition]}
                  <button
                    onClick={() => setSelectedCondition(null)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {selectedStorage && (
                <Badge variant="secondary" className="gap-1">
                  {selectedStorage}
                  <button
                    onClick={() => setSelectedStorage(null)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
          )}

          {/* Products grid */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <SlidersHorizontal className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg">No se encontraron productos</h3>
              <p className="text-muted-foreground mt-1">
                Intenta ajustar los filtros de búsqueda
              </p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function ProductosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <ProductosContent />
    </Suspense>
  );
}
