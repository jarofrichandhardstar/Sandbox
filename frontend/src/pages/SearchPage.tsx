import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { productsApi } from '../api/products'
import type { PublishedProduct } from '../types'
import ProductCard from '../components/ProductCard'
import Spinner from '../components/Spinner'
import Alert from '../components/Alert'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''

  const [products, setProducts] = useState<PublishedProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!query) return
    setLoading(true)
    setError('')
    productsApi
      .search(query)
      .then(res => setProducts(res.data ?? []))
      .catch(err => setError(err.message ?? 'Search failed'))
      .finally(() => setLoading(false))
  }, [query])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Search results for <span className="text-indigo-600">"{query}"</span>
        </h1>
      </div>

      {loading && <div className="py-20"><Spinner size="lg" /></div>}
      {error && <Alert message={error} />}

      {!loading && !error && (
        <>
          {products.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              No products found for "{query}".
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">{products.length} result(s)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
