CREATE OR REPLACE FUNCTION process_qr_request(p_request_id UUID, p_action TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request public.qr_order_requests%ROWTYPE;
    v_order_id UUID;
    v_item_price DECIMAL(10,2);
    v_new_subtotal DECIMAL(10,2);
BEGIN
    IF p_action NOT IN ('accepted', 'rejected') THEN
        RAISE EXCEPTION 'Invalid action';
    END IF;

    -- Lock the row
    SELECT * INTO v_request
    FROM public.qr_order_requests
    WHERE id = p_request_id AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or already processed';
    END IF;

    IF p_action = 'accepted' THEN
        -- Verify order_id
        v_order_id := v_request.order_id;
        
        -- Find an active order if null
        IF v_order_id IS NULL THEN
            SELECT id INTO v_order_id
            FROM public.orders
            WHERE table_id = v_request.table_id AND status = 'pending'
            ORDER BY created_at DESC
            LIMIT 1;
        END IF;

        IF v_order_id IS NULL THEN
            -- Create a new order if none exists
            INSERT INTO public.orders (table_id, source, status, subtotal, total)
            VALUES (v_request.table_id, 'qr', 'pending', 0, 0)
            RETURNING id INTO v_order_id;
        END IF;

        -- Get unit price
        SELECT price INTO v_item_price
        FROM public.menu_items
        WHERE id = v_request.menu_item_id;

        -- Insert or update item (using our new unique constraint)
        INSERT INTO public.order_items (order_id, menu_item_id, quantity, unit_price, note)
        VALUES (v_order_id, v_request.menu_item_id, v_request.quantity, v_item_price, v_request.note)
        ON CONFLICT (order_id, menu_item_id)
        DO UPDATE SET 
            quantity = public.order_items.quantity + EXCLUDED.quantity,
            note = CASE 
                WHEN public.order_items.note IS NULL AND EXCLUDED.note IS NOT NULL THEN EXCLUDED.note
                WHEN public.order_items.note IS NOT NULL AND EXCLUDED.note IS NOT NULL THEN public.order_items.note || ', ' || EXCLUDED.note
                ELSE public.order_items.note
            END;

        -- Recalculate order total
        SELECT COALESCE(SUM(quantity * unit_price), 0) INTO v_new_subtotal
        FROM public.order_items
        WHERE order_id = v_order_id;

        UPDATE public.orders
        SET subtotal = v_new_subtotal, total = v_new_subtotal
        WHERE id = v_order_id;
    END IF;

    -- Update request status
    UPDATE public.qr_order_requests
    SET status = p_action, updated_at = NOW()
    WHERE id = p_request_id;
END;
$$;
