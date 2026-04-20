"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/products/product-card";
import { mockProducts } from "@/lib/mock-data";

export function LatestProducts() {
  const latest = mockProducts.slice(0, 4);

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-5 w-5 text-gold" />
              <h2 className="text-2xl md:text-3xl font-bold">
                Recién <span className="text-gold">llegados</span>
              </h2>
            </div>
            <p className="text-muted-foreground">
              Los últimos iPhones agregados al marketplace
            </p>
          </div>
          <Button variant="ghost" className="hidden md:flex text-gold hover:text-gold/80 hover:bg-gold/10" asChild>
            <Link href="/productos?sort=newest">
              Ver todos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {latest.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
