import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PIXEL_ID = "1186091610159088";
const CAPI_ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const API_VERSION = "v21.0";

async function fireCapiPurchase(orderId: string, total: number, productIds: string[]) {
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

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const event = body.event;
    const data = body.data?.transaction;

    if (event !== "transaction.updated" || !data) {
      return NextResponse.json({ received: true });
    }

    const reference = data.reference;
    const wompiStatus = data.status;

    // Map Wompi status to our status
    const statusMap: Record<string, { payment: string; order: string }> = {
      APPROVED: { payment: "aprobado", order: "confirmado" },
      DECLINED: { payment: "rechazado", order: "cancelado" },
      VOIDED: { payment: "reembolsado", order: "cancelado" },
      ERROR: { payment: "rechazado", order: "cancelado" },
    };

    const mapped = statusMap[wompiStatus];
    if (!mapped) {
      return NextResponse.json({ received: true });
    }

    // Update payment
    await supabaseAdmin
      .from("payments")
      .update({
        status: mapped.payment,
        gateway_id: data.id,
        gateway_response: data,
      })
      .eq("order_id", reference);

    // Update order
    await supabaseAdmin
      .from("orders")
      .update({ status: mapped.order })
      .eq("id", reference);

    // Fire CAPI Purchase when payment is approved via Wompi
    if (wompiStatus === "APPROVED") {
      const { data: orderData } = await supabaseAdmin
        .from("orders")
        .select("total, items:order_items(product_id)")
        .eq("id", reference)
        .single();
      if (orderData) {
        const productIds = (orderData.items || []).map(
          (i: { product_id: string }) => i.product_id
        );
        await fireCapiPurchase(reference, orderData.total, productIds);
      }
    }

    return NextResponse.json({ received: true, status: mapped });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
