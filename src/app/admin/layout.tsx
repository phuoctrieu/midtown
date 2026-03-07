import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/layout/AdminSidebar'

export default async function AdminLayout({
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

    if (profile?.role !== 'admin') redirect('/pos')

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <AdminSidebar staffName={profile?.full_name || user.email || 'Admin'} />
            <main className="md:ml-64 p-4 md:p-6 pt-20 md:pt-6 min-h-screen">
                {children}
            </main>
        </div>
    )
}
