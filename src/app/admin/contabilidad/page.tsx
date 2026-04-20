"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Plus, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCOP, statusColors, categoryColors as catColorsDark } from "../admin-theme";

const INGRESO_CATEGORIES = [
  { value: "VENTA", label: "Venta de producto" },
  { value: "REPARACION", label: "Reparación" },
  { value: "REPUESTO", label: "Venta de repuesto" },
  { value: "OTRO_INGRESO", label: "Otro ingreso" },
];

const EGRESO_CATEGORIES = [
  { value: "COMPRA", label: "Compra de inventario" },
  { value: "REPUESTO_COMPRA", label: "Compra de repuestos" },
  { value: "SERVICIO", label: "Servicios" },
  { value: "NOMINA", label: "Nómina" },
  { value: "ALQUILER", label: "Alquiler" },
  { value: "MARKETING", label: "Marketing/Publicidad" },
  { value: "TRANSPORTE", label: "Transporte/Envíos" },
  { value: "OTRO_EGRESO", label: "Otro egreso" },
];

const ALL_CATEGORIES = [...INGRESO_CATEGORIES, ...EGRESO_CATEGORIES];

const typeColors: Record<string, string> = {
  INGRESO: statusColors.INGRESO,
  EGRESO: statusColors.EGRESO,
};

interface Transaction {
  id: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string | null;
  order_id: string | null;
  created_at: string;
}

const emptyForm = {
  type: "INGRESO",
  category: "VENTA",
  description: "",
  amount: 0,
  payment_method: "efectivo",
};

