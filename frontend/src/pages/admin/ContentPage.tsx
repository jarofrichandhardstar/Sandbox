import { useEffect, useRef, useState } from 'react'
import { adminApi } from '../../api/admin'
import { useContent } from '../../context/ContentContext'
import { ApiError } from '../../api/client'
import type { SiteContentResponse, ContentType, CreateContentRequest } from '../../types'
import Spinner from '../../components/Spinner'
import Alert from '../../components/Alert'

// ── helpers ──────────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  general:       'Site Identity',
  homepage:      'Homepage Hero',
  carousel:      'Product Carousel',
  announcements: 'Announcement Bar',
  about:         'About Page',
  contact:       'Contact Info',
  social:        'Social Links',
  footer:        'Footer',
  currency:      'Currency',
  shop:          'Shop UI',
}

const TYPE_LABELS: Record<ContentType, string> = {
  text:     'Text',
  richtext: 'Rich Text',
  url:      'URL',
  boolean:  'Toggle',
  color:    'Color',
  image:    'Image',
}

const CONTENT_TYPES: ContentType[] = ['text', 'richtext', 'url', 'boolean', 'color', 'image']

function groupBySection(items: SiteContentResponse[]) {
  const map = new Map<string, SiteContentResponse[]>()
  for (const item of items) {
    if (!map.has(item.section)) map.set(item.section, [])
    map.get(item.section)!.push(item)
  }
  return map
}

// ── single field editor ───────────────────────────────────────────────────────

