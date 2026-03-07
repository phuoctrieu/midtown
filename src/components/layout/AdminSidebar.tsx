'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
    LayoutDashboard,
    UtensilsCrossed,
    ClipboardList,
    Users,
    Settings,
    LogOut,
    ChevronRight,
    QrCode,
    PieChart,
    Menu,
    BookOpen,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { useState } from 'react'

const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/menu', label: 'Quản lý Menu', icon: UtensilsCrossed },
    { href: '/admin/orders', label: 'Lịch sử Đơn', icon: ClipboardList },
    { href: '/admin/foodcost', label: 'Foodcost', icon: PieChart },
    { href: '/admin/cashbook', label: 'Thu chi', icon: BookOpen },
    { href: '/admin/staff', label: 'Nhân viên', icon: Users },
    { href: '/admin/settings', label: 'Bàn & Cài đặt', icon: Settings },
]

interface AdminSidebarProps {
    staffName: string
}

const SidebarContent = ({ pathname, setOpen, staffName, handleLogout }: { pathname: string, setOpen: (open: boolean) => void, staffName: string, handleLogout: () => void }) => (
    <>
        <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#DC2626] rounded-xl flex items-center justify-center flex-shrink-0">
                    <UtensilsCrossed className="w-5 h-5 text-white" />
                </div>
                <div>
                    <div className="font-bold text-white leading-tight">MIDTOWN</div>
                    <div className="text-xs text-white/60">Admin Panel</div>
                </div>
            </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = item.icon
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-[#DC2626] text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                    >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {isActive && <ChevronRight className="w-3 h-3" />}
                    </Link>
                )
            })}

            <hr className="border-white/10 my-2" />

            <Link
                href="/pos"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
                <QrCode className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">Màn hình POS</span>
            </Link>
        </nav>

        <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-white/15 rounded-full flex items-center justify-center text-sm font-bold text-white">
                    {staffName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{staffName}</div>
                    <div className="text-xs text-white/60">Admin</div>
                </div>
            </div>
            <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-300 hover:bg-white/10 hover:text-red-200 rounded-lg transition-colors"
            >
                <LogOut className="w-4 h-4" />
                Đăng xuất
            </button>
        </div>
    </>
)

export function AdminSidebar({ staffName }: AdminSidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [open, setOpen] = useState(false)

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        toast.success('Đã đăng xuất')
        router.push('/login')
        router.refresh()
    }

    return (
        <>
            {/* Mobile Header */}
            <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#1B2A4A] flex items-center justify-between px-4 z-20 shadow-md">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#DC2626] rounded-lg flex items-center justify-center">
                        <UtensilsCrossed className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-white text-sm tracking-wide">MIDTOWN ADMIN</span>
                </div>
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <button className="p-2 -mr-2 text-white/70 hover:text-white transition-colors">
                            <Menu className="w-6 h-6" />
                        </button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0">
                        <SheetTitle className="sr-only">Admin Menu</SheetTitle>
                        <SheetDescription className="sr-only">Điều hướng bảng quản trị</SheetDescription>
                        <div className="flex flex-col h-full bg-[#1B2A4A]">
                            <SidebarContent pathname={pathname} setOpen={setOpen} staffName={staffName} handleLogout={handleLogout} />
                        </div>
                    </SheetContent>
                </Sheet>
            </header>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-[#1B2A4A] flex-col z-10 shadow-lg" aria-label="Sidebar">
                <SidebarContent pathname={pathname} setOpen={setOpen} staffName={staffName} handleLogout={handleLogout} />
            </aside>
        </>
    )
}

