-- ============================================================
-- BOOTSTRAP-FIXED.SQL  theiosbogota.com
-- Idempotent. Includes schema fixes + admin RLS policies.
-- Paste into Supabase SQL Editor and Run.
-- ============================================================


-- ============================================================
-- FILE: 001_initial_schema.sql
-- ============================================================
-- ============================================
-- IOSBogotá.co - Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
  address TEXT,
  city TEXT DEFAULT 'Bogotá',
  neighborhood TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. STORES (seller shops)
-- ============================================
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  rating NUMERIC(2,1) NOT NULL DEFAULT 0,
  total_sales INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stores_owner ON public.stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);

-- ============================================
-- 3. CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);

-- ============================================
-- 4. PRODUCTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('nuevo', 'como_nuevo', 'excelente', 'bueno', 'aceptable')),
  storage TEXT NOT NULL,
  color TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL CHECK (price > 0),
  compare_at_price NUMERIC(12,2),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  images TEXT[] NOT NULL DEFAULT '{}',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_store ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_model ON public.products(model);
CREATE INDEX IF NOT EXISTS idx_products_condition ON public.products(condition);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(active) WHERE active = TRUE;

-- ============================================
-- 5. ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'confirmado', 'procesando', 'enviado', 'entregado', 'cancelado', 'reembolsado')),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_name TEXT NOT NULL,
  shipping_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL DEFAULT 'Bogotá',
  shipping_neighborhood TEXT NOT NULL DEFAULT '',
  shipping_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- ============================================
-- 6. ORDER ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_store ON public.order_items(store_id);

-- ============================================
-- 7. PAYMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('tarjeta', 'pse', 'nequi', 'daviplata', 'efectivo')),
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobado', 'rechazado', 'reembolsado')),
  reference TEXT,
  amount NUMERIC(12,2) NOT NULL,
  provider_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);

-- ============================================
-- 8. SHIPMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  carrier TEXT,
  tracking_number TEXT,
  status TEXT NOT NULL DEFAULT 'preparando' CHECK (status IN ('preparando', 'recogido', 'en_transito', 'entregado', 'devuelto')),
  estimated_delivery TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_order ON public.shipments(order_id);

-- ============================================
-- 9. REVIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_store ON public.reviews(store_id);

-- ============================================
-- 10. FAVORITES
-- ============================================
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_stores_updated_at ON public.stores;
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_shipments_updated_at ON public.shipments;
CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- STORES
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active stores are viewable by everyone" ON public.stores;
CREATE POLICY "Active stores are viewable by everyone"
  ON public.stores FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Store owners can insert their store" ON public.stores;
CREATE POLICY "Store owners can insert their store"
  ON public.stores FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Store owners can update their store" ON public.stores;
CREATE POLICY "Store owners can update their store"
  ON public.stores FOR UPDATE USING (auth.uid() = owner_id);

-- CATEGORIES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
CREATE POLICY "Categories are viewable by everyone"
  ON public.categories FOR SELECT USING (true);

-- PRODUCTS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active products are viewable by everyone" ON public.products;
CREATE POLICY "Active products are viewable by everyone"
  ON public.products FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Store owners can insert products" ON public.products;
CREATE POLICY "Store owners can insert products"
  ON public.products FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Store owners can update their products" ON public.products;
CREATE POLICY "Store owners can update their products"
  ON public.products FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Store owners can delete their products" ON public.products;
CREATE POLICY "Store owners can delete their products"
  ON public.products FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

-- ORDERS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Users can create orders"
  ON public.orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- ORDER ITEMS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND buyer_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;
CREATE POLICY "Users can insert order items"
  ON public.order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND buyer_id = auth.uid())
  );

-- PAYMENTS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND buyer_id = auth.uid())
  );

-- SHIPMENTS
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own shipments" ON public.shipments;
CREATE POLICY "Users can view own shipments"
  ON public.shipments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND buyer_id = auth.uid())
  );

-- REVIEWS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews are viewable by everyone"
  ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert reviews" ON public.reviews;
CREATE POLICY "Users can insert reviews"
  ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- FAVORITES
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
CREATE POLICY "Users can view own favorites"
  ON public.favorites FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add favorites" ON public.favorites;
CREATE POLICY "Users can add favorites"
  ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove favorites" ON public.favorites;
