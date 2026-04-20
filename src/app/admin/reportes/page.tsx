"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, TrendingDown, ShoppingBag, Wrench, DollarSign, Users, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCOP } from "../admin-theme";

interface ReportData {
  totalRevenue: number;
  totalCost: number;
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  topProducts: { title: string; revenue: number; count: number }[];
  topSpareParts: { nombre: string; revenue: number; count: number }[];
  revenueByMonth: { month: string; ingresos: number; egresos: number }[];
  dealsByStatus: Record<string, number>;
  totalDeals: number;
  dealsValue: number;
  newContacts: number;
  appointmentsCompleted: number;
}

export default function ReportesPage() {
  const supabase = createClient();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("mes");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [ordersRes, productsRes, sparePartsRes, transactionsRes, dealsRes, contactsRes, appointmentsRes] = await Promise.all([
          supabase.from("orders").select("id, total, status, created_at"),
          supabase.from("products").select("title, price, stock"),
          supabase.from("spare_parts").select("nombre, price, cost, stock, stock_minimo").eq("active", true),
          supabase.from("transactions").select("type, amount, category, created_at"),
          supabase.from("deals").select("estado, monto_estimado"),
          supabase.from("contacts").select("created_at"),
          supabase.from("appointments").select("estado"),
        ]);

        const orders = ordersRes.data || [];
        const transactions = transactionsRes.data || [];
        const deals = dealsRes.data || [];
        const contacts = contactsRes.data || [];
        const appointments = appointmentsRes.data || [];

        const now = new Date();
        const filterDate = (d: string) => {
          const date = new Date(d);
          if (period === "hoy") return date.toDateString() === now.toDateString();
          if (period === "semana") return date >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (period === "mes") return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
          return true;
        };

        const filteredOrders = orders.filter((o) => filterDate(o.created_at));
        const filteredTransactions = transactions.filter((t) => filterDate(t.created_at));
        const filteredContacts = contacts.filter((c) => filterDate(c.created_at));

        const totalRevenue = filteredOrders
          .filter((o) => o.status !== "cancelado" && o.status !== "reembolsado")
          .reduce((s, o) => s + (o.total || 0), 0);

        const ordersByStatus: Record<string, number> = {};
        filteredOrders.forEach((o) => { ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1; });

        const dealsByStatus: Record<string, number> = {};
        deals.forEach((d) => { dealsByStatus[d.estado] = (dealsByStatus[d.estado] || 0) + 1; });

        const ingresos = filteredTransactions.filter((t) => t.type === "INGRESO").reduce((s, t) => s + t.amount, 0);
        const egresos = filteredTransactions.filter((t) => t.type === "EGRESO").reduce((s, t) => s + t.amount, 0);

        const topProducts = (productsRes.data || [])
          .sort((a, b) => (b.price || 0) - (a.price || 0))
          .slice(0, 5)
          .map((p) => ({ title: p.title, revenue: p.price || 0, count: p.stock || 0 }));

        const topSpareParts = (sparePartsRes.data || [])
          .sort((a, b) => (b.price - b.cost) - (a.price - a.cost))
          .slice(0, 5)
          .map((sp) => ({ nombre: sp.nombre, revenue: sp.price - sp.cost, count: sp.stock }));

        setData({
          totalRevenue,
          totalCost: egresos,
          totalOrders: filteredOrders.length,
          ordersByStatus,
          topProducts,
          topSpareParts,
          revenueByMonth: [{ month: "Actual", ingresos, egresos }],
          dealsByStatus,
          totalDeals: deals.length,
          dealsValue: deals.reduce((s, d) => s + d.monto_estimado, 0),
          newContacts: filteredContacts.length,
          appointmentsCompleted: appointments.filter((a) => a.estado === "COMPLETADA").length,
        });
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, [period]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-[#D4A843]/20 border-t-[#D4A843]" />
      </div>
    );
  }

  const profit = data.totalRevenue - data.totalCost;
  const margin = data.totalRevenue > 0 ? ((profit / data.totalRevenue) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A843] to-[#8B6914]">
            <BarChart3 className="h-5 w-5 text-[#0A0A0A]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">Reportes</h1>
            <p className="text-sm text-[#888888]">Análisis y métricas del negocio</p>
          </div>
        </div>
        <Select value={period} onValueChange={(v) => { if (v) setPeriod(v); }}>
          <SelectTrigger className="w-[160px] rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hoy">Hoy</SelectItem>
            <SelectItem value="semana">Esta semana</SelectItem>
            <SelectItem value="mes">Este mes</SelectItem>
            <SelectItem value="todo">Todo el tiempo</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Main KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Ingresos", value: formatCOP(data.totalRevenue), icon: TrendingUp, gradient: "from-[#22C55E] to-[#16A34A]" },
          { label: "Egresos", value: formatCOP(data.totalCost), icon: TrendingDown, gradient: "from-[#EF4444] to-[#DC2626]" },
          { label: "Ganancia", value: formatCOP(profit), icon: DollarSign, gradient: profit >= 0 ? "from-[#D4A843] to-[#8B6914]" : "from-[#EF4444] to-[#DC2626]" },
          { label: "Margen", value: `${margin}%`, icon: BarChart3, gradient: "from-[#D4A843] to-[#8B6914]" },
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
              <div className="text-2xl font-extrabold tracking-tight text-[#FAFAFA]">{card.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Pedidos", value: data.totalOrders, icon: Package },
          { label: "Oportunidades", value: data.totalDeals, icon: ShoppingBag },
          { label: "Nuevos Contactos", value: data.newContacts, icon: Users },
          { label: "Citas Completadas", value: data.appointmentsCompleted, icon: Wrench },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}>
            <div className="rounded-2xl bg-[#111111] border border-[rgba(212,168,67,0.12)] p-4 flex items-center gap-3">
              <card.icon className="h-5 w-5 text-[#D4A843]" />
              <div>
                <p className="text-xs text-[#888888]">{card.label}</p>
                <p className="text-xl font-bold text-[#FAFAFA]">{card.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Detailed sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Orders by status */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
          <div className="rounded-2xl bg-[#111111] border border-[rgba(212,168,67,0.12)] h-full overflow-hidden">
            <div className="p-5 pb-3 border-b border-[rgba(212,168,67,0.08)]">
              <h3 className="text-base font-semibold text-[#FAFAFA]">Pedidos por Estado</h3>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                {Object.entries(data.ordersByStatus).map(([status, count]) => {
                  const maxCount = Math.max(...Object.values(data.ordersByStatus), 1);
                  const pct = (count / maxCount) * 100;
                  const colors: Record<string, string> = {
                    pendiente: "bg-[#D4A843]", pagado: "bg-[#818CF8]", enviado: "bg-[#6366F1]",
                    entregado: "bg-[#22C55E]", cancelado: "bg-[#EF4444]",
                  };
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize text-[#FAFAFA]">{status}</span>
                        <span className="font-bold text-[#D4A843]">{count}</span>
                      </div>
                      <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className={`h-full rounded-full ${colors[status] || "bg-gray-500"}`} />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(data.ordersByStatus).length === 0 && <p className="text-sm text-[#555555] text-center py-4">Sin datos</p>}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Top products by margin */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
          <div className="rounded-2xl bg-[#111111] border border-[rgba(212,168,67,0.12)] h-full overflow-hidden">
            <div className="p-5 pb-3 border-b border-[rgba(212,168,67,0.08)]">
              <h3 className="text-base font-semibold text-[#FAFAFA]">Repuestos Mayor Margen</h3>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                {data.topSpareParts.map((sp, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl p-2 hover:bg-[rgba(212,168,67,0.05)] transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(212,168,67,0.15)] text-[#D4A843] text-xs font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-[#FAFAFA]">{sp.nombre}</p>
                      <p className="text-xs text-[#555555]">Stock: {sp.count}</p>
                    </div>
                    <span className="text-sm font-semibold text-[#22C55E]">+{formatCOP(sp.revenue)}</span>
                  </div>
                ))}
                {data.topSpareParts.length === 0 && <p className="text-sm text-[#555555] text-center py-4">Sin datos</p>}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
