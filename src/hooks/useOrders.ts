'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Order, CartItem } from '@/types/database'

/**
 * Fetch orders list (for admin/history)
 */
export function useOrders(limit = 20) {
    const supabase = createClient()

    return useQuery({
        queryKey: ['orders', limit],
        queryFn: async (): Promise<Order[]> => {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    tables(*),
                    profiles!orders_staff_id_fkey(*),
                    order_items(*, menu_items(*))
                `)
                .order('created_at', { ascending: false })
                .limit(limit)
            if (error) throw error
            return data || []
        },
    })
}

/**
 * Fetch only active (pending) orders — used by TableGrid to show occupied tables
 */
export function useActiveOrders() {
    const supabase = createClient()

    return useQuery({
        queryKey: ['active_orders'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    tables(*),
                    order_items(*, menu_items(*))
                `)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
            if (error) throw error
            return data || []
        },
        refetchInterval: 10000,
    })
}

/**
 * Open a table: find existing pending order or create a new one.
 * Returns the order with its items.
 */
export function useOpenTable() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            tableId,
            staffId,
        }: {
            tableId: string
            staffId: string
        }) => {
            // Check for existing pending order on this table
            const { data: existing, error: findError } = await supabase
                .from('orders')
                .select(`
                    *,
                    order_items(*, menu_items(*))
                `)
                .eq('table_id', tableId)
                .eq('status', 'pending')
                .maybeSingle()

            if (findError) throw findError

            if (existing) {
                return existing
            }

            // Create new order for this table
            const { data: newOrder, error: createError } = await supabase
                .from('orders')
                .insert({
                    table_id: tableId,
                    staff_id: staffId,
                    source: 'pos' as const,
                    status: 'pending' as const,
                    subtotal: 0,
                    discount_amount: 0,
                    total: 0,
                })
                .select(`
                    *,
                    order_items(*, menu_items(*))
                `)
                .single()

            if (createError) throw createError
            return newOrder
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active_orders'] })
        },
    })
}

/**
 * Add an item to an existing order (or increment quantity if already exists)
 */
export function useAddOrderItem() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            orderId,
            menuItemId,
            quantity,
            unitPrice,
            note,
        }: {
            orderId: string
            menuItemId: string
            quantity: number
            unitPrice: number
            note?: string
        }) => {
            // Check if this item already exists in the order
            const { data: existing } = await supabase
                .from('order_items')
                .select('id, quantity')
                .eq('order_id', orderId)
                .eq('menu_item_id', menuItemId)
                .maybeSingle()

            if (existing) {
                // Increment quantity
                const { error } = await supabase
                    .from('order_items')
                    .update({ quantity: existing.quantity + quantity })
                    .eq('id', existing.id)
                if (error) throw error
                await recalculateOrderTotal(supabase, orderId)
                return { orderItemId: existing.id }
            } else {
                // Insert new item
                const { data: inserted, error } = await supabase
                    .from('order_items')
                    .insert({
                        order_id: orderId,
                        menu_item_id: menuItemId,
                        quantity,
                        unit_price: unitPrice,
                        note: note || null,
                    })
                    .select('id')
                    .single()
                if (error) throw error
                await recalculateOrderTotal(supabase, orderId)
                return { orderItemId: inserted.id }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active_orders'] })
        },
    })
}

/**
 * Update quantity of an existing order item
 */
export function useUpdateOrderItem() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            orderId,
            menuItemId,
            quantity,
        }: {
            orderId: string
            menuItemId: string
            quantity: number
        }) => {
            if (quantity <= 0) {
                const { error } = await supabase
                    .from('order_items')
                    .delete()
                    .eq('order_id', orderId)
                    .eq('menu_item_id', menuItemId)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('order_items')
                    .update({ quantity })
                    .eq('order_id', orderId)
                    .eq('menu_item_id', menuItemId)
                if (error) throw error
            }

            await recalculateOrderTotal(supabase, orderId)
        },
        onSuccess: (_, { orderId, menuItemId, quantity }) => {
            // Update cache immediately so the sync effect doesn't see stale data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            queryClient.setQueryData<any[]>(['active_orders'], (old) => {
                if (!old) return old
                return old.map(order => {
                    if (order.id !== orderId) return order
                    return {
                        ...order,
                        order_items: quantity <= 0
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            ? order.order_items?.filter((oi: any) => oi.menu_item_id !== menuItemId) ?? []
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            : order.order_items?.map((oi: any) =>
                                oi.menu_item_id === menuItemId ? { ...oi, quantity } : oi
                            ) ?? [],
                    }
                })
            })
            queryClient.invalidateQueries({ queryKey: ['active_orders'] })
        },
    })
}

