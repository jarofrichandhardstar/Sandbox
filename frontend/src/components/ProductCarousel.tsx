import { useEffect, useState } from 'react'
import type { PublishedProduct } from '../types'
import ProductCard from './ProductCard'
import { useContent } from '../context/ContentContext'

interface Props {
  products: PublishedProduct[]
  title?: string
  autoplay?: boolean
  maxCount?: number
}

function getVisibleCount(): number {
  const w = window.innerWidth
  if (w >= 1024) return 4
  if (w >= 768)  return 3
  if (w >= 640)  return 2
  return 1
}

export default function ProductCarousel({
  products: allProducts,
  title,
  autoplay = true,
  maxCount = 8,
}: Props) {
  const products = allProducts.slice(0, maxCount)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(getVisibleCount)
  const { get } = useContent()
  const primaryColor = get('primary_button_color', '#4f46e5')

  // Keep visible count in sync with window width
  useEffect(() => {
    const handler = () => setVisible(getVisibleCount())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const maxIndex = Math.max(0, products.length - visible)

  // Clamp current index when screen size changes
  useEffect(() => {
    setIndex(i => Math.min(i, maxIndex))
  }, [maxIndex])

  // Auto-play
  useEffect(() => {
    if (!autoplay || paused || maxIndex === 0) return
    const id = setInterval(() => {
      setIndex(i => (i >= maxIndex ? 0 : i + 1))
    }, 3500)
    return () => clearInterval(id)
  }, [autoplay, paused, maxIndex])

  const go = (dir: -1 | 1) => {
    setIndex(i => {
      const next = i + dir
      if (next < 0) return maxIndex
      if (next > maxIndex) return 0
      return next
    })
  }

  if (products.length === 0) return null

  const dotCount = maxIndex + 1
  const cardPct  = 100 / visible

  const ArrowBtn = ({
    dir, className,
  }: { dir: -1 | 1; className: string }) => (
    <button
      onClick={() => go(dir)}
      aria-label={dir === -1 ? 'Previous' : 'Next'}
      className={className}
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d={dir === -1 ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
        />
      </svg>
    </button>
  )

  return (
    <section
      className="mb-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        {title ? (
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        ) : (
          <span />
        )}
        {maxIndex > 0 && (
          <div className="hidden sm:flex gap-2">
            <ArrowBtn
              dir={-1}
              className="p-2 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            />
            <ArrowBtn
              dir={1}
              className="p-2 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            />
          </div>
        )}
      </div>

      {/* Track */}
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * cardPct}%)` }}
        >
          {products.map(p => (
            <div
              key={p.id}
              className="px-2 box-border"
              style={{ flex: `0 0 ${cardPct}%`, minWidth: 0 }}
            >
              <ProductCard product={p} />
            </div>
          ))}
        </div>

        {/* Mobile overlay arrows */}
        {maxIndex > 0 && (
          <>
            <ArrowBtn
              dir={-1}
              className="absolute left-0 top-1/2 -translate-y-1/2 sm:hidden bg-white/90 shadow-md rounded-r-full p-2 text-gray-700"
            />
            <ArrowBtn
              dir={1}
              className="absolute right-0 top-1/2 -translate-y-1/2 sm:hidden bg-white/90 shadow-md rounded-l-full p-2 text-gray-700"
            />
          </>
        )}
      </div>

      {/* Dot indicators */}
      {dotCount > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: dotCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-5' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
              }`}
              style={i === index ? { backgroundColor: primaryColor } : undefined}
            />
          ))}
        </div>
      )}
    </section>
  )
}
