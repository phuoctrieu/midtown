'use server'

import { createClient } from '@/lib/supabase/server'

export async function loginWithEmail(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Vui lòng nhập đầy đủ email và mật khẩu' }
    }

    try {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            return { error: error.message }
        }

        if (data.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single()

            return { success: true, role: profile?.role }
        }

        return { error: 'Đăng nhập không thành công' }
    } catch (err: any) {
        return { error: err.message || 'Lỗi hệ thống' }
    }
}
