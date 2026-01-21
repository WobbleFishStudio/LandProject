import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { Card, Button, SaleStatusBadge, PaymentStatusBadge } from '@/components/ui'
import { getSale } from '@/lib/supabase'
import { formatCurrency, calculatePayoffAmount } from '@/lib/calculations'
import { exportPaymentsToCSV } from '@/utils/export'
import type { Sale } from '@/types'
import { ArrowLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'

export default function PaymentSchedule() {
  const { saleId } = useParams<{ saleId: string }>()
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (saleId) loadData()
  }, [saleId])

  const loadData = async () => {
    try {
      const data = await getSale(saleId!)
      setSale(data)
    } catch (error) {
      console.error('Error loading sale:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout title="Payment Schedule" userRole="buyer">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </Layout>
    )
  }

  if (!sale) {
    return (
      <Layout title="Payment Schedule" userRole="buyer">
        <div className="text-center py-12">
          <p className="text-gray-500">Sale not found</p>
          <Link to="/buyer">
            <Button variant="secondary" className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </Layout>
    )
  }

  const payments = sale.payments || []
  const paidPayments = payments.filter(p => p.status === 'paid')
  const totalPaid = paidPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0) + sale.down_payment
  const payoffAmount = calculatePayoffAmount(payments)

  return (
    <Layout title={`Payment Schedule - ${sale.property?.reference}`} userRole="buyer">
      <div className="mb-6">
        <Link
          to="/buyer"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>

      {/* Property & Loan Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Property</h2>
            <SaleStatusBadge status={sale.status} />
          </div>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Reference</dt>
              <dd className="font-medium">{sale.property?.reference}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Location</dt>
              <dd className="font-medium">
                {sale.property?.county?.name}, {sale.property?.county?.state}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Acreage</dt>
              <dd className="font-medium">{sale.property?.acreage} acres</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Purchase Date</dt>
              <dd className="font-medium">
                {format(new Date(sale.sale_date), 'MMMM d, yyyy')}
              </dd>
            </div>
          </dl>

          {sale.property?.county_tax_url && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <a
                href={sale.property.county_tax_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Pay Property Tax
              </a>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Loan Details</h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Sale Price</dt>
              <dd className="font-medium">{formatCurrency(sale.sale_price)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Down Payment</dt>
              <dd className="font-medium">{formatCurrency(sale.down_payment)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Financed</dt>
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
            <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
              <dt className="text-sm font-medium text-gray-700">Monthly Payment</dt>
              <dd className="font-bold text-primary-600">
                {formatCurrency(sale.monthly_payment)}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="text-center">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(sale.total_payment)}
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-gray-500">Total Paid</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-gray-500">Remaining Balance</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(payoffAmount)}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-gray-500">Payments Made</p>
          <p className="text-xl font-bold text-gray-900">
            {paidPayments.length} / {payments.length}
          </p>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end mb-4">
        <Button
          variant="secondary"
          onClick={() => exportPaymentsToCSV(payments, sale.property?.reference)}
        >
          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
          Download Schedule
        </Button>
      </div>

      {/* Payment Schedule Table */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Payment Schedule</h2>
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => {
                const isPaid = payment.status === 'paid'
                const isNextDue = !isPaid && payments.findIndex(p => p.status !== 'paid') === payments.indexOf(payment)

                return (
                  <tr
                    key={payment.id}
                    className={`
                      ${isPaid ? 'bg-green-50' : ''}
                      ${payment.status === 'late' ? 'bg-red-50' : ''}
                      ${isNextDue ? 'bg-primary-50' : ''}
                    `}
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
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {!isPaid && sale.status === 'active' && (
                        <Link
                          to={`/buyer/pay/${payment.id}`}
                          className="text-sm font-medium text-primary-600 hover:text-primary-700"
                        >
                          Pay Now
                        </Link>
                      )}
                      {isPaid && payment.paid_date && (
                        <span className="text-sm text-gray-500">
                          Paid {format(new Date(payment.paid_date), 'M/d/yy')}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </Layout>
  )
}
