"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getCategories } from "@/lib/supabase/queries";
import { mockCategories } from "@/lib/mock-data";
import type { Category } from "@/types";

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>(mockCategories);

  useEffect(() => {
    getCategories().then((data) => {
      if (data.length > 0) setCategories(data);
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Categorías</h1>
            <p className="text-muted-foreground mt-1">
              Explora iPhones por modelo
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link key={category.id} href={`/categorias/${category.slug}`}>
                <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
                  <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
                      <Smartphone className="h-12 w-12 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {category.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {category.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
