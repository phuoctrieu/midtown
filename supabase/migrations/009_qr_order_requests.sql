-- Create the qr_order_requests table
CREATE TABLE public.qr_order_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID REFERENCES public.tables(id) NOT NULL,
    order_id UUID REFERENCES public.orders(id), -- Nullable if there is no active table order
    menu_item_id UUID REFERENCES public.menu_items(id) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn on RLS
ALTER TABLE public.qr_order_requests ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (from QR code)
CREATE POLICY "Allow anonymous inserts into qr requests"
    ON public.qr_order_requests
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Allow auth users to read all requests
CREATE POLICY "Allow authenticated to view qr requests"
    ON public.qr_order_requests
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow auth users to update requests
CREATE POLICY "Allow authenticated to update qr requests"
    ON public.qr_order_requests
    FOR UPDATE
    TO authenticated
    USING (true);

-- Add unique constraint to order_items to prevent dupes, allow ON CONFLICT
ALTER TABLE public.order_items
    ADD CONSTRAINT unique_order_item UNIQUE (order_id, menu_item_id);

-- Enable Realtime for the table so Next.js POS can listen to new requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_order_requests;

-- RPC to process the request
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
        
        -- If the request didn't specify an order_id (e.g. no open order at the time), find an active order for this table
        IF v_order_id IS NULL THEN
            SELECT id INTO v_order_id
            FROM public.orders
            WHERE table_id = v_request.table_id AND status IN ('pending', 'open')
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
        DO UPDATE SET quantity = public.order_items.quantity + EXCLUDED.quantity;

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

