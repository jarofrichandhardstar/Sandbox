import { useEffect, useState } from 'react'
import { adminApi } from '../../api/admin'
import type { ShippingCoverageResponse } from '../../types'
import { ApiError } from '../../api/client'
import Spinner from '../../components/Spinner'
import Alert from '../../components/Alert'
import { useCurrency } from '../../hooks/useCurrency'

const emptyForm = { region_name: '', city: '', postal_code: '', cost: '' }

export default function ShippingPage() {
  const { format } = useCurrency()
  const [zones, setZones] = useState<ShippingCoverageResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const load = () => {
    adminApi
      .listShipping()
      .then(res => setZones(res.data ?? []))
      .catch(err => setError(err.message ?? 'Failed to load shipping zones'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleEdit = (zone: ShippingCoverageResponse) => {
    setEditId(zone.id)
    setForm({
      region_name: zone.region_name,
      city: zone.city,
      postal_code: zone.postal_code,
      cost: zone.cost.toString(),
    })
    setFormError('')
    setFormSuccess('')
  }

  const handleCancel = () => {
    setEditId(null)
    setForm(emptyForm)
    setFormError('')
    setFormSuccess('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    setSaving(true)
    const payload = {
      region_name: form.region_name,
      city: form.city,
      postal_code: form.postal_code,
      cost: parseFloat(form.cost),
    }
    try {
      if (editId) {
        const res = await adminApi.updateShipping(editId, payload)
        if (res.data) {
          setZones(prev => prev.map(z => (z.id === editId ? res.data! : z)))
          setFormSuccess('Zone updated')
          handleCancel()
        }
      } else {
        const res = await adminApi.createShipping(payload)
        if (res.data) {
          setZones(prev => [...prev, res.data!])
          setFormSuccess('Zone created')
          setForm(emptyForm)
        }
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, city: string) => {
    if (!confirm(`Delete shipping zone for "${city}"?`)) return
    try {
      await adminApi.deleteShipping(id)
      setZones(prev => prev.filter(z => z.id !== id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed')
    }
  }

  if (loading) return <div className="py-20"><Spinner size="lg" /></div>
  if (error) return <Alert message={error} />

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Shipping Coverage</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {zones.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100 text-gray-400">
              No shipping zones yet. Add one →
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Region</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">City</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Postal code</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Cost</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {zones.map(zone => (
                    <tr key={zone.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{zone.region_name}</td>
                      <td className="px-4 py-3 text-gray-600">{zone.city}</td>
                      <td className="px-4 py-3 text-gray-600">{zone.postal_code}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {format(zone.cost)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(zone)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(zone.id, zone.city)}
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

        <div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">
              {editId ? 'Edit zone' : 'Add zone'}
            </h2>

            {formError && <Alert message={formError} className="mb-3" />}
            {formSuccess && <Alert variant="success" message={formSuccess} className="mb-3" />}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Region name *</label>
                <input
                  required
                  value={form.region_name}
                  onChange={e => setForm(f => ({ ...f, region_name: e.target.value }))}
                  placeholder="e.g. Metro Manila"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">City *</label>
                <input
                  required
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="e.g. Makati"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Postal code *</label>
                <input
                  required
                  value={form.postal_code}
                  onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))}
                  placeholder="e.g. 1200"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Shipping cost ($) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost}
                  onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                {editId && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editId ? 'Update' : 'Add zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
