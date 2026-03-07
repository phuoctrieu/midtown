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
        <div className="p-6 border-b border-[#E0DCD4]">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#D4553A] rounded-xl flex items-center justify-center flex-shrink-0">
                    <UtensilsCrossed className="w-5 h-5 text-white" />
                </div>
                <div>
                    <div className="font-bold text-[#1A1A1A] leading-tight">MIDTOWN</div>
                    <div className="text-xs text-[#6B6B6B]">Admin Panel</div>
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
                        className={`sidebar-link ${isActive ? 'active' : ''}`}
                    >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 text-sm">{item.label}</span>
                        {isActive && <ChevronRight className="w-3 h-3" />}
                    </Link>
                )
            })}

            <hr className="border-[#E0DCD4] my-2" />

            <Link
                href="/pos"
                onClick={() => setOpen(false)}
                className="sidebar-link"
            >
                <QrCode className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-sm">Màn hình POS</span>
            </Link>
        </nav>

        <div className="p-4 border-t border-[#E0DCD4]">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-[#F0EDE6] rounded-full flex items-center justify-center text-sm font-bold text-[#D4553A]">
                    {staffName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#1A1A1A] truncate">{staffName}</div>
                    <div className="text-xs text-[#6B6B6B]">Admin</div>
                </div>
            </div>
            <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#D32F2F] hover:bg-red-50 rounded-lg transition-colors"
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
            <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#E0DCD4] flex items-center justify-between px-4 z-20 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#D4553A] rounded-lg flex items-center justify-center">
                        <UtensilsCrossed className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-[#1A1A1A] text-sm tracking-wide">MIDTOWN ADMIN</span>
                </div>
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <button className="p-2 -mr-2 text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors">
                            <Menu className="w-6 h-6" />
                        </button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0">
                        <SheetTitle className="sr-only">Admin Menu</SheetTitle>
                        <SheetDescription className="sr-only">Điều hướng bảng quản trị</SheetDescription>
                        <div className="flex flex-col h-full bg-white">
                            <SidebarContent pathname={pathname} setOpen={setOpen} staffName={staffName} handleLogout={handleLogout} />
                        </div>
                    </SheetContent>
                </Sheet>
            </header>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-[#E0DCD4] flex-col z-10 shadow-sm" aria-label="Sidebar">
                <SidebarContent pathname={pathname} setOpen={setOpen} staffName={staffName} handleLogout={handleLogout} />
            </aside>
        </>
    )
}

