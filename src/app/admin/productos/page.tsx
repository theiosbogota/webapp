"use client";

import React from "react";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, Smartphone, Save, RotateCcw, Check, Search,
  TrendingUp, ChevronDown, ChevronRight,
  Package, Plus, Pencil, Trash2, AlertTriangle, DollarSign, Wallet,
  Copy, BarChart3, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice, CONDITION_LABELS } from "@/lib/constants";
import ProductDialog, { DeleteConfirmDialog, type ProductFull } from "./_components/ProductDialog";
import ProductInsightsDialog from "./_components/ProductInsightsDialog";

/* ── Error Boundary ── */
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  constructor(props: {children: React.ReactNode}) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{padding: 40, color: '#ff6b6b', fontFamily: 'monospace', fontSize: 14}}>
          <h2 style={{color: '#fff', marginBottom: 16}}>Error en Productos</h2>
          <pre style={{whiteSpace: 'pre-wrap', background: '#1a1a1a', padding: 16, borderRadius: 8}}>
            {this.state.error.message}{'\n\n'}{this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ProductosPageWrapper() {
  return <ErrorBoundary><AdminProductosPage /></ErrorBoundary>;
}

/* ── Color map for color dots ── */
const COLOR_HEX: Record<string, string> = {
  blanco: "#F5F5F0", negro: "#1A1A1A", medianoche: "#1C1C3A",
  azul: "#4A90D9", "sierra azul": "#6BA3BE", "titanio azul": "#5B7C99",
  "titanio natural": "#9A9388", "titanio blanco": "#E8E4DE", "titanio negro": "#2C2C2E",
  "titanio desierto": "#C4A882", titanio: "#8C8279", plata: "#C0C0C0",
  "espacio gris": "#555555", "espacio profundo": "#2D2D3F",
  dorado: "#D4A843", oro: "#D4A843", estrella: "#F2E8D5",
  rosa: "#F4C2C2", rojo: "#CC3333", verde: "#4CAF50",
  amarillo: "#FFD700", morado: "#7B68AE", grafito: "#4A4A4A",
  "jet black": "#0A0A0A",
};

function getColorHex(color: string): string {
  return COLOR_HEX[color.toLowerCase()] || "#888888";
}

/* ── Types ── */
interface ProductRow {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  description?: string;
  model: string;
  condition: string;
  storage: string;
  color: string;
  price: number;
  compare_at_price: number | null;
  cost_price: number;
  stock: number;
  featured: boolean;
  active: boolean;
  images: string[];
  purchase_notes?: string | null;
  last_purchased_at?: string | null;
  deleted_at?: string | null;
  created_at: string;
  store: { name: string } | null;
}

interface FieldEdit {
  cost_price?: number;
  price?: number;
  stock?: number;
}

/* ── Component ── */
function AdminProductosPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [filterCondition, setFilterCondition] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Map<string, FieldEdit>>(new Map());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  // Modal state
  const [editingProduct, setEditingProduct] = useState<ProductFull | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<ProductRow | null>(null);
  // Insights modal
  const [insightsProduct, setInsightsProduct] = useState<ProductRow | null>(null);
  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => { loadProducts(); }, [showDeleted]);

  async function loadProducts() {
    try {
      const res = await fetch(`/api/admin/products${showDeleted ? '?deleted=1' : ''}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setProducts((data as ProductRow[]) || []);
    } catch (e) {
      console.error('loadProducts error:', e);
    } finally {
      setLoading(false);
    }
  }

  // ─── CRUD: Crear / Editar / Eliminar ───
  function openCreateDialog() {
    setEditingProduct(null);
    setShowDialog(true);
  }

  function openEditDialog(p: ProductRow) {
    setEditingProduct({
      id: p.id,
      store_id: p.store_id,
      name: p.name,
      slug: p.slug,
      description: p.description || "",
      model: p.model,
      condition: p.condition,
      storage: p.storage,
      color: p.color,
      price: p.price,
      compare_at_price: p.compare_at_price,
      cost_price: p.cost_price || 0,
      stock: p.stock,
      featured: p.featured,
      active: p.active,
      images: p.images || [],
      purchase_notes: p.purchase_notes || "",
      last_purchased_at: p.last_purchased_at || null,
    });
    setShowDialog(true);
  }

  async function softDeleteProduct(id: string) {
    await fetch('/api/admin/products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'delete' }),
    });
    setDeletingProduct(null);
    await loadProducts();
  }

  async function restoreProduct(id: string) {
    await fetch('/api/admin/products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'restore' }),
    });
    await loadProducts();
  }

  async function cloneProduct(p: ProductRow) {
    const newSlug = `${p.slug}-copia-${Date.now().toString(36).slice(-4)}`;
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product: {
        store_id: p.store_id,
        name: `${p.name} (copia)`,
        slug: newSlug,
        description: p.description || "",
        model: p.model,
        condition: p.condition,
        storage: p.storage,
        color: p.color,
        price: p.price,
        compare_at_price: p.compare_at_price,
        cost_price: p.cost_price || 0,
        stock: 0,
        images: p.images || [],
        featured: false,
        active: false,
      }}),
    });
    if (res.ok) await loadProducts();
  }

  // Bulk selection
  function toggleSelected(id: string) {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelected(n);
  }

  function clearSelection() { setSelected(new Set()); }

  async function bulkAction(action: "activate" | "deactivate" | "delete") {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const fields: Record<string, unknown> =
      action === "activate" ? { active: true }
      : action === "deactivate" ? { active: false }
      : { deleted_at: new Date().toISOString(), active: false };
    await fetch('/api/admin/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: ids.map(id => ({ id, ...fields })) }),
    });
    clearSelection();
    await loadProducts();
  }

  /* ── Derived data ── */
  const allColors = useMemo(() => {
    const s = new Set(products.map((p) => p.color).filter(Boolean));
    return Array.from(s).sort();
  }, [products]);

  const allConditions = useMemo(() => {
    const s = new Set(products.map((p) => p.condition).filter(Boolean));
    return Array.from(s).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      if (q && !p.name?.toLowerCase().includes(q) && !p.model?.toLowerCase().includes(q) && !p.color?.toLowerCase().includes(q) && !p.storage?.toLowerCase().includes(q)) return false;
      if (filterColor && p.color !== filterColor) return false;
      if (filterCondition && p.condition !== filterCondition) return false;
      return true;
    });
  }, [products, search, filterColor, filterCondition]);

  /* Group filtered products by model */
  const groups = useMemo(() => {
    const map = new Map<string, ProductRow[]>();
    for (const p of filtered) {
      const arr = map.get(p.model) || [];
      arr.push(p);
      map.set(p.model, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  /* ── Edit helpers ── */
  function parseNum(val: string): number {
    const n = parseInt(val.replace(/[^0-9]/g, ""), 10);
    return isNaN(n) ? 0 : n;
  }

  function updateEdit(id: string, field: keyof FieldEdit, val: string) {
    const num = parseNum(val);
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const existing = edits.get(id) || {};
    setEdits(new Map(edits).set(id, { ...existing, [field]: num }));
  }

  function getVal(id: string, field: "cost_price" | "price" | "stock"): number {
    const e = edits.get(id);
    if (e && e[field] !== undefined) return e[field]!;
    const p = products.find((pr) => pr.id === id);
    return p ? (p[field] || 0) : 0;
  }

  function hasEdit(id: string): boolean { return edits.has(id); }

  function revertEdit(id: string) {
    const n = new Map(edits);
    n.delete(id);
    setEdits(n);
  }

  function revertAll() { setEdits(new Map()); }

  async function toggleActive(id: string, current: boolean) {
    await fetch('/api/admin/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: [{ id, active: !current }] }),
    });
    setProducts(products.map((p) => (p.id === id ? { ...p, active: !current } : p)));
  }

  async function saveAll() {
    if (edits.size === 0) return;
    setSaving(true);
    const updates = Array.from(edits.entries()).map(([id, e]) => {
      const upd: Record<string, unknown> = { id };
      if (e.cost_price !== undefined) upd.cost_price = e.cost_price;
      if (e.price !== undefined) upd.price = e.price;
      if (e.stock !== undefined) upd.stock = e.stock;
      return upd;
    });
    const res = await fetch('/api/admin/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setEdits(new Map());
      await loadProducts();
      setTimeout(() => setSaved(false), 3000);
    }
  }

  /* ── Expand/collapse ── */
  function toggle(model: string) {
    const n = new Set(expanded);
    if (n.has(model)) n.delete(model); else n.add(model);
    setExpanded(n);
  }

  function expandAll() { setExpanded(new Set(groups.map(([m]) => m))); }
  function collapseAll() { setExpanded(new Set()); }

  const editCount = edits.size;

  // Stats financieros (calculados sobre el filtro actual)
  const stats = useMemo(() => {
    const totalCost = filtered.reduce((s, p) => s + (p.cost_price || 0) * p.stock, 0);
    const totalValue = filtered.reduce((s, p) => s + p.price * p.stock, 0);
    const totalProfit = totalValue - totalCost;
    const totalUnits = filtered.reduce((s, p) => s + p.stock, 0);
    const lowStock = filtered.filter((p) => p.stock > 0 && p.stock <= 2 && p.active).length;
    const noStock = filtered.filter((p) => p.stock === 0 && p.active).length;
    return { totalCost, totalValue, totalProfit, totalUnits, lowStock, noStock };
  }, [filtered]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-[#D4A843]/20 border-t-[#D4A843]" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A843] to-[#8B6914]">
            <Smartphone className="h-5 w-5 text-[#0A0A0A]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#FAFAFA]">Inventario por Color</h1>
            <p className="text-sm text-[#888]">
              {groups.length} modelos · {filtered.length} variantes · {stats.totalUnits} unidades
              {editCount > 0 && <span className="text-[#D4A843]"> · {editCount} cambio{editCount !== 1 ? "s" : ""}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={openCreateDialog}
            className="bg-[#22C55E] hover:bg-[#16A34A] text-white">
            <Plus className="h-4 w-4 mr-1" />Nuevo producto
          </Button>
          {editCount > 0 && (
            <Button variant="outline" size="sm" onClick={revertAll}
              className="border-[rgba(212,168,67,0.2)] text-[#888] hover:text-white hover:border-[#EF4444]">
              <RotateCcw className="h-4 w-4 mr-1" />Revertir
            </Button>
          )}
          <Button size="sm" disabled={editCount === 0 || saving} onClick={saveAll}
            className={saved ? "bg-[#22C55E] hover:bg-[#22C55E] text-white" : "bg-[#D4A843] hover:bg-[#F0D78C] text-black"}>
            {saving ? "Guardando..." : saved ? (<><Check className="h-4 w-4 mr-1" />Guardado</>) : (<><Save className="h-4 w-4 mr-1" />Guardar {editCount > 0 ? `(${editCount})` : ""}</>)}
          </Button>
        </div>
      </motion.div>

      {/* ── Stats financieros ── */}
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard icon={<Wallet className="h-4 w-4" />} label="Invertido en stock" value={formatPrice(stats.totalCost)}
          hint={`${stats.totalUnits} unidades`} accent="text-[#888]" />
        <StatCard icon={<DollarSign className="h-4 w-4" />} label="Valor inventario" value={formatPrice(stats.totalValue)}
          hint="Si vendes todo" accent="text-[#D4A843]" />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Profit potencial" value={formatPrice(stats.totalProfit)}
          hint={stats.totalCost > 0 ? `Margen ${Math.round((stats.totalProfit/stats.totalCost)*100)}%` : "—"}
          accent={stats.totalProfit >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"} />
        <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Alertas"
          value={`${stats.lowStock + stats.noStock}`}
          hint={`${stats.noStock} sin stock · ${stats.lowStock} bajos`}
          accent={(stats.lowStock + stats.noStock) > 0 ? "text-[#EF4444]" : "text-[#22C55E]"} />
      </div>

      {/* ── Filters ── */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
          <input type="text" placeholder="Buscar modelo, color, almacenamiento..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-lg border border-[rgba(212,168,67,0.12)] bg-[#111] pl-9 pr-3 text-sm text-[#FAFAFA] placeholder:text-[#555] focus:outline-none focus:border-[#D4A843]/40" />
        </div>
        <div className="flex gap-2">
          <select value={filterColor} onChange={(e) => setFilterColor(e.target.value)}
            className="h-9 rounded-lg border border-[rgba(212,168,67,0.12)] bg-[#111] px-3 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#D4A843]/40">
            <option value="">Todos los colores</option>
            {allColors.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterCondition} onChange={(e) => setFilterCondition(e.target.value)}
            className="h-9 rounded-lg border border-[rgba(212,168,67,0.12)] bg-[#111] px-3 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#D4A843]/40">
            <option value="">Todas condiciones</option>
            {allConditions.map((c) => <option key={c} value={c}>{CONDITION_LABELS[c] || c}</option>)}
          </select>
          <Button variant="ghost" size="sm" onClick={expanded.size > 0 ? collapseAll : expandAll}
            className="text-[#888] hover:text-[#D4A843] text-xs whitespace-nowrap">
            {expanded.size > 0 ? "Colapsar" : "Expandir"} todo
          </Button>
          <label className="flex items-center gap-1.5 text-xs text-[#888] cursor-pointer whitespace-nowrap">
            <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-[#333] bg-[#0D0D0D] text-[#D4A843]" />
            Mostrar eliminados
          </label>
        </div>
      </div>

      {/* ── Model Groups ── */}
      <div className="space-y-2">
        {groups.length === 0 ? (
          <div className="text-center py-12 text-[#555]">No hay productos</div>
        ) : (
          groups.map(([model, variants]) => {
            const isOpen = expanded.has(model);
            const totalStock = variants.reduce((s, p) => s + (getVal(p.id, "stock")), 0);
            const uniqueColors = Array.from(new Set(variants.map((v) => v.color)));
            const activeCount = variants.filter((v) => v.active).length;
            const hasGroupEdits = variants.some((v) => edits.has(v.id));
            const firstImg = variants.find((v) => v.images?.[0])?.images?.[0];

            return (
              <div key={model} className={`rounded-xl border transition-colors ${hasGroupEdits ? "border-[#D4A843]/30 bg-[rgba(212,168,67,0.02)]" : "border-[rgba(212,168,67,0.08)] bg-[#111]"}`}>
                {/* Model header — click to expand */}
                <button onClick={() => toggle(model)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[rgba(212,168,67,0.04)] transition-colors text-left">
                  {firstImg ? (
                    <img src={firstImg} alt="" className="h-10 w-10 rounded-lg object-contain bg-[#0D0D0D] p-0.5 flex-shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-[#0D0D0D] flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-[#333]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[#FAFAFA] font-semibold text-sm">{model}</span>
                      <span className="text-[10px] text-[#555]">{variants.length} variante{variants.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {/* Color chips */}
                      <div className="flex flex-wrap gap-1">
                        {uniqueColors.slice(0, 6).map((c) => (
                          <span key={c} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#1A1A1A] border border-[#333] text-[10px] text-[#ccc] font-medium">
                            <span className="h-3 w-3 rounded-full border border-white/20 shadow-sm inline-block"
                              style={{ backgroundColor: getColorHex(c), boxShadow: `0 0 4px ${getColorHex(c)}66` }} />
                            {c}
                          </span>
                        ))}
                        {uniqueColors.length > 6 && <span className="text-[10px] text-[#555] self-center">+{uniqueColors.length - 6}</span>}
                      </div>
                      <span className="text-[10px] text-[#555]">·</span>
                      <span className="text-[10px] text-[#888]">Stock: <span className="text-[#FAFAFA] font-medium">{totalStock}</span></span>
                      <span className="text-[10px] text-[#555]">·</span>
                      <span className="text-[10px] text-[#22C55E]">{activeCount} activo{activeCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  {isOpen ? <ChevronDown className="h-4 w-4 text-[#D4A843]" /> : <ChevronRight className="h-4 w-4 text-[#555]" />}
                </button>

                {/* Expanded variants */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="border-t border-[rgba(212,168,67,0.06)]">
                        {/* Sub-header */}
                        <div className="grid grid-cols-[24px_2fr_1fr_1fr_1fr_1fr_70px_70px_120px] gap-1 px-4 py-1.5 bg-[#0A0A0A] text-[10px] text-[#555] font-medium uppercase tracking-wide">
                          <span></span>
                          <span>Color / Almacenamiento</span>
                          <span>Condición</span>
                          <span>💰 P. Compra</span>
                          <span>🏷️ P. Venta</span>
                          <span>Ganancia</span>
                          <span className="text-center">Stock</span>
                          <span className="text-center">Estado</span>
                          <span className="text-center">Acciones</span>
                        </div>

                        {variants.map((p) => {
                          const edited = hasEdit(p.id);
                          const costPrice = getVal(p.id, "cost_price");
                          const salePrice = getVal(p.id, "price");
                          const stock = getVal(p.id, "stock");
                          const profit = salePrice - costPrice;
                          const marginPct = costPrice > 0 ? Math.round((profit / costPrice) * 100) : 0;

                          return (
                            <div key={p.id}
                              className={`grid grid-cols-[24px_2fr_1fr_1fr_1fr_1fr_70px_70px_120px] gap-1 items-center px-4 py-2 border-t border-[rgba(212,168,67,0.04)] transition-colors ${
                                selected.has(p.id) ? "bg-[rgba(34,197,94,0.05)]"
                                : edited ? "bg-[rgba(212,168,67,0.04)]"
                                : "hover:bg-[rgba(255,255,255,0.01)]"
                              }`}>
                              {/* Checkbox */}
                              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelected(p.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-3.5 w-3.5 rounded border-[#333] bg-[#0D0D0D] text-[#22C55E] cursor-pointer" />
                              {/* Color + Storage */}
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-6 w-6 rounded-full border-2 border-white/30 flex-shrink-0 shadow-lg"
                                  style={{ backgroundColor: getColorHex(p.color), boxShadow: `0 0 8px ${getColorHex(p.color)}44` }} title={p.color} />
                                <div className="min-w-0">
                                  <span className="text-sm text-[#FAFAFA] font-medium">{p.color}</span>
                                  {p.storage && p.storage !== "N/A" && (
                                    <span className="text-[10px] text-[#555] ml-1.5">{p.storage}</span>
                                  )}
                                </div>
                              </div>

                              {/* Condition */}
                              <div>
                                <Badge className="border-0 bg-[rgba(212,168,67,0.1)] text-[#D4A843] text-[10px] px-1.5 py-0">
                                  {CONDITION_LABELS[p.condition as keyof typeof CONDITION_LABELS] || p.condition}
                                </Badge>
                              </div>

                              {/* Cost Price */}
                              <div className="relative">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[#444] text-xs">$</span>
                                <input type="text"
                                  value={costPrice ? costPrice.toLocaleString("es-CO") : ""}
                                  onChange={(e) => updateEdit(p.id, "cost_price", e.target.value)}
                                  placeholder="0"
                                  className={`w-full h-7 rounded border pl-4 pr-1 text-xs text-right font-mono focus:outline-none focus:border-[#D4A843]/50 placeholder:text-[#222] ${
                                    edited ? "border-[#D4A843]/30 bg-[rgba(212,168,67,0.06)] text-[#D4A843]" : "border-[rgba(212,168,67,0.06)] bg-[#0D0D0D] text-[#ccc]"
                                  }`} />
                              </div>

                              {/* Sale Price */}
                              <div className="relative">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[#444] text-xs">$</span>
                                <input type="text"
                                  value={salePrice ? salePrice.toLocaleString("es-CO") : ""}
                                  onChange={(e) => updateEdit(p.id, "price", e.target.value)}
                                  placeholder="0"
                                  className={`w-full h-7 rounded border pl-4 pr-1 text-xs text-right font-mono focus:outline-none focus:border-[#D4A843]/50 placeholder:text-[#222] ${
                                    edited ? "border-[#D4A843]/30 bg-[rgba(212,168,67,0.06)] text-[#D4A843]" : "border-[rgba(212,168,67,0.06)] bg-[#0D0D0D] text-[#ccc]"
                                  }`} />
                              </div>

                              {/* Profit */}
                              <div>
                                {costPrice > 0 ? (
                                  <div className="flex items-center gap-0.5">
                                    <TrendingUp className={`h-3 w-3 ${profit > 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`} />
                                    <span className={`text-[10px] font-bold ${profit > 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                                      {formatPrice(profit)}
                                    </span>
                                    <span className="text-[9px] text-[#555]">({marginPct}%)</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-[#333]">—</span>
                                )}
                              </div>

                              {/* Stock */}
                              <div className="flex justify-center items-center gap-1">
                                <input type="text"
                                  value={stock}
                                  onChange={(e) => updateEdit(p.id, "stock", e.target.value)}
                                  className={`w-12 h-7 rounded border text-center text-xs font-mono focus:outline-none focus:border-[#D4A843]/50 ${
                                    edited ? "border-[#D4A843]/30 bg-[rgba(212,168,67,0.06)] text-[#D4A843]"
                                      : stock === 0 ? "border-[#EF4444]/30 bg-[rgba(239,68,68,0.06)] text-[#EF4444]"
                                      : stock <= 2 ? "border-[#F59E0B]/30 bg-[rgba(245,158,11,0.06)] text-[#F59E0B]"
                                      : "border-[rgba(212,168,67,0.06)] bg-[#0D0D0D] text-[#ccc]"
                                  }`} />
                                {stock === 0 && <AlertTriangle className="h-3 w-3 text-[#EF4444]" />}
                                {stock > 0 && stock <= 2 && <AlertTriangle className="h-3 w-3 text-[#F59E0B]" />}
                              </div>

                              {/* Active toggle */}
                              <div className="flex justify-center">
                                <Badge
                                  className={`cursor-pointer border-0 text-[10px] ${p.active ? "bg-[#0A1A0A] text-[#22C55E]" : "bg-[#1A0A0A] text-[#EF4444]"}`}
                                  onClick={() => toggleActive(p.id, p.active)}>
                                  {p.active ? "Activo" : "Off"}
                                </Badge>
                              </div>

                              {/* Actions */}
                              <div className="flex justify-center items-center gap-0.5">
                                {edited && (
                                  <button onClick={() => revertEdit(p.id)} className="text-[#555] hover:text-[#F59E0B] p-1" title="Revertir cambios">
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <Link href={`/productos/${p.slug}`} target="_blank" className="text-[#555] hover:text-[#D4A843] p-1" title="Ver en sitio">
                                  <Eye className="h-3.5 w-3.5" />
                                </Link>
                                <button onClick={() => setInsightsProduct(p)} className="text-[#555] hover:text-[#22C55E] p-1" title="Ventas y restocks">
                                  <BarChart3 className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => openEditDialog(p)} className="text-[#555] hover:text-[#D4A843] p-1" title="Editar todos los campos">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => cloneProduct(p)} className="text-[#555] hover:text-[#3B82F6] p-1" title="Clonar producto">
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                                {p.deleted_at ? (
                                  <button onClick={() => restoreProduct(p.id)} className="text-[#555] hover:text-[#22C55E] p-1" title="Restaurar">
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </button>
                                ) : (
                                  <button onClick={() => setDeletingProduct(p)} className="text-[#555] hover:text-[#EF4444] p-1" title="Eliminar">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* ── Edit/Create modal ── */}
      <ProductDialog
        open={showDialog}
        product={editingProduct}
        onClose={() => setShowDialog(false)}
        onSaved={() => loadProducts()}
      />

      {/* ── Delete confirm ── */}
      <DeleteConfirmDialog
        open={!!deletingProduct}
        productName={deletingProduct?.name || ""}
        onCancel={() => setDeletingProduct(null)}
        onConfirm={() => deletingProduct && softDeleteProduct(deletingProduct.id)}
      />

      {/* ── Insights (ventas + restocks) ── */}
      <ProductInsightsDialog
        open={!!insightsProduct}
        productId={insightsProduct?.id || null}
        productName={insightsProduct?.name || ""}
        costPrice={insightsProduct?.cost_price || 0}
        currentStock={insightsProduct?.stock || 0}
        onClose={() => { setInsightsProduct(null); loadProducts(); }}
      />

      {/* ── Barra flotante de bulk actions ── */}
      {selected.size > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-20 left-0 right-0 md:left-72 z-30 px-4 md:px-6">
          <div className="max-w-7xl mx-auto rounded-xl border border-[#22C55E]/30 bg-[#0A0A0A]/95 backdrop-blur shadow-2xl px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#22C55E]">{selected.size} seleccionado{selected.size !== 1 ? "s" : ""}</span>
              <button onClick={clearSelection} className="text-[#666] hover:text-white text-xs">
                <X className="h-3 w-3 inline" /> Limpiar
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => bulkAction("activate")}
                className="h-7 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs">Activar</Button>
              <Button size="sm" onClick={() => bulkAction("deactivate")}
                className="h-7 bg-[#F59E0B] hover:bg-[#D97706] text-black text-xs">Desactivar</Button>
              <Button size="sm" onClick={() => {
                if (confirm(`¿Eliminar ${selected.size} productos? Se ocultarán pero se pueden restaurar.`)) {
                  bulkAction("delete");
                }
              }} className="h-7 bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs">Eliminar</Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Sticky save bar ── */}
      {editCount > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 md:left-72 z-40 bg-[#050505]/95 backdrop-blur border-t border-[rgba(212,168,67,0.15)] px-4 md:px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="text-sm text-[#888]">
              <span className="text-[#D4A843] font-bold">{editCount}</span> cambio{editCount !== 1 ? "s" : ""} sin guardar
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={revertAll} className="text-[#888] hover:text-[#EF4444]">Revertir</Button>
              <Button size="sm" disabled={saving} onClick={saveAll}
                className={saved ? "bg-[#22C55E] text-white" : "bg-[#D4A843] hover:bg-[#F0D78C] text-black"}>
                {saving ? "Guardando..." : saved ? "✓ Guardado" : `Guardar (${editCount})`}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ── Stat card ── */
function StatCard({ icon, label, value, hint, accent }: {
  icon: React.ReactNode; label: string; value: string; hint?: string; accent: string;
}) {
  return (
    <div className="rounded-xl border border-[rgba(212,168,67,0.08)] bg-[#0D0D0D] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] text-[#666] uppercase tracking-wide font-medium mb-1">
        <span className={accent}>{icon}</span>
        {label}
      </div>
      <div className={`text-base font-bold leading-tight ${accent}`}>{value}</div>
      {hint && <div className="text-[10px] text-[#555] mt-0.5">{hint}</div>}
    </div>
  );
}
