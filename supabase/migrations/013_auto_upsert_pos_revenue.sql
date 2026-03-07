-- ============================================
-- 013: Auto UPSERT POS Revenue
-- ============================================

-- Function to handle auto upserting POS revenue for a specific day
CREATE OR REPLACE FUNCTION sync_pos_revenue_to_cashbook()
RETURNS TRIGGER AS $$
DECLARE
    v_date TEXT;
    v_time TEXT;
    v_total_revenue NUMERIC;
BEGIN
    -- We only care if the status is completed
    -- (If we ever cancel a completed order, we also want to subtract, so we run on both inserts/updates)
    
    -- Actually, to keep it simple and bulletproof:
    -- Every time an order's status changes to 'completed' or 'cancelled', 
    -- we recalculate the ENTIRE day's POS revenue and UPSERT it.
    
    -- Get the VN date of the affected order (use paid_at if available, else created_at)
    v_date := to_char((COALESCE(NEW.paid_at, NEW.created_at) AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD');
    v_time := '23:59:00'; -- Default time for auto-sync record

    -- Recalculate total POS revenue for that specific day
    SELECT COALESCE(SUM(total), 0)
    INTO v_total_revenue
    FROM orders
    WHERE status = 'completed'
      AND to_char((COALESCE(paid_at, created_at) AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') = v_date;

    IF v_total_revenue > 0 THEN
        -- UPSERT the cash_transactions table
        -- We'll identify the auto-sync row by date and category = 'Bán hàng POS'
        
        -- Try to update first
        UPDATE cash_transactions
        SET amount = v_total_revenue
        WHERE date = v_date AND category = 'Bán hàng POS';
        
        -- If it didn't exist, insert it
        IF NOT FOUND THEN
            INSERT INTO cash_transactions (date, time, type, category, description, amount)
            VALUES (v_date, v_time, 'income', 'Bán hàng POS', 'Doanh thu POS (tự động)', v_total_revenue);
        END IF;
    ELSE
        -- If revenue dropped to 0 (e.g., all orders cancelled), delete the row
        DELETE FROM cash_transactions
        WHERE date = v_date AND category = 'Bán hàng POS';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_sync_pos_revenue ON orders;

-- Create trigger to auto-sync on status change or total change
CREATE TRIGGER trigger_sync_pos_revenue
AFTER INSERT OR UPDATE OF status, total, paid_at
ON orders
FOR EACH ROW
EXECUTE FUNCTION sync_pos_revenue_to_cashbook();

-- -----------------------------------------------------------------------------
-- Backfill existing data
-- This block loops through all past dates that have completed orders 
-- and creates/updates the initial "Bán hàng POS" rows in cash_transactions.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT 
            to_char((COALESCE(paid_at, created_at) AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') AS tz_date,
            SUM(total) AS daily_total
        FROM orders
        WHERE status = 'completed'
        GROUP BY 1
    ) LOOP
        UPDATE cash_transactions
        SET amount = r.daily_total
        WHERE date = r.tz_date AND category = 'Bán hàng POS';
        
        IF NOT FOUND THEN
            INSERT INTO cash_transactions (date, time, type, category, description, amount)
            VALUES (r.tz_date, '23:59:00', 'income', 'Bán hàng POS', 'Doanh thu POS (tự động)', r.daily_total);
        END IF;
    END LOOP;
END;
$$;
