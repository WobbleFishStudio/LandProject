import { useEffect, useState, useMemo } from 'react'
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
import { Button, Input, Select, Modal, Card, TaxStatusBadge } from '@/components/ui'
import { getTaxPayments, getProperties, createTaxPayment, updateTaxPayment } from '@/lib/supabase'
import { formatCurrency } from '@/lib/calculations'
import { exportTaxPaymentsToCSV } from '@/utils/export'
import type { TaxPayment, Property, TaxPaymentFormData } from '@/types'
import {
  PlusIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

const columnHelper = createColumnHelper<TaxPayment>()

export default function TaxTracker() {
  const [taxPayments, setTaxPayments] = useState<TaxPayment[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<TaxPaymentFormData>({
    property_id: '',
    tax_year: new Date().getFullYear(),
    amount: 0,
    due_date: `${new Date().getFullYear()}-12-31`
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [taxData, propertiesData] = await Promise.all([
        getTaxPayments(),
        getProperties()
      ])
      setTaxPayments(taxData)
      setProperties(propertiesData)
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
          <span className="font-medium text-gray-900">{info.getValue()}</span>
        )
      }),
      columnHelper.accessor((row) => row.property?.county?.name, {
        id: 'county',
        header: 'County',
        cell: (info) => info.getValue() || '-'
      }),
      columnHelper.accessor('tax_year', {
        header: 'Year'
      }),
      columnHelper.accessor('amount', {
        header: 'Amount',
        cell: (info) => formatCurrency(info.getValue())
      }),
      columnHelper.accessor('due_date', {
        header: 'Due Date',
        cell: (info) => format(new Date(info.getValue()), 'MMM d, yyyy')
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => <TaxStatusBadge status={info.getValue()} />
      }),
      columnHelper.accessor('paid_date', {
        header: 'Paid Date',
        cell: (info) =>
          info.getValue() ? format(new Date(info.getValue()!), 'MMM d, yyyy') : '-'
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => {
          const payment = info.row.original
          return (
            <div className="flex items-center space-x-2">
              {payment.status === 'pending' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleMarkPaid(payment)}
                >
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Paid
                </Button>
              )}
              {payment.property?.county_tax_url && (
                <a
                  href={payment.property.county_tax_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-gray-400 hover:text-primary-600"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </a>
              )}
            </div>
          )
        }
      })
    ],
    []
  )

  const table = useReactTable({
    data: taxPayments,
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

  const handleMarkPaid = async (payment: TaxPayment) => {
    try {
      await updateTaxPayment(payment.id, {
        status: 'paid',
        paid_date: format(new Date(), 'yyyy-MM-dd')
      })
      loadData()
    } catch (error) {
      console.error('Error marking payment as paid:', error)
    }
  }

  const handlePropertySelect = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId)
    setFormData({
      ...formData,
      property_id: propertyId,
      amount: property?.tax_annual || 0
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await createTaxPayment(formData)
      loadData()
      handleCloseModal()
    } catch (error) {
      console.error('Error creating tax payment:', error)
      alert('Failed to create tax payment')
    } finally {
      setSaving(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setFormData({
      property_id: '',
      tax_year: new Date().getFullYear(),
      amount: 0,
      due_date: `${new Date().getFullYear()}-12-31`
    })
  }

  // Summary stats
  const pendingPayments = taxPayments.filter(t => t.status === 'pending')
  const totalPending = pendingPayments.reduce((sum, t) => sum + t.amount, 0)
  const overdueCount = pendingPayments.filter(t => new Date(t.due_date) < new Date()).length

  if (loading) {
    return (
      <Layout title="Tax Tracker" userRole="admin">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Tax Tracker" userRole="admin">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="text-center">
          <p className="text-sm text-gray-500">Pending Payments</p>
          <p className="text-2xl font-bold text-gray-900">{pendingPayments.length}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-gray-500">Total Pending Amount</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPending)}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-gray-500">Overdue</p>
          <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {overdueCount}
          </p>
        </Card>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tax payments..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-80"
          />
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="secondary" size="sm" onClick={() => exportTaxPaymentsToCSV(taxPayments)}>
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export
          </Button>

          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Tax Payment
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
              {table.getRowModel().rows.map((row) => {
                const isOverdue =
                  row.original.status === 'pending' &&
                  new Date(row.original.due_date) < new Date()
                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                )
              })}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    No tax payments found
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

      {/* Add Tax Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Add Tax Payment"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Property"
            value={formData.property_id}
            onChange={(e) => handlePropertySelect(e.target.value)}
            options={properties.map((p) => ({
              value: p.id,
              label: `${p.reference} - ${p.county?.name || 'Unknown County'}`
            }))}
            placeholder="Select property"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Tax Year"
              type="number"
              value={formData.tax_year}
              onChange={(e) =>
                setFormData({ ...formData, tax_year: parseInt(e.target.value) || 0 })
              }
              required
            />
            <Input
              label="Amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
              }
              required
            />
          </div>
          <Input
            label="Due Date"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            required
          />
          <Input
            label="Notes"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Add Payment
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
