// Supabase Edge Function: Handle Stripe Webhooks
// Deploy with: supabase functions deploy stripe-webhook

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    console.log('Received Stripe event:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Get the payment_id from metadata
        const paymentId = session.metadata?.payment_id

        if (paymentId) {
          // Update the payment record in Supabase
          const { error } = await supabase
            .from('payments')
            .update({
              status: 'paid',
              paid_amount: (session.amount_total || 0) / 100, // Convert from cents
              paid_date: new Date().toISOString().split('T')[0],
              stripe_payment_id: session.payment_intent as string,
              stripe_checkout_session_id: session.id
            })
            .eq('id', paymentId)

          if (error) {
            console.error('Error updating payment:', error)
            throw error
          }

          console.log('Payment updated successfully:', paymentId)

          // Check if all payments for this sale are now paid
          const { data: payment } = await supabase
            .from('payments')
            .select('sale_id')
            .eq('id', paymentId)
            .single()

          if (payment) {
            const { data: pendingPayments } = await supabase
              .from('payments')
              .select('id')
              .eq('sale_id', payment.sale_id)
              .neq('status', 'paid')

            // If no pending payments, mark sale as paid_off
            if (!pendingPayments || pendingPayments.length === 0) {
              await supabase
                .from('sales')
                .update({ status: 'paid_off' })
                .eq('id', payment.sale_id)

              console.log('Sale marked as paid off:', payment.sale_id)
            }
          }
        }
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('Checkout session expired:', session.id)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment failed:', paymentIntent.id)
        // Optionally update payment status or send notification
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
