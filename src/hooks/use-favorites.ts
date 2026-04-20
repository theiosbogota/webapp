"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("user_id", user.id);

      if (data) {
        setFavoriteIds(new Set(data.map((f) => f.product_id)));
      }
    }
    load();
  }, []);

  async function toggleFavorite(productId: string): Promise<boolean> {
    if (!userId) return false;

    const supabase = createClient();
    const isFav = favoriteIds.has(productId);

    if (isFav) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", productId);

      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
      return false;
    } else {
      await supabase.from("favorites").insert({
        user_id: userId,
        product_id: productId,
      });

      setFavoriteIds((prev) => new Set(prev).add(productId));
      return true;
    }
  }

  function isFavorite(productId: string): boolean {
    return favoriteIds.has(productId);
  }

  return { toggleFavorite, isFavorite, isLoggedIn: !!userId };
}
