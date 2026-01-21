import type { Property, Sale, Payment, Buyer, TaxPayment } from '@/types'
import { formatCurrency } from '@/lib/calculations'
import { format } from 'date-fns'

type ExportData = Record<string, unknown>[]

/**
 * Convert data array to CSV string
 */
export function convertToCSV(data: ExportData, columns: { key: string; header: string }[]): string {
  if (data.length === 0) return ''

  const headers = columns.map(col => `"${col.header}"`).join(',')
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.key]
      if (value === null || value === undefined) return ''
      if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`
      return String(value)
    }).join(',')
  )

  return [headers, ...rows].join('\n')
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

/**
 * Export properties to CSV
 */
export function exportPropertiesToCSV(properties: Property[]): void {
  const columns = [
    { key: 'reference', header: 'Reference' },
    { key: 'county_name', header: 'County' },
    { key: 'state', header: 'State' },
    { key: 'status', header: 'Status' },
    { key: 'account_apn', header: 'Account/APN' },
    { key: 'acreage', header: 'Acreage' },
    { key: 'list_price', header: 'List Price' },
    { key: 'price_50_percent', header: '50% Price' },
    { key: 'price_20_percent', header: '20% Price' },
    { key: 'tax_annual', header: 'Annual Tax' },
    { key: 'tax_year', header: 'Tax Year' },
    { key: 'description', header: 'Description' },
    { key: 'legal_summary', header: 'Legal Summary' },
    { key: 'listing_url', header: 'Listing URL' },
    { key: 'county_tax_url', header: 'Tax Portal URL' }
  ]

  const data = properties.map(p => ({
    ...p,
    county_name: p.county?.name || '',
    state: p.county?.state || '',
    list_price: formatCurrency(p.list_price),
    price_50_percent: formatCurrency(p.price_50_percent),
    price_20_percent: formatCurrency(p.price_20_percent),
    tax_annual: formatCurrency(p.tax_annual)
  }))

  const csv = convertToCSV(data, columns)
  downloadCSV(csv, 'properties')
}

/**
 * Export sales to CSV
 */
export function exportSalesToCSV(sales: Sale[]): void {
  const columns = [
    { key: 'property_ref', header: 'Property' },
    { key: 'buyer_name', header: 'Buyer' },
    { key: 'buyer_email', header: 'Buyer Email' },
    { key: 'sale_date', header: 'Sale Date' },
    { key: 'sale_price', header: 'Sale Price' },
    { key: 'down_payment', header: 'Down Payment' },
    { key: 'finance_amount', header: 'Finance Amount' },
    { key: 'interest_rate', header: 'Interest Rate' },
    { key: 'term_months', header: 'Term (Months)' },
    { key: 'monthly_payment', header: 'Monthly Payment' },
    { key: 'total_payment', header: 'Total Payment' },
    { key: 'status', header: 'Status' }
  ]

  const data = sales.map(s => ({
    property_ref: s.property?.reference || '',
    buyer_name: s.buyer?.full_name || '',
    buyer_email: s.buyer?.email || '',
    sale_date: s.sale_date,
    sale_price: formatCurrency(s.sale_price),
    down_payment: formatCurrency(s.down_payment),
    finance_amount: formatCurrency(s.finance_amount),
    interest_rate: `${s.interest_rate}%`,
    term_months: s.term_months,
    monthly_payment: formatCurrency(s.monthly_payment),
    total_payment: formatCurrency(s.total_payment),
    status: s.status
  }))

  const csv = convertToCSV(data, columns)
  downloadCSV(csv, 'sales')
}

/**
 * Export payments to CSV
 */
export function exportPaymentsToCSV(payments: Payment[], propertyRef?: string): void {
  const columns = [
    { key: 'payment_number', header: 'Payment #' },
    { key: 'due_date', header: 'Due Date' },
    { key: 'amount_due', header: 'Amount Due' },
    { key: 'principal', header: 'Principal' },
    { key: 'interest', header: 'Interest' },
    { key: 'paid_amount', header: 'Paid Amount' },
    { key: 'paid_date', header: 'Paid Date' },
    { key: 'status', header: 'Status' }
  ]

  const data = payments.map(p => ({
    payment_number: p.payment_number,
    due_date: p.due_date,
    amount_due: formatCurrency(p.amount_due),
    principal: formatCurrency(p.principal),
    interest: formatCurrency(p.interest),
    paid_amount: p.paid_amount ? formatCurrency(p.paid_amount) : '',
    paid_date: p.paid_date || '',
    status: p.status
  }))

  const filename = propertyRef ? `payments_${propertyRef}` : 'payments'
  const csv = convertToCSV(data, columns)
  downloadCSV(csv, filename)
}

/**
 * Export buyers to CSV
 */
export function exportBuyersToCSV(buyers: Buyer[]): void {
  const columns = [
    { key: 'full_name', header: 'Full Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'address', header: 'Address' },
    { key: 'created_at', header: 'Created Date' }
  ]

  const data = buyers.map(b => ({
    ...b,
    created_at: format(new Date(b.created_at), 'yyyy-MM-dd')
  }))

  const csv = convertToCSV(data, columns)
  downloadCSV(csv, 'buyers')
}

/**
 * Export tax payments to CSV
 */
export function exportTaxPaymentsToCSV(taxPayments: TaxPayment[]): void {
  const columns = [
    { key: 'property_ref', header: 'Property' },
    { key: 'tax_year', header: 'Tax Year' },
    { key: 'amount', header: 'Amount' },
    { key: 'due_date', header: 'Due Date' },
    { key: 'paid_date', header: 'Paid Date' },
    { key: 'status', header: 'Status' },
    { key: 'notes', header: 'Notes' }
  ]

  const data = taxPayments.map(t => ({
    property_ref: t.property?.reference || '',
    tax_year: t.tax_year,
    amount: formatCurrency(t.amount),
    due_date: t.due_date,
    paid_date: t.paid_date || '',
    status: t.status,
    notes: t.notes || ''
  }))

  const csv = convertToCSV(data, columns)
  downloadCSV(csv, 'tax_payments')
}

/**
 * Generate Google Sheets URL for import
 * Opens Google Sheets with the data pre-populated via URL
 */
export function openInGoogleSheets(csvContent: string): void {
  // Google Sheets doesn't support direct CSV import via URL,
  // so we create a new blank sheet and show instructions
  const sheetsUrl = 'https://sheets.google.com/create'

  // Copy CSV to clipboard so user can paste it
  navigator.clipboard.writeText(csvContent).then(() => {
    alert('CSV data copied to clipboard! A new Google Sheet will open. Press Ctrl+V (or Cmd+V) to paste your data.')
    window.open(sheetsUrl, '_blank')
  }).catch(() => {
    // Fallback: download as CSV and show instructions
    alert('Unable to copy to clipboard. The file will be downloaded as CSV. You can then import it into Google Sheets via File > Import.')
  })
}

/**
 * Export properties for Google Sheets
 */
export function exportPropertiesToGoogleSheets(properties: Property[]): void {
  const columns = [
    { key: 'reference', header: 'Reference' },
    { key: 'county_name', header: 'County' },
    { key: 'state', header: 'State' },
    { key: 'status', header: 'Status' },
    { key: 'account_apn', header: 'Account/APN' },
    { key: 'acreage', header: 'Acreage' },
    { key: 'list_price', header: 'List Price' },
    { key: 'price_50_percent', header: '50% Price' },
    { key: 'price_20_percent', header: '20% Price' },
    { key: 'tax_annual', header: 'Annual Tax' },
    { key: 'tax_year', header: 'Tax Year' }
  ]

  const data = properties.map(p => ({
    ...p,
    county_name: p.county?.name || '',
    state: p.county?.state || '',
    list_price: p.list_price,
    price_50_percent: p.price_50_percent,
    price_20_percent: p.price_20_percent,
    tax_annual: p.tax_annual
  }))

  // Use tab-separated values for better Google Sheets compatibility
  const headers = columns.map(col => col.header).join('\t')
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.key as keyof typeof row]
      if (value === null || value === undefined) return ''
      return String(value)
    }).join('\t')
  )

  const tsvContent = [headers, ...rows].join('\n')
  openInGoogleSheets(tsvContent)
}

/**
 * Parse CSV file for import
 */
export function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])
  const data: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header.toLowerCase().replace(/\s+/g, '_')] = values[index] || ''
    })
    data.push(row)
  }

  return data
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}
