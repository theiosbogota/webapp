"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  Search,
  Save,
  RotateCcw,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, CONDITION_LABELS } from "@/lib/constants";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  model: string;
  condition: string;
  storage: string;
  color: string;
  price: number;
  compare_at_price: number | null;
  cost_price: number;
  stock: number;
  active: boolean;
  images: string[];
  category: { name: string } | null;
  store: { name: string } | null;
}

interface PriceChange {
  id: string;
  price: number;
  compare_at_price: number | null;
  cost_price: number;
}

type PriceField = "price" | "compare_at_price" | "cost_price";

export default function AdminPreciosPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [changes, setChanges] = useState<Map<string, PriceChange>>(new Map());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterCondition, setFilterCondition] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("model");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [bulkPercent, setBulkPercent] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select("*, category:categories(name), store:stores(name)")
      .eq("active", true)
      .gt("stock", 0)
      .order("model", { ascending: true });
    setProducts((data as unknown as ProductRow[]) || []);
    setLoading(false);
  }

  const categories = Array.from(
    new Set(products.map((p) => p.category?.name || "Sin categoría"))
  ).sort();

  const filtered = products
    .filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.model?.toLowerCase().includes(q) ||
        p.storage?.toLowerCase().includes(q) ||
        p.color?.toLowerCase().includes(q);
      const matchCategory =
        filterCategory === "all" ||
        (p.category?.name || "Sin categoría") === filterCategory;
      const matchCondition =
        filterCondition === "all" || p.condition === filterCondition;
      const matchActive =
        filterActive === "all" ||
        (filterActive === "active" && p.active) ||
        (filterActive === "inactive" && !p.active);
      return matchSearch && matchCategory && matchCondition && matchActive;
    })
    .sort((a, b) => {
      let va: string | number = a[sortField as keyof ProductRow] as string || "";
      let vb: string | number = b[sortField as keyof ProductRow] as string || "";
      if (sortField === "price" || sortField === "stock") {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  function getChange(id: string): PriceChange | undefined {
    return changes.get(id);
  }

  function updatePrice(id: string, field: PriceField, value: string) {
    const num = value === "" ? 0 : parseInt(value.replace(/[^0-9]/g, ""), 10);
    if (isNaN(num)) return;
    const product = products.find((p) => p.id === id);
    const existing = changes.get(id) || {
      id,
      price: product?.price || 0,
      compare_at_price: product?.compare_at_price || null,
      cost_price: product?.cost_price || 0,
    };
    const updated = { ...existing, [field]: field === "compare_at_price" && value === "" ? null : num };
    setChanges(new Map(changes).set(id, updated));
  }

  function getDisplayPrice(id: string, field: PriceField): number | null {
    const change = changes.get(id);
    if (change) return change[field] ?? 0;
    const product = products.find((p) => p.id === id);
    return product ? (product[field] ?? 0) : null;
  }

  function revertChange(id: string) {
    const newChanges = new Map(changes);
    newChanges.delete(id);
    setChanges(newChanges);
  }

  function revertAll() {
    setChanges(new Map());
    setSelectedIds(new Set());
  }

  function toggleSort(field: string) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: string }) {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 inline ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 inline ml-1" />
    );
  }

  function toggleSelect(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  }

  function selectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  }

  function applyBulkPercent() {
    const pct = parseFloat(bulkPercent);
    if (isNaN(pct) || selectedIds.size === 0) return;
    const factor = 1 + pct / 100;
    const newChanges = new Map(changes);
    selectedIds.forEach((id) => {
      const product = products.find((p) => p.id === id);
      if (!product) return;
      const existing = newChanges.get(id) || {
        id,
        price: product.price,
        compare_at_price: product.compare_at_price,
        cost_price: product.cost_price || 0,
      };
      newChanges.set(id, {
        ...existing,
        price: Math.round(existing.price * factor),
        compare_at_price: existing.compare_at_price
          ? Math.round(existing.compare_at_price * factor)
          : null,
      });
    });
    setChanges(newChanges);
    setBulkPercent("");
  }

  function applyBulkFixed(field: PriceField, value: string) {
    const num = parseInt(value.replace(/[^0-9]/g, ""), 10);
    if (isNaN(num) || selectedIds.size === 0) return;
    const newChanges = new Map(changes);
    selectedIds.forEach((id) => {
      const product = products.find((p) => p.id === id);
      if (!product) return;
      const existing = newChanges.get(id) || {
        id,
        price: product.price,
        compare_at_price: product.compare_at_price,
        cost_price: product.cost_price || 0,
      };
      newChanges.set(id, {
        ...existing,
        [field]: field === "compare_at_price" && value === "" ? null : num,
      });
    });
    setChanges(newChanges);
  }

  async function saveChanges() {
    if (changes.size === 0) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const updates = Array.from(changes.values()).map((c) => ({
      id: c.id,
      price: c.price,
      compare_at_price: c.compare_at_price,
      cost_price: c.cost_price,
    }));

    let errors = 0;
    // Batch update - Supabase doesn't support bulk PATCH, so we do individual updates
    await Promise.all(
      updates.map((u) =>
        supabase
          .from("products")
          .update({ price: u.price, compare_at_price: u.compare_at_price, cost_price: u.cost_price })
          .eq("id", u.id)
          .then(({ error }) => {
            if (error) {
              errors++;
              console.error("Error updating", u.id, error);
            }
          })
      )
    );

    setSaving(false);
    if (errors > 0) {
      setError(`${errors} producto(s) no se pudieron actualizar`);
    } else {
      setSaved(true);
      setChanges(new Map());
      setSelectedIds(new Set());
      // Refresh products to reflect saved changes
      await loadProducts();
      setTimeout(() => setSaved(false), 3000);
    }
  }

  const changeCount = changes.size;
  const hasChanges = changeCount > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-[#D4A843]/20 border-t-[#D4A843]"
        />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A843] to-[#8B6914]">
            <DollarSign className="h-5 w-5 text-[#0A0A0A]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#FAFAFA]">Editor de Precios</h1>
            <p className="text-sm text-[#888888]">
              {products.length} productos publicados ·{" "}
              <span className="text-[#D4A843]">{changeCount} cambio{changeCount !== 1 ? "s" : ""} pendiente{changeCount !== 1 ? "s" : ""}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={revertAll}
              className="border-[rgba(212,168,67,0.2)] text-[#888] hover:text-white hover:border-[#EF4444]"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Revertir
            </Button>
          )}
          <Button
            size="sm"
            disabled={!hasChanges || saving}
            onClick={saveChanges}
            className={
              saved
                ? "bg-[#22C55E] hover:bg-[#22C55E] text-white"
                : "bg-[#D4A843] hover:bg-[#F0D78C] text-black"
            }
          >
            {saving ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-4 w-4 rounded-full border-2 border-black/20 border-t-black"
              />
            ) : saved ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Guardado
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Guardar {changeCount > 0 ? `(${changeCount})` : ""}
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Error banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-2 rounded-lg bg-[#1A0A0A] border border-[rgba(239,68,68,0.2)] p-3 text-[#EF4444] text-sm"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-[#888] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {/* Search + Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
            <input
              type="text"
              placeholder="Buscar por nombre, modelo, almacenamiento, color..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 rounded-lg border border-[rgba(212,168,67,0.12)] bg-[#111] pl-9 pr-3 text-sm text-[#FAFAFA] placeholder:text-[#555] focus:outline-none focus:border-[#D4A843]/40"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`border-[rgba(212,168,67,0.2)] ${showFilters ? "text-[#D4A843] border-[#D4A843]/40" : "text-[#888] hover:text-white"}`}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filtros
            {(filterCategory !== "all" || filterCondition !== "all" || filterActive !== "all") && (
              <Badge className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center bg-[#D4A843] text-black text-[10px] rounded-full">
                !
              </Badge>
            )}
          </Button>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-3 rounded-lg bg-[#111] border border-[rgba(212,168,67,0.08)] p-3"
          >
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#888]">Categoría:</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-8 rounded-md border border-[rgba(212,168,67,0.12)] bg-[#0D0D0D] px-2 text-sm text-[#FAFAFA]"
              >
                <option value="all">Todas</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#888]">Condición:</label>
              <select
                value={filterCondition}
                onChange={(e) => setFilterCondition(e.target.value)}
                className="h-8 rounded-md border border-[rgba(212,168,67,0.12)] bg-[#0D0D0D] px-2 text-sm text-[#FAFAFA]"
              >
                <option value="all">Todas</option>
                {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#888]">Estado:</label>
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="h-8 rounded-md border border-[rgba(212,168,67,0.12)] bg-[#0D0D0D] px-2 text-sm text-[#FAFAFA]"
              >
                <option value="all">Todos</option>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterCategory("all");
                setFilterCondition("all");
                setFilterActive("all");
              }}
              className="text-[#555] hover:text-[#D4A843] text-xs"
            >
              Limpiar filtros
            </Button>
          </motion.div>
        )}
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-[#111] border border-[rgba(212,168,67,0.15)] p-3"
        >
          <span className="text-sm text-[#D4A843] font-medium">
            {selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="% ej: 10 o -5"
              value={bulkPercent}
              onChange={(e) => setBulkPercent(e.target.value)}
              className="w-24 h-8 rounded-md border border-[rgba(212,168,67,0.12)] bg-[#0D0D0D] px-2 text-sm text-[#FAFAFA] placeholder:text-[#555]"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={applyBulkPercent}
              disabled={!bulkPercent || selectedIds.size === 0}
              className="border-[rgba(212,168,67,0.3)] text-[#D4A843] hover:bg-[rgba(212,168,67,0.1)]"
            >
              Aplicar %
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            className="text-[#555] hover:text-white text-xs"
          >
            Deseleccionar
          </Button>
        </motion.div>
      )}

      {/* Table */}
      <div className="rounded-2xl bg-[#111111] border border-[rgba(212,168,67,0.12)] overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#0D0D0D] border-b border-[rgba(212,168,67,0.08)] hover:bg-[#0D0D0D]">
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={selectAll}
                    className="rounded border-[#555] bg-[#0D0D0D] accent-[#D4A843]"
                  />
                </TableHead>
                <TableHead
                  className="text-[#D4A843] font-semibold cursor-pointer select-none"
                  onClick={() => toggleSort("model")}
                >
                  Producto <SortIcon field="model" />
                </TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Alm.</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Color</TableHead>
                <TableHead
                  className="text-[#D4A843] font-semibold cursor-pointer select-none"
                  onClick={() => toggleSort("condition")}
                >
                  Cond. <SortIcon field="condition" />
                </TableHead>
                <TableHead
                  className="text-[#D4A843] font-semibold cursor-pointer select-none min-w-[120px]"
                  onClick={() => toggleSort("cost_price")}
                >
                  💰 P. Compra <SortIcon field="cost_price" />
                </TableHead>
                <TableHead
                  className="text-[#D4A843] font-semibold cursor-pointer select-none min-w-[120px]"
                  onClick={() => toggleSort("price")}
                >
                  🏷️ P. Venta <SortIcon field="price" />
                </TableHead>
                <TableHead className="text-[#D4A843] font-semibold min-w-[120px]">
                  📉 P. Antes
                </TableHead>
                <TableHead className="text-[#D4A843] font-semibold min-w-[100px]">
                  📈 Margen
                </TableHead>
                <TableHead
                  className="text-[#D4A843] font-semibold cursor-pointer select-none"
                  onClick={() => toggleSort("stock")}
                >
                  Stock <SortIcon field="stock" />
                </TableHead>
                <TableHead className="text-[#D4A843] font-semibold w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-[#555555]">
                    No hay productos que coincidan
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const change = getChange(p.id);
                  const hasChange = !!change;
                  const currentCost = getDisplayPrice(p.id, "cost_price") ?? 0;
                  const currentPrice = getDisplayPrice(p.id, "price") ?? 0;
                  const currentCompare = getDisplayPrice(p.id, "compare_at_price");
                  const priceDiff = change ? change.price - p.price : 0;
                  const profit = currentPrice - currentCost;
                  const margin = currentCost > 0 ? Math.round((profit / currentCost) * 100) : 0;
                  const isSelected = selectedIds.has(p.id);

                  return (
                    <TableRow
                      key={p.id}
                      className={`border-b border-[rgba(212,168,67,0.05)] ${hasChange ? "bg-[rgba(212,168,67,0.04)]" : "hover:bg-[rgba(212,168,67,0.03)]"} ${isSelected ? "bg-[rgba(212,168,67,0.06)]" : ""}`}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(p.id)}
                          className="rounded border-[#555] bg-[#0D0D0D] accent-[#D4A843]"
                        />
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px]">
                        <div className="flex items-center gap-2">
                          {p.images?.[0] && (
                            <img
                              src={p.images[0]}
                              alt=""
                              className="h-8 w-8 rounded-md object-cover bg-[#1A1A1A]"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm text-[#FAFAFA] truncate">{p.name}</p>
                            <p className="text-[10px] text-[#555]">{p.category?.name || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-[#888]">{p.storage || "—"}</TableCell>
                      <TableCell className="text-sm text-[#888]">{p.color || "—"}</TableCell>
                      <TableCell>
                        <Badge className="border-0 bg-[rgba(212,168,67,0.12)] text-[#D4A843] text-[10px]">
                          {CONDITION_LABELS[p.condition as keyof typeof CONDITION_LABELS] || p.condition}
                        </Badge>
                      </TableCell>
                      {/* P. Compra (cost_price) */}
                      <TableCell>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#555] text-sm">$</span>
                          <input
                            type="text"
                            value={currentCost ? currentCost.toLocaleString("es-CO") : ""}
                            onChange={(e) => updatePrice(p.id, "cost_price", e.target.value)}
                            placeholder="0"
                            className={`w-28 h-8 rounded-md border pl-5 pr-2 text-sm text-right font-mono focus:outline-none focus:border-[#D4A843]/50 transition-colors placeholder:text-[#333] ${
                              hasChange
                                ? "border-[#D4A843]/30 bg-[rgba(212,168,67,0.06)] text-[#D4A843]"
                                : "border-[rgba(212,168,67,0.08)] bg-[#0D0D0D] text-[#FAFAFA]"
                            }`}
                          />
                        </div>
                      </TableCell>
                      {/* P. Venta (price) */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#555] text-sm">$</span>
                            <input
                              type="text"
                              value={currentPrice ? currentPrice.toLocaleString("es-CO") : ""}
                              onChange={(e) => updatePrice(p.id, "price", e.target.value)}
                              className={`w-28 h-8 rounded-md border pl-5 pr-2 text-sm text-right font-mono focus:outline-none focus:border-[#D4A843]/50 transition-colors ${
                                hasChange
                                  ? "border-[#D4A843]/30 bg-[rgba(212,168,67,0.06)] text-[#D4A843]"
                                  : "border-[rgba(212,168,67,0.08)] bg-[#0D0D0D] text-[#FAFAFA]"
                              }`}
                            />
                          </div>
                          {hasChange && priceDiff !== 0 && (
                            <span
                              className={`text-[10px] font-bold ${priceDiff > 0 ? "text-[#EF4444]" : "text-[#22C55E]"}`}
                            >
                              {priceDiff > 0 ? "+" : ""}
                              {priceDiff.toLocaleString("es-CO")}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      {/* P. Antes (compare_at_price) */}
                      <TableCell>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#555] text-sm">$</span>
                          <input
                            type="text"
                            value={currentCompare ? currentCompare.toLocaleString("es-CO") : ""}
                            onChange={(e) => updatePrice(p.id, "compare_at_price", e.target.value)}
                            placeholder="—"
                            className={`w-28 h-8 rounded-md border pl-5 pr-2 text-sm text-right font-mono focus:outline-none focus:border-[#D4A843]/50 transition-colors placeholder:text-[#333] ${
                              hasChange
                                ? "border-[#D4A843]/30 bg-[rgba(212,168,67,0.06)] text-[#D4A843]"
                                : "border-[rgba(212,168,67,0.08)] bg-[#0D0D0D] text-[#FAFAFA]"
                            }`}
                          />
                        </div>
                      </TableCell>
                      {/* Margen */}
                      <TableCell>
                        {currentCost > 0 ? (
                          <div className="flex flex-col">
                            <span className={`text-xs font-mono font-bold ${profit > 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                              {profit > 0 ? "+" : ""}{profit.toLocaleString("es-CO")}
                            </span>
                            <span className={`text-[10px] ${margin > 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                              {margin}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#444]">sin costo</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-[#FAFAFA]">{p.stock}</TableCell>
                      <TableCell>
                        {hasChange && (
                          <button
                            onClick={() => revertChange(p.id)}
                            className="text-[#555] hover:text-[#EF4444] transition-colors"
                            title="Revertir cambio"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Summary bar */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 md:left-72 z-40 bg-[#050505] border-t border-[rgba(212,168,67,0.15)] px-4 md:px-6 py-3"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#888]">
                <span className="text-[#D4A843] font-bold">{changeCount}</span> cambio
                {changeCount !== 1 ? "s" : ""} sin guardar
              </span>
              {Array.from(changes.values()).some((c) => {
                const orig = products.find((p) => p.id === c.id);
                return orig && c.price !== orig.price;
              }) && (
                <span className="text-xs text-[#555]">
                  Total venta:{" "}
                  <span className="text-[#D4A843]">
                    {formatPrice(
                      filtered.reduce((sum, p) => {
                        const ch = changes.get(p.id);
                        return sum + (ch ? ch.price : p.price);
                      }, 0)
                    )}
                  </span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={revertAll}
                className="text-[#888] hover:text-[#EF4444]"
              >
                Revertir todo
              </Button>
              <Button
                size="sm"
                disabled={saving}
                onClick={saveChanges}
                className={
                  saved
                    ? "bg-[#22C55E] hover:bg-[#22C55E] text-white"
                    : "bg-[#D4A843] hover:bg-[#F0D78C] text-black"
                }
              >
                {saving ? "Guardando..." : saved ? "✓ Guardado" : `Guardar (${changeCount})`}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