CREATE POLICY "Users can remove favorites"
  ON public.favorites FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- FILE: 002_decrement_stock.sql
-- ============================================================
-- Function to safely decrement product stock
CREATE OR REPLACE FUNCTION decrement_stock(product_id UUID, qty INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET stock = GREATEST(stock - qty, 0)
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- FILE: 003_bot_tables.sql
-- ============================================================
-- ============================================
-- IOSBogotá.co - Bot Tables (WhatsApp CRM)
-- Compatible con Evolution API + n8n (mismo esquema que Zhoes.co)
-- ============================================

-- ============================================
-- 1. CONTACTS (WhatsApp / CRM)
-- ============================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Cliente',
  email TEXT,
  push_name TEXT,                        -- WhatsApp display name
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'WHATSAPP' CHECK (source IN ('WHATSAPP', 'WEB', 'MANUAL')),
  tags TEXT NOT NULL DEFAULT '[]',       -- JSON array: ["hot","cold","vip"]
  notes TEXT,
  last_interaction TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_profile ON public.contacts(profile_id);

-- ============================================
-- 2. CONVERSATIONS (WhatsApp Chat)
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'WHATSAPP' CHECK (channel IN ('WHATSAPP', 'WEB', 'EMAIL')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'PENDING')),
  assigned_to UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_contact ON public.conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);

-- ============================================
-- 3. MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'IMAGE', 'AUDIO', 'PRODUCT', 'ORDER')),
  metadata JSONB NOT NULL DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON public.messages(direction);

-- ============================================
-- 4. ACTIVITIES (Log de actividad)
-- ============================================
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,                     -- PAGE_VIEW, PRODUCT_VIEW, ADD_TO_CART, ORDER_CREATED, ORDER_PAID, CONVERSATION, CONTACT_REGISTERED, DEAL_CREATED
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_contact ON public.activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON public.activities(type);

-- ============================================
-- UPDATED_AT TRIGGERS for new tables
-- ============================================
DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS) for bot tables
-- ============================================

-- CONTACTS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all contacts" ON public.contacts;
CREATE POLICY "Admin can view all contacts"
  ON public.contacts FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can view own contact" ON public.contacts;
CREATE POLICY "Users can view own contact"
  ON public.contacts FOR SELECT USING (
    profile_id = auth.uid()
  );

-- Service role bypasses RLS, so n8n tools can INSERT/UPDATE freely

-- CONVERSATIONS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all conversations" ON public.conversations;
CREATE POLICY "Admin can view all conversations"
  ON public.conversations FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.contacts WHERE id = contact_id AND profile_id = auth.uid())
  );

-- MESSAGES
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all messages" ON public.messages;
CREATE POLICY "Admin can view all messages"
  ON public.messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.contacts co ON co.id = c.contact_id
      WHERE c.id = conversation_id AND co.profile_id = auth.uid()
    )
  );

-- ACTIVITIES
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all activities" ON public.activities;
CREATE POLICY "Admin can view all activities"
  ON public.activities FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can view own activities" ON public.activities;
CREATE POLICY "Users can view own activities"
  ON public.activities FOR SELECT USING (
    profile_id = auth.uid()
  );


-- ============================================================
-- FILE: admin_tables.sql
-- ============================================================
-- ============================================
-- IOSBogota Admin Dashboard - Database Schema
-- ============================================

-- Spare Parts (Repuestos)
CREATE TABLE IF NOT EXISTS spare_parts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'OTRO',
  brand TEXT NOT NULL DEFAULT 'Apple',
  modelo_compatible TEXT,
  sku TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  cost INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER NOT NULL DEFAULT 2,
  quality TEXT NOT NULL DEFAULT 'GENERICO',
  proveedor TEXT,
  ubicacion TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Spare Part Product Compatibility
CREATE TABLE IF NOT EXISTS spare_part_compatibilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  spare_part_id UUID REFERENCES spare_parts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(spare_part_id, product_id)
);

