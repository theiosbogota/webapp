"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, ShoppingCart, Package, Plus, Calendar, User, DollarSign, BarChart3, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/constants";

interface SaleRow {
  order_id: string;
  order_number?: string;
  buyer_name: string;
  buyer_email?: string;
  quantity: number;
  unit_price: number;
  total: number;
  status: string;
  created_at: string;
}

interface RestockRow {
  id: string;
  quantity: number;
  unit_cost: number;
  supplier: string | null;
  imeis: string | null;
  notes: string | null;
  restocked_at: string;
}

interface Metrics {
  units_sold: number;
  total_revenue: number;
  total_profit: number;
  avg_sale_price: number | null;
  last_sold_at: string | null;
  units_purchased: number;
  total_invested: number;
}

interface Props {
  open: boolean;
  productId: string | null;
  productName: string;
  costPrice: number;
  currentStock: number;
  onClose: () => void;
}

export default function ProductInsightsDialog({ open, productId, productName, costPrice, currentStock, onClose }: Props) {
  const [tab, setTab] = useState<"ventas" | "restocks">("ventas");
  const [loading, setLoading] = useState(false);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [restocks, setRestocks] = useState<RestockRow[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [showRestockForm, setShowRestockForm] = useState(false);

  // Restock form state
  const [rfQty, setRfQty] = useState(1);
  const [rfUnitCost, setRfUnitCost] = useState(costPrice || 0);
  const [rfSupplier, setRfSupplier] = useState("");
  const [rfImeis, setRfImeis] = useState("");
  const [rfNotes, setRfNotes] = useState("");
  const [rfDate, setRfDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [savingRestock, setSavingRestock] = useState(false);
  const [rfError, setRfError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !productId) return;
    loadData();
  }, [open, productId]);

  async function loadData() {
    if (!productId) return;
    setLoading(true);
    const supabase = createClient();

    const [salesRes, restocksRes] = await Promise.all([
      supabase
        .from("order_items")
        .select("order_id, quantity, unit_price, total, order:orders(id, status, created_at, shipping_name, buyer:profiles(email))")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("product_restocks")
        .select("*")
        .eq("product_id", productId)
        .order("restocked_at", { ascending: false })
        .limit(100),
    ]);

    type RawSale = {
      order_id: string;
      quantity: number;
      unit_price: number;
      total: number;
      order: {
        id: string;
        status: string;
        created_at: string;
        shipping_name: string;
        buyer?: { email?: string } | null;
      } | null;
    };

    const salesData = ((salesRes.data || []) as unknown as RawSale[])
      .filter((s) => s.order && !["cancelado", "reembolsado"].includes(s.order.status))
      .map((s) => ({
        order_id: s.order_id,
        buyer_name: s.order?.shipping_name || "—",
        buyer_email: s.order?.buyer?.email,
        quantity: s.quantity,
        unit_price: s.unit_price,
        total: s.total,
        status: s.order?.status || "—",
        created_at: s.order?.created_at || "",
      }));

    const restocksData = (restocksRes.data || []) as RestockRow[];

    // Calc metrics
    const units_sold = salesData.reduce((sum, s) => sum + s.quantity, 0);
    const total_revenue = salesData.reduce((sum, s) => sum + s.total, 0);
    const total_profit = total_revenue - costPrice * units_sold;
    const avg_sale_price = units_sold > 0 ? Math.round(total_revenue / units_sold) : null;
    const last_sold_at = salesData[0]?.created_at || null;
    const units_purchased = restocksData.reduce((sum, r) => sum + r.quantity, 0);
    const total_invested = restocksData.reduce((sum, r) => sum + r.unit_cost * r.quantity, 0);

    setSales(salesData);
    setRestocks(restocksData);
    setMetrics({ units_sold, total_revenue, total_profit, avg_sale_price, last_sold_at, units_purchased, total_invested });
    setLoading(false);
  }

  async function saveRestock() {
    if (!productId) return;
    if (rfQty <= 0) { setRfError("Cantidad debe ser > 0"); return; }
    if (rfUnitCost < 0) { setRfError("Costo unitario inválido"); return; }
    setSavingRestock(true);
    setRfError(null);
    const supabase = createClient();
    const { error } = await supabase.from("product_restocks").insert({
      product_id: productId,
      quantity: rfQty,
      unit_cost: rfUnitCost,
      supplier: rfSupplier || null,
      imeis: rfImeis || null,
      notes: rfNotes || null,
      restocked_at: rfDate ? new Date(rfDate).toISOString() : new Date().toISOString(),
    });
    setSavingRestock(false);
    if (error) {
      setRfError(error.message);
    } else {
      // Reset form
      setRfQty(1); setRfImeis(""); setRfNotes(""); setShowRestockForm(false);
      await loadData();
    }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
          className="w-full max-w-4xl my-8 rounded-2xl border border-[rgba(212,168,67,0.2)] bg-[#0A0A0A] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[rgba(212,168,67,0.1)] px-5 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#D4A843] to-[#8B6914]">
                <BarChart3 className="h-4 w-4 text-black" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#FAFAFA]">{productName}</h2>
                <p className="text-[11px] text-[#888]">Stock actual: {currentStock} unidades · Costo: {formatPrice(costPrice)}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-[#888] hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Metrics */}
          {metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 pt-4">
              <Metric icon={<ShoppingCart className="h-3.5 w-3.5" />} label="Unidades vendidas" value={`${metrics.units_sold}`}
                hint={metrics.last_sold_at ? `Última: ${formatDate(metrics.last_sold_at)}` : "—"} accent="text-[#D4A843]" />
              <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Revenue total" value={formatPrice(metrics.total_revenue)}
                hint={metrics.avg_sale_price ? `Avg: ${formatPrice(metrics.avg_sale_price)}` : "—"} accent="text-[#FAFAFA]" />
              <Metric icon={<TrendingUp className="h-3.5 w-3.5" />} label="Profit acumulado" value={formatPrice(metrics.total_profit)}
                hint={costPrice > 0 ? `Margen unidad: ${formatPrice(metrics.total_revenue / Math.max(metrics.units_sold,1) - costPrice)}` : "—"}
                accent={metrics.total_profit >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"} />
              <Metric icon={<Package className="h-3.5 w-3.5" />} label="Unidades compradas" value={`${metrics.units_purchased}`}
                hint={`Invertido: ${formatPrice(metrics.total_invested)}`} accent="text-[#888]" />
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-[rgba(212,168,67,0.1)] px-5 mt-4">
            <TabBtn active={tab === "ventas"} onClick={() => setTab("ventas")}>
              Ventas ({sales.length})
            </TabBtn>
            <TabBtn active={tab === "restocks"} onClick={() => setTab("restocks")}>
              Compras / Restocks ({restocks.length})
            </TabBtn>
            {tab === "restocks" && (
              <Button size="sm" onClick={() => setShowRestockForm(!showRestockForm)}
                className="ml-auto my-1 h-7 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />Registrar compra
              </Button>
            )}
          </div>

          {/* Body */}
          <div className="px-5 py-4 max-h-[50vh] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-[#555] text-sm">Cargando...</div>
            ) : tab === "ventas" ? (
              sales.length === 0 ? (
                <div className="text-center py-8 text-[#555] text-sm">Sin ventas registradas todavía</div>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 text-[10px] uppercase text-[#555] tracking-wide font-medium pb-2 border-b border-[rgba(212,168,67,0.05)]">
                    <span>Cliente</span><span>Cant.</span><span>Precio</span><span>Total</span><span>Fecha</span>
                  </div>
                  {sales.map((s, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center text-xs py-2 border-b border-[rgba(212,168,67,0.03)]">
                      <div>
                        <div className="text-[#FAFAFA] font-medium">{s.buyer_name}</div>
                        {s.buyer_email && <div className="text-[10px] text-[#666]">{s.buyer_email}</div>}
                      </div>
                      <span className="text-[#D4A843] font-mono">{s.quantity}×</span>
                      <span className="text-[#ccc] font-mono">{formatPrice(s.unit_price)}</span>
                      <span className="text-[#FAFAFA] font-mono font-bold">{formatPrice(s.total)}</span>
                      <span className="text-[10px] text-[#666]">{formatDate(s.created_at)}</span>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <>
                {showRestockForm && (
                  <div className="mb-4 rounded-lg border border-[#22C55E]/20 bg-[rgba(34,197,94,0.04)] p-3">
                    <div className="text-xs font-bold text-[#22C55E] uppercase mb-2">Nueva compra</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <FormField label="Cantidad">
                        <input type="number" value={rfQty} onChange={(e) => setRfQty(Number(e.target.value))} className={inputCls + " text-center"} />
                      </FormField>
                      <FormField label="Costo unitario">
                        <input type="number" value={rfUnitCost || ""} onChange={(e) => setRfUnitCost(Number(e.target.value))} className={inputCls + " text-right font-mono"} />
                      </FormField>
                      <FormField label="Fecha">
                        <input type="date" value={rfDate} onChange={(e) => setRfDate(e.target.value)} className={inputCls} />
                      </FormField>
                      <FormField label="Proveedor">
                        <input type="text" value={rfSupplier} onChange={(e) => setRfSupplier(e.target.value)} className={inputCls} placeholder="Juan Pérez" />
                      </FormField>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      <FormField label="IMEIs (uno por línea)">
                        <textarea value={rfImeis} onChange={(e) => setRfImeis(e.target.value)} rows={2}
                          className={inputCls + " font-mono text-[10px] resize-y"} placeholder="354820112345678&#10;354820112345679" />
                      </FormField>
                      <FormField label="Notas">
                        <textarea value={rfNotes} onChange={(e) => setRfNotes(e.target.value)} rows={2}
                          className={inputCls + " resize-y"} placeholder="Batería 92%, sin daños..." />
                      </FormField>
                    </div>
                    {rfError && <div className="text-xs text-[#EF4444] mt-2">{rfError}</div>}
                    <div className="flex justify-end gap-2 mt-3">
                      <Button size="sm" variant="ghost" onClick={() => setShowRestockForm(false)} className="text-[#888]">Cancelar</Button>
                      <Button size="sm" disabled={savingRestock} onClick={saveRestock} className="bg-[#22C55E] hover:bg-[#16A34A] text-white">
                        {savingRestock ? "Guardando..." : "Registrar"}
                      </Button>
                    </div>
                  </div>
                )}
                {restocks.length === 0 ? (
                  <div className="text-center py-8 text-[#555] text-sm">
                    Sin compras registradas. Click en &ldquo;Registrar compra&rdquo; para añadir el primer lote.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {restocks.map((r) => (
                      <div key={r.id} className="rounded-lg border border-[rgba(212,168,67,0.06)] bg-[#0D0D0D] p-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-1 text-xs">
                            <Calendar className="h-3 w-3 text-[#888]" />
                            <span className="text-[#ccc]">{formatDate(r.restocked_at)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Package className="h-3 w-3 text-[#D4A843]" />
                            <span className="text-[#D4A843] font-mono">{r.quantity} unid.</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <DollarSign className="h-3 w-3 text-[#22C55E]" />
                            <span className="text-[#FAFAFA] font-mono">{formatPrice(r.unit_cost)}/u</span>
                            <span className="text-[10px] text-[#666]">· total {formatPrice(r.unit_cost * r.quantity)}</span>
                          </div>
                          {r.supplier && (
                            <div className="flex items-center gap-1 text-xs">
                              <User className="h-3 w-3 text-[#888]" />
                              <span className="text-[#ccc]">{r.supplier}</span>
                            </div>
                          )}
                        </div>
                        {r.imeis && (
                          <div className="mt-2 pl-1">
                            <div className="text-[10px] text-[#666] flex items-center gap-1 mb-1"><Hash className="h-2.5 w-2.5" />IMEIs:</div>
                            <pre className="text-[10px] font-mono text-[#888] whitespace-pre-wrap">{r.imeis}</pre>
                          </div>
                        )}
                        {r.notes && (
                          <div className="mt-1 text-[11px] text-[#888] pl-1">📝 {r.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const inputCls = "w-full h-8 rounded-md border border-[rgba(212,168,67,0.12)] bg-[#0A0A0A] px-2 text-xs text-[#FAFAFA] placeholder:text-[#444] focus:outline-none focus:border-[#D4A843]/50";

function formatDate(s: string): string {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function Metric({ icon, label, value, hint, accent }: { icon: React.ReactNode; label: string; value: string; hint?: string; accent: string }) {
  return (
    <div className="rounded-lg border border-[rgba(212,168,67,0.08)] bg-[#0D0D0D] px-3 py-2">
      <div className="flex items-center gap-1 text-[9px] text-[#666] uppercase tracking-wide mb-0.5">
        <span className={accent}>{icon}</span>{label}
      </div>
      <div className={`text-sm font-bold leading-tight ${accent}`}>{value}</div>
      {hint && <div className="text-[9px] text-[#555] mt-0.5">{hint}</div>}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-2 text-xs font-medium uppercase tracking-wide transition-colors ${
        active ? "text-[#D4A843] border-b-2 border-[#D4A843]" : "text-[#666] hover:text-[#ccc]"
      }`}>
      {children}
    </button>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] text-[#666] uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}
