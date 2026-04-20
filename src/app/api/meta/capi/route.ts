import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const PIXEL_ID = "1186091610159088";
const CAPI_ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const API_VERSION = "v21.0";

function hashData(value: string): string {
  return crypto.createHash("sha256").update(value.toLowerCase().trim()).digest("hex");
}

interface CAPIEventData {
  event_name: string;
  event_id?: string;
  event_source_url?: string;
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_name?: string;
  content_type?: string;
  num_items?: number;
  search_string?: string;
  // User data (unhashed — we hash server-side)
  email?: string;
  phone?: string;
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string; // _fbc cookie
  fbp?: string; // _fbp cookie
}

export async function POST(request: NextRequest) {
  if (!CAPI_ACCESS_TOKEN) {
    // CAPI not configured — skip silently (don't break checkout)
    return NextResponse.json({ status: "skipped", reason: "no_token" });
  }

  try {
    const body: CAPIEventData = await request.json();

    const user_data: Record<string, string> = {
      client_ip_address: body.client_ip_address || request.headers.get("x-forwarded-for") || "",
      client_user_agent: body.client_user_agent || request.headers.get("user-agent") || "",
    };

    if (body.email) user_data.em = hashData(body.email);
    if (body.phone) user_data.ph = hashData(body.phone.replace(/\D/g, ""));
    if (body.fbc) user_data.fbc = body.fbc;
    if (body.fbp) user_data.fbp = body.fbp;

    const custom_data: Record<string, unknown> = {};
    if (body.value !== undefined) custom_data.value = body.value;
    if (body.currency) custom_data.currency = body.currency;
    if (body.content_ids) custom_data.content_ids = body.content_ids;
    if (body.content_name) custom_data.content_name = body.content_name;
    if (body.content_type) custom_data.content_type = body.content_type;
    if (body.num_items !== undefined) custom_data.num_items = body.num_items;
    if (body.search_string) custom_data.search_string = body.search_string;

    const payload = {
      data: [
        {
          event_name: body.event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id: body.event_id || crypto.randomUUID(),
          event_source_url: body.event_source_url || "https://theiosbogota.com",
          action_source: "website",
          user_data,
          custom_data: Object.keys(custom_data).length > 0 ? custom_data : undefined,
        },
      ],
    };

    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${CAPI_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const result = await res.json();

    if (!res.ok) {
      console.error("[CAPI] Meta API error:", result);
      return NextResponse.json({ status: "error", detail: result }, { status: 500 });
    }

    return NextResponse.json({ status: "ok", events_received: result.events_received });
  } catch (err) {
    console.error("[CAPI] Unexpected error:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
