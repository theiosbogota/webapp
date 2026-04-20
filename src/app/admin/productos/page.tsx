"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Smartphone } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";
import { formatPrice, CONDITION_LABELS } from "@/lib/constants";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  model: string;
  condition: string;
  price: number;
  stock: number;
  active: boolean;
  created_at: string;
  store: { name: string } | null;
}

export default function AdminProductosPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select("*, store:stores(name)")
        .order("created_at", { ascending: false });
      setProducts((data as unknown as ProductRow[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  async function toggleActive(id: string, current: boolean) {
    const supabase = createClient();
    await supabase.from("products").update({ active: !current }).eq("id", id);
    setProducts(products.map((p) => (p.id === id ? { ...p, active: !current } : p)));
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
          <Smartphone className="h-5 w-5 text-[#0A0A0A]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#FAFAFA]">Todos los Productos</h1>
          <p className="text-sm text-[#888888]">{products.length} productos en total</p>
        </div>
      </motion.div>

      <div className="rounded-2xl bg-[#111111] border border-[rgba(212,168,67,0.12)] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#0D0D0D] border-b border-[rgba(212,168,67,0.08)] hover:bg-[#0D0D0D]">
                <TableHead className="text-[#D4A843] font-semibold">Producto</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Tienda</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Modelo</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Condición</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Precio</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Stock</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Estado</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Ver</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-[#555555]">
                    No hay productos
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id} className="border-b border-[rgba(212,168,67,0.05)] hover:bg-[rgba(212,168,67,0.05)]">
                    <TableCell className="font-medium max-w-[180px] truncate text-[#FAFAFA]">
                      {p.name}
                    </TableCell>
                    <TableCell className="text-sm text-[#888888]">{p.store?.name || "—"}</TableCell>
                    <TableCell className="text-[#888888]">{p.model}</TableCell>
                    <TableCell>
                      <Badge className="border-0 bg-[rgba(212,168,67,0.12)] text-[#D4A843]">
                        {CONDITION_LABELS[p.condition as keyof typeof CONDITION_LABELS] || p.condition}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#D4A843]">{formatPrice(p.price)}</TableCell>
                    <TableCell className="text-[#FAFAFA]">{p.stock}</TableCell>
                    <TableCell>
                      <Badge
                        className={`cursor-pointer border-0 ${p.active ? "bg-[#0A1A0A] text-[#22C55E]" : "bg-[#1A0A0A] text-[#EF4444]"}`}
                        onClick={() => toggleActive(p.id, p.active)}
                      >
                        {p.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild className="text-[#888888] hover:text-[#D4A843] hover:bg-[rgba(212,168,67,0.1)]">
                        <Link href={`/productos/${p.slug}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
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
