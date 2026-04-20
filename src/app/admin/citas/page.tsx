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
import { Calendar, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { statusColors } from "../admin-theme";

const STATUSES = [
  { value: "PROGRAMADA", label: "Programada" },
  { value: "CONFIRMADA", label: "Confirmada" },
  { value: "COMPLETADA", label: "Completada" },
  { value: "CANCELADA", label: "Cancelada" },
];

interface Appointment {
  id: string;
  contact_id: string | null;
  fecha_hora: string;
  motivo: string;
  estado: string;
  notas: string | null;
  created_at: string;
  contacts?: { nombre: string; telefono: string } | null;
}

export default function CitasPage() {
  const supabase = createClient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ fecha_hora: "", motivo: "", estado: "PROGRAMADA", notas: "" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count, error } = await supabase
        .from("appointments")
        .select("*, contacts(nombre, telefono)")
        .order("fecha_hora", { ascending: true });
      if (error) throw error;
      setAppointments(data || []);
      setTotal(count || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!form.fecha_hora || !form.motivo) return;
    try {
      const { error } = await supabase.from("appointments").insert({
        fecha_hora: form.fecha_hora,
        motivo: form.motivo,
        estado: form.estado,
        notas: form.notas || null,
      });
      if (error) throw error;
      setDialogOpen(false);
      setForm({ fecha_hora: "", motivo: "", estado: "PROGRAMADA", notas: "" });
      loadData();
    } catch (err) { alert(err instanceof Error ? err.message : "Error"); }
  };

  const updateStatus = async (id: string, estado: string) => {
    try {
      await supabase.from("appointments").update({ estado }).eq("id", id);
      loadData();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A843] to-[#8B6914]">
            <Calendar className="h-5 w-5 text-[#0A0A0A]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">Citas</h1>
            <p className="text-sm text-[#888888]">{total} citas programadas</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setDialogOpen(true)}
              className="rounded-xl h-10 px-4 border-0 font-semibold text-[#0A0A0A] bg-gradient-to-br from-[#D4A843] to-[#8B6914] hover:from-[#F0D78C] hover:to-[#D4A843]">
              <Plus className="h-4 w-4 mr-2" /> Nueva Cita
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva Cita</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Fecha y Hora *</Label><Input type="datetime-local" value={form.fecha_hora} onChange={(e) => setForm({ ...form, fecha_hora: e.target.value })} /></div>
              <div className="space-y-2"><Label>Motivo *</Label><Input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Consulta iPhone 15 Pro" /></div>
              <div className="space-y-2"><Label>Estado</Label><Select value={form.estado} onValueChange={(v) => { if (v) setForm({ ...form, estado: v }); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Notas</Label><Input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Cliente prefiere horario de la tarde" /></div>
              <Button onClick={handleCreate} disabled={!form.fecha_hora || !form.motivo} className="w-full text-[#0A0A0A] bg-gradient-to-br from-[#D4A843] to-[#8B6914] hover:from-[#F0D78C] hover:to-[#D4A843]">Crear Cita</Button>
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
              <TableHead className="text-[#D4A843] font-semibold">Cliente</TableHead><TableHead className="text-[#D4A843] font-semibold">Fecha y Hora</TableHead><TableHead className="text-[#D4A843] font-semibold">Motivo</TableHead><TableHead className="text-[#D4A843] font-semibold">Estado</TableHead><TableHead className="text-right text-[#D4A843] font-semibold">Acciones</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {appointments.map((a, i) => (
                <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-[rgba(212,168,67,0.05)] last:border-0 hover:bg-[rgba(212,168,67,0.05)] transition-colors">
                  <TableCell className="font-medium text-[#FAFAFA]">{a.contacts?.nombre || "—"}</TableCell>
                  <TableCell className="text-[#888888]">{new Date(a.fecha_hora).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</TableCell>
                  <TableCell className="text-[#888888]">{a.motivo}</TableCell>
                  <TableCell><Badge className={`border-0 ${statusColors[a.estado] || "bg-[#0D0D0D] text-[#888888]"}`}>{a.estado}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Select value={a.estado} onValueChange={(v) => { if (v) updateStatus(a.id, v); }}>
                      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                </motion.tr>
              ))}
              {appointments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-[#555555]">Sin citas</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
