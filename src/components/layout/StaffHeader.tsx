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
        <header className="fixed top-0 left-0 right-0 h-14 bg-[#1B2A4A] flex items-center px-4 z-10 shadow-md">
            {/* Logo */}
            <div className="flex items-center gap-2 mr-4">
                <div className="w-8 h-8 bg-[#DC2626] rounded-lg flex items-center justify-center">
                    <UtensilsCrossed className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white text-sm tracking-wide">MIDTOWN POS</span>
            </div>

            <div className="flex-1 overflow-x-auto no-scrollbar mx-4">
                <nav className="flex items-center gap-1 sm:gap-2">
                    <button
                        onClick={() => router.push('/pos')}
                        className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${typeof window !== 'undefined' && window.location.pathname === '/pos'
                            ? 'bg-white/15 text-white'
                            : 'text-white/60 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        Màn hình POS
                    </button>
                    <button
                        onClick={() => router.push('/orders')}
                        className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${typeof window !== 'undefined' && window.location.pathname.startsWith('/orders')
                            ? 'bg-white/15 text-white'
                            : 'text-white/60 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        Lịch sử bán hàng
                    </button>
                    <button
                        onClick={() => router.push('/cashbook')}
                        className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${typeof window !== 'undefined' && window.location.pathname.startsWith('/cashbook')
                            ? 'bg-white/15 text-white'
                            : 'text-white/60 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        Thu chi
                    </button>
                </nav>
            </div>

            {/* User */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {isAdmin && (
                    <a
                        href="/admin/dashboard"
                        className="hidden sm:flex items-center gap-1.5 text-xs text-white font-medium border border-white/30 rounded-full px-3 py-1 hover:bg-white/10 transition-colors"
                    >
                        <Shield className="w-3 h-3" />
                        Admin
                    </a>
                )}
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-white/15 rounded-full flex items-center justify-center text-xs font-bold text-white">
                        {staffName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-white hidden md:block">{staffName}</span>
                </div>
                <button
                    onClick={handleLogout}
                    className="p-2 text-white/60 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors"
                    title="Đăng xuất"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>

        </header>
    )
}
