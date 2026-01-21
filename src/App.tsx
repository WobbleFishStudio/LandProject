import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'

// Admin pages
import AdminDashboard from '@/pages/admin/Dashboard'
import Properties from '@/pages/admin/Properties'
import PropertyDetail from '@/pages/admin/PropertyDetail'
import Sales from '@/pages/admin/Sales'
import SaleDetail from '@/pages/admin/SaleDetail'
import Buyers from '@/pages/admin/Buyers'
import TaxTracker from '@/pages/admin/TaxTracker'

// Buyer pages
import BuyerDashboard from '@/pages/buyer/BuyerDashboard'
import PaymentSchedule from '@/pages/buyer/PaymentSchedule'
import MakePayment from '@/pages/buyer/MakePayment'
import PaymentSuccess from '@/pages/buyer/PaymentSuccess'

// Auth pages
import Login from '@/pages/auth/Login'
import AuthCallback from '@/pages/auth/AuthCallback'

function ProtectedRoute({ children, requireAdmin = false }: {
  children: React.ReactNode
  requireAdmin?: boolean
}) {
  const { user, isAdmin, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/buyer" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const { user, isAdmin, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={user ? <Navigate to={isAdmin ? '/admin' : '/buyer'} replace /> : <Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/properties" element={<ProtectedRoute requireAdmin><Properties /></ProtectedRoute>} />
      <Route path="/admin/properties/:id" element={<ProtectedRoute requireAdmin><PropertyDetail /></ProtectedRoute>} />
      <Route path="/admin/sales" element={<ProtectedRoute requireAdmin><Sales /></ProtectedRoute>} />
      <Route path="/admin/sales/:id" element={<ProtectedRoute requireAdmin><SaleDetail /></ProtectedRoute>} />
      <Route path="/admin/buyers" element={<ProtectedRoute requireAdmin><Buyers /></ProtectedRoute>} />
      <Route path="/admin/taxes" element={<ProtectedRoute requireAdmin><TaxTracker /></ProtectedRoute>} />

      {/* Buyer routes */}
      <Route path="/buyer" element={<ProtectedRoute><BuyerDashboard /></ProtectedRoute>} />
      <Route path="/buyer/payments/:saleId" element={<ProtectedRoute><PaymentSchedule /></ProtectedRoute>} />
      <Route path="/buyer/pay/:paymentId" element={<ProtectedRoute><MakePayment /></ProtectedRoute>} />
      <Route path="/buyer/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to={user ? (isAdmin ? '/admin' : '/buyer') : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
