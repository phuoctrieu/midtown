import React from 'react'
import { formatVND, formatNumber } from '@/lib/format'

interface BillTemplateProps {
    orderId: string
    tableName: string
    staffName: string
    createdAt: string
    paymentMethod: 'cash' | 'transfer'
    subtotal: number
    discountAmount: number
    total: number
    items: {
        name: string
        quantity: number
        price: number
    }[]
}

export const BillTemplate = React.forwardRef<HTMLDivElement, BillTemplateProps>((props, ref) => {
    return (
        <div ref={ref} className="bg-white p-6 md:p-8 text-black font-mono text-sm max-w-sm mx-auto w-[80mm]">
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold uppercase mb-1">MIDTOWN</h1>
                <p className="text-xs">Số 123 Đường ABC, Quận XYZ, TP.HCM</p>
                <p className="text-xs">ĐT: 0123 456 789</p>
            </div>

            <div className="text-center mb-6">
                <h2 className="text-lg font-bold uppercase mb-2">HÓA ĐƠN THANH TOÁN</h2>
                <div className="text-left text-xs space-y-1">
                    <p>Mã HĐ: <span className="font-semibold">{props.orderId.substring(0, 8).toUpperCase()}</span></p>
                    <p>Ngày: {new Date(props.createdAt).toLocaleString('vi-VN')}</p>
                    <div className="flex justify-between">
                        <p>Thu ngân: {props.staffName}</p>
                        <p className="font-bold">{props.tableName}</p>
                    </div>
                </div>
            </div>

            <div className="border-b border-black border-dashed pb-2 mb-2">
                <div className="grid grid-cols-12 text-xs font-bold mb-1">
                    <div className="col-span-6">Tên món</div>
                    <div className="col-span-2 text-center">SL</div>
                    <div className="col-span-4 text-right">T.Tiền</div>
                </div>
            </div>

            <div className="space-y-2 mb-4 border-b border-black border-dashed pb-4">
                {props.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 text-xs">
                        <div className="col-span-6 pr-1 leading-tight">{item.name}</div>
                        <div className="col-span-2 text-center">{item.quantity}</div>
                        <div className="col-span-4 text-right">{formatNumber(item.price * item.quantity)}</div>
                    </div>
                ))}
            </div>

            <div className="space-y-1 mb-6 text-sm">
                <div className="flex justify-between">
                    <span>Tổng cộng:</span>
                    <span>{formatNumber(props.subtotal)}</span>
                </div>
                {props.discountAmount > 0 && (
                    <div className="flex justify-between">
                        <span>Giảm giá:</span>
                        <span>-{formatNumber(props.discountAmount)}</span>
                    </div>
                )}
                <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t border-black">
                    <span>THANH TOÁN:</span>
                    <span>{formatVND(props.total)}</span>
                </div>
            </div>

            <div className="text-center space-y-1 mb-8">
                <p className="text-xs italic">
                    Phương thức: {props.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}
                </p>
            </div>

            <div className="text-center mt-8">
                <p className="text-xs italic">Cảm ơn quý khách & Hẹn gặp lại!</p>
                <p className="text-[10px] mt-1 text-gray-500">Powered by Midtown POS</p>
            </div>
        </div>
    )
})

BillTemplate.displayName = 'BillTemplate'
