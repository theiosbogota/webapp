import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mapBoldStatus } from "@/lib/bold";

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

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();

    // Bold webhook payload structure
    // { event_type: "...", data: { ... } }
    const data = body.data;

    if (!data) {
      return NextResponse.json({ received: true });
    }

    // Bold sends different event types
    // We care about payment status updates
    const boldStatus = data.payment_status || data.status;
    const boldOrderId = data.order_id || data.reference;

    if (!boldOrderId || !boldStatus) {
      return NextResponse.json({ received: true });
    }

    const mapped = mapBoldStatus(boldStatus);

    // Find order by Bold order ID stored in metadata
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id, total, metadata")
      .eq("metadata->bold_order_id", boldOrderId);

    const order = orders?.[0];
    if (!order) {
      // Also try by direct order ID reference
      const orderId = boldOrderId.replace(/^ORD-/, "").replace(/-\d+$/, "");
      const { data: directOrder } = await supabaseAdmin
        .from("orders")
        .select("id, total")
        .eq("id", orderId)
        .single();

      if (!directOrder) {
        console.error("[Bold Webhook] Order not found:", boldOrderId);
        return NextResponse.json({ received: true });
      }

      // Update payment
      await supabaseAdmin
        .from("payments")
        .update({
          status: mapped.payment,
          gateway_id: data.transaction_id || data.id,
          gateway_response: data,
        })
        .eq("order_id", directOrder.id);

      // Update order
      await supabaseAdmin
        .from("orders")
        .update({ status: mapped.order })
        .eq("id", directOrder.id);

      // Fire CAPI on approval
      if (boldStatus === "APPROVED") {
        const { data: orderData } = await supabaseAdmin
          .from("orders")
          .select("total, items:order_items(product_id)")
          .eq("id", directOrder.id)
          .single();
        if (orderData) {
          const productIds = (orderData.items || []).map(
            (i: { product_id: string }) => i.product_id
          );
          await fireCapiPurchase(directOrder.id, orderData.total, productIds);
        }
      }

      return NextResponse.json({ received: true, status: mapped });
    }

    // Update payment
    await supabaseAdmin
      .from("payments")
      .update({
        status: mapped.payment,
        gateway_id: data.transaction_id || data.id,
        gateway_response: data,
      })
      .eq("order_id", order.id);

    // Update order
    await supabaseAdmin
      .from("orders")
      .update({ status: mapped.order })
      .eq("id", order.id);

    // Fire CAPI on approval
    if (boldStatus === "APPROVED") {
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
    console.error("[Bold Webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
