/**
 * Format số tiền theo định dạng VNĐ
 */
export function formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount) + '₫'
}

/**
 * Format số tiền không có ký hiệu tiền tệ
 */
export function formatNumber(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount)
}

/**
 * Format ngày tháng theo định dạng Việt Nam
 */
export function formatDate(dateString: string): string {
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(dateString))
}

/**
 * Format ngày giờ theo định dạng Việt Nam
 */
export function formatDateTime(dateString: string): string {
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(dateString))
}

/**
 * Format ngày theo ISO (YYYY-MM-DD) với timezone VN
 */
export function formatDateISO(date: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
    }).format(date).split('/').reverse().join('-')
}

/**
 * Tính số tiền giảm giá
 */
export function calculateDiscount(
    subtotal: number,
    discountType: 'percent' | 'amount' | null,
    discountValue: number
): number {
    if (!discountType || discountValue <= 0) return 0
    if (discountType === 'percent') {
        return Math.round(subtotal * discountValue / 100)
    }
    return Math.min(discountValue, subtotal)
}

/**
 * Lấy ngày hôm nay theo timezone VN
 */
export function getTodayVN(): string {
    return formatDateISO(new Date())
}
