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
    <div className="group flex flex-col">
      {/* Image */}
      <Link to={`/products/${product.id}`} className="block overflow-hidden bg-gray-100 relative">
        <div className="aspect-[4/5]">
          {resolveImageUrl(product.image_url) ? (
            <img
              src={resolveImageUrl(product.image_url)}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
        {!product.in_stock && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <span className="text-xs uppercase tracking-widest text-gray-500 bg-white px-3 py-1">Out of Stock</span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="mt-4 flex-1 flex flex-col">
        <Link to={`/products/${product.id}`} className="group/name">
          <h3 className="text-sm font-medium text-gray-900 group-hover/name:underline line-clamp-2 leading-snug">
            {product.name}
          </h3>
        </Link>
        <p className="mt-1 text-sm text-gray-500">{format(product.price)}</p>

        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

        <div className="mt-4">
          {token ? (
            <button
              onClick={handleAdd}
              disabled={adding || !product.in_stock}
              style={{ backgroundColor: cartBtnColor }}
              className="w-full py-2.5 text-xs font-medium tracking-widest uppercase text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {adding ? 'Adding…' : added ? 'Added!' : 'Add to Cart'}
            </button>
          ) : (
            <Link
              to="/login"
              className="block text-center w-full py-2.5 text-xs font-medium tracking-widest uppercase text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: cartBtnColor }}
            >
              Login to Buy
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