/**
 * Remove an item from an order
 */
export function useRemoveOrderItem() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            orderId,
            menuItemId,
        }: {
            orderId: string
            menuItemId: string
        }) => {
            const { error } = await supabase
                .from('order_items')
                .delete()
                .eq('order_id', orderId)
                .eq('menu_item_id', menuItemId)
            if (error) throw error

            await recalculateOrderTotal(supabase, orderId)
        },
        onSuccess: (_, { orderId, menuItemId }) => {
            // Update cache immediately so the sync effect doesn't see stale data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            queryClient.setQueryData<any[]>(['active_orders'], (old) => {
                if (!old) return old
                return old.map(order => {
                    if (order.id !== orderId) return order
                    return {
                        ...order,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        order_items: order.order_items?.filter((oi: any) => oi.menu_item_id !== menuItemId) ?? [],
                    }
                })
            })
            queryClient.invalidateQueries({ queryKey: ['active_orders'] })
        },
    })
}

/**
 * Update note on an order item
 */
export function useUpdateOrderItemNote() {
    const supabase = createClient()

    return useMutation({
        mutationFn: async ({
            orderItemId,
            note,
        }: {
            orderItemId: string
            note: string
        }) => {
            const { error } = await supabase
                .from('order_items')
                .update({ note: note || null })
                .eq('id', orderItemId)
            if (error) throw error
        },
    })
}

/**
 * Checkout an order: set payment method and mark as completed
 */
export function useCheckoutOrder() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            orderId,
            paymentMethod,
            discountType,
            discountValue,
            note,
        }: {
            orderId: string
            paymentMethod: 'cash' | 'transfer'
            discountType?: 'percent' | 'amount' | null
            discountValue?: number
            note?: string
        }) => {
            // Try using RPC if available, otherwise update manually
            const { error: rpcError } = await supabase.rpc('checkout_order', {
                p_order_id: orderId,
                p_payment_method: paymentMethod,
                p_discount_value: discountValue || 0,
                p_discount_type: discountType || 'amount',
            })

            if (rpcError) {
                // Fallback: manual update
                await recalculateOrderTotal(supabase, orderId, discountType, discountValue)

                const { error } = await supabase
                    .from('orders')
                    .update({
                        status: 'completed' as const,
                        payment_method: paymentMethod,
                        paid_at: new Date().toISOString(),
                        note: note || null,
                    })
                    .eq('id', orderId)
                if (error) throw error
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active_orders'] })
            queryClient.invalidateQueries({ queryKey: ['orders'] })
        },
    })
}

/**
 * Cancel an order
 */
export function useCancelOrder() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            orderId,
            cancelReason,
            staffId,
        }: {
            orderId: string
            cancelReason: string
            staffId: string
        }) => {
            const { error } = await supabase
                .from('orders')
                .update({
                    status: 'cancelled' as const,
                    cancel_reason: cancelReason,
                    cancelled_by: staffId,
                    cancelled_at: new Date().toISOString(),
                })
                .eq('id', orderId)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active_orders'] })
            queryClient.invalidateQueries({ queryKey: ['orders'] })
        },
    })
}

/**
 * Create a takeaway draft order (no table) — for incremental item adding before checkout
 */
