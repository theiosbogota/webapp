"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, Smartphone, Laptop, Tablet, Headphones, Watch, Plug,
  ChevronDown, ChevronRight, X, SlidersHorizontal,
} from "lucide-react";
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

/* ────────────────────────────────────────────────────────────────────
   CATEGORY TREE
   iPhone is intentionally first (the business priority).
   ──────────────────────────────────────────────────────────────────── */

type SubCategory = {
  id: string;
  label: string;
  match: (model: string) => boolean;
};

type Category = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (model: string) => boolean;
  subs: SubCategory[];
};

const CATEGORIES: Category[] = [
  {
    id: "iphone",
    label: "iPhone",
    icon: Smartphone,
    match: (m) => m.startsWith("iPhone"),
    subs: [
      { id: "iphone-17", label: "iPhone 17",    match: (m) => m.startsWith("iPhone 17") },
      { id: "iphone-16", label: "iPhone 16",    match: (m) => m.startsWith("iPhone 16") },
      { id: "iphone-15", label: "iPhone 15",    match: (m) => m.startsWith("iPhone 15") },
      { id: "iphone-14", label: "iPhone 14",    match: (m) => m.startsWith("iPhone 14") },
      { id: "iphone-13", label: "iPhone 13",    match: (m) => m.startsWith("iPhone 13") },
      { id: "iphone-12", label: "iPhone 12",    match: (m) => m.startsWith("iPhone 12") },
      { id: "iphone-se", label: "iPhone SE",    match: (m) => m.startsWith("iPhone SE") },
    ],
  },
  {
    id: "mac",
    label: "Mac",
    icon: Laptop,
    match: (m) => m.startsWith("MacBook"),
    subs: [
      { id: "mb-air-m5", label: "MacBook Air M5", match: (m) => m.startsWith("MacBook Air M5") },
      { id: "mb-air-m4", label: "MacBook Air M4", match: (m) => m.startsWith("MacBook Air M4") },
      { id: "mb-pro-m5", label: "MacBook Pro M5", match: (m) => m.startsWith("MacBook Pro M5") },
      { id: "mb-pro-m4", label: "MacBook Pro M4", match: (m) => m.startsWith("MacBook Pro M4") },
    ],
  },
  {
    id: "ipad",
    label: "iPad",
    icon: Tablet,
    match: (m) => m.startsWith("iPad"),
    subs: [
      { id: "ipad-pro",  label: "iPad Pro",  match: (m) => m.startsWith("iPad Pro") },
      { id: "ipad-air",  label: "iPad Air",  match: (m) => m.startsWith("iPad Air") },
      { id: "ipad-mini", label: "iPad Mini", match: (m) => m.startsWith("iPad Mini") },
      { id: "ipad",      label: "iPad",      match: (m) => m === "iPad 11" || m === "iPad 10" },
    ],
  },
  {
    id: "airpods",
    label: "AirPods",
    icon: Headphones,
    match: (m) => m.startsWith("AirPods"),
    subs: [
      { id: "airpods-max", label: "AirPods Max", match: (m) => m.startsWith("AirPods Max") },
      { id: "airpods-pro", label: "AirPods Pro", match: (m) => m.startsWith("AirPods Pro") },
      { id: "airpods-4",   label: "AirPods 4",   match: (m) => m === "AirPods 4" || m === "AirPods 4 ANC" },
    ],
  },
  {
    id: "watch",
    label: "Apple Watch",
    icon: Watch,
    match: (m) => m.startsWith("Apple Watch"),
    subs: [
      { id: "watch-ultra",  label: "Watch Ultra 2",  match: (m) => m.includes("Ultra") },
      { id: "watch-series", label: "Watch Series 10", match: (m) => m.includes("Series 10") },
      { id: "watch-se",     label: "Watch SE",        match: (m) => m.includes("SE") },
    ],
  },
  {
    id: "accesorios",
    label: "Accesorios",
    icon: Plug,
    match: (m) => m.startsWith("Apple Pencil") || m.includes("MagSafe"),
    subs: [
      { id: "pencil",    label: "Apple Pencil", match: (m) => m.startsWith("Apple Pencil") },
      { id: "chargers",  label: "Cargadores",   match: (m) => m.includes("MagSafe") },
    ],
  },
];

