"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/products/product-card";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/types";

export function FeaturedProducts() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("products")
      .select("*, store:stores(*), category:categories(*)")
      .eq("active", true)
      .eq("featured", true)
      .limit(4)
      .then(({ data }) => {
        if (data && data.length > 0) setFeatured(data as Product[]);
      });
  }, []);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Scroll-driven video
  useEffect(() => {
    const handleScroll = () => {
      const video = videoRef.current;
      const section = sectionRef.current;
      if (!video || !video.duration || !section) return;

      const rect = section.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const progress = Math.min(
        Math.max((windowHeight - rect.top) / (windowHeight + rect.height), 0),
        1
      );
      video.currentTime = progress * video.duration;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section ref={sectionRef} className="py-16 relative overflow-hidden">
      {/* Scroll-driven video background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          poster="/images/products-cover.png"
          className="w-full h-full object-cover"
        >
          <source src="/videos/products-float.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 video-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(var(--gold-dark)/0.1)] to-transparent" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">
              Productos <span className="text-gold">destacados</span>
            </h2>
            <p className="text-muted-foreground mt-1">
              Los iPhones más populares del momento
            </p>
          </div>
          <Button variant="ghost" className="hidden md:flex text-gold hover:text-gold/80 hover:bg-gold/10" asChild>
            <Link href="/productos">
              Ver todos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Button variant="outline" className="border-gold/30 text-gold hover:bg-gold/10" asChild>
            <Link href="/productos">
              Ver todos los productos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
