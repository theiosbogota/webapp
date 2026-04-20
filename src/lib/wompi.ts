// Wompi Payment Gateway Integration
// Docs: https://docs.wompi.co/

const WOMPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || "";
const WOMPI_ENV = process.env.NEXT_PUBLIC_WOMPI_ENV || "sandbox";

const WOMPI_BASE_URL =
  WOMPI_ENV === "production"
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";

const WOMPI_CHECKOUT_URL =
  WOMPI_ENV === "production"
    ? "https://checkout.wompi.co/p/"
    : "https://checkout.wompi.co/p/";

export interface WompiRedirectParams {
  publicKey: string;
  currency: string;
  amountInCents: number;
  reference: string;
  redirectUrl: string;
  customerEmail: string;
  customerFullName: string;
  customerPhoneNumber: string;
}

export function getWompiPublicKey(): string {
  return WOMPI_PUBLIC_KEY;
}

export function isWompiConfigured(): boolean {
  return !!WOMPI_PUBLIC_KEY && WOMPI_PUBLIC_KEY !== "";
}

export function buildWompiCheckoutUrl(params: {
  amountInCents: number;
  reference: string;
  redirectUrl: string;
  customerEmail: string;
  customerFullName: string;
  customerPhone: string;
}): string {
  const queryParams = new URLSearchParams({
    "public-key": WOMPI_PUBLIC_KEY,
    currency: "COP",
    "amount-in-cents": params.amountInCents.toString(),
    reference: params.reference,
    "redirect-url": params.redirectUrl,
    "customer-data:email": params.customerEmail,
    "customer-data:full-name": params.customerFullName,
    "customer-data:phone-number": params.customerPhone,
  });

  return `${WOMPI_CHECKOUT_URL}?${queryParams.toString()}`;
}

export async function getWompiAcceptanceToken(): Promise<string | null> {
  if (!WOMPI_PUBLIC_KEY) return null;

  try {
    const res = await fetch(
      `${WOMPI_BASE_URL}/merchants/${WOMPI_PUBLIC_KEY}`
    );
    const data = await res.json();
    return data?.data?.presigned_acceptance?.acceptance_token || null;
  } catch {
    return null;
  }
}

export async function getTransactionStatus(
  transactionId: string
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `${WOMPI_BASE_URL}/transactions/${transactionId}`
    );
    const data = await res.json();
    return data?.data || null;
  } catch {
    return null;
  }
}
