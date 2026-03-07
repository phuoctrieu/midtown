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
                    ? 'bg-[#D4553A] text-white shadow-sm'
                    : 'bg-white text-[#6B6B6B] border border-[#E0DCD4] hover:border-[#D4553A] hover:text-[#D4553A]'
                    }`}
            >
                Tất cả
            </button>
            {categories.map((cat) => (
                <button
                    key={cat.id}
                    onClick={() => onSelect(cat.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${selected === cat.id
                        ? 'bg-[#D4553A] text-white shadow-sm'
                        : 'bg-white text-[#6B6B6B] border border-[#E0DCD4] hover:border-[#D4553A] hover:text-[#D4553A]'
                        }`}
                >
                    {cat.name}
                </button>
            ))}
        </div>
    )
}
