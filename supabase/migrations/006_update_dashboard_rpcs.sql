-- Update get_today_summary
CREATE OR REPLACE FUNCTION get_today_summary()
RETURNS TABLE (
    total_revenue numeric,
    order_count bigint,
    cash_amount numeric,
    transfer_amount numeric,
    cancelled_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(total), 0) as total_revenue,
        COUNT(id) as order_count,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as cash_amount,
        COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN total ELSE 0 END), 0) as transfer_amount,
        (SELECT COUNT(id) FROM orders WHERE DATE(created_at) = CURRENT_DATE AND status = 'cancelled') as cancelled_count
    FROM orders
    WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_daily_revenue
CREATE OR REPLACE FUNCTION get_daily_revenue(p_from date, p_to date)
RETURNS TABLE (
    date date,
    total_revenue numeric,
    order_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(total), 0) as total_revenue,
        COUNT(id) as order_count
    FROM orders
    WHERE DATE(created_at) >= p_from 
      AND DATE(created_at) <= p_to 
      AND status = 'completed'
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_staff_revenue
CREATE OR REPLACE FUNCTION get_staff_revenue(p_from date, p_to date)
RETURNS TABLE (
    staff_id uuid,
    staff_name text,
    total_revenue numeric,
    order_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.staff_id,
        p.full_name as staff_name,
        COALESCE(SUM(o.total), 0) as total_revenue,
        COUNT(o.id) as order_count
    FROM orders o
    JOIN profiles p ON o.staff_id = p.id
    WHERE DATE(o.created_at) >= p_from 
      AND DATE(o.created_at) <= p_to 
      AND o.status = 'completed'
    GROUP BY o.staff_id, p.full_name
    ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
