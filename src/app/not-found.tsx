import Link from "next/link";
import { Smartphone, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/constants";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="text-center space-y-6 max-w-md">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="bg-primary text-primary-foreground rounded-lg p-2">
            <Smartphone className="h-6 w-6" />
          </div>
          <span className="font-bold text-2xl">{SITE_NAME}</span>
        </Link>

        <div>
          <h1 className="text-7xl font-bold text-primary">404</h1>
          <h2 className="text-2xl font-bold mt-2">Página no encontrada</h2>
          <p className="text-muted-foreground mt-2">
            La página que buscas no existe o fue movida a otra dirección.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Ir al inicio
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/productos">
              <Search className="mr-2 h-4 w-4" />
              Ver productos
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
