'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2, QrCode, RefreshCw } from 'lucide-react'
import { useTables } from '@/hooks/useTables'
import { QRCodeCanvas } from 'qrcode.react'

export default function SettingsPage() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    const { data: tables = [], isLoading } = useTables()
    const [appUrl, setAppUrl] = useState(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    const [showAddTable, setShowAddTable] = useState(false)
    const [newTableName, setNewTableName] = useState('')
    const [newTableNumber, setNewTableNumber] = useState('')
    const [qrPreview, setQrPreview] = useState<{ token: string; name: string } | null>(null)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setAppUrl(window.location.origin)
        }
    }, [])

    // Add table
    const addTable = useMutation({
        mutationFn: async () => {
            if (!newTableName.trim()) throw new Error('Chưa nhập tên bàn')
            if (!newTableNumber) throw new Error('Chưa nhập số bàn')
            const { error } = await supabase.from('tables').insert({
                name: newTableName.trim(),
                table_number: parseInt(newTableNumber),
                is_active: true,
            })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] })
            toast.success('Đã thêm bàn')
            setShowAddTable(false)
            setNewTableName('')
            setNewTableNumber('')
        },
        onError: (e: any) => {
            if (e.code === '23505' && e.message.includes('tables_table_number_key')) {
                toast.error('Số bàn này đã tồn tại, vui lòng nhập số khác')
            } else {
                toast.error(e.message || 'Có lỗi xảy ra khi thêm bàn')
            }
        },
    })

    // Toggle table active
    const toggleTable = useMutation({
        mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
            const { error } = await supabase.from('tables').update({ is_active }).eq('id', id)
            if (error) throw error
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] }),
    })

    // Delete table
    const deleteTable = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('tables').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] })
            toast.success('Đã xóa bàn')
        },
        onError: () => toast.error('Không thể xóa bàn (có thể đang có đơn)'),
    })

    // Regenerate QR token
    const regenQR = useMutation({
        mutationFn: async (id: string) => {
            const newToken = crypto.randomUUID()
            const { error } = await supabase.from('tables').update({ qr_token: newToken }).eq('id', id)
            if (error) throw error
            return newToken
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] })
            toast.success('Đã tạo lại QR token')
        },
    })

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#0F172A]">⚙️ Bàn & Cài đặt</h1>
                <p className="text-sm text-[#64748B] mt-1">Quản lý bàn và mã QR</p>
            </div>

            {/* Table Management */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
                    <h2 className="font-semibold text-[#0F172A]">Danh sách bàn</h2>
                    <button onClick={() => setShowAddTable(true)}
                        className="flex items-center gap-1.5 text-sm bg-[#DC2626] text-white px-3 py-2 rounded-lg hover:bg-[#B91C1C] transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Thêm bàn
                    </button>
                </div>

                {isLoading ? (
                    <div className="p-5 space-y-3">
                        {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-[#EEF2F7] rounded-lg animate-pulse" />)}
                    </div>
                ) : (
                    <div className="divide-y divide-[#E2E8F0]">
                        {tables.map(table => (
                            <div key={table.id} className="flex items-center gap-4 px-5 py-3.5">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-[#0F172A]">{table.name || `Bàn ${table.table_number}`}</p>
                                    <p className="text-xs text-[#64748B] font-mono mt-0.5 truncate max-w-xs">
                                        Token: {table.qr_token?.slice(0, 16)}...
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setQrPreview({ token: table.qr_token || '', name: table.name || `Bàn ${table.table_number}` })}
                                        className="p-2 text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors"
                                        title="Xem QR"
                                    >
                                        <QrCode className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => regenQR.mutate(table.id)}
                                        className="p-2 text-[#64748B] hover:text-[#E8A317] rounded-lg transition-colors"
                                        title="Tạo lại QR"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => toggleTable.mutate({ id: table.id, is_active: !table.is_active })}
                                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${table.is_active ? 'bg-green-100 text-green-700' : 'bg-[#EEF2F7] text-[#64748B]'
                                            }`}
                                    >
                                        {table.is_active ? '✓ Active' : 'Tắt'}
                                    </button>
                                    <button
                                        onClick={() => { if (confirm('Xóa bàn này?')) deleteTable.mutate(table.id) }}
                                        className="p-2 text-[#64748B] hover:text-[#D32F2F] hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {tables.length === 0 && (
                            <p className="text-center text-[#64748B] text-sm py-10">Chưa có bàn nào. Thêm bàn đầu tiên!</p>
                        )}
                    </div>
                )}
            </div>

            {/* Add Table Modal */}
            {showAddTable && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
                        <h3 className="font-semibold text-[#0F172A] mb-4">Thêm bàn mới</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium text-[#0F172A] block mb-1.5">Tên bàn *</label>
                                <input type="text" value={newTableName} onChange={e => setNewTableName(e.target.value)}
                                    placeholder="VD: Bàn 1, Bàn VIP 2..."
                                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-[#0F172A] block mb-1.5">Số bàn</label>
                                <input type="number" value={newTableNumber} onChange={e => setNewTableNumber(e.target.value)}
                                    placeholder="1"
                                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setShowAddTable(false)}
                                className="flex-1 py-2.5 text-sm border border-[#E2E8F0] rounded-xl hover:bg-[#EEF2F7] text-[#64748B]">Hủy</button>
                            <button onClick={() => addTable.mutate()} disabled={addTable.isPending}
                                className="flex-1 py-2.5 text-sm bg-[#DC2626] text-white rounded-xl hover:bg-[#B91C1C] font-medium disabled:opacity-60">
                                {addTable.isPending ? 'Đang thêm...' : 'Thêm bàn'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Preview Modal */}
            {qrPreview && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-xs shadow-xl p-6 text-center">
                        <h3 className="font-semibold text-[#0F172A] mb-4">{qrPreview.name}</h3>
                        <div className="flex justify-center mb-4">
                            <QRCodeCanvas
                                value={`${appUrl}/order/${qrPreview.token}`}
                                size={180}
                                level="M"
                                fgColor="#0F172A"
                            />
                        </div>
                        <p className="text-xs text-[#64748B] mb-4 break-all font-mono">
                            {appUrl}/order/{qrPreview.token}
                        </p>
                        <button onClick={() => setQrPreview(null)}
                            className="w-full py-2.5 text-sm border border-[#E2E8F0] rounded-xl hover:bg-[#EEF2F7] text-[#64748B]">Đóng</button>
                    </div>
                </div>
            )}
        </div>
    )
}
