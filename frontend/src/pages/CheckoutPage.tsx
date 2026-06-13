import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { ordersApi } from '../api/orders'
import { ApiError } from '../api/client'
import type { ShippingCoverageResponse, OrderResponse } from '../types'
import Alert from '../components/Alert'
import Spinner from '../components/Spinner'

type Step = 'shipping' | 'payment' | 'confirm'

export default function CheckoutPage() {
  const { items, clear } = useCart()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('shipping')
  const [form, setForm] = useState({
    shipping_address: '',
    shipping_city: '',
    shipping_postal_code: '',
    payment_method: 'cash',
  })
  const [shippingInfo, setShippingInfo] = useState<ShippingCoverageResponse | null>(null)
  const [estimating, setEstimating] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')

  const subtotal = items.reduce((s, i) => s + i.line_total, 0)
  const total = subtotal + (shippingInfo?.cost ?? 0)

  const handleEstimate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setEstimating(true)
    try {
      const res = await ordersApi.estimateShipping(form.shipping_city, form.shipping_postal_code)
      if (!res.data) throw new Error('No shipping coverage found')
      setShippingInfo(res.data)
      setStep('payment')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Shipping estimate failed')
    } finally {
      setEstimating(false)
    }
  }

  const handlePlaceOrder = async () => {
    setError('')
    setPlacing(true)
    try {
      const res = await ordersApi.checkout({
        ...form,
        payment_amount: total,
      })
      if (!res.data) throw new Error('Checkout failed')
      clear()
      navigate('/orders/success', { state: { order: res.data } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Checkout failed')
    } finally {
      setPlacing(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 mb-4">Your cart is empty.</p>
        <Link to="/" className="text-indigo-600 hover:underline">Browse products</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

      <div className="flex items-center gap-4 mb-8">
        {(['shipping', 'payment', 'confirm'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? 'bg-indigo-600 text-white'
                  : i < (['shipping', 'payment', 'confirm'] as Step[]).indexOf(step)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i + 1}
            </div>
            <span className="text-sm capitalize text-gray-600 hidden sm:block">{s}</span>
            {i < 2 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {error && <Alert message={error} className="mb-4" />}

      {step === 'shipping' && (
        <form onSubmit={handleEstimate} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Shipping address</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Street address</label>
            <input
              required
              value={form.shipping_address}
              onChange={e => setForm(f => ({ ...f, shipping_address: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                required
                value={form.shipping_city}
                onChange={e => setForm(f => ({ ...f, shipping_city: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postal code</label>
              <input
                required
                value={form.shipping_postal_code}
                onChange={e => setForm(f => ({ ...f, shipping_postal_code: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={estimating}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {estimating ? 'Checking shipping…' : 'Continue to payment'}
          </button>
        </form>
      )}

      {step === 'payment' && shippingInfo && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Order summary</h2>
            <div className="space-y-2 text-sm">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-gray-600">
                  <span>{item.product_name} × {item.quantity}</span>
                  <span>${item.line_total.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between text-gray-600">
                <span>Shipping ({shippingInfo.region_name})</span>
                <span>${shippingInfo.cost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 text-base">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Payment method</h2>
            <select
              value={form.payment_method}
              onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="cash">Cash on delivery</option>
              <option value="bank_transfer">Bank transfer</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('shipping')}
              className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep('confirm')}
              className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Review order
            </button>
          </div>
        </div>
      )}

      {step === 'confirm' && shippingInfo && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
          <h2 className="font-semibold text-gray-900">Confirm your order</h2>

          <div className="text-sm space-y-1 text-gray-600">
            <p className="font-medium text-gray-900">Shipping to:</p>
            <p>{form.shipping_address}</p>
            <p>{form.shipping_city}, {form.shipping_postal_code}</p>
            <p className="text-gray-500">{shippingInfo.region_name}</p>
          </div>

          <div className="text-sm space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-gray-600">
                <span>{item.product_name} × {item.quantity}</span>
                <span>${item.line_total.toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>${shippingInfo.cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base">
              <span>Total due</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <span className="font-medium">Payment:</span> {form.payment_method.replace('_', ' ')}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('payment')}
              className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handlePlaceOrder}
              disabled={placing}
              className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {placing ? 'Placing order…' : 'Place order'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
