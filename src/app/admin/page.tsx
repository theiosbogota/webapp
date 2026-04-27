"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, Package, ShoppingBag, DollarSign, TrendingUp,
  Sparkles, Wrench, Handshake, AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { formatCOP, statusColors } from "./admin-theme";

interface AdminStats {
  users: number; stores: number; products: number; orders: number;
  totalRevenue: number; pendingOrders: number; spareParts: number;
  lowStockParts: number; deals: number;
  dealsByStatus: Record<string, number>;
  topProducts: { id: string; name: string; price: number; stock: number }[];
  recentOrders: { id: string; total: number; status: string; created_at: string }[];
}

const kpiConfigs = [
  { label: "Ingresos", key: "totalRevenue", icon: DollarSign, gradient: "from-[#D4A843] to-[#8B6914]", suffix: "Ventas totales", format: true },
  { label: "Pedidos", key: "orders", icon: Package, gradient: "from-[#818CF8] to-[#6366F1]", suffix: "Pedidos totales" },
  { label: "Productos", key: "products", icon: ShoppingBag, gradient: "from-[#D4A843] to-[#8B6914]", suffix: "Productos registrados" },
  { label: "Repuestos", key: "spareParts", icon: Wrench, gradient: "from-[#F59E0B] to-[#D97706]", suffix: "Repuestos en inventario" },
  { label: "Contactos", key: "users", icon: Users, gradient: "from-[#C084FC] to-[#A855F7]", suffix: "Usuarios registrados" },
  { label: "Oportunidades", key: "deals", icon: Handshake, gradient: "from-[#818CF8] to-[#6366F1]", suffix: "Oportunidades activas" },
];

