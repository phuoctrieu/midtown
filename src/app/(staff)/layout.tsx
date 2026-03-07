import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StaffHeader } from '@/components/layout/StaffHeader'

export default async function StaffLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <StaffHeader
                staffName={profile?.full_name || user.email || 'Nhân viên'}
                isAdmin={profile?.role === 'admin'}
            />
            <main className="pt-14">
                {children}
            </main>
        </div>
    )
}
