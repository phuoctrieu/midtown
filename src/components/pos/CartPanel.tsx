'use client'

import { useState } from 'react'
import type { CartItem } from '@/types/database'
import { formatNumber, formatVND } from '@/lib/format'
import { Minus, Plus, Trash2, MessageSquare } from 'lucide-react'
import { NoteDialog } from './NoteDialog'

interface CartPanelProps {
    items: CartItem[]
    subtotal: number
    discountAmount: number
    total: number
    discountType: 'percent' | 'amount' | null
    discountValue: number
    tableId: string | null
    tableName: string | null
    orderId: string | null
    tables: { table_id: string; name: string | null; table_number: number }[]
    onUpdateQuantity: (id: string, qty: number) => void
    onRemoveItem: (id: string) => void
    onSetNote: (id: string, note: string) => void
    onSetDiscount: (type: 'percent' | 'amount' | null, value: number) => void
    onSetTable: (id: string | null, name: string | null) => void
    onPayment: (method: 'cash' | 'transfer') => void
    onCancel: () => void
    isPaying: boolean
}

export function CartPanel({
    items,
    subtotal,
    discountAmount,
    total,
    discountType,
    discountValue,
    tableId,
    tableName,
    orderId,
    tables,
    onUpdateQuantity,
    onRemoveItem,
    onSetNote,
    onSetDiscount,
    onSetTable,
    onPayment,
    onCancel,
    isPaying,
}: CartPanelProps) {
    const [noteItem, setNoteItem] = useState<CartItem | null>(null)
    const [showDiscount, setShowDiscount] = useState(false)
    const [discountInput, setDiscountInput] = useState(discountValue.toString())
    const [discountTypeInput, setDiscountTypeInput] = useState<'percent' | 'amount'>(discountType || 'percent')

    const handleApplyDiscount = () => {
        const val = parseFloat(discountInput)
        if (!isNaN(val) && val >= 0) {
            onSetDiscount(discountTypeInput, val)
        }
        setShowDiscount(false)
    }

    const handleRemoveDiscount = () => {
        onSetDiscount(null, 0)
        setDiscountInput('0')
        setShowDiscount(false)
    }

    return (
        <>
            <div className="h-full flex flex-col bg-white border-l border-[#E2E8F0]">
                {/* Header */}
                <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center gap-3">
                    <div className="flex-1">
                        <h2 className="font-semibold text-[#0F172A]">
                            {orderId && tableName ? `${tableName}` : 'Hóa đơn'}
                        </h2>
                        {orderId && (
                            <p className="text-[10px] text-[#64748B] mt-0.5">
                                Đơn đang mở
                            </p>
                        )}
                    </div>
                    {/* Only show table selector when no active table order */}
                    {!orderId && (
                        <select
                            value={tableId || ''}
                            onChange={(e) => {
                                const t = tables.find(t => t.table_id === e.target.value)
                                onSetTable(t?.table_id || null, t?.name || (t?.table_number ? `Bàn ${t.table_number}` : null))
                            }}
                            className="text-sm border border-[#E2E8F0] rounded-lg px-2 py-1.5 bg-[#F8FAFC] text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#DC2626]"
                        >
                            <option value="">Mang về</option>
                            {tables.map(t => (
                                <option key={t.table_id} value={t.table_id}>
                                    {t.name || `Bàn ${t.table_number}`}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-[#64748B] py-16">
                            <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m7.5-5l2.5 5M17 18a1 1 0 100 2 1 1 0 000-2zm-8 0a1 1 0 100 2 1 1 0 000-2z" />
                            </svg>
                            <p className="text-sm">Chọn món để bắt đầu</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#E2E8F0]">
                            {items.map((item) => (
                                <div key={item.menuItemId} className="px-4 py-3 cart-item-enter">
                                    <div className="flex items-start gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[#0F172A] truncate">{item.name}</p>
                                            {item.note && (
                                                <p className="text-xs text-[#64748B] mt-0.5 italic">📝 {item.note}</p>
                                            )}
                                        </div>
                                        <p className="price-text text-sm text-[#DC2626] flex-shrink-0">
                                            {formatNumber(item.price * item.quantity)}₫
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        {/* Quantity controls */}
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => onUpdateQuantity(item.menuItemId, item.quantity - 1)}
                                                className="w-7 h-7 flex items-center justify-center rounded-full border border-[#E2E8F0] text-[#64748B] hover:border-[#DC2626] hover:text-[#DC2626] transition-colors"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                                            <button
                                                onClick={() => onUpdateQuantity(item.menuItemId, item.quantity + 1)}
                                                className="w-7 h-7 flex items-center justify-center rounded-full border border-[#E2E8F0] text-[#64748B] hover:border-[#DC2626] hover:text-[#DC2626] transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setNoteItem(item)}
                                            className="ml-1 p-1.5 text-[#64748B] hover:text-[#DC2626] rounded transition-colors"
                                            title="Ghi chú"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => onRemoveItem(item.menuItemId)}
                                            className="p-1.5 text-[#64748B] hover:text-[#D32F2F] rounded transition-colors ml-auto"
                                            title="Xóa"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Totals */}
                {items.length > 0 && (
                    <div className="border-t border-[#E2E8F0] px-4 py-3 space-y-1.5">
                        <div className="flex justify-between text-sm text-[#64748B]">
                            <span>Tạm tính</span>
                            <span className="price-text">{formatNumber(subtotal)}₫</span>
                        </div>

                        {/* Discount row */}
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-[#2D8A4E]">
                                <span>Giảm giá {discountType === 'percent' ? `(${discountValue}%)` : ''}</span>
                                <span className="price-text">-{formatNumber(discountAmount)}₫</span>
                            </div>
                        )}

                        <div className="flex justify-between font-bold text-base text-[#0F172A] pt-1 border-t border-[#E2E8F0]">
                            <span>TỔNG</span>
                            <span className="price-text text-[#DC2626]">{formatVND(total)}</span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="px-4 pb-4 space-y-2">
                    {items.length > 0 && (
                        <button
                            onClick={() => setShowDiscount(!showDiscount)}
                            className="w-full text-sm text-[#64748B] border border-[#E2E8F0] rounded-lg py-1.5 hover:border-[#DC2626] hover:text-[#DC2626] transition-colors"
                        >
                            {discountAmount > 0 ? `Giảm giá: -${formatNumber(discountAmount)}₫` : '+ Thêm giảm giá'}
                        </button>
                    )}

                    {/* Discount inputs */}
                    {showDiscount && (
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 space-y-2">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setDiscountTypeInput('percent')}
                                    className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors ${discountTypeInput === 'percent' ? 'bg-[#DC2626] text-white' : 'bg-white border border-[#E2E8F0] text-[#64748B]'
                                        }`}
                                >
                                    Phần trăm (%)
                                </button>
                                <button
                                    onClick={() => setDiscountTypeInput('amount')}
                                    className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors ${discountTypeInput === 'amount' ? 'bg-[#DC2626] text-white' : 'bg-white border border-[#E2E8F0] text-[#64748B]'
                                        }`}
                                >
                                    Số tiền (₫)
                                </button>
                            </div>
                            <input
                                type="number"
                                value={discountInput}
                                onChange={(e) => setDiscountInput(e.target.value)}
                                placeholder={discountTypeInput === 'percent' ? 'VD: 10' : 'VD: 50000'}
                                className="w-full border border-[#E2E8F0] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#DC2626]"
                            />
                            <div className="flex gap-2">
                                <button onClick={handleRemoveDiscount} className="flex-1 text-xs text-[#D32F2F] py-1.5 border border-[#E2E8F0] rounded-md hover:bg-red-50">
                                    Bỏ giảm giá
                                </button>
                                <button onClick={handleApplyDiscount} className="flex-1 text-xs bg-[#DC2626] text-white py-1.5 rounded-md">
                                    Áp dụng
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Payment buttons */}
                    {items.length > 0 ? (
                        <div className="space-y-2 pt-1">
                            <button
                                onClick={() => onPayment('cash')}
                                disabled={isPaying}
                                className="w-full bg-[#2D8A4E] hover:bg-[#236B3D] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                💵 Tiền mặt — {formatVND(total)}
                            </button>
                            <button
                                onClick={() => onPayment('transfer')}
                                disabled={isPaying}
                                className="w-full bg-[#1E40AF] hover:bg-[#1E3A8A] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                🏦 Chuyển khoản — {formatVND(total)}
                            </button>
                            <button
                                onClick={onCancel}
                                className="w-full text-[#D32F2F] border border-[#D32F2F]/30 hover:bg-red-50 font-medium py-2 rounded-xl transition-colors text-sm"
                            >
                                🗑️ Hủy hóa đơn
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Note Dialog */}
            {noteItem && (
                <NoteDialog
                    item={noteItem}
                    onSave={(note: string) => {
                        onSetNote(noteItem.menuItemId, note)
                        setNoteItem(null)
                    }}
                    onClose={() => setNoteItem(null)}
                />
            )}
        </>
    )
}
