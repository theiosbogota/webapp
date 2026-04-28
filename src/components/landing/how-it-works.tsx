"use client";

import { useEffect, useRef } from "react";
import { Search, ShieldCheck, CreditCard, Truck } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Encuentra tu iPhone",
    description:
      "Explora nuestro catálogo con filtros por modelo, precio, estado y almacenamiento.",
  },
  {
    icon: ShieldCheck,
    title: "Compra con confianza",
    description:
      "Todos los productos son verificados. Vendedores calificados y garantía incluida.",
  },
  {
    icon: CreditCard,
    title: "Paga seguro",
    description:
      "Paga con tarjeta, PSE, Nequi o Daviplata. Transacciones 100% seguras.",
  },
  {
    icon: Truck,
    title: "Recibe en tu puerta",
    description:
      "Envío rápido a toda Bogotá. Tracking en tiempo real de tu pedido.",
  },
];

export function HowItWorks() {
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
    <section ref={sectionRef} className="py-16 bg-card/30 relative overflow-hidden">
      {/* Scroll-driven video background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          poster="/images/howitworks-cover.png"
          className="w-full h-full object-cover"
        >
          <source src="/videos/howitworks-transmit.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 video-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--gold-dark)/0.15)] via-transparent to-[hsl(var(--gold-dark)/0.15)]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold">¿Cómo <span className="text-gold">funciona</span>?</h2>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Comprar tu iPhone en TheIOSBogotá es fácil, rápido y seguro
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.title} className="relative text-center group">
              {/* Gold connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-gold/40 to-gold/10" />
              )}

              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="bg-gold text-gold-foreground rounded-2xl p-4 shadow-lg group-hover:scale-110 transition-transform gold-glow">
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="bg-gold/20 text-gold border border-gold/30 rounded-full h-7 w-7 flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <h3 className="font-semibold text-lg">{step.title}</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
