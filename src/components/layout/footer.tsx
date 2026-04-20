import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SITE_NAME } from "@/lib/constants";

const footerLinks = {
  comprar: [
    { label: "Todos los iPhones", href: "/productos" },
    { label: "iPhone 16", href: "/categorias/iphone-16" },
    { label: "iPhone 15", href: "/categorias/iphone-15" },
    { label: "iPhone 14", href: "/categorias/iphone-14" },
    { label: "Ofertas", href: "/productos?sort=discount" },
  ],
  vender: [
    { label: "Vende tu iPhone", href: "/vender" },
    { label: "Cómo funciona", href: "/como-funciona" },
    { label: "Comisiones", href: "/comisiones" },
    { label: "Panel de vendedor", href: "/seller" },
  ],
  soporte: [
    { label: "Centro de ayuda", href: "/ayuda" },
    { label: "Garantía", href: "/garantia" },
    { label: "Envíos y entregas", href: "/envios" },
    { label: "Devoluciones", href: "/devoluciones" },
    { label: "Contacto", href: "/contacto" },
  ],
  legal: [
    { label: "Términos y condiciones", href: "/terminos" },
    { label: "Política de privacidad", href: "/privacidad" },
    { label: "Política de cookies", href: "/cookies" },
  ],
};

export function Footer() {
  return (
    <footer className="relative z-10 bg-card border-t border-border/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image
                src="/logo.png"
                alt={SITE_NAME}
                width={120}
                height={32}
                className="h-7 w-auto"
              />
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              Productos Apple en Bogotá. Compra y vende con
              confianza.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-gold" />
                <span>Bogotá, Colombia</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-gold" />
                <span>+57 310 755 6872</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-gold" />
                <span>hola@iosbogota.co</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-sm mb-3 text-gold">Comprar</h3>
            <ul className="space-y-2">
              {footerLinks.comprar.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-gold transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-3 text-gold">Vender</h3>
            <ul className="space-y-2">
              {footerLinks.vender.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-gold transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-3 text-gold">Soporte</h3>
            <ul className="space-y-2">
              {footerLinks.soporte.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-gold transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-3 text-gold">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-gold transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-border/50" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {SITE_NAME}. Todos los derechos reservados.</p>
          <p>
            Hecho con <span className="text-gold">❤️</span> en Bogotá, Colombia
          </p>
        </div>
      </div>
    </footer>
  );
}
