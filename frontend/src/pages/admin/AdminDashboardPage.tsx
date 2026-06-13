import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../../api/admin'
import type { AdminInventoryResponse, ShippingCoverageResponse } from '../../types'
import Spinner from '../../components/Spinner'

interface Stats {
  totalItems: number
  publishedItems: number
  needsReorder: number
  totalShippingZones: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([adminApi.listInventory(), adminApi.listShipping()])
      .then(([inv, ship]) => {
        const items: AdminInventoryResponse[] = inv.data ?? []
        const zones: ShippingCoverageResponse[] = ship.data ?? []
        setStats({
          totalItems: items.length,
          publishedItems: items.filter(i => i.is_published).length,
          needsReorder: items.filter(i => i.stock?.needs_reorder).length,
          totalShippingZones: zones.length,
        })
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-20"><Spinner size="lg" /></div>

  const cards = [
    { label: 'Total products', value: stats?.totalItems ?? 0, to: '/admin/inventory', color: 'bg-indigo-50 text-indigo-700' },
    { label: 'Published', value: stats?.publishedItems ?? 0, to: '/admin/inventory', color: 'bg-green-50 text-green-700' },
    { label: 'Needs reorder', value: stats?.needsReorder ?? 0, to: '/admin/inventory', color: 'bg-amber-50 text-amber-700' },
    { label: 'Shipping zones', value: stats?.totalShippingZones ?? 0, to: '/admin/shipping', color: 'bg-blue-50 text-blue-700' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(card => (
          <Link
            key={card.label}
            to={card.to}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
          >
            <p className="text-sm text-gray-500 mb-1">{card.label}</p>
            <p className={`text-3xl font-bold rounded-lg inline-px-2 ${card.color}`}>
              {card.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Quick actions</h2>
          </div>
          <div className="space-y-2">
            <Link
              to="/admin/inventory/new"
              className="flex items-center gap-2 w-full rounded-lg border border-indigo-200 px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
            >
              + Add inventory item
            </Link>
            <Link
              to="/admin/shipping"
              className="flex items-center gap-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              + Add shipping zone
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">System status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Backend API</span>
              <span className="text-green-600 font-medium flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                Connected
              </span>
            </div>
            {(stats?.needsReorder ?? 0) > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-amber-600">Low stock items</span>
                <span className="text-amber-700 font-medium">{stats!.needsReorder} item(s)</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
