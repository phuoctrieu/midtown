'use client'

import { useReducer, useCallback } from 'react'
import type { CartState, CartItem } from '@/types/database'
import { calculateDiscount } from '@/lib/format'

type CartAction =
    | { type: 'ADD_ITEM'; item: CartItem }
    | { type: 'REMOVE_ITEM'; menuItemId: string }
    | { type: 'UPDATE_QUANTITY'; menuItemId: string; quantity: number }
    | { type: 'SET_NOTE'; menuItemId: string; note: string }
    | { type: 'SET_DISCOUNT'; discountType: 'percent' | 'amount' | null; discountValue: number }
    | { type: 'SET_TABLE'; tableId: string | null; tableName: string | null }
    | { type: 'SET_ORDER_NOTE'; note: string }
    | { type: 'LOAD_ORDER'; orderId: string; tableId: string | null; tableName: string; items: CartItem[] }
    | { type: 'MERGE_NEW_ITEMS'; items: CartItem[] }
    | { type: 'CLEAR_CART' }

const initialState: CartState = {
    tableId: null,
    tableName: null,
    orderId: null,
    items: [],
    discountType: null,
    discountValue: 0,
    note: '',
}

function cartReducer(state: CartState, action: CartAction): CartState {
    switch (action.type) {
        case 'ADD_ITEM': {
            const existing = state.items.find(i => i.menuItemId === action.item.menuItemId)
            if (existing) {
                return {
                    ...state,
                    items: state.items.map(i =>
                        i.menuItemId === action.item.menuItemId
                            ? { ...i, quantity: i.quantity + 1 }
                            : i
                    ),
                }
            }
            return { ...state, items: [...state.items, action.item] }
        }
        case 'REMOVE_ITEM':
            return { ...state, items: state.items.filter(i => i.menuItemId !== action.menuItemId) }
        case 'UPDATE_QUANTITY':
            if (action.quantity <= 0) {
                return { ...state, items: state.items.filter(i => i.menuItemId !== action.menuItemId) }
            }
            return {
                ...state,
                items: state.items.map(i =>
                    i.menuItemId === action.menuItemId ? { ...i, quantity: action.quantity } : i
                ),
            }
        case 'SET_NOTE':
            return {
                ...state,
                items: state.items.map(i =>
                    i.menuItemId === action.menuItemId ? { ...i, note: action.note } : i
                ),
            }
        case 'SET_DISCOUNT':
            return { ...state, discountType: action.discountType, discountValue: action.discountValue }
        case 'SET_TABLE':
            return { ...state, tableId: action.tableId, tableName: action.tableName }
        case 'SET_ORDER_NOTE':
            return { ...state, note: action.note }
        case 'LOAD_ORDER':
            return {
                ...state,
                orderId: action.orderId,
                tableId: action.tableId,
                tableName: action.tableName,
                items: action.items,
            }
        case 'MERGE_NEW_ITEMS': {
            // Additive-only merge: add items not already in cart, never touch existing items
            const existingIds = new Set(state.items.map(i => i.menuItemId))
            const truly_new = action.items.filter(i => !existingIds.has(i.menuItemId))
            if (truly_new.length === 0) return state
            return { ...state, items: [...state.items, ...truly_new] }
        }
        case 'CLEAR_CART':
            return { ...initialState }
        default:
            return state
    }
}

export function useCart() {
    const [state, dispatch] = useReducer(cartReducer, initialState)

    const subtotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const discountAmount = calculateDiscount(subtotal, state.discountType, state.discountValue)
    const total = Math.max(subtotal - discountAmount, 0)

    const addItem = useCallback((item: Omit<CartItem, 'quantity'> & { note?: string }) => {
        dispatch({ type: 'ADD_ITEM', item: { ...item, quantity: 1, note: item.note || '' } })
    }, [])

    const removeItem = useCallback((menuItemId: string) => {
        dispatch({ type: 'REMOVE_ITEM', menuItemId })
    }, [])

    const updateQuantity = useCallback((menuItemId: string, quantity: number) => {
        dispatch({ type: 'UPDATE_QUANTITY', menuItemId, quantity })
    }, [])

    const setNote = useCallback((menuItemId: string, note: string) => {
        dispatch({ type: 'SET_NOTE', menuItemId, note })
    }, [])

    const setDiscount = useCallback((discountType: 'percent' | 'amount' | null, discountValue: number) => {
        dispatch({ type: 'SET_DISCOUNT', discountType, discountValue })
    }, [])

    const setTable = useCallback((tableId: string | null, tableName: string | null) => {
        dispatch({ type: 'SET_TABLE', tableId, tableName })
    }, [])

    const setOrderNote = useCallback((note: string) => {
        dispatch({ type: 'SET_ORDER_NOTE', note })
    }, [])

    const loadOrder = useCallback((orderId: string, tableId: string | null, tableName: string, items: CartItem[]) => {
        dispatch({ type: 'LOAD_ORDER', orderId, tableId, tableName, items })
    }, [])

    const mergeNewItems = useCallback((items: CartItem[]) => {
        dispatch({ type: 'MERGE_NEW_ITEMS', items })
    }, [])

    const clearCart = useCallback(() => {
        dispatch({ type: 'CLEAR_CART' })
    }, [])

    return {
        state,
        subtotal,
        discountAmount,
        total,
        itemCount: state.items.reduce((sum, i) => sum + i.quantity, 0),
        addItem,
        removeItem,
        updateQuantity,
        setNote,
        setDiscount,
        setTable,
        setOrderNote,
        loadOrder,
        mergeNewItems,
        clearCart,
    }
}