const ALL_CATEGORY_ID = "all";

/* ────────────────────────────────────────────────────────────────────
   PAGE
   ──────────────────────────────────────────────────────────────────── */

function ProductosContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("cat") || "iphone"; // iPhone is the default
  const initialSub = searchParams.get("sub") || null;

  const [sortBy, setSortBy] = useState("newest");
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [selectedStorage, setSelectedStorage] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [localSearch, setLocalSearch] = useState(searchParams.get("q") || "");
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [activeSub, setActiveSub] = useState<string | null>(initialSub);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set([initialCategory]));
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select("*, store:stores(*), category:categories(*)")
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) setAllProducts(data as Product[]);
    }
    loadProducts();
  }, []);

  /* Count products per category and subcategory */
  const counts = useMemo(() => {
    const map: Record<string, number> = { [ALL_CATEGORY_ID]: allProducts.length };
    for (const cat of CATEGORIES) {
      map[cat.id] = allProducts.filter((p) => cat.match(p.model || "")).length;
      for (const sub of cat.subs) {
        map[`${cat.id}/${sub.id}`] = allProducts.filter((p) => sub.match(p.model || "")).length;
      }
    }
    return map;
  }, [allProducts]);

  /* Filter products */
  const filtered = useMemo(() => {
    let result = [...allProducts];

    // Category filter
    if (activeCategory !== ALL_CATEGORY_ID) {
      const cat = CATEGORIES.find((c) => c.id === activeCategory);
      if (cat) {
        result = result.filter((p) => cat.match(p.model || ""));
        if (activeSub) {
          const sub = cat.subs.find((s) => s.id === activeSub);
          if (sub) result = result.filter((p) => sub.match(p.model || ""));
        }
      }
    }

    // Text search
    const q = localSearch.toLowerCase();
    if (q) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.model.toLowerCase().includes(q) ||
          p.color.toLowerCase().includes(q) ||
          p.storage?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    if (selectedCondition) result = result.filter((p) => p.condition === selectedCondition);
    if (selectedStorage) result = result.filter((p) => p.storage === selectedStorage);

    // Sort: when "newest", push iPhones first as priority
    if (sortBy === "price_asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => b.price - a.price);
    } else {
      // newest with iPhone priority
      result.sort((a, b) => {
        const aIp = a.model?.startsWith("iPhone") ? 1 : 0;
        const bIp = b.model?.startsWith("iPhone") ? 1 : 0;
        if (aIp !== bIp) return bIp - aIp;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    return result;
  }, [allProducts, activeCategory, activeSub, localSearch, selectedCondition, selectedStorage, sortBy]);

  const activeCategoryObj = CATEGORIES.find((c) => c.id === activeCategory);
  const activeSubObj = activeCategoryObj?.subs.find((s) => s.id === activeSub);

  function selectCategory(catId: string, subId: string | null = null) {
    setActiveCategory(catId);
    setActiveSub(subId);
    if (catId !== ALL_CATEGORY_ID) {
      setExpandedCats((prev) => new Set(prev).add(catId));
    }
    setMobileFiltersOpen(false);
  }

  function toggleExpanded(catId: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  const clearFilters = () => {
    setSelectedCondition(null);
    setSelectedStorage(null);
    setLocalSearch("");
  };
  const hasFilters = selectedCondition || selectedStorage || localSearch;

  /* ── Sidebar component (used on desktop + mobile drawer) ── */
  const Sidebar = (
    <aside className="w-full lg:w-[260px] flex-shrink-0">
      <div className="lg:sticky lg:top-24 space-y-5">
        {/* Search */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[#888] mb-2 block">
            Buscar
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="iPhone, color, GB…"
              className="pl-10 h-10"
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                if (e.target.value.length >= 3) trackSearch(e.target.value);
              }}
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[#888] mb-2 block">
            Categorías
          </label>
          <nav className="space-y-0.5">
            {/* All products button */}
            <button
              onClick={() => selectCategory(ALL_CATEGORY_ID)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                activeCategory === ALL_CATEGORY_ID
                  ? "bg-[#D4A843]/10 text-[#D4A843] font-semibold"
                  : "text-[#bbb] hover:bg-white/5"
              }`}
            >
              <span>Todos los productos</span>
              <span className="text-[10px] text-[#666]">{counts[ALL_CATEGORY_ID] || 0}</span>
            </button>

            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              const isExpanded = expandedCats.has(cat.id);
              const count = counts[cat.id] || 0;
              return (
                <div key={cat.id}>
                  <div className="flex items-stretch">
                    <button
                      onClick={() => selectCategory(cat.id)}
                      className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-l-md text-sm transition-colors ${
                        isActive && !activeSub
                          ? "bg-[#D4A843]/10 text-[#D4A843] font-semibold"
                          : "text-[#bbb] hover:bg-white/5"
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1 text-left">{cat.label}</span>
                      <span className="text-[10px] text-[#666]">{count}</span>
                    </button>
                    {cat.subs.length > 0 && (
                      <button
                        onClick={() => toggleExpanded(cat.id)}
                        className="px-2 rounded-r-md text-[#888] hover:bg-white/5 hover:text-white transition-colors"
                        aria-label={isExpanded ? "Contraer" : "Expandir"}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  {isExpanded && cat.subs.length > 0 && (
                    <div className="ml-6 mt-0.5 space-y-0.5 border-l border-white/5 pl-2">
                      {cat.subs.map((sub) => {
                        const subCount = counts[`${cat.id}/${sub.id}`] || 0;
                        if (subCount === 0) return null;
                        const isSubActive = isActive && activeSub === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => selectCategory(cat.id, sub.id)}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors ${
                              isSubActive
                                ? "bg-[#D4A843]/10 text-[#D4A843] font-semibold"
                                : "text-[#888] hover:bg-white/5 hover:text-[#bbb]"
                            }`}
                          >
                            <span>{sub.label}</span>
                            <span className="text-[10px] text-[#555]">{subCount}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Filters */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[#888] mb-2 block">
            Filtros
          </label>
          <div className="space-y-2">
            <Select
              value={selectedCondition || ""}
              onValueChange={(v) => setSelectedCondition(v === "__all__" ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado del producto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Cualquier estado</SelectItem>
                {Object.entries(CONDITION_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedStorage || ""}
              onValueChange={(v) => setSelectedStorage(v === "__all__" ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Almacenamiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Cualquier almacenamiento</SelectItem>
                {STORAGE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2 w-full text-xs">
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 lg:py-8">
          {/* Page header */}
          <div className="mb-6 lg:mb-8 flex items-end justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                {activeSubObj?.label || activeCategoryObj?.label || "Todos los productos"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {filtered.length} {filtered.length === 1 ? "producto disponible" : "productos disponibles"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Más relevantes</SelectItem>
                  <SelectItem value="price_asc">Menor precio</SelectItem>
                  <SelectItem value="price_desc">Mayor precio</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileFiltersOpen((v) => !v)}
                aria-label="Filtros"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Active filter chips */}
          {(selectedCondition || selectedStorage) && (
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedCondition && (
                <Badge variant="secondary" className="gap-1">
                  {CONDITION_LABELS[selectedCondition]}
                  <button onClick={() => setSelectedCondition(null)} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              {selectedStorage && (
                <Badge variant="secondary" className="gap-1">
                  {selectedStorage}
                  <button onClick={() => setSelectedStorage(null)} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
            </div>
          )}

          {/* Layout: sidebar + grid */}
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Desktop sidebar */}
            <div className="hidden lg:block">{Sidebar}</div>

            {/* Mobile filters drawer */}
            {mobileFiltersOpen && (
              <div className="lg:hidden border border-white/10 rounded-xl p-4 bg-[#0A0A0A]">
                {Sidebar}
              </div>
            )}

            {/* Products grid */}
            <div className="flex-1 min-w-0">
              {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6">
                  {filtered.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border border-white/5 rounded-xl bg-[#0A0A0A]/50">
                  <SlidersHorizontal className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg">No se encontraron productos</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Prueba con otra categoría o ajusta los filtros
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => { clearFilters(); selectCategory("iphone"); }}>
                    Ver iPhones
                  </Button>
                </div>
              )}
            </div>
          </div>
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
