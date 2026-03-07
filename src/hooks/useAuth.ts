'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

interface AuthState {
    user: { id: string; email: string | undefined } | null
    profile: Profile | null
    loading: boolean
}

export function useAuth(): AuthState {
    const [state, setState] = useState<AuthState>({
        user: null,
        profile: null,
        loading: true,
    })

    useEffect(() => {
        const supabase = createClient()

        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setState({ user: null, profile: null, loading: false })
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            setState({
                user: { id: user.id, email: user.email },
                profile,
                loading: false,
            })
        }

        getUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                getUser()
            } else {
                setState({ user: null, profile: null, loading: false })
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    return state
}
