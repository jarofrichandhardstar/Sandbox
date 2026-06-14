import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { productsApi } from '../api/products'
import type { PublishedProduct } from '../types'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { ApiError } from '../api/client'
import Spinner from '../components/Spinner'
import Alert from '../components/Alert'
import { resolveImageUrl } from '../utils/image'
import { useCurrency } from '../hooks/useCurrency'
import { useContent } from '../context/ContentContext'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const { addToCart } = useCart()

  const { format } = useCurrency()
  const { get } = useContent()
  const cartBtnColor = get('primary_button_color', '#4f46e5')
  const [product, setProduct] = useState<PublishedProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const [addedMsg, setAddedMsg] = useState('')
  const [addError, setAddError] = useState('')

  useEffect(() => {
    if (!id) return
    productsApi
      .get(id)
      .then(res => setProduct(res.data))
      .catch(err => setError(err.message ?? 'Product not found'))
      .finally(() => setLoading(false))
  }, [id])

  const handleAdd = async () => {
    if (!product) return
    setAdding(true)
    setAddError('')
    setAddedMsg('')
    try {
      await addToCart(product.id, qty)
      setAddedMsg('Added to cart!')
      setTimeout(() => setAddedMsg(''), 3000)
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : 'Failed to add to cart')
    } finally {
      setAdding(false)
    }
  }

  if (loading) return <div className="py-20"><Spinner size="lg" /></div>
  if (error || !product) return <Alert message={error || 'Product not found'} />

  return (
    <div>
      <Link to="/" className="text-sm text-indigo-600 hover:underline mb-6 inline-block">
        ← Back to products
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
          <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
            {resolveImageUrl(product.image_url) ? (
              <img
                src={resolveImageUrl(product.image_url)}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <svg className="h-24 w-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{product.sku}</p>
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            </div>

            <p className="text-gray-600 leading-relaxed">{product.description}</p>

            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-gray-900">{format(product.price)}</span>
              <span
                className={`text-sm font-medium px-3 py-1 rounded-full ${
                  product.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {product.in_stock ? 'In stock' : 'Out of stock'}
              </span>
            </div>

            {addedMsg && <Alert variant="success" message={addedMsg} />}
            {addError && <Alert message={addError} />}

            {token ? (
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="px-3 py-2 text-gray-500 hover:text-gray-900"
                  >
                    −
                  </button>
                  <span className="px-4 py-2 text-sm font-medium">{qty}</span>
                  <button
                    onClick={() => setQty(q => q + 1)}
                    className="px-3 py-2 text-gray-500 hover:text-gray-900"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={handleAdd}
                  disabled={adding || !product.in_stock}
                  style={{ backgroundColor: cartBtnColor }}
                  className="flex-1 rounded-lg py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {adding ? 'Adding…' : 'Add to cart'}
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="mt-2 block text-center rounded-lg py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: cartBtnColor }}
              >
                Login to purchase
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
