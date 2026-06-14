import { Link } from 'react-router-dom'
import { useState } from 'react'
import type { PublishedProduct } from '../types'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { ApiError } from '../api/client'
import { resolveImageUrl } from '../utils/image'
import { useCurrency } from '../hooks/useCurrency'
import { useContent } from '../context/ContentContext'

export default function ProductCard({ product }: { product: PublishedProduct }) {
  const { token } = useAuth()
  const { addToCart } = useCart()
  const { format } = useCurrency()
  const { get } = useContent()
  const cartBtnColor = get('primary_button_color', '#4f46e5')
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async () => {
    if (!token) return
    setAdding(true)
    setError('')
    try {
      await addToCart(product.id, 1)
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add to cart')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      <Link to={`/products/${product.id}`} className="block">
        <div className="aspect-square bg-gray-100 overflow-hidden">
          {resolveImageUrl(product.image_url) ? (
            <img
              src={resolveImageUrl(product.image_url)}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <Link to={`/products/${product.id}`}>
          <h3 className="font-semibold text-gray-900 hover:text-indigo-600 line-clamp-2">
            {product.name}
          </h3>
        </Link>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{product.sku}</p>
        <p className="text-sm text-gray-600 line-clamp-2 flex-1">{product.description}</p>

        <div className="flex items-center justify-between mt-2">
          <span className="text-lg font-bold text-gray-900">
            {format(product.price)}
          </span>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              product.in_stock
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {product.in_stock ? 'In stock' : 'Out of stock'}
          </span>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        {token ? (
          <button
            onClick={handleAdd}
            disabled={adding || !product.in_stock}
            style={{ backgroundColor: cartBtnColor }}
            className="mt-1 w-full rounded-lg py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {adding ? 'Adding…' : added ? 'Added!' : 'Add to cart'}
          </button>
        ) : (
          <Link
            to="/login"
            className="mt-1 block text-center w-full rounded-lg py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: cartBtnColor }}
          >
            Login to buy
          </Link>
        )}
      </div>
    </div>
  )
}
