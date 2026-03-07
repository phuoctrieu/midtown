'use client'

import type { Category } from '@/types/database'

interface CategoryTabsProps {
    categories: Category[]
    selected: string | null
    onSelect: (id: string | null) => void
}

export function CategoryTabs({ categories, selected, onSelect }: CategoryTabsProps) {
    return (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
                onClick={() => onSelect(null)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${selected === null
                    ? 'bg-[#DC2626] text-white shadow-sm'
                    : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:border-[#DC2626] hover:text-[#DC2626]'
                    }`}
            >
                Tất cả
            </button>
            {categories.map((cat) => (
                <button
                    key={cat.id}
                    onClick={() => onSelect(cat.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${selected === cat.id
                        ? 'bg-[#DC2626] text-white shadow-sm'
                        : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:border-[#DC2626] hover:text-[#DC2626]'
                        }`}
                >
                    {cat.name}
                </button>
            ))}
        </div>
    )
}
