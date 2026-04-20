"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/upload/image-upload";
import { IPHONE_MODELS, STORAGE_OPTIONS, CONDITION_LABELS } from "@/lib/constants";
import type { Category } from "@/types";

export default function NuevoProductoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([""]);

  // Form state
  const [model, setModel] = useState("");
  const [condition, setCondition] = useState("");
  const [storage, setStorage] = useState("");
  const [categoryId, setCategoryId] = useState("");

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

      if (store) {
        setStoreId(store.id);
      }

      const { data: cats } = await supabase
        .from("categories")
        .select("*")
        .order("order");

      setCategories(cats || []);
      setLoading(false);
    }
    load();
  }, []);

  function generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
      "-" +
      Date.now().toString(36)
    );
  }

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const color = formData.get("color") as string;
    const price = parseFloat(formData.get("price") as string);
    const compareAtPrice = formData.get("compare_at_price") as string;
    const stock = parseInt(formData.get("stock") as string);

    if (!name || !model || !condition || !storage || !color || !price || !stock) {
      setError("Todos los campos obligatorios deben estar completos");
      setSaving(false);
      return;
    }

    if (price <= 0) {
      setError("El precio debe ser mayor a 0");
      setSaving(false);
      return;
    }

    const images = imageUrls.filter((url) => url.trim() !== "");

    const supabase = createClient();
    const slug = generateSlug(name);

    const { error: insertError } = await supabase.from("products").insert({
      store_id: storeId,
      category_id: categoryId || null,
      name,
      slug,
      description: description || "",
      model,
      condition,
      storage,
      color,
      price,
      compare_at_price: compareAtPrice ? parseFloat(compareAtPrice) : null,
      stock,
      images,
      active: true,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    router.push("/dashboard/productos");
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
        <p className="text-muted-foreground mb-4">
          Necesitas una tienda para publicar productos
        </p>
        <Button asChild>
          <Link href="/dashboard/tienda">Crear tienda</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/productos">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a productos
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Publicar Producto</h1>
        <p className="text-muted-foreground">Agrega un nuevo iPhone a tu tienda</p>
      </div>

      <form action={handleSubmit} className="space-y-6 max-w-3xl">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        {/* Basic info */}
        <Card>
          <CardHeader>
            <CardTitle>Información básica</CardTitle>
            <CardDescription>Datos principales del producto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del producto *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ej: iPhone 15 Pro Max 256GB Titanio Natural"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modelo *</Label>
                <Select value={model} onValueChange={setModel} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {IPHONE_MODELS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Condición *</Label>
                <Select value={condition} onValueChange={setCondition} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Condición" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONDITION_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Almacenamiento *</Label>
                <Select value={storage} onValueChange={setStorage} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Almacenamiento" />
                  </SelectTrigger>
                  <SelectContent>
                    {STORAGE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color *</Label>
                <Input
                  id="color"
                  name="color"
                  placeholder="Ej: Titanio Natural"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe el estado del producto, accesorios incluidos, batería, etc."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Precio y stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Precio (COP) *</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  placeholder="2500000"
                  min="1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compare_at_price">Precio anterior (COP)</Label>
                <Input
                  id="compare_at_price"
                  name="compare_at_price"
                  type="number"
                  placeholder="3000000"
                  min="0"
                />
                <p className="text-xs text-muted-foreground">Opcional, para mostrar descuento</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock *</Label>
                <Input
                  id="stock"
                  name="stock"
                  type="number"
                  placeholder="1"
                  min="0"
                  defaultValue="1"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Imágenes</CardTitle>
            <CardDescription>
              Sube fotos del producto o pega URLs de imágenes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUpload
              images={imageUrls.filter((u) => u.trim() !== "")}
              onChange={(urls) => setImageUrls(urls.length > 0 ? urls : [""])}
              maxImages={5}
            />
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">O pega una URL de imagen</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://ejemplo.com/imagen.jpg"
                  id="manual-url"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const input = document.getElementById("manual-url") as HTMLInputElement;
                    const url = input?.value.trim();
                    if (url) {
                      const current = imageUrls.filter((u) => u.trim() !== "");
                      if (current.length < 5) {
                        setImageUrls([...current, url]);
                        input.value = "";
                      }
                    }
                  }}
                >
                  Agregar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button type="submit" size="lg" disabled={saving} className="flex-1">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publicar producto
          </Button>
          <Button type="button" variant="outline" size="lg" asChild>
            <Link href="/dashboard/productos">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
