import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { Card, SaleStatusBadge, PaymentStatusBadge } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { getSalesByBuyer } from '@/lib/supabase'
import { formatCurrency, calculatePayoffAmount } from '@/lib/calculations'
import type { Sale } from '@/types'
import { MapIcon, CurrencyDollarIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { format, differenceInDays } from 'date-fns'

export default function BuyerDashboard() {
  const { buyer } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (buyer) loadData()
  }, [buyer])

  const loadData = async () => {
    try {
      const data = await getSalesByBuyer(buyer!.id)
      setSales(data)
    } catch (error) {
      console.error('Error loading sales:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout title="My Dashboard" userRole="buyer">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </Layout>
    )
  }

  if (!buyer) {
    return (
      <Layout title="My Dashboard" userRole="buyer">
        <div className="text-center py-12">
          <p className="text-gray-500">No buyer profile found. Please contact support.</p>
        </div>
      </Layout>
    )
  }

  // Calculate totals
  const totalProperties = sales.length
  const activeSales = sales.filter(s => s.status === 'active')
  const totalOwed = activeSales.reduce((sum, s) => {
    const payoff = calculatePayoffAmount(s.payments || [])
    return sum + payoff
  }, 0)

  // Find next payment
  const nextPayment = activeSales
    .flatMap(s => (s.payments || []).filter(p => p.status === 'pending' || p.status === 'late'))
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]

  return (
    <Layout title="My Dashboard" userRole="buyer">
      {/* Welcome */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Welcome, {buyer.full_name}</h2>
        <p className="text-gray-600 mt-1">Here's an overview of your land purchases.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-primary-50 rounded-lg">
              <MapIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">My Properties</p>
              <p className="text-2xl font-bold text-gray-900">{totalProperties}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-primary-50 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Balance</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalOwed)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-primary-50 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Next Payment</p>
              {nextPayment ? (
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(nextPayment.amount_due)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Due {format(new Date(nextPayment.due_date), 'MMM d')}
                    {differenceInDays(new Date(nextPayment.due_date), new Date()) < 0 && (
                      <span className="text-red-600 ml-1">(Overdue)</span>
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-lg text-gray-500">No payments due</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming Payment Alert */}
      {nextPayment && (
        <Card className="mb-8 bg-primary-50 border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-primary-900">Payment Due Soon</h3>
              <p className="text-primary-700 text-sm">
                Your next payment of {formatCurrency(nextPayment.amount_due)} is due on{' '}
                {format(new Date(nextPayment.due_date), 'MMMM d, yyyy')}
              </p>
            </div>
            <Link
              to={`/buyer/pay/${nextPayment.id}`}
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Make Payment
            </Link>
          </div>
        </Card>
      )}

      {/* Properties List */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">My Properties</h3>

      {sales.length === 0 ? (
        <Card>
          <p className="text-gray-500 text-center py-8">
            You haven't purchased any properties yet.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {sales.map((sale) => {
            const payments = sale.payments || []
            const paidPayments = payments.filter(p => p.status === 'paid')
            const nextDue = payments.find(p => p.status === 'pending' || p.status === 'late')
            const payoffAmount = calculatePayoffAmount(payments)

            return (
              <Card key={sale.id}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="mb-4 md:mb-0">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {sale.property?.reference}
                      </h4>
                      <SaleStatusBadge status={sale.status} />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {sale.property?.county?.name}, {sale.property?.county?.state} |{' '}
                      {sale.property?.acreage} acres
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-sm">
                      <span className="text-gray-600">
                        <span className="font-medium">{formatCurrency(sale.monthly_payment)}</span>/mo
                      </span>
                      <span className="text-gray-600">
                        {paidPayments.length}/{payments.length} payments
                      </span>
                      {sale.status === 'active' && (
                        <span className="text-gray-600">
                          Balance: <span className="font-medium">{formatCurrency(payoffAmount)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    {nextDue && sale.status === 'active' && (
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Next payment</p>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(nextDue.amount_due)}
                        </p>
                        <div className="flex items-center space-x-1">
                          <p className="text-xs text-gray-500">
                            {format(new Date(nextDue.due_date), 'MMM d')}
                          </p>
                          <PaymentStatusBadge status={nextDue.status} />
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <Link
                        to={`/buyer/payments/${sale.id}`}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        View Schedule
                      </Link>
                      {nextDue && sale.status === 'active' && (
                        <Link
                          to={`/buyer/pay/${nextDue.id}`}
                          className="px-4 py-2 bg-primary-600 rounded-lg text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                        >
                          Pay Now
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Property Tax Link */}
                {sale.property?.county_tax_url && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <a
                      href={sale.property.county_tax_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      Pay Property Tax ({sale.property.county?.name})
                    </a>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