-- Deals (Oportunidades de venta)
CREATE TABLE IF NOT EXISTS deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id),
  product_id UUID REFERENCES products(id),
  producto TEXT NOT NULL,
  monto_estimado INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'NUEVO',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Appointments (Citas)
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id),
  fecha_hora TIMESTAMPTZ NOT NULL,
  motivo TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'PROGRAMADA',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions (Contabilidad - Ingresos/Egresos)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'INGRESO',
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  order_id UUID REFERENCES orders(id),
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_spare_parts_category ON spare_parts(category);
CREATE INDEX IF NOT EXISTS idx_spare_parts_brand ON spare_parts(brand);
CREATE INDEX IF NOT EXISTS idx_spare_parts_active ON spare_parts(active);
CREATE INDEX IF NOT EXISTS idx_deals_estado ON deals(estado);
CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_appointments_fecha ON appointments(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_appointments_estado ON appointments(estado);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);

-- Enable RLS
ALTER TABLE spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE spare_part_compatibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin only)
DROP POLICY IF EXISTS "Admin can manage spare_parts" ON spare_parts;
CREATE POLICY "Admin can manage spare_parts" ON spare_parts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admin can view spare_parts" ON spare_parts;
CREATE POLICY "Admin can view spare_parts" ON spare_parts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage spare_part_compatibilities" ON spare_part_compatibilities;
CREATE POLICY "Admin can manage spare_part_compatibilities" ON spare_part_compatibilities FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admin can manage deals" ON deals;
CREATE POLICY "Admin can manage deals" ON deals FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admin can view deals" ON deals;
CREATE POLICY "Admin can view deals" ON deals FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage appointments" ON appointments;
CREATE POLICY "Admin can manage appointments" ON appointments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admin can view appointments" ON appointments;
CREATE POLICY "Admin can view appointments" ON appointments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage transactions" ON transactions;
CREATE POLICY "Admin can manage transactions" ON transactions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admin can view transactions" ON transactions;
CREATE POLICY "Admin can view transactions" ON transactions FOR SELECT USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS spare_parts_updated_at ON spare_parts;
CREATE TRIGGER spare_parts_updated_at BEFORE UPDATE ON spare_parts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS deals_updated_at ON deals;
CREATE TRIGGER deals_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS appointments_updated_at ON appointments;
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- FILE: pos_tables.sql
-- ============================================================
-- POS Sales tables for in-store sales

-- Sequence MUST exist before pos_sales table (its DEFAULT references it)
CREATE SEQUENCE IF NOT EXISTS pos_sale_seq START 1;

-- Table: pos_sales
CREATE TABLE IF NOT EXISTS public.pos_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_number TEXT NOT NULL UNIQUE DEFAULT ('POS-' || LPAD(nextval('pos_sale_seq')::TEXT, 5, '0')),
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_document TEXT,
  subtotal BIGINT NOT NULL DEFAULT 0,
  discount BIGINT NOT NULL DEFAULT 0,
  total BIGINT NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'efectivo',
  status TEXT NOT NULL DEFAULT 'completada',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Sequence for sale_number
CREATE SEQUENCE IF NOT EXISTS pos_sale_seq START 1;

-- Table: pos_sale_items
CREATE TABLE IF NOT EXISTS public.pos_sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.pos_sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price BIGINT NOT NULL,
  subtotal BIGINT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pos_sales_created_at ON public.pos_sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_sales_customer_id ON public.pos_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_status ON public.pos_sales(status);
CREATE INDEX IF NOT EXISTS idx_pos_sale_items_sale_id ON public.pos_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_pos_sale_items_product_id ON public.pos_sale_items(product_id);

