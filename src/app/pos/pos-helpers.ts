export interface CartItem { product: PosProduct; quantity: number }
export interface PosProduct { id: string; name: string; model: string; price: number; stock: number; images: string[]; condition: string; storage: string; color: string }
export interface PosCustomer { id: string; full_name: string; phone: string; email: string }

export const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "nequi", label: "Nequi" },
  { value: "daviplata", label: "Daviplata" },
  { value: "tarjeta", label: "Tarjeta" },
];

export const fmt = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
