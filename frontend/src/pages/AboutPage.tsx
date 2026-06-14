import { useContent } from '../context/ContentContext'

export default function AboutPage() {
  const { get } = useContent()

  const title   = get('about_title', 'About Us')
  const body    = get('about_body', '')
  const email   = get('contact_email')
  const phone   = get('contact_phone')
  const address = get('contact_address')

  const socials = [
    { key: 'social_facebook',  label: 'Facebook',  href: get('social_facebook') },
    { key: 'social_instagram', label: 'Instagram', href: get('social_instagram') },
    { key: 'social_twitter',   label: 'Twitter',   href: get('social_twitter') },
    { key: 'social_youtube',   label: 'YouTube',   href: get('social_youtube') },
  ].filter(s => s.href)

  const hasContact = email || phone || address

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-6">{title}</h1>

        {body && (
          <div className="text-gray-600 leading-relaxed whitespace-pre-line text-base">
            {body}
          </div>
        )}

        {(hasContact || socials.length > 0) && (
          <div className="mt-10 pt-8 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-8">
            {hasContact && (
              <div>
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                  Contact
                </h2>
                <ul className="space-y-2 text-sm text-gray-600">
                  {email && (
                    <li>
                      <a href={`mailto:${email}`} className="text-indigo-600 hover:text-indigo-500">
                        {email}
                      </a>
                    </li>
                  )}
                  {phone && (
                    <li>
                      <a href={`tel:${phone}`} className="hover:text-gray-900">
                        {phone}
                      </a>
                    </li>
                  )}
                  {address && <li className="text-gray-500">{address}</li>}
                </ul>
              </div>
            )}

            {socials.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                  Follow us
                </h2>
                <ul className="space-y-2 text-sm">
                  {socials.map(s => (
                    <li key={s.key}>
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
