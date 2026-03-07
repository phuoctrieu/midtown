'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatNumber } from '@/lib/format'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import type { MenuItem, Category } from '@/types/database'

interface MenuFormData {
    name: string
    category_id: string
    price: string
    cost_price: string
    description: string
    image_url: string
    is_available: boolean
}

const EMPTY_FORM: MenuFormData = {
    name: '',
    category_id: '',
    price: '',
    cost_price: '',
    description: '',
    image_url: '',
    is_available: true,
}

export default function MenuPage() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    const [showForm, setShowForm] = useState(false)
    const [editItem, setEditItem] = useState<MenuItem | null>(null)
    const [form, setForm] = useState<MenuFormData>(EMPTY_FORM)
    const [filterCategory, setFilterCategory] = useState<string>('')
    const [searchQuery, setSearchQuery] = useState('')
    const [uploading, setUploading] = useState(false)

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            if (!e.target.files || e.target.files.length === 0) return
            setUploading(true)
            const file = e.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('menu-images')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('menu-images')
                .getPublicUrl(fileName)

            setForm(f => ({ ...f, image_url: publicUrl }))
            toast.success('Đã tải ảnh lên')
        } catch (error: any) {
            toast.error('Lỗi tải ảnh: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    // Fetch categories
    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ['admin_categories'],
        queryFn: async () => {
            const { data, error } = await supabase.from('categories').select('*').order('sort_order')
            if (error) throw error
            return data || []
        },
    })

    // Fetch menu items
    const { data: menuItems = [], isLoading } = useQuery<MenuItem[]>({
        queryKey: ['admin_menu_items'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('menu_items')
                .select('*, categories(*)')
                .order('sort_order')
            if (error) throw error
            return data || []
        },
    })

    // Create/Update mutation
    const saveMutation = useMutation({
        mutationFn: async (data: MenuFormData) => {
            const price = parseInt(data.price)
            if (isNaN(price) || price < 0) throw new Error('Giá bán không hợp lệ')
            const cost_price = parseInt(data.cost_price)
            if (data.cost_price && (isNaN(cost_price) || cost_price < 0)) throw new Error('Giá vốn không hợp lệ')
            if (!data.name.trim()) throw new Error('Chưa nhập tên món')
            if (!data.category_id) throw new Error('Chưa chọn danh mục')

            const payload = {
                name: data.name.trim(),
                category_id: data.category_id,
                price,
                cost_price: isNaN(cost_price) ? 0 : cost_price,
                description: data.description || null,
                image_url: data.image_url || null,
                is_available: data.is_available,
            }

            if (editItem) {
                const { error } = await supabase.from('menu_items').update(payload).eq('id', editItem.id)
                if (error) throw error
            } else {
                const { error } = await supabase.from('menu_items').insert(payload)
                if (error) throw error
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin_menu_items'] })
            queryClient.invalidateQueries({ queryKey: ['menu_items'] })
            toast.success(editItem ? 'Đã cập nhật món' : 'Đã thêm món mới')
            setShowForm(false)
            setEditItem(null)
            setForm(EMPTY_FORM)
        },
        onError: (e) => toast.error(e.message),
    })

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('menu_items').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin_menu_items'] })
            queryClient.invalidateQueries({ queryKey: ['menu_items'] })
            toast.success('Đã xóa món')
        },
        onError: (e) => toast.error('Lỗi: ' + e.message),
    })

    // Toggle availability
    const toggleAvail = useMutation({
        mutationFn: async ({ id, is_available }: { id: string; is_available: boolean }) => {
            const { error } = await supabase.from('menu_items').update({ is_available }).eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin_menu_items'] })
            queryClient.invalidateQueries({ queryKey: ['menu_items'] })
        },
    })

    const openEdit = (item: MenuItem) => {
        setEditItem(item)
        setForm({
            name: item.name,
            category_id: item.category_id,
            price: item.price.toString(),
            cost_price: item.cost_price?.toString() || '0',
            description: item.description || '',
            image_url: item.image_url || '',
            is_available: item.is_available,
        })
        setShowForm(true)
    }

    const openAdd = () => {
        setEditItem(null)
        setForm(EMPTY_FORM)
        setShowForm(true)
    }

    // Filtered items
    const filtered = menuItems.filter(item => {
        const matchCat = !filterCategory || item.category_id === filterCategory
        const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase())
        return matchCat && matchSearch
    })

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#0F172A]">🍽️ Quản lý Menu</h1>
                    <p className="text-sm text-[#64748B] mt-1">{menuItems.length} món</p>
                </div>
                <button onClick={openAdd} className="flex items-center gap-2 bg-[#DC2626] text-white px-4 py-2.5 rounded-xl hover:bg-[#B91C1C] font-medium text-sm transition-colors">
                    <Plus className="w-4 h-4" /> Thêm món
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-4 flex-wrap">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="🔍 Tìm tên món..."
                    className="flex-1 min-w-[200px] border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#DC2626]"
                />
                <select
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                    className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#DC2626] bg-white"
                >
                    <option value="">Tất cả danh mục</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                        <tr>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Tên món</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide hidden sm:table-cell">Danh mục</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Giá vốn</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Giá bán</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Trạng thái</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-[#EEF2F7] rounded animate-pulse" /></td></tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} className="text-center text-[#64748B] text-sm py-12">Không có món nào</td></tr>
                        ) : (
                            filtered.map(item => (
                                <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {item.image_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                            ) : (
                                                <div className="w-10 h-10 bg-[#EEF2F7] rounded-lg flex items-center justify-center text-lg flex-shrink-0">🍽️</div>
                                            )}
                                            <div>
                                                <p className="text-sm font-medium text-[#0F172A]">{item.name}</p>
                                                {item.description && <p className="text-xs text-[#64748B] truncate max-w-[180px]">{item.description}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 hidden sm:table-cell">
                                        <span className="text-xs bg-[#EEF2F7] text-[#64748B] px-2.5 py-1 rounded-full">
                                            {item.categories?.name || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-[#64748B] text-sm">
                                        {formatNumber(item.cost_price || 0)}₫
                                    </td>
                                    <td className="px-4 py-3 text-right price-text font-semibold text-[#0F172A] text-sm">
                                        {formatNumber(item.price)}₫
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => toggleAvail.mutate({ id: item.id, is_available: !item.is_available })}
                                            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${item.is_available
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                                                }`}
                                        >
                                            {item.is_available ? '✅ Đang bán' : '⛔ Tạm hết'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 justify-end">
                                            <button onClick={() => openEdit(item)}
                                                className="p-1.5 text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors">
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Xóa món "${item.name}"?`)) deleteMutation.mutate(item.id)
                                                }}
                                                className="p-1.5 text-[#64748B] hover:text-[#D32F2F] hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
                            <h2 className="font-semibold text-[#0F172A]">{editItem ? 'Sửa món' : 'Thêm món mới'}</h2>
                            <button onClick={() => { setShowForm(false); setEditItem(null) }}
                                className="p-1.5 text-[#64748B] hover:text-[#0F172A] rounded-lg">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-[#0F172A] block mb-1.5">Tên món *</label>
                                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Phở bò, Cà phê sữa..."
                                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-[#0F172A] block mb-1.5">Danh mục *</label>
                                <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626] bg-white">
                                    <option value="">Chọn danh mục...</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-sm font-medium text-[#0F172A] block mb-1.5">Giá vốn (VNĐ)</label>
                                    <input type="number" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))}
                                        placeholder="20000"
                                        className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-sm font-medium text-[#0F172A] block mb-1.5">Giá bán (VNĐ) *</label>
                                    <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                                        placeholder="35000"
                                        className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-[#0F172A] block mb-1.5">Mô tả</label>
                                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Mô tả ngắn..."
                                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-[#0F172A] block mb-1.5">Hình ảnh</label>
                                <div className="flex gap-2">
                                    <input type="url" value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                                        placeholder="URL hoặc tải ảnh lên..."
                                        className="flex-1 border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]" />
                                    <label className="cursor-pointer bg-[#EEF2F7] hover:bg-[#E2E8F0] text-[#0F172A] px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center shrink-0">
                                        {uploading ? 'Đang tải...' : 'Tải lên...'}
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                                    </label>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setForm(f => ({ ...f, is_available: !f.is_available }))}
                                    className={`w-10 h-5 rounded-full transition-colors flex items-center ${form.is_available ? 'bg-[#2D8A4E] justify-end' : 'bg-[#E2E8F0] justify-start'}`}
                                >
                                    <span className="w-4 h-4 bg-white rounded-full mx-0.5 shadow-sm" />
                                </button>
                                <label className="text-sm text-[#0F172A]">{form.is_available ? 'Đang bán' : 'Tạm hết'}</label>
                            </div>
                        </div>
                        <div className="border-t border-[#E2E8F0] px-5 py-4 flex gap-3">
                            <button onClick={() => { setShowForm(false); setEditItem(null) }}
                                className="flex-1 py-2.5 text-sm border border-[#E2E8F0] rounded-xl hover:bg-[#EEF2F7] transition-colors text-[#64748B]">
                                Hủy
                            </button>
                            <button
                                onClick={() => saveMutation.mutate(form)}
                                disabled={saveMutation.isPending}
                                className="flex-1 py-2.5 text-sm bg-[#DC2626] text-white rounded-xl hover:bg-[#B91C1C] font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                <Check className="w-4 h-4" />
                                {saveMutation.isPending ? 'Đang lưu...' : (editItem ? 'Cập nhật' : 'Thêm món')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
