import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: `Política de privacidad y tratamiento de datos personales de ${SITE_NAME}`,
};

export default function PrivacidadPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <h1 className="text-3xl font-bold mb-8">Política de Privacidad</h1>

          <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground">1. Información que Recopilamos</h2>
              <p>
                En {SITE_NAME} recopilamos la siguiente información personal: nombre completo,
                correo electrónico, número de teléfono, dirección de envío y ciudad. Esta información
                es necesaria para procesar pedidos y brindar nuestros servicios.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">2. Uso de la Información</h2>
              <p>
                Utilizamos tu información personal para: procesar y entregar pedidos, comunicarnos
                contigo sobre tu cuenta y pedidos, mejorar nuestros servicios, y cumplir con
                obligaciones legales. No vendemos ni compartimos tu información con terceros para
                fines de marketing.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">3. Protección de Datos</h2>
              <p>
                Implementamos medidas de seguridad técnicas y organizativas para proteger tu
                información personal. Utilizamos encriptación SSL, almacenamiento seguro en
                Supabase y pasarelas de pago certificadas (Wompi).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">4. Cookies y Seguimiento</h2>
              <p>
                Utilizamos cookies esenciales para el funcionamiento de la plataforma, incluyendo
                autenticación de sesión y preferencias del carrito de compras. También utilizamos
                el Meta Pixel (ID: 1186091610159088) para medir la efectividad de nuestros anuncios
                y optimizar campañas publicitarias. El Meta Pixel puede recopilar información sobre
                tu navegación, interacciones con productos y acciones de compra. Puedes obtener más
                información en la{" "}
                <a href="https://www.facebook.com/policies/" className="text-gold hover:underline">
                  Política de Datos de Facebook
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">5. Datos Compartidos con Meta</h2>
              <p>
                A través del Meta Pixel, compartimos con Facebook/Meta los siguientes datos de eventos:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Visitas a páginas (PageView)</li>
                <li>Visualización de productos (ViewContent)</li>
                <li>Adición de productos al carrito (AddToCart)</li>
                <li>Inicio de proceso de compra (InitiateCheckout)</li>
                <li>Búsquedas de productos (Search)</li>
                <li>Compras completadas (Purchase)</li>
              </ul>
              <p className="mt-2">
                Estos datos se utilizan exclusivamente para medir y optimizar campañas publicitarias.
                Puedes gestionar tus preferencias de anuncios personalizados en la{" "}
                <a href="https://www.facebook.com/adpreferences/" className="text-gold hover:underline">
                  configuración de anuncios de Facebook
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">6. Derechos del Usuario</h2>
              <p>
                De acuerdo con la Ley 1581 de 2012 de Colombia, tienes derecho a: conocer, actualizar
                y rectificar tus datos personales, solicitar la eliminación de tus datos, revocar
                la autorización para el tratamiento de datos, y presentar quejas ante la
                Superintendencia de Industria y Comercio. Para solicitar la eliminación de tus datos,
                visita nuestra{" "}
                <a href="/data-deletion" className="text-gold hover:underline">
                  página de eliminación de datos
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">7. Contacto</h2>
              <p>
                Para ejercer tus derechos o realizar consultas sobre el tratamiento de tus datos
                personales, escríbenos a:{" "}
                <a href="mailto:privacidad@theiosbogota.com" className="text-gold hover:underline">
                  privacidad@theiosbogota.com
                </a>
              </p>
            </section>

            <p className="text-xs">
              Última actualización: Abril 2026
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
