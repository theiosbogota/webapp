"use server";

import { Resend } from "resend";

const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();

interface InvoiceItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface InvoiceData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: InvoiceItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  shippingAddress: string;
  shippingCity: string;
  date: string;
}

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(amount);
}

function generateInvoiceHTML(data: InvoiceData): string {
  const itemsRows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid rgba(212,168,67,0.1);color:#FAFAFA;font-size:14px;">${item.product_name}</td>
        <td style="padding:12px 16px;border-bottom:1px solid rgba(212,168,67,0.1);color:#888;text-align:center;font-size:14px;">${item.quantity}</td>
        <td style="padding:12px 16px;border-bottom:1px solid rgba(212,168,67,0.1);color:#FAFAFA;text-align:right;font-size:14px;">${formatCOP(item.unit_price)}</td>
        <td style="padding:12px 16px;border-bottom:1px solid rgba(212,168,67,0.1);color:#D4A843;text-align:right;font-weight:600;font-size:14px;">${formatCOP(item.subtotal)}</td>
      </tr>`
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body style="margin:0;padding:0;background:#0A0A0A;font-family:'Inter',sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;min-height:100vh;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

            <!-- Header with logo -->
            <tr>
              <td align="center" style="padding-bottom:32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:linear-gradient(135deg,#8B6914,#D4A843);border-radius:12px;padding:10px;width:48px;height:48px;text-align:center;vertical-align:middle;">
                      <span style="font-size:24px;color:#0A0A0A;">📱</span>
                    </td>
                    <td style="padding-left:12px;">
                      <p style="margin:0;font-size:20px;font-weight:700;color:#D4A843;letter-spacing:-0.5px;">The iOS Bogotá</p>
                      <p style="margin:0;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:2px;">Confirmación de pedido</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Gold divider -->
            <tr>
              <td style="height:1px;background:linear-gradient(90deg,transparent,rgba(212,168,67,0.4),transparent);"></td>
            </tr>

            <!-- Success message -->
            <tr>
              <td align="center" style="padding:32px 0 24px;">
                <div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:50px;display:inline-block;padding:8px 24px;">
                  <span style="color:#22C55E;font-size:14px;font-weight:600;">✓ Pedido confirmado</span>
                </div>
                <h1 style="color:#FAFAFA;font-size:24px;font-weight:700;margin:16px 0 8px;">¡Gracias por tu compra!</h1>
                <p style="color:#888;font-size:14px;margin:0;">Tu pedido ha sido recibido y está siendo procesado</p>
              </td>
            </tr>

            <!-- Order info card -->
            <tr>
              <td style="background:#111;border:1px solid rgba(212,168,67,0.12);border-radius:16px;padding:24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom:16px;">
                      <p style="margin:0;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1.5px;">Número de pedido</p>
                      <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#D4A843;font-family:monospace;">#${data.orderId.slice(0, 8).toUpperCase()}</p>
                    </td>
                    <td align="right" style="padding-bottom:16px;">
                      <p style="margin:0;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1.5px;">Fecha</p>
                      <p style="margin:4px 0 0;font-size:14px;color:#FAFAFA;">${data.date}</p>
                    </td>
                  </tr>
                </table>

                <!-- Items table -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(212,168,67,0.08);border-radius:8px;overflow:hidden;margin:16px 0;">
                  <thead>
                    <tr style="background:#0D0D0D;">
                      <th style="padding:10px 16px;text-align:left;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Producto</th>
                      <th style="padding:10px 16px;text-align:center;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Cant.</th>
                      <th style="padding:10px 16px;text-align:right;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Precio</th>
                      <th style="padding:10px 16px;text-align:right;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsRows}
                  </tbody>
                </table>

                <!-- Totals -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0;color:#888;font-size:14px;">Subtotal</td>
                    <td align="right" style="padding:8px 0;color:#FAFAFA;font-size:14px;">${formatCOP(data.subtotal)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#888;font-size:14px;">Envío</td>
                    <td align="right" style="padding:8px 0;color:#FAFAFA;font-size:14px;">${data.shippingCost === 0 ? "Gratis" : formatCOP(data.shippingCost)}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="height:1px;background:linear-gradient(90deg,transparent,rgba(212,168,67,0.3),transparent);padding:8px 0;"></td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#D4A843;font-size:16px;font-weight:700;">Total</td>
                    <td align="right" style="padding:8px 0;color:#D4A843;font-size:18px;font-weight:700;">${formatCOP(data.total)}</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Shipping info -->
            <tr>
              <td style="background:#111;border:1px solid rgba(212,168,67,0.12);border-radius:16px;padding:20px;margin-top:12px;">
                <p style="margin:0 0 8px;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1.5px;">Envío a</p>
                <p style="margin:0;color:#FAFAFA;font-size:14px;font-weight:500;">${data.customerName}</p>
                <p style="margin:4px 0 0;color:#888;font-size:13px;">${data.shippingAddress}, ${data.shippingCity}</p>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td align="center" style="padding:32px 0 16px;">
                <a href="https://theiosbogota.com/dashboard/pedidos" style="background:linear-gradient(135deg,#8B6914,#D4A843);color:#0A0A0A;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;font-size:14px;display:inline-block;">Ver mis pedidos</a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="height:1px;background:linear-gradient(90deg,transparent,rgba(212,168,67,0.2),transparent);padding:16px 0;"></td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:32px;">
                <p style="margin:0;color:#555;font-size:12px;">The iOS Bogotá — El marketplace #1 de iPhones en Bogotá</p>
                <p style="margin:4px 0 0;color:#333;font-size:11px;">Este correo fue enviado automáticamente. No respondas a este mensaje.</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}

export async function sendInvoiceEmail(data: InvoiceData): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.error("[Resend] API key not configured");
    return { success: false, error: "Resend no está configurado" };
  }

  try {
    const resend = new Resend(RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: "The iOS Bogotá <no-reply@theiosbogota.com>",
      to: [data.customerEmail],
      subject: `Confirmación de pedido #${data.orderId.slice(0, 8).toUpperCase()} — The iOS Bogotá`,
      html: generateInvoiceHTML(data),
    });

    if (error) {
      console.error("[Resend] Error sending email:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[Resend] Exception:", err);
    return { success: false, error: String(err) };
  }
}
