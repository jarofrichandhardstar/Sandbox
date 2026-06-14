import { useEffect, useState, useMemo } from 'react'
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
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  )
}

function exportToCSV(orders: AdminOrderListItem[]) {
  const headers = [
    'Order ID',
    'Date',
    'Customer',
    'Email',
    'City',
    'Region',
    'Postal Code',
    'Items',
    'Subtotal',
    'Shipping',
    'Total',
    'Status',
  ]

  const escape = (v: string | number) => {
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  const rows = orders.map(o => [
    o.id,
    new Date(o.created_at).toISOString().slice(0, 10),
    o.username,
    o.user_email,
    o.shipping_city,
    o.shipping_region,
    '',                                             // postal code not on list item
    o.item_count,
    o.total_amount.toFixed(2),
    o.shipping_cost.toFixed(2),
    o.total_paid.toFixed(2),
    o.status,
  ].map(escape).join(','))

  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Order detail modal ────────────────────────────────────────────────────────

function OrderDetailModal({
  orderId,
  initialStatus,
  onClose,
  onStatusChange,
}: {
  orderId: string
  initialStatus: string
  onClose: () => void
  onStatusChange: (id: string, status: string) => void
}) {
  const [order, setOrder] = useState<OrderResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [status, setStatus] = useState(initialStatus)
  const [error, setError] = useState('')

  useEffect(() => {
    adminOrdersApi
      .get(orderId)
      .then(res => { if (res.data) { setOrder(res.data); setStatus(res.data.status) } })
      .catch(() => setError('Failed to load order details'))
      .finally(() => setLoading(false))
  }, [orderId])

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true)
    setError('')
    try {
      await adminOrdersApi.updateStatus(orderId, { status: newStatus })
      setStatus(newStatus)
      onStatusChange(orderId, newStatus)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Order detail</h2>
            {order && (
              <p className="text-xs text-gray-400 mt-0.5">
                #{order.order_id.slice(0, 8).toUpperCase()} · {new Date(order.created_at).toLocaleString()}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none ml-4">×</button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {error && <Alert message={error} />}

          {loading ? (
            <div className="flex justify-center py-8"><Spinner size="lg" /></div>
          ) : order ? (
            <>
              {/* Status update */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Order status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      disabled={updating}
                      onClick={() => handleStatusUpdate(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors disabled:opacity-50 ${
                        status === s
                          ? (STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-700') + ' ring-2 ring-offset-1 ring-current'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ship to */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <p className="font-medium text-gray-700 mb-1">Ship to</p>
                <p className="text-gray-600">{order.shipping_address}</p>
                <p className="text-gray-600">{order.shipping_city}, {order.shipping_postal_code}</p>
                <p className="text-gray-400 text-xs mt-0.5">{order.shipping_region}</p>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Items</p>
                <div className="space-y-2">
                  {order.items.map(item => (
                    <div key={item.inventory_item_id} className="flex justify-between items-start text-sm">
                      <div>
                        <p className="text-gray-900 font-medium">{item.item_name}</p>
                        <p className="text-gray-400 text-xs">SKU: {item.sku} · qty {item.quantity} × ${item.unit_price.toFixed(2)}</p>
                      </div>
                      <span className="text-gray-700 font-medium ml-4 shrink-0">${item.line_total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>${order.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Shipping ({order.shipping_region})</span>
                  <span>${order.shipping_cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base pt-1">
                  <span>Total</span>
                  <span>${order.total_paid.toFixed(2)}</span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ── Summary stat card ────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openOrderId, setOpenOrderId] = useState<string | null>(null)
  const [openOrderStatus, setOpenOrderStatus] = useState('')

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    adminOrdersApi
      .list()
      .then(res => setOrders(res.data ?? []))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load orders'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return orders.filter(o => {
      const matchStatus = !statusFilter || o.status === statusFilter
      const matchSearch = !q || [o.username, o.user_email, o.id, o.shipping_city].some(f => f.toLowerCase().includes(q))
      return matchStatus && matchSearch
    })
  }, [orders, search, statusFilter])

  const stats = useMemo(() => {
    const active = orders.filter(o => o.status !== 'cancelled')
    const revenue = active.reduce((s, o) => s + o.total_paid, 0)
    const byStatus = STATUS_OPTIONS.reduce<Record<string, number>>((acc, s) => {
      acc[s] = orders.filter(o => o.status === s).length
      return acc
    }, {})
    return { revenue, byStatus, active: active.length }
  }, [orders])

  const handleStatusChange = (id: string, status: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    if (openOrderId === id) setOpenOrderStatus(status)
  }

  const openDetail = (order: AdminOrderListItem) => {
    setOpenOrderId(order.id)
    setOpenOrderStatus(order.status)
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <button
          onClick={() => exportToCSV(filtered)}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV{filtered.length !== orders.length ? ` (${filtered.length})` : ''}
        </button>
      </div>

      {error && <Alert message={error} />}

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total orders" value={String(orders.length)} />
        <StatCard label="Revenue" value={`$${stats.revenue.toFixed(2)}`} sub="excl. cancelled" />
        <StatCard label="Pending" value={String(stats.byStatus.pending ?? 0)} />
        <StatCard label="Delivered" value={String(stats.byStatus.delivered ?? 0)} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name, email, city or order ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)} ({stats.byStatus[s] ?? 0})</option>
          ))}
        </select>
      </div>

      {/* Orders table */}
      {orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100">
          No orders yet. Orders placed by customers will appear here.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
          No orders match your search.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Order</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Address</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(order => (
                <tr
                  key={order.id}
                  onClick={() => openDetail(order)}
                  className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-gray-700 font-medium">#{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{order.item_count} item{order.item_count !== 1 ? 's' : ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{order.username}</p>
                    <p className="text-gray-400 text-xs">{order.user_email}</p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <p className="text-gray-700">{order.shipping_city}</p>
                    <p className="text-gray-400 text-xs">{order.shipping_region}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-gray-600">{new Date(order.created_at).toLocaleDateString()}</p>
                    <p className="text-gray-400 text-xs">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-semibold text-gray-900">${order.total_paid.toFixed(2)}</p>
                    <p className="text-gray-400 text-xs">+${order.shipping_cost.toFixed(2)} ship</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-100">
              <tr>
                <td colSpan={4} className="px-4 py-2 text-xs text-gray-400">
                  {filtered.length} order{filtered.length !== 1 ? 's' : ''}
                  {filtered.length !== orders.length ? ` (filtered from ${orders.length})` : ''}
                </td>
                <td className="px-4 py-2 text-right text-xs font-semibold text-gray-700">
                  ${filtered.reduce((s, o) => s + o.total_paid, 0).toFixed(2)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {openOrderId && (
        <OrderDetailModal
          orderId={openOrderId}
          initialStatus={openOrderStatus}
          onClose={() => setOpenOrderId(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
