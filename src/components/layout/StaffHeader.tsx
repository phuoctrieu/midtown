'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { UtensilsCrossed, LogOut, Shield } from 'lucide-react'

interface StaffHeaderProps {
    staffName: string
    isAdmin?: boolean
}

export function StaffHeader({ staffName, isAdmin }: StaffHeaderProps) {
    const router = useRouter()

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        toast.success('Đã đăng xuất')
        router.push('/login')
        router.refresh()
    }

    return (
        <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#E0DCD4] flex items-center px-4 z-10 shadow-sm">
            {/* Logo */}
            <div className="flex items-center gap-2 mr-4">
                <div className="w-8 h-8 bg-[#D4553A] rounded-lg flex items-center justify-center">
                    <UtensilsCrossed className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-[#1A1A1A] text-sm tracking-wide">MIDTOWN POS</span>
            </div>

            <div className="flex-1" />

            {/* User */}
            <div className="flex items-center gap-3">
                {isAdmin && (
                    <a
                        href="/admin/dashboard"
                        className="flex items-center gap-1.5 text-xs text-[#D4553A] font-medium border border-[#D4553A] rounded-full px-3 py-1 hover:bg-[#FEF1ED] transition-colors"
                    >
                        <Shield className="w-3 h-3" />
                        Admin
                    </a>
                )}
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-[#F0EDE6] rounded-full flex items-center justify-center text-xs font-bold text-[#D4553A]">
                        {staffName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-[#1A1A1A] hidden sm:block">{staffName}</span>
                </div>
                <button
                    onClick={handleLogout}
                    className="p-2 text-[#6B6B6B] hover:text-[#D32F2F] hover:bg-red-50 rounded-lg transition-colors"
                    title="Đăng xuất"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </header>
    )
}
