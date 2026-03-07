'use client'

import { useQRRequests, useProcessQRRequest } from '@/hooks/useOrders'
import { formatNumber } from '@/lib/format'
import { Check, X, Bell } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

export function QRRequestsPanel() {
    const { data: requests = [], isLoading } = useQRRequests()
    const processRequest = useProcessQRRequest()

    const handleProcess = async (requestId: string, action: 'accepted' | 'rejected') => {
        try {
            await processRequest.mutateAsync({ requestId, action })
            toast.success(action === 'accepted' ? 'Đã thêm món vào bàn' : 'Đã từ chối yêu cầu')
        } catch (error) {
            toast.error('Lỗi: ' + (error as Error).message)
        }
    }

    if (isLoading) {
        return (
            <div className="p-4 flex justify-center">
                <div className="w-6 h-6 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (requests.length === 0) {
        return null // Don't show anything if there are no requests
    }

    return (
        <div className="bg-white border-b border-[#E2E8F0] p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-3 px-1">
                <Bell className="w-4 h-4 text-[#DC2626]" />
                <h3 className="font-semibold text-sm text-[#0F172A]">
                    Yêu cầu từ mã QR ({requests.length})
                </h3>
            </div>

            <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {requests.map((req) => (
                    <div
                        key={req.id}
                        className="flex-shrink-0 w-72 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-[#DC2626] bg-[#DC2626]/10 px-2 py-0.5 rounded-md">
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {(req.tables as any)?.name || `Bàn ${(req.tables as any)?.table_number}`}
                                </span>
                                <span className="text-[10px] text-[#64748B]">
                                    {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            <div className="flex gap-2 items-center mb-2">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {((req.menu_items as any)?.image_url) ? (
                                    <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-[#E2E8F0]">
                                        <Image
                                            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                            src={(req.menu_items as any).image_url}
                                            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                            alt={(req.menu_items as any)?.name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 bg-[#E2E8F0] rounded-lg flex items-center justify-center flex-shrink-0 text-sm">🍽️</div>
                                )}
                                <div className="flex-1 min-w-0">
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    <p className="text-sm font-medium text-[#0F172A] truncate">{(req.menu_items as any)?.name}</p>
                                    <p className="text-xs text-[#64748B]">
                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                        SL: <span className="font-bold text-[#0F172A]">{req.quantity}</span> × {formatNumber((req.menu_items as any)?.price || 0)}đ
                                    </p>
                                </div>
                            </div>

                            {req.note && (
                                <p className="text-xs text-[#64748B] italic bg-white p-1.5 rounded border border-[#E2E8F0] mb-2">
                                    "{req.note}"
                                </p>
                            )}
                        </div>

                        <div className="flex gap-2 mt-auto pt-2">
                            <button
                                onClick={() => handleProcess(req.id, 'rejected')}
                                disabled={processRequest.isPending}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#64748B] hover:bg-[#EEF2F7] hover:text-[#0F172A] transition-colors"
                            >
                                <X className="w-3.5 h-3.5" /> Từ chối
                            </button>
                            <button
                                onClick={() => handleProcess(req.id, 'accepted')}
                                disabled={processRequest.isPending}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#DC2626] text-white text-xs font-medium hover:bg-[#B91C1C] transition-colors"
                            >
                                <Check className="w-3.5 h-3.5" /> Nhận đơn
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
