import { loadStripe, Stripe } from '@stripe/stripe-js'
import { supabase } from './supabase'

let stripePromise: Promise<Stripe | null> | null = null

export function getStripe() {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    if (!key) {
      console.warn('Stripe publishable key not set')
      return Promise.resolve(null)
    }
    stripePromise = loadStripe(key)
  }
  return stripePromise
}

interface CreateCheckoutParams {
  paymentId: string
  amount: number
  description: string
  customerEmail: string
  successUrl: string
  cancelUrl: string
}

export async function createCheckoutSession(params: CreateCheckoutParams): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: params
  })

  if (error) throw error
  if (!data?.sessionId) throw new Error('No session ID returned')

  return data.sessionId
}

export async function redirectToCheckout(sessionId: string): Promise<void> {
  const stripe = await getStripe()
  if (!stripe) {
    throw new Error('Stripe not initialized')
  }

  const { error } = await stripe.redirectToCheckout({ sessionId })
  if (error) throw error
}

export async function makePayment(params: CreateCheckoutParams): Promise<void> {
  const sessionId = await createCheckoutSession(params)
  await redirectToCheckout(sessionId)
}
