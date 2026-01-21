import { createClient } from '@supabase/supabase-js'
import type {
  County,
  Property,
  Buyer,
  Sale,
  Payment,
  TaxPayment,
  PropertyFormData,
  BuyerFormData,
  SaleFormData,
  CountyFormData,
  TaxPaymentFormData,
  DashboardStats
} from '@/types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Using placeholder values for development.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// Counties
export async function getCounties(): Promise<County[]> {
  const { data, error } = await supabase
    .from('counties')
    .select('*')
    .order('name')

  if (error) throw error
  return data || []
}

export async function createCounty(county: CountyFormData): Promise<County> {
  const { data, error } = await supabase
    .from('counties')
    .insert(county)
    .select()
    .single()

  if (error) throw error
  return data
}

// Properties
export async function getProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select(`
      *,
      county:counties(*)
    `)
    .order('reference')

  if (error) throw error
  return data || []
}

export async function getProperty(id: string): Promise<Property | null> {
  const { data, error } = await supabase
    .from('properties')
    .select(`
      *,
      county:counties(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createProperty(property: PropertyFormData): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .insert(property)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProperty(id: string, property: Partial<PropertyFormData>): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .update({ ...property, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteProperty(id: string): Promise<void> {
  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Buyers
export async function getBuyers(): Promise<Buyer[]> {
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .order('full_name')

  if (error) throw error
  return data || []
}

export async function getBuyer(id: string): Promise<Buyer | null> {
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getBuyerByUserId(userId: string): Promise<Buyer | null> {
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function createBuyer(buyer: BuyerFormData & { user_id: string }): Promise<Buyer> {
  const { data, error } = await supabase
    .from('buyers')
    .insert(buyer)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateBuyer(id: string, buyer: Partial<BuyerFormData>): Promise<Buyer> {
  const { data, error } = await supabase
    .from('buyers')
    .update(buyer)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Sales
export async function getSales(): Promise<Sale[]> {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      property:properties(*,county:counties(*)),
      buyer:buyers(*)
    `)
    .order('sale_date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getSale(id: string): Promise<Sale | null> {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      property:properties(*,county:counties(*)),
      buyer:buyers(*),
      payments(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getSalesByBuyer(buyerId: string): Promise<Sale[]> {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      property:properties(*,county:counties(*)),
      payments(*)
    `)
    .eq('buyer_id', buyerId)
    .order('sale_date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createSale(sale: SaleFormData & {
  finance_amount: number
  monthly_payment: number
  total_payment: number
}): Promise<Sale> {
  const { data, error } = await supabase
    .from('sales')
    .insert({ ...sale, status: 'active' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSale(id: string, sale: Partial<Sale>): Promise<Sale> {
  const { data, error } = await supabase
    .from('sales')
    .update(sale)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Payments
export async function getPaymentsBySale(saleId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('sale_id', saleId)
    .order('payment_number')

  if (error) throw error
  return data || []
}

export async function createPayments(payments: Omit<Payment, 'id' | 'created_at'>[]): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .insert(payments)
    .select()

  if (error) throw error
  return data || []
}

export async function updatePayment(id: string, payment: Partial<Payment>): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .update(payment)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getPendingPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      sale:sales(*,property:properties(*),buyer:buyers(*))
    `)
    .in('status', ['pending', 'late'])
    .order('due_date')

  if (error) throw error
  return data || []
}

// Tax Payments
export async function getTaxPayments(): Promise<TaxPayment[]> {
  const { data, error } = await supabase
    .from('tax_payments')
    .select(`
      *,
      property:properties(*,county:counties(*))
    `)
    .order('due_date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getTaxPaymentsByProperty(propertyId: string): Promise<TaxPayment[]> {
  const { data, error } = await supabase
    .from('tax_payments')
    .select('*')
    .eq('property_id', propertyId)
    .order('tax_year', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createTaxPayment(taxPayment: TaxPaymentFormData): Promise<TaxPayment> {
  const { data, error } = await supabase
    .from('tax_payments')
    .insert({ ...taxPayment, status: 'pending' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTaxPayment(id: string, taxPayment: Partial<TaxPayment>): Promise<TaxPayment> {
  const { data, error } = await supabase
    .from('tax_payments')
    .update(taxPayment)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Dashboard Stats
export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    { count: totalProperties },
    { count: availableProperties },
    { count: soldProperties },
    { count: pendingProperties },
    { data: salesData },
    { data: paymentsData },
    { count: totalBuyers },
    { count: activeSales }
  ] = await Promise.all([
    supabase.from('properties').select('*', { count: 'exact', head: true }),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'available'),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('sales').select('sale_price'),
    supabase.from('payments').select('amount_due, status').in('status', ['pending', 'late']),
    supabase.from('buyers').select('*', { count: 'exact', head: true }),
    supabase.from('sales').select('*', { count: 'exact', head: true }).eq('status', 'active')
  ])

  const totalRevenue = salesData?.reduce((sum, sale) => sum + (sale.sale_price || 0), 0) || 0
  const outstandingPayments = paymentsData?.reduce((sum, p) => sum + (p.amount_due || 0), 0) || 0

  return {
    totalProperties: totalProperties || 0,
    availableProperties: availableProperties || 0,
    soldProperties: soldProperties || 0,
    pendingProperties: pendingProperties || 0,
    totalRevenue,
    outstandingPayments,
    totalBuyers: totalBuyers || 0,
    activeSales: activeSales || 0
  }
}

// Auth helpers
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) throw error
  return data
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  })
  if (error) throw error
}
