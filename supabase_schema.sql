-- SQL Migration for ZAMS Mart

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'customer', 'merchant')),
  merchant_status TEXT DEFAULT 'pending' CHECK (merchant_status IN ('pending', 'verified', 'rejected')),
  business_name TEXT,
  business_description TEXT,
  business_address TEXT,
  business_phone TEXT,
  commission_rate NUMERIC DEFAULT 0.10, -- Default 10% commission
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to check if user is admin without recursion
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT (role = 'admin')
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is merchant
CREATE OR REPLACE FUNCTION public.check_is_merchant()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT (role = 'merchant' AND merchant_status = 'verified')
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is order owner without recursion
CREATE OR REPLACE FUNCTION public.is_order_owner(order_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = $1 AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is order merchant without recursion
CREATE OR REPLACE FUNCTION public.is_order_merchant(order_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.order_items
    WHERE order_id = $1 AND merchant_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  stock INTEGER DEFAULT 0,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  merchant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  image_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure unique constraint on product name for idempotency
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_name_key'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_name_key UNIQUE (name);
    END IF;
END $$;

-- 4. Product Images Table
CREATE TABLE IF NOT EXISTS product_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL
);

-- 5. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  total_amount NUMERIC NOT NULL,
  shipping_fee NUMERIC DEFAULT 0,
  shipping_zone TEXT,
  estimated_delivery_days TEXT,
  status TEXT DEFAULT 'Pending Payment Review' CHECK (status IN ('Pending Payment Review', 'Processing', 'Shipped', 'Delivered', 'Cancelled')),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  merchant_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  commission_amount NUMERIC DEFAULT 0,
  merchant_payout_amount NUMERIC DEFAULT 0
);

-- 7. Payouts Table
CREATE TABLE IF NOT EXISTS payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Payment Proofs Table
CREATE TABLE IF NOT EXISTS payment_proofs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS POLICIES

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile, admins can read all
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (public.check_is_admin());

-- Categories: Everyone can read, only admins can modify
DROP POLICY IF EXISTS "Everyone can view categories" ON categories;
CREATE POLICY "Everyone can view categories" ON categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
CREATE POLICY "Admins can manage categories" ON categories FOR ALL USING (public.check_is_admin());

-- Products: Everyone can read approved products, merchants can manage own, admins can manage all
DROP POLICY IF EXISTS "Everyone can view approved products" ON products;
CREATE POLICY "Everyone can view approved products" ON products FOR SELECT USING (approval_status = 'approved' OR merchant_id = auth.uid() OR public.check_is_admin());

DROP POLICY IF EXISTS "Merchants can manage own products" ON products;
CREATE POLICY "Merchants can manage own products" ON products FOR ALL USING (merchant_id = auth.uid() OR public.check_is_admin());

-- Product Images: Everyone can read, merchants can manage own
DROP POLICY IF EXISTS "Everyone can view product images" ON product_images;
CREATE POLICY "Everyone can view product images" ON product_images FOR SELECT USING (true);
DROP POLICY IF EXISTS "Merchants can manage own product images" ON product_images;
CREATE POLICY "Merchants can manage own product images" ON product_images FOR ALL USING (
  EXISTS (SELECT 1 FROM products WHERE id = product_images.product_id AND (merchant_id = auth.uid() OR public.check_is_admin()))
);

-- Orders: Customers can view own, merchants can view orders containing their products, admins can view all
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (
  auth.uid() = user_id OR 
  public.check_is_admin() OR
  public.is_order_merchant(id)
);

DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
CREATE POLICY "Anyone can create orders" ON orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
CREATE POLICY "Admins can manage all orders" ON orders FOR ALL USING (public.check_is_admin());

-- Order Items: Customers can view own, merchants can view own, admins can view all
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
CREATE POLICY "Users can view own order items" ON order_items FOR SELECT USING (
  public.is_order_owner(order_id) OR
  public.check_is_admin() OR
  merchant_id = auth.uid()
);

DROP POLICY IF EXISTS "Anyone can create order items" ON order_items;
CREATE POLICY "Anyone can create order items" ON order_items FOR INSERT WITH CHECK (true);

-- Payouts: Merchants can view own, admins can manage all
DROP POLICY IF EXISTS "Merchants can view own payouts" ON payouts;
CREATE POLICY "Merchants can view own payouts" ON payouts FOR SELECT USING (merchant_id = auth.uid());
DROP POLICY IF EXISTS "Admins can manage all payouts" ON payouts;
CREATE POLICY "Admins can manage all payouts" ON payouts FOR ALL USING (public.check_is_admin());

-- Payment Proofs: Customers can view/create own, admins can view/update all
DROP POLICY IF EXISTS "Users can view own payment proofs" ON payment_proofs;
CREATE POLICY "Users can view own payment proofs" ON payment_proofs FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE id = payment_proofs.order_id AND (user_id = auth.uid() OR public.check_is_admin()))
);

