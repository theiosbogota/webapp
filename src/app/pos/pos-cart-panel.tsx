"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { CartItem } from "./pos-helpers";
import { fmt, PAYMENT_METHODS } from "./pos-helpers";

interface Props {
  cart: CartItem[];
  discount: number;
  total: number;
  subtotal: number;
  paymentMethod: string;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onDiscountChange: (v: number) => void;
  onPaymentChange: (v: string) => void;
  onCheckout: () => void;
  processing: boolean;
}

export function PosCartPanel({ cart, discount, total, subtotal, paymentMethod,
  onUpdateQty, onRemove, onDiscountChange, onPaymentChange, onCheckout, processing }: Props) {
  return (
    <div className="w-full lg:w-96 bg-[#050505] border-t lg:border-t-0 lg:border-l border-[rgba(212,168,67,0.12)] flex flex-col">
      {/* Cart items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#555]">
            <ShoppingCart className="h-10 w-10 mb-2" /><p className="text-sm">Carrito vacío</p>
          </div>
        ) : (
          <AnimatePresence>
            {cart.map((item) => (
              <motion.div key={item.product.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="bg-[#111] border border-[rgba(212,168,67,0.08)] rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#FAFAFA] truncate">{item.product.name}</p>
                    <p className="text-xs text-[#888]">{fmt(item.product.price)} c/u</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-[#555] hover:text-red-400 shrink-0" onClick={() => onRemove(item.product.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7 border-[rgba(212,168,67,0.15)] text-[#D4A843]" onClick={() => onUpdateQty(item.product.id, -1)}><Minus className="h-3 w-3" /></Button>
                    <span className="text-sm font-medium text-white w-6 text-center">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7 border-[rgba(212,168,67,0.15)] text-[#D4A843]" onClick={() => onUpdateQty(item.product.id, 1)}><Plus className="h-3 w-3" /></Button>
                  </div>
                  <span className="text-sm font-bold text-[#D4A843]">{fmt(item.product.price * item.quantity)}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Totals + Payment */}
      {cart.length > 0 && (
        <div className="border-t border-[rgba(212,168,67,0.12)] p-4 space-y-3">
          <div className="flex justify-between text-sm"><span className="text-[#888]">Subtotal</span><span className="text-white">{fmt(subtotal)}</span></div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#888]">Descuento</span>
            <Input type="number" value={discount || ""} onChange={(e) => onDiscountChange(parseInt(e.target.value) || 0)}
              className="h-7 w-28 bg-[#111] border-[rgba(212,168,67,0.08)] rounded-lg text-sm text-[#FAFAFA] text-right" placeholder="0" />
          </div>
          <Separator className="bg-[rgba(212,168,67,0.15)]" />
          <div className="flex justify-between text-lg font-bold"><span className="text-[#D4A843]">Total</span><span className="text-[#D4A843]">{fmt(total)}</span></div>

          {/* Payment method */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#D4A843]/50">Método de pago</span>
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_METHODS.map((m) => (
                <button key={m.value} onClick={() => onPaymentChange(m.value)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${paymentMethod === m.value ? "bg-gradient-to-r from-[#8B6914] to-[#D4A843] text-[#0A0A0A]" : "bg-[#111] text-[#888] border border-[rgba(212,168,67,0.08)] hover:border-[rgba(212,168,67,0.2)]"}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={onCheckout} disabled={processing}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[#8B6914] to-[#D4A843] text-[#0A0A0A] hover:from-[#D4A843] hover:to-[#F0D78C] border-0 rounded-xl">
            {processing ? "Procesando..." : `Cobrar ${fmt(total)}`}
          </Button>
        </div>
      )}
    </div>
  );
}
