"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus, Search, Phone, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { statusColors } from "../admin-theme";

const fuenteColors: Record<string, string> = {
  whatsapp: statusColors.whatsapp,
  web: statusColors.web,
  tienda: statusColors.tienda,
  referido: statusColors.referido,
};

interface Contact {
  id: string;
  telefono: string;
  nombre: string;
  email: string | null;
  fuente: string;
  notas: string | null;
  created_at: string;
}

export default function ContactosPage() {
  const supabase = createClient();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ telefono: "", nombre: "", email: "", fuente: "whatsapp" });

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("contacts").select("*", { count: "exact" });
      if (search) query = query.or(`nombre.ilike.%${search}%,telefono.ilike.%${search}%`);
      const { data, count, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      setContacts(data || []);
      setTotal(count || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const handleCreate = async () => {
    if (!form.telefono) return;
    try {
      const { error } = await supabase.from("contacts").insert(form);
      if (error) throw error;
      setDialogOpen(false);
      setForm({ telefono: "", nombre: "", email: "", fuente: "whatsapp" });
      loadContacts();
    } catch (err) { alert(err instanceof Error ? err.message : "Error"); }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A843] to-[#8B6914]">
            <Users className="h-5 w-5 text-[#0A0A0A]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">Contactos</h1>
            <p className="text-sm text-[#888888]">{total} contactos registrados</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setDialogOpen(true)}
              className="rounded-xl h-10 px-4 border-0 font-semibold text-[#0A0A0A] bg-gradient-to-br from-[#D4A843] to-[#8B6914] hover:from-[#F0D78C] hover:to-[#D4A843]">
              <Plus className="h-4 w-4 mr-2" /> Agregar Contacto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo Contacto</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Teléfono *</Label><Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="+573001234567" /></div>
              <div className="space-y-2"><Label>Nombre</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Juan Pérez" /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="juan@email.com" /></div>
              <Button onClick={handleCreate} disabled={!form.telefono} className="w-full text-[#0A0A0A] bg-gradient-to-br from-[#D4A843] to-[#8B6914] hover:from-[#F0D78C] hover:to-[#D4A843]">Crear Contacto</Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555555]" />
        <Input className="pl-9 rounded-xl" placeholder="Buscar por nombre o teléfono..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4A843]" /></div>
      ) : (
        <div className="rounded-2xl bg-[#111111] border border-[rgba(212,168,67,0.12)] overflow-hidden">
          <Table>
            <TableHeader><TableRow className="bg-[#0D0D0D] border-b border-[rgba(212,168,67,0.08)] hover:bg-[#0D0D0D]">
              <TableHead className="text-[#D4A843] font-semibold">Nombre</TableHead><TableHead className="text-[#D4A843] font-semibold">Teléfono</TableHead><TableHead className="text-[#D4A843] font-semibold">Email</TableHead><TableHead className="text-[#D4A843] font-semibold">Fuente</TableHead><TableHead className="text-[#D4A843] font-semibold">Fecha</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {contacts.map((c, i) => (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-[rgba(212,168,67,0.05)] last:border-0 hover:bg-[rgba(212,168,67,0.05)] transition-colors">
                  <TableCell className="font-medium text-[#FAFAFA]">{c.nombre || "Sin nombre"}</TableCell>
                  <TableCell className="text-[#888888]"><div className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.telefono}</div></TableCell>
                  <TableCell className="text-[#888888]">{c.email ? <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</div> : "—"}</TableCell>
                  <TableCell><Badge className={`border-0 ${fuenteColors[c.fuente] || "bg-[#0D0D0D] text-[#888888]"}`}>{c.fuente}</Badge></TableCell>
                  <TableCell className="text-[#555555] text-sm">{new Date(c.created_at).toLocaleDateString("es-CO")}</TableCell>
                </motion.tr>
              ))}
              {contacts.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-[#555555]">Sin contactos</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
