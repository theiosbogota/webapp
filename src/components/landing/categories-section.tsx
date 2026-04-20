"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { Smartphone, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCategories } from "@/lib/supabase/queries";
import { mockCategories } from "@/lib/mock-data";
import type { Category } from "@/types";

export function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    getCategories().then((data) => {
      if (data.length > 0) setCategories(data.slice(0, 6));
    });
  }, []);

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
    <section ref={sectionRef} className="py-16 bg-card/30 relative overflow-hidden">
      {/* Scroll-driven video background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          poster="/images/categories-cover.png"
          className="w-full h-full object-cover"
        >
          <source src="/videos/categories-orbit.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 video-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--gold-dark)/0.15)] via-transparent to-[hsl(var(--gold-dark)/0.15)]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">
              Explora por <span className="text-gold">modelo</span>
            </h2>
            <p className="text-muted-foreground mt-1">
              Encuentra el iPhone perfecto para ti
            </p>
          </div>
          <Button variant="ghost" className="hidden md:flex text-gold hover:text-gold/80 hover:bg-gold/10" asChild>
            <Link href="/categorias">
              Ver todos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Link key={category.id} href={`/categorias/${category.slug}`}>
              <Card className="card-3d group border-border/50 bg-card/50 backdrop-blur-sm cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="bg-gold/10 rounded-2xl p-4 group-hover:bg-gold/20 transition-colors">
                    <Smartphone className="h-8 w-8 text-gold" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{category.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {category.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-6 text-center md:hidden">
          <Button variant="outline" className="border-gold/30 text-gold hover:bg-gold/10" asChild>
            <Link href="/categorias">
              Ver todas las categorías
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
