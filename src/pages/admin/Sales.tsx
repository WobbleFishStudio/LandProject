import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState
} from '@tanstack/react-table'
import { Layout } from '@/components/layout'
import { Button, Input, Select, Modal, Card, SaleStatusBadge } from '@/components/ui'
import { getSales, getProperties, getBuyers, createSale, createPayments, createBuyer } from '@/lib/supabase'
import { calculateSaleDetails, generateAmortizationSchedule, formatCurrency } from '@/lib/calculations'
import { exportSalesToCSV } from '@/utils/export'
import type { Sale, Property, Buyer, SaleFormData } from '@/types'
import {
  PlusIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

const columnHelper = createColumnHelper<Sale>()

export default function Sales() {
  const [searchParams] = useSearchParams()
  const preselectedPropertyId = searchParams.get('property')

  const [sales, setSales] = useState<Sale[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isNewBuyerModalOpen, setIsNewBuyerModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState<SaleFormData>({
    property_id: preselectedPropertyId || '',
    buyer_id: '',
    sale_date: format(new Date(), 'yyyy-MM-dd'),
    sale_price: 0,
    down_payment: 0,
    interest_rate: 9.9,
    term_months: 60
  })

  const [newBuyer, setNewBuyer] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: ''
  })

  const calculatedValues = useMemo(() => {
    return calculateSaleDetails(formData)
  }, [formData])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (preselectedPropertyId && properties.length > 0) {
      const property = properties.find(p => p.id === preselectedPropertyId)
      if (property) {
        setFormData(prev => ({
          ...prev,
          property_id: property.id,
          sale_price: property.list_price
        }))
        setIsModalOpen(true)
      }
    }
  }, [preselectedPropertyId, properties])

  const loadData = async () => {
    try {
      const [salesData, propertiesData, buyersData] = await Promise.all([
        getSales(),
        getProperties(),
        getBuyers()
      ])
      setSales(salesData)
      setProperties(propertiesData.filter(p => p.status === 'available' || p.status === 'pending'))
      setBuyers(buyersData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.property?.reference, {
        id: 'property',
        header: 'Property',
        cell: (info) => (
          <Link
            to={`/admin/sales/${info.row.original.id}`}
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            {info.getValue()}
          </Link>
        )
      }),
      columnHelper.accessor((row) => row.buyer?.full_name, {
        id: 'buyer',
        header: 'Buyer'
      }),
      columnHelper.accessor('sale_date', {
        header: 'Sale Date',
        cell: (info) => format(new Date(info.getValue()), 'MMM d, yyyy')
      }),
      columnHelper.accessor('sale_price', {
        header: 'Sale Price',
        cell: (info) => formatCurrency(info.getValue())
      }),
      columnHelper.accessor('down_payment', {
        header: 'Down Payment',
        cell: (info) => formatCurrency(info.getValue())
      }),
      columnHelper.accessor('monthly_payment', {
        header: 'Monthly',
        cell: (info) => formatCurrency(info.getValue())
      }),
      columnHelper.accessor('interest_rate', {
        header: 'Rate',
        cell: (info) => `${info.getValue()}%`
      }),
      columnHelper.accessor('term_months', {
        header: 'Term',
        cell: (info) => `${info.getValue()} mo`
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => <SaleStatusBadge status={info.getValue()} />
      })
    ],
    []
  )

  const table = useReactTable({
    data: sales,
    columns,
    state: {
      sorting,
      globalFilter
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  const handlePropertySelect = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId)
    setFormData({
      ...formData,
      property_id: propertyId,
      sale_price: property?.list_price || 0
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Create the sale
      const saleData = {
        ...formData,
        ...calculatedValues
      }

      const sale = await createSale(saleData)

      // Generate amortization schedule
      const schedule = generateAmortizationSchedule(
        calculatedValues.finance_amount,
        formData.interest_rate,
        formData.term_months,
        new Date(formData.sale_date)
      )

      // Create payment records
      const payments = schedule.map((entry) => ({
        sale_id: sale.id,
        payment_number: entry.payment_number,
        due_date: format(entry.due_date, 'yyyy-MM-dd'),
        amount_due: entry.amount_due,
        principal: entry.principal,
        interest: entry.interest,
        paid_amount: null,
        paid_date: null,
        stripe_payment_id: null,
        stripe_checkout_session_id: null,
        status: 'pending' as const
      }))

      await createPayments(payments)

      // Refresh data
      loadData()
      handleCloseModal()
    } catch (error) {
      console.error('Error creating sale:', error)
      alert('Failed to create sale')
    } finally {
      setSaving(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setFormData({
      property_id: '',
      buyer_id: '',
      sale_date: format(new Date(), 'yyyy-MM-dd'),
      sale_price: 0,
      down_payment: 0,
      interest_rate: 9.9,
      term_months: 60
    })
  }

  const handleCreateBuyer = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const buyer = await createBuyer({
        ...newBuyer,
        user_id: '' // Will be linked when buyer creates account
      })
      setBuyers([...buyers, buyer])
      setFormData({ ...formData, buyer_id: buyer.id })
      setNewBuyer({ full_name: '', email: '', phone: '', address: '' })
      setIsNewBuyerModalOpen(false)
    } catch (error) {
      console.error('Error creating buyer:', error)
      alert('Failed to create buyer')
    }
  }

  if (loading) {
    return (
      <Layout title="Sales" userRole="admin">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Sales" userRole="admin">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search sales..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-80"
          />
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="secondary" size="sm" onClick={() => exportSalesToCSV(sales)}>
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export
          </Button>

          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Sale
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center space-x-1">
                        <span>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {header.column.getIsSorted() === 'asc' && (
                          <ChevronUpIcon className="h-4 w-4" />
                        )}
                        {header.column.getIsSorted() === 'desc' && (
                          <ChevronDownIcon className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    No sales found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            of {table.getFilteredRowModel().rows.length} results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* New Sale Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Create New Sale"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Property"
              value={formData.property_id}
              onChange={(e) => handlePropertySelect(e.target.value)}
              options={properties.map((p) => ({
                value: p.id,
                label: `${p.reference} - ${formatCurrency(p.list_price)}`
              }))}
              placeholder="Select property"
              required
            />
            <div className="flex items-end space-x-2">
              <div className="flex-1">
                <Select
                  label="Buyer"
                  value={formData.buyer_id}
                  onChange={(e) => setFormData({ ...formData, buyer_id: e.target.value })}
                  options={buyers.map((b) => ({
                    value: b.id,
                    label: `${b.full_name} (${b.email})`
                  }))}
                  placeholder="Select buyer"
                  required
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsNewBuyerModalOpen(true)}
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Sale Date"
              type="date"
              value={formData.sale_date}
              onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
              required
            />
            <Input
              label="Sale Price"
              type="number"
              step="0.01"
              value={formData.sale_price}
              onChange={(e) =>
                setFormData({ ...formData, sale_price: parseFloat(e.target.value) || 0 })
              }
              required
            />
            <Input
              label="Down Payment"
              type="number"
              step="0.01"
              value={formData.down_payment}
              onChange={(e) =>
                setFormData({ ...formData, down_payment: parseFloat(e.target.value) || 0 })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Interest Rate (%)"
              type="number"
              step="0.1"
              value={formData.interest_rate}
              onChange={(e) =>
                setFormData({ ...formData, interest_rate: parseFloat(e.target.value) || 0 })
              }
              required
            />
            <Input
              label="Term (Months)"
              type="number"
              value={formData.term_months}
              onChange={(e) =>
                setFormData({ ...formData, term_months: parseInt(e.target.value) || 0 })
              }
              required
            />
          </div>

          {/* Calculated Values */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-gray-900">Calculated Values</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Finance Amount:</span>
                <span className="ml-2 font-medium">{formatCurrency(calculatedValues.finance_amount)}</span>
              </div>
              <div>
                <span className="text-gray-500">Monthly Payment:</span>
                <span className="ml-2 font-medium">{formatCurrency(calculatedValues.monthly_payment)}</span>
              </div>
              <div>
                <span className="text-gray-500">Total Payment:</span>
                <span className="ml-2 font-medium">{formatCurrency(calculatedValues.total_payment)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create Sale
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Buyer Modal */}
      <Modal
        isOpen={isNewBuyerModalOpen}
        onClose={() => setIsNewBuyerModalOpen(false)}
        title="Add New Buyer"
        size="md"
      >
        <form onSubmit={handleCreateBuyer} className="space-y-4">
          <Input
            label="Full Name"
            value={newBuyer.full_name}
            onChange={(e) => setNewBuyer({ ...newBuyer, full_name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={newBuyer.email}
            onChange={(e) => setNewBuyer({ ...newBuyer, email: e.target.value })}
            required
          />
          <Input
            label="Phone"
            type="tel"
            value={newBuyer.phone}
            onChange={(e) => setNewBuyer({ ...newBuyer, phone: e.target.value })}
          />
          <Input
            label="Address"
            value={newBuyer.address}
            onChange={(e) => setNewBuyer({ ...newBuyer, address: e.target.value })}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsNewBuyerModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Buyer</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
