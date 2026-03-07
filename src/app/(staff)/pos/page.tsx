'use client'

import { useState, useMemo, useEffect } from 'react'
import { useMenu } from '@/hooks/useMenu'
import { useCart } from '@/hooks/useCart'
import { useTables } from '@/hooks/useTables'
import {
    useActiveOrders,
    useOpenTable,
    useAddOrderItem,
    useUpdateOrderItem,
    useRemoveOrderItem,
    useCheckoutOrder,
    useCancelOrder,
    useCreateTakeawayOrder,
    useCreateTakeawayDraft,
} from '@/hooks/useOrders'
import { useQRNotifications } from '@/hooks/useQRNotifications'
import { useAuth } from '@/hooks/useAuth'
import { CategoryTabs } from '@/components/pos/CategoryTabs'
import { MenuGrid } from '@/components/pos/MenuGrid'
import { CartPanel } from '@/components/pos/CartPanel'
import { CancelOrderDialog } from '@/components/pos/CancelOrderDialog'
import { TableGrid } from '@/components/pos/TableGrid'
import { QRRequestsPanel } from '@/components/pos/QRRequestsPanel'
import { BillModal } from '@/components/pos/BillModal'
import { toast } from 'sonner'
import type { Database } from '@/types/database'
import { ShoppingCart, X } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { formatVND } from '@/lib/format'

type MenuItem = Database['public']['Tables']['menu_items']['Row']