function FieldEditor({ item, onSaved }: { item: SiteContentResponse; onSaved: (updated: SiteContentResponse) => void }) {
  const { refresh } = useContent()
  const [value, setValue] = useState(item.value)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const isDirty = value !== item.value

  const save = async () => {
    if (!isDirty) return
    setSaving(true)
    setError('')
    try {
      const res = await adminApi.updateContent(item.key, { value })
      if (res.data) {
        onSaved(res.data)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
        await refresh()
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('File must be under 5 MB'); return }
    setUploading(true)
    setError('')
    try {
      const res = await adminApi.uploadContentImage(item.key, file)
      if (res.data) {
        setValue(res.data.value)
        onSaved(res.data)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
        await refresh()
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">{item.label}</span>
            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
              {TYPE_LABELS[item.content_type]}
            </span>
          </div>
          {item.description && (
            <p className="text-xs text-gray-400 mb-2">{item.description}</p>
          )}

          {/* === boolean toggle === */}
          {item.content_type === 'boolean' && (
            <button
              onClick={() => setValue(v => (v === 'true' ? 'false' : 'true'))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                value === 'true' ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                  value === 'true' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          )}

          {/* === color picker === */}
          {item.content_type === 'color' && (
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={value || '#4f46e5'}
                onChange={e => setValue(e.target.value)}
                className="h-9 w-14 rounded border border-gray-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="#4f46e5"
                className="w-32 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}

          {/* === image === */}
          {item.content_type === 'image' && (
            <div className="space-y-2">
              {value && (
                <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                  <img src={value} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder="https://… or upload a file →"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </div>
          )}

          {/* === url === */}
          {item.content_type === 'url' && (
            <input
              type="url"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          )}

          {/* === richtext === */}
          {item.content_type === 'richtext' && (
            <textarea
              rows={4}
              value={value}
              onChange={e => setValue(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-y"
            />
          )}

          {/* === text (default) === */}
          {item.content_type === 'text' && (
            <input
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          )}

          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>

        {/* Save button — shown for all types that aren't auto-saved via upload */}
        {item.content_type !== 'image' && (
          <button
            onClick={save}
            disabled={saving || !isDirty}
            className={`mt-6 shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              success
                ? 'bg-green-100 text-green-700'
                : isDirty
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            } disabled:opacity-60`}
          >
            {saving ? 'Saving…' : success ? 'Saved ✓' : 'Save'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── add new content item form ─────────────────────────────────────────────────

function AddItemForm({ onCreated }: { onCreated: (item: SiteContentResponse) => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CreateContentRequest>({
    key: '',
    value: '',
    label: '',
    description: null,
    content_type: 'text',
    section: 'general',
    is_public: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await adminApi.createContent(form)
      if (res.data) {
        onCreated(res.data)
        setOpen(false)
        setForm({ key: '', value: '', label: '', description: null, content_type: 'text', section: 'general', is_public: true })
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
      >
        + Add custom content item
      </button>
    )
  }

  return (
    <div className="mt-6 bg-white rounded-xl border border-indigo-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">New content item</h3>
      {error && <Alert message={error} className="mb-3" />}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Key * <span className="text-gray-400">(letters, digits, _)</span></label>
            <input
              required
              value={form.key}
              onChange={e => setForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
              placeholder="my_custom_key"
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Label *</label>
            <input
              required
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="My Custom Field"
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select
              value={form.content_type}
              onChange={e => setForm(f => ({ ...f, content_type: e.target.value as ContentType }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {CONTENT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Section</label>
            <input
              value={form.section}
              onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
              placeholder="general"
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Default value</label>
          <input
            value={form.value}
            onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Description <span className="text-gray-400">(optional)</span></label>
          <input
            value={form.description ?? ''}
            onChange={e => setForm(f => ({ ...f, description: e.target.value || null }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_public}
            onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))}
            className="rounded border-gray-300 text-indigo-600"
          />
          Publicly accessible (visible on the frontend)
        </label>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Creating…' : 'Create item'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const [items, setItems] = useState<SiteContentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState<string>('')

  useEffect(() => {
    adminApi
      .listContent()
      .then(res => {
        const data = res.data ?? []
        setItems(data)
        if (data.length > 0) setActiveSection(data[0].section)
      })
      .catch(err => setError(err.message ?? 'Failed to load content'))
      .finally(() => setLoading(false))
  }, [])

  const grouped = groupBySection(items)
  const sections = Array.from(grouped.keys())

  const update = (updated: SiteContentResponse) => {
    setItems(prev => prev.map(i => (i.key === updated.key ? updated : i)))
  }

  const addItem = (item: SiteContentResponse) => {
    setItems(prev => [...prev, item])
    setActiveSection(item.section)
  }

  const deleteItem = async (key: string) => {
    if (!confirm(`Delete content key "${key}"? This cannot be undone.`)) return
    try {
      await adminApi.deleteContent(key)
      setItems(prev => {
        const next = prev.filter(i => i.key !== key)
        if (next.find(i => i.section === activeSection) === undefined && next.length > 0) {
          setActiveSection(next[0].section)
        }
        return next
      })
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Delete failed')
    }
  }

  if (loading) return <div className="py-20"><Spinner size="lg" /></div>
  if (error) return <Alert message={error} />

  const activeItems = grouped.get(activeSection) ?? []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Edit text, images, and settings that appear on the public-facing site. Changes take effect immediately.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Section sidebar */}
        <nav className="w-44 shrink-0 space-y-1">
          {sections.map(s => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === s
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {SECTION_LABELS[s] ?? s}
              <span className="ml-1.5 text-xs text-gray-400">
                ({grouped.get(s)?.length ?? 0})
              </span>
            </button>
          ))}
        </nav>

        {/* Content panel */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6">
            <div className="py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                {SECTION_LABELS[activeSection] ?? activeSection}
              </h2>
              <span className="text-xs text-gray-400">{activeItems.length} field(s)</span>
            </div>

            {activeItems.length === 0 ? (
              <p className="py-8 text-center text-gray-400 text-sm">No fields in this section.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {activeItems.map(item => (
                  <div key={item.key} className="relative group">
                    <FieldEditor item={item} onSaved={update} />
                    <button
                      onClick={() => deleteItem(item.key)}
                      className="absolute top-4 right-0 opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition-opacity"
                      title="Delete this field"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <AddItemForm onCreated={addItem} />
        </div>
      </div>
    </div>
  )
}
