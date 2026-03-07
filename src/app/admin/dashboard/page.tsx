'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatVND, formatNumber, getTodayVN } from '@/lib/format'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, ShoppingBag, Banknote, CreditCard } from 'lucide-react'
import { useState } from 'react'
import { formatDateTime } from '@/lib/format'

export default function DashboardPage() {
    const supabase = createClient()
    const today = getTodayVN()
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 6)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })
    const [toDate, setToDate] = useState(today)

    // Today's stats
    const { data: todayStats } = useQuery({
        queryKey: ['today_stats'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_today_summary')
            if (error) throw error
            return data?.[0] || { total_revenue: 0, order_count: 0, cash_amount: 0, transfer_amount: 0, cancelled_count: 0 }
        },
        refetchInterval: 30000,
    })

    // Daily revenue chart
    const { data: dailyRevenue = [] } = useQuery({
        queryKey: ['daily_revenue', fromDate, toDate],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_daily_revenue', {
                p_from: fromDate,
                p_to: toDate,
            })
            if (error) throw error
            return (data || []).map((d: { date: string; total_revenue: number; order_count: number }) => ({
                date: d.date.slice(5),
                revenue: Number(d.total_revenue),
                orders: Number(d.order_count),
            }))
        },
    })

    // Staff revenue
    const { data: staffRevenue = [] } = useQuery({
        queryKey: ['staff_revenue', fromDate, toDate],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_staff_revenue', {
                p_from: fromDate,
                p_to: toDate,
            })
            if (error) throw error
            return data || []
        },
    })

    // Cancelled orders
    const { data: cancelledOrders = [] } = useQuery({
        queryKey: ['cancelled_orders'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('*, profiles!orders_staff_id_fkey(*)')
                .eq('status', 'cancelled')
                .order('cancelled_at', { ascending: false })
                .limit(5)
            if (error) throw error
            return data || []
        },
    })

    const totalRevenue = Number(todayStats?.total_revenue || 0)
    const orderCount = Number(todayStats?.order_count || 0)
    const cashAmount = Number(todayStats?.cash_amount || 0)
    const transferAmount = Number(todayStats?.transfer_amount || 0)

    const paymentData = [
        { name: 'Tiền mặt', value: cashAmount, color: '#2D8A4E' },
        { name: 'Chuyển khoản', value: transferAmount, color: '#1E40AF' },
    ]

    const statCards = [
        { label: 'Doanh thu hôm nay', value: formatVND(totalRevenue), icon: TrendingUp, color: '#DC2626', bg: '#FEF2F2' },
        { label: 'Số hóa đơn', value: `${orderCount} đơn`, icon: ShoppingBag, color: '#1E40AF', bg: '#EFF6FF' },
        { label: 'Tiền mặt', value: formatVND(cashAmount), icon: Banknote, color: '#2D8A4E', bg: '#ECFDF5' },
        { label: 'Chuyển khoản', value: formatVND(transferAmount), icon: CreditCard, color: '#7C3AED', bg: '#F5F3FF' },
    ]

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#0F172A]">📊 Dashboard</h1>
                <p className="text-sm text-[#64748B] mt-1">Hôm nay: {today}</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => {
                    const Icon = card.icon
                    return (
                        <div key={card.label} className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
                                    <Icon className="w-4 h-4" style={{ color: card.color }} />
                                </div>
                                <span className="text-xs text-[#64748B] font-medium">{card.label}</span>
                            </div>
                            <p className="price-text text-xl font-bold text-[#0F172A]">{card.value}</p>
                        </div>
                    )
                })}
            </div>

            {/* Date filter */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-[#64748B]">Từ:</label>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                        className="border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#DC2626]" />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-[#64748B]">Đến:</label>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                        className="border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#DC2626]" />
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Revenue bar chart */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
                    <h2 className="font-semibold text-[#0F172A] mb-4">Doanh thu theo ngày</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={dailyRevenue}>
                            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748B' }} />
                            <YAxis tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                                formatter={(v: number | string | undefined) => [formatVND(Number(v || 0)), 'Doanh thu']}
                                contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
                            />
                            <Bar dataKey="revenue" fill="#DC2626" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Payment pie chart */}
                <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
                    <h2 className="font-semibold text-[#0F172A] mb-4">Phương thức TT</h2>
                    {totalRevenue > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={paymentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                                    {paymentData.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Legend formatter={(val) => <span style={{ fontSize: 12, color: '#64748B' }}>{val}</span>} />
                                <Tooltip formatter={(v: number | string | undefined) => formatVND(Number(v || 0))} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-[#64748B] text-sm">Chưa có dữ liệu</div>
                    )}
                </div>
            </div>

            {/* Staff Revenue + Cancelled */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Staff revenue */}
                <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
                    <h2 className="font-semibold text-[#0F172A] mb-4">Doanh thu theo nhân viên</h2>
                    {staffRevenue.length === 0 ? (
                        <p className="text-sm text-[#64748B] py-8 text-center">Chưa có dữ liệu</p>
                    ) : (
                        <div className="space-y-3">
                            {staffRevenue.map((s: { staff_id: string; staff_name: string; total_revenue: number; order_count: number }) => (
                                <div key={s.staff_id} className="flex items-center gap-3">
                                    <div className="w-7 h-7 bg-[#EEF2F7] rounded-full flex items-center justify-center text-xs font-bold text-[#DC2626]">
                                        {s.staff_name?.charAt(0) || 'N'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium text-[#0F172A] truncate">{s.staff_name}</span>
                                            <span className="price-text text-[#DC2626] font-semibold flex-shrink-0 ml-2">{formatVND(Number(s.total_revenue))}</span>
                                        </div>
                                        <div className="text-xs text-[#64748B]">{s.order_count} đơn</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Cancelled orders */}
                <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
                    <h2 className="font-semibold text-[#0F172A] mb-4">Hóa đơn đã hủy gần đây</h2>
                    {cancelledOrders.length === 0 ? (
                        <p className="text-sm text-[#64748B] py-8 text-center">Không có hóa đơn hủy</p>
                    ) : (
                        <div className="space-y-3">
                            {cancelledOrders.map((o: { id: string; order_number: number; profiles?: { full_name: string }; cancelled_at?: string; cancel_reason: string }) => (
                                <div key={o.id} className="p-3 bg-red-50 rounded-lg border border-red-100">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-[#0F172A]">#{o.order_number}</span>
                                        <span className="text-[#64748B] text-xs">{o.cancelled_at ? formatDateTime(o.cancelled_at) : ''}</span>
                                    </div>
                                    <div className="text-xs text-[#64748B] mt-1">NV: {o.profiles?.full_name || 'N/A'}</div>
                                    <div className="text-xs text-[#D32F2F] mt-1 italic">Lý do: {o.cancel_reason}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
