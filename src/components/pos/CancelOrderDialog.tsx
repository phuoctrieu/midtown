'use client'

import { useState } from 'react'

interface CancelOrderDialogProps {
    onConfirm: (reason: string) => void
    onClose: () => void
    isLoading?: boolean
}

export function CancelOrderDialog({ onConfirm, onClose, isLoading }: CancelOrderDialogProps) {
    const [reason, setReason] = useState('')

    const handleConfirm = () => {
        if (reason.trim().length < 10) return
        onConfirm(reason.trim())
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
                <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-[#D32F2F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-[#1A1A1A]">Hủy hóa đơn</h3>
                            <p className="text-xs text-[#6B6B6B]">Nhập lý do để xác nhận hủy</p>
                        </div>
                    </div>

                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Lý do hủy hóa đơn (tối thiểu 10 ký tự)..."
                        rows={3}
                        className="w-full border border-[#E0DCD4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F] resize-none"
                        autoFocus
                    />
                    <p className="text-xs text-[#6B6B6B] mt-1">{reason.length}/10 ký tự tối thiểu</p>
                </div>

                <div className="border-t border-[#E0DCD4] p-4 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 py-2.5 text-sm text-[#6B6B6B] border border-[#E0DCD4] rounded-xl hover:bg-[#F0EDE6] transition-colors"
                    >
                        Quay lại
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={reason.trim().length < 10 || isLoading}
                        className="flex-1 py-2.5 text-sm bg-[#D32F2F] text-white rounded-xl hover:bg-[#B71C1C] font-medium transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Đang hủy...' : 'Xác nhận hủy'}
                    </button>
                </div>
            </div>
        </div>
    )
}
