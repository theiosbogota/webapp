"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bot, MessageSquare, ShoppingBag, TrendingUp, ExternalLink, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

interface Metric {
  event_type: string;
  phone: string;
  tool_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface KPI {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  message_sent: { label: "Mensaje enviado", color: "bg-[#0A0D1A] text-[#818CF8]" },
  message_received: { label: "Mensaje recibido", color: "bg-[#1A1500] text-[#D4A843]" },
  sale_created: { label: "Venta creada", color: "bg-[#0A1A0A] text-[#22C55E]" },
  payment_link_sent: { label: "Link de pago", color: "bg-[#0A1A1A] text-[#06B6D4]" },
  human_handoff: { label: "Transferido", color: "bg-[#1A0A1A] text-[#C084FC]" },
  tool_used: { label: "Tool usada", color: "bg-[#1A1500] text-[#D4A843]" },
  error: { label: "Error", color: "bg-[#1A0A0A] text-[#EF4444]" },
};

export default function BotMetricsPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");

  useEffect(() => {
    loadMetrics();
  }, [period]);

  async function loadMetrics() {
    setLoading(true);
    const s = createClient();
    const days = period === "24h" ? 1 : period === "7d" ? 7 : 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data } = await s
      .from("bot_metrics")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);

    setMetrics(data || []);
    setLoading(false);
  }

  const totalMessages = metrics.filter(m => m.event_type === "message_sent" || m.event_type === "message_received").length;
  const salesCreated = metrics.filter(m => m.event_type === "sale_created").length;
  const paymentLinks = metrics.filter(m => m.event_type === "payment_link_sent").length;
  const handoffs = metrics.filter(m => m.event_type === "human_handoff").length;
  const uniquePhones = new Set(metrics.map(m => m.phone)).size;
  const conversionRate = totalMessages > 0 ? ((salesCreated / uniquePhones) * 100).toFixed(1) : "0";

  const kpis: KPI[] = [
    { label: "Conversaciones", value: uniquePhones, icon: <MessageSquare className="h-5 w-5" />, gradient: "from-[#818CF8] to-[#6366F1]" },
    { label: "Mensajes", value: totalMessages, icon: <Bot className="h-5 w-5" />, gradient: "from-[#D4A843] to-[#8B6914]" },
    { label: "Ventas", value: salesCreated, icon: <ShoppingBag className="h-5 w-5" />, gradient: "from-[#22C55E] to-[#16A34A]" },
    { label: "Conversión", value: `${conversionRate}%`, icon: <TrendingUp className="h-5 w-5" />, gradient: "from-[#06B6D4] to-[#0891B2]" },
    { label: "Links de Pago", value: paymentLinks, icon: <ExternalLink className="h-5 w-5" />, gradient: "from-[#C084FC] to-[#A855F7]" },
    { label: "Handoffs", value: handoffs, icon: <AlertCircle className="h-5 w-5" />, gradient: "from-[#F59E0B] to-[#D97706]" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="h-7 w-7 text-[#D4A843]" />
            WhatsApp Bot
          </h1>
          <p className="text-[#888] text-sm mt-1">Métricas del asistente virtual</p>
        </div>
        <div className="flex gap-2">
          {["24h", "7d", "30d"].map(p => (
            <Button key={p} variant={period === p ? "default" : "outline"} size="sm"
              className={period === p ? "bg-[#D4A843] text-black hover:bg-[#F0D78C]" : "border-[rgba(212,168,67,0.2)] text-[#888] hover:text-white"}
              onClick={() => setPeriod(p)}>
              {p === "24h" ? "24 horas" : p === "7d" ? "7 días" : "30 días"}
            </Button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-[#111] border border-[rgba(212,168,67,0.12)] rounded-xl p-4">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${kpi.gradient} flex items-center justify-center text-white mb-2`}>
              {kpi.icon}
            </div>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
            <p className="text-xs text-[#888]">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-[#111] border border-[rgba(212,168,67,0.12)] rounded-xl p-4">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#D4A843]" />
          Actividad Reciente
        </h2>
        {loading ? (
          <div className="text-center py-8 text-[#555]">Cargando...</div>
        ) : metrics.length === 0 ? (
          <div className="text-center py-8 text-[#555]">No hay métricas aún. Ejecuta el SQL de bot_metrics primero.</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {metrics.slice(0, 50).map((m, i) => {
              const evt = EVENT_LABELS[m.event_type] || { label: m.event_type, color: "bg-[#0D0D0D] text-[#888]" };
              const meta = m.metadata || {};
              return (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[rgba(212,168,67,0.05)] border-b border-[rgba(212,168,67,0.06)]">
                  <div className="flex items-center gap-3">
                    <Badge className={`${evt.color} border text-xs`}>{evt.label}</Badge>
                    <span className="text-sm text-[#aaa]">{m.phone?.replace(/^\+/, '') || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {typeof meta.user_message === "string" && (
                      <span className="text-xs text-[#666] max-w-48 truncate">{meta.user_message}</span>
                    )}
                    <span className="text-xs text-[#555]">
                      {new Date(m.created_at).toLocaleString("es-CO", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
