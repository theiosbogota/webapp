import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Eliminación de Datos",
  description: `Solicitud de eliminación de datos personales de ${SITE_NAME}`,
};

export default function DataDeletionPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <h1 className="text-3xl font-bold mb-8">Solicitud de Eliminación de Datos</h1>

          <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground">
                Política de Eliminación de Datos
              </h2>
              <p>
                En {SITE_NAME} respetamos tu derecho a la privacidad. De acuerdo con la Ley 1581 de
                2012 de Colombia y las políticas de Meta (Facebook), puedes solicitar la eliminación
                de tus datos personales almacenados en nuestra plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                ¿Qué datos eliminamos?
              </h2>
              <p>
                Al procesar tu solicitud de eliminación, borraremos la siguiente información
                asociada a tu cuenta:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Nombre completo y datos de contacto (email, teléfono)</li>
                <li>Direcciones de envío guardadas</li>
                <li>Historial de pedidos y transacciones</li>
                <li>Productos publicados como vendedor</li>
                <li>Conversaciones y mensajes en la plataforma</li>
                <li>Datos de sesión y autenticación</li>
                <li>Preferencias y configuración de la cuenta</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                ¿Qué datos conservamos?
              </h2>
              <p>
                Por requisitos legales y contables, conservaremos de forma anonimizada:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Registros de transacciones financieras (sin datos identificables) por 5 años</li>
                <li>Facturas electrónicas emitidas (requeridas por la DIAN)</li>
                <li>Registros de devoluciones o reclamaciones en curso</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                Cómo solicitar la eliminación
              </h2>
              <p>
                Puedes solicitar la eliminación de tus datos de las siguientes formas:
              </p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>
                  <strong>Desde tu cuenta:</strong> Inicia sesión en {SITE_NAME}, ve a
                  &quot;Mi Cuenta&quot; → &quot;Configuración&quot; → &quot;Eliminar mi cuenta&quot;.
                  La eliminación se procesará en un plazo máximo de 30 días.
                </li>
                <li>
                  <strong>Por correo electrónico:</strong> Envía un correo a{" "}
                  <a href="mailto:privacidad@iosbogota.co" className="text-gold hover:underline">
                    privacidad@iosbogota.co
                  </a>{" "}
                  con el asunto &quot;Solicitud de eliminación de datos&quot; e incluye tu nombre,
                  email registrado y número de teléfono asociado a tu cuenta.
                </li>
                <li>
                  <strong>Desde Facebook/Meta:</strong> Si iniciaste sesión con Facebook, puedes
                  solicitar la eliminación directamente desde la configuración de tu aplicación en
                  Facebook: Configuración → Aplicaciones y sitios web → {SITE_NAME} → Eliminar.
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                Plazos de eliminación
              </h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Solicitud verificada:</strong> Dentro de los 14 días hábiles siguientes a
                  la confirmación de tu identidad.
                </li>
                <li>
                  <strong>Eliminación completa:</strong> Hasta 30 días para la eliminación total de
                  todos los sistemas, incluyendo copias de seguridad.
                </li>
                <li>
                  <strong>Confirmación:</strong> Recibirás un correo de confirmación una vez
                  completada la eliminación.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                Efectos de la eliminación
              </h2>
              <p>
                Al eliminar tus datos, tu cuenta será cerrada permanentemente. No podrás:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Iniciar sesión en la plataforma</li>
                <li>Acceder a tu historial de pedidos</li>
                <li>Publicar productos como vendedor</li>
                <li>Utilizar funciones que requieran autenticación</li>
              </ul>
              <p className="mt-2">
                Esta acción es irreversible. Si deseas volver a usar {SITE_NAME}, deberás crear
                una cuenta nueva.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Contacto</h2>
              <p>
                Si tienes preguntas sobre el proceso de eliminación de datos, contáctanos:
              </p>
              <ul className="list-none space-y-1">
                <li>
                  📧 Email:{" "}
                  <a href="mailto:privacidad@iosbogota.co" className="text-gold hover:underline">
                    privacidad@iosbogota.co
                  </a>
                </li>
                <li>📱 WhatsApp: +57 320 370 4506</li>
                <li>📍 Bogotá, Colombia</li>
              </ul>
            </section>

            <p className="text-xs">Última actualización: Abril 2026</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