-- RLS policies
ALTER TABLE public.pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sale_items ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
DROP POLICY IF EXISTS "Admin full access pos_sales" ON public.pos_sales;
CREATE POLICY "Admin full access pos_sales" ON public.pos_sales FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admin full access pos_sale_items" ON public.pos_sale_items;
CREATE POLICY "Admin full access pos_sale_items" ON public.pos_sale_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Function: auto-register transaction in contabilidad when POS sale is created
CREATE OR REPLACE FUNCTION public.pos_sale_to_transaction()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.transactions (type, category, description, amount, payment_method, order_id, created_at)
  VALUES (
    'INGRESO',
    'VENTA',
    CONCAT('Venta local POS-', NEW.sale_number, ' - ', COALESCE(NEW.customer_name, 'Cliente general')),
    NEW.total,
    NEW.payment_method,
    NEW.id::TEXT,
    NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: deduct stock when POS sale item is created
CREATE OR REPLACE FUNCTION public.pos_sale_item_deduct_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET stock = stock - NEW.quantity
  WHERE id = NEW.product_id AND stock >= NEW.quantity;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock insuficiente para producto %', NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: restore stock when POS sale item is deleted (void)
CREATE OR REPLACE FUNCTION public.pos_sale_item_restore_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET stock = stock + OLD.quantity
  WHERE id = OLD.product_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
DROP TRIGGER IF EXISTS trg_pos_sale_to_transaction ON public.pos_sales;
DROP TRIGGER IF EXISTS trg_pos_sale_to_transaction ON public.pos_sales;
CREATE TRIGGER trg_pos_sale_to_transaction
  AFTER INSERT ON public.pos_sales
  FOR EACH ROW EXECUTE FUNCTION public.pos_sale_to_transaction();

DROP TRIGGER IF EXISTS trg_pos_sale_item_deduct_stock ON public.pos_sale_items;
DROP TRIGGER IF EXISTS trg_pos_sale_item_deduct_stock ON public.pos_sale_items;
CREATE TRIGGER trg_pos_sale_item_deduct_stock
  AFTER INSERT ON public.pos_sale_items
  FOR EACH ROW EXECUTE FUNCTION public.pos_sale_item_deduct_stock();

DROP TRIGGER IF EXISTS trg_pos_sale_item_restore_stock ON public.pos_sale_items;
DROP TRIGGER IF EXISTS trg_pos_sale_item_restore_stock ON public.pos_sale_items;
CREATE TRIGGER trg_pos_sale_item_restore_stock
  AFTER DELETE ON public.pos_sale_items
  FOR EACH ROW EXECUTE FUNCTION public.pos_sale_item_restore_stock();


-- ============================================================
-- FILE: bot_metrics.sql
-- ============================================================
-- Bot metrics table for WhatsApp bot analytics
CREATE TABLE IF NOT EXISTS public.bot_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'message_received', 'message_sent', 'tool_used', 'sale_created', 'payment_link_sent', 'human_handoff', 'error'
  phone TEXT,
  session_id TEXT,
  tool_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_bot_metrics_event_type ON public.bot_metrics(event_type);
CREATE INDEX IF NOT EXISTS idx_bot_metrics_created_at ON public.bot_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_bot_metrics_phone ON public.bot_metrics(phone);

-- RLS
ALTER TABLE public.bot_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can read bot metrics" ON public.bot_metrics;
CREATE POLICY "Admin can read bot metrics" ON public.bot_metrics FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Service role can insert bot metrics" ON public.bot_metrics;
CREATE POLICY "Service role can insert bot metrics" ON public.bot_metrics FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
);


-- ============================================================
-- FILE: missing_tables.sql
-- ============================================================
-- Opportunities table for WhatsApp bot sales tracking
CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'NUEVO', -- NUEVO, CONTACTADO, COTIZADO, NEGOCIACION, GANADO, PERDIDO
  source TEXT DEFAULT 'WHATSAPP',
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_contact_id ON public.opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON public.opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON public.opportunities(created_at);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can manage opportunities" ON public.opportunities;
CREATE POLICY "Admin can manage opportunities" ON public.opportunities FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Service role can manage opportunities" ON public.opportunities;
CREATE POLICY "Service role can manage opportunities" ON public.opportunities FOR ALL USING (
  auth.role() = 'service_role'
);

-- Payments table for order payment tracking
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  method TEXT, -- 'bold', 'efectivo', 'contraentrega', 'tarjeta', 'pse', 'nequi'
  status TEXT DEFAULT 'pendiente', -- pendiente, pagado, fallido, reembolsado
  gateway_id TEXT,
  gateway_response JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can manage payments" ON public.payments;
CREATE POLICY "Admin can manage payments" ON public.payments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Service role can manage payments" ON public.payments;
CREATE POLICY "Service role can manage payments" ON public.payments FOR ALL USING (
  auth.role() = 'service_role'
);



-- ============================================================
-- SCHEMA FIXES (resolve mismatches between code and migrations)
-- ============================================================

-- 1. orders.metadata - Bold flow stores bold_order_id here
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_orders_metadata_bold
  ON public.orders ((metadata ->> 'bold_order_id'));

-- 2. payments - webhooks use gateway_id + gateway_response
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS gateway_id       TEXT,
  ADD COLUMN IF NOT EXISTS gateway_response JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;

