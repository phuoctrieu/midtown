'use client'

import { useState } from 'react'
import type { CartItem } from '@/types/database'

interface NoteDialogProps {
    item: CartItem
    onSave: (note: string) => void
    onClose: () => void
}

const SUGGESTIONS = ['ít cay', 'nhiều cay', 'thêm đá', 'ít đá', 'không đường', 'không hành', 'ít ngọt', 'nhiều rau', 'giòn']

export function NoteDialog({ item, onSave, onClose }: NoteDialogProps) {
    const [note, setNote] = useState(item.note)

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
                <div className="p-5">
                    <h3 className="font-semibold text-[#0F172A] mb-1">Ghi chú món</h3>
                    <p className="text-sm text-[#64748B] mb-4">{item.name}</p>

                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Ví dụ: ít cay, không hành..."
                        rows={3}
                        className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626] resize-none"
                        autoFocus
                    />

                    {/* Quick suggestions */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {SUGGESTIONS.map((s) => (
                            <button
                                key={s}
                                onClick={() => setNote(prev => prev ? `${prev}, ${s}` : s)}
                                className="px-2.5 py-1 text-xs bg-[#EEF2F7] text-[#64748B] rounded-full hover:bg-[#E2E8F0] transition-colors"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="border-t border-[#E2E8F0] p-4 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 text-sm text-[#64748B] border border-[#E2E8F0] rounded-xl hover:bg-[#EEF2F7] transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={() => onSave(note || '')}
                        className="flex-1 py-2.5 text-sm bg-[#DC2626] text-white rounded-xl hover:bg-[#B91C1C] font-medium transition-colors"
                    >
                        Lưu ghi chú
                    </button>
                </div>
            </div>
        </div>
    )
}
