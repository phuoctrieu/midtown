-- ============================================
-- 014: Staff RLS for cash_transactions
-- ============================================

-- Allow staff to select transactions
CREATE POLICY "staff_select" ON cash_transactions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'staff'
        )
    );

-- Allow staff to insert new transactions
CREATE POLICY "staff_insert" ON cash_transactions
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'staff'
        )
    );
