// Shared admin theme constants for the black/gold luxury dashboard
// All modules should use these for consistency

export const GOLD = "#D4A843";
export const GOLD_BRIGHT = "#F0D78C";
export const GOLD_DARK = "#8B6914";
export const BG_BLACK = "#0A0A0A";
export const BG_SIDEBAR = "#050505";
export const BG_CARD = "#111111";
const BG_CARD_ALT = "#0D0D0D";
export const BORDER_GOLD = "rgba(212,168,67,0.12)";
export const BORDER_GOLD_FOCUS = "rgba(212,168,67,0.3)";
export const TEXT_PRIMARY = "#FAFAFA";
export const TEXT_SECONDARY = "#888888";
export const TEXT_TERTIARY = "#555555";
export const HOVER_GOLD = "rgba(212,168,67,0.08)";

// Card styles
export const cardBase = `bg-[${BG_CARD}] border border-[${BORDER_GOLD}] rounded-2xl`;
export const cardHover = `hover:border-[${BORDER_GOLD_FOCUS}] hover:shadow-[0_8px_30px_rgba(212,168,67,0.15)]`;

// Table styles
export const tableHeaderBg = BG_CARD_ALT;
export const tableRowHover = HOVER_GOLD;

// Badge color maps
export const statusColors: Record<string, string> = {
  // Orders
  pendiente: "bg-[#1A1500] text-[#D4A843] border-[rgba(212,168,67,0.2)]",
  pagado: "bg-[#0A1A0A] text-[#22C55E] border-[rgba(34,197,94,0.2)]",
  enviado: "bg-[#0A0D1A] text-[#818CF8] border-[rgba(129,140,248,0.2)]",
  entregado: "bg-[#0A1A0A] text-[#10B981] border-[rgba(16,185,129,0.2)]",
  cancelado: "bg-[#1A0A0A] text-[#EF4444] border-[rgba(239,68,68,0.2)]",
  reembolsado: "bg-[#1A0A0A] text-[#F87171] border-[rgba(248,113,113,0.2)]",
  // Deals
  NUEVO: "bg-[#0A0D1A] text-[#818CF8] border-[rgba(129,140,248,0.2)]",
  EN_NEGOCIACION: "bg-[#1A1500] text-[#D4A843] border-[rgba(212,168,67,0.2)]",
  CERRADO_GANADO: "bg-[#0A1A0A] text-[#22C55E] border-[rgba(34,197,94,0.2)]",
  CERRADO_PERDIDO: "bg-[#1A0A0A] text-[#EF4444] border-[rgba(239,68,68,0.2)]",
  // Appointments
  PROGRAMADA: "bg-[#0A0D1A] text-[#818CF8] border-[rgba(129,140,248,0.2)]",
  CONFIRMADA: "bg-[#1A1500] text-[#D4A843] border-[rgba(212,168,67,0.2)]",
  COMPLETADA: "bg-[#0A1A0A] text-[#22C55E] border-[rgba(34,197,94,0.2)]",
  CANCELADA: "bg-[#1A0A0A] text-[#EF4444] border-[rgba(239,68,68,0.2)]",
  // Transactions
  INGRESO: "bg-[#0A1A0A] text-[#22C55E] border-[rgba(34,197,94,0.2)]",
  EGRESO: "bg-[#1A0A0A] text-[#EF4444] border-[rgba(239,68,68,0.2)]",
  // Contacts
  whatsapp: "bg-[#0A1A0A] text-[#22C55E] border-[rgba(34,197,94,0.2)]",
  web: "bg-[#0A0D1A] text-[#818CF8] border-[rgba(129,140,248,0.2)]",
  tienda: "bg-[#1A1500] text-[#D4A843] border-[rgba(212,168,67,0.2)]",
  referido: "bg-[#1A0A1A] text-[#C084FC] border-[rgba(192,132,252,0.2)]",
};

export const categoryColors: Record<string, string> = {
  VENTA: "bg-[#0A1A0A] text-[#22C55E]",
  REPARACION: "bg-[#0A0D1A] text-[#818CF8]",
  REPUESTO: "bg-[#1A1500] text-[#D4A843]",
  OTRO_INGRESO: "bg-[#0D0D0D] text-[#888888]",
  COMPRA: "bg-[#1A0A0A] text-[#EF4444]",
  REPUESTO_COMPRA: "bg-[#1A0A0A] text-[#F97316]",
  SERVICIO: "bg-[#1A0A1A] text-[#C084FC]",
  NOMINA: "bg-[#1A0A1A] text-[#EC4899]",
  ALQUILER: "bg-[#0A0D1A] text-[#6366F1]",
  MARKETING: "bg-[#0A1A1A] text-[#06B6D4]",
  TRANSPORTE: "bg-[#0D0D0D] text-[#888888]",
  OTRO_EGRESO: "bg-[#0D0D0D] text-[#888888]",
};

// Gold gradient for primary buttons
export const goldGradient = "linear-gradient(135deg, #D4A843, #8B6914)";
export const goldGradientHover = "linear-gradient(135deg, #F0D78C, #D4A843)";

// KPI card icon gradients
export const kpiGradients = {
  gold: "from-[#D4A843] to-[#8B6914]",
  green: "from-[#22C55E] to-[#16A34A]",
  red: "from-[#EF4444] to-[#DC2626]",
  blue: "from-[#818CF8] to-[#6366F1]",
  purple: "from-[#C084FC] to-[#A855F7]",
  amber: "from-[#F59E0B] to-[#D97706]",
  cyan: "from-[#06B6D4] to-[#0891B2]",
};

export function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(value);
}
