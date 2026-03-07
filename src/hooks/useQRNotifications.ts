'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

/**
 * Subscribe to Supabase Realtime for new QR orders and order item changes.
 * Shows toast notification when customers add items via QR.
 */
export function useQRNotifications() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

    useEffect(() => {
        const channel = supabase
            .channel('pos-qr-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'qr_order_requests',
                    filter: 'status=eq.pending',
                },
                async (payload) => {
                    const request = payload.new as { id: string; table_id: string }

                    // Fetch table name for the notification
                    if (request.table_id) {
                        const { data: table } = await supabase
                            .from('tables')
                            .select('name, table_number')
                            .eq('id', request.table_id)
                            .single()

                        const tableName = table?.name || `Bàn ${table?.table_number}`
                        toast.info(`🛒 ${tableName} có yêu cầu gọi món mới!`, {
                            duration: 8000,
                            description: 'Khách hàng vừa thêm món qua QR code',
                        })
                    } else {
                        toast.info('🛒 Có yêu cầu gọi món mới!', { duration: 8000 })
                    }

                    // Refresh qr requests query (we'll create this hook later)
                    queryClient.invalidateQueries({ queryKey: ['qr_requests'] })
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'qr_order_requests',
                },
                () => {
                    // Refresh when request status changes
                    queryClient.invalidateQueries({ queryKey: ['qr_requests'] })
                    queryClient.invalidateQueries({ queryKey: ['active_orders'] })
                }
            )
            .subscribe()

        channelRef.current = channel

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
            }
        }
    }, [supabase, queryClient])
}