DROP POLICY IF EXISTS "Anyone can upload payment proofs" ON payment_proofs;
CREATE POLICY "Anyone can upload payment proofs" ON payment_proofs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage all payment proofs" ON payment_proofs;
CREATE POLICY "Admins can manage all payment proofs" ON payment_proofs FOR ALL USING (public.check_is_admin());

-- 9. Site Settings Table
CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for site_settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read site settings
DROP POLICY IF EXISTS "Everyone can view site settings" ON site_settings;
CREATE POLICY "Everyone can view site settings" ON site_settings FOR SELECT USING (true);

-- Only admins can modify site settings
DROP POLICY IF EXISTS "Admins can manage site settings" ON site_settings;
CREATE POLICY "Admins can manage site settings" ON site_settings FOR ALL USING (public.check_is_admin());

-- Seed initial settings
INSERT INTO site_settings (id, value) VALUES 
('bank_details', '{"bank_name": "GTBank", "account_name": "ZAMS Mart Limited(Saka Sheriff Alade)", "account_number": "0128633561"}'),
('office_info', '{"address": "123 Shopping Street, Lagos, Nigeria", "phone": "+234 803 361 8259", "email": "support@zamsmart.com"}'),
('shipping_config', '{"free_shipping_threshold": 50000, "shipping_fee": 2500}'),
('marketplace_config', '{"default_commission_rate": 0.10}'),
('terms_of_service', '{"content": ""}'),
('privacy_policy', '{"content": ""}')
ON CONFLICT (id) DO NOTHING;

-- Trigger for profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, business_name, business_phone)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE(new.raw_user_meta_data->>'role', 'customer'),
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'business_phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    business_name = EXCLUDED.business_name,
    business_phone = EXCLUDED.business_phone;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed Data
DO $$
BEGIN
    -- Insert Categories
    INSERT INTO categories (name, slug) VALUES 
    ('Hair Care', 'hair-care'),
    ('Skin Care', 'skin-care'),
    ('Home Essentials', 'home-essentials'),
    ('Personal Care', 'personal-care')
    ON CONFLICT (slug) DO NOTHING;

    -- Insert Products using a more robust method
    IF EXISTS (SELECT 1 FROM categories WHERE slug = 'hair-care') THEN
        INSERT INTO products (name, description, price, stock, category_id, image_url, is_featured) 
        VALUES 
        ('Organic Shea Butter Hair Cream', 'Deeply moisturizing hair cream for natural hair growth and shine.', 4500, 50, (SELECT id FROM categories WHERE slug = 'hair-care'), 'https://res.cloudinary.com/dkvkgae3o/image/upload/v1773575538/sheabutter_bufdmf.png', true),
        ('Herbal Anti-Dandruff Shampoo', 'Effective shampoo with neem and tea tree oil to combat dandruff.', 3200, 100, (SELECT id FROM categories WHERE slug = 'hair-care'), 'https://res.cloudinary.com/dkvkgae3o/image/upload/v1773575539/herbal_anti-dandruff_kumxjj.png', true),
        ('Deep Conditioning Treatment', 'Intensive repair for damaged hair. Restores strength and elasticity.', 6500, 40, (SELECT id FROM categories WHERE slug = 'hair-care'), 'https://res.cloudinary.com/dkvkgae3o/image/upload/v1773575536/deep_conditionin_mcye4l.png', false)
        ON CONFLICT (name) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM categories WHERE slug = 'skin-care') THEN
        INSERT INTO products (name, description, price, stock, category_id, image_url, is_featured) 
        VALUES 
        ('Cocoa Butter Body Lotion', 'Rich body lotion for 24-hour moisture and glowing skin.', 5800, 75, (SELECT id FROM categories WHERE slug = 'skin-care'), 'https://res.cloudinary.com/dkvkgae3o/image/upload/v1773575538/cocoa_butter_h7xgo1.png', true),
        ('Vitamin C Face Serum', 'Brightening serum with 20% Vitamin C and Hyaluronic Acid.', 9500, 60, (SELECT id FROM categories WHERE slug = 'skin-care'), 'https://res.cloudinary.com/dkvkgae3o/image/upload/v1773575543/vit_C_face_serum_bhcwi2.png', true)
        ON CONFLICT (name) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM categories WHERE slug = 'home-essentials') THEN
        INSERT INTO products (name, description, price, stock, category_id, image_url, is_featured) 
        VALUES 
        ('Luxury Scented Candle', 'Hand-poured soy candle with lavender and vanilla scent.', 8500, 30, (SELECT id FROM categories WHERE slug = 'home-essentials'), 'https://res.cloudinary.com/dkvkgae3o/image/upload/v1773575540/LUXURY_SCENT_vhyt53.png', true),
        ('Stainless Steel Water Bottle', 'Eco-friendly 1L water bottle, keeps drinks cold for 24 hours.', 12000, 25, (SELECT id FROM categories WHERE slug = 'home-essentials'), 'https://res.cloudinary.com/dkvkgae3o/image/upload/v1773575536/stainless_water_bottle_glzy9l.png', false)
        ON CONFLICT (name) DO NOTHING;
    END IF;
END $$;
