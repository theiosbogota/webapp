"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wrench, Plus, Search, Edit, ToggleLeft, ToggleRight, AlertTriangle, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCOP } from "../admin-theme";

const CATEGORIES = [
  { value: "PANTALLA", label: "Pantalla" },
  { value: "BATERIA", label: "Batería" },
  { value: "CAMARA", label: "Cámara" },
  { value: "CONECTOR", label: "Conector / Puerto" },
  { value: "BOTON", label: "Botón / Flex" },
  { value: "CARCASA", label: "Carcasa / Marco" },
  { value: "PLACA", label: "Placa / Board" },
  { value: "OTRO", label: "Otro" },
];

const QUALITIES = [
  { value: "ORIGINAL", label: "Original" },
  { value: "GENERICO", label: "Genérico" },
  { value: "REACONDICIONADO", label: "Reacondicionado" },
];

const CATEGORY_COLORS: Record<string, string> = {
  PANTALLA: "bg-[#0A0D1A] text-[#818CF8] border-[rgba(129,140,248,0.2)]",
  BATERIA: "bg-[#0A1A0A] text-[#22C55E] border-[rgba(34,197,94,0.2)]",
  CAMARA: "bg-[#1A0A1A] text-[#C084FC] border-[rgba(192,132,252,0.2)]",
  CONECTOR: "bg-[#1A1500] text-[#F97316] border-[rgba(249,115,22,0.2)]",
  BOTON: "bg-[#1A0A1A] text-[#EC4899] border-[rgba(236,72,153,0.2)]",
  CARCASA: "bg-[#0D0D0D] text-[#888888] border-[rgba(136,136,136,0.2)]",
  PLACA: "bg-[#1A0A0A] text-[#EF4444] border-[rgba(239,68,68,0.2)]",
  OTRO: "bg-[#0D0D0D] text-[#888888] border-[rgba(136,136,136,0.2)]",
};

const QUALITY_COLORS: Record<string, string> = {
  ORIGINAL: "bg-[#0A1A0A] text-[#22C55E] border-[rgba(34,197,94,0.2)]",
  GENERICO: "bg-[#1A1500] text-[#D4A843] border-[rgba(212,168,67,0.2)]",
  REACONDICIONADO: "bg-[#0A0D1A] text-[#38BDF8] border-[rgba(56,189,248,0.2)]",
};

interface SparePart {
  id: string;
  nombre: string;
  category: string;
  brand: string;
  modelo_compatible: string | null;
  sku: string | null;
  price: number;
  cost: number;
  stock: number;
  stock_minimo: number;
  quality: string;
  proveedor: string | null;
  ubicacion: string | null;
  active: boolean;
  created_at: string;
}

const emptyForm = {
  nombre: "",
  category: "PANTALLA",
  brand: "Apple",
  modelo_compatible: "",
  sku: "",
  price: 0,
  cost: 0,
  stock: 0,
  stock_minimo: 2,
  quality: "GENERICO",
  proveedor: "",
  ubicacion: "",
  active: true,
};

