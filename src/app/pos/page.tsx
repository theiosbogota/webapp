"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, ShoppingCart, ArrowLeft, Package, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SITE_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { searchProducts, createPosSale } from "./pos-actions";
import type { PosProduct, PosCustomer, CartItem } from "./pos-helpers";
import { fmt } from "./pos-helpers";
import { PosReceipt } from "./pos-receipt";
import { PosCustomerPanel } from "./pos-customer-panel";
import { PosCartPanel } from "./pos-cart-panel";

export default function PosPage() {
  const [ok, setOk] = useState(false);
  const [authLoad, setAuthLoad] = useState(true);
  const [uName, setUName] = useState("");
  const [pq, setPq] = useState("");
  const [pRes, setPRes] = useState<PosProduct[]>([]);
  const [pLoad, setPLoad] = useState(false);
  const sTO = useRef<NodeJS.Timeout | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [disc, setDisc] = useState(0);
  const [selCust, setSelCust] = useState<PosCustomer | null>(null);
  const [pm, setPm] = useState("efectivo");
  const [proc, setProc] = useState(false);
  const [result, setResult] = useState<{ saleId: string; saleNumber: string } | null>(null);

  useEffect(() => {
    (async () => {
      const s = createClient();
      const { data: { user } } = await s.auth.getUser();
      if (!user) { window.location.href = "/auth/login"; return; }
      const { data: p } = await s.from("profiles").select("role, full_name").eq("id", user.id).single();
      if (p?.role !== "admin") { window.location.href = "/dashboard"; return; }
      setUName(p.full_name || "Admin"); setOk(true); setAuthLoad(false);
    })();
  }, []);

  const doPS = useCallback(async (q: string) => {
    if (q.length < 2) { setPRes([]); return; }
    setPLoad(true); setPRes(await searchProducts(q)); setPLoad(false);
  }, []);

  const hPS = (v: string) => {
    setPq(v);
    if (sTO.current) clearTimeout(sTO.current);
    sTO.current = setTimeout(() => doPS(v), 300);
  };

  const addCart = (p: PosProduct) => setCart((pr) => {
    const e = pr.find(i => i.product.id === p.id);
    if (e) { if (e.quantity >= p.stock) return pr; return pr.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i); }
    return [...pr, { product: p, quantity: 1 }];
  });

  const updQty = (id: string, d: number) => setCart(pr => pr.map(i => i.product.id !== id ? i : { ...i, quantity: Math.max(1, Math.min(i.product.stock, i.quantity + d)) }));
  const rmCart = (id: string) => setCart(pr => pr.filter(i => i.product.id !== id));
  const sub = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const tot = sub - disc;

  const hPay = async () => {
    if (!cart.length) return; setProc(true);
    try {
      const r = await createPosSale({
        items: cart.map(i => ({ productId: i.product.id, productName: i.product.name, quantity: i.quantity, unitPrice: i.product.price, subtotal: i.product.price * i.quantity })),
        customerId: selCust?.id, customerName: selCust?.full_name || undefined,
        customerPhone: selCust?.phone || undefined,
        paymentMethod: pm, discount: disc,
      });
      if (r.error) alert("Error: " + r.error);
      else if (r.saleId) setResult({ saleId: r.saleId, saleNumber: r.saleNumber || "" });
    } catch (e) { alert("Error: " + e); } finally { setProc(false); }
  };

  const reset = () => { setCart([]); setDisc(0); setSelCust(null); setPm("efectivo"); setResult(null); };

  if (authLoad) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="h-10 w-10 rounded-full border-2 border-[#D4A843]/20 border-t-[#D4A843]" /></div>;
  if (!ok) return null;

  if (result) return <PosReceipt saleNumber={result.saleNumber} cart={cart} total={tot} paymentMethod={pm} customer={selCust} onNewSale={reset} />;

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <header className="sticky top-0 z-50 bg-[#050505] border-b border-[rgba(212,168,67,0.12)] px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-[#888] hover:text-[#D4A843]"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#D4A843] to-[#8B6914]"><ShoppingCart className="h-4 w-4 text-[#0A0A0A]" /></div>
          <span className="font-bold text-[#D4A843] gold-glow-text">{SITE_NAME} POS</span>
        </div>
        <Badge className="border-0 bg-[rgba(212,168,67,0.12)] text-[#D4A843] text-xs">{uName}</Badge>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* LEFT: Search + Products */}
        <div className="flex-1 flex flex-col p-4 gap-4 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#555]" />
            <Input value={pq} onChange={(e) => hPS(e.target.value)} placeholder="Buscar producto por nombre, modelo, color..."
              className="pl-10 h-12 bg-[#111] border-[rgba(212,168,67,0.12)] rounded-xl text-base text-[#FAFAFA]" autoFocus />
            {pLoad && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-[#D4A843]" />}
          </div>
          <div className="flex-1 overflow-y-auto">
            {pRes.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {pRes.map((p) => {
                  const inCart = cart.find(i => i.product.id === p.id);
                  return (
                    <motion.button key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => addCart(p)}
                      className="bg-[#111] border border-[rgba(212,168,67,0.12)] rounded-xl p-3 text-left hover:border-[rgba(212,168,67,0.3)] transition-all">
                      <div className="aspect-square rounded-lg bg-[#0A0A0A] mb-2 flex items-center justify-center overflow-hidden">
                        {p.images?.[0] ? <Image src={p.images[0]} alt={p.name} width={120} height={120} className="object-contain p-2" /> : <Package className="h-8 w-8 text-[#555]" />}
                      </div>
                      <p className="text-sm font-medium text-[#FAFAFA] truncate">{p.name}</p>
                      <p className="text-xs text-[#888]">{p.storage} · {p.color}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold text-[#D4A843]">{fmt(p.price)}</span>
                        <Badge className="text-[10px] border-0 bg-[rgba(212,168,67,0.12)] text-[#D4A843]">Stock: {p.stock}</Badge>
                      </div>
                      {inCart && <Badge className="mt-1 text-[10px] bg-green-500/10 text-green-400 border-0">×{inCart.quantity}</Badge>}
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-[#555]"><Package className="h-8 w-8 mr-2" />Busca productos</div>
            )}
          </div>
        </div>

        {/* RIGHT: Customer + Cart + Pay */}
        <PosCustomerPanel customer={selCust} onSelect={setSelCust} />
        <PosCartPanel cart={cart} discount={disc} total={tot} subtotal={sub} paymentMethod={pm}
          onUpdateQty={updQty} onRemove={rmCart} onDiscountChange={setDisc} onPaymentChange={setPm} onCheckout={hPay} processing={proc} />
      </div>
    </div>
  );
}
