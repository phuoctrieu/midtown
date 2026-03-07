'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatNumber } from '@/lib/format'
import { endOfDay, startOfDay, format, startOfMonth } from 'date-fns'
import {
    Calendar,
    TrendingUp,
    TrendingDown,
    PackageOpen,
    PieChart,
    DollarSign,
    BarChart2,
    Info,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemStats {
    id: string
    name: string
    quantity: number
    revenue: number      // tổng doanh thu (gross) của món này
    cogs: number         // tổng giá vốn của món này
    grossProfit: number  // revenue - cogs
    profitMargin: number // grossProfit / revenue × 100 (%)
    contribution: number // quantity × (grossProfit per unit) = grossProfit tổng
}

// ─── Tooltip Component ────────────────────────────────────────────────────────

function InfoTooltip({ text }: { text: string }) {
    return (
        <span className="relative group inline-flex items-center ml-1 align-middle">
            <Info className="w-3.5 h-3.5 text-[#9B9B9B] cursor-pointer hover:text-[#64748B] transition-colors" />
            <span
                className="
                    pointer-events-none absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
                    w-56 px-3 py-2 rounded-lg bg-[#0F172A] text-white text-xs leading-relaxed
                    shadow-xl invisible opacity-0 group-hover:visible group-hover:opacity-100
                    transition-all duration-200
                "
            >
                {text}
                {/* arrow */}
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0F172A]" />
            </span>
        </span>
    )
}

// ─── Color helpers ────────────────────────────────────────────────────────────

// Foodcost %: <40% green, 40–50% amber, >50% red
function fcColor(pct: number) {
    if (pct <= 0) return 'text-[#9B9B9B]'
    if (pct > 50) return 'text-red-600'
    if (pct > 40) return 'text-amber-500'
    return 'text-green-600'
}

function fcBgBadge(pct: number) {
    if (pct <= 0) return 'bg-[#EEF2F7] text-[#64748B]'
    if (pct > 50) return 'bg-red-100 text-red-700'
    if (pct > 40) return 'bg-amber-100 text-amber-700'
    return 'bg-green-100 text-green-700'
}

// Profit Margin %: >45% green, 30–45% amber, <30% red
function marginColor(pct: number) {
    if (pct <= 0) return 'text-[#9B9B9B]'
    if (pct < 30) return 'text-red-500'
    if (pct < 45) return 'text-amber-500'
    return 'text-green-600'
}

function marginBgBadge(pct: number) {
    if (pct <= 0) return 'bg-[#EEF2F7] text-[#64748B]'
    if (pct < 30) return 'bg-red-100 text-red-700'
    if (pct < 45) return 'bg-amber-100 text-amber-700'
    return 'bg-green-100 text-green-700'
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtPct(value: number) {
    if (value <= 0) return '—'
    // toFixed(2) rồi bỏ trailing zeros
    return parseFloat(value.toFixed(2)) + '%'
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FoodcostPage() {
    const supabase = createClient()
    const [dateRange, setDateRange] = useState({
        from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        to: format(new Date(), 'yyyy-MM-dd'),
    })

    const { data, isLoading } = useQuery({
        queryKey: ['admin_foodcost', dateRange],
        queryFn: async () => {
            const start = startOfDay(new Date(dateRange.from)).toISOString()
            const end = endOfDay(new Date(dateRange.to)).toISOString()

            const { data: orders, error } = await supabase
                .from('orders')
                .select(`
                    id,
                    total,
                    order_items (
                        menu_item_id,
                        quantity,
                        unit_cost,
                        unit_price,
                        menu_items (name)
                    )
                `)
                .eq('status', 'completed')
                .gte('paid_at', start)
                .lte('paid_at', end)

            if (error) throw error

            let totalRevenue = 0
            let totalCOGS = 0
            const itemMap = new Map<string, ItemStats>()

            orders.forEach(order => {
                totalRevenue += order.total

                order.order_items.forEach(item => {
                    const cogs = (item.unit_cost || 0) * item.quantity
                    const grossRevenue = item.unit_price * item.quantity

                    totalCOGS += cogs

                    const existing = itemMap.get(item.menu_item_id)
                    if (existing) {
                        existing.quantity += item.quantity
                        existing.cogs += cogs
                        existing.revenue += grossRevenue
                    } else {
                        const name = Array.isArray(item.menu_items)
                            ? item.menu_items[0]?.name
                            : (item.menu_items as { name: string } | null)?.name || 'Unknown'
                        itemMap.set(item.menu_item_id, {
                            id: item.menu_item_id,
                            name,
                            quantity: item.quantity,
                            cogs,
                            revenue: grossRevenue,
                            grossProfit: 0,
                            profitMargin: 0,
                            contribution: 0,
                        })
                    }
                })
            })

            // Compute derived metrics for each item
            const itemStats: ItemStats[] = Array.from(itemMap.values()).map(item => {
                const grossProfit = item.revenue - item.cogs
                const profitMargin = item.revenue > 0 ? (grossProfit / item.revenue) * 100 : 0
                // Contribution = tổng gross profit của món (đã tích lũy theo quantity)
                const contribution = grossProfit
                return { ...item, grossProfit, profitMargin, contribution }
            })

            // Sort by contribution DESC (món đóng góp nhiều lợi nhuận nhất lên đầu)
            itemStats.sort((a, b) => b.contribution - a.contribution)

            return { totalRevenue, totalCOGS, itemStats }
        },
    })

    const totalRevenue = data?.totalRevenue || 0
    const totalCOGS = data?.totalCOGS || 0
    const totalGrossProfit = totalRevenue - totalCOGS
    const foodcostPercent = totalRevenue > 0 ? (totalCOGS / totalRevenue) * 100 : 0
    const profitMarginPercent = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0
    const itemStats = data?.itemStats || []

    // ─── Summary cards config ────────────────────────────────────────────────
    const cards = [
        {
            label: 'Doanh thu',
            value: `${formatNumber(totalRevenue)}₫`,
            icon: <TrendingUp className="w-5 h-5" />,
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
            valueColor: 'text-blue-700',
            tooltip: 'Tổng tiền khách đã thanh toán cho các đơn hàng hoàn thành trong kỳ.',
        },
        {
            label: 'Tổng giá vốn (COGS)',
            value: `${formatNumber(totalCOGS)}₫`,
            icon: <TrendingDown className="w-5 h-5" />,
            iconBg: 'bg-red-50',
            iconColor: 'text-red-600',
            valueColor: 'text-red-600',
            tooltip: 'Tổng chi phí nguyên liệu để sản xuất ra các món đã bán.',
        },
        {
            label: 'Foodcost %',
            value: fmtPct(foodcostPercent),
            icon: <PieChart className="w-5 h-5" />,
            iconBg: 'bg-purple-50',
            iconColor: 'text-purple-600',
            valueColor: foodcostPercent > 40 ? 'text-red-500' : 'text-purple-700',
            tooltip: 'Tỷ lệ chi phí nguyên liệu so với doanh thu. Foodcost tốt trong nhà hàng thường từ 30% đến 40%.',
        },
        {
            label: 'Lợi nhuận gộp',
            value: `${formatNumber(totalGrossProfit)}₫`,
            icon: <DollarSign className="w-5 h-5" />,
            iconBg: 'bg-green-50',
            iconColor: 'text-green-600',
            valueColor: totalGrossProfit >= 0 ? 'text-green-700' : 'text-red-600',
            tooltip: 'Lợi nhuận gộp là số tiền còn lại sau khi trừ giá vốn nguyên liệu. Đây là tiền nhà hàng dùng để trả lương nhân viên, tiền thuê mặt bằng, điện nước và tạo lợi nhuận.',
        },
        {
            label: 'Profit Margin %',
            value: fmtPct(profitMarginPercent),
            icon: <BarChart2 className="w-5 h-5" />,
            iconBg: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
            valueColor: profitMarginPercent < 30 && profitMarginPercent > 0 ? 'text-orange-500' : 'text-indigo-700',
            tooltip: `Tỷ suất lợi nhuận cho biết mỗi 100.000₫ doanh thu thì nhà hàng giữ lại được bao nhiêu tiền sau khi trừ giá vốn nguyên liệu.\nVí dụ: Margin 40% → bán 100.000₫ còn lại 40.000₫.`,
        },
    ]

    return (
        <div className="max-w-7xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#0F172A]">📊 Báo cáo Foodcost & Lợi Nhuận</h1>
                    <p className="text-sm text-[#64748B] mt-1">Phân tích giá vốn, lợi nhuận gộp và hiệu quả từng món ăn</p>
                </div>
                <div className="flex gap-2 bg-white border border-[#E2E8F0] rounded-xl p-1 shadow-sm">
                    <input
                        type="date"
                        value={dateRange.from}
                        onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                        className="px-3 py-1.5 text-sm bg-transparent border-none focus:ring-0 text-[#0F172A]"
                    />
                    <span className="text-[#64748B] self-center">–</span>
                    <input
                        type="date"
                        value={dateRange.to}
                        onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                        className="px-3 py-1.5 text-sm bg-transparent border-none focus:ring-0 text-[#0F172A]"
                    />
                </div>
            </div>

            {/* 5 Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {cards.map(card => (
                    <div key={card.label} className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                            <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center ${card.iconColor} shrink-0`}>
                                {card.icon}
                            </div>
                            <span className="text-xs font-medium text-[#64748B] leading-tight">
                                {card.label}
                                <InfoTooltip text={card.tooltip} />
                            </span>
                        </div>
                        {isLoading ? (
                            <div className="h-7 bg-[#EEF2F7] rounded animate-pulse w-3/4" />
                        ) : (
                            <p className={`text-xl font-bold ${card.valueColor} truncate`}>{card.value}</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Interpretation banner */}
            {!isLoading && totalRevenue > 0 && (
                <div className={`rounded-xl px-5 py-4 text-sm font-medium border ${foodcostPercent > 50
                        ? 'bg-red-50 border-red-300 text-red-800'
                        : foodcostPercent > 40
                            ? 'bg-amber-50 border-amber-300 text-amber-800'
                            : foodcostPercent >= 30
                                ? 'bg-green-50 border-green-200 text-green-800'
                                : 'bg-sky-50 border-sky-200 text-sky-800'
                    }`}>
                    <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5 shrink-0">
                            {foodcostPercent > 50 ? '🚨' : foodcostPercent > 40 ? '⚠️' : foodcostPercent >= 30 ? '✅' : '💡'}
                        </span>
                        <div>
                            {foodcostPercent > 50 ? (
                                <>
                                    <span className="font-bold">Nguy hiểm!</span> Foodcost đang ở mức <span className="font-bold">{fmtPct(foodcostPercent)}</span> — vượt quá 50%. Nhà hàng có thể đang lỗ trên nguyên liệu.<br />
                                    <span className="text-xs font-normal opacity-80 mt-1 block">Cần kiểm tra ngay: giá nguyên liệu, định lượng từng món, và giá bán hiện tại.</span>
                                </>
                            ) : foodcostPercent > 40 ? (
                                <>
                                    <span className="font-bold">Cần theo dõi.</span> Foodcost đang ở mức <span className="font-bold">{fmtPct(foodcostPercent)}</span> — cao hơn ngưỡng lý tưởng 30–40%.<br />
                                    <span className="text-xs font-normal opacity-80 mt-1 block">Xem xét tối ưu định lượng nguyên liệu hoặc điều chỉnh giá bán một số món.</span>
                                </>
                            ) : foodcostPercent >= 30 ? (
                                <>
                                    <span className="font-bold">Đang tốt!</span> Foodcost ở mức <span className="font-bold">{fmtPct(foodcostPercent)}</span> — nằm trong vùng lý tưởng 30–40%. Tiếp tục duy trì!
                                </>
                            ) : (
                                <>
                                    <span className="font-bold">Foodcost thấp ({fmtPct(foodcostPercent)}).</span> Kiểm tra lại xem đã nhập đầy đủ giá vốn cho tất cả các món chưa.
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Per-item detail table */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-[#0F172A]">Chi tiết phân tích lợi nhuận theo món</h3>
                        <p className="text-xs text-[#9B9B9B] mt-0.5">Sắp xếp theo Contribution (đóng góp lợi nhuận cao → thấp)</p>
                    </div>
                    {!isLoading && itemStats.length > 0 && (
                        <span className="text-xs text-[#64748B] bg-[#F8FAFC] px-3 py-1 rounded-full border border-[#E2E8F0]">
                            {itemStats.length} món
                        </span>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[780px]">
                        <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Món</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                                    SL Bán
                                    <InfoTooltip text="Số lượng đã bán trong kỳ chọn." />
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                                    Doanh Thu
                                    <InfoTooltip text="Tổng tiền bán ra (giá bán × số lượng) của món này." />
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                                    COGS
                                    <InfoTooltip text="Tổng giá vốn nguyên liệu (giá nhập × số lượng) của món này." />
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                                    Foodcost %
                                    <InfoTooltip text="Tỷ lệ chi phí nguyên liệu so với doanh thu. Foodcost tốt trong nhà hàng thường từ 30% đến 40%." />
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                                    Gross Profit
                                    <InfoTooltip text="Lợi nhuận gộp = Doanh thu − Giá vốn. Tiền còn lại sau khi trừ chi phí nguyên liệu." />
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                                    Profit Margin
                                    <InfoTooltip text="Tỷ suất lợi nhuận = Lợi nhuận gộp ÷ Doanh thu. Cho biết % doanh thu nhà hàng giữ lại sau giá vốn." />
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                                    Contribution
                                    <InfoTooltip text="Tổng lợi nhuận mà món ăn đóng góp = Số lượng × Lợi nhuận gộp mỗi phần. Món bán nhiều và lợi nhuận cao sẽ có Contribution lớn." />
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                            {isLoading ? (
                                [...Array(4)].map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={8} className="px-4 py-4">
                                            <div className="h-4 bg-[#EEF2F7] rounded animate-pulse w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : itemStats.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-16">
                                        <PackageOpen className="w-12 h-12 text-[#E2E8F0] mx-auto mb-3" />
                                        <p className="text-[#64748B] text-sm font-medium">Không có dữ liệu bán hàng trong thời gian này</p>
                                        <p className="text-[#9B9B9B] text-xs mt-1">Chọn khoảng thời gian khác hoặc kiểm tra lại dữ liệu</p>
                                    </td>
                                </tr>
                            ) : (
                                itemStats.map((item, idx) => {
                                    const fcPct = item.revenue > 0 ? (item.cogs / item.revenue) * 100 : 0
                                    return (
                                        <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors group">
                                            {/* Rank + name */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-[#C0BDB5] font-mono w-5 text-right shrink-0">
                                                        {idx + 1}
                                                    </span>
                                                    <p className="text-sm font-medium text-[#0F172A]">{item.name}</p>
                                                </div>
                                            </td>

                                            {/* Qty */}
                                            <td className="px-4 py-3.5 text-center">
                                                <span className="inline-flex items-center justify-center bg-[#EEF2F7] text-[#0F172A] text-xs font-semibold rounded-full px-2.5 py-0.5 min-w-[32px]">
                                                    {item.quantity}
                                                </span>
                                            </td>

                                            {/* Revenue */}
                                            <td className="px-4 py-3.5 text-right">
                                                <span className="text-sm font-semibold text-blue-600">
                                                    {formatNumber(item.revenue)}₫
                                                </span>
                                            </td>

                                            {/* COGS */}
                                            <td className="px-4 py-3.5 text-right">
                                                <span className="text-sm font-semibold text-red-600">
                                                    {item.cogs > 0 ? `${formatNumber(item.cogs)}₫` : '—'}
                                                </span>
                                            </td>

                                            {/* Foodcost % */}
                                            <td className="px-4 py-3.5 text-right">
                                                {item.cogs > 0 ? (
                                                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${fcBgBadge(fcPct)}`}>
                                                        {fmtPct(fcPct)}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-[#9B9B9B]">—</span>
                                                )}
                                            </td>

                                            {/* Gross Profit */}
                                            <td className="px-4 py-3.5 text-right">
                                                <span className={`text-sm font-semibold ${item.grossProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {formatNumber(item.grossProfit)}₫
                                                </span>
                                            </td>

                                            {/* Profit Margin */}
                                            <td className="px-4 py-3.5 text-right">
                                                {item.revenue > 0 ? (
                                                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${marginBgBadge(item.profitMargin)}`}>
                                                        {fmtPct(item.profitMargin)}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-[#9B9B9B]">—</span>
                                                )}
                                            </td>

                                            {/* Contribution */}
                                            <td className="px-4 py-3.5 text-right">
                                                <span className="text-sm font-bold text-indigo-600">
                                                    {formatNumber(item.contribution)}₫
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>

                        {/* Footer totals row */}
                        {!isLoading && itemStats.length > 0 && (
                            <tfoot className="bg-[#F8FAFC] border-t-2 border-[#E2E8F0]">
                                <tr>
                                    <td colSpan={2} className="px-4 py-3.5 text-sm font-bold text-[#0F172A]">
                                        Tổng cộng
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-sm font-bold text-blue-700">
                                        {formatNumber(totalRevenue)}₫
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-sm font-bold text-red-700">
                                        {formatNumber(totalCOGS)}₫
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-sm font-bold">
                                        <span className={fcColor(foodcostPercent)}>{fmtPct(foodcostPercent)}</span>
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-sm font-bold text-green-700">
                                        {formatNumber(totalGrossProfit)}₫
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-sm font-bold">
                                        <span className={marginColor(profitMarginPercent)}>{fmtPct(profitMarginPercent)}</span>
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-sm font-bold text-indigo-700">
                                        {formatNumber(totalGrossProfit)}₫
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Legend / Glossary */}
            <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] px-5 py-5">
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-4">📖 Giải thích các chỉ số</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    {/* Foodcost % */}
                    <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 space-y-2">
                        <p className="text-sm font-bold text-purple-700">Foodcost %</p>
                        <p className="text-xs text-[#64748B]"><span className="font-semibold">Công thức:</span> COGS ÷ Doanh thu</p>
                        <p className="text-xs text-[#64748B]">Tỷ lệ chi phí nguyên liệu so với doanh thu. Chỉ số này cho biết mỗi 100.000₫ bán ra thì tốn bao nhiêu tiền nguyên liệu.</p>
                        <div className="text-xs space-y-1 pt-1">
                            <p className="font-semibold text-[#4B4B4B]">Ngưỡng chuẩn ngành nhà hàng:</p>
                            <p><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 mr-1.5 align-middle"></span><strong>30–40%</strong> → Mức lý tưởng ✅</p>
                            <p><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 mr-1.5 align-middle"></span><strong>40–50%</strong> → Cần theo dõi ⚠️</p>
                            <p><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5 align-middle"></span><strong>&gt;50%</strong> → Nguy hiểm 🚨</p>
                        </div>
                        <p className="text-xs bg-[#F8FAFC] rounded px-2 py-1.5 text-[#64748B] border border-[#E2E8F0]">
                            <span className="font-semibold">Ví dụ:</span> Bán món 100.000₫, COGS = 40.000₫ → Foodcost = 40%
                        </p>
                    </div>

                    {/* Gross Profit */}
                    <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 space-y-2">
                        <p className="text-sm font-bold text-green-700">Gross Profit (Lợi nhuận gộp)</p>
                        <p className="text-xs text-[#64748B]"><span className="font-semibold">Công thức:</span> Doanh thu − COGS</p>
                        <p className="text-xs text-[#64748B]">Số tiền còn lại sau khi trừ chi phí nguyên liệu. Đây là khoản nhà hàng dùng để chi trả:</p>
                        <ul className="text-xs text-[#64748B] list-disc list-inside space-y-0.5 pl-1">
                            <li>Lương nhân viên</li>
                            <li>Tiền thuê mặt bằng</li>
                            <li>Điện, nước, gas</li>
                            <li>Lợi nhuận của chủ nhà hàng</li>
                        </ul>
                        <p className="text-xs bg-[#F8FAFC] rounded px-2 py-1.5 text-[#64748B] border border-[#E2E8F0]">
                            <span className="font-semibold">Ví dụ:</span> Doanh thu 10.000.000₫, COGS 4.000.000₫ → Gross Profit = 6.000.000₫
                        </p>
                    </div>

                    {/* Profit Margin */}
                    <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 space-y-2">
                        <p className="text-sm font-bold text-indigo-700">Profit Margin % (Tỷ suất lợi nhuận)</p>
                        <p className="text-xs text-[#64748B]"><span className="font-semibold">Công thức:</span> Gross Profit ÷ Doanh thu</p>
                        <p className="text-xs text-[#64748B]">Cho biết mỗi 100.000₫ doanh thu thì nhà hàng giữ lại được bao nhiêu sau khi trừ giá vốn nguyên liệu.</p>
                        <div className="text-xs space-y-1 pt-1">
                            <p className="font-semibold text-[#4B4B4B]">Ngưỡng đánh giá:</p>
                            <p><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 mr-1.5 align-middle"></span><strong>&gt;45%</strong> → Lợi nhuận tốt ✅</p>
                            <p><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 mr-1.5 align-middle"></span><strong>30–45%</strong> → Trung bình ⚠️</p>
                            <p><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5 align-middle"></span><strong>&lt;30%</strong> → Lợi nhuận thấp 🔴</p>
                        </div>
                        <p className="text-xs bg-[#F8FAFC] rounded px-2 py-1.5 text-[#64748B] border border-[#E2E8F0]">
                            <span className="font-semibold">Ví dụ:</span> Margin 40% → bán 100.000₫ còn lại 40.000₫
                        </p>
                    </div>

                    {/* Contribution */}
                    <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 space-y-2">
                        <p className="text-sm font-bold text-indigo-700">Contribution (Đóng góp lợi nhuận)</p>
                        <p className="text-xs text-[#64748B]"><span className="font-semibold">Công thức:</span> Số lượng bán × Lợi nhuận gộp mỗi phần</p>
                        <p className="text-xs text-[#64748B]">Tổng số tiền mà một món ăn đóng góp vào lợi nhuận của nhà hàng trong khoảng thời gian được chọn.</p>
                        <p className="text-xs text-[#64748B]">Món có Contribution cao thường do:</p>
                        <ul className="text-xs text-[#64748B] list-disc list-inside space-y-0.5 pl-1">
                            <li>Bán được số lượng nhiều</li>
                            <li>Hoặc có lợi nhuận gộp cao trên mỗi phần</li>
                        </ul>
                        <p className="text-xs bg-[#F8FAFC] rounded px-2 py-1.5 text-[#64748B] border border-[#E2E8F0]">
                            <span className="font-semibold">Tip:</span> Đây là món nên <strong>đẩy bán</strong> vì mang lại nhiều tiền nhất cho nhà hàng.
                        </p>
                    </div>

                </div>
            </div>

        </div>
    )
}
