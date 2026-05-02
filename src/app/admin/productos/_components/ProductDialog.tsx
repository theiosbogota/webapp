"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Plus, Trash2, Image as ImageIcon, DollarSign, Package, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { IPHONE_MODELS, STORAGE_OPTIONS, CONDITION_LABELS } from "@/lib/constants";

const DEFAULT_STORE_ID = "be7cd81b-67fe-48dd-a831-3b8f2c8f1c8c"; // TheIOSBogotá

export interface ProductFull {
  id?: string;
  store_id: string;
  name: string;
  slug: string;
  description: string;
  model: string;
  condition: string;
  storage: string;
  color: string;
  price: number;
  compare_at_price: number | null;
  cost_price: number;
  stock: number;
  images: string[];
  featured: boolean;
  active: boolean;
  purchase_notes?: string | null;
  last_purchased_at?: string | null;
  imeis?: string | null;
  supplier?: string | null;
}

interface Props {
  open: boolean;
  product: ProductFull | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY: ProductFull = {
  store_id: DEFAULT_STORE_ID,
  name: "",
  slug: "",
  description: "",
  model: "iPhone 16",
  condition: "excelente",
  storage: "128GB",
  color: "negro",
  price: 0,
  compare_at_price: null,
  cost_price: 0,
  stock: 1,
  images: [],
  featured: false,
  active: true,
  purchase_notes: "",
  last_purchased_at: null,
  imeis: "",
  supplier: "",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ProductDialog({ open, product, onClose, onSaved }: Props) {
  const [form, setForm] = useState<ProductFull>(EMPTY);
  const [imageText, setImageText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const isEdit = !!product?.id;

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
    setError(null);
    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `${form.slug || slugify(form.name) || "producto"}-${Date.now()}.${fileExt}`;
      const path = `products/uploads/${fileName}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      const newUrl = data.publicUrl;
      // Append to imageText
      setImageText((prev) => prev ? prev + "\n" + newUrl : newUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir imagen");
    } finally {
      setUploadingImage(false);
    }
  }

  useEffect(() => {
    if (open) {
      const p = product || EMPTY;
      setForm(p);
      setImageText((p.images || []).join("\n"));
      setError(null);
    }
  }, [open, product]);

  function update<K extends keyof ProductFull>(k: K, v: ProductFull[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const images = imageText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const slug = form.slug.trim() || slugify(form.name);
      if (!slug) throw new Error("El slug no puede estar vacío");
      if (!form.name.trim()) throw new Error("El nombre es obligatorio");
      if (form.price <= 0) throw new Error("El precio de venta debe ser mayor a 0");

      const payload: Partial<ProductFull> = {
        store_id: form.store_id || DEFAULT_STORE_ID,
        name: form.name.trim(),
        slug,
        description: form.description || "",
        model: form.model,
        condition: form.condition,
        storage: form.storage,
        color: form.color.trim().toLowerCase(),
        price: Number(form.price),
        compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
        cost_price: Number(form.cost_price) || 0,
        stock: Number(form.stock) || 0,
        images,
        featured: !!form.featured,
        active: !!form.active,
        purchase_notes: form.purchase_notes || null,
        last_purchased_at: form.last_purchased_at || null,
        imeis: form.imeis || null,
        supplier: form.supplier || null,
      };

      if (isEdit && product?.id) {
        const res = await fetch('/api/admin/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: [{ id: product.id, ...payload }] }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Update failed'); }
      } else {
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product: payload }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Insert failed'); }
      }
      onSaved();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const profit = (Number(form.price) || 0) - (Number(form.cost_price) || 0);
  const margin = form.cost_price > 0 ? Math.round((profit / form.cost_price) * 100) : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
          className="w-full max-w-3xl my-8 rounded-2xl border border-[rgba(212,168,67,0.2)] bg-[#0A0A0A] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[rgba(212,168,67,0.1)] px-5 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#D4A843] to-[#8B6914]">
                {isEdit ? <Sparkles className="h-4 w-4 text-black" /> : <Plus className="h-4 w-4 text-black" />}
              </div>
              <h2 className="text-lg font-bold text-[#FAFAFA]">
                {isEdit ? "Editar producto" : "Nuevo producto"}
              </h2>
            </div>
            <button onClick={onClose} className="text-[#888] hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Identidad */}
            <Section title="Identidad" icon={<Package className="h-3.5 w-3.5" />}>
              <Field label="Nombre" required>
                <input value={form.name} onChange={(e) => update("name", e.target.value)}
                  className={inputCls} placeholder="iPhone 16 Pro 256GB Titanio Negro" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Slug (URL)" hint="Auto si lo dejas vacío">
                  <input value={form.slug} onChange={(e) => update("slug", e.target.value)}
                    className={inputCls} placeholder="iphone-16-pro-256gb-negro" />
                </Field>
                <Field label="Modelo" required>
                  <select value={form.model} onChange={(e) => update("model", e.target.value)} className={inputCls}>
                    {IPHONE_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Color">
                  <input value={form.color} onChange={(e) => update("color", e.target.value)}
                    className={inputCls} placeholder="negro" />
                </Field>
                <Field label="Almacenamiento">
                  <select value={form.storage} onChange={(e) => update("storage", e.target.value)} className={inputCls}>
                    {STORAGE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Condición">
                  <select value={form.condition} onChange={(e) => update("condition", e.target.value)} className={inputCls}>
                    {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Descripción">
                <textarea value={form.description} onChange={(e) => update("description", e.target.value)}
                  rows={2} className={inputCls + " resize-y"} placeholder="iPhone 16 Pro de 256GB en titanio negro, con caja, cargador y garantía..." />
              </Field>
            </Section>

            {/* Finanzas */}
            <Section title="Finanzas" icon={<DollarSign className="h-3.5 w-3.5" />}>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Precio compra (COP)" hint="Lo que pagaste tú">
                  <input type="number" value={form.cost_price || ""} onChange={(e) => update("cost_price", Number(e.target.value) || 0)}
                    className={inputCls} placeholder="0" />
                </Field>
                <Field label="Precio venta (COP)" required hint="Precio público">
                  <input type="number" value={form.price || ""} onChange={(e) => update("price", Number(e.target.value) || 0)}
                    className={inputCls} placeholder="0" />
                </Field>
                <Field label="Precio antes (tachado)" hint="Opcional">
                  <input type="number" value={form.compare_at_price || ""} onChange={(e) => update("compare_at_price", Number(e.target.value) || null)}
                    className={inputCls} placeholder="0" />
                </Field>
              </div>
              {form.cost_price > 0 && (
                <div className="rounded-lg border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.05)] px-3 py-2 text-xs">
                  <span className="text-[#888]">Ganancia por unidad: </span>
                  <span className={`font-bold ${profit > 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                    ${profit.toLocaleString("es-CO")}
                  </span>
                  <span className="text-[#888] ml-2">· Margen: </span>
                  <span className={`font-bold ${margin > 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                    {margin}%
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fecha de compra" hint="Cuándo lo adquiriste">
                  <input type="date" value={form.last_purchased_at?.split("T")[0] || ""}
                    onChange={(e) => update("last_purchased_at", e.target.value || null)}
                    className={inputCls} />
                </Field>
                <Field label="Stock">
                  <input type="number" value={form.stock || 0} onChange={(e) => update("stock", Number(e.target.value) || 0)}
                    className={inputCls} placeholder="0" />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Proveedor habitual" hint="Para reportes">
                  <input value={form.supplier || ""} onChange={(e) => update("supplier", e.target.value)}
                    className={inputCls} placeholder="Juan Pérez · WhatsApp" />
                </Field>
                <Field label="Notas de compra" hint="Batería, accesorios, etc.">
                  <input value={form.purchase_notes || ""} onChange={(e) => update("purchase_notes", e.target.value)}
                    className={inputCls} placeholder="Batería 92%, caja sellada, garantía..." />
                </Field>
              </div>
              <Field label="IMEIs / Seriales en stock" hint="Uno por línea — se trackea cada unidad individual">
                <textarea value={form.imeis || ""} onChange={(e) => update("imeis", e.target.value)}
                  rows={2} className={inputCls + " resize-y font-mono text-[11px]"}
                  placeholder="354820112345678&#10;354820112345679" />
              </Field>
            </Section>

            {/* Imágenes */}
            <Section title="Imágenes" icon={<ImageIcon className="h-3.5 w-3.5" />}>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                      e.target.value = "";
                    }} />
                  <span className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors ${
                    uploadingImage ? "bg-[#333] text-[#888]" : "bg-[#22C55E] hover:bg-[#16A34A] text-white"
                  }`}>
                    {uploadingImage ? "Subiendo..." : <><ImageIcon className="h-3.5 w-3.5" />Subir imagen</>}
                  </span>
                </label>
                <span className="text-[10px] text-[#555]">o pega URLs abajo</span>
              </div>
              <Field label="URLs de imágenes (una por línea)">
                <textarea value={imageText} onChange={(e) => setImageText(e.target.value)}
                  rows={3} className={inputCls + " resize-y font-mono text-[11px]"}
                  placeholder="https://obegtwoxdjxntkbhxmxc.supabase.co/storage/.../iphone-16-pro-titanio-negro.webp?v=fix6" />
              </Field>
              {imageText.split("\n").filter((l) => l.trim()).length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {imageText.split("\n").filter((l) => l.trim()).slice(0, 6).map((url, i) => (
                    <img key={i} src={url.trim()} alt="" className="h-14 w-14 rounded-md object-contain bg-[#0D0D0D] p-1 border border-[rgba(212,168,67,0.1)]"
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                  ))}
                </div>
              )}
            </Section>

            {/* Visibilidad */}
            <Section title="Visibilidad" icon={<Sparkles className="h-3.5 w-3.5" />}>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-[#FAFAFA]">
                  <input type="checkbox" checked={form.active} onChange={(e) => update("active", e.target.checked)}
                    className="h-4 w-4 rounded border-[#333] bg-[#0D0D0D] text-[#D4A843] focus:ring-[#D4A843]" />
                  Activo (visible en catálogo)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-[#FAFAFA]">
                  <input type="checkbox" checked={form.featured} onChange={(e) => update("featured", e.target.checked)}
                    className="h-4 w-4 rounded border-[#333] bg-[#0D0D0D] text-[#D4A843] focus:ring-[#D4A843]" />
                  Destacado (home/banners)
                </label>
              </div>
            </Section>

            {error && (
              <div className="rounded-lg border border-[#EF4444]/30 bg-[rgba(239,68,68,0.05)] px-3 py-2 text-sm text-[#EF4444]">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-[rgba(212,168,67,0.1)] px-5 py-3">
            <Button variant="ghost" onClick={onClose} className="text-[#888] hover:text-white">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}
              className="bg-[#D4A843] hover:bg-[#F0D78C] text-black">
              {saving ? "Guardando..." : isEdit ? <><Save className="h-4 w-4 mr-1" />Guardar cambios</> : <><Plus className="h-4 w-4 mr-1" />Crear producto</>}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const inputCls = "w-full h-9 rounded-lg border border-[rgba(212,168,67,0.12)] bg-[#0D0D0D] px-3 text-sm text-[#FAFAFA] placeholder:text-[#444] focus:outline-none focus:border-[#D4A843]/50";

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-medium text-[#888] uppercase tracking-wide">
          {label} {required && <span className="text-[#EF4444]">*</span>}
        </label>
        {hint && <span className="text-[10px] text-[#555]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-bold text-[#D4A843] uppercase tracking-wide mb-2">
        {icon}
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// Confirm delete dialog
export function DeleteConfirmDialog({ open, productName, onConfirm, onCancel }: {
  open: boolean; productName: string; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
          className="w-full max-w-sm rounded-2xl border border-[#EF4444]/30 bg-[#0A0A0A] p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(239,68,68,0.1)]">
              <Trash2 className="h-5 w-5 text-[#EF4444]" />
            </div>
            <h3 className="text-lg font-bold text-[#FAFAFA]">Eliminar producto</h3>
          </div>
          <p className="text-sm text-[#bbb] mb-4">
            ¿Seguro que quieres eliminar <span className="font-bold text-[#FAFAFA]">{productName}</span>?
          </p>
          <p className="text-xs text-[#888] mb-5">
            Se ocultará del catálogo pero conservará el histórico de ventas.
            Puedes restaurarlo después si necesitas.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={onCancel} className="text-[#888] hover:text-white">Cancelar</Button>
            <Button onClick={onConfirm} className="bg-[#EF4444] hover:bg-[#DC2626] text-white">
              <Trash2 className="h-4 w-4 mr-1" />Eliminar
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
