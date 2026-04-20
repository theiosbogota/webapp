"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Shield, Truck, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

const ScrollFrames = dynamic(
  () => import("@/components/3d/scroll-frames").then((mod) => mod.ScrollFrames),
  { ssr: false }
);

interface Star {
  id: number;
  width: number;
  height: number;
  top: number;
  left: number;
  opacity: number;
  duration: number;
  delay: number;
}

export function HeroSection() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const generated: Star[] = Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      width: Math.random() * 2 + 1,
      height: Math.random() * 2 + 1,
      top: Math.random() * 100,
      left: Math.random() * 100,
      opacity: Math.random() * 0.7 + 0.1,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 5,
    }));
    setStars(generated);
  }, []);

  return (
    <section className="relative overflow-hidden min-h-[90vh] flex items-center">
      {/* Scroll-driven video — fixed, visible across entire page */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <ScrollFrames
          frameCount={226}
          framePath="https://obegtwoxdjxntkbhxmxc.supabase.co/storage/v1/object/public/frames/frame_"
          className="absolute inset-0 w-full h-full"
        />
        {/* Dark overlay — gives prominence to content */}
        <div className="absolute inset-0 video-overlay" />
        {/* Gold gradient tint from bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--gold-dark)/0.3)] via-transparent to-transparent" />
      </div>

      {/* Starfield background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--gold-glow)/0.08)_0%,_transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        {stars.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full bg-gold"
            style={{
              width: s.width + "px",
              height: s.height + "px",
              top: s.top + "%",
              left: s.left + "%",
              opacity: s.opacity,
              animation: `gold-pulse ${s.duration}s ease-in-out infinite`,
              animationDelay: s.delay + "s",
            }}
          />
        ))}
      </div>

      {/* Moon glow — bottom right (CSS fallback) */}
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gold/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-gold/10 blur-2xl pointer-events-none" />

      {/* Shockwave ring animation (CSS fallback) */}
      <div className="absolute bottom-20 right-10 md:right-32 pointer-events-none">
        <div className="w-32 h-32 rounded-full border border-gold/20 animate-shockwave" />
        <div className="absolute inset-0 w-32 h-32 rounded-full border border-gold/10 animate-shockwave [animation-delay:0.5s]" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 lg:py-32 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge — Gold gradient accent */}
          <div className="inline-flex items-center gap-2 bg-gold-gradient-subtle text-gold border border-gold/30 rounded-full px-5 py-2 text-sm font-medium gold-glow-text">
            <Zap className="h-4 w-4" />
            Productos Apple en Bogotá
          </div>

          {/* Heading — Gold gradient accent */}
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight">
            Tu próximo{" "}
            <span className="text-gold-gradient gold-glow-text">
              iPhone
            </span>{" "}
            te espera
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Compra y vende productos Apple nuevos y usados con total confianza.
            Verificación de calidad, garantía en cada producto y envío seguro a
            toda Bogotá.
          </p>

          {/* CTAs — Gold primary + outline */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-8 h-12 bg-gold text-gold-foreground hover:bg-gold/90 gold-glow-pulse" asChild>
              <Link href="/productos">
                Explorar catálogo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 h-12 border-gold/30 text-gold hover:bg-gold/10"
              asChild
            >
              <Link href="/vender">Vender mi iPhone</Link>
            </Button>
          </div>

          {/* Trust indicators — dark glass cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 max-w-3xl mx-auto">
            {[
              {
                icon: Shield,
                label: "Garantía",
                desc: "En todos los productos",
              },
              {
                icon: Truck,
                label: "Envío gratis",
                desc: "En compras +$500K",
              },
              {
                icon: Star,
                label: "Verificados",
                desc: "Vendedores confiables",
              },
              {
                icon: Zap,
                label: "Entrega rápida",
                desc: "24-48 horas en Bogotá",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="card-3d flex flex-col items-center gap-2 p-4 rounded-xl bg-card/30 border border-gold/10 backdrop-blur-md"
              >
                <div className="bg-gold/15 rounded-lg p-2 gold-glow">
                  <item.icon className="h-5 w-5 text-gold" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
