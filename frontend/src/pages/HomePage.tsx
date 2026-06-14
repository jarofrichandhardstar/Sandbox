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
  const title    = get('hero_title',    'Discover Amazing Products')
  const subtitle = get('hero_subtitle', 'Shop the latest collection at unbeatable prices')
  const ctaText  = get('hero_cta_text', 'Shop Now')
  const ctaLink  = get('hero_cta_link', '/')
  const imageUrl = get('hero_image_url')
  const bgColor  = get('hero_bg_color', '#171717')

  return (
    <section
      className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8 relative overflow-hidden mb-20 flex items-end"
      style={{
        backgroundColor: bgColor,
        backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '80vh',
      }}
    >
      {/* Gradient overlay — stronger at bottom for legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-4">New Collection</p>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] max-w-2xl">
          {title}
        </h1>
        <p className="mt-5 text-base text-white/70 max-w-md">{subtitle}</p>
        <Link
          to={ctaLink}
          className="mt-8 inline-block border border-white/80 px-8 py-3 text-sm font-medium tracking-widest uppercase text-white hover:bg-white hover:text-gray-900 transition-colors duration-300"
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

      {loading && <div className="py-32"><Spinner size="lg" /></div>}
      {error   && <Alert message={error} />}

      {!loading && !error && carouselEnabled && (
        <div className="mb-20">
          <ProductCarousel
            products={products}
            title={carouselTitle}
            autoplay={carouselAutoplay}
            maxCount={carouselCount}
          />
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="border-b border-gray-200 pb-5 mb-12">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-1">Explore</p>
            <div className="flex items-end justify-between">
              <h2 className="text-3xl font-bold text-gray-900">The Collection</h2>
              <span className="text-sm text-gray-400 pb-0.5">{products.length} products</span>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-32 text-gray-400 text-sm tracking-wide">
              No products available yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
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
