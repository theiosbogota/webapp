import { NextResponse } from "next/server";
import crypto from "crypto";
import { generateIntegritySignature } from "@/lib/bold";

const N8N_API_SECRET = process.env.N8N_API_SECRET || "";
// Opt-in: require a Bearer token only when N8N_REQUIRE_AUTH=true. Default
// permissive so existing n8n workflows keep working until you flip the flag
// (and add the matching Authorization header in n8n).
const REQUIRE_N8N_AUTH = process.env.N8N_REQUIRE_AUTH === "true";

function isAuthorized(request: Request): boolean {
  if (!REQUIRE_N8N_AUTH) {
    // Audit-only: log whether the header would have matched.
    if (N8N_API_SECRET) {
      const auth = request.headers.get("authorization") || "";
      const provided = auth.replace(/^Bearer\s+/i, "").trim();
      const ok =
        !!provided &&
        provided.length === N8N_API_SECRET.length &&
        (() => {
          try {
            return crypto.timingSafeEqual(
              Buffer.from(provided),
              Buffer.from(N8N_API_SECRET)
            );
          } catch {
            return false;
          }
        })();
      console.log(
        `[Bold Payment Link] auth audit: ${ok ? "match" : "MISMATCH or missing"}`
      );
    }
    return true;
  }
  if (!N8N_API_SECRET) {
    console.error("[Bold Payment Link] strict mode but N8N_API_SECRET missing");
    return false;
  }
  const auth = request.headers.get("authorization") || "";
  const provided = auth.replace(/^Bearer\s+/i, "").trim();
  if (!provided || provided.length !== N8N_API_SECRET.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided),
      Buffer.from(N8N_API_SECRET)
    );
  } catch {
    return false;
  }
}

/**
 * POST /api/bold/payment-link
 * Generates a Bold payment link for WhatsApp bot sales
 * Auth: Authorization: Bearer <N8N_API_SECRET>
 * Body: { amount, description, customerName, customerPhone, customerEmail, orderId }
 */
export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, description, customerName, customerPhone, customerEmail, orderId } = body;

    if (!amount || !orderId) {
      return NextResponse.json({ error: "amount and orderId are required" }, { status: 400 });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: "invalid amount" }, { status: 400 });
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
