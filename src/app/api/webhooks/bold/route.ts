import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { mapBoldStatus } from "@/lib/bold";

const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || "1186091610159088";
const CAPI_ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const API_VERSION = "v21.0";
// Bold uses the same "llave secreta" for both the integrity hash and webhook
// signature verification. Allow an explicit override via BOLD_WEBHOOK_SECRET,
// otherwise fall back to the integrity key already configured for checkout.
const BOLD_WEBHOOK_SECRET =
  process.env.BOLD_WEBHOOK_SECRET || process.env.BOLD_SECRET_KEY || "";

async function fireCapiPurchase(
  orderId: string,
  total: number,
  productIds: string[]
) {
  if (!CAPI_ACCESS_TOKEN) return;
  try {
    await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${CAPI_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            {
              event_name: "Purchase",
              event_time: Math.floor(Date.now() / 1000),
              event_id: `bold-${orderId}`,
              event_source_url: "https://theiosbogota.com/checkout/confirmacion",
              action_source: "website",
              user_data: { client_ip_address: "0.0.0.0" },
              custom_data: {
                value: total,
                currency: "COP",
                content_ids: productIds,
                content_type: "product",
                num_items: productIds.length,
              },
            },
          ],
        }),
      }
    );
  } catch (err) {
    console.error("[Bold CAPI] Error sending Purchase event:", err);
  }
}

// Strict signature checking is opt-in via BOLD_WEBHOOK_REQUIRE_SIGNATURE=true.
// Default is permissive (matches the legacy behavior) so the deploy can't break
// existing payments. Once you confirm the algorithm and secret match Bold's
// side, flip the flag to enforce 401 on bad signatures.
const REQUIRE_BOLD_SIGNATURE =
  process.env.BOLD_WEBHOOK_REQUIRE_SIGNATURE === "true";

function verifyBoldSignature(rawBody: string, signature: string | null): boolean {
  if (!REQUIRE_BOLD_SIGNATURE) {
    // Audit-only mode: compute and compare so we can see in logs whether the
    // signature would have matched, but never block.
    if (BOLD_WEBHOOK_SECRET && signature) {
      try {
        const expected = crypto
          .createHmac("sha256", BOLD_WEBHOOK_SECRET)
          .update(rawBody)
          .digest("hex");
        const provided = signature.replace(/^sha256=/, "").trim();
        const matches =
          expected.length === provided.length &&
          crypto.timingSafeEqual(
            Buffer.from(expected, "hex"),
            Buffer.from(provided, "hex")
          );
        console.log(
          `[Bold Webhook] signature audit: ${matches ? "match" : "MISMATCH"}`
        );
      } catch {
        // ignore parse errors during audit
      }
    }
    return true;
  }

  // Strict mode below
  if (!BOLD_WEBHOOK_SECRET) {
    console.error("[Bold Webhook] strict mode but BOLD_WEBHOOK_SECRET missing");
    return false;
  }
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", BOLD_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const provided = signature.replace(/^sha256=/, "").trim();
  if (expected.length !== provided.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(provided, "hex")
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature =
      request.headers.get("x-bold-signature") ||
      request.headers.get("bold-signature");

    if (!verifyBoldSignature(rawBody, signature)) {
      console.error("[Bold Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = JSON.parse(rawBody);
    const data = body.data;

    if (!data) {
      return NextResponse.json({ received: true });
    }

    const boldStatus = data.payment_status || data.status;
    const boldOrderId = data.order_id || data.reference;
    const transactionId = data.transaction_id || data.id || null;

    if (!boldOrderId || !boldStatus) {
      return NextResponse.json({ received: true });
    }

    const mapped = mapBoldStatus(boldStatus);

    // Find order: first by metadata, then by stripped reference
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id, total, metadata")
      .eq("metadata->bold_order_id", boldOrderId);

    let orderId: string | null = orders?.[0]?.id ?? null;

    if (!orderId) {
      const stripped = boldOrderId.replace(/^ORD-/, "").replace(/-\d+$/, "");
      const { data: directOrder } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("id", stripped)
        .single();
      orderId = directOrder?.id ?? null;
    }

    if (!orderId) {
      console.error("[Bold Webhook] Order not found:", boldOrderId);
      return NextResponse.json({ received: true });
    }

    // Idempotency: if we already saw this gateway transaction id, skip side effects
    if (transactionId) {
      const { data: existing } = await supabaseAdmin
        .from("payments")
        .select("id, gateway_id, status")
        .eq("order_id", orderId)
        .single();

      if (existing?.gateway_id === transactionId && existing?.status === mapped.payment) {
        return NextResponse.json({ received: true, idempotent: true });
      }
    }

    await supabaseAdmin
      .from("payments")
      .update({
        status: mapped.payment,
        gateway_id: transactionId,
        gateway_response: data,
      })
      .eq("order_id", orderId);

    await supabaseAdmin
      .from("orders")
      .update({ status: mapped.order })
      .eq("id", orderId);

    if (boldStatus === "APPROVED") {
      const { data: orderData } = await supabaseAdmin
        .from("orders")
        .select("total, items:order_items(product_id)")
        .eq("id", orderId)
        .single();
      if (orderData) {
        const productIds = (orderData.items || []).map(
          (i: { product_id: string }) => i.product_id
        );
        await fireCapiPurchase(orderId, orderData.total, productIds);
      }
    }

    return NextResponse.json({ received: true, status: mapped });
  } catch (error) {
    console.error("[Bold Webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
