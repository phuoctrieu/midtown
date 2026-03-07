'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatNumber, formatVND } from '@/lib/format'
import Image from 'next/image'
import { Plus, Minus, ShoppingCart, ChevronLeft, CheckCircle } from 'lucide-react'

interface MenuItem {
    id: string
    name: string
    price: number
    image_url: string | null
    description: string | null
    category_id: string
}

interface Category {
    id: string
    name: string
}

interface CartItem {
    id: string
    name: string
    price: number
    quantity: number
    note: string
}

export default function QROrderPage() {
    const params = useParams()
    const tableToken = params.tableId as string
    const supabase = createClient()

    const [table, setTable] = useState<{ id: string; name: string | null; table_number: number } | null>(null)
    const [categories, setCategories] = useState<Category[]>([])
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [cart, setCart] = useState<CartItem[]>([])
    const [selectedCat, setSelectedCat] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [orderDone, setOrderDone] = useState(false)
    const [showCart, setShowCart] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function loadData() {
            try {
                // Find table by qr_token
                const { data: tableData, error: tableError } = await supabase
                    .from('tables')
                    .select('*')
                    .eq('qr_token', tableToken)
                    .eq('is_active', true)
                    .single()

                if (tableError || !tableData) {
                    setError('Mã QR không hợp lệ hoặc bàn không tồn tại')
                    return
                }
                setTable(tableData)

                // Load categories and menu
                const [{ data: cats }, { data: items }] = await Promise.all([
                    supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
                    supabase.from('menu_items').select('*').eq('is_available', true).order('sort_order'),
                ])
                setCategories(cats || [])
                setMenuItems(items || [])
            } catch {
                setError('Có lỗi xảy ra. Vui lòng thử lại.')
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [tableToken])

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(c => c.id === item.id)
            if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
            return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1, note: '' }]
        })
    }

    const updateQty = (id: string, delta: number) => {
        setCart(prev => {
            const updated = prev.map(c => c.id === id ? { ...c, quantity: c.quantity + delta } : c)
            return updated.filter(c => c.quantity > 0)
        })
    }

    const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)

    const submitOrder = async () => {
        if (cart.length === 0 || !table) return
        setSubmitting(true)
        try {
            // Check for existing pending/open order on this table
            const { data: existingOrder } = await supabase
                .from('orders')
                .select('id')
                .eq('table_id', table.id)
                .eq('status', 'pending')
                .maybeSingle()

            const orderId = existingOrder ? existingOrder.id : null

            // Insert items into qr_order_requests
            const requests = cart.map(item => ({
                table_id: table.id,
                order_id: orderId, // Can be null if staff hasn't created a table order yet
                menu_item_id: item.id,
                quantity: item.quantity,
                status: 'pending',
                note: item.note || null,
            }))

            const { error: requestError } = await supabase
                .from('qr_order_requests')
                .insert(requests)

            if (requestError) throw requestError

            setOrderDone(true)
            setCart([])
            setShowCart(false)
        } catch (err) {
            console.error('QR order submission error:', err)
            toast.error('Không thể gửi đơn. Vui lòng thử lại.')
        } finally {
            setSubmitting(false)
        }
    }

    const filteredItems = selectedCat ? menuItems.filter(i => i.category_id === selectedCat) : menuItems
    const getCartQty = (id: string) => cart.find(c => c.id === id)?.quantity || 0

    if (loading) {
        return (
            <div className="min-h-screen bg-[#EEF2F7] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-[#DC2626] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[#64748B] text-sm">Đang tải menu...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#EEF2F7] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 text-center max-w-sm shadow-xl">
                    <div className="text-5xl mb-4">❌</div>
                    <h1 className="font-bold text-[#0F172A] mb-2">Không tìm thấy bàn</h1>
                    <p className="text-[#64748B] text-sm">{error}</p>
                </div>
            </div>
        )
    }

    if (orderDone) {
        return (
            <div className="min-h-screen bg-[#EEF2F7] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 text-center max-w-sm shadow-xl">
                    <CheckCircle className="w-16 h-16 text-[#2D8A4E] mx-auto mb-4" />
                    <h1 className="font-bold text-xl text-[#0F172A] mb-2">Đã gửi order!</h1>
                    <p className="text-[#64748B] text-sm mb-1">Nhà hàng đang xác nhận đơn của bạn.</p>
                    <p className="text-[#64748B] text-sm mb-6">Bàn: <strong>{table?.name || `Bàn ${table?.table_number}`}</strong></p>
                    <button onClick={() => setOrderDone(false)}
                        className="w-full bg-[#DC2626] text-white rounded-xl py-3 font-medium hover:bg-[#B91C1C]">
                        Order thêm
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-[#E2E8F0] px-4 py-3 z-10 shadow-sm">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                    <div>
                        <h1 className="font-bold text-[#0F172A]">Midtown Restaurant</h1>
                        <p className="text-xs text-[#64748B]">{table?.name || `Bàn ${table?.table_number}`}</p>
                    </div>
                    <button onClick={() => setShowCart(true)} className="relative p-2">
                        <ShoppingCart className="w-6 h-6 text-[#0F172A]" />
                        {cartCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#DC2626] text-white text-xs rounded-full flex items-center justify-center font-bold">
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Category tabs */}
            <div className="sticky top-[57px] bg-white border-b border-[#E2E8F0] z-10">
                <div className="flex gap-2 overflow-x-auto px-4 py-2 max-w-2xl mx-auto">
                    <button onClick={() => setSelectedCat(null)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!selectedCat ? 'bg-[#DC2626] text-white' : 'text-[#64748B] hover:text-[#DC2626]'}`}>
                        Tất cả
                    </button>
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setSelectedCat(cat.id)}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCat === cat.id ? 'bg-[#DC2626] text-white' : 'text-[#64748B] hover:text-[#DC2626]'}`}>
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu Grid */}
            <div className="max-w-2xl mx-auto p-4 grid grid-cols-2 gap-3 pb-24">
                {filteredItems.map(item => {
                    const qty = getCartQty(item.id)
                    return (
                        <div key={item.id} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
                            <div className="relative h-28 bg-[#EEF2F7]">
                                {item.image_url ? (
                                    <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="50vw" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-40">🍽️</div>
                                )}
                            </div>
                            <div className="p-3">
                                <p className="text-sm font-medium text-[#0F172A] mb-0.5 line-clamp-2">{item.name}</p>
                                <p className="price-text text-[#DC2626] text-sm font-semibold">{formatNumber(item.price)}₫</p>
                                <div className="flex items-center justify-end mt-2">
                                    {qty === 0 ? (
                                        <button onClick={() => addToCart(item)}
                                            className="flex items-center gap-1 bg-[#DC2626] text-white text-xs px-3 py-1.5 rounded-full hover:bg-[#B91C1C] transition-colors">
                                            <Plus className="w-3 h-3" /> Thêm
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => updateQty(item.id, -1)}
                                                className="w-7 h-7 rounded-full border border-[#E2E8F0] flex items-center justify-center hover:border-[#DC2626] transition-colors">
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="text-sm font-bold text-[#DC2626] w-4 text-center">{qty}</span>
                                            <button onClick={() => updateQty(item.id, 1)}
                                                className="w-7 h-7 rounded-full bg-[#DC2626] flex items-center justify-center hover:bg-[#B91C1C] transition-colors">
                                                <Plus className="w-3 h-3 text-white" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Fixed cart button */}
            {cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E2E8F0] z-10">
                    <div className="max-w-2xl mx-auto">
                        <button onClick={() => setShowCart(true)}
                            className="w-full bg-[#DC2626] text-white rounded-xl py-3.5 font-semibold flex items-center justify-between px-5 hover:bg-[#B91C1C] transition-colors">
                            <span className="bg-white/20 text-white text-sm px-2 py-0.5 rounded-full">{cartCount}</span>
                            <span>Xem giỏ hàng</span>
                            <span className="price-text">{formatVND(cartTotal)}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Cart Sheet */}
            {showCart && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
                    <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
                            <button onClick={() => setShowCart(false)} className="flex items-center gap-1.5 text-[#64748B]">
                                <ChevronLeft className="w-4 h-4" /> Tiếp tục chọn
                            </button>
                            <h2 className="font-semibold text-[#0F172A]">Giỏ hàng ({cartCount})</h2>
                            <div className="w-20" />
                        </div>

                        <div className="p-4 space-y-3">
                            {cart.map(item => (
                                <div key={item.id} className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-[#0F172A]">{item.name}</p>
                                        <p className="price-text text-xs text-[#DC2626]">{formatNumber(item.price)}₫/món</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => updateQty(item.id, -1)}
                                            className="w-7 h-7 rounded-full border border-[#E2E8F0] flex items-center justify-center">
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                        <button onClick={() => updateQty(item.id, 1)}
                                            className="w-7 h-7 rounded-full bg-[#DC2626] flex items-center justify-center">
                                            <Plus className="w-3 h-3 text-white" />
                                        </button>
                                    </div>
                                    <p className="price-text text-sm font-semibold w-20 text-right">{formatVND(item.price * item.quantity)}</p>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-[#E2E8F0] p-5">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[#64748B]">Tổng cộng</span>
                                <span className="price-text text-xl font-bold text-[#DC2626]">{formatVND(cartTotal)}</span>
                            </div>
                            <button
                                onClick={submitOrder}
                                disabled={submitting}
                                className="w-full bg-[#DC2626] text-white rounded-xl py-4 font-bold text-base hover:bg-[#B91C1C] transition-colors disabled:opacity-60"
                            >
                                {submitting ? 'Đang gửi...' : '🚀 Gửi order'}
                            </button>
                            <p className="text-xs text-center text-[#64748B] mt-3">
                                Nhân viên sẽ xác nhận và phục vụ tại {table?.name || `Bàn ${table?.table_number}`}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
