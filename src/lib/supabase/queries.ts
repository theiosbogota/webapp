import { createClient } from "@/lib/supabase/client";
import type { Category, Product } from "@/types";

export async function getCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("order", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }

  return data as Category[];
}

export async function getProducts(options?: {
  featured?: boolean;
  condition?: string;
  storage?: string;
  categorySlug?: string;
  sort?: string;
  limit?: number;
}): Promise<Product[]> {
  const supabase = createClient();
  let query = supabase
    .from("products")
    .select("*, store:stores(*), category:categories(*)");

  if (options?.featured) {
    query = query.eq("featured", true);
  }
  if (options?.condition) {
    query = query.eq("condition", options.condition);
  }
  if (options?.storage) {
    query = query.eq("storage", options.storage);
  }
  if (options?.categorySlug) {
    query = query.eq("category.slug", options.categorySlug);
  }

  if (options?.sort === "price_asc") {
    query = query.order("price", { ascending: true });
  } else if (options?.sort === "price_desc") {
    query = query.order("price", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  return (data as Product[]) || [];
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, store:stores(*), category:categories(*)")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Error fetching product:", error);
    return null;
  }

  return data as Product;
}
