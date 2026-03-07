-- ============================================
-- 008: Add checkout_order RPC + Fix anon RLS on order_items
-- ============================================

-- 1. Create the checkout_order RPC function
-- This function atomically recalculates totals, applies discount, and marks order as completed
CREATE OR REPLACE FUNCTION checkout_order(
    p_order_id UUID,
    p_payment_method TEXT,
    p_discount_value NUMERIC DEFAULT 0,
    p_discount_type TEXT DEFAULT 'amount'
)
RETURNS VOID AS $$
DECLARE
    v_subtotal NUMERIC;
    v_discount_amount NUMERIC;
    v_total NUMERIC;
BEGIN
    -- Calculate subtotal from order_items
    SELECT COALESCE(SUM(quantity * unit_price), 0)
    INTO v_subtotal
    FROM order_items
    WHERE order_id = p_order_id;

    -- Calculate discount
    IF p_discount_type = 'percent' THEN
        v_discount_amount := ROUND(v_subtotal * p_discount_value / 100);
    ELSE
        v_discount_amount := COALESCE(p_discount_value, 0);
    END IF;

    -- Ensure discount doesn't exceed subtotal
    IF v_discount_amount > v_subtotal THEN
        v_discount_amount := v_subtotal;
    END IF;

    v_total := v_subtotal - v_discount_amount;

    -- Update the order atomically
    UPDATE orders
    SET status = 'completed',
        subtotal = v_subtotal,
        discount_type = p_discount_type,
        discount_value = p_discount_value,
        discount_amount = v_discount_amount,
        total = v_total,
        payment_method = p_payment_method,
        paid_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add missing anon UPDATE policy on order_items (for QR flow quantity merging)
DROP POLICY IF EXISTS "order_items_update_anon" ON order_items;
CREATE POLICY "order_items_update_anon" ON order_items
    FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);
