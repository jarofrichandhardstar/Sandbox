import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { productsApi } from '../api/products'
import type { PublishedProduct } from '../types'
import { useContent } from '../context/ContentContext'
import ProductCard from '../components/ProductCard'
import ProductCarousel from '../components/ProductCarousel'
import Spinner from '../components/Spinner'
import Alert from '../components/Alert'

function Hero() {
  const { get } = useContent()
  const title     = get('hero_title',    'Discover Amazing Products')
  const subtitle  = get('hero_subtitle', 'Shop the latest collection at unbeatable prices')
  const ctaText   = get('hero_cta_text', 'Shop Now')
  const ctaLink   = get('hero_cta_link', '/')
  const imageUrl  = get('hero_image_url')
  const bgColor   = get('hero_bg_color', '#4f46e5')

  return (
    <section
      className="relative rounded-2xl overflow-hidden mb-10 min-h-[320px] flex items-center"
      style={{
        backgroundColor: bgColor,
        backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay so text is readable over images */}
      {imageUrl && <div className="absolute inset-0 bg-black/40" />}

      <div className="relative z-10 px-8 py-14 max-w-2xl">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
          {title}
        </h1>
        <p className="mt-4 text-lg text-white/90">{subtitle}</p>
        <Link
          to={ctaLink}
          className="mt-6 inline-block rounded-xl bg-white px-7 py-3 text-base font-semibold text-indigo-700 shadow hover:bg-gray-50 transition-colors"
        >
          {ctaText}
        </Link>
      </div>
    </section>
  )
}

export default function HomePage() {
  const { get, flag } = useContent()
  const [products, setProducts] = useState<PublishedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const carouselEnabled  = flag('carousel_enabled')
  const carouselTitle    = get('carousel_title', 'Featured Products')
  const carouselCount    = Math.max(1, parseInt(get('carousel_count', '8')) || 8)
  const carouselAutoplay = flag('carousel_autoplay')

  useEffect(() => {
    productsApi
      .list()
      .then(res => setProducts(res.data ?? []))
      .catch(err => setError(err.message ?? 'Failed to load products'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <Hero />

      {loading && <div className="py-20"><Spinner size="lg" /></div>}
      {error   && <Alert message={error} />}

      {!loading && !error && carouselEnabled && (
        <ProductCarousel
          products={products}
          title={carouselTitle}
          autoplay={carouselAutoplay}
          maxCount={carouselCount}
        />
      )}

      {!loading && !error && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">All Products</h2>
            <span className="text-sm text-gray-500">{products.length} items</span>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-20 text-gray-400">No products available yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
