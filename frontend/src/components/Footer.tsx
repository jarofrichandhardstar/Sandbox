import { Link } from 'react-router-dom'
import { useContent } from '../context/ContentContext'

export default function Footer() {
  const { get } = useContent()

  const socials = [
    { key: 'social_facebook',  label: 'Facebook',  icon: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
    { key: 'social_instagram', label: 'Instagram', icon: 'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M6.5 19.5h11a3 3 0 003-3v-11a3 3 0 00-3-3h-11a3 3 0 00-3 3v11a3 3 0 003 3z' },
    { key: 'social_twitter',   label: 'Twitter',   icon: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z' },
    { key: 'social_youtube',   label: 'YouTube',   icon: 'M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z' },
  ].filter(s => get(s.key))

  const email   = get('contact_email')
  const phone   = get('contact_phone')
  const address = get('contact_address')

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Brand */}
          <div>
            <span className="text-xl font-bold text-white">{get('site_name', 'Shop')}</span>
            <p className="mt-2 text-sm text-gray-400">{get('footer_tagline')}</p>
            {socials.length > 0 && (
              <div className="mt-4 flex gap-3">
                {socials.map(s => (
                  <a
                    key={s.key}
                    href={get(s.key)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.label}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Shop</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">All Products</Link></li>
              <li><Link to="/cart" className="hover:text-white transition-colors">Cart</Link></li>
              <li><Link to="/profile" className="hover:text-white transition-colors">My Account</Link></li>
            </ul>
          </div>

          {/* Contact */}
          {(email || phone || address) && (
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Contact</h3>
              <ul className="space-y-2 text-sm">
                {email   && <li><a href={`mailto:${email}`}  className="hover:text-white transition-colors">{email}</a></li>}
                {phone   && <li><a href={`tel:${phone}`}     className="hover:text-white transition-colors">{phone}</a></li>}
                {address && <li className="text-gray-400">{address}</li>}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-10 border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
          {get('footer_copyright', `© ${new Date().getFullYear()} Shop. All rights reserved.`)}
        </div>
      </div>
    </footer>
  )
}