-- 3. transactions - pos_sale_to_transaction was casting POS sale UUID into
--    order_id (FK to orders) which would fail. Use reference_id instead.
CREATE OR REPLACE FUNCTION public.pos_sale_to_transaction()
RETURNS TRIGGER AS $func$
BEGIN
  INSERT INTO public.transactions (
    type, category, description, amount, payment_method,
    reference_id, reference_type, created_at
  )
  VALUES (
    'INGRESO',
    'VENTA',
    CONCAT('Venta local ', NEW.sale_number, ' - ', COALESCE(NEW.customer_name, 'Cliente general')),
    NEW.total,
    NEW.payment_method,
    NEW.id,
    'pos_sale',
    NEW.created_at
  );
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ADMIN RLS POLICIES
-- The /admin/* panel queries with the browser anon key, so without explicit
-- admin policies it sees nothing. Add them for every table the panel uses.
-- ============================================================

DROP POLICY IF EXISTS "Admin full access profiles" ON public.profiles;
CREATE POLICY "Admin full access profiles" ON public.profiles FOR ALL TO authenticated
  USING ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') )
  WITH CHECK ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') );

DROP POLICY IF EXISTS "Admin full access stores" ON public.stores;
CREATE POLICY "Admin full access stores" ON public.stores FOR ALL TO authenticated
  USING ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') )
  WITH CHECK ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') );

DROP POLICY IF EXISTS "Admin write categories" ON public.categories;
CREATE POLICY "Admin write categories" ON public.categories FOR ALL TO authenticated
  USING ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') )
  WITH CHECK ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') );

DROP POLICY IF EXISTS "Admin full access products" ON public.products;
CREATE POLICY "Admin full access products" ON public.products FOR ALL TO authenticated
  USING ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') )
  WITH CHECK ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') );

DROP POLICY IF EXISTS "Admin full access orders" ON public.orders;
CREATE POLICY "Admin full access orders" ON public.orders FOR ALL TO authenticated
  USING ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') )
  WITH CHECK ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') );

DROP POLICY IF EXISTS "Admin full access order_items" ON public.order_items;
CREATE POLICY "Admin full access order_items" ON public.order_items FOR ALL TO authenticated
  USING ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') )
  WITH CHECK ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') );

DROP POLICY IF EXISTS "Admin full access payments" ON public.payments;
CREATE POLICY "Admin full access payments" ON public.payments FOR ALL TO authenticated
  USING ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') )
  WITH CHECK ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') );

DROP POLICY IF EXISTS "Admin full access shipments" ON public.shipments;
CREATE POLICY "Admin full access shipments" ON public.shipments FOR ALL TO authenticated
  USING ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') )
  WITH CHECK ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') );

DROP POLICY IF EXISTS "Admin full access contacts" ON public.contacts;
CREATE POLICY "Admin full access contacts" ON public.contacts FOR ALL TO authenticated
  USING ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') )
  WITH CHECK ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') );

DROP POLICY IF EXISTS "Admin full access conversations" ON public.conversations;
CREATE POLICY "Admin full access conversations" ON public.conversations FOR ALL TO authenticated
  USING ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') )
  WITH CHECK ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') );

DROP POLICY IF EXISTS "Admin full access messages" ON public.messages;
CREATE POLICY "Admin full access messages" ON public.messages FOR ALL TO authenticated
  USING ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') )
  WITH CHECK ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') );

DROP POLICY IF EXISTS "Admin full access activities" ON public.activities;
CREATE POLICY "Admin full access activities" ON public.activities FOR ALL TO authenticated
  USING ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') )
  WITH CHECK ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') );

DROP POLICY IF EXISTS "Admin read favorites" ON public.favorites;
CREATE POLICY "Admin read favorites" ON public.favorites FOR SELECT TO authenticated
  USING ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') );

DROP POLICY IF EXISTS "Admin moderate reviews" ON public.reviews;
CREATE POLICY "Admin moderate reviews" ON public.reviews FOR ALL TO authenticated
  USING ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') )
  WITH CHECK ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') );

DROP POLICY IF EXISTS "Admin full access opportunities" ON public.opportunities;
CREATE POLICY "Admin full access opportunities" ON public.opportunities FOR ALL TO authenticated
  USING ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') )
  WITH CHECK ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') );

-- ============================================================
-- DONE. After running this, promote your user to admin:
--
--   UPDATE public.profiles SET role = 'admin'
--   WHERE email = 'inventagency20@gmail.com';
--
-- ============================================================
