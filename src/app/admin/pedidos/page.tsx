"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { statusColors } from "../admin-theme";
import { formatPrice } from "@/lib/constants";

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  procesando: "Procesando",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
  reembolsado: "Reembolsado",
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  pendiente: statusColors.pendiente,
  confirmado: "bg-[#1A1500] text-[#D4A843] border-0",
  procesando: "bg-[#1A1500] text-[#D4A843] border-0",
  enviado: statusColors.enviado,
  entregado: statusColors.entregado,
  cancelado: statusColors.cancelado,
  reembolsado: statusColors.reembolsado,
};

interface OrderRow {
  id: string;
  status: string;
  total: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  created_at: string;
  buyer: { full_name: string; email: string };
}

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("orders")
        .select("*, buyer:profiles(full_name, email)")
        .order("created_at", { ascending: false });
      setOrders((data as unknown as OrderRow[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  async function updateStatus(orderId: string, newStatus: string) {
    const supabase = createClient();
    await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-[#D4A843]/20 border-t-[#D4A843]" />
      </div>
    );
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A843] to-[#8B6914]">
          <Package className="h-5 w-5 text-[#0A0A0A]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#FAFAFA]">Todos los Pedidos</h1>
          <p className="text-sm text-[#888888]">{orders.length} pedidos en total</p>
        </div>
      </motion.div>

      <div className="rounded-2xl bg-[#111111] border border-[rgba(212,168,67,0.12)] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#0D0D0D] border-b border-[rgba(212,168,67,0.08)] hover:bg-[#0D0D0D]">
                <TableHead className="text-[#D4A843] font-semibold">ID</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Fecha</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Comprador</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Dirección</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Total</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Estado</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-[#555555]">
                    No hay pedidos
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} className="border-b border-[rgba(212,168,67,0.05)] hover:bg-[rgba(212,168,67,0.05)]">
                    <TableCell className="font-mono text-xs text-[#888888]">
                      {order.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-sm text-[#888888]">
                      {new Date(order.created_at).toLocaleDateString("es-CO")}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-[#FAFAFA]">{order.shipping_name}</p>
                        <p className="text-xs text-[#555555]">{order.buyer?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate text-[#888888]">
                      {order.shipping_address}, {order.shipping_city}
                    </TableCell>
                    <TableCell className="font-medium text-[#D4A843]">
                      {formatPrice(order.total)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`border-0 ${STATUS_BADGE_COLORS[order.status] || "bg-[#0D0D0D] text-[#888888]"}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={order.status}
                        onValueChange={(v) => updateStatus(order.id, v)}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="confirmado">Confirmado</SelectItem>
                          <SelectItem value="procesando">Procesando</SelectItem>
                          <SelectItem value="enviado">Enviado</SelectItem>
                          <SelectItem value="entregado">Entregado</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                          <SelectItem value="reembolsado">Reembolsado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
    </div>
  );
}
