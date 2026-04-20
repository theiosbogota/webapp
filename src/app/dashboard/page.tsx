"use client";

import { useEffect, useState } from "react";
import { Package, ShoppingBag, Store, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/constants";

interface DashboardStats {
  orders: number;
  products: number;
  hasStore: boolean;
  storeName: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    orders: 0,
    products: 0,
    hasStore: false,
    storeName: "",
  });

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count: orderCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("buyer_id", user.id);

      const { data: store } = await supabase
        .from("stores")
        .select("id, name")
        .eq("owner_id", user.id)
        .single();

      let productCount = 0;
      if (store) {
        const { count } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("store_id", store.id);
        productCount = count || 0;
      }

      setStats({
        orders: orderCount || 0,
        products: productCount,
        hasStore: !!store,
        storeName: store?.name || "",
      });
    }
    loadStats();
  }, []);

  const cards = [
    {
      title: "Mis Pedidos",
      value: stats.orders.toString(),
      description: "Pedidos realizados",
      icon: Package,
    },
    {
      title: "Mi Tienda",
      value: stats.hasStore ? stats.storeName : "Sin tienda",
      description: stats.hasStore ? "Tienda activa" : "Crea tu tienda para vender",
      icon: Store,
    },
    {
      title: "Productos",
      value: stats.products.toString(),
      description: "Productos publicados",
      icon: ShoppingBag,
    },
    {
      title: "Ventas",
      value: formatPrice(0),
      description: "Ventas totales",
      icon: DollarSign,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Bienvenido a tu panel de control</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
