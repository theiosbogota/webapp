"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  const sectionRef = useRef<HTMLElement>(null);
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
          poster="/images/cta-cover.png"
          className="w-full h-full object-cover"
        >
          <source src="/videos/cta-gravity.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 video-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--gold-dark)/0.2)] via-transparent to-[hsl(var(--gold-dark)/0.2)]" />
      </div>

      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--gold-glow)/0.03)_0%,_transparent_70%)]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-2 gap-6">
          {/* CTA Comprar — Black card with gold */}
          <div className="relative overflow-hidden rounded-2xl bg-foreground text-background p-8 md:p-12">
            <div className="relative z-10 space-y-4">
              <h3 className="text-2xl md:text-3xl font-bold">
                ¿Buscas un iPhone?
              </h3>
              <p className="text-background/60 max-w-sm">
                Encuentra los mejores precios en productos Apple nuevos y usados.
                Garantía y envío incluido.
              </p>
              <Button
                size="lg"
                className="mt-4 bg-gold text-gold-foreground hover:bg-gold/90 gold-glow-pulse"
                asChild
              >
                <Link href="/productos">
                  Explorar catálogo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            {/* Moon glow decoration */}
            <div className="absolute -right-8 -bottom-8 opacity-10">
              <div className="h-48 w-48 rounded-full bg-gold" />
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5">
              <div className="h-64 w-64 rounded-full bg-gold blur-xl" />
            </div>
          </div>

          {/* CTA Vender — Glass card with gold accents */}
          <div className="relative overflow-hidden rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm p-8 md:p-12">
            <div className="relative z-10 space-y-4">
              <div className="bg-gold/10 rounded-lg p-2 w-fit">
                <Store className="h-6 w-6 text-gold" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold">
                ¿Quieres <span className="text-gold">vender</span>?
              </h3>
              <p className="text-muted-foreground max-w-sm">
                Abre tu tienda en IOSBogotá y llega a miles de compradores.
                Comisiones competitivas.
              </p>
              <Button size="lg" className="mt-4 bg-foreground text-background hover:bg-foreground/90" asChild>
                <Link href="/vender">
                  Empezar a vender
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="absolute -right-8 -bottom-8 opacity-5">
              <div className="h-48 w-48 rounded-full bg-gold blur-xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
