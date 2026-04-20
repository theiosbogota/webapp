"use client";

import { useEffect, useState } from "react";
import { Loader2, Store, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface StoreData {
  id: string;
  name: string;
  slug: string;
  description: string;
  rating: number;
  total_sales: number;
  verified: boolean;
  active: boolean;
  created_at: string;
}

export default function TiendaPage() {
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadStore() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (data) setStore(data);
      setLoading(false);
    }
    loadStore();
  }, []);

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  async function handleCreateStore(formData: FormData) {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!name || name.length < 3) {
      setError("El nombre debe tener al menos 3 caracteres");
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update profile role to seller
    await supabase
      .from("profiles")
      .update({ role: "seller" })
      .eq("id", user.id);

    const slug = generateSlug(name) + "-" + Date.now().toString(36);

    const { data, error: insertError } = await supabase
      .from("stores")
      .insert({
        owner_id: user.id,
        name,
        slug,
        description: description || null,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setStore(data);
    setSuccess(true);
    setSaving(false);
  }

  async function handleUpdateStore(formData: FormData) {
    if (!store) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("stores")
      .update({ name, description: description || null })
      .eq("id", store.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setStore({ ...store, name, description });
      setSuccess(true);
    }
    setSaving(false);
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
        <h1 className="text-2xl font-bold">Mi Tienda</h1>
        <p className="text-muted-foreground">
          {store ? "Administra la información de tu tienda" : "Crea tu tienda para empezar a vender"}
        </p>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              {store ? "Editar tienda" : "Crear tienda"}
            </CardTitle>
            <CardDescription>
              {store
                ? "Actualiza los datos de tu tienda"
                : "Completa los datos para crear tu tienda y empezar a publicar productos"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={store ? handleUpdateStore : handleCreateStore} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {store ? "Tienda actualizada correctamente" : "Tienda creada correctamente"}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la tienda</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ej: iPhone Store Bogotá"
                  defaultValue={store?.name || ""}
                  required
                  minLength={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe tu tienda, qué productos ofreces, tu experiencia..."
                  defaultValue={store?.description || ""}
                  rows={4}
                />
              </div>

              {store && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estado:</span>
                    <span className={store.active ? "text-green-600 font-medium" : "text-red-600"}>
                      {store.active ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Verificada:</span>
                    <span>{store.verified ? "Sí ✓" : "Pendiente"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ventas:</span>
                    <span>{store.total_sales}</span>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {store ? "Guardar cambios" : "Crear tienda"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
