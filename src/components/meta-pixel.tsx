"use client";

export const META_PIXEL_ID = "1186091610159088";

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
  }
}

// Generate a unique event_id for deduplication between browser Pixel and server CAPI
function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Get Meta cookies for CAPI user matching
function getMetaCookies(): { fbc?: string; fbp?: string } {
  if (typeof document === "undefined") return {};
  const cookies = Object.fromEntries(
    document.cookie.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    })
  );
  return { fbc: cookies._fbc, fbp: cookies._fbp };
}

// Send event to our CAPI endpoint (server-side, bypasses browser privacy)
async function sendToCAPI(
  eventName: string,
  eventId: string,
  data?: Record<string, unknown>
) {
  try {
    const { fbc, fbp } = getMetaCookies();
    await fetch("/api/meta/capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: eventName,
        event_id: eventId,
        event_source_url: window.location.href,
        fbc,
        fbp,
        ...data,
      }),
    });
  } catch {
    // CAPI errors must never break the UI
  }
}

// Core tracker — fires both browser Pixel and server CAPI in parallel
function trackEvent(
  event: string,
  data?: Record<string, unknown>,
  capiData?: Record<string, unknown>
) {
  const eventId = generateEventId();
  // Browser Pixel (with deduplication event_id)
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", event, data, { eventID: eventId });
  }
  // Server-side CAPI (fires in parallel — doesn't block)
  sendToCAPI(event, eventId, capiData ?? data);
}

export function trackPurchase(
  value: number,
  currency = "COP",
  contentIds?: string[],
  numItems?: number
) {
  const payload = {
    value,
    currency,
    content_ids: contentIds,
    content_type: "product",
    num_items: numItems,
  };
  trackEvent("Purchase", payload, payload);
}

export function trackAddToCart(
  value: number,
  currency = "COP",
  contentName?: string,
  contentId?: string
) {
  const payload = {
    value,
    currency,
    content_name: contentName,
    content_ids: contentId ? [contentId] : undefined,
    content_type: "product",
  };
  trackEvent("AddToCart", payload, payload);
}

export function trackViewContent(contentName?: string, contentId?: string, value?: number) {
  const payload = {
    content_name: contentName,
    content_ids: contentId ? [contentId] : undefined,
    content_type: "product",
    value,
    currency: "COP",
  };
  trackEvent("ViewContent", payload, payload);
}

export function trackInitCheckout(value?: number, currency = "COP") {
  const payload = { value, currency };
  trackEvent("InitiateCheckout", payload, payload);
}

export function trackSearch(searchString: string) {
  trackEvent("Search", { search_string: searchString }, { search_string: searchString });
}

export function trackLead() {
  trackEvent("Lead", {});
}

export function trackCompleteRegistration() {
  trackEvent("CompleteRegistration", {});
}

export function trackContact() {
  trackEvent("Contact", {});
}
