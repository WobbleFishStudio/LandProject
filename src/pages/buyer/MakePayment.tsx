import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { Card, Button, PaymentStatusBadge } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { makePayment } from '@/lib/stripe'
import { formatCurrency } from '@/lib/calculations'
import type { Payment, Sale } from '@/types'
import { ArrowLeftIcon, CreditCardIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'

export default function MakePayment() {
  const { paymentId } = useParams<{ paymentId: string }>()
  const { buyer } = useAuth()
  const [payment, setPayment] = useState<(Payment & { sale: Sale }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (paymentId) loadPayment()
  }, [paymentId])

  const loadPayment = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          sale:sales(
            *,
            property:properties(*,county:counties(*)),
            buyer:buyers(*)
          )
        `)
        .eq('id', paymentId)
        .single()

      if (error) throw error
      setPayment(data)
    } catch (err) {
      console.error('Error loading payment:', err)
      setError('Payment not found')
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!payment || !buyer) return

    setProcessing(true)
    setError('')

    try {
      await makePayment({
        paymentId: payment.id,
        amount: payment.amount_due,
        description: `Payment #${payment.payment_number} for ${payment.sale.property?.reference}`,
        customerEmail: buyer.email,
        successUrl: `${window.location.origin}/buyer/payment-success?payment_id=${payment.id}`,
        cancelUrl: window.location.href
      })
    } catch (err) {
      console.error('Error processing payment:', err)
      setError('Failed to initiate payment. Please try again.')
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <Layout title="Make Payment" userRole="buyer">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </Layout>
    )
  }

  if (error || !payment) {
    return (
      <Layout title="Make Payment" userRole="buyer">
        <div className="text-center py-12">
          <p className="text-gray-500">{error || 'Payment not found'}</p>
          <Link to="/buyer">
            <Button variant="secondary" className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </Layout>
    )
  }

  if (payment.status === 'paid') {
    return (
      <Layout title="Make Payment" userRole="buyer">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Already Completed</h2>
          <p className="text-gray-500 mb-4">
            This payment was made on {payment.paid_date && format(new Date(payment.paid_date), 'MMMM d, yyyy')}
          </p>
          <Link to={`/buyer/payments/${payment.sale_id}`}>
            <Button variant="secondary">View Payment Schedule</Button>
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Make Payment" userRole="buyer">
      <div className="mb-6">
        <Link
          to="/buyer"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCardIcon className="h-8 w-8 text-primary-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Make a Payment</h2>
            <p className="text-gray-500 mt-1">Payment #{payment.payment_number}</p>
          </div>

          {/* Payment Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Property</dt>
                <dd className="font-medium text-gray-900">{payment.sale.property?.reference}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Due Date</dt>
                <dd className="font-medium text-gray-900">
                  {format(new Date(payment.due_date), 'MMMM d, yyyy')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Status</dt>
                <dd><PaymentStatusBadge status={payment.status} /></dd>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-3 mt-3">
                <dt className="text-sm text-gray-500">Principal</dt>
                <dd className="text-gray-900">{formatCurrency(payment.principal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Interest</dt>
                <dd className="text-gray-900">{formatCurrency(payment.interest)}</dd>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-3">
                <dt className="font-medium text-gray-900">Total Due</dt>
                <dd className="text-xl font-bold text-primary-600">
                  {formatCurrency(payment.amount_due)}
                </dd>
              </div>
            </dl>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button
            onClick={handlePayment}
            loading={processing}
            className="w-full"
          >
            <LockClosedIcon className="h-4 w-4 mr-2" />
            Pay {formatCurrency(payment.amount_due)}
          </Button>

          <p className="text-xs text-gray-500 text-center mt-4">
            You will be redirected to Stripe's secure payment page to complete your payment.
          </p>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Having trouble?{' '}
              <a href="mailto:support@example.com" className="text-primary-600 hover:text-primary-700">
                Contact Support
              </a>
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
