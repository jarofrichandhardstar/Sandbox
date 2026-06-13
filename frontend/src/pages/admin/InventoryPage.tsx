import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../../api/admin'
import type { AdminInventoryResponse } from '../../types'
import { ApiError } from '../../api/client'
import Spinner from '../../components/Spinner'
import Alert from '../../components/Alert'

export default function InventoryPage() {
  const [items, setItems] = useState<AdminInventoryResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  const load = () => {
    setLoading(true)
    adminApi
      .listInventory()
      .then(res => setItems(res.data ?? []))
      .catch(err => setError(err.message ?? 'Failed to load inventory'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleTogglePublish = async (id: string) => {
    setActionError('')
    try {
      const res = await adminApi.togglePublish(id)
      if (res.data) setItems(prev => prev.map(i => (i.id === id ? res.data! : i)))
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action failed')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setActionError('')
    try {
      await adminApi.deleteInventory(id)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Delete failed')
    }
  }

  if (loading) return <div className="py-20"><Spinner size="lg" /></div>
  if (error) return <Alert message={error} />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <Link
          to="/admin/inventory/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New item
        </Link>
      </div>

      {actionError && <Alert message={actionError} className="mb-4" />}

      {items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100 text-gray-400">
          No inventory items yet.{' '}
          <Link to="/admin/inventory/new" className="text-indigo-600 hover:underline">
            Add one
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">SKU</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Price</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Cost</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Margin</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Stock</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-gray-900 truncate max-w-[160px]">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{item.sku}</td>
                  <td className="px-4 py-3 text-right text-gray-900">${item.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-500 hidden lg:table-cell">${item.cost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    <span className={item.profit_margin > 0 ? 'text-green-600' : 'text-red-600'}>
                      {item.profit_margin.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.stock ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                        item.stock.needs_reorder ? 'text-amber-600' : 'text-green-600'
                      }`}>
                        {item.stock.needs_reorder && '⚠ '}
                        {item.stock.quantity_in_stock}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleTogglePublish(item.id)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                        item.is_published
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {item.is_published ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/admin/inventory/${item.id}`}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