export default function ContabilidadPage() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filterType, setFilterType] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("mes");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("transactions").select("*").order("created_at", { ascending: false });
      if (filterType) query = query.eq("type", filterType);
      const { data, error } = await query;
      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => { loadData(); }, [loadData]);

  const now = new Date();
  const filteredTransactions = transactions.filter((t) => {
    const d = new Date(t.created_at);
    if (filterPeriod === "hoy") return d.toDateString() === now.toDateString();
    if (filterPeriod === "semana") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= weekAgo;
    }
    if (filterPeriod === "mes") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });

  const totalIngresos = filteredTransactions.filter((t) => t.type === "INGRESO").reduce((s, t) => s + t.amount, 0);
  const totalEgresos = filteredTransactions.filter((t) => t.type === "EGRESO").reduce((s, t) => s + t.amount, 0);
  const balance = totalIngresos - totalEgresos;
  const margen = totalIngresos > 0 ? ((balance / totalIngresos) * 100).toFixed(1) : "0";

  const handleSubmit = async () => {
    try {
      const { error } = await supabase.from("transactions").insert(form);
      if (error) throw error;
      setDialogOpen(false);
      setForm(emptyForm);
      loadData();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Error al guardar");
    }
  };

  const getCategories = () => form.type === "INGRESO" ? INGRESO_CATEGORIES : EGRESO_CATEGORIES;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-[#D4A843]/20 border-t-[#D4A843]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A843] to-[#8B6914]">
              <DollarSign className="h-5 w-5 text-[#0A0A0A]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">Contabilidad</h1>
              <p className="text-sm text-[#888888]">Flujo de caja y registro financiero</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }}
                className="rounded-xl h-10 px-4 border-0 font-semibold text-[#0A0A0A] bg-gradient-to-br from-[#D4A843] to-[#8B6914] hover:from-[#F0D78C] hover:to-[#D4A843]">
                <Plus className="h-4 w-4 mr-2" /> Nueva Transacción
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nueva Transacción</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={form.type} onValueChange={(v) => { if (v) setForm({ ...form, type: v, category: v === "INGRESO" ? "VENTA" : "COMPRA" }); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INGRESO">Ingreso</SelectItem>
                        <SelectItem value="EGRESO">Egreso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select value={form.category} onValueChange={(v) => { if (v) setForm({ ...form, category: v }); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {getCategories().map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descripción *</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Venta iPhone 15 Pro Max" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monto (COP) *</Label>
                    <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })} placeholder="4500000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Método de pago</Label>
                    <Select value={form.payment_method || "efectivo"} onValueChange={(v) => { if (v) setForm({ ...form, payment_method: v }); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="transferencia">Transferencia</SelectItem>
                        <SelectItem value="wompi">Wompi</SelectItem>
                        <SelectItem value="nequi">Nequi</SelectItem>
                        <SelectItem value="daviplata">Daviplata</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleSubmit} className="w-full rounded-xl h-10 font-semibold text-[#0A0A0A] bg-gradient-to-br from-[#D4A843] to-[#8B6914] hover:from-[#F0D78C] hover:to-[#D4A843]">
                  Crear Transacción
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Ingresos", value: totalIngresos, icon: TrendingUp, gradient: "from-[#22C55E] to-[#16A34A]", prefix: ArrowUpRight },
          { label: "Egresos", value: totalEgresos, icon: TrendingDown, gradient: "from-[#EF4444] to-[#DC2626]", prefix: ArrowDownRight },
          { label: "Balance", value: balance, icon: Wallet, gradient: balance >= 0 ? "from-[#D4A843] to-[#8B6914]" : "from-[#EF4444] to-[#DC2626]" },
          { label: "Margen", value: parseInt(margen), icon: DollarSign, gradient: "from-[#D4A843] to-[#8B6914]", isPercent: true },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06 }} whileHover={{ y: -3, transition: { duration: 0.2 } }}>
            <div className="rounded-2xl bg-[#111111] border border-[rgba(212,168,67,0.12)] p-5 hover:border-[rgba(212,168,67,0.3)] hover:shadow-[0_8px_30px_rgba(212,168,67,0.15)] transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} text-[#0A0A0A]`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <Badge className="text-[10px] font-medium border-0 bg-[rgba(212,168,67,0.12)] text-[#D4A843]">{card.label}</Badge>
              </div>
              <div className="text-2xl font-extrabold tracking-tight text-[#FAFAFA]">
                {card.isPercent ? `${card.value}%` : formatCOP(card.value as number)}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <div className="rounded-2xl bg-[#111111] border border-[rgba(212,168,67,0.12)] p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Select value={filterType || "ALL"} onValueChange={(v) => { if (v) setFilterType(v === "ALL" ? "" : v); }}>
                <SelectTrigger className="w-[140px] rounded-xl"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="INGRESO">Ingresos</SelectItem>
                  <SelectItem value="EGRESO">Egresos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPeriod} onValueChange={(v) => { if (v) setFilterPeriod(v); }}>
                <SelectTrigger className="w-[140px] rounded-xl"><SelectValue placeholder="Período" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoy">Hoy</SelectItem>
                  <SelectItem value="semana">Esta semana</SelectItem>
                  <SelectItem value="mes">Este mes</SelectItem>
                  <SelectItem value="todo">Todo</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-[#888888] ml-auto">
                {filteredTransactions.length} transacciones
              </span>
            </div>
          </div>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <div className="rounded-2xl bg-[#111111] border border-[rgba(212,168,67,0.12)] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#0D0D0D] border-b border-[rgba(212,168,67,0.08)] hover:bg-[#0D0D0D]">
                <TableHead className="text-[#D4A843] font-semibold">Fecha</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Tipo</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Categoría</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Descripción</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Método</TableHead>
                <TableHead className="text-right text-[#D4A843] font-semibold">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((t, i) => (
                <motion.tr key={t.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="border-b border-[rgba(212,168,67,0.05)] last:border-0 hover:bg-[rgba(212,168,67,0.05)] transition-colors">
                  <TableCell className="text-sm text-[#888888]">
                    {new Date(t.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                  </TableCell>
                  <TableCell>
                    <Badge className={`border-0 text-[10px] font-medium rounded-lg ${typeColors[t.type]}`}>
                      {t.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`border-0 text-[10px] font-medium rounded-lg ${catColorsDark[t.category] || "bg-[#0D0D0D] text-[#888888]"}`}>
                      {ALL_CATEGORIES.find((c) => c.value === t.category)?.label || t.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium max-w-[200px] truncate text-[#FAFAFA]">{t.description}</TableCell>
                  <TableCell className="text-sm text-[#888888]">{t.payment_method || "—"}</TableCell>
                  <TableCell className={`text-right font-semibold text-sm ${t.type === "INGRESO" ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                    {t.type === "INGRESO" ? "+" : "-"}{formatCOP(t.amount)}
                  </TableCell>
                </motion.tr>
              ))}
              {filteredTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-[#555555]">
                    Sin transacciones en este período
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  );
}
