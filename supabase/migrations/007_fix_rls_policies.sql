-- ============================================
-- 007: Fix RLS Policies for all tables
-- ============================================
-- This migration drops existing policies and recreates them properly
-- to fix: cancel order RLS error, QR order insert, and general access

-- ==========================================
-- 1. ORDERS TABLE
-- ==========================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_insert_staff" ON orders;
DROP POLICY IF EXISTS "orders_insert_qr" ON orders;
DROP POLICY IF EXISTS "orders_update_staff" ON orders;
DROP POLICY IF EXISTS "orders_delete_staff" ON orders;
DROP POLICY IF EXISTS "Authenticated users can read orders" ON orders;
DROP POLICY IF EXISTS "Staff can create orders" ON orders;
DROP POLICY IF EXISTS "Staff can update orders" ON orders;

-- Authenticated users (staff + admin) can read all orders
CREATE POLICY "orders_select" ON orders
    FOR SELECT TO authenticated
    USING (true);

-- Authenticated users can insert orders (staff creating orders)
CREATE POLICY "orders_insert_staff" ON orders
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Anonymous users can insert orders (QR ordering by customers)
CREATE POLICY "orders_insert_qr" ON orders
    FOR INSERT TO anon
    WITH CHECK (source = 'qr');

-- Authenticated users can update orders (checkout, cancel, etc.)
CREATE POLICY "orders_update_staff" ON orders
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Anonymous can read orders (for QR flow to check existing orders)
CREATE POLICY "orders_select_anon" ON orders
    FOR SELECT TO anon
    USING (true);

-- ==========================================
-- 2. ORDER_ITEMS TABLE
-- ==========================================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select" ON order_items;
DROP POLICY IF EXISTS "order_items_insert" ON order_items;
DROP POLICY IF EXISTS "order_items_update" ON order_items;
DROP POLICY IF EXISTS "order_items_delete" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_anon" ON order_items;
DROP POLICY IF EXISTS "Authenticated users can read order items" ON order_items;
DROP POLICY IF EXISTS "Staff can create order items" ON order_items;
DROP POLICY IF EXISTS "Staff can update order items" ON order_items;
DROP POLICY IF EXISTS "Staff can delete order items" ON order_items;

CREATE POLICY "order_items_select" ON order_items
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "order_items_insert" ON order_items
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "order_items_update" ON order_items
    FOR UPDATE TO authenticated
    USING (true);

CREATE POLICY "order_items_delete" ON order_items
    FOR DELETE TO authenticated
    USING (true);

-- Anon can insert order items (QR ordering)
CREATE POLICY "order_items_insert_anon" ON order_items
    FOR INSERT TO anon
    WITH CHECK (true);

-- Anon can read order items (for QR flow)
CREATE POLICY "order_items_select_anon" ON order_items
    FOR SELECT TO anon
    USING (true);

-- ==========================================
-- 3. TABLES
-- ==========================================
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tables_select" ON tables;
DROP POLICY IF EXISTS "tables_insert" ON tables;
DROP POLICY IF EXISTS "tables_update" ON tables;
DROP POLICY IF EXISTS "tables_delete" ON tables;
DROP POLICY IF EXISTS "Anyone can read tables" ON tables;
DROP POLICY IF EXISTS "Admins can manage tables" ON tables;

-- Everyone can read tables (needed for QR flow)
CREATE POLICY "tables_select" ON tables
    FOR SELECT
    USING (true);

-- Only authenticated users can manage tables
CREATE POLICY "tables_insert" ON tables
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "tables_update" ON tables
    FOR UPDATE TO authenticated
    USING (true);

CREATE POLICY "tables_delete" ON tables
    FOR DELETE TO authenticated
    USING (true);

-- ==========================================
-- 4. MENU_ITEMS
-- ==========================================
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_items_select" ON menu_items;
DROP POLICY IF EXISTS "menu_items_insert" ON menu_items;
DROP POLICY IF EXISTS "menu_items_update" ON menu_items;
DROP POLICY IF EXISTS "menu_items_delete" ON menu_items;
DROP POLICY IF EXISTS "Anyone can read menu items" ON menu_items;
DROP POLICY IF EXISTS "Admins can manage menu items" ON menu_items;

-- Everyone can read menu items (needed for QR order page)
CREATE POLICY "menu_items_select" ON menu_items
    FOR SELECT
    USING (true);

CREATE POLICY "menu_items_insert" ON menu_items
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "menu_items_update" ON menu_items
    FOR UPDATE TO authenticated
    USING (true);

CREATE POLICY "menu_items_delete" ON menu_items
    FOR DELETE TO authenticated
    USING (true);

-- ==========================================
-- 5. CATEGORIES
-- ==========================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "categories_insert" ON categories;
DROP POLICY IF EXISTS "categories_update" ON categories;
DROP POLICY IF EXISTS "categories_delete" ON categories;
DROP POLICY IF EXISTS "Anyone can read categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;

-- Everyone can read categories (needed for QR order page)
CREATE POLICY "categories_select" ON categories
    FOR SELECT
    USING (true);

CREATE POLICY "categories_insert" ON categories
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "categories_update" ON categories
    FOR UPDATE TO authenticated
    USING (true);

-- ==========================================
-- 6. PROFILES
-- ==========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "profiles_select" ON profiles
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "profiles_insert" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "profiles_update" ON profiles
    FOR UPDATE TO authenticated
    USING (true);

-- ==========================================
-- 7. SETTINGS
-- ==========================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select" ON settings;
DROP POLICY IF EXISTS "settings_insert" ON settings;
DROP POLICY IF EXISTS "settings_update" ON settings;

CREATE POLICY "settings_select" ON settings
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "settings_insert" ON settings
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "settings_update" ON settings
    FOR UPDATE TO authenticated
    USING (true);

-- ==========================================
-- 8. PRICE_HISTORY
-- ==========================================
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price_history_select" ON price_history;
DROP POLICY IF EXISTS "price_history_insert" ON price_history;

CREATE POLICY "price_history_select" ON price_history
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "price_history_insert" ON price_history
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- ==========================================
-- 9. PARTIAL UNIQUE INDEX: Prevent multiple active orders per table
-- ==========================================
DROP INDEX IF EXISTS idx_unique_active_order_per_table;
CREATE UNIQUE INDEX idx_unique_active_order_per_table
    ON orders (table_id)
    WHERE status = 'pending' AND table_id IS NOT NULL;

-- ==========================================
-- 10. Enable Realtime on orders table
-- ==========================================
-- Note: Run this in Supabase Dashboard SQL editor if it doesn't work in migration:
-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
DO $$
BEGIN
    -- Try to add tables to realtime publication
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    EXCEPTION WHEN OTHERS THEN
        -- Table might already be in publication
        NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END $$;
