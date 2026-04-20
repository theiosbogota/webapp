"use client";

import { useState, useRef } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchCustomers, createQuickCustomer } from "./pos-actions";
import type { PosCustomer } from "./pos-helpers";

interface Props {
  customer: PosCustomer | null;
  onSelect: (c: PosCustomer | null) => void;
}

export function PosCustomerPanel({ customer, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PosCustomer[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [nName, setNName] = useState("");
  const [nPhone, setNPhone] = useState("");
  const [nDoc, setNDoc] = useState("");
  const timeout = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = (val: string) => {
    setQuery(val);
    if (val.length < 2) { setResults([]); return; }
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(async () => setResults(await searchCustomers(val)), 300);
  };

  const handleCreate = async () => {
    if (!nName) return;
    const r = await createQuickCustomer(nName, nPhone, nDoc);
    if (r.error) { alert(r.error); return; }
    if (r.id) { onSelect({ id: r.id, full_name: nName, phone: nPhone, email: "" }); setShowNew(false); setNName(""); setNPhone(""); setNDoc(""); }
  };

  return (
    <div className="p-4 border-b border-[rgba(212,168,67,0.08)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#D4A843]/50">Cliente</span>
        <Button variant="ghost" size="sm" onClick={() => setShowNew(!showNew)} className="text-[#D4A843] h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" />Nuevo
        </Button>
      </div>
      {customer ? (
        <div className="flex items-center justify-between bg-[rgba(212,168,67,0.08)] rounded-lg p-2">
          <div>
            <p className="text-sm font-medium text-[#FAFAFA]">{customer.full_name}</p>
            {customer.phone && <p className="text-xs text-[#888]">{customer.phone}</p>}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-[#555] hover:text-red-400" onClick={() => onSelect(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Input value={query} onChange={(e) => handleSearch(e.target.value)} placeholder="Buscar cliente..."
            className="h-9 bg-[#111] border-[rgba(212,168,67,0.08)] rounded-lg text-sm text-[#FAFAFA]" />
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-[rgba(212,168,67,0.12)] rounded-lg z-10">
              {results.map((c) => (
                <button key={c.id} onClick={() => { onSelect(c); setQuery(""); setResults([]); }}
                  className="w-full text-left px-3 py-2 hover:bg-[rgba(212,168,67,0.08)] text-sm text-[#FAFAFA]">
                  <span className="font-medium">{c.full_name}</span>
                  {c.phone && <span className="text-[#888] ml-2">{c.phone}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {showNew && (
        <div className="mt-2 space-y-2 p-3 bg-[#111] rounded-lg border border-[rgba(212,168,67,0.08)]">
          <Input value={nName} onChange={(e) => setNName(e.target.value)} placeholder="Nombre *" className="h-8 bg-[#0A0A0A] border-[rgba(212,168,67,0.08)] rounded-lg text-sm" />
          <Input value={nPhone} onChange={(e) => setNPhone(e.target.value)} placeholder="Teléfono" className="h-8 bg-[#0A0A0A] border-[rgba(212,168,67,0.08)] rounded-lg text-sm" />
          <Input value={nDoc} onChange={(e) => setNDoc(e.target.value)} placeholder="Cédula" className="h-8 bg-[#0A0A0A] border-[rgba(212,168,67,0.08)] rounded-lg text-sm" />
          <Button onClick={handleCreate} size="sm" className="w-full bg-gradient-to-r from-[#8B6914] to-[#D4A843] text-[#0A0A0A] border-0 rounded-lg font-semibold">Crear</Button>
        </div>
      )}
    </div>
  );
}
