'use client'

import Image from 'next/image'
import type { MenuItem } from '@/types/database'
import { formatNumber } from '@/lib/format'
import { Plus } from 'lucide-react'

interface MenuGridProps {
    items: MenuItem[]
    onAddItem: (item: MenuItem) => void
    cartItemIds: Set<string>
}

export function MenuGrid({ items, onAddItem, cartItemIds }: MenuGridProps) {
    if (items.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-[#64748B]">
                <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">Không có món nào</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map((item) => {
                const inCart = cartItemIds.has(item.id)
                return (
                    <button
                        key={item.id}
                        onClick={() => onAddItem(item)}
                        className={`menu-card tap-highlight bg-white rounded-xl border text-left overflow-hidden transition-all ${inCart
                                ? 'border-[#DC2626] ring-2 ring-[#DC2626]/20'
                                : 'border-[#E2E8F0] hover:border-[#DC2626]/50'
                            }`}
                    >
                        {/* Image */}
                        <div className="relative h-24 bg-[#EEF2F7] overflow-hidden">
                            {item.image_url ? (
                                <Image
                                    src={item.image_url}
                                    alt={item.name}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 50vw, 33vw"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <svg className="w-10 h-10 text-[#DC2626]/30" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                                    </svg>
                                </div>
                            )}
                            {inCart && (
                                <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#DC2626] rounded-full flex items-center justify-center">
                                    <Plus className="w-3 h-3 text-white" />
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="p-2.5">
                            <p className="text-sm font-medium text-[#0F172A] line-clamp-2 leading-tight mb-1">{item.name}</p>
                            <p className="price-text text-[#DC2626] text-sm">{formatNumber(item.price)}₫</p>
                        </div>
                    </button>
                )
            })}
        </div>
    )
}
