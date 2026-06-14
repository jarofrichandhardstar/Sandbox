import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useContent } from '../context/ContentContext'

export default function Footer() {
  const { get } = useContent()
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const socials = [
    { key: 'social_facebook',  label: 'Facebook',  icon: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
    { key: 'social_instagram', label: 'Instagram', icon: 'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M6.5 19.5h11a3 3 0 003-3v-11a3 3 0 00-3-3h-11a3 3 0 00-3 3v11a3 3 0 003 3z' },
    { key: 'social_twitter',   label: 'Twitter',   icon: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z' },
    { key: 'social_youtube',   label: 'YouTube',   icon: 'M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z' },
  ].filter(s => get(s.key))

  const contactEmail = get('contact_email')
  const phone        = get('contact_phone')
  const address      = get('contact_address')
  const siteName     = get('site_name', 'Shop')

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) setSubscribed(true)
  }

  return (
    <footer className="bg-neutral-900 text-gray-300 mt-auto">
      {/* Newsletter strip */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">Stay in touch</p>
              <h3 className="text-xl font-semibold text-white">Join our newsletter</h3>
              <p className="text-sm text-gray-400 mt-1">New arrivals, stories, and exclusive offers.</p>
            </div>
            {subscribed ? (
              <p className="text-sm text-green-400 tracking-wide">Thank you for subscribing.</p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-0 w-full md:w-auto md:min-w-[380px]">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="flex-1 bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-white text-gray-900 px-6 py-2.5 text-xs font-medium tracking-widest uppercase hover:bg-gray-100 transition-colors shrink-0"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Main footer columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <span className="text-base font-bold tracking-widest uppercase text-white">{siteName}</span>
            <p className="mt-3 text-sm text-gray-400 leading-relaxed">{get('footer_tagline')}</p>
            {socials.length > 0 && (
              <div className="mt-5 flex gap-4">
                {socials.map(s => (
                  <a
                    key={s.key}
                    href={get(s.key)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.label}
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Shop links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white mb-4">Shop</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors">All Products</Link></li>
              <li><Link to="/cart" className="text-gray-400 hover:text-white transition-colors">Cart</Link></li>
              <li><Link to="/profile" className="text-gray-400 hover:text-white transition-colors">My Account</Link></li>
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/about" className="text-gray-400 hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/login" className="text-gray-400 hover:text-white transition-colors">Login</Link></li>
              <li><Link to="/register" className="text-gray-400 hover:text-white transition-colors">Create Account</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white mb-4">Contact</h4>
            <ul className="space-y-2.5 text-sm">
              {contactEmail && (
                <li><a href={`mailto:${contactEmail}`} className="text-gray-400 hover:text-white transition-colors">{contactEmail}</a></li>
              )}
              {phone && (
                <li><a href={`tel:${phone}`} className="text-gray-400 hover:text-white transition-colors">{phone}</a></li>
              )}
              {address && (
                <li className="text-gray-500 leading-relaxed">{address}</li>
              )}
              {!contactEmail && !phone && !address && (
                <li className="text-gray-500">—</li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <span>{get('footer_copyright', `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`)}</span>
        </div>
      </div>
    </footer>
  )
}
