"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, TrendingUp, Receipt, ExternalLink, Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { formatCOP } from "../admin-theme";

interface PosSale {
  id: string; sale_number: string; customer_name: string | null; customer_phone: string | null;
  subtotal: number; discount: number; total: number; payment_method: string;
  status: string; notes: string | null; created_at: string;
  items?: { id: string; product_name: string; quantity: number; unit_price: number; subtotal: number }[];
}

const METHOD_LABELS: Record<string, string> = {
  efectivo: "Efectivo", transferencia: "Transferencia", nequi: "Nequi", daviplata: "Daviplata", tarjeta: "Tarjeta",
};

export default function AdminPosPage() {
  const [sales, setSales] = useState<PosSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMethod, setFilterMethod] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("mes");
  const [detailSale, setDetailSale] = useState<PosSale | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase.from("pos_sales").select("*").order("created_at", { ascending: false });
    if (filterMethod) q = q.eq("payment_method", filterMethod);
    const { data, error } = await q;
    if (error) console.error(error);
    setSales((data || []) as PosSale[]);
    setLoading(false);
  }, [filterMethod]);

  useEffect(() => { loadData(); }, [loadData]);

  const now = new Date();
  const filtered = sales.filter((s) => {
    const d = new Date(s.created_at);
    if (filterPeriod === "hoy") return d.toDateString() === now.toDateString();
    if (filterPeriod === "semana") return d >= new Date(now.getTime() - 7 * 86400000);
    if (filterPeriod === "mes") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });

  const totalVentas = filtered.filter(s => s.status === "completada").reduce((s, t) => s + t.total, 0);
  const numVentas = filtered.filter(s => s.status === "completada").length;
  const ticketProm = numVentas > 0 ? Math.round(totalVentas / numVentas) : 0;
  const topMethod = Object.entries(filtered.filter(s => s.status === "completada").reduce((acc, s) => { acc[s.payment_method] = (acc[s.payment_method] || 0) + 1; return acc; }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const openDetail = async (sale: PosSale) => {
    const supabase = createClient();
    const { data } = await supabase.from("pos_sale_items").select("*").eq("sale_id", sale.id);
    setDetailSale({ ...sale, items: data || [] });
    setDetailOpen(true);
  };

  const handleVoid = async (saleId: string) => {
    if (!confirm("¿Anular esta venta? Se restaurará el stock.")) return;
    const supabase = createClient();
    const { error: ie } = await supabase.from("pos_sale_items").delete().eq("sale_id", saleId);
    if (ie) { alert(ie.message); return; }
    const { error } = await supabase.from("pos_sales").update({ status: "devuelta" }).eq("id", saleId);
    if (error) { alert(error.message); return; }
    await supabase.from("transactions").delete().eq("order_id", saleId);
    setDetailOpen(false);
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="h-8 w-8 rounded-full border-2 border-[#D4A843]/20 border-t-[#D4A843]" /></div>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A843] to-[#8B6914]"><ShoppingCart className="h-5 w-5 text-[#0A0A0A]" /></div>
            <div><h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">Ventas Local</h1><p className="text-sm text-[#888]">Historial de ventas presenciales</p></div>
          </div>
          <Button asChild className="rounded-xl h-10 px-4 border-0 font-semibold text-[#0A0A0A] bg-gradient-to-br from-[#D4A843] to-[#8B6914] hover:from-[#F0D78C] hover:to-[#D4A843]">
            <a href="/pos" target="_blank"><ExternalLink className="h-4 w-4 mr-2" />Abrir POS</a>
          </Button>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Ventas", value: totalVentas, icon: TrendingUp, gradient: "from-[#22C55E] to-[#16A34A]" },
          { label: "Transacciones", value: numVentas, icon: Receipt, gradient: "from-[#D4A843] to-[#8B6914]", isCount: true },
          { label: "Ticket prom.", value: ticketProm, icon: ShoppingCart, gradient: "from-[#D4A843] to-[#8B6914]" },
          { label: "Método top", value: METHOD_LABELS[topMethod] || topMethod, icon: TrendingUp, gradient: "from-[#3B82F6] to-[#2563EB]", isText: true },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.06 }}>
            <div className="rounded-2xl bg-[#111] border border-[rgba(212,168,67,0.12)] p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} text-[#0A0A0A]`}><card.icon className="h-5 w-5" /></div>
                <Badge className="text-[10px] border-0 bg-[rgba(212,168,67,0.12)] text-[#D4A843]">{card.label}</Badge>
              </div>
              <div className="text-2xl font-extrabold text-[#FAFAFA]">{card.isText ? card.value : card.isCount ? card.value : formatCOP(card.value as number)}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-[#111] border border-[rgba(212,168,67,0.12)] p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={filterMethod || "ALL"} onValueChange={(v) => setFilterMethod(v === "ALL" ? "" : v)}>
            <SelectTrigger className="w-[150px] rounded-xl"><SelectValue placeholder="Método" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {Object.entries(METHOD_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-[140px] rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hoy">Hoy</SelectItem>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mes</SelectItem>
              <SelectItem value="todo">Todo</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-[#888] ml-auto">{filtered.length} ventas</span>
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="rounded-2xl bg-[#111] border border-[rgba(212,168,67,0.12)] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#0D0D0D] border-b border-[rgba(212,168,67,0.08)] hover:bg-[#0D0D0D]">
                <TableHead className="text-[#D4A843] font-semibold">Recibo</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Cliente</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Método</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Estado</TableHead>
                <TableHead className="text-right text-[#D4A843] font-semibold">Total</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Fecha</TableHead>
                <TableHead className="text-[#D4A843] font-semibold"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s, i) => (
                <motion.tr key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-[rgba(212,168,67,0.05)] hover:bg-[rgba(212,168,67,0.05)]">
                  <TableCell className="font-mono text-sm text-[#D4A843] font-semibold">{s.sale_number}</TableCell>
                  <TableCell className="text-sm text-[#FAFAFA]">{s.customer_name || "—"}</TableCell>
                  <TableCell className="text-sm text-[#888]">{METHOD_LABELS[s.payment_method] || s.payment_method}</TableCell>
                  <TableCell><Badge className={`border-0 text-[10px] ${s.status === "completada" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{s.status === "completada" ? "Completada" : "Devuelta"}</Badge></TableCell>
                  <TableCell className="text-right font-semibold text-sm text-[#FAFAFA]">{formatCOP(s.total)}</TableCell>
                  <TableCell className="text-sm text-[#888]">{new Date(s.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-[#555] hover:text-[#D4A843]" onClick={() => openDetail(s)}><Eye className="h-4 w-4" /></Button></TableCell>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-[#555]">Sin ventas en este período</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-[#111] border-[rgba(212,168,67,0.12)]">
          <DialogHeader><DialogTitle className="text-[#D4A843]">Detalle {detailSale?.sale_number}</DialogTitle></DialogHeader>
          {detailSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-[#555]">Cliente:</span><p className="text-[#FAFAFA]">{detailSale.customer_name || "—"}</p></div>
                <div><span className="text-[#555]">Teléfono:</span><p className="text-[#FAFAFA]">{detailSale.customer_phone || "—"}</p></div>
                <div><span className="text-[#555]">Método:</span><p className="text-[#FAFAFA]">{METHOD_LABELS[detailSale.payment_method]}</p></div>
                <div><span className="text-[#555]">Estado:</span><Badge className={`border-0 text-[10px] ${detailSale.status === "completada" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{detailSale.status}</Badge></div>
              </div>
              <div className="gold-divider" />
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-[#D4A843]/50">Items</p>
                {(detailSale.items || []).map((it, x) => (
                  <div key={x} className="flex justify-between text-sm">
                    <span className="text-[#FAFAFA]">{it.product_name} ×{it.quantity}</span>
                    <span className="text-[#D4A843] font-semibold">{formatCOP(it.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="gold-divider" />
              <div className="flex justify-between text-sm"><span className="text-[#888]">Subtotal</span><span className="text-white">{formatCOP(detailSale.subtotal)}</span></div>
              {detailSale.discount > 0 && <div className="flex justify-between text-sm"><span className="text-[#888]">Descuento</span><span className="text-red-400">-{formatCOP(detailSale.discount)}</span></div>}
              <div className="flex justify-between text-lg font-bold"><span className="text-[#D4A843]">Total</span><span className="text-[#D4A843]">{formatCOP(detailSale.total)}</span></div>
              {detailSale.status === "completada" && (
                <Button variant="outline" onClick={() => handleVoid(detailSale.id)} className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <RotateCcw className="h-4 w-4 mr-2" />Anular venta
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
