import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description: `Términos y condiciones de uso de ${SITE_NAME}`,
};

export default function TerminosPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <h1 className="text-3xl font-bold mb-8">Términos y Condiciones</h1>

          <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground">1. Aceptación de los Términos</h2>
              <p>
                Al acceder y utilizar {SITE_NAME} (en adelante, &quot;la Plataforma&quot;), aceptas estos
                términos y condiciones en su totalidad. Si no estás de acuerdo con alguno de estos
                términos, no debes utilizar la Plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">2. Descripción del Servicio</h2>
              <p>
                {SITE_NAME} es un marketplace que conecta compradores y vendedores de iPhones nuevos
                y usados en Bogotá, Colombia. La Plataforma facilita la publicación, búsqueda y
                compra de productos, pero no es responsable directa de las transacciones entre usuarios.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">3. Registro de Usuarios</h2>
              <p>
                Para utilizar ciertas funciones de la Plataforma, debes crear una cuenta proporcionando
                información veraz y actualizada. Eres responsable de mantener la confidencialidad de
                tu cuenta y contraseña.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">4. Publicación de Productos</h2>
              <p>
                Los vendedores se comprometen a publicar información precisa sobre los productos,
                incluyendo estado, almacenamiento, color y precio. Está prohibido publicar productos
                robados, falsificados o que infrinjan derechos de terceros.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">5. Compras y Pagos</h2>
              <p>
                Los pagos se procesan a través de pasarelas de pago seguras (Wompi). {SITE_NAME} no
                almacena información de tarjetas de crédito. Los precios están expresados en pesos
                colombianos (COP) e incluyen IVA cuando aplique.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">6. Envíos y Entregas</h2>
              <p>
                Los envíos se realizan dentro de Bogotá. Los tiempos de entrega son estimados y
                pueden variar. El comprador debe verificar el estado del producto al momento de
                la entrega.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">7. Garantías y Devoluciones</h2>
              <p>
                Los productos nuevos cuentan con la garantía del fabricante. Los productos usados
                tienen una garantía de funcionamiento de 30 días a partir de la entrega. Las
                devoluciones deben solicitarse dentro de los primeros 5 días hábiles.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">8. Contacto</h2>
              <p>
                Para cualquier consulta sobre estos términos, puedes contactarnos a través de
                nuestro correo electrónico: soporte@iosbogota.co
              </p>
            </section>

            <p className="text-xs">
              Última actualización: Febrero 2026
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
