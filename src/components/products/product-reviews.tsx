"use client";

import { useEffect, useState } from "react";
import { Star, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user: { full_name: string } | null;
}

interface ProductReviewsProps {
  productId: string;
  storeId: string;
}

export function ProductReviews({ productId, storeId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, user:profiles(full_name)")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      const reviewList = (data as unknown as Review[]) || [];
      setReviews(reviewList);

      if (user) {
        setHasReviewed(reviewList.some((r) => r.user?.full_name === user.user_metadata?.full_name));
      }

      setLoading(false);
    }
    load();
  }, [productId]);

  async function handleSubmit() {
    if (!user) return;
    if (rating === 0) {
      setError("Selecciona una calificación");
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("reviews")
      .insert({
        product_id: productId,
        user_id: user.id,
        store_id: storeId,
        rating,
        comment: comment.trim() || null,
      })
      .select("id, rating, comment, created_at, user:profiles(full_name)")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        setError("Ya dejaste una reseña en este producto");
      } else {
        setError(insertError.message);
      }
      setSubmitting(false);
      return;
    }

    setReviews([data as unknown as Review, ...reviews]);
    setHasReviewed(true);
    setRating(0);
    setComment("");
    setSubmitting(false);
  }

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Reseñas</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-4 w-4 ${
                    s <= Math.round(avgRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {avgRating.toFixed(1)} ({reviews.length} reseña{reviews.length !== 1 ? "s" : ""})
            </span>
          </div>
        </div>
      </div>

      {/* Write review */}
      {user && !hasReviewed && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Deja tu reseña</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(s)}
                >
                  <Star
                    className={`h-6 w-6 cursor-pointer transition-colors ${
                      s <= (hoverRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Cuéntanos tu experiencia con este producto..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Enviar reseña
            </Button>
          </CardContent>
        </Card>
      )}

      {!user && (
        <p className="text-sm text-muted-foreground">
          <a href="/auth/login" className="text-primary underline">Inicia sesión</a> para dejar una reseña
        </p>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          Aún no hay reseñas para este producto. ¡Sé el primero!
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id}>
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {review.user?.full_name?.slice(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {review.user?.full_name || "Usuario"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString("es-CO")}
                    </span>
                  </div>
                  <div className="flex mt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= review.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
              <Separator className="mt-4" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
