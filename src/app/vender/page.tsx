import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Vender iPhone",
  description: "Vende tu iPhone en IOSBogotá. Publica gratis, llega a miles de compradores en Bogotá y recibe pagos seguros.",
};
import {
  ArrowRight,
  BarChart3,
  DollarSign,
  ShieldCheck,
  Store,
  Truck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const benefits = [
  {
    icon: Users,
    title: "Miles de compradores",
    description: "Accede a una audiencia activa de compradores de iPhones en Bogotá.",
  },
  {
    icon: ShieldCheck,
    title: "Transacciones seguras",
    description: "Pagos protegidos y verificación de identidad para todos los usuarios.",
  },
  {
    icon: DollarSign,
    title: "Comisiones competitivas",
    description: "Solo cobramos una pequeña comisión por venta completada.",
  },
  {
    icon: BarChart3,
    title: "Panel de vendedor",
    description: "Dashboard completo para gestionar productos, pedidos e ingresos.",
  },
  {
    icon: Truck,
    title: "Logística integrada",
    description: "Te ayudamos con el envío y tracking de tus productos.",
  },
  {
    icon: Store,
    title: "Tu propia tienda",
    description: "Crea tu tienda personalizada con tu marca y productos.",
  },
];

export default function VenderPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Vende tus iPhones en IOSBogotá
            </h1>
            <p className="text-lg text-primary-foreground/80 mb-8">
              Abre tu tienda en el marketplace #1 de iPhones en Bogotá. Llega a
              miles de compradores y gestiona tus ventas fácilmente.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" className="text-base" asChild>
                <Link href="/auth/register?role=seller">
                  Crear mi tienda
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
              >
                Conocer más
              </Button>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">¿Por qué vender con nosotros?</h2>
              <p className="text-muted-foreground mt-2">
                Todo lo que necesitas para vender tus iPhones de forma profesional
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((benefit) => (
                <Card key={benefit.title} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6 space-y-3">
                    <div className="bg-primary/10 rounded-lg p-3 w-fit">
                      <benefit.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">{benefit.title}</h3>
                    <p className="text-muted-foreground text-sm">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <h2 className="text-3xl font-bold mb-4">
              ¿Listo para empezar a vender?
            </h2>
            <p className="text-muted-foreground mb-8">
              Crea tu cuenta de vendedor en minutos y empieza a publicar tus
              iPhones hoy mismo.
            </p>
            <Button size="lg" className="text-base" asChild>
              <Link href="/auth/register?role=seller">
                Registrarme como vendedor
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
