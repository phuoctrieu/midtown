-- ============================================
-- 015: Atomic Checkout with Order Items Reconciliation
-- ============================================
--
-- Problem: When staff removes items from the cart, the DELETE mutation
-- is async. If they click "Pay" before the DELETE completes, the
-- checkout_order RPC reads stale order_items and the removed items
-- permanently remain in Sales History.
--
-- Fix: The checkout_order RPC now accepts the final cart items as JSONB
-- and reconciles order_items within the SAME transaction before
-- calculating totals. This guarantees Sales History matches the bill.
-- ============================================

-- 1. Add CHECK constraint on order_items.quantity to prevent invalid data
-- (qr_order_requests already has this, order_items was missing it)
DO $$
BEGIN
    -- Only add if not already present
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'order_items_quantity_positive'
    ) THEN
        -- First, clean up any existing rows with quantity <= 0
        DELETE FROM order_items WHERE quantity <= 0;

        ALTER TABLE order_items
            ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0);
    END IF;
END $$;

-- 2. Upgraded checkout_order RPC with atomic reconciliation
CREATE OR REPLACE FUNCTION checkout_order(
    p_order_id UUID,
    p_payment_method TEXT,
    p_discount_value NUMERIC DEFAULT 0,
    p_discount_type TEXT DEFAULT 'amount',
    p_final_items JSONB DEFAULT NULL
)
RETURNS VOID AS $func$
DECLARE
    v_subtotal NUMERIC;
    v_discount_amount NUMERIC;
    v_total NUMERIC;
    v_item JSONB;
    v_menu_item_id UUID;
    v_quantity INT;
    v_unit_price NUMERIC;
    v_final_ids UUID[];
BEGIN
    -- ── Step 1: Reconcile order_items if final cart state is provided ──
    -- This ensures DB matches exactly what the user saw in the cart UI,
    -- regardless of whether prior remove/update mutations completed.
    IF p_final_items IS NOT NULL AND jsonb_typeof(p_final_items) = 'array' THEN
        -- Collect all menu_item_ids from the final cart
        SELECT COALESCE(array_agg((item->>'menuItemId')::UUID), ARRAY[]::UUID[])
        INTO v_final_ids
        FROM jsonb_array_elements(p_final_items) AS item;

        -- Delete items that are NOT in the final cart
        IF array_length(v_final_ids, 1) IS NOT NULL AND array_length(v_final_ids, 1) > 0 THEN
            DELETE FROM order_items
            WHERE order_id = p_order_id
              AND menu_item_id != ALL(v_final_ids);
        ELSE
            -- Final cart is empty — remove all items
            DELETE FROM order_items WHERE order_id = p_order_id;
        END IF;

        -- Update quantities and prices for remaining items
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_final_items) LOOP
            v_menu_item_id := (v_item->>'menuItemId')::UUID;
            v_quantity := (v_item->>'quantity')::INT;
            v_unit_price := (v_item->>'unitPrice')::NUMERIC;

            -- Update if exists, insert if not (handles edge case where
            -- add-item mutation hadn't committed yet)
            INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price)
            VALUES (p_order_id, v_menu_item_id, v_quantity, v_unit_price)
            ON CONFLICT (order_id, menu_item_id)
            DO UPDATE SET quantity = v_quantity, unit_price = v_unit_price;
        END LOOP;
    END IF;

    -- ── Step 2: Calculate subtotal from reconciled order_items ──
    SELECT COALESCE(SUM(quantity * unit_price), 0)
    INTO v_subtotal
    FROM order_items
    WHERE order_id = p_order_id;

    -- ── Step 3: Calculate discount ──
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

    -- ── Step 4: Atomically update the order ──
    UPDATE orders
    SET status = 'completed',
        subtotal = v_subtotal,
        discount_type = p_discount_type,
        discount_value = p_discount_value,
        discount_amount = v_discount_amount,
        total = v_total,
        payment_method = p_payment_method::payment_method,
        paid_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
