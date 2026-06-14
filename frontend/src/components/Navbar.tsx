import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useContent } from '../context/ContentContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const { get } = useContent()
  const primaryColor = get('primary_button_color', '#4f46e5')
  const titleColor = get('site_title_color', '#ffffff')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const siteName = get('site_name', 'Shop')

  return (
    <header className="bg-neutral-900 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-6">
          <Link
            to="/"
            className="text-lg font-bold tracking-widest uppercase shrink-0"
            style={{ color: titleColor }}
          >
            {siteName}
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-sm">
            <div className="relative">
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search products…"
                className="w-full rounded-none border-b border-white/20 bg-transparent py-1.5 pl-0 pr-8 text-sm text-white placeholder-white/30 focus:border-white/60 focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-0 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>

          <nav className="flex items-center gap-5 shrink-0">
            {user ? (
              <>
                <Link
                  to="/cart"
                  className="relative text-white/70 hover:text-white transition-colors"
                  title="Cart"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {itemCount > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className="text-sm text-white/70 hover:text-white transition-colors hidden sm:block">
                  {user.username}
                </Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="text-sm text-white/70 hover:text-white transition-colors hidden sm:block">
                    Admin
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-white/70 hover:text-white transition-colors">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium tracking-wide text-white px-4 py-2 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: primaryColor }}
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
