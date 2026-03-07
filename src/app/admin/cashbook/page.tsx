'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatVND, getTodayVN } from '@/lib/format'
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    Plus,
    Trash2,
    BookOpen,
    ChevronDown,
    Zap,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Constants ─────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = ['Nguyên liệu', 'Vật tư', 'Lương nhân viên', 'Điện nước', 'Chi phí khác']
const INCOME_CATEGORIES = ['Thu khác']   // "Bán hàng" handled automatically by POS

type TxType = 'income' | 'expense'

interface CashTransaction {
    id: string
    date: string
    time: string
    type: TxType
    category: string
    description: string | null
    amount: number
    created_at: string
}

// ─── Date filter helpers ────────────────────────────────────────────────────────

function getDateRange(filter: string, customFrom: string, customTo: string): { from: string; to: string } {
    const today = getTodayVN()
    if (filter === 'today') return { from: today, to: today }
    if (filter === '7d') {
        const d = new Date(); d.setDate(d.getDate() - 6)
        return { from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, to: today }
    }
    if (filter === '30d') {
        const d = new Date(); d.setDate(d.getDate() - 29)
        return { from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, to: today }
    }
    return { from: customFrom, to: customTo }
}

// POS revenue grouped by date  { '2026-03-07': 12345000, ... }
type PosByDate = Record<string, number>

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CashbookPage() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    const today = getTodayVN()

    // Date filter state
    const [filter, setFilter] = useState<'today' | '7d' | '30d' | 'custom'>('today')
    const [customFrom, setCustomFrom] = useState(today)
    const [customTo, setCustomTo] = useState(today)
    const { from, to } = getDateRange(filter, customFrom, customTo)

    // Form state
    const [form, setForm] = useState({
        date: today,
        type: 'expense' as TxType,
        category: EXPENSE_CATEGORIES[0],
        description: '',
        amount: '',
    })

    const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

    // ── Queries ─────────────────────────────────────────────────────────────────

    // Manual transactions from cash_transactions table
    const { data: transactions = [], isLoading } = useQuery<CashTransaction[]>({
        queryKey: ['cash_transactions', from, to],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cash_transactions')
                .select('*')
                .gte('date', from)
                .lte('date', to)
                .order('date', { ascending: false })
                .order('time', { ascending: false })
            if (error) throw error
            return data || []
        },
    })

    // POS revenue auto-synced from orders — grouped by date
    const { data: posByDate = {} } = useQuery<PosByDate>({
        queryKey: ['pos_revenue_by_date', from, to],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('total, paid_at')
                .eq('status', 'completed')
                .gte('paid_at', `${from}T00:00:00+07:00`)
                .lte('paid_at', `${to}T23:59:59+07:00`)
            if (error) throw error
            const map: PosByDate = {}
            for (const row of data || []) {
                // Extract VN date from paid_at
                const d = new Date(row.paid_at)
                const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d) // YYYY-MM-DD
                map[key] = (map[key] || 0) + Number(row.total)
            }
            return map
        },
        refetchInterval: 60_000, // auto-refresh every minute
    })

    // Total POS revenue over the period
    const totalPosRevenue = Object.values(posByDate).reduce((s, v) => s + v, 0)

    // ── Computed summaries ───────────────────────────────────────────────────────

    const manualIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const totalIncome = manualIncome + totalPosRevenue        // POS included automatically
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const balance = totalIncome - totalExpense

    // Expense by category
    const expenseByCategory = EXPENSE_CATEGORIES.map(cat => ({
        category: cat,
        amount: transactions.filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0),
    })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount)

    // ── Mutations ────────────────────────────────────────────────────────────────

    const addMutation = useMutation({
        mutationFn: async () => {
            const amount = parseInt(form.amount.replace(/\D/g, ''), 10)
            if (!amount || amount <= 0) throw new Error('Số tiền không hợp lệ')
            const now = new Date()
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`
            const { error } = await supabase.from('cash_transactions').insert({
                date: form.date,
                time: timeStr,
                type: form.type,
                category: form.category,
                description: form.description || null,
                amount,
            })
            if (error) throw error
        },
        onSuccess: () => {
            toast.success('Đã lưu giao dịch')
            setForm(prev => ({ ...prev, amount: '', description: '' }))
            queryClient.invalidateQueries({ queryKey: ['cash_transactions'] })
        },
        onError: (e: Error) => toast.error(e.message || 'Lỗi khi lưu'),
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('cash_transactions').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            toast.success('Đã xóa')
            queryClient.invalidateQueries({ queryKey: ['cash_transactions'] })
        },
        onError: () => toast.error('Lỗi khi xóa'),
    })

    // Unique dates with POS revenue in the range (for displaying virtual rows)
    const posDates = Object.entries(posByDate)
        .filter(([, v]) => v > 0)
        .sort(([a], [b]) => b.localeCompare(a))   // newest first

    // Build combined ledger: merge manual transactions + POS virtual rows, sorted newest first
    type LedgerRow =
        | { kind: 'manual'; tx: CashTransaction }
        | { kind: 'pos'; date: string; amount: number }

    const ledger: LedgerRow[] = []
    const posDateSet = new Set(posDates.map(([d]) => d))
    const txDates = new Set(transactions.map(t => t.date))
    const allDates = new Set([...Array.from(posDateSet), ...Array.from(txDates)])

    // Sorted unique dates descending
    const sortedDates = Array.from(allDates).sort((a, b) => b.localeCompare(a))

    for (const date of sortedDates) {
        // Insert POS row for this date if exists
        if (posByDate[date]) {
            ledger.push({ kind: 'pos', date, amount: posByDate[date] })
        }
        // Then manually entered transactions (already sorted by time desc within date)
        for (const tx of transactions.filter(t => t.date === date)) {
            ledger.push({ kind: 'manual', tx })
        }
    }

    const ledgerCount = transactions.length + posDates.length

    // ── Render ───────────────────────────────────────────────────────────────────

    return (
        <div className="max-w-5xl mx-auto space-y-6">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[#1A1A1A] flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-[#D4553A]" />
                    Sổ thu chi
                </h1>
                <p className="text-sm text-[#6B6B6B] mt-1">
                    Theo dõi doanh thu và chi phí hàng ngày •
                    <span className="text-green-600 font-medium ml-1 inline-flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Doanh thu POS tự động cập nhật
                    </span>
                </p>
            </div>

            {/* Date Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
                {(['today', '7d', '30d', 'custom'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === f
                            ? 'bg-[#D4553A] text-white shadow-sm'
                            : 'bg-white border border-[#E0DCD4] text-[#6B6B6B] hover:border-[#D4553A] hover:text-[#D4553A]'
                            }`}
                    >
                        {f === 'today' ? 'Hôm nay' : f === '7d' ? '7 ngày' : f === '30d' ? '30 ngày' : 'Tuỳ chọn'}
                    </button>
                ))}
                {filter === 'custom' && (
                    <div className="flex items-center gap-2 bg-white border border-[#E0DCD4] rounded-xl px-3 py-1.5 shadow-sm">
                        <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                            className="text-sm bg-transparent border-none focus:ring-0 text-[#1A1A1A]" />
                        <span className="text-[#6B6B6B]">–</span>
                        <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                            className="text-sm bg-transparent border-none focus:ring-0 text-[#1A1A1A]" />
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-[#E0DCD4] p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-xs text-[#6B6B6B] font-medium">Tổng thu</span>
                    </div>
                    <p className="price-text text-xl font-bold text-green-700">{formatVND(totalIncome)}</p>
                    {totalPosRevenue > 0 && (
                        <p className="text-[10px] text-[#9B9B9B] mt-1 flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5 text-green-500" />
                            gồm {formatVND(totalPosRevenue)} từ POS
                        </p>
                    )}
                </div>

                <div className="bg-white rounded-xl border border-[#E0DCD4] p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
                            <TrendingDown className="w-4 h-4 text-red-500" />
                        </div>
                        <span className="text-xs text-[#6B6B6B] font-medium">Tổng chi</span>
                    </div>
                    <p className="price-text text-xl font-bold text-red-600">{formatVND(totalExpense)}</p>
                </div>

                <div className={`rounded-xl border p-4 shadow-sm ${balance >= 0 ? 'bg-white border-[#E0DCD4]' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${balance >= 0 ? 'bg-[#FEF1ED]' : 'bg-red-100'}`}>
                            <Wallet className={`w-4 h-4 ${balance >= 0 ? 'text-[#D4553A]' : 'text-red-600'}`} />
                        </div>
                        <span className="text-xs text-[#6B6B6B] font-medium">Tiền còn lại</span>
                    </div>
                    <p className={`price-text text-xl font-bold ${balance >= 0 ? 'text-[#1A1A1A]' : 'text-red-600'}`}>{formatVND(balance)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Quick Entry Form */}
                <div className="bg-white rounded-xl border border-[#E0DCD4] p-5 shadow-sm h-fit">
                    <h2 className="font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-[#D4553A]" />
                        Nhập nhanh
                    </h2>

                    <div className="space-y-3">
                        {/* Type toggle */}
                        <div className="grid grid-cols-2 gap-1 bg-[#F0EDE6] rounded-lg p-1">
                            <button
                                onClick={() => setForm(prev => ({ ...prev, type: 'income', category: INCOME_CATEGORIES[0] }))}
                                className={`py-2 rounded-md text-sm font-semibold transition-all ${form.type === 'income'
                                    ? 'bg-green-600 text-white shadow-sm'
                                    : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
                                    }`}
                            >
                                💰 Thu
                            </button>
                            <button
                                onClick={() => setForm(prev => ({ ...prev, type: 'expense', category: EXPENSE_CATEGORIES[0] }))}
                                className={`py-2 rounded-md text-sm font-semibold transition-all ${form.type === 'expense'
                                    ? 'bg-red-500 text-white shadow-sm'
                                    : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
                                    }`}
                            >
                                💸 Chi
                            </button>
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Ngày</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                                className="w-full border border-[#E0DCD4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4553A] focus:border-transparent transition"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Danh mục</label>
                            <div className="relative">
                                <select
                                    value={form.category}
                                    onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full border border-[#E0DCD4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4553A] focus:border-transparent appearance-none bg-white"
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9B9B] pointer-events-none" />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Nội dung</label>
                            <input
                                type="text"
                                placeholder="Ghi chú (tuỳ chọn)"
                                value={form.description}
                                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full border border-[#E0DCD4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4553A] focus:border-transparent transition"
                            />
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Số tiền (₫)</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={form.amount}
                                onChange={e => {
                                    const raw = e.target.value.replace(/\D/g, '')
                                    setForm(prev => ({ ...prev, amount: raw ? Number(raw).toLocaleString('vi-VN') : '' }))
                                }}
                                className="w-full border border-[#E0DCD4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4553A] focus:border-transparent transition font-mono"
                            />
                        </div>

                        {/* Submit */}
                        <button
                            onClick={() => addMutation.mutate()}
                            disabled={addMutation.isPending || !form.amount}
                            className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 ${form.type === 'income'
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-red-500 hover:bg-red-600'
                                }`}
                        >
                            {addMutation.isPending ? 'Đang lưu...' : '💾 Lưu'}
                        </button>
                    </div>
                </div>

                {/* Right column: Ledger + Category breakdown */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Transaction Ledger */}
                    <div className="bg-white rounded-xl border border-[#E0DCD4] shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#E0DCD4] flex items-center justify-between">
                            <h2 className="font-semibold text-[#1A1A1A]">Sổ thu chi</h2>
                            <span className="text-xs text-[#6B6B6B] bg-[#FAFAF8] px-3 py-1 rounded-full border border-[#E0DCD4]">
                                {ledgerCount} giao dịch
                            </span>
                        </div>

                        {isLoading ? (
                            <div className="p-6 space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="h-10 bg-[#F0EDE6] rounded-lg animate-pulse" />
                                ))}
                            </div>
                        ) : ledger.length === 0 ? (
                            <div className="py-16 text-center">
                                <BookOpen className="w-10 h-10 text-[#E0DCD4] mx-auto mb-3" />
                                <p className="text-[#6B6B6B] text-sm font-medium">Chưa có giao dịch nào</p>
                                <p className="text-[#9B9B9B] text-xs mt-1">Nhập chi phí từ form bên trái để bắt đầu</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[480px]">
                                    <thead className="bg-[#FAFAF8] border-b border-[#E0DCD4]">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Thời gian</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Loại</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Danh mục</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide hidden sm:table-cell">Nội dung</th>
                                            <th className="text-right px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Số tiền</th>
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E0DCD4]">
                                        {ledger.map((row, idx) => {
                                            if (row.kind === 'pos') {
                                                // Auto-synced POS row (read-only, visually distinct)
                                                return (
                                                    <tr key={`pos-${row.date}-${idx}`} className="bg-green-50/40">
                                                        <td className="px-4 py-3 text-xs text-[#6B6B6B] whitespace-nowrap">
                                                            <div>{row.date.slice(5).replace('-', '/')}</div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                                                ↑ Thu
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-[#1A1A1A]">Bán hàng</td>
                                                        <td className="px-4 py-3 text-sm text-[#9B9B9B] hidden sm:table-cell">
                                                            <span className="inline-flex items-center gap-1">
                                                                <Zap className="w-3 h-3 text-green-500" />
                                                                Doanh thu POS (tự động)
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-sm font-bold price-text text-green-700">
                                                            +{formatVND(row.amount)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {/* read-only, no delete */}
                                                        </td>
                                                    </tr>
                                                )
                                            }

                                            // Manual transaction row
                                            const tx = row.tx
                                            return (
                                                <tr key={tx.id} className="hover:bg-[#FAFAF8] transition-colors group">
                                                    <td className="px-4 py-3 text-xs text-[#6B6B6B] whitespace-nowrap">
                                                        <div>{tx.date.slice(5).replace('-', '/')}</div>
                                                        <div className="text-[10px] text-[#9B9B9B]">{tx.time.slice(0, 5)}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {tx.type === 'income' ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">↑ Thu</span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">↓ Chi</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-[#1A1A1A]">{tx.category}</td>
                                                    <td className="px-4 py-3 text-sm text-[#6B6B6B] hidden sm:table-cell max-w-[160px] truncate">{tx.description || '—'}</td>
                                                    <td className={`px-4 py-3 text-right text-sm font-bold price-text ${tx.type === 'income' ? 'text-green-700' : 'text-red-600'}`}>
                                                        {tx.type === 'income' ? '+' : '-'}{formatVND(tx.amount)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => { if (confirm('Xoá giao dịch này?')) deleteMutation.mutate(tx.id) }}
                                                            className="p-1.5 text-[#C0BDB5] hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Category Expense Breakdown */}
                    {expenseByCategory.length > 0 && (
                        <div className="bg-white rounded-xl border border-[#E0DCD4] p-5 shadow-sm">
                            <h2 className="font-semibold text-[#1A1A1A] mb-4">Chi phí theo danh mục</h2>
                            <div className="space-y-3">
                                {expenseByCategory.map(item => {
                                    const pct = totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0
                                    return (
                                        <div key={item.category}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-medium text-[#1A1A1A]">{item.category}</span>
                                                <span className="price-text font-semibold text-red-600">{formatVND(item.amount)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-[#F0EDE6] rounded-full overflow-hidden">
                                                    <div className="h-full bg-red-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="text-xs text-[#9B9B9B] w-10 text-right">{pct.toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
