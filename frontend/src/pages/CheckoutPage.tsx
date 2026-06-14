import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { ordersApi } from '../api/orders'
import { ApiError } from '../api/client'
import type { ShippingCoverageResponse } from '../types'
import Alert from '../components/Alert'
import { useCurrency } from '../hooks/useCurrency'

type Step = 'shipping' | 'confirm'

export default function CheckoutPage() {
  const { items, clear } = useCart()
  const navigate = useNavigate()

  const { format } = useCurrency()
  const [step, setStep] = useState<Step>('shipping')
  const [form, setForm] = useState({
    shipping_address: '',
    shipping_city: '',
    shipping_postal_code: '',
  })
  const [shippingInfo, setShippingInfo] = useState<ShippingCoverageResponse | null>(null)
  const [estimating, setEstimating] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')

  const subtotal = items.reduce((s, i) => s + i.line_total, 0)
  const total = subtotal + (shippingInfo?.cost ?? 0)

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setEstimating(true)
    try {
      const res = await ordersApi.estimateShipping(form.shipping_city, form.shipping_postal_code)
      if (!res.data) throw new Error('No shipping coverage found for this location')
      setShippingInfo(res.data)
      setStep('confirm')
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('No shipping coverage for this city / postal code. Please verify the details or contact the seller.')
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not check shipping for this location')
      }
    } finally {
      setEstimating(false)
    }
  }

  const handlePlaceOrder = async () => {
    setError('')
    setPlacing(true)
    try {
      const res = await ordersApi.checkout(form)
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

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {(['shipping', 'confirm'] as Step[]).map((s, i) => {
          const stepIndex = ['shipping', 'confirm'].indexOf(step)
          const isActive = s === step
          const isDone = i < stepIndex
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isActive ? 'bg-indigo-600 text-white'
                  : isDone  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i + 1}
              </div>
              <span className="text-sm text-gray-600 hidden sm:block">
                {s === 'shipping' ? 'Shipping' : 'Confirm order'}
              </span>
              {i < 1 && <div className="w-8 h-px bg-gray-200" />}
            </div>
          )
        })}
      </div>

      {error && <Alert message={error} className="mb-4" />}

      {/* Step 1: Shipping address */}
      {step === 'shipping' && (
        <form onSubmit={handleContinue} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Shipping address</h2>

          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-gray-600">
                <span>{item.product_name} × {item.quantity}</span>
                <span>{format(item.line_total)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-1 flex justify-between font-medium text-gray-900">
              <span>Subtotal</span>
              <span>{format(subtotal)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Street address</label>
            <input
              required
              value={form.shipping_address}
              onChange={e => setForm(f => ({ ...f, shipping_address: e.target.value }))}
              placeholder="123 Main Street"
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
                placeholder="City name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postal code</label>
              <input
                required
                value={form.shipping_postal_code}
                onChange={e => setForm(f => ({ ...f, shipping_postal_code: e.target.value }))}
                placeholder="12345"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={estimating}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {estimating ? 'Checking shipping…' : 'Continue to review'}
          </button>
        </form>
      )}

      {/* Step 2: Confirm order */}
      {step === 'confirm' && shippingInfo && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
          <h2 className="font-semibold text-gray-900">Review your order</h2>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Items</p>
            <div className="space-y-2 text-sm">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-gray-600">
                  <span>{item.product_name} × {item.quantity}</span>
                  <span>{format(item.line_total)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{format(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping ({shippingInfo.region_name})</span>
              <span>{format(shippingInfo.cost)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1">
              <span>Total</span>
              <span>{format(total)}</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 text-sm">
            <p className="font-medium text-gray-700 mb-1">Ship to</p>
            <p className="text-gray-600">{form.shipping_address}</p>
            <p className="text-gray-600">{form.shipping_city}, {form.shipping_postal_code}</p>
            <p className="text-gray-400 text-xs mt-0.5">{shippingInfo.region_name}</p>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Payment will be arranged upon delivery or as agreed with the seller.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('shipping')}
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
