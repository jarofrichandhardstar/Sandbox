import { useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../api/client'
import Alert from '../components/Alert'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const code = otp.join('')

  const handleDigit = (i: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[i] = digit
    setOtp(next)
    if (digit && i < 5) inputs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setOtp(text.split(''))
      inputs.current[5]?.focus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length < 6) { setError('Enter all 6 digits'); return }
    setError('')
    setLoading(true)
    try {
      const res = await authApi.verifyEmail(email, code)
      if (!res.data) throw new Error('Verification failed')
      loginWithToken(res.data.user, res.data.token)
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed')
      setOtp(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError('')
    try {
      await authApi.resendOtp(email)
      setResent(true)
      setTimeout(() => setResent(false), 5000)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resend code')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-7 w-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
          <p className="mt-2 text-sm text-gray-500">
            We sent a 6-digit code to <span className="font-medium text-gray-700">{email || 'your email'}</span>
          </p>
        </div>

        {error && <Alert message={error} className="mb-4" />}
        {resent && (
          <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            New code sent — check your inbox.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
            {otp.map((d, i) => (
              <input
                key={i}
                ref={el => { inputs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-xl font-semibold rounded-lg border border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Verifying…' : 'Verify email'}
          </button>
        </form>

        <div className="mt-5 text-center space-y-2">
          <p className="text-sm text-gray-500">
            Didn't receive it?{' '}
            <button
              onClick={handleResend}
              disabled={resending}
              className="font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
            >
              {resending ? 'Sending…' : 'Resend code'}
            </button>
          </p>
          <p className="text-sm text-gray-400">
            <Link to="/login" className="hover:text-gray-600">← Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
