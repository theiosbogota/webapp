"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingBag,
  Store,
  LogOut,
  Menu,
  X,
  Wrench,
  DollarSign,
  Handshake,
  MessageSquare,
  BarChart3,
  Calendar,
  Phone,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SITE_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navSections = [
  {
    label: "PRINCIPAL",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/productos", label: "Productos", icon: ShoppingBag },
      { href: "/admin/repuestos", label: "Repuestos", icon: Wrench },
      { href: "/admin/pedidos", label: "Pedidos", icon: Package },
      { href: "/admin/pos", label: "Ventas Local", icon: ShoppingCart },
    ],
  },
  {
    label: "GESTIÓN",
    items: [
      { href: "/admin/contactos", label: "Contactos", icon: Users },
      { href: "/admin/oportunidades", label: "Oportunidades", icon: Handshake },
      { href: "/admin/citas", label: "Citas", icon: Calendar },
      { href: "/admin/conversaciones", label: "Conversaciones", icon: MessageSquare },
    ],
  },
  {
    label: "FINANZAS",
    items: [
      { href: "/admin/contabilidad", label: "Contabilidad", icon: DollarSign },
      { href: "/admin/reportes", label: "Reportes", icon: BarChart3 },
    ],
  },
  {
    label: "SISTEMA",
    items: [
      { href: "/admin/tiendas", label: "Tiendas", icon: Store },
      { href: "/admin/usuarios", label: "Usuarios", icon: Users },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ nombre: string; role: string } | null>(null);

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", authUser.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      setUser({ nombre: profile.full_name || "Admin", role: profile.role });
      setAuthorized(true);
      setLoading(false);
    }
    check();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="h-10 w-10 rounded-full border-2 border-[#D4A843]/20 border-t-[#D4A843]"
        />
      </div>
    );
  }

  const renderNavItems = (items: typeof navSections[0]["items"], animated = true) =>
    items.map((item, i) => {
      const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
      const Wrapper = animated ? motion.div : "div";
      const animProps = animated
        ? { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.3, delay: i * 0.03 } }
        : {};
      return (
        <Wrapper key={item.href} {...animProps}>
          <Link
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "text-[#FAFAFA]"
                : "text-[#888888] hover:text-[#FAFAFA] hover:bg-[rgba(212,168,67,0.08)]"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-xl"
                style={{ background: "linear-gradient(135deg, rgba(212,168,67,0.15), rgba(139,105,20,0.1))" }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 rounded-r-full bg-[#D4A843]" />
            )}
            <item.icon className={cn("relative h-4 w-4 transition-colors duration-200", isActive ? "text-[#D4A843]" : "text-[#555555] group-hover:text-[#D4A843]")} />
            <span className="relative">{item.label}</span>
          </Link>
        </Wrapper>
      );
    });

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 md:hidden bg-[#050505] h-14 flex items-center px-4 gap-3 border-b border-[rgba(212,168,67,0.12)]">
        <Button
          variant="ghost"
          size="icon"
          className="text-[#888888] hover:text-[#D4A843] hover:bg-[rgba(212,168,67,0.08)]"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#D4A843] to-[#8B6914]">
          <Phone className="h-4 w-4 text-[#0A0A0A]" />
        </div>
        <span className="font-bold text-sm text-[#D4A843] gold-glow-text">{SITE_NAME}</span>
        <Badge className="text-[10px] px-1.5 py-0 h-5 font-semibold border-0 bg-[rgba(212,168,67,0.12)] text-[#D4A843]">
          Admin
        </Badge>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 bg-[#050505] text-[#FAFAFA] overflow-hidden border-r border-[rgba(212,168,67,0.12)]">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex h-16 items-center gap-3 px-6 border-b border-[rgba(212,168,67,0.12)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A843] to-[#8B6914]">
            <Phone className="h-5 w-5 text-[#0A0A0A]" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-[#D4A843] gold-glow-text">{SITE_NAME}</h1>
            <p className="text-[10px] text-[#555555] uppercase tracking-widest">Admin Dashboard</p>
          </div>
        </motion.div>

        {/* Animated gold line */}
        <div className="h-[1px] overflow-hidden">
          <motion.div
            className="h-full w-1/2"
            style={{ background: "linear-gradient(90deg, transparent, #D4A843, #F0D78C, #D4A843, transparent)" }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {/* Nav sections */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {navSections.map((section, si) => (
            <div key={section.label} className={si > 0 ? "mt-4" : ""}>
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#D4A843]/50">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {renderNavItems(section.items, true)}
              </div>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="px-3 pb-5">
          <div className="h-px mb-4 gold-divider" />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-[rgba(212,168,67,0.04)] border border-[rgba(212,168,67,0.08)]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold bg-gradient-to-br from-[#D4A843] to-[#8B6914] text-[#0A0A0A]">
              {user?.nombre?.charAt(0) || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#FAFAFA] truncate">{user?.nombre || "Admin"}</p>
              <p className="text-[10px] text-[#555555] uppercase tracking-wider">{user?.role || "ADMIN"}</p>
            </div>
            <Button variant="ghost" size="icon"
              className="text-[#555555] hover:text-[#D4A843] hover:bg-[rgba(212,168,67,0.08)] h-8 w-8 rounded-lg"
              onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/70 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-40 w-72 md:hidden bg-[#050505] text-[#FAFAFA] overflow-hidden border-r border-[rgba(212,168,67,0.12)]"
            >
              <div className="flex h-16 items-center gap-3 px-6 border-b border-[rgba(212,168,67,0.12)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A843] to-[#8B6914]">
                  <Phone className="h-5 w-5 text-[#0A0A0A]" />
                </div>
                <div>
                  <h1 className="text-sm font-bold tracking-wide text-[#D4A843]">{SITE_NAME}</h1>
                  <p className="text-[10px] text-[#555555] uppercase tracking-widest">Admin Dashboard</p>
                </div>
              </div>
              <nav className="px-3 py-4 overflow-y-auto h-[calc(100%-5rem)]">
                {navSections.map((section, si) => (
                  <div key={section.label} className={si > 0 ? "mt-4" : ""}>
                    <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#D4A843]/50">
                      {section.label}
                    </p>
                    <div className="space-y-0.5">
                      {renderNavItems(section.items, false)}
                    </div>
                  </div>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="md:pl-72 pt-14 md:pt-0 min-h-screen bg-[#0A0A0A]">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
