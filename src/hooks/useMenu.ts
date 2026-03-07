'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { MenuItem, Category } from '@/types/database'

export function useMenu() {
    const supabase = createClient()

    const categoriesQuery = useQuery({
        queryKey: ['categories'],
        queryFn: async (): Promise<Category[]> => {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('is_active', true)
                .order('sort_order')
            if (error) throw error
            return data || []
        },
    })

    const menuQuery = useQuery({
        queryKey: ['menu_items'],
        queryFn: async (): Promise<MenuItem[]> => {
            const { data, error } = await supabase
                .from('menu_items')
                .select('*, categories(*)')
                .eq('is_available', true)
                .order('sort_order')
            if (error) throw error
            return data || []
        },
    })

    return {
        categories: categoriesQuery.data || [],
        menuItems: menuQuery.data || [],
        categoriesLoading: categoriesQuery.isLoading,
        menuLoading: menuQuery.isLoading,
        error: categoriesQuery.error || menuQuery.error,
    }
}
