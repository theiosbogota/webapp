"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  verified: boolean;
  active: boolean;
  total_sales: number;
  rating: number;
  created_at: string;
  owner: { full_name: string; email: string } | null;
}

export default function AdminTiendasPage() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("stores")
        .select("*, owner:profiles(full_name, email)")
        .order("created_at", { ascending: false });
      setStores((data as unknown as StoreRow[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  async function toggleVerified(id: string, current: boolean) {
    const supabase = createClient();
    await supabase.from("stores").update({ verified: !current }).eq("id", id);
    setStores(stores.map((s) => (s.id === id ? { ...s, verified: !current } : s)));
  }

  async function toggleActive(id: string, current: boolean) {
    const supabase = createClient();
    await supabase.from("stores").update({ active: !current }).eq("id", id);
    setStores(stores.map((s) => (s.id === id ? { ...s, active: !current } : s)));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Tiendas</h1>
        <p className="text-muted-foreground">{stores.length} tiendas registradas</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tienda</TableHead>
                <TableHead>Propietario</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Ventas</TableHead>
                <TableHead>Verificada</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay tiendas
                  </TableCell>
                </TableRow>
              ) : (
                stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{store.owner?.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{store.owner?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{store.rating.toFixed(1)}</TableCell>
                    <TableCell>{store.total_sales}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleVerified(store.id, store.verified)}
                        className="gap-1"
                      >
                        {store.verified ? (
                          <CheckCircle className="h-4 w-4 text-blue-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        {store.verified ? "Verificada" : "Verificar"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={store.active ? "default" : "destructive"}
                        className="cursor-pointer"
                        onClick={() => toggleActive(store.id, store.active)}
                      >
                        {store.active ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
