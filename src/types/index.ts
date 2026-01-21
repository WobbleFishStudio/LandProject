// Database enum types
export type PropertyStatus = 'available' | 'sold' | 'pending' | 'not_for_sale'
export type SaleStatus = 'active' | 'paid_off' | 'defaulted'
export type PaymentStatus = 'pending' | 'paid' | 'late' | 'missed'
export type TaxPaymentStatus = 'pending' | 'paid'

// Database table types
export interface County {
  id: string
  name: string
  state: string
  created_at: string
}

export interface Property {
  id: string
  reference: string
  county_id: string
  status: PropertyStatus
  account_apn: string
  acreage: number
  tax_annual: number
  tax_year: number
  description: string | null
  legal_summary: string | null
  list_price: number
  price_50_percent: number
  price_20_percent: number
  listing_url: string | null
  county_tax_url: string | null
  created_at: string
  updated_at: string
  // Joined data
  county?: County
}

export interface Buyer {
  id: string
  user_id: string
  full_name: string
  email: string
  phone: string | null
  address: string | null
  created_at: string
}

export interface Sale {
  id: string
  property_id: string
  buyer_id: string
  sale_date: string
  sale_price: number
  down_payment: number
  finance_amount: number
  interest_rate: number
  term_months: number
  monthly_payment: number
  total_payment: number
  status: SaleStatus
  created_at: string
  // Joined data
  property?: Property
  buyer?: Buyer
  payments?: Payment[]
}

export interface Payment {
  id: string
  sale_id: string
  payment_number: number
  due_date: string
  amount_due: number
  principal: number
  interest: number
  paid_amount: number | null
  paid_date: string | null
  stripe_payment_id: string | null
  stripe_checkout_session_id: string | null
  status: PaymentStatus
  created_at: string
  // Joined data
  sale?: Sale
}

export interface TaxPayment {
  id: string
  property_id: string
  tax_year: number
  amount: number
  due_date: string
  paid_date: string | null
  status: TaxPaymentStatus
  notes: string | null
  // Joined data
  property?: Property
}

// Form types for creating/updating records
export interface PropertyFormData {
  reference: string
  county_id: string
  status: PropertyStatus
  account_apn: string
  acreage: number
  tax_annual: number
  tax_year: number
  description?: string
  legal_summary?: string
  list_price: number
  price_50_percent: number
  price_20_percent: number
  listing_url?: string
  county_tax_url?: string
}

export interface BuyerFormData {
  full_name: string
  email: string
  phone?: string
  address?: string
}

export interface SaleFormData {
  property_id: string
  buyer_id: string
  sale_date: string
  sale_price: number
  down_payment: number
  interest_rate: number
  term_months: number
}

export interface CountyFormData {
  name: string
  state: string
}

export interface TaxPaymentFormData {
  property_id: string
  tax_year: number
  amount: number
  due_date: string
  notes?: string
}

// Amortization schedule entry
export interface AmortizationEntry {
  payment_number: number
  due_date: Date
  amount_due: number
  principal: number
  interest: number
  balance: number
}

// Dashboard statistics
export interface DashboardStats {
  totalProperties: number
  availableProperties: number
  soldProperties: number
  pendingProperties: number
  totalRevenue: number
  outstandingPayments: number
  totalBuyers: number
  activeSales: number
}

// Chart data types
export interface SalesByMonthData {
  month: string
  sales: number
  revenue: number
}

export interface PropertiesByCountyData {
  county: string
  count: number
  available: number
  sold: number
}

// API response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

// Auth types
export interface AuthUser {
  id: string
  email: string
  role: 'admin' | 'buyer'
}

// Pagination types
export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
