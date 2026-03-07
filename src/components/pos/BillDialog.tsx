'use client'

import { useRef } from 'react'
import { formatNumber, formatVND } from '@/lib/format'
import type { CartItem } from '@/types/database'
import { X, Printer } from 'lucide-react'

export interface BillData {
    orderNumber?: number | null
    items: CartItem[]
    subtotal: number
    discountAmount: number
    discountType: 'percent' | 'amount' | null
    discountValue: number
    total: number
    tableName: string | null
    paymentMethod: 'cash' | 'transfer'
    paidAt: string
}

interface BillDialogProps {
    data: BillData
    onClose: () => void
}

function formatBillDateTime(isoString: string) {
    const d = new Date(isoString)
    const date = new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Ho_Chi_Minh',
    }).format(d)
    const time = new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Ho_Chi_Minh',
    }).format(d)
    return { date, time }
}

export function BillDialog({ data, onClose }: BillDialogProps) {
    const billRef = useRef<HTMLDivElement>(null)
    const { date, time } = formatBillDateTime(data.paidAt)

    const handlePrint = () => {
        const content = billRef.current?.innerHTML
        if (!content) return

        const printWindow = window.open('', '_blank', 'width=400,height=700')
        if (!printWindow) return

        printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>MIDTOWN - Hóa đơn</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      color: #000;
      background: #fff;
      padding: 12px;
      width: 280px;
      margin: 0 auto;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .logo { font-size: 22px; font-weight: bold; letter-spacing: 6px; text-align: center; margin-bottom: 2px; }
    .tagline { font-size: 10px; text-align: center; letter-spacing: 1px; margin-bottom: 2px; }
    .address { font-size: 10px; text-align: center; color: #555; margin-bottom: 8px; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .divider-solid { border-top: 2px solid #000; margin: 6px 0; }
    .info-row { display: flex; justify-content: space-between; margin: 2px 0; font-size: 11px; }
    .item-row { margin: 4px 0; }
    .item-name { font-size: 12px; font-weight: 500; }
    .item-detail { display: flex; justify-content: space-between; font-size: 11px; color: #333; margin-top: 1px; padding-left: 8px; }
    .item-note { font-size: 10px; color: #666; padding-left: 8px; font-style: italic; }
    .total-row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 12px; }
    .total-final { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin: 4px 0; }
    .discount-row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 12px; color: #2D8A4E; }
    .payment-method { text-align: center; font-size: 11px; margin: 4px 0; }
    .thank-you { text-align: center; font-size: 11px; margin-top: 4px; line-height: 1.6; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  ${content}
  <script>window.onload = function() { window.print(); window.close(); }<\/script>
</body>
</html>`)
        printWindow.document.close()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-[360px] max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-800">Xem trước hóa đơn</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {/* Bill Preview */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <div
                        ref={billRef}
                        className="font-mono text-[13px] text-black"
                        style={{ fontFamily: "'Courier New', Courier, monospace" }}
                    >
                        {/* Logo */}
                        <div className="logo text-center font-bold text-[22px] tracking-[6px] mb-1">MIDTOWN</div>
                        <div className="tagline text-center text-[10px] tracking-widest mb-1">NHÀ HÀNG • RESTAURANT</div>
                        <div className="address text-center text-[10px] text-gray-500 mb-2">Hotline: 1800 xxxx</div>

                        <div className="divider-solid border-t-2 border-black my-2" />

                        {/* Order info */}
                        <div className="info-row flex justify-between text-[11px] my-1">
                            <span>Bàn:</span>
                            <span className="font-semibold">{data.tableName || 'Mang về'}</span>
                        </div>
                        {data.orderNumber && (
                            <div className="info-row flex justify-between text-[11px] my-1">
                                <span>Số HĐ:</span>
                                <span className="font-semibold">#{String(data.orderNumber).padStart(4, '0')}</span>
                            </div>
                        )}
                        <div className="info-row flex justify-between text-[11px] my-1">
                            <span>Ngày:</span>
                            <span>{date}</span>
                        </div>
                        <div className="info-row flex justify-between text-[11px] my-1">
                            <span>Giờ:</span>
                            <span>{time}</span>
                        </div>

                        <div className="divider border-t border-dashed border-black my-2" />

                        {/* Items */}
                        {data.items.map((item, idx) => (
                            <div key={idx} className="item-row my-1">
                                <div className="item-name font-medium text-[12px]">{item.name}</div>
                                <div className="item-detail flex justify-between text-[11px] text-gray-600 pl-2 mt-0.5">
                                    <span>{item.quantity} x {formatNumber(item.price)}₫</span>
                                    <span>{formatNumber(item.price * item.quantity)}₫</span>
                                </div>
                                {item.note && (
                                    <div className="item-note text-[10px] text-gray-500 pl-2 italic">📝 {item.note}</div>
                                )}
                            </div>
                        ))}

                        <div className="divider border-t border-dashed border-black my-2" />

                        {/* Totals */}
                        <div className="total-row flex justify-between text-[12px] my-1">
                            <span>Tạm tính:</span>
                            <span>{formatNumber(data.subtotal)}₫</span>
                        </div>
                        {data.discountAmount > 0 && (
                            <div className="discount-row flex justify-between text-[12px] text-green-700 my-1">
                                <span>
                                    Giảm giá{data.discountType === 'percent' ? ` (${data.discountValue}%)` : ''}:
                                </span>
                                <span>-{formatNumber(data.discountAmount)}₫</span>
                            </div>
                        )}

                        <div className="divider-solid border-t-2 border-black my-2" />

                        <div className="total-final flex justify-between font-bold text-[16px] my-1">
                            <span>TỔNG CỘNG:</span>
                            <span>{formatVND(data.total)}</span>
                        </div>

                        <div className="payment-method text-center text-[11px] mt-2">
                            Thanh toán: <strong>{data.paymentMethod === 'cash' ? '💵 Tiền mặt' : '🏦 Chuyển khoản'}</strong>
                        </div>

                        <div className="divider border-t border-dashed border-black my-3" />

                        <div className="thank-you text-center text-[11px] leading-relaxed">
                            <div>Cảm ơn quý khách đã ghé thăm!</div>
                            <div>Hẹn gặp lại quý khách.</div>
                            <div className="mt-1 text-[10px] text-gray-500">— MIDTOWN —</div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                        Đóng
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-sm font-semibold hover:bg-[#333] transition-colors flex items-center justify-center gap-2"
                    >
                        <Printer className="w-4 h-4" />
                        In Bill
                    </button>
                </div>
            </div>
        </div>
    )
}
