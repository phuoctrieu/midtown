-- ============================================
-- 016: Remove Unnecessary Unit Price/Cost Triggers
-- ============================================
-- Problem: Lịch sử bán hàng (orders.total) có thể không khớp với hóa đơn
-- checkout_order vì trigger (enforce_price_on_order_item) tự động ghi đè
-- unit_price theo bảng menu_items tại thời điểm thanh toán. 
-- Điều này phá vỡ hóa đơn nếu giá món đã đổi hoặc bị thay đổi,
-- làm sai lệch doanh thu so với hóa đơn in ra.
-- 
-- Fix: Xoá các trigger tự động ép giá tiền. 
-- Mọi unit_price và unit_cost sẽ do application (frontend/checkout_order) truyền vào chính xác.

-- 1. Remove unit_price trigger
DROP TRIGGER IF EXISTS enforce_price_on_order_item ON order_items;
DROP FUNCTION IF EXISTS enforce_unit_price();

-- 2. Remove unit_cost trigger
DROP TRIGGER IF EXISTS trg_set_order_item_unit_cost ON order_items;
DROP FUNCTION IF EXISTS set_order_item_unit_cost();
