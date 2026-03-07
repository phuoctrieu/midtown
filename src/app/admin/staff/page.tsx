'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatDateTime, formatVND } from '@/lib/format'
import { Users } from 'lucide-react'
import type { Profile } from '@/types/database'

export default function StaffPage() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    const { data: staff = [], isLoading } = useQuery<Profile[]>({
        queryKey: ['admin_staff'],
        queryFn: async () => {
            const { data, error } = await supabase.from('profiles').select('*').order('created_at')
            if (error) throw error
            return data || []
        },
    })

    const toggleActive = useMutation({
        mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
            const { error } = await supabase.from('profiles').update({ is_active }).eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin_staff'] })
            toast.success('Đã cập nhật trạng thái')
        },
    })

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#0F172A]">👥 Quản lý nhân viên</h1>
                    <p className="text-sm text-[#64748B] mt-1">{staff.length} người dùng</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#64748B] bg-[#EEF2F7] px-3 py-2 rounded-lg">
                    <Users className="w-3.5 h-3.5" />
                    Thêm nhân viên qua Supabase Auth
                </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                        <tr>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">Nhân viên</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase hidden sm:table-cell">Vai trò</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase hidden md:table-cell">Ngày tạo</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                        {isLoading ? (
                            [...Array(3)].map((_, i) => (
                                <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="h-8 bg-[#EEF2F7] rounded animate-pulse" /></td></tr>
                            ))
                        ) : staff.map((person) => (
                            <tr key={person.id} className="hover:bg-[#F8FAFC] transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-[#EEF2F7] rounded-full flex items-center justify-center text-sm font-bold text-[#DC2626]">
                                            {person.full_name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-[#0F172A]">{person.full_name}</p>
                                            {person.phone && <p className="text-xs text-[#64748B]">{person.phone}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 hidden sm:table-cell">
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${person.role === 'admin' ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#EEF2F7] text-[#64748B]'
                                        }`}>
                                        {person.role === 'admin' ? '🔑 Admin' : '👤 Nhân viên'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-[#64748B] hidden md:table-cell">
                                    {formatDateTime(person.created_at)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button
                                        onClick={() => toggleActive.mutate({ id: person.id, is_active: !person.is_active })}
                                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${person.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'
                                            }`}
                                    >
                                        {person.is_active ? '✓ Hoạt động' : '✗ Vô hiệu'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 p-4 bg-[#EEF2F7] rounded-xl text-sm text-[#64748B]">
                <p className="font-medium text-[#0F172A] mb-1">Cách thêm nhân viên mới:</p>
                <p>1. Vào Supabase Dashboard → Authentication → Users</p>
                <p>2. Nhấn &ldquo;Invite user&rdquo; hoặc &ldquo;Add user&rdquo;</p>
                <p>3. Nhập email + mật khẩu. Profile sẽ tự tạo với role &apos;staff&apos;.</p>
                <p>4. Để set admin: Cập nhật <code className="bg-white px-1 rounded">profiles.role = &apos;admin&apos;</code></p>
            </div>
        </div>
    )
}
