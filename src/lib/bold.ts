// Bold Payment Gateway Integration
// Docs: https://developers.bold.co/pagos-en-linea/boton-de-pagos/integracion-manual/integracion-manual

const BOLD_API_KEY = (process.env.NEXT_PUBLIC_BOLD_API_KEY || "").trim();
const BOLD_SECRET_KEY = (process.env.BOLD_SECRET_KEY || "").trim(); // Server-side only!
// Environment is determined by which API key is used (test vs production)

export function getBoldApiKey(): string {
  return BOLD_API_KEY;
}

export function isBoldConfigured(): boolean {
  return !!BOLD_API_KEY && BOLD_API_KEY !== "";
}

/**
 * Generate SHA-256 integrity hash for Bold payment button
 * Format: SHA256({orderId}{amount}{currency}{secretKey})
 * MUST be generated server-side to keep secret key safe
 */
export async function generateIntegritySignature(
  orderId: string,
  amount: number,
  currency: string = "COP"
): Promise<string> {
  const concatenated = `${orderId}${amount}${currency}${BOLD_SECRET_KEY}`;
  const encodedText = new TextEncoder().encode(concatenated);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encodedText);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

/**
 * Build Bold payment button attributes
 */
export interface BoldButtonParams {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  integritySignature: string;
  redirectionUrl: string;
  customerEmail?: string;
  customerFullName?: string;
  customerPhone?: string;
  customerDocumentType?: string;
  customerDocumentNumber?: string;
  tax?: "vat-5" | "vat-19" | "consumption";
  extraData1?: string;
  extraData2?: string;
}

export function buildBoldButtonAttributes(params: BoldButtonParams): Record<string, string> {
  const attrs: Record<string, string> = {
    "data-bold-button": "dark-L",
    "data-api-key": BOLD_API_KEY,
    "data-order-id": params.orderId,
    "data-currency": params.currency,
    "data-amount": params.amount.toString(),
    "data-integrity-signature": params.integritySignature,
    "data-redirection-url": params.redirectionUrl,
    "data-description": params.description,
  };

  if (params.tax) {
    attrs["data-tax"] = params.tax;
  }

  if (params.customerEmail || params.customerFullName || params.customerPhone) {
    attrs["data-customer-data"] = JSON.stringify({
      email: params.customerEmail || "",
      fullName: params.customerFullName || "",
      phone: params.customerPhone || "",
      dialCode: "+57",
      documentNumber: params.customerDocumentNumber || "",
      documentType: params.customerDocumentType || "CC",
    });
  }

  if (params.extraData1) attrs["data-extra-data-1"] = params.extraData1;
  if (params.extraData2) attrs["data-extra-data-2"] = params.extraData2;

  return attrs;
}

/**
 * Map Bold transaction status to our internal status
 */
export function mapBoldStatus(
  boldStatus: string
): { payment: string; order: string } {
  const statusMap: Record<string, { payment: string; order: string }> = {
    APPROVED: { payment: "aprobado", order: "confirmado" },
    DECLINED: { payment: "rechazado", order: "cancelado" },
    VOIDED: { payment: "reembolsado", order: "cancelado" },
    ERROR: { payment: "rechazado", order: "cancelado" },
    PENDING: { payment: "pendiente", order: "pendiente" },
  };
  return (
    statusMap[boldStatus] || { payment: "pendiente", order: "pendiente" }
  );
}
