import { useEffect, useState } from 'react'
import { adminOrdersApi } from '../../api/orders'
import { ApiError } from '../../api/client'
import type { AdminOrderListItem, OrderResponse } from '../../types'
import Spinner from '../../components/Spinner'
import Alert from '../../components/Alert'

const STATUS_OPTIONS = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped:   'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  )
}

function OrderDetail({
  order,
  onClose,
  onStatusChange,
}: {
  order: OrderResponse
  onClose: () => void
  onStatusChange: (id: string, status: string) => void
}) {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')

  const handleStatus = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value
    setUpdating(true)
    setError('')
    try {
      await adminOrdersApi.updateStatus(order.order_id, { status })
      onStatusChange(order.order_id, status)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Order detail</h2>
            <p className="text-xs text-gray-400 mt-0.5">#{order.order_id.slice(0, 8).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        {error && <Alert message={error} />}

        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <select
              value={order.status}
              onChange={handleStatus}
              disabled={updating}
              className="text-xs rounded-lg border border-gray-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Placed</span>
            <span className="text-gray-900">{new Date(order.created_at).toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 text-sm">
          <p className="font-medium text-gray-700 mb-1">Ship to</p>
          <p className="text-gray-600">{order.shipping_address}</p>
          <p className="text-gray-600">{order.shipping_city}, {order.shipping_postal_code}</p>
          <p className="text-gray-400 text-xs">{order.shipping_region}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Items</p>
          <div className="space-y-1.5 text-sm">
            {order.items.map(item => (
              <div key={item.inventory_item_id} className="flex justify-between text-gray-600">
                <span>{item.item_name} × {item.quantity}</span>
                <span>${item.line_total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-3 text-sm space-y-1">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>${order.total_amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Shipping</span>
            <span>${order.shipping_cost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 text-base">
            <span>Total</span>
            <span>${order.total_paid.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    adminOrdersApi
      .list()
      .then(res => setOrders(res.data ?? []))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load orders'))
      .finally(() => setLoading(false))
  }, [])

  const openOrder = async (id: string) => {
    setLoadingDetail(true)
    try {
      const res = await adminOrdersApi.get(id)
      if (res.data) setSelectedOrder(res.data)
    } catch {
      setError('Failed to load order detail')
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleStatusChange = (id: string, status: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    if (selectedOrder?.order_id === id) {
      setSelectedOrder(prev => prev ? { ...prev, status } : prev)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <span className="text-sm text-gray-500">{orders.length} total</span>
      </div>

      {error && <Alert message={error} className="mb-4" />}

      {orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No orders yet.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Order</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">City</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(order => (
                <tr
                  key={order.id}
                  onClick={() => openOrder(order.id)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    #{order.id.slice(0, 8).toUpperCase()}
                    <span className="block text-gray-400 font-sans">{order.item_count} item{order.item_count !== 1 ? 's' : ''}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{order.username}</p>
                    <p className="text-gray-400 text-xs">{order.user_email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                    {order.shipping_city}
                    <span className="block text-xs text-gray-400">{order.shipping_region}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    ${order.total_paid.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loadingDetail && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}

      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