export function useCreateTakeawayDraft() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ staffId }: { staffId: string }) => {
            const { data: order, error } = await supabase
                .from('orders')
                .insert({
                    table_id: null,
                    staff_id: staffId,
                    source: 'pos' as const,
                    status: 'pending' as const,
                    subtotal: 0,
                    discount_amount: 0,
                    total: 0,
                })
                .select(`
                    *,
                    order_items(*, menu_items(*))
                `)
                .single()

            if (error) throw error
            return order
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active_orders'] })
        },
    })
}

/**
 * Create a takeaway order (no table) — atomic create + checkout for quick sales
 */
export function useCreateTakeawayOrder() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            staffId,
            items,
            discountType,
            discountValue,
            paymentMethod,
            note,
        }: {
            staffId: string
            items: CartItem[]
            discountType: 'percent' | 'amount' | null
            discountValue: number
            paymentMethod: 'cash' | 'transfer'
            note: string
        }) => {
            // Create order
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    table_id: null,
                    staff_id: staffId,
                    source: 'pos' as const,
                    status: 'pending' as const,
                    subtotal: 0,
                    discount_amount: 0,
                    total: 0,
                    note: note || null,
                })
                .select()
                .single()

            if (orderError) throw orderError

            // Create order items
            const orderItems = items.map(item => ({
                order_id: order.id,
                menu_item_id: item.menuItemId,
                quantity: item.quantity,
                unit_price: item.price,
                note: item.note || null,
            }))

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems)

            if (itemsError) throw itemsError

            // Checkout immediately
            const { error: checkoutError } = await supabase.rpc('checkout_order', {
                p_order_id: order.id,
                p_payment_method: paymentMethod,
                p_discount_value: discountValue || 0,
                p_discount_type: discountType || 'amount',
            })

            if (checkoutError) {
                // Fallback: manual update if RPC not available
                console.warn('checkout_order RPC failed, using fallback:', checkoutError.message)
                await recalculateOrderTotal(supabase, order.id, discountType, discountValue)

                const { error } = await supabase
                    .from('orders')
                    .update({
                        status: 'completed' as const,
                        payment_method: paymentMethod,
                        paid_at: new Date().toISOString(),
                        note: note || null,
                    })
                    .eq('id', order.id)
                if (error) throw error
            }

            return order
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] })
            queryClient.invalidateQueries({ queryKey: ['active_orders'] })
        },
    })
}

/**
 * Recalculate order subtotal and total from order_items
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recalculateOrderTotal(
    supabase: ReturnType<typeof createClient>,
    orderId: string,
    discountType?: 'percent' | 'amount' | null,
    discountValue?: number,
) {
    const { data: items } = await supabase
        .from('order_items')
        .select('quantity, unit_price')
        .eq('order_id', orderId)

    const subtotal = (items || []).reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0
    )

    let discountAmount = 0
    if (discountType && discountValue && discountValue > 0) {
        if (discountType === 'percent') {
            discountAmount = Math.round(subtotal * discountValue / 100)
        } else {
            discountAmount = Math.min(discountValue, subtotal)
        }
    }

    const total = Math.max(subtotal - discountAmount, 0)

    const { error } = await supabase
        .from('orders')
        .update({
            subtotal,
            total,
            ...(discountType !== undefined ? {
                discount_type: discountType,
                discount_value: discountValue || 0,
                discount_amount: discountAmount,
            } : {}),
        })
        .eq('id', orderId)

    if (error) throw error
}

/**
 * Fetch pending QR order requests
 */
export function useQRRequests() {
    const supabase = createClient()

    return useQuery({
        queryKey: ['qr_requests'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('qr_order_requests')
                .select(`
                    *,
                    tables:table_id(name, table_number),
                    menu_items:menu_item_id(name, price, image_url)
                `)
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
            if (error) throw error
            return data || []
        },
        refetchInterval: 10000,
    })
}

/**
 * Accept or reject a QR order request
 */
export function useProcessQRRequest() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            requestId,
            action,
        }: {
            requestId: string
            action: 'accepted' | 'rejected'
        }) => {
            const { error } = await supabase.rpc('process_qr_request', {
                p_request_id: requestId,
                p_action: action,
            })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['qr_requests'] })
            queryClient.invalidateQueries({ queryKey: ['active_orders'] })
        },
    })
}
