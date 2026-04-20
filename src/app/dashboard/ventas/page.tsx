"use client";

import { useEffect, useState } from "react";
import { Loader2, Package, Truck, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/constants";

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  procesando: "Procesando",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendiente: "outline",
  confirmado: "secondary",
  procesando: "secondary",
  enviado: "default",
  entregado: "default",
  cancelado: "destructive",
};

interface SaleOrder {
  id: string;
  order_id: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
  product: { name: string; slug: string };
  order: {
    id: string;
    status: string;
    shipping_name: string;
    shipping_phone: string;
    shipping_address: string;
    shipping_city: string;
    shipping_neighborhood: string;
    shipping_notes: string | null;
    buyer: { full_name: string; email: string };
  };
}

export default function VentasPage() {
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!store) {
        setLoading(false);
        return;
      }

      setStoreId(store.id);

      const { data } = await supabase
        .from("order_items")
        .select(`
          id, order_id, quantity, unit_price, total, created_at,
          product:products(name, slug),
          order:orders(id, status, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_neighborhood, shipping_notes,
            buyer:profiles(full_name, email)
          )
        `)
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      setSales((data as unknown as SaleOrder[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  async function updateOrderStatus(orderId: string, newStatus: string) {
    setUpdatingId(orderId);
    const supabase = createClient();
    await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);

    setSales(sales.map((s) => {
      if (s.order_id === orderId) {
        return { ...s, order: { ...s.order, status: newStatus } };
      }
      return s;
    }));
    setUpdatingId(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!storeId) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold mb-2">Primero crea tu tienda</h2>
        <p className="text-muted-foreground mb-4">Necesitas una tienda para ver ventas</p>
        <Button asChild>
          <a href="/dashboard/tienda">Crear tienda</a>
        </Button>
      </div>
    );
  }

  // Stats
  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  const pendingCount = sales.filter((s) => s.order.status === "pendiente" || s.order.status === "confirmado").length;
  const shippedCount = sales.filter((s) => s.order.status === "enviado").length;
  const deliveredCount = sales.filter((s) => s.order.status === "entregado").length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Mis Ventas</h1>
        <p className="text-muted-foreground">Gestiona los pedidos de tus compradores</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalSales)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Package className="h-3.5 w-3.5" /> Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" /> Enviados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shippedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" /> Entregados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveredCount}</div>
          </CardContent>
        </Card>
      </div>

      {sales.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aún no tienes ventas</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-xs">
                      {sale.order_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium truncate max-w-[150px]">
                          {sale.product?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          x{sale.quantity}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{sale.order?.shipping_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {sale.order?.shipping_phone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs max-w-[180px] truncate">
                        {sale.order?.shipping_address}, {sale.order?.shipping_city}
                      </p>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(sale.total)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[sale.order?.status] || "outline"}>
                        {STATUS_LABELS[sale.order?.status] || sale.order?.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={sale.order?.status}
                        onValueChange={(v) => updateOrderStatus(sale.order_id, v)}
                        disabled={updatingId === sale.order_id}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="confirmado">Confirmar</SelectItem>
                          <SelectItem value="procesando">Procesando</SelectItem>
                          <SelectItem value="enviado">Enviado</SelectItem>
                          <SelectItem value="entregado">Entregado</SelectItem>
                          <SelectItem value="cancelado">Cancelar</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
