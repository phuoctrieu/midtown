'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { RestaurantTable } from '@/types/database'

export function useTables() {
    const supabase = createClient()

    return useQuery({
        queryKey: ['tables'],
        queryFn: async (): Promise<RestaurantTable[]> => {
            const { data, error } = await supabase
                .from('tables')
                .select('*')
                .eq('is_active', true)
                .order('table_number', { nullsFirst: false })
            if (error) throw error
            return data || []
        },
    })
}
