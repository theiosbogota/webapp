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
import { Handshake, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCOP, statusColors } from "../admin-theme";

const STATUSES = [
  { value: "NUEVO", label: "Nuevo" },
  { value: "EN_NEGOCIACION", label: "En Negociación" },
  { value: "CERRADO_GANADO", label: "Cerrado Ganado" },
  { value: "CERRADO_PERDIDO", label: "Cerrado Perdido" },
];

interface Deal {
  id: string;
  contact_id: string | null;
  product_id: string | null;
  producto: string;
  monto_estimado: number;
  estado: string;
  notas: string | null;
  created_at: string;
  contacts?: { nombre: string; telefono: string } | null;
}

export default function OportunidadesPage() {
  const supabase = createClient();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ producto: "", monto_estimado: "", estado: "NUEVO", notas: "" });

  const loadDeals = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count, error } = await supabase
        .from("deals")
        .select("*, contacts(nombre, telefono)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDeals(data || []);
      setTotal(count || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDeals(); }, [loadDeals]);

  const handleCreate = async () => {
    if (!form.producto) return;
    try {
      const { error } = await supabase.from("deals").insert({
        producto: form.producto,
        monto_estimado: parseInt(form.monto_estimado) || 0,
        estado: form.estado,
        notas: form.notas || null,
      });
      if (error) throw error;
      setDialogOpen(false);
      setForm({ producto: "", monto_estimado: "", estado: "NUEVO", notas: "" });
      loadDeals();
    } catch (err) { alert(err instanceof Error ? err.message : "Error"); }
  };

  const updateStatus = async (id: string, estado: string) => {
    try {
      await supabase.from("deals").update({ estado }).eq("id", id);
      loadDeals();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A843] to-[#8B6914]">
            <Handshake className="h-5 w-5 text-[#0A0A0A]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">Oportunidades</h1>
            <p className="text-sm text-[#888888]">{total} oportunidades de venta</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setDialogOpen(true)}
              className="rounded-xl h-10 px-4 border-0 font-semibold text-[#0A0A0A] bg-gradient-to-br from-[#D4A843] to-[#8B6914] hover:from-[#F0D78C] hover:to-[#D4A843]">
              <Plus className="h-4 w-4 mr-2" /> Nueva Oportunidad
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva Oportunidad</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Producto *</Label><Input value={form.producto} onChange={(e) => setForm({ ...form, producto: e.target.value })} placeholder="iPhone 16 Pro" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Monto estimado (COP)</Label><Input type="number" value={form.monto_estimado} onChange={(e) => setForm({ ...form, monto_estimado: e.target.value })} placeholder="5699000" /></div>
                <div className="space-y-2"><Label>Estado</Label><Select value={form.estado} onValueChange={(v) => { if (v) setForm({ ...form, estado: v }); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="space-y-2"><Label>Notas</Label><Input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Cliente interesado en color negro..." /></div>
              <Button onClick={handleCreate} disabled={!form.producto} className="w-full text-[#0A0A0A] bg-gradient-to-br from-[#D4A843] to-[#8B6914] hover:from-[#F0D78C] hover:to-[#D4A843]">Crear Oportunidad</Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4A843]" /></div>
      ) : (
        <div className="rounded-2xl bg-[#111111] border border-[rgba(212,168,67,0.12)] overflow-hidden">
          <Table>
            <TableHeader><TableRow className="bg-[#0D0D0D] border-b border-[rgba(212,168,67,0.08)] hover:bg-[#0D0D0D]">
              <TableHead className="text-[#D4A843] font-semibold">Producto</TableHead><TableHead className="text-[#D4A843] font-semibold">Contacto</TableHead><TableHead className="text-right text-[#D4A843] font-semibold">Monto</TableHead><TableHead className="text-[#D4A843] font-semibold">Estado</TableHead><TableHead className="text-[#D4A843] font-semibold">Fecha</TableHead><TableHead className="text-right text-[#D4A843] font-semibold">Acciones</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {deals.map((d, i) => (
                <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-[rgba(212,168,67,0.05)] last:border-0 hover:bg-[rgba(212,168,67,0.05)] transition-colors">
                  <TableCell className="font-medium text-[#FAFAFA]">{d.producto}</TableCell>
                  <TableCell className="text-[#888888]">{d.contacts?.nombre || "—"}</TableCell>
                  <TableCell className="text-right text-[#D4A843]">{formatCOP(d.monto_estimado)}</TableCell>
                  <TableCell><Badge className={`border-0 ${statusColors[d.estado] || "bg-[#0D0D0D] text-[#888888]"}`}>{d.estado.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell className="text-[#555555] text-sm">{new Date(d.created_at).toLocaleDateString("es-CO")}</TableCell>
                  <TableCell className="text-right">
                    <Select value={d.estado} onValueChange={(v) => { if (v) updateStatus(d.id, v); }}>
                      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                </motion.tr>
              ))}
              {deals.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-[#555555]">Sin oportunidades</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