export default function RepuestosPage() {
  const supabase = createClient();
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterQuality, setFilterQuality] = useState("");
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("spare_parts").select("*", { count: "exact" });
      if (searchQuery) query = query.or(`nombre.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%,modelo_compatible.ilike.%${searchQuery}%`);
      if (filterCategory) query = query.eq("category", filterCategory);
      if (filterBrand) query = query.eq("brand", filterBrand);
      if (filterQuality) query = query.eq("quality", filterQuality);
      const { data, count, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      setSpareParts(data || []);
      setTotal(count || 0);
    } catch (err) {
      console.error("Error loading spare parts:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterCategory, filterBrand, filterQuality]);

  useEffect(() => { loadData(); }, [loadData]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (sp: SparePart) => {
    setEditingId(sp.id);
    setForm({
      nombre: sp.nombre,
      category: sp.category,
      brand: sp.brand,
      modelo_compatible: sp.modelo_compatible || "",
      sku: sp.sku || "",
      price: sp.price,
      cost: sp.cost,
      stock: sp.stock,
      stock_minimo: sp.stock_minimo,
      quality: sp.quality,
      proveedor: sp.proveedor || "",
      ubicacion: sp.ubicacion || "",
      active: sp.active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const data = { ...form };
      if (editingId) {
        const { error } = await supabase.from("spare_parts").update(data).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("spare_parts").insert(data);
        if (error) throw error;
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      console.error("Error saving spare part:", err);
      alert(err instanceof Error ? err.message : "Error al guardar");
    }
  };

  const toggleActive = async (sp: SparePart) => {
    try {
      await supabase.from("spare_parts").update({ active: !sp.active }).eq("id", sp.id);
      loadData();
    } catch (err) {
      console.error("Error toggling spare part:", err);
    }
  };

  const uniqueBrands = Array.from(new Set(spareParts.map((sp) => sp.brand))).sort();
  const isLowStock = (sp: SparePart) => sp.stock <= sp.stock_minimo;

  if (loading && spareParts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-[#D4A843]/20 border-t-[#D4A843]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A843] to-[#8B6914]">
              <Wrench className="h-5 w-5 text-[#0A0A0A]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">Repuestos</h1>
              <p className="text-sm text-[#888888]">{total} repuestos en inventario</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}
                className="rounded-xl h-10 px-4 border-0 font-semibold text-[#0A0A0A] bg-gradient-to-br from-[#D4A843] to-[#8B6914] hover:from-[#F0D78C] hover:to-[#D4A843]">
                <Plus className="h-4 w-4 mr-2" /> Agregar Repuesto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Repuesto" : "Nuevo Repuesto"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre del repuesto *</Label>
                  <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Pantalla OLED iPhone 14 Pro" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select value={form.category} onValueChange={(v) => { if (v) setForm({ ...form, category: v }); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Calidad</Label>
                    <Select value={form.quality} onValueChange={(v) => { if (v) setForm({ ...form, quality: v }); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {QUALITIES.map((q) => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Marca</Label>
                    <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Apple" />
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo Compatible</Label>
                    <Input value={form.modelo_compatible} onChange={(e) => setForm({ ...form, modelo_compatible: e.target.value })} placeholder="iPhone 14 Pro" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Precio Venta (COP)</Label>
                    <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })} placeholder="350000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Costo (COP)</Label>
                    <Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: parseInt(e.target.value) || 0 })} placeholder="180000" />
                  </div>
                  <div className="space-y-2">
                    <Label>SKU</Label>
                    <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="IOS-PAN-14PRO-001" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Stock</Label>
                    <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Stock Mínimo</Label>
                    <Input type="number" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: parseInt(e.target.value) || 2 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ubicación</Label>
                    <Input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} placeholder="Estante A-3" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Proveedor</Label>
                  <Input value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} placeholder="iParts Colombia" />
                </div>
                <Button onClick={handleSubmit} className="w-full rounded-xl h-10 font-semibold text-[#0A0A0A] bg-gradient-to-br from-[#D4A843] to-[#8B6914] hover:from-[#F0D78C] hover:to-[#D4A843]">
                  {editingId ? "Guardar Cambios" : "Crear Repuesto"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <div className="rounded-2xl bg-[#111111] border border-[rgba(212,168,67,0.12)] p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555555]" />
                <Input placeholder="Buscar repuesto, marca, modelo..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl" />
              </div>
              <Select value={filterCategory || "ALL"} onValueChange={(v) => { if (v) setFilterCategory(v === "ALL" ? "" : v); }}>
                <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Categoría" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterBrand || "ALL"} onValueChange={(v) => { if (v) setFilterBrand(v === "ALL" ? "" : v); }}>
                <SelectTrigger className="w-[140px] rounded-xl"><SelectValue placeholder="Marca" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {uniqueBrands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterQuality || "ALL"} onValueChange={(v) => { if (v) setFilterQuality(v === "ALL" ? "" : v); }}>
                <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Calidad" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {QUALITIES.map((q) => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <div className="rounded-2xl bg-[#111111] border border-[rgba(212,168,67,0.12)] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#0D0D0D] border-b border-[rgba(212,168,67,0.08)] hover:bg-[#0D0D0D]">
                <TableHead className="text-[#D4A843] font-semibold">Repuesto</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Categoría</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Calidad</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Compatible</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Precio</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Stock</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Ubicación</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Estado</TableHead>
                <TableHead className="text-[#D4A843] font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {spareParts.map((sp, i) => (
                  <motion.tr key={sp.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="border-b border-[rgba(212,168,67,0.05)] last:border-0 hover:bg-[rgba(212,168,67,0.05)] transition-colors">
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm text-[#FAFAFA]">{sp.nombre}</p>
                        <p className="text-xs text-[#555555]">{sp.brand} • {sp.sku || "Sin SKU"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`border-0 ${CATEGORY_COLORS[sp.category] || "bg-[#0D0D0D] text-[#888888]"} text-[10px] font-medium rounded-lg`}>
                        {CATEGORIES.find((c) => c.value === sp.category)?.label || sp.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`border-0 ${QUALITY_COLORS[sp.quality] || "bg-[#0D0D0D] text-[#888888]"} text-[10px] font-medium rounded-lg`}>
                        {QUALITIES.find((q) => q.value === sp.quality)?.label || sp.quality}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-[#888888]">{sp.modelo_compatible || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm text-[#D4A843]">{formatCOP(sp.price)}</p>
                        {sp.cost ? <p className="text-xs text-[#22C55E]">Margen: {formatCOP(sp.price - sp.cost)}</p> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {isLowStock(sp) && <AlertTriangle className="h-3.5 w-3.5 text-[#D4A843]" />}
                        <span className={`text-sm font-medium ${isLowStock(sp) ? "text-[#D4A843]" : "text-[#FAFAFA]"}`}>
                          {sp.stock}
                        </span>
                        <span className="text-xs text-[#555555]">/mín {sp.stock_minimo}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-[#888888]">{sp.ubicacion || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`border-0 ${sp.active ? "bg-[#0A1A0A] text-[#22C55E]" : "bg-[#1A0A0A] text-[#EF4444]"} text-[10px] font-medium rounded-lg`}>
                        {sp.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(sp)} className="p-1.5 rounded-lg hover:bg-[rgba(212,168,67,0.1)] text-[#888888] hover:text-[#D4A843] transition-colors">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => toggleActive(sp)} className="p-1.5 rounded-lg hover:bg-[rgba(212,168,67,0.1)] text-[#888888] hover:text-[#D4A843] transition-colors">
                          {sp.active ? <ToggleRight className="h-4 w-4 text-[#22C55E]" /> : <ToggleLeft className="h-4 w-4 text-[#EF4444]" />}
                        </button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
          {spareParts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-[#555555]">
              <Package className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No hay repuestos registrados</p>
              <p className="text-xs">Agrega el primer repuesto al inventario</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
