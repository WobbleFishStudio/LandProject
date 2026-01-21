import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { Card, Button } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/calculations'
import type { Payment, Sale } from '@/types'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const paymentId = searchParams.get('payment_id')
  const [payment, setPayment] = useState<(Payment & { sale: Sale }) | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (paymentId) loadPayment()
  }, [paymentId])

  const loadPayment = async () => {
    try {
      const { data } = await supabase
        .from('payments')
        .select(`
          *,
          sale:sales(
            *,
            property:properties(*,county:counties(*))
          )
        `)
        .eq('id', paymentId)
        .single()

      setPayment(data)
    } catch (error) {
      console.error('Error loading payment:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout title="Payment Complete" userRole="buyer">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Payment Complete" userRole="buyer">
      <div className="max-w-lg mx-auto">
        <Card className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="h-12 w-12 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-600 mb-6">
            Thank you for your payment. Your transaction has been completed successfully.
          </p>

          {payment && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-medium text-gray-900 mb-3">Payment Details</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Property</dt>
                  <dd className="font-medium">{payment.sale.property?.reference}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Payment #</dt>
                  <dd className="font-medium">{payment.payment_number}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Amount Paid</dt>
                  <dd className="font-medium text-green-600">
                    {formatCurrency(payment.paid_amount || payment.amount_due)}
                  </dd>
                </div>
                {payment.paid_date && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Date</dt>
                    <dd className="font-medium">
                      {format(new Date(payment.paid_date), 'MMMM d, yyyy')}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          <div className="space-y-3">
            {payment && (
              <Link to={`/buyer/payments/${payment.sale_id}`} className="block">
                <Button variant="secondary" className="w-full">
                  View Payment Schedule
                </Button>
              </Link>
            )}
            <Link to="/buyer" className="block">
              <Button className="w-full">
                Return to Dashboard
              </Button>
            </Link>
          </div>

          <p className="text-xs text-gray-500 mt-6">
            A confirmation email has been sent to your registered email address.
          </p>
        </Card>
      </div>
    </Layout>
  )
}