const dealBarColors: Record<string, string> = {
  NUEVO: "bg-[#818CF8]",
  EN_NEGOCIACION: "bg-[#D4A843]",
  CERRADO_GANADO: "bg-[#22C55E]",
  CERRADO_PERDIDO: "bg-[#EF4444]",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [usersRes, storesRes, productsRes, ordersRes, sparePartsRes, dealsRes, lowStockRes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("stores").select("*", { count: "exact", head: true }),
        supabase.from("products").select("id, name, price, stock").order("price", { ascending: false }).limit(5),
        supabase.from("orders").select("id, total, status, created_at"),
        supabase.from("spare_parts").select("*", { count: "exact", head: true }),
        supabase.from("deals").select("estado"),
        supabase.from("spare_parts").select("id, nombre, stock, stock_minimo").eq("active", true),
      ]);

      const orders = ordersRes.data || [];
      const totalRevenue = orders.filter((o) => o.status !== "cancelado" && o.status !== "reembolsado").reduce((sum, o) => sum + (o.total || 0), 0);
      const deals = dealsRes.data || [];
      const dealsByStatus: Record<string, number> = {};
      deals.forEach((d) => { dealsByStatus[d.estado] = (dealsByStatus[d.estado] || 0) + 1; });
      const lowStockParts = (lowStockRes.data || []).filter((sp) => sp.stock <= (sp.stock_minimo || 2)).length;
      const topProducts = (productsRes.data || []).map((p) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock }));
      const recentOrders = orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

      setStats({
        users: usersRes.count || 0, stores: storesRes.count || 0,
        products: productsRes.count || productsRes.data?.length || 0,
        orders: orders.length, totalRevenue,
        pendingOrders: orders.filter((o) => o.status === "pendiente").length,
        spareParts: sparePartsRes.count || 0, lowStockParts,
        deals: deals.length, dealsByStatus, topProducts, recentOrders,
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-[#D4A843]/20 border-t-[#D4A843]" />
      </div>
    );
  }

  const getStatValue = (key: string) => {
    const val = (stats as unknown as Record<string, unknown>)[key];
    return typeof val === "number" ? val : 0;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A843] to-[#8B6914]">
            <Sparkles className="h-5 w-5 text-[#0A0A0A]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">Dashboard</h1>
            <p className="text-sm text-[#888888]">Resumen general de IOSBogotá</p>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiConfigs.map((card, i) => (
          <motion.div key={card.label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            className="rounded-2xl bg-[#111111] border border-[rgba(212,168,67,0.12)] p-5 hover:border-[rgba(212,168,67,0.3)] hover:shadow-[0_8px_30px_rgba(212,168,67,0.15)] transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} text-[#0A0A0A]`}>
                <card.icon className="h-5 w-5" />
              </div>
              <Badge className="text-[10px] font-medium border-0 bg-[rgba(212,168,67,0.12)] text-[#D4A843]">{card.label}</Badge>
            </div>
            <div className="text-2xl font-extrabold tracking-tight text-[#FAFAFA]">
              {card.format ? formatCOP(getStatValue(card.key) as number) : getStatValue(card.key)}
            </div>
            <p className="text-xs text-[#555555] mt-1">{card.suffix}</p>
          </motion.div>
        ))}
      </div>

      {/* Low stock alert */}
      {stats.lowStockParts > 0 && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="rounded-2xl bg-[#1A1500] border border-[rgba(212,168,67,0.2)] p-4 flex items-center gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-[#D4A843]" />
          <p className="text-sm text-[#D4A843]">
            <strong>{stats.lowStockParts}</strong> repuesto{stats.lowStockParts > 1 ? "s" : ""} con stock bajo
          </p>
          <a href="/admin/repuestos" className="text-sm font-medium text-[#F0D78C] hover:underline ml-auto">Ver repuestos →</a>
        </motion.div>
      )}

      {/* Bottom cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Deals by status */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-2xl bg-[#111111] border border-[rgba(212,168,67,0.12)] overflow-hidden"
        >
          <div className="p-5 pb-3 border-b border-[rgba(212,168,67,0.08)]">
            <h3 className="text-base font-semibold text-[#FAFAFA] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#D4A843]" />
              Oportunidades por Estado
            </h3>
          </div>
          <div className="p-5 space-y-4">
            {Object.entries(stats.dealsByStatus).map(([status, count], i) => {
              const maxCount = Math.max(...Object.values(stats.dealsByStatus), 1);
              const percentage = (count / maxCount) * 100;
              return (
                <motion.div key={status} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + i * 0.08 }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge className={`border-0 text-xs font-medium ${statusColors[status] || "bg-[#0D0D0D] text-[#888888]"}`}>
                      {status.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-sm font-bold text-[#FAFAFA]">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#0A0A0A] overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, delay: 0.5 + i * 0.1, ease: "easeOut" }}
                      className={`h-full rounded-full ${dealBarColors[status] || "bg-[#555555]"}`}
                    />
                  </div>
                </motion.div>
              );
            })}
            {Object.keys(stats.dealsByStatus).length === 0 && (
              <p className="text-sm text-[#555555] text-center py-4">Sin oportunidades aún</p>
            )}
          </div>
        </motion.div>

        {/* Top products */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-2xl bg-[#111111] border border-[rgba(212,168,67,0.12)] overflow-hidden"
        >
          <div className="p-5 pb-3 border-b border-[rgba(212,168,67,0.08)]">
            <h3 className="text-base font-semibold text-[#FAFAFA] flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[#D4A843]" />
              Productos Top
            </h3>
          </div>
          <div className="p-5 space-y-2">
            {stats.topProducts.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + i * 0.06 }}
                className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-[rgba(212,168,67,0.05)] transition-colors group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#D4A843]/20 to-[#8B6914]/10 text-[#D4A843] text-xs font-bold">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#FAFAFA] truncate group-hover:text-[#D4A843] transition-colors">{p.name}</p>
                  <p className="text-xs text-[#555555]">Stock: {p.stock}</p>
                </div>
                <span className="text-sm font-semibold text-[#D4A843]">{formatCOP(p.price)}</span>
              </motion.div>
            ))}
            {stats.topProducts.length === 0 && <p className="text-sm text-[#555555] text-center py-4">Sin productos</p>}
          </div>
        </motion.div>

        {/* Recent orders */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-2xl bg-[#111111] border border-[rgba(212,168,67,0.12)] overflow-hidden"
        >
          <div className="p-5 pb-3 border-b border-[rgba(212,168,67,0.08)]">
            <h3 className="text-base font-semibold text-[#FAFAFA] flex items-center gap-2">
              <Package className="h-4 w-4 text-[#D4A843]" />
              Pedidos Recientes
            </h3>
          </div>
          <div className="p-5 space-y-2">
            {stats.recentOrders.map((o, i) => (
              <motion.div key={o.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + i * 0.06 }}
                className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-[rgba(212,168,67,0.05)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#FAFAFA] truncate">{o.id.slice(0, 8)}...</p>
                  <p className="text-xs text-[#555555]">{new Date(o.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}</p>
                </div>
                <Badge className={`border-0 text-[10px] font-medium ${statusColors[o.status] || "bg-[#0D0D0D] text-[#888888]"}`}>
                  {o.status}
                </Badge>
                <span className="text-sm font-semibold text-[#FAFAFA]">{formatCOP(o.total)}</span>
              </motion.div>
            ))}
            {stats.recentOrders.length === 0 && <p className="text-sm text-[#555555] text-center py-4">Sin pedidos</p>}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
