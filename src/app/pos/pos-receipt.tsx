"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CartItem, PosCustomer } from "./pos-helpers";
import { fmt, PAYMENT_METHODS } from "./pos-helpers";

interface Props {
  saleNumber: string;
  cart: CartItem[];
  total: number;
  paymentMethod: string;
  customer: PosCustomer | null;
  onNewSale: () => void;
}

export function PosReceipt({ saleNumber, cart, total, paymentMethod, customer, onNewSale }: Props) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-[#111] border border-[rgba(212,168,67,0.2)] rounded-2xl p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="bg-green-500/10 border border-green-500/20 rounded-full p-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white">Venta registrada</h2>
        <p className="text-[#D4A843] font-mono text-lg font-bold">{saleNumber}</p>
        <div className="gold-divider" />
        <div className="space-y-1 text-left">
          {cart.map((i, x) => (
            <div key={x} className="flex justify-between text-sm">
              <span className="text-[#FAFAFA]">{i.product.name} ×{i.quantity}</span>
              <span className="text-[#D4A843] font-semibold">{fmt(i.product.price * i.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="gold-divider" />
        <div className="flex justify-between text-lg font-bold">
          <span className="text-[#D4A843]">Total</span>
          <span className="text-[#D4A843]">{fmt(total)}</span>
        </div>
        <p className="text-sm text-[#888]">
          {PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label}
          {customer ? ` · ${customer.full_name}` : ""}
        </p>
        <Button onClick={onNewSale}
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[#8B6914] to-[#D4A843] text-[#0A0A0A] border-0 rounded-xl">
          <Plus className="mr-2 h-5 w-5" />Nueva venta
        </Button>
      </motion.div>
    </div>
  );
}
