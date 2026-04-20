"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare, Phone, Search, RefreshCw, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Conversation {
  id: string;
  contact_id: string;
  mensaje: string;
  respuesta: string | null;
  tipo: string;
  created_at: string;
  contacts?: { nombre: string; telefono: string } | null;
}

interface GroupedContact {
  contactId: string;
  nombre: string;
  telefono: string;
  lastMessage: string;
  lastTime: string;
  total: number;
  tipo: string;
}

export default function ConversacionesPage() {
  const supabase = createClient();
  const [grouped, setGrouped] = useState<GroupedContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [contactMessages, setContactMessages] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [search, setSearch] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*, contacts(nombre, telefono)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const map = new Map<string, GroupedContact>();
      for (const c of data || []) {
        const key = c.contact_id;
        const existing = map.get(key);
        if (!existing || new Date(c.created_at) > new Date(existing.lastTime)) {
          map.set(key, {
            contactId: c.contact_id,
            nombre: c.contacts?.nombre || c.contacts?.telefono || "Desconocido",
            telefono: c.contacts?.telefono || "",
            lastMessage: c.mensaje,
            lastTime: c.created_at,
            total: (existing?.total || 0) + 1,
            tipo: c.tipo,
          });
        } else if (existing) {
          existing.total += 1;
        }
      }
      const sorted = Array.from(map.values()).sort(
        (a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
      );
      setGrouped(sorted);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const loadContactChat = useCallback(async (contactId: string) => {
    setLoadingChat(true);
    setSelectedContact(contactId);
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*, contacts(nombre, telefono)")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setContactMessages(data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingChat(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [contactMessages]);

  const selectedGroup = grouped.find((g) => g.contactId === selectedContact);
  const filtered = search
    ? grouped.filter((g) => g.nombre.toLowerCase().includes(search.toLowerCase()) || g.telefono.includes(search))
    : grouped;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A843] to-[#8B6914]">
            <MessageSquare className="h-5 w-5 text-[#0A0A0A]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">Conversaciones</h1>
            <p className="text-sm text-[#888888]">{grouped.length} contactos con conversaciones</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}
          className="border-[rgba(212,168,67,0.2)] text-[#D4A843] hover:bg-[rgba(212,168,67,0.08)]">
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-180px)]">
        {/* Contact List */}
        <div className="lg:col-span-1 overflow-hidden flex flex-col rounded-2xl bg-[#111111] border border-[rgba(212,168,67,0.12)]">
          <div className="p-3 border-b border-[rgba(212,168,67,0.08)]">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#555555]" />
              <Input placeholder="Buscar contacto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-20"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D4A843]" /></div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-[#555555] text-sm">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />Sin conversaciones
              </div>
            ) : (
              filtered.map((g) => (
                <div key={g.contactId} onClick={() => loadContactChat(g.contactId)}
                  className={`flex items-center gap-3 p-3 cursor-pointer border-b border-[rgba(212,168,67,0.05)] hover:bg-[rgba(212,168,67,0.05)] transition-colors ${selectedContact === g.contactId ? "bg-[rgba(212,168,67,0.1)]" : ""}`}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(212,168,67,0.1)]">
                    <User className="h-5 w-5 text-[#D4A843]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate text-[#FAFAFA]">{g.nombre}</span>
                      <span className="text-xs text-[#555555] shrink-0">
                        {new Date(g.lastTime).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-[#888888] truncate">{g.lastMessage}</p>
                      <Badge className="text-[10px] h-4 px-1 ml-1 shrink-0 border-0 bg-[rgba(212,168,67,0.12)] text-[#D4A843]">{g.total}</Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2 overflow-hidden flex flex-col rounded-2xl bg-[#111111] border border-[rgba(212,168,67,0.12)]">
          {selectedContact && selectedGroup ? (
            <>
              <div className="flex items-center gap-3 p-4 border-b border-[rgba(212,168,67,0.08)] bg-[#0D0D0D]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(212,168,67,0.1)]">
                  <User className="h-5 w-5 text-[#D4A843]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-[#FAFAFA]">{selectedGroup.nombre}</h3>
                  <div className="flex items-center gap-1 text-xs text-[#888888]">
                    <Phone className="h-3 w-3" />{selectedGroup.telefono}
                  </div>
                </div>
                <Badge className="border-[rgba(212,168,67,0.2)] text-[#D4A843]">{selectedGroup.total} mensajes</Badge>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0A0A0A]">
                {loadingChat ? (
                  <div className="flex items-center justify-center h-20"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D4A843]" /></div>
                ) : (
                  contactMessages.map((c) => (
                    <div key={c.id} className="space-y-2">
                      <div className="flex justify-start">
                        <div className="max-w-[75%] bg-[#1A1A2E] text-[#FAFAFA] rounded-2xl rounded-bl-sm px-4 py-2.5 border border-[rgba(129,140,248,0.15)]">
                          <p className="text-sm whitespace-pre-wrap">{c.mensaje}</p>
                          <span className="text-[10px] text-[#818CF8] mt-1 block">
                            {new Date(c.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                      {c.respuesta && (
                        <div className="flex justify-end">
                          <div className="max-w-[75%] bg-[rgba(212,168,67,0.08)] rounded-2xl rounded-br-sm px-4 py-2.5 border border-[rgba(212,168,67,0.12)]">
                            <p className="text-sm whitespace-pre-wrap text-[#FAFAFA]">{c.respuesta}</p>
                            <span className="text-[10px] text-[#D4A843] mt-1 block">
                              {new Date(c.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#555555]">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Selecciona una conversación</p>
                <p className="text-sm">Elige un contacto de la lista para ver el historial</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