export default function POSPage() {
    const { profile } = useAuth()
    const { categories, menuItems, menuLoading, categoriesLoading } = useMenu()
    const { data: tables = [] } = useTables()
    const cart = useCart()

    // Order mutations
    const openTable = useOpenTable()
    const addOrderItem = useAddOrderItem()
    const updateOrderItem = useUpdateOrderItem()
    const removeOrderItem = useRemoveOrderItem()
    const checkoutOrder = useCheckoutOrder()
    const cancelOrder = useCancelOrder()
    const createTakeawayOrder = useCreateTakeawayOrder()
    const createTakeawayDraft = useCreateTakeawayDraft()

    // Subscribe to Realtime notifications for QR orders
    useQRNotifications()

    const [viewMode, setViewMode] = useState<'menu' | 'tables'>('tables')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [showCancel, setShowCancel] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const { data: activeOrders = [] } = useActiveOrders()

    // Bill printing state
    const [showBill, setShowBill] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [billData, setBillData] = useState<any>(null)
    const [isCartOpen, setIsCartOpen] = useState(false)

    // Keep local cart in sync with active orders (to reflect QR orders accepted)
    useEffect(() => {
        if (!cart.state.tableId || !cart.state.orderId) return

        const currentOrder = activeOrders.find(o => o.id === cart.state.orderId)
        if (currentOrder) {
            // Re-sync local cart items with DB items
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const items = (currentOrder.order_items || []).map((oi: any) => ({
                menuItemId: oi.menu_item_id,
                name: oi.menu_items?.name || '',
                price: oi.unit_price,
                quantity: oi.quantity,
                note: oi.note || '',
                imageUrl: oi.menu_items?.image_url || null,
                orderItemId: oi.id,
            }))

            cart.loadOrder(
                currentOrder.id,
                cart.state.tableId,
                cart.state.tableName || 'Bàn',
                items
            )
        }
    }, [activeOrders, cart.state.tableId, cart.state.orderId, cart.state.tableName, cart.loadOrder])

    // Filter menu items by category + search
    const filteredItems = useMemo(() => {
        let items = menuItems
        if (selectedCategory) {
            items = items.filter(i => i.category_id === selectedCategory)
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            items = items.filter(i => i.name.toLowerCase().includes(q))
        }
        return items
    }, [menuItems, selectedCategory, searchQuery])

    const cartItemIds = useMemo(
        () => new Set<string>(cart.state.items.map((i) => i.menuItemId)),
        [cart.state.items]
    )

    // When staff selects a table: open or resume order
    const handleSelectTable = async (tableId: string, tableName: string | null) => {
        if (!profile) {
            toast.error('Chưa đăng nhập')
            return
        }

        // If clicking the same table that's already loaded, just switch to menu
        if (cart.state.tableId === tableId && cart.state.orderId) {
            setViewMode('menu')
            return
        }

        try {
            const order = await openTable.mutateAsync({
                tableId,
                staffId: profile.id,
            })

            // Convert order_items from DB format to CartItem format
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const items = (order.order_items || []).map((oi: any) => ({
                menuItemId: oi.menu_item_id,
                name: oi.menu_items?.name || '',
                price: oi.unit_price,
                quantity: oi.quantity,
                note: oi.note || '',
                imageUrl: oi.menu_items?.image_url || null,
                orderItemId: oi.id, // Track DB row id for updates
            }))

            cart.loadOrder(
                order.id,
                tableId,
                tableName || `Bàn`,
                items
            )
            setViewMode('menu')
            toast.success(`Đã mở ${tableName || 'bàn'}`)
        } catch (error) {
            toast.error('Lỗi mở bàn: ' + (error as Error).message)
        }
    }

    // Create a takeaway draft order
    const handleCreateTakeaway = async () => {
        if (!profile) {
            toast.error('Chưa đăng nhập')
            return
        }

        // If already in takeaway mode (no table, has order), just switch to menu
        if (!cart.state.tableId && cart.state.orderId) {
            setViewMode('menu')
            return
        }

        try {
            const order = await createTakeawayDraft.mutateAsync({
                staffId: profile.id,
            })

            cart.loadOrder(order.id, null, 'Mang về', [])
            setViewMode('menu')
            toast.success('Đã tạo đơn mang về')
        } catch (error) {
            toast.error('Lỗi tạo đơn: ' + (error as Error).message)
        }
    }

    // Add item: save to DB immediately if we have an active order
    const handleAddItem = async (item: MenuItem) => {
        if (!cart.state.orderId) {
            // Takeaway mode — just add to local cart
            cart.addItem({
                menuItemId: item.id,
                name: item.name,
                price: item.price,
                imageUrl: item.image_url,
            })
            return
        }

        // Table order — save to DB
        try {
            await addOrderItem.mutateAsync({
                orderId: cart.state.orderId,
                menuItemId: item.id,
                quantity: 1,
                unitPrice: item.price,
            })

            // Update local cart optimistically
            cart.addItem({
                menuItemId: item.id,
                name: item.name,
                price: item.price,
                imageUrl: item.image_url,
            })
        } catch (error) {
            toast.error('Lỗi thêm món: ' + (error as Error).message)
        }
    }

    // Update quantity
    const handleUpdateQuantity = async (menuItemId: string, quantity: number) => {
        if (!cart.state.orderId) {
            cart.updateQuantity(menuItemId, quantity)
            return
        }

        // Find the order_item in the active order
        const activeOrder = activeOrders.find(o => o.id === cart.state.orderId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orderItem = (activeOrder as any)?.order_items?.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (oi: any) => oi.menu_item_id === menuItemId
        )

        if (orderItem) {
            try {
                await updateOrderItem.mutateAsync({
                    orderItemId: orderItem.id,
                    orderId: cart.state.orderId,
                    quantity,
                })
                cart.updateQuantity(menuItemId, quantity)
            } catch (error) {
                toast.error('Lỗi cập nhật: ' + (error as Error).message)
            }
        } else {
            cart.updateQuantity(menuItemId, quantity)
        }
    }

    // Remove item
    const handleRemoveItem = async (menuItemId: string) => {
        if (!cart.state.orderId) {
            cart.removeItem(menuItemId)
            return
        }

        const activeOrder = activeOrders.find(o => o.id === cart.state.orderId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orderItem = (activeOrder as any)?.order_items?.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (oi: any) => oi.menu_item_id === menuItemId
        )

        if (orderItem) {
            try {
                await removeOrderItem.mutateAsync({
                    orderItemId: orderItem.id,
                    orderId: cart.state.orderId,
                })
                cart.removeItem(menuItemId)
            } catch (error) {
                toast.error('Lỗi xóa món: ' + (error as Error).message)
            }
        } else {
            cart.removeItem(menuItemId)
        }
    }

    // Payment / Checkout
    const handlePayment = async (method: 'cash' | 'transfer') => {
        if (cart.state.items.length === 0) {
            toast.error('Giỏ hàng trống!')
            return
        }
        if (!profile) {
            toast.error('Chưa đăng nhập')
            return
        }

        try {
            if (cart.state.orderId) {
                // Table order — checkout existing order
                await checkoutOrder.mutateAsync({
                    orderId: cart.state.orderId,
                    paymentMethod: method,
                    discountType: cart.state.discountType,
                    discountValue: cart.state.discountValue,
                    note: cart.state.note,
                })
            } else {
                // Takeaway — create + checkout atomically
                await createTakeawayOrder.mutateAsync({
                    staffId: profile.id,
                    items: cart.state.items,
                    discountType: cart.state.discountType,
                    discountValue: cart.state.discountValue,
                    paymentMethod: method,
                    note: cart.state.note,
                })
            }

            // Capture data for receipt before clearing cart
            const currentBillData = {
                orderId: cart.state.orderId || `MANG_VE_${Math.floor(Date.now() / 1000)}`,
                tableName: cart.state.tableName || 'Mang về',
                staffName: profile.full_name || 'Thu ngân',
                createdAt: new Date().toISOString(),
                paymentMethod: method,
                subtotal: cart.subtotal,
                discountAmount: cart.discountAmount,
                total: cart.total,
                items: cart.state.items.map(i => ({
                    name: i.name,
                    quantity: i.quantity,
                    price: i.price,
                }))
            }

            setBillData(currentBillData)
            setShowBill(true)
            toast.success('Thanh toán thành công!')
            // Note: We don't clearCart() or setViewMode('tables') here.
            // That happens when they close the BillModal.
        } catch (error) {
            toast.error('Lỗi thanh toán: ' + (error as Error).message)
        }
    }

    // Cancel order
    const handleCancelOrder = () => {
        if (cart.state.items.length === 0 && !cart.state.orderId) {
            toast.error('Không có hóa đơn để hủy')
            return
        }
        setShowCancel(true)
    }

    const handleConfirmCancel = async (reason: string) => {
        if (!profile) return

        if (cart.state.orderId) {
            // Cancel the DB order
            try {
                await cancelOrder.mutateAsync({
                    orderId: cart.state.orderId,
                    cancelReason: reason,
                    staffId: profile.id,
                })
                toast.info('Đã hủy hóa đơn')
            } catch (error) {
                toast.error('Lỗi hủy: ' + (error as Error).message)
                setShowCancel(false)
                return
            }
        }

        cart.clearCart()
        setShowCancel(false)
        setViewMode('tables')
    }

    const isLoading = menuLoading || categoriesLoading
    const isPaying = checkoutOrder.isPending || createTakeawayOrder.isPending

    return (
        <div className="h-[calc(100vh-56px)] flex overflow-hidden pb-20 md:pb-0">
            {/* Left: Menu Panel */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Search + Tabs */}
                <div className="px-4 pt-3 pb-2 space-y-2 bg-[#FAFAF8] border-b border-[#E0DCD4]">
                    <div className="flex bg-[#E0DCD4]/30 rounded-lg p-1 w-fit mb-3">
                        <button
                            onClick={() => setViewMode('menu')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'menu' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
                                }`}
                        >
                            Thực đơn
                        </button>
                        <button
                            onClick={() => setViewMode('tables')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'tables' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
                                }`}
                        >
                            Sơ đồ bàn
                        </button>
                    </div>

                    {viewMode === 'menu' && (
                        <>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm món..."
                                className="w-full px-4 py-2 rounded-xl border border-[#E0DCD4] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4553A]/30 focus:border-[#D4553A]"
                            />
                            <CategoryTabs
                                categories={categories}
                                selected={selectedCategory}
                                onSelect={setSelectedCategory}
                            />
                        </>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-[#FAFAF8] flex flex-col">
                    <QRRequestsPanel />
                    {viewMode === 'menu' ? (
                        <div className="p-4">
                            {isLoading ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {[...Array(9)].map((_, i) => (
                                        <div key={i} className="bg-white rounded-xl border border-[#E0DCD4] h-36 animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                <MenuGrid
                                    items={filteredItems}
                                    onAddItem={handleAddItem}
                                    cartItemIds={cartItemIds}
                                />
                            )}
                        </div>
                    ) : (
                        <TableGrid
                            tables={tables}
                            activeOrders={activeOrders}
                            onSelectTable={handleSelectTable}
                            onCreateTakeaway={handleCreateTakeaway}
                            selectedTableId={cart.state.tableId}
                            isTakeawayActive={!cart.state.tableId && !!cart.state.orderId}
                        />
                    )}
                </div>
            </div>

            {/* Right: Cart Panel */}
            <div className="hidden md:block w-80 lg:w-96 flex-shrink-0">
                <CartPanel
                    items={cart.state.items}
                    subtotal={cart.subtotal}
                    discountAmount={cart.discountAmount}
                    total={cart.total}
                    discountType={cart.state.discountType}
                    discountValue={cart.state.discountValue}
                    tableId={cart.state.tableId}
                    tableName={cart.state.tableName}
                    orderId={cart.state.orderId}
                    tables={tables.map(t => ({
                        table_id: t.id,
                        name: t.name,
                        table_number: t.table_number,
                    }))}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveItem}
                    onSetNote={cart.setNote}
                    onSetDiscount={cart.setDiscount}
                    onSetTable={cart.setTable}
                    onPayment={handlePayment}
                    onCancel={handleCancelOrder}
                    isPaying={isPaying}
                />
            </div>

            {/* Mobile Cart Button */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E0DCD4] z-20">
                <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                    <SheetTrigger asChild>
                        <button className="w-full bg-[#D4553A] text-white py-3 rounded-xl font-medium flex items-center justify-between px-4 shadow-lg">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5" />
                                <span>{cart.state.items.length} món</span>
                            </div>
                            <span>{formatVND(cart.total)}</span>
                        </button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col rounded-t-3xl" showCloseButton={false}>
                        <SheetTitle className="sr-only">Giỏ hàng</SheetTitle>
                        <SheetDescription className="sr-only">Quản lý hóa đơn và thanh toán</SheetDescription>
                        <div className="absolute right-4 top-3 z-50">
                            <button onClick={() => setIsCartOpen(false)} className="bg-[#E0DCD4] hover:bg-[#D4553A] hover:text-white transition-colors p-1.5 rounded-full text-[#6B6B6B]">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden mt-2 rounded-t-3xl">
                            <CartPanel
                                items={cart.state.items}
                                subtotal={cart.subtotal}
                                discountAmount={cart.discountAmount}
                                total={cart.total}
                                discountType={cart.state.discountType}
                                discountValue={cart.state.discountValue}
                                tableId={cart.state.tableId}
                                tableName={cart.state.tableName}
                                orderId={cart.state.orderId}
                                tables={tables.map(t => ({
                                    table_id: t.id,
                                    name: t.name,
                                    table_number: t.table_number,
                                }))}
                                onUpdateQuantity={handleUpdateQuantity}
                                onRemoveItem={handleRemoveItem}
                                onSetNote={cart.setNote}
                                onSetDiscount={cart.setDiscount}
                                onSetTable={cart.setTable}
                                onPayment={(method) => {
                                    handlePayment(method)
                                    setIsCartOpen(false)
                                }}
                                onCancel={() => {
                                    handleCancelOrder()
                                    setIsCartOpen(false)
                                }}
                                isPaying={isPaying}
                            />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Cancel Dialog */}
            {showCancel && (
                <CancelOrderDialog
                    onConfirm={handleConfirmCancel}
                    onClose={() => setShowCancel(false)}
                    isLoading={cancelOrder.isPending}
                />
            )}

            {/* Bill Receipt Modal */}
            <BillModal
                isOpen={showBill}
                onClose={() => {
                    setShowBill(false)
                    cart.clearCart()
                    setViewMode('tables')
                }}
                billData={billData}
            />
        </div>
    )
}
