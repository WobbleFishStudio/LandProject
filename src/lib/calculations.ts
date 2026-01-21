import { addMonths } from 'date-fns'
import type { AmortizationEntry, SaleFormData } from '@/types'

/**
 * Calculate monthly payment using standard amortization formula
 * M = P * [r(1+r)^n] / [(1+r)^n - 1]
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  months: number
): number {
  if (principal <= 0 || months <= 0) return 0
  if (annualRate === 0) return principal / months

  const monthlyRate = annualRate / 100 / 12
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, months)
  const denominator = Math.pow(1 + monthlyRate, months) - 1

  return principal * (numerator / denominator)
}

/**
 * Calculate total payment over the loan term
 */
export function calculateTotalPayment(
  monthlyPayment: number,
  months: number,
  downPayment: number
): number {
  return monthlyPayment * months + downPayment
}

/**
 * Calculate finance amount (sale price minus down payment)
 */
export function calculateFinanceAmount(
  salePrice: number,
  downPayment: number
): number {
  return Math.max(0, salePrice - downPayment)
}

/**
 * Generate full amortization schedule
 */
export function generateAmortizationSchedule(
  financeAmount: number,
  annualRate: number,
  months: number,
  startDate: Date
): AmortizationEntry[] {
  const schedule: AmortizationEntry[] = []
  const monthlyPayment = calculateMonthlyPayment(financeAmount, annualRate, months)
  const monthlyRate = annualRate / 100 / 12

  let balance = financeAmount

  for (let i = 1; i <= months; i++) {
    const interest = annualRate === 0 ? 0 : balance * monthlyRate
    const principal = monthlyPayment - interest
    balance = Math.max(0, balance - principal)

    // Adjust last payment for rounding
    const adjustedPrincipal = i === months ? balance + principal : principal
    const adjustedPayment = i === months ? adjustedPrincipal + interest : monthlyPayment

    schedule.push({
      payment_number: i,
      due_date: addMonths(startDate, i),
      amount_due: Math.round(adjustedPayment * 100) / 100,
      principal: Math.round(adjustedPrincipal * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      balance: i === months ? 0 : Math.round(balance * 100) / 100
    })
  }

  return schedule
}

/**
 * Calculate sale details from form data
 */
export function calculateSaleDetails(formData: SaleFormData) {
  const financeAmount = calculateFinanceAmount(formData.sale_price, formData.down_payment)
  const monthlyPayment = calculateMonthlyPayment(
    financeAmount,
    formData.interest_rate,
    formData.term_months
  )
  const totalPayment = calculateTotalPayment(
    monthlyPayment,
    formData.term_months,
    formData.down_payment
  )

  return {
    finance_amount: Math.round(financeAmount * 100) / 100,
    monthly_payment: Math.round(monthlyPayment * 100) / 100,
    total_payment: Math.round(totalPayment * 100) / 100
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

/**
 * Calculate discount price
 */
export function calculateDiscountPrice(listPrice: number, discountPercent: number): number {
  return listPrice * (1 - discountPercent / 100)
}

/**
 * Calculate remaining balance on a loan
 */
export function calculateRemainingBalance(
  originalPrincipal: number,
  annualRate: number,
  totalMonths: number,
  paymentsMade: number
): number {
  if (paymentsMade >= totalMonths) return 0

  const monthlyPayment = calculateMonthlyPayment(originalPrincipal, annualRate, totalMonths)
  const monthlyRate = annualRate / 100 / 12

  let balance = originalPrincipal
  for (let i = 0; i < paymentsMade; i++) {
    const interest = annualRate === 0 ? 0 : balance * monthlyRate
    const principal = monthlyPayment - interest
    balance -= principal
  }

  return Math.max(0, Math.round(balance * 100) / 100)
}

/**
 * Calculate total interest paid
 */
export function calculateTotalInterest(
  totalPayment: number,
  salePrice: number
): number {
  return Math.max(0, totalPayment - salePrice)
}

/**
 * Calculate payoff amount (remaining balance)
 */
export function calculatePayoffAmount(payments: { status: string; principal: number }[]): number {
  const paidPrincipal = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.principal, 0)

  const totalPrincipal = payments.reduce((sum, p) => sum + p.principal, 0)

  return Math.round((totalPrincipal - paidPrincipal) * 100) / 100
}
