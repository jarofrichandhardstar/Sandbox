import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { ApiError } from '../api/client'
import Spinner from '../components/Spinner'

export default function CartPage() {
  const { items, isLoading, updateItem, removeItem } = useCart()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const subtotal = items.reduce((s, i) => s + i.line_total, 0)

  const handleQtyChange = async (id: string, qty: number) => {
    if (qty < 1) return
    try {
      await updateItem(id, qty)
      setErrors(e => ({ ...e, [id]: '' }))
    } catch (err) {
      setErrors(e => ({
        ...e,
        [id]: err instanceof ApiError ? err.message : 'Update failed',
      }))
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await removeItem(id)
    } catch (err) {
      setErrors(e => ({
        ...e,
        [id]: err instanceof ApiError ? err.message : 'Remove failed',
      }))
    }
  }

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-400 mb-4">Your cart is empty.</p>
          <Link
            to="/"
            className="inline-block rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-4"
              >
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-gray-900 truncate">{item.product_name}</h3>
                      <p className="text-xs text-gray-500">{item.sku}</p>
                      {!item.in_stock && (
                        <p className="text-xs text-red-600 mt-0.5">No longer in stock</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-gray-900">${item.line_total.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">${item.unit_price.toFixed(2)} each</p>
                    </div>
                  </div>

                  {errors[item.id] && (
                    <p className="text-xs text-red-600 mt-1">{errors[item.id]}</p>
                  )}

                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button
                        onClick={() => handleQtyChange(item.id, item.quantity - 1)}
                        className="px-2.5 py-1 text-gray-500 hover:text-gray-900 text-sm"
                      >
                        −
                      </button>
                      <span className="px-3 py-1 text-sm">{item.quantity}</span>
                      <button
                        onClick={() => handleQtyChange(item.id, item.quantity + 1)}
                        className="px-2.5 py-1 text-gray-500 hover:text-gray-900 text-sm"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sticky top-24">
              <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className="text-gray-400">Calculated at checkout</span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold text-gray-900">
                  <span>Total</span>
                  <span>${subtotal.toFixed(2)}+</span>
                </div>
              </div>
              <Link
                to="/checkout"
                className="mt-4 block text-center w-full rounded-lg bg-indigo-600 py-3 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Proceed to checkout
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
