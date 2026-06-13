import { useContent } from '../context/ContentContext'

export default function AnnouncementBar() {
  const { get, flag } = useContent()

  if (!flag('announcement_enabled')) return null

  const text = get('announcement_text')
  if (!text) return null

  const bg = get('announcement_color', '#4f46e5')

  return (
    <div
      className="py-2 px-4 text-center text-sm font-medium text-white"
      style={{ backgroundColor: bg }}
    >
      {text}
    </div>
  )
}
