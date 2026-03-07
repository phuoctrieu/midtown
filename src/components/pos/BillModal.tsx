'use client'

import React, { useRef } from 'react'
import { Printer, X } from 'lucide-react'
import { BillTemplate } from './BillTemplate'

interface BillModalProps {
    isOpen: boolean
    onClose: () => void
    billData: React.ComponentProps<typeof BillTemplate> | null
}

export function BillModal({ isOpen, onClose, billData }: BillModalProps) {
    const printRef = useRef<HTMLDivElement>(null)

    if (!isOpen || !billData) return null

    const handlePrint = () => {
        // We use window.print() but wrap the component in a print media query style
        window.print()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:bg-white print:p-0">
            <div className="bg-[#F0EDE6] rounded-xl shadow-xl w-full max-w-sm flex flex-col max-h-screen overflow-hidden print:shadow-none print:w-full print:max-w-none print:h-fit">

                {/* Header (Hidden in print) */}
                <div className="flex items-center justify-between p-4 border-b border-[#E0DCD4] bg-white rounded-t-xl print:hidden flex-shrink-0">
                    <h2 className="font-semibold text-[#1A1A1A]">Hóa đơn</h2>
                    <button
                        onClick={onClose}
                        className="text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors p-1"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Bill Content */}
                <div className="p-4 overflow-y-auto print:p-0 print:overflow-visible flex-1">
                    <div className="print-section">
                        <BillTemplate ref={printRef} {...billData} />
                    </div>
                </div>

                {/* Actions (Hidden in print) */}
                <div className="p-4 bg-white border-t border-[#E0DCD4] rounded-b-xl flex gap-3 print:hidden flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 font-medium text-[#6B6B6B] border border-[#E0DCD4] rounded-lg hover:bg-[#FAFAF8] transition-colors"
                    >
                        Đóng
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 flex items-center justify-center gap-2 py-2 font-medium text-white bg-[#D4553A] rounded-lg hover:bg-[#B8432C] transition-colors"
                    >
                        <Printer className="w-4 h-4" /> In Bill
                    </button>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-section, .print-section * {
                        visibility: visible;
                    }
                    .print-section {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    /* Optional: Set page size specifically for receipt printers if needed */
                    @page {
                        margin: 0;
                        size: 80mm auto;
                    }
                }
            `}</style>
        </div>
    )
}
