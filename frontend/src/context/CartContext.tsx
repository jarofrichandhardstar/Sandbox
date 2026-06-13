import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { cartApi } from '../api/cart'
import type { CartItemResponse } from '../types'
import { useAuth } from './AuthContext'

interface CartContextValue {
  items: CartItemResponse[]
  itemCount: number
  isLoading: boolean
  addToCart: (inventoryItemId: string, quantity: number) => Promise<void>
  updateItem: (id: string, quantity: number) => Promise<void>
  removeItem: (id: string) => Promise<void>
  refresh: () => Promise<void>
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [items, setItems] = useState<CartItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!token) {
      setItems([])
      return
    }
    setIsLoading(true)
    try {
      const res = await cartApi.list()
      setItems(res.data ?? [])
    } catch {
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addToCart = async (inventoryItemId: string, quantity: number) => {
    const res = await cartApi.add(inventoryItemId, quantity)
    if (res.data) {
      setItems(prev => {
        const idx = prev.findIndex(i => i.inventory_item_id === inventoryItemId)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = res.data!
          return next
        }
        return [...prev, res.data!]
      })
    }
  }

  const updateItem = async (id: string, quantity: number) => {
    const res = await cartApi.update(id, quantity)
    if (res.data) {
      setItems(prev => prev.map(i => (i.id === id ? res.data! : i)))
    }
  }

  const removeItem = async (id: string) => {
    await cartApi.remove(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const clear = () => setItems([])

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
        isLoading,
        addToCart,
        updateItem,
        removeItem,
        refresh,
        clear,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
