import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { ContentProvider } from './context/ContentContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

import HomePage from './pages/HomePage'
import ProductDetailPage from './pages/ProductDetailPage'
import SearchPage from './pages/SearchPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderSuccessPage from './pages/OrderSuccessPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'

import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import InventoryPage from './pages/admin/InventoryPage'
import InventoryEditPage from './pages/admin/InventoryEditPage'
import ShippingPage from './pages/admin/ShippingPage'
import ContentPage from './pages/admin/ContentPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ContentProvider>
        <CartProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/orders/success" element={<OrderSuccessPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>

            <Route element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/inventory" element={<InventoryPage />} />
                <Route path="/admin/inventory/new" element={<InventoryEditPage />} />
                <Route path="/admin/inventory/:id" element={<InventoryEditPage />} />
                <Route path="/admin/shipping" element={<ShippingPage />} />
                <Route path="/admin/content" element={<ContentPage />} />
              </Route>
            </Route>
          </Routes>
        </CartProvider>
        </ContentProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
