export const SITE_NAME = "TheIOSBogotá";
export const SITE_DESCRIPTION =
  "El marketplace #1 de iPhones nuevos y usados en Bogotá. Compra y vende con confianza.";
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://theiosbogota.com"
).trim().replace(/\/$/, "");

export const IPHONE_MODELS = [
  // iPhones
  "iPhone 17 Pro Max",
  "iPhone 17 Pro",
  "iPhone 17 Plus",
  "iPhone 17",
  "iPhone 16 Pro Max",
  "iPhone 16 Pro",
  "iPhone 16 Plus",
  "iPhone 16",
  "iPhone 15 Pro Max",
  "iPhone 15 Pro",
  "iPhone 15 Plus",
  "iPhone 15",
  "iPhone 14 Pro Max",
  "iPhone 14 Pro",
  "iPhone 14 Plus",
  "iPhone 14",
  "iPhone 13 Pro Max",
  "iPhone 13 Pro",
  "iPhone 13",
  "iPhone 13 Mini",
  "iPhone 12 Pro Max",
  "iPhone 12 Pro",
  "iPhone 12",
  "iPhone 12 Mini",
  "iPhone SE (3ra Gen)",
  "iPhone SE (2da Gen)",
  // MacBooks
  "MacBook Air M5 15",
  "MacBook Air M5",
  "MacBook Air M4 15",
  "MacBook Air M4",
  "MacBook Pro M5 Max",
  "MacBook Pro M5 Pro",
  "MacBook Pro M5",
  "MacBook Pro M4 Max",
  "MacBook Pro M4 Pro",
  "MacBook Pro M4",
  // iPads
  "iPad Pro M4 13",
  "iPad Pro M4",
  "iPad Air M4 13",
  "iPad Air M4",
  "iPad Mini 7",
  "iPad 11",
  // AirPods
  "AirPods Max 2",
  "AirPods Pro 3",
  "AirPods 4 ANC",
  "AirPods 4",
  // Apple Watch
  "Apple Watch Ultra 2",
  "Apple Watch Series 10",
  "Apple Watch SE 2",
  // Otros
  "Apple Pencil Pro",
  "Apple Pencil USB-C",
  "MagSafe Charger",
] as const;

export const STORAGE_OPTIONS = [
  "64GB",
  "128GB",
  "256GB",
  "512GB",
  "1TB",
] as const;

export const CONDITION_LABELS: Record<string, string> = {
  nuevo: "Nuevo",
  como_nuevo: "Como nuevo",
  excelente: "Excelente",
  bueno: "Bueno",
  aceptable: "Aceptable",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  procesando: "Procesando",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
  reembolsado: "Reembolsado",
};

export const NAV_LINKS = [
  { label: "Inicio", href: "/" },
  { label: "Productos", href: "/productos" },
  { label: "Categorías", href: "/categorias" },
  { label: "Vender", href: "/vender" },
] as const;

export const CURRENCY = "COP";

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}
