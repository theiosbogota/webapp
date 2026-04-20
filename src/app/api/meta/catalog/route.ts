import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://theiosbogota.com";

// Meta Commerce Catalog feed — JSON format
// Register this URL in Meta Commerce Manager → Data Sources → Add catalog feed
// URL: https://theiosbogota.com/api/meta/catalog
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: products, error } = await supabase
      .from("products")
      .select("*, store:stores(name, slug), category:categories(name, slug)")
      .eq("active", true)
      .gt("stock", 0)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Catalog] Supabase error:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    const conditionMap: Record<string, string> = {
      nuevo: "new",
      como_nuevo: "refurbished",
      excelente: "refurbished",
      bueno: "used",
      aceptable: "used",
    };

    const items = (products || []).map((p) => {
      const imageUrl = p.images?.[0] || `${SITE_URL}/logo.png`;
      const productUrl = `${SITE_URL}/productos/${p.slug}`;
      const condition = conditionMap[p.condition] || "used";

      return {
        id: p.id,
        title: p.name,
        description: p.description || `${p.name} — ${p.storage} — Estado: ${p.condition}`,
        availability: "in stock",
        condition,
        price: `${p.price} COP`,
        link: productUrl,
        image_link: imageUrl,
        brand: "Apple",
        google_product_category: "Electronics > Communications > Telephony > Mobile Phones",
        product_type: `Smartphones > Apple > ${p.model}`,
        custom_label_0: p.condition,
        custom_label_1: p.storage || "",
        custom_label_2: p.model || "",
        sale_price: p.compare_at_price ? `${p.compare_at_price} COP` : undefined,
        retailer_id: p.id,
      };
    });

    return NextResponse.json(
      { data: items },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("[Catalog] Unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
