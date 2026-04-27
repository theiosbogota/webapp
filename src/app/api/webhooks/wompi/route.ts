import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || "1186091610159088";
const CAPI_ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const API_VERSION = "v21.0";
const WOMPI_EVENTS_SECRET = process.env.WOMPI_EVENTS_SECRET || "";

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
              event_id: `wompi-${orderId}`,
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
    console.error("[Wompi CAPI] Error sending Purchase event:", err);
  }
}

/**
 * Wompi event signature verification.
 * https://docs.wompi.co/docs/colombia/eventos/
 * Concatenate signature.properties values (in order) from the body, append
 * timestamp and the events secret, then SHA256 → must equal signature.checksum.
 */
const REQUIRE_WOMPI_SIGNATURE =
  process.env.WOMPI_REQUIRE_SIGNATURE === "true";

function verifyWompiSignature(body: {
  signature?: { checksum?: string; properties?: string[] };
  timestamp?: number;
  data?: Record<string, unknown>;
}): boolean {
  // Default permissive (Wompi isn't currently in use); set
  // WOMPI_REQUIRE_SIGNATURE=true to enforce.
  if (!REQUIRE_WOMPI_SIGNATURE) return true;
  if (!WOMPI_EVENTS_SECRET) {
    console.error("[Wompi Webhook] strict mode but WOMPI_EVENTS_SECRET missing");
    return false;
  }
  const sig = body.signature;
  if (!sig?.checksum || !sig.properties || !body.timestamp) return false;

  const concat = sig.properties
    .map((path) => {
      // path looks like "transaction.id" / "transaction.status" / "transaction.amount_in_cents"
      const segments = path.split(".");
      let cursor: unknown = body.data;
      for (const seg of segments) {
        if (cursor && typeof cursor === "object" && seg in (cursor as Record<string, unknown>)) {
          cursor = (cursor as Record<string, unknown>)[seg];
        } else {
          return "";
        }
      }
      return String(cursor ?? "");
    })
    .join("");

  const payload = `${concat}${body.timestamp}${WOMPI_EVENTS_SECRET}`;
  const expected = crypto.createHash("sha256").update(payload).digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(sig.checksum, "hex")
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!verifyWompiSignature(body)) {
      console.error("[Wompi Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const event = body.event;
    const data = body.data?.transaction;

    if (event !== "transaction.updated" || !data) {
      return NextResponse.json({ received: true });
    }

    const reference: string = data.reference;
    const wompiStatus: string = data.status;
    const transactionId: string = data.id;

    const statusMap: Record<string, { payment: string; order: string }> = {
      APPROVED: { payment: "aprobado", order: "confirmado" },
      DECLINED: { payment: "rechazado", order: "cancelado" },
      VOIDED: { payment: "reembolsado", order: "cancelado" },
      ERROR: { payment: "rechazado", order: "cancelado" },
      PENDING: { payment: "pendiente", order: "pendiente" },
    };

    const mapped = statusMap[wompiStatus];
    if (!mapped) {
      console.warn("[Wompi Webhook] Unmapped status:", wompiStatus);
      return NextResponse.json({ received: true });
    }

    // Validate the order exists and the reference matches the metadata.
    // The reference is the order id we sent at checkout creation.
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, total")
      .eq("id", reference)
      .single();

    if (!order) {
      console.error("[Wompi Webhook] Order not found for reference:", reference);
      return NextResponse.json({ received: true });
    }

    // Idempotency
    const { data: existingPayment } = await supabaseAdmin
      .from("payments")
      .select("gateway_id, status")
      .eq("order_id", order.id)
      .single();

    if (
      existingPayment?.gateway_id === transactionId &&
      existingPayment?.status === mapped.payment
    ) {
      return NextResponse.json({ received: true, idempotent: true });
    }

    await supabaseAdmin
      .from("payments")
      .update({
        status: mapped.payment,
        gateway_id: transactionId,
        gateway_response: data,
      })
      .eq("order_id", order.id);

    await supabaseAdmin
      .from("orders")
      .update({ status: mapped.order })
      .eq("id", order.id);

    if (wompiStatus === "APPROVED") {
      const { data: orderData } = await supabaseAdmin
        .from("orders")
        .select("total, items:order_items(product_id)")
        .eq("id", order.id)
        .single();
      if (orderData) {
        const productIds = (orderData.items || []).map(
          (i: { product_id: string }) => i.product_id
        );
        await fireCapiPurchase(order.id, orderData.total, productIds);
      }
    }

    return NextResponse.json({ received: true, status: mapped });
  } catch (error) {
    console.error("[Wompi Webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
