import { NextResponse } from "next/server";
import { generateIntegritySignature } from "@/lib/bold";

/**
 * POST /api/bold/payment-link
 * Generates a Bold payment link for WhatsApp bot sales
 * Body: { amount, description, customerName, customerPhone, customerEmail, orderId }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, description, customerName, customerPhone, customerEmail, orderId } = body;

    if (!amount || !orderId) {
      return NextResponse.json({ error: "amount and orderId are required" }, { status: 400 });
    }

    const BOLD_API_KEY = (process.env.NEXT_PUBLIC_BOLD_API_KEY || "").trim();
    if (!BOLD_API_KEY) {
      return NextResponse.json({ error: "Bold not configured" }, { status: 500 });
    }

    // Generate integrity signature
    const signature = await generateIntegritySignature(orderId, amount, "COP");

    // Build Bold checkout URL with all params
    const params = new URLSearchParams({
      "data-bold-button": "dark-L",
      "data-api-key": BOLD_API_KEY,
      "data-order-id": orderId,
      "data-currency": "COP",
      "data-amount": amount.toString(),
      "data-integrity-signature": signature,
      "data-description": description || `Pedido IOSBogota`,
      "data-redirection-url": `${(process.env.NEXT_PUBLIC_SITE_URL || "https://theiosbogota.com").trim()}/checkout/confirmacion?order=${orderId}`,
    });

    if (customerName || customerPhone || customerEmail) {
      params.set("data-customer-data", JSON.stringify({
        email: customerEmail || "",
        fullName: customerName || "",
        phone: customerPhone || "",
        dialCode: "+57",
        documentNumber: "",
        documentType: "CC",
      }));
    }

    // Bold hosted checkout URL
    const checkoutUrl = `https://checkout.bold.co/payment/link?${params.toString()}`;

    return NextResponse.json({
      url: checkoutUrl,
      orderId,
      amount,
      currency: "COP",
      signature,
    });
  } catch (error) {
    console.error("[Bold Payment Link API] Error:", error);
    return NextResponse.json({ error: "Failed to generate payment link" }, { status: 500 });
  }
}
