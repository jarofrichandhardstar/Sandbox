import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { adminApi } from '../../api/admin'
import type { AdminInventoryResponse, AdminStockResponse } from '../../types'
import { ApiError } from '../../api/client'
import Spinner from '../../components/Spinner'
import Alert from '../../components/Alert'

export default function InventoryEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()

  const [item, setItem] = useState<AdminInventoryResponse | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    name: '',
    sku: '',
    description: '',
    price: '',
    cost: '',
  })

  const [stock, setStock] = useState<AdminStockResponse | null>(null)
  const [stockForm, setStockForm] = useState({
    quantity_in_stock: '',
    reorder_level: '',
    reorder_quantity: '',
    warehouse_location: '',
  })
  const [savingStock, setSavingStock] = useState(false)
  const [stockError, setStockError] = useState('')
  const [stockSuccess, setStockSuccess] = useState('')

  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageError, setImageError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isNew) return
    adminApi
      .getInventory(id!)
      .then(res => {
        if (!res.data) return
        const d = res.data
        setItem(d)
        setForm({
          name: d.name,
          sku: d.sku,
          description: d.description,
          price: d.price.toString(),
          cost: d.cost.toString(),
        })
        if (d.stock) {
          setStock(d.stock)
          setStockForm({
            quantity_in_stock: d.stock.quantity_in_stock.toString(),
            reorder_level: d.stock.reorder_level.toString(),
            reorder_quantity: d.stock.reorder_quantity.toString(),
            warehouse_location: d.stock.warehouse_location,
          })
        }
      })
      .catch(err => setError(err.message ?? 'Failed to load item'))
      .finally(() => setLoading(false))
  }, [id, isNew])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        description: form.description,
        price: parseFloat(form.price),
        cost: parseFloat(form.cost),
      }
      if (isNew) {
        const res = await adminApi.createInventory(payload)
        if (res.data) navigate(`/admin/inventory/${res.data.id}`, { replace: true })
      } else {
        const res = await adminApi.updateInventory(id!, payload)
        if (res.data) setItem(res.data)
        setSuccess('Saved successfully')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleStockSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setStockError('')
    setStockSuccess('')
    setSavingStock(true)
    const payload = {
      quantity_in_stock: parseInt(stockForm.quantity_in_stock),
      reorder_level: parseInt(stockForm.reorder_level),
      reorder_quantity: parseInt(stockForm.reorder_quantity),
      warehouse_location: stockForm.warehouse_location,
    }
    try {
      if (stock) {
        const res = await adminApi.updateStock(stock.id, payload)
        if (res.data) setStock(res.data)
      } else {
        const res = await adminApi.createStock(id!, payload)
        if (res.data) setStock(res.data)
      }
      setStockSuccess('Stock updated')
    } catch (err) {
      setStockError(err instanceof ApiError ? err.message : 'Stock update failed')
    } finally {
      setSavingStock(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      setImageError('Only JPEG, PNG, WebP, and GIF files are allowed')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('File must be under 5 MB')
      return
    }
    setImageError('')
    setUploadingImage(true)
    try {
      const res = await adminApi.uploadImage(id, file)
      if (res.data && item) setItem({ ...item, image_url: res.data.image_url })
    } catch (err) {
      setImageError(err instanceof ApiError ? err.message : 'Upload failed')
    } finally {
      setUploadingImage(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDeleteImage = async () => {
    if (!id || !item?.image_url) return
    if (!confirm('Delete this image?')) return
    setImageError('')
    try {
      await adminApi.deleteImage(id)
      setItem(prev => prev ? { ...prev, image_url: null } : null)
    } catch (err) {
      setImageError(err instanceof ApiError ? err.message : 'Delete failed')
    }
  }

  if (loading) return <div className="py-20"><Spinner size="lg" /></div>

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link to="/admin/inventory" className="text-sm text-indigo-600 hover:underline">
          ← Inventory
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-600">{isNew ? 'New item' : form.name}</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isNew ? 'New inventory item' : 'Edit item'}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Product details</h2>
            {error && <Alert message={error} className="mb-4" />}
            {success && <Alert variant="success" message={success} className="mb-4" />}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                  <input
                    required
                    value={form.sku}
                    onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.cost}
                    onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {form.price && form.cost && parseFloat(form.cost) > 0 && (
                <p className="text-xs text-gray-500">
                  Profit margin:{' '}
                  <span className="font-medium text-green-600">
                    {(((parseFloat(form.price) - parseFloat(form.cost)) / parseFloat(form.price)) * 100).toFixed(1)}%
                  </span>
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : isNew ? 'Create item' : 'Save changes'}
              </button>
            </form>
          </div>

          {!isNew && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4">
                Stock {stock ? `— ${stock.quantity_in_stock} units` : '(not initialized)'}
              </h2>
              {stockError && <Alert message={stockError} className="mb-4" />}
              {stockSuccess && <Alert variant="success" message={stockSuccess} className="mb-4" />}

              <form onSubmit={handleStockSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity in stock</label>
                    <input
                      type="number"
                      min="0"
                      value={stockForm.quantity_in_stock}
                      onChange={e => setStockForm(f => ({ ...f, quantity_in_stock: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reorder level</label>
                    <input
                      type="number"
                      min="0"
                      value={stockForm.reorder_level}
                      onChange={e => setStockForm(f => ({ ...f, reorder_level: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reorder quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={stockForm.reorder_quantity}
                      onChange={e => setStockForm(f => ({ ...f, reorder_quantity: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse location</label>
                    <input
                      value={stockForm.warehouse_location}
                      onChange={e => setStockForm(f => ({ ...f, warehouse_location: e.target.value }))}
                      placeholder="e.g. Shelf A-12"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {stock?.needs_reorder && (
                  <Alert variant="info" message="⚠ Stock is below reorder level — consider restocking." />
                )}

                <button
                  type="submit"
                  disabled={savingStock}
                  className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {savingStock ? 'Saving…' : stock ? 'Update stock' : 'Initialize stock'}
                </button>
              </form>
            </div>
          )}
        </div>

        {!isNew && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Product image</h2>
              {imageError && <Alert message={imageError} className="mb-3" />}

              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
                {item?.image_url ? (
                  <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="space-y-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingImage}
                  className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {uploadingImage ? 'Uploading…' : item?.image_url ? 'Replace image' : 'Upload image'}
                </button>
                {item?.image_url && (
                  <button
                    onClick={handleDeleteImage}
                    className="w-full rounded-lg border border-red-200 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Remove image
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">JPEG, PNG, WebP, GIF · Max 5 MB</p>
            </div>

            {item && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-semibold text-gray-900 mb-3">Visibility</h2>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {item.is_published ? 'Published' : 'Draft'}
                  </span>
                  <button
                    onClick={() => adminApi.togglePublish(item.id).then(res => res.data && setItem(res.data))}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                      item.is_published
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {item.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
