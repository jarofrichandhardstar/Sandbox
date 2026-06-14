import { useLocation, Link } from 'react-router-dom'
import type { OrderResponse } from '../types'
import { useCurrency } from '../hooks/useCurrency'

export default function OrderSuccessPage() {
  const location = useLocation()
  const order = (location.state as { order?: OrderResponse })?.order
  const { format } = useCurrency()

  return (
    <div className="max-w-lg mx-auto mt-10 text-center">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order placed!</h1>
        <p className="text-gray-500 mb-6">
          Thank you for your purchase. We'll process your order shortly.
        </p>

        {order && (
          <div className="text-left bg-gray-50 rounded-xl p-4 mb-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Order ID</span>
              <span className="font-mono text-xs text-gray-700">{order.order_id.slice(0, 8)}…</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="capitalize font-medium text-green-700">{order.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Items total</span>
              <span>{format(order.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Shipping</span>
              <span>{format(order.shipping_cost)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900 border-t pt-2">
              <span>Total paid</span>
              <span>{format(order.total_paid)}</span>
            </div>
            <div className="flex justify-between text-gray-500 text-xs pt-1">
              <span>Ship to</span>
              <span>{order.shipping_city}, {order.shipping_postal_code}</span>
            </div>
          </div>
        )}

        <Link
          to="/"
          className="inline-block rounded-lg bg-indigo-600 px-8 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  )
}
