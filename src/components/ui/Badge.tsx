import type { PropertyStatus, SaleStatus, PaymentStatus, TaxPaymentStatus } from '@/types'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'gray'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-800'
}

export function Badge({ children, variant = 'gray', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full
        text-xs font-medium
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}

// Property status badge
export function PropertyStatusBadge({ status }: { status: PropertyStatus }) {
  const variantMap: Record<PropertyStatus, BadgeVariant> = {
    available: 'success',
    sold: 'danger',
    pending: 'warning',
    not_for_sale: 'gray'
  }

  const labelMap: Record<PropertyStatus, string> = {
    available: 'Available',
    sold: 'Sold',
    pending: 'Pending',
    not_for_sale: 'Not For Sale'
  }

  return <Badge variant={variantMap[status]}>{labelMap[status]}</Badge>
}

// Sale status badge
export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  const variantMap: Record<SaleStatus, BadgeVariant> = {
    active: 'info',
    paid_off: 'success',
    defaulted: 'danger'
  }

  const labelMap: Record<SaleStatus, string> = {
    active: 'Active',
    paid_off: 'Paid Off',
    defaulted: 'Defaulted'
  }

  return <Badge variant={variantMap[status]}>{labelMap[status]}</Badge>
}

// Payment status badge
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const variantMap: Record<PaymentStatus, BadgeVariant> = {
    pending: 'warning',
    paid: 'success',
    late: 'danger',
    missed: 'danger'
  }

  const labelMap: Record<PaymentStatus, string> = {
    pending: 'Pending',
    paid: 'Paid',
    late: 'Late',
    missed: 'Missed'
  }

  return <Badge variant={variantMap[status]}>{labelMap[status]}</Badge>
}

// Tax payment status badge
export function TaxStatusBadge({ status }: { status: TaxPaymentStatus }) {
  const variantMap: Record<TaxPaymentStatus, BadgeVariant> = {
    pending: 'warning',
    paid: 'success'
  }

  const labelMap: Record<TaxPaymentStatus, string> = {
    pending: 'Pending',
    paid: 'Paid'
  }

  return <Badge variant={variantMap[status]}>{labelMap[status]}</Badge>
}
