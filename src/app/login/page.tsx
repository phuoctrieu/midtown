'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginWithEmail } from './actions'
import { toast } from 'sonner'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const formData = new FormData()
            formData.append('email', email)
            formData.append('password', password)

            const result = await loginWithEmail(formData)

            if (result.error) {
                toast.error('Đăng nhập thất bại: ' + result.error)
                return
            }

            if (result.success) {
                if (result.role === 'admin') {
                    router.push('/admin/dashboard')
                } else {
                    router.push('/pos')
                }
                router.refresh()
            }
        } catch {
            toast.error('Có lỗi xảy ra. Vui lòng thử lại.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#1B2A4A]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}>
            <div className="w-full max-w-md px-4">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-[#DC2626] rounded-2xl mb-4 shadow-lg">
                        <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 13H9V7h2v8zm4 0h-2V7h2v8z" />
                            <path d="M8.5 5C7.1 5 6 6.1 6 7.5V17c0 .55.45 1 1 1h10c.55 0 1-.45 1-1V7.5C18 6.1 16.9 5 15.5 5h-7z" fillOpacity="0" />
                            <path d="M7 3h10v2H7zM7 19h10v2H7z" fillOpacity="0.3" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">MIDTOWN</h1>
                    <p className="text-white/60 mt-1 text-sm">Hệ thống quản lý nhà hàng</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-[#DC2626] to-[#1B2A4A]" />

                    <div className="p-8">
                        <h2 className="text-xl font-semibold text-[#0F172A] mb-6">Đăng nhập</h2>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="example@midtown.com"
                                    required
                                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                                    Mật khẩu
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold py-3 px-6 rounded-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Đang đăng nhập...
                                    </>
                                ) : (
                                    'Đăng nhập'
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                <p className="text-center text-white/40 text-xs mt-6">
                    © 2026 Midtown Restaurant · Cảm ơn một nỗi đau
                </p>
            </div>
        </div>
    )
}
