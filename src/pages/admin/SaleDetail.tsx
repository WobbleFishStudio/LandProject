import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { Button, Card, SaleStatusBadge, PaymentStatusBadge } from '@/components/ui'
import { getSale, updatePayment, updateSale } from '@/lib/supabase'
import { formatCurrency, calculatePayoffAmount } from '@/lib/calculations'
import { exportPaymentsToCSV } from '@/utils/export'
import type { Sale, Payment } from '@/types'
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

export default function SaleDetail() {
  const { id } = useParams<{ id: string }>()
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    try {
      const data = await getSale(id!)
      setSale(data)
    } catch (error) {
      console.error('Error loading sale:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkPaid = async (payment: Payment) => {
    try {
      await updatePayment(payment.id, {
        status: 'paid',
        paid_amount: payment.amount_due,
        paid_date: format(new Date(), 'yyyy-MM-dd')
      })
      loadData()
    } catch (error) {
      console.error('Error marking payment as paid:', error)
    }
  }

  const handleMarkPaidOff = async () => {
    if (!sale) return
    if (!confirm('Mark this sale as paid off? This will mark all remaining payments as paid.')) return

    try {
      // Mark all pending payments as paid
      const pendingPayments = sale.payments?.filter(p => p.status !== 'paid') || []
      for (const payment of pendingPayments) {
        await updatePayment(payment.id, {
          status: 'paid',
          paid_amount: payment.amount_due,
          paid_date: format(new Date(), 'yyyy-MM-dd')
        })
      }

      // Update sale status
      await updateSale(sale.id, { status: 'paid_off' })
      loadData()
    } catch (error) {
      console.error('Error marking sale as paid off:', error)
    }
  }

  if (loading) {
    return (
      <Layout title="Sale Details" userRole="admin">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </Layout>
    )
  }

  if (!sale) {
    return (
      <Layout title="Sale Details" userRole="admin">
        <div className="text-center py-12">
          <p className="text-gray-500">Sale not found</p>
          <Link to="/admin/sales">
            <Button variant="secondary" className="mt-4">Back to Sales</Button>
          </Link>
        </div>
      </Layout>
    )
  }

  const payments = sale.payments || []
  const paidPayments = payments.filter(p => p.status === 'paid')
  const payoffAmount = calculatePayoffAmount(payments)
  const totalPaid = paidPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0)

  return (
    <Layout title={`Sale - ${sale.property?.reference}`} userRole="admin">
      <div className="mb-6">
        <Link
          to="/admin/sales"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Sales
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Sale Info */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Sale Information</h2>
            <SaleStatusBadge status={sale.status} />
          </div>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Property</dt>
              <dd className="font-medium">
                <Link to={`/admin/properties/${sale.property_id}`} className="text-primary-600 hover:text-primary-700">
                  {sale.property?.reference}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Sale Date</dt>
              <dd className="font-medium">{format(new Date(sale.sale_date), 'MMM d, yyyy')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Sale Price</dt>
              <dd className="font-medium">{formatCurrency(sale.sale_price)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Down Payment</dt>
              <dd className="font-medium">{formatCurrency(sale.down_payment)}</dd>
            </div>
          </dl>
        </Card>

        {/* Buyer Info */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Buyer Information</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Name</dt>
              <dd className="font-medium">{sale.buyer?.full_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="font-medium">{sale.buyer?.email}</dd>
            </div>
            {sale.buyer?.phone && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Phone</dt>
                <dd className="font-medium">{sale.buyer.phone}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Loan Terms */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Loan Terms</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Finance Amount</dt>
              <dd className="font-medium">{formatCurrency(sale.finance_amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Interest Rate</dt>
              <dd className="font-medium">{sale.interest_rate}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Term</dt>
              <dd className="font-medium">{sale.term_months} months</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Monthly Payment</dt>
              <dd className="font-medium text-primary-600">{formatCurrency(sale.monthly_payment)}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="text-center">
          <p className="text-sm text-gray-500">Total Payments</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(sale.total_payment)}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-gray-500">Total Paid</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid + sale.down_payment)}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-gray-500">Payoff Amount</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(payoffAmount)}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-gray-500">Payments Made</p>
          <p className="text-2xl font-bold text-gray-900">{paidPayments.length} / {payments.length}</p>
        </Card>
      </div>

      {/* Actions */}
      {sale.status === 'active' && (
        <div className="flex justify-end space-x-3 mb-6">
          <Button
            variant="secondary"
            onClick={() => exportPaymentsToCSV(payments, sale.property?.reference)}
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export Schedule
          </Button>
          <Button onClick={handleMarkPaidOff}>
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            Mark Paid Off
          </Button>
        </div>
      )}

      {/* Amortization Schedule */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Amortization Schedule</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Due Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Payment
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Principal
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Interest
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Paid Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className={payment.status === 'paid' ? 'bg-green-50' : payment.status === 'late' ? 'bg-red-50' : ''}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {payment.payment_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(payment.due_date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(payment.amount_due)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(payment.principal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(payment.interest)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <PaymentStatusBadge status={payment.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.paid_date ? format(new Date(payment.paid_date), 'MMM d, yyyy') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {payment.status !== 'paid' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleMarkPaid(payment)}
                      >
                        Mark Paid
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Layout>
  )
}
