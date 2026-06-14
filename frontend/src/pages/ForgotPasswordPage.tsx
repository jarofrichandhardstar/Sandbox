import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import Alert from '../components/Alert'
import { useContent } from '../context/ContentContext'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const { get } = useContent()
  const primaryColor = get('primary_button_color', '#4f46e5')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot password</h1>

        {sent ? (
          <div className="mt-4">
            <div className="rounded-lg bg-green-50 px-4 py-4 text-sm text-green-700">
              If that email is registered you'll receive a reset link shortly. Check your inbox (and spam folder).
            </div>
            <Link
              to="/login"
              className="mt-6 block text-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              ← Back to login
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">
              Enter your email and we'll send you a link to reset your password.
            </p>

            {error && <Alert message={error} className="mb-4" />}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: primaryColor }}
                className="w-full rounded-lg py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm">
              <Link to="/login" className="text-indigo-600 hover:text-indigo-500">← Back to login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
