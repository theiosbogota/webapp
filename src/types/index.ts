export type UserRole = "buyer" | "seller" | "admin";

export type ProductCondition = "nuevo" | "como_nuevo" | "excelente" | "bueno" | "aceptable";

export type OrderStatus =
  | "pendiente"
  | "confirmado"
  | "procesando"
  | "enviado"
  | "entregado"
  | "cancelado"
  | "reembolsado";

export type PaymentMethod = "tarjeta" | "pse" | "nequi" | "daviplata" | "efectivo";

export type PaymentStatus = "pendiente" | "aprobado" | "rechazado" | "reembolsado";

export type ShipmentStatus = "preparando" | "recogido" | "en_transito" | "entregado" | "devuelto";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  rating: number;
  total_sales: number;
  verified: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  order: number;
}

export interface Product {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  model: string;
  condition: ProductCondition;
  storage: string;
  color: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  images: string[];
  featured: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  store?: Store;
  category?: Category;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  buyer_id: string;
  status: OrderStatus;
  subtotal: number;
  shipping_cost: number;
  total: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_neighborhood: string;
  shipping_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  items?: OrderItem[];
  payment?: Payment;
  shipment?: Shipment;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  store_id: string;
  quantity: number;
  unit_price: number;
  total: number;
  product?: Product;
}

export interface Payment {
  id: string;
  order_id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string | null;
  amount: number;
  provider_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: string;
  order_id: string;
  carrier: string | null;
  tracking_number: string | null;
  status: ShipmentStatus;
  estimated_delivery: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  store_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profile?: Profile;
}
