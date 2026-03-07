'use client'

import { formatVND } from '@/lib/format'

interface Table {
    id: string
    name: string
    table_number: number
    is_active: boolean
}

interface ActiveOrder {
    id: string
    table_id: string | null
    status: string
    total: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    order_items?: any[]
}

interface TableGridProps {
    tables: Table[]
    activeOrders: ActiveOrder[]
    onSelectTable: (tableId: string, tableName: string | null) => void
    onCreateTakeaway?: () => void
    selectedTableId: string | null
    isTakeawayActive?: boolean
}

export function TableGrid({ tables, activeOrders, onSelectTable, onCreateTakeaway, selectedTableId, isTakeawayActive }: TableGridProps) {
    const sortedTables = [...tables].sort((a, b) => a.table_number - b.table_number)

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
            {/* Takeaway button */}
            {onCreateTakeaway && (
                <button
                    onClick={onCreateTakeaway}
                    className={`relative rounded-xl border p-4 text-left transition-all overflow-hidden ${isTakeawayActive
                            ? 'ring-2 ring-[#DC2626] border-[#DC2626] bg-[#FEF2F2]'
                            : 'border-dashed border-[#E2E8F0] hover:border-[#DC2626] bg-white'
                        }`}
                >
                    <div className="flex justify-between items-start mb-3">
                        <span className="font-bold text-[#0F172A] text-lg">Mang về</span>
                        <div className="px-2 py-1 rounded-md text-[10px] font-bold bg-[#DC2626]/10 text-[#DC2626]">
                            Takeaway
                        </div>
                    </div>
                    <div className="text-xs text-[#64748B] italic pt-5">
                        Nhấn để tạo đơn mang về
                    </div>
                </button>
            )}
            {sortedTables.map(table => {
                const activeOrder = activeOrders.find(
                    o => o.table_id === table.id && o.status === 'pending'
                )
                const itemCount = activeOrder?.order_items?.length || 0
                const isOccupied = !!activeOrder && itemCount > 0
                const isSelected = selectedTableId === table.id

                return (
                    <button
                        key={table.id}
                        onClick={() => onSelectTable(table.id, table.name || `Bàn ${table.table_number}`)}
                        className={`relative rounded-xl border p-4 text-left transition-all overflow-hidden ${isSelected
                                ? 'ring-2 ring-[#DC2626] border-[#DC2626]'
                                : isOccupied
                                    ? 'border-[#F59E0B]/50 hover:border-[#F59E0B]'
                                    : 'border-[#E2E8F0] hover:border-[#10B981]/50'
                            } ${isOccupied
                                ? 'bg-[#FFFBEB]'
                                : 'bg-white'
                            }`}
                    >
                        {/* Table Header */}
                        <div className="flex justify-between items-start mb-3">
                            <span className="font-bold text-[#0F172A] text-lg">
                                {table.name || `Bàn ${table.table_number}`}
                            </span>
                            <div className={`px-2 py-1 rounded-md text-[10px] font-bold ${isOccupied
                                    ? 'bg-[#F59E0B]/15 text-[#D97706]'
                                    : 'bg-[#10B981]/10 text-[#059669]'
                                }`}>
                                {isOccupied ? 'Đang phục vụ' : 'Trống'}
                            </div>
                        </div>

                        {/* Order Info */}
                        <div className="space-y-1">
                            {isOccupied ? (
                                <>
                                    <div className="text-xs text-[#64748B] flex justify-between">
                                        <span>{itemCount} món</span>
                                    </div>
                                    <div className="text-[#D97706] font-bold text-lg price-text">
                                        {formatVND(activeOrder.total)}
                                    </div>
                                </>
                            ) : (
                                <div className="text-xs text-[#64748B] italic pt-5">
                                    Nhấn để mở bàn
                                </div>
                            )}
                        </div>

                        {/* Selection Indicator */}
                        {isSelected && (
                            <div className="absolute top-0 right-0 w-0 h-0 border-t-[24px] border-r-[24px] border-t-transparent border-r-[#DC2626]">
                                <svg className="absolute -top-[20px] -right-[20px] w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
