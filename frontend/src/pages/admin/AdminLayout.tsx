import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { adminApi } from '../../api/admin'
import { ApiError } from '../../api/client'
import Spinner from '../../components/Spinner'

const navItems = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/inventory', label: 'Inventory' },
  { to: '/admin/shipping', label: 'Shipping' },
  { to: '/admin/content', label: 'Content' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    adminApi
      .listInventory()
      .then(() => setChecking(false))
      .catch(err => {
        if (err instanceof ApiError && err.status === 403) {
          setDenied(true)
        }
        setChecking(false)
      })
  }, [])

  if (checking) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (denied) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-500 mt-2">You need admin privileges to access this area.</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Go home
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <span className="font-bold text-gray-900">Admin Panel</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200">
          <NavLink
            to="/"
            className="flex items-center px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          >
            ← Back to shop
          </NavLink>
        </div>
      </aside>

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
