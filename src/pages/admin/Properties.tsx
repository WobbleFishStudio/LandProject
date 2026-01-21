import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState
} from '@tanstack/react-table'
import { Layout } from '@/components/layout'
import { Button, Input, Select, Modal, PropertyStatusBadge, Card } from '@/components/ui'
import { getProperties, getCounties, createProperty, updateProperty, deleteProperty, createCounty } from '@/lib/supabase'
import { formatCurrency } from '@/lib/calculations'
import { exportPropertiesToCSV, exportPropertiesToGoogleSheets, parseCSV } from '@/utils/export'
import type { Property, County, PropertyStatus, PropertyFormData } from '@/types'
import {
  PlusIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'

const columnHelper = createColumnHelper<Property>()

const statusOptions = [
  { value: 'available', label: 'Available' },
  { value: 'sold', label: 'Sold' },
  { value: 'pending', label: 'Pending' },
  { value: 'not_for_sale', label: 'Not For Sale' }
]

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([])
  const [counties, setCounties] = useState<County[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isCountyModalOpen, setIsCountyModalOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [formData, setFormData] = useState<PropertyFormData>({
    reference: '',
    county_id: '',
    status: 'available',
    account_apn: '',
    acreage: 0,
    tax_annual: 0,
    tax_year: new Date().getFullYear(),
    list_price: 0,
    price_50_percent: 0,
    price_20_percent: 0
  })
  const [newCounty, setNewCounty] = useState({ name: '', state: '' })
  const [importData, setImportData] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [propertiesData, countiesData] = await Promise.all([
        getProperties(),
        getCounties()
      ])
      setProperties(propertiesData)
      setCounties(countiesData)
    } catch (error) {
      console.error('Error loading properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('reference', {
        header: 'Reference',
        cell: (info) => (
          <Link
            to={`/admin/properties/${info.row.original.id}`}
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            {info.getValue()}
          </Link>
        )
      }),
      columnHelper.accessor((row) => row.county?.name, {
        id: 'county',
        header: 'County',
        cell: (info) => info.getValue() || '-'
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => <PropertyStatusBadge status={info.getValue()} />
      }),
      columnHelper.accessor('account_apn', {
        header: 'Account/APN'
      }),
      columnHelper.accessor('acreage', {
        header: 'Acreage',
        cell: (info) => `${info.getValue()} ac`
      }),
      columnHelper.accessor('list_price', {
        header: 'List Price',
        cell: (info) => formatCurrency(info.getValue())
      }),
      columnHelper.accessor('price_50_percent', {
        header: '50% Price',
        cell: (info) => formatCurrency(info.getValue())
      }),
      columnHelper.accessor('tax_annual', {
        header: 'Annual Tax',
        cell: (info) => formatCurrency(info.getValue())
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleEdit(info.row.original)}
              className="p-1 text-gray-400 hover:text-primary-600"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(info.row.original.id)}
              className="p-1 text-gray-400 hover:text-red-600"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        )
      })
    ],
    []
  )

  const table = useReactTable({
    data: properties,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  const handleEdit = (property: Property) => {
    setEditingProperty(property)
    setFormData({
      reference: property.reference,
      county_id: property.county_id,
      status: property.status,
      account_apn: property.account_apn,
      acreage: property.acreage,
      tax_annual: property.tax_annual,
      tax_year: property.tax_year,
      description: property.description || '',
      legal_summary: property.legal_summary || '',
      list_price: property.list_price,
      price_50_percent: property.price_50_percent,
      price_20_percent: property.price_20_percent,
      listing_url: property.listing_url || '',
      county_tax_url: property.county_tax_url || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return

    try {
      await deleteProperty(id)
      setProperties(properties.filter((p) => p.id !== id))
    } catch (error) {
      console.error('Error deleting property:', error)
      alert('Failed to delete property')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (editingProperty) {
        const updated = await updateProperty(editingProperty.id, formData)
        setProperties(
          properties.map((p) => (p.id === editingProperty.id ? { ...p, ...updated } : p))
        )
      } else {
        const created = await createProperty(formData)
        setProperties([...properties, created])
      }
      handleCloseModal()
      loadData()
    } catch (error) {
      console.error('Error saving property:', error)
      alert('Failed to save property')
    } finally {
      setSaving(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingProperty(null)
    setFormData({
      reference: '',
      county_id: '',
      status: 'available',
      account_apn: '',
      acreage: 0,
      tax_annual: 0,
      tax_year: new Date().getFullYear(),
      list_price: 0,
      price_50_percent: 0,
      price_20_percent: 0
    })
  }

  const handleCreateCounty = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const created = await createCounty(newCounty)
      setCounties([...counties, created])
      setNewCounty({ name: '', state: '' })
      setIsCountyModalOpen(false)
    } catch (error) {
      console.error('Error creating county:', error)
      alert('Failed to create county')
    }
  }

  const handleImport = async () => {
    try {
      const parsed = parseCSV(importData)
      for (const row of parsed) {
        const county = counties.find(
          (c) => c.name.toLowerCase() === row.county?.toLowerCase()
        )
        if (!county) continue

        await createProperty({
          reference: row.reference || '',
          county_id: county.id,
          status: (row.status as PropertyStatus) || 'available',
          account_apn: row.account_apn || row['account/apn'] || '',
          acreage: parseFloat(row.acreage) || 0,
          tax_annual: parseFloat(row.tax_annual || row.annual_tax) || 0,
          tax_year: parseInt(row.tax_year) || new Date().getFullYear(),
          list_price: parseFloat(row.list_price) || 0,
          price_50_percent: parseFloat(row.price_50_percent || row['50%_price']) || 0,
          price_20_percent: parseFloat(row.price_20_percent || row['20%_price']) || 0
        })
      }
      loadData()
      setIsImportModalOpen(false)
      setImportData('')
    } catch (error) {
      console.error('Error importing properties:', error)
      alert('Failed to import properties')
    }
  }

  if (loading) {
    return (
      <Layout title="Properties" userRole="admin">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Properties" userRole="admin">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search properties..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-80"
          />
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Button variant="secondary" size="sm">
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export
            </Button>
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 hidden group-hover:block z-10">
              <button
                onClick={() => exportPropertiesToCSV(properties)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
              >
                Export to CSV
              </button>
              <button
                onClick={() => exportPropertiesToGoogleSheets(properties)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
              >
                Export to Google Sheets
              </button>
            </div>
          </div>

          <Button variant="secondary" size="sm" onClick={() => setIsImportModalOpen(true)}>
            <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
            Import
          </Button>

          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Property
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
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
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
                    No properties found
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

      {/* Add/Edit Property Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingProperty ? 'Edit Property' : 'Add Property'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Reference"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              required
              placeholder="e.g., R01"
            />
            <div className="flex items-end space-x-2">
              <div className="flex-1">
                <Select
                  label="County"
                  value={formData.county_id}
                  onChange={(e) => setFormData({ ...formData, county_id: e.target.value })}
                  options={counties.map((c) => ({ value: c.id, label: `${c.name}, ${c.state}` }))}
                  placeholder="Select county"
                  required
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsCountyModalOpen(true)}
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as PropertyStatus })
              }
              options={statusOptions}
            />
            <Input
              label="Account/APN"
              value={formData.account_apn}
              onChange={(e) => setFormData({ ...formData, account_apn: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Acreage"
              type="number"
              step="0.01"
              value={formData.acreage}
              onChange={(e) =>
                setFormData({ ...formData, acreage: parseFloat(e.target.value) || 0 })
              }
              required
            />
            <Input
              label="Annual Tax"
              type="number"
              step="0.01"
              value={formData.tax_annual}
              onChange={(e) =>
                setFormData({ ...formData, tax_annual: parseFloat(e.target.value) || 0 })
              }
            />
            <Input
              label="Tax Year"
              type="number"
              value={formData.tax_year}
              onChange={(e) =>
                setFormData({ ...formData, tax_year: parseInt(e.target.value) || 0 })
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="List Price"
              type="number"
              step="0.01"
              value={formData.list_price}
              onChange={(e) =>
                setFormData({ ...formData, list_price: parseFloat(e.target.value) || 0 })
              }
              required
            />
            <Input
              label="50% Price"
              type="number"
              step="0.01"
              value={formData.price_50_percent}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  price_50_percent: parseFloat(e.target.value) || 0
                })
              }
            />
            <Input
              label="20% Price"
              type="number"
              step="0.01"
              value={formData.price_20_percent}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  price_20_percent: parseFloat(e.target.value) || 0
                })
              }
            />
          </div>

          <Input
            label="Listing URL"
            type="url"
            value={formData.listing_url || ''}
            onChange={(e) => setFormData({ ...formData, listing_url: e.target.value })}
            placeholder="https://"
          />

          <Input
            label="County Tax Portal URL"
            type="url"
            value={formData.county_tax_url || ''}
            onChange={(e) => setFormData({ ...formData, county_tax_url: e.target.value })}
            placeholder="https://"
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingProperty ? 'Save Changes' : 'Create Property'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add County Modal */}
      <Modal
        isOpen={isCountyModalOpen}
        onClose={() => setIsCountyModalOpen(false)}
        title="Add County"
        size="sm"
      >
        <form onSubmit={handleCreateCounty} className="space-y-4">
          <Input
            label="County Name"
            value={newCounty.name}
            onChange={(e) => setNewCounty({ ...newCounty, name: e.target.value })}
            required
            placeholder="e.g., Valencia County"
          />
          <Input
            label="State"
            value={newCounty.state}
            onChange={(e) => setNewCounty({ ...newCounty, state: e.target.value })}
            required
            placeholder="e.g., New Mexico"
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCountyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add County</Button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Properties"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Paste CSV data below. Required columns: reference, county, account_apn, acreage,
            list_price. Optional: status, tax_annual, tax_year, price_50_percent, price_20_percent.
          </p>
          <textarea
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            placeholder="reference,county,account_apn,acreage,list_price&#10;R01,Valencia County,12345,5.5,10000"
            className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
          />
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsImportModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!importData.trim()}>
              Import
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
