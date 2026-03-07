'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatVND, formatDateTime } from '@/lib/format'
import { BillModal } from '@/components/pos/BillModal'

const STATUS_MAP: Record<string, { label: string; class: string }> = {
    completed: { label: 'Hoàn thành', class: 'badge-completed' },
    cancelled: { label: 'Đã hủy', class: 'badge-cancelled' },
    confirmed: { label: 'Xác nhận', class: 'badge-confirmed' },
    pending: { label: 'Chờ', class: 'badge-pending' },
}

export default function OrdersPage() {
    const supabase = createClient()
    const [page, setPage] = useState(0)
    const [statusFilter, setStatusFilter] = useState('')
    const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
    const [showBill, setShowBill] = useState(false)
    const PAGE_SIZE = 20

    const { data: orders = [], isLoading } = useQuery({
        queryKey: ['admin_orders', page, statusFilter],
        queryFn: async () => {
            let query = supabase
                .from('orders')
                .select(`
          id, order_number, status, total, subtotal, discount_amount, payment_method,
          paid_at, created_at, cancel_reason, note, source,
          tables(name, table_number),
          profiles!orders_staff_id_fkey(full_name)
        `)
                .order('created_at', { ascending: false })
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

            if (statusFilter) query = query.eq('status', statusFilter)

            const { data, error } = await query
            if (error) throw error
            return data || []
        },
    })

    const { data: selectedOrderDetail } = useQuery({
        queryKey: ['order_detail', selectedOrder],
        queryFn: async () => {
            if (!selectedOrder) return null
            const { data, error } = await supabase
                .from('orders')
                .select(`
          *, tables(*), profiles!orders_staff_id_fkey(*),
          order_items(*, menu_items(name, price))
        `)
                .eq('id', selectedOrder)
                .single()
            if (error) throw error
            return data
        },
        enabled: !!selectedOrder,
    })

    // Prepare data for the BillModal
    const billData = selectedOrderDetail ? {
        orderId: selectedOrderDetail.id,
        tableName: selectedOrderDetail.tables ? (selectedOrderDetail.tables.name || `Bàn ${selectedOrderDetail.tables.table_number}`) : 'Mang về',
        staffName: selectedOrderDetail.profiles?.full_name || selectedOrderDetail.profiles?.username || 'Thu ngân',
        createdAt: selectedOrderDetail.created_at,
        paymentMethod: selectedOrderDetail.payment_method as 'cash' | 'transfer',
        subtotal: selectedOrderDetail.subtotal,
        discountAmount: selectedOrderDetail.discount_amount,
        total: selectedOrderDetail.total,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: (selectedOrderDetail.order_items || []).map((item: any) => ({
            name: item.menu_items?.name || 'Món',
            quantity: item.quantity,
            price: item.unit_price,
        }))
    } : null

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#1A1A1A]">📋 Lịch sử hóa đơn</h1>
                    <p className="text-sm text-[#6B6B6B] mt-1">Tất cả đơn hàng của nhà hàng</p>
                </div>
                <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setPage(0) }}
                    className="border border-[#E0DCD4] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#D4553A]"
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                    <option value="confirmed">Xác nhận</option>
                </select>
            </div>

            <div className="bg-white rounded-xl border border-[#E0DCD4] shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-[#FAFAF8] border-b border-[#E0DCD4]">
                        <tr>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase">#</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase hidden sm:table-cell">Thời gian</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase hidden md:table-cell">Bàn / NV</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase">Trạng thái</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase">Tổng tiền</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0DCD4]">
                        {isLoading ? (
                            [...Array(8)].map((_, i) => (
                                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-[#F0EDE6] rounded animate-pulse" /></td></tr>
                            ))
                        ) : orders.length === 0 ? (
                            <tr><td colSpan={5} className="text-center text-[#6B6B6B] text-sm py-12">Không có đơn nào</td></tr>
                        ) : (
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            orders.map((order: any) => {
                                const statusInfo = STATUS_MAP[order.status] || { label: order.status, class: '' }
                                const tableInfo = Array.isArray(order.tables) ? order.tables[0] : order.tables
                                const profileInfo = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles
                                return (
                                    <tr
                                        key={order.id}
                                        onClick={() => setSelectedOrder(order.id)}
                                        className="hover:bg-[#FAFAF8] cursor-pointer transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-sm font-medium">#{order.order_number}</span>
                                            {order.source === 'qr' && (
                                                <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">QR</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-[#6B6B6B] hidden sm:table-cell">
                                            {formatDateTime(order.created_at)}
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <div className="text-sm text-[#1A1A1A]">
                                                {tableInfo ? (tableInfo.name || `Bàn ${tableInfo.table_number}`) : 'Mang về'}
                                            </div>
                                            <div className="text-xs text-[#6B6B6B]">{profileInfo?.full_name}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusInfo.class}`}>
                                                {statusInfo.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="price-text font-semibold text-sm">{formatVND(order.total)}</span>
                                            {order.payment_method && (
                                                <div className="text-xs text-[#6B6B6B]">{order.payment_method === 'cash' ? '💵' : '🏦'}</div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
                <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-4 py-2 text-sm border border-[#E0DCD4] rounded-lg hover:bg-[#F0EDE6] disabled:opacity-40 transition-colors"
                >
                    ← Trước
                </button>
                <span className="text-sm text-[#6B6B6B]">Trang {page + 1}</span>
                <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={orders.length < PAGE_SIZE}
                    className="px-4 py-2 text-sm border border-[#E0DCD4] rounded-lg hover:bg-[#F0EDE6] disabled:opacity-40 transition-colors"
                >
                    Tiếp →
                </button>
            </div>

            {/* Order Detail Modal */}
            {selectedOrder && selectedOrderDetail && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[80vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-[#E0DCD4]">
                            <h2 className="font-semibold text-[#1A1A1A]">Hóa đơn #{selectedOrderDetail.order_number}</h2>
                            <div className="flex items-center gap-2">
                                {['completed', 'paid'].includes(selectedOrderDetail.status) && (
                                    <button
                                        onClick={() => setShowBill(true)}
                                        className="px-3 py-1 bg-[#D4553A] text-white text-xs font-semibold rounded hover:bg-[#B8432C] transition-colors"
                                    >
                                        In Bill
                                    </button>
                                )}
                                <button onClick={() => setSelectedOrder(null)} className="p-1.5 text-[#6B6B6B] hover:text-[#1A1A1A]">✕</button>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-[#6B6B6B] text-xs">Thời gian</p>
                                    <p className="font-medium">{formatDateTime(selectedOrderDetail.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-[#6B6B6B] text-xs">Nhân viên</p>
                                    <p className="font-medium">{selectedOrderDetail.profiles?.full_name || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[#6B6B6B] text-xs">Bàn</p>
                                    <p className="font-medium">
                                        {selectedOrderDetail.tables ? (selectedOrderDetail.tables.name || `Bàn ${selectedOrderDetail.tables.table_number}`) : 'Mang về'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[#6B6B6B] text-xs">Thanh toán</p>
                                    <p className="font-medium">{selectedOrderDetail.payment_method === 'cash' ? '💵 Tiền mặt' : selectedOrderDetail.payment_method === 'transfer' ? '🏦 Chuyển khoản' : '—'}</p>
                                </div>
                                {selectedOrderDetail.paid_at && (
                                    <div>
                                        <p className="text-[#6B6B6B] text-xs">Thanh toán lúc</p>
                                        <p className="font-medium">{formatDateTime(selectedOrderDetail.paid_at)}</p>
                                    </div>
                                )}
                                {selectedOrderDetail.source && (
                                    <div>
                                        <p className="text-[#6B6B6B] text-xs">Nguồn</p>
                                        <p className="font-medium">{selectedOrderDetail.source === 'qr' ? '📱 QR Code' : '💻 POS'}</p>
                                    </div>
                                )}
                            </div>

                            {/* Items */}
                            <div>
                                <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">Chi tiết món</h3>
                                <div className="space-y-2">
                                    {selectedOrderDetail.order_items?.map((item: { id: string; quantity: number; unit_price: number; note: string | null; menu_items?: { name: string } }) => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                            <div>
                                                <span className="font-medium">{item.menu_items?.name}</span>
                                                <span className="text-[#6B6B6B] ml-2">x{item.quantity}</span>
                                                {item.note && <div className="text-xs text-[#6B6B6B] italic">📝 {item.note}</div>}
                                            </div>
                                            <span className="price-text">{formatVND(item.unit_price * item.quantity)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="border-t border-[#E0DCD4] pt-3 space-y-1.5 text-sm">
                                <div className="flex justify-between text-[#6B6B6B]">
                                    <span>Tạm tính</span>
                                    <span className="price-text">{formatVND(selectedOrderDetail.subtotal)}</span>
                                </div>
                                {selectedOrderDetail.discount_amount > 0 && (
                                    <div className="flex justify-between text-[#2D8A4E]">
                                        <span>Giảm giá</span>
                                        <span className="price-text">-{formatVND(selectedOrderDetail.discount_amount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-[#1A1A1A] pt-1">
                                    <span>TỔNG</span>
                                    <span className="price-text text-[#D4553A]">{formatVND(selectedOrderDetail.total)}</span>
                                </div>
                            </div>

                            {selectedOrderDetail.cancel_reason && (
                                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                                    <p className="text-xs text-[#D32F2F] font-medium">Lý do hủy:</p>
                                    <p className="text-sm text-[#D32F2F] mt-1">{selectedOrderDetail.cancel_reason}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Bill Receipt Modal */}
            <BillModal
                isOpen={showBill}
                onClose={() => setShowBill(false)}
                billData={billData}
            />
        </div>
    )
}
