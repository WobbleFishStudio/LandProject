import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { Button, Card, PropertyStatusBadge, TaxStatusBadge, Select } from '@/components/ui'
import { getProperty, updateProperty, getTaxPaymentsByProperty, createTaxPayment, updateTaxPayment } from '@/lib/supabase'
import { formatCurrency } from '@/lib/calculations'
import type { Property, TaxPayment, PropertyStatus } from '@/types'
import {
  ArrowLeftIcon,
  PencilIcon,
  LinkIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

const statusOptions = [
  { value: 'available', label: 'Available' },
  { value: 'sold', label: 'Sold' },
  { value: 'pending', label: 'Pending' },
  { value: 'not_for_sale', label: 'Not For Sale' }
]

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [property, setProperty] = useState<Property | null>(null)
  const [taxPayments, setTaxPayments] = useState<TaxPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedStatus, setEditedStatus] = useState<PropertyStatus>('available')

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    try {
      const [propertyData, taxData] = await Promise.all([
        getProperty(id!),
        getTaxPaymentsByProperty(id!)
      ])
      setProperty(propertyData)
      if (propertyData) setEditedStatus(propertyData.status)
      setTaxPayments(taxData)
    } catch (error) {
      console.error('Error loading property:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async () => {
    if (!property) return
    try {
      await updateProperty(property.id, { status: editedStatus })
      setProperty({ ...property, status: editedStatus })
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleMarkTaxPaid = async (taxPayment: TaxPayment) => {
    try {
      await updateTaxPayment(taxPayment.id, {
        status: 'paid',
        paid_date: new Date().toISOString().split('T')[0]
      })
      loadData()
    } catch (error) {
      console.error('Error updating tax payment:', error)
    }
  }

  const handleAddTaxPayment = async () => {
    if (!property) return
    const year = prompt('Enter tax year:', new Date().getFullYear().toString())
    if (!year) return

    try {
      await createTaxPayment({
        property_id: property.id,
        tax_year: parseInt(year),
        amount: property.tax_annual,
        due_date: `${year}-12-31`
      })
      loadData()
    } catch (error) {
      console.error('Error creating tax payment:', error)
    }
  }

  if (loading) {
    return (
      <Layout title="Property Details" userRole="admin">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </Layout>
    )
  }

  if (!property) {
    return (
      <Layout title="Property Details" userRole="admin">
        <div className="text-center py-12">
          <p className="text-gray-500">Property not found</p>
          <Button variant="secondary" className="mt-4" onClick={() => navigate('/admin/properties')}>
            Back to Properties
          </Button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={`Property ${property.reference}`} userRole="admin">
      <div className="mb-6">
        <Link
          to="/admin/properties"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Properties
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Property Information</h2>
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <>
                    <Select
                      value={editedStatus}
                      onChange={(e) => setEditedStatus(e.target.value as PropertyStatus)}
                      options={statusOptions}
                    />
                    <Button size="sm" onClick={handleStatusChange}>Save</Button>
                    <Button size="sm" variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <PropertyStatusBadge status={property.status} />
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 text-gray-400 hover:text-primary-600"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Reference</dt>
                <dd className="text-lg font-medium text-gray-900">{property.reference}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">County</dt>
                <dd className="text-lg font-medium text-gray-900">
                  {property.county?.name}, {property.county?.state}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Account/APN</dt>
                <dd className="text-lg font-medium text-gray-900">{property.account_apn}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Acreage</dt>
                <dd className="text-lg font-medium text-gray-900">{property.acreage} acres</dd>
              </div>
            </dl>

            {property.description && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <dt className="text-sm text-gray-500 mb-1">Description</dt>
                <dd className="text-gray-900">{property.description}</dd>
              </div>
            )}

            {property.legal_summary && (
              <div className="mt-4">
                <dt className="text-sm text-gray-500 mb-1">Legal Summary</dt>
                <dd className="text-gray-900 text-sm">{property.legal_summary}</dd>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200 flex flex-wrap gap-3">
              {property.listing_url && (
                <a
                  href={property.listing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
                >
                  <LinkIcon className="h-4 w-4 mr-1" />
                  View Listing
                </a>
              )}
              {property.county_tax_url && (
                <a
                  href={property.county_tax_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
                >
                  <DocumentTextIcon className="h-4 w-4 mr-1" />
                  Pay Property Tax
                </a>
              )}
            </div>
          </Card>

          {/* Tax Payments */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Tax Payments</h2>
              <Button size="sm" variant="secondary" onClick={handleAddTaxPayment}>
                Add Tax Year
              </Button>
            </div>

            {taxPayments.length === 0 ? (
              <p className="text-gray-500 text-sm">No tax payments recorded</p>
            ) : (
              <div className="space-y-3">
                {taxPayments.map((tax) => (
                  <div
                    key={tax.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{tax.tax_year}</p>
                      <p className="text-sm text-gray-500">
                        Due: {format(new Date(tax.due_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900">
                        {formatCurrency(tax.amount)}
                      </span>
                      <TaxStatusBadge status={tax.status} />
                      {tax.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleMarkTaxPaid(tax)}
                        >
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Pricing Sidebar */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-gray-500">List Price</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {formatCurrency(property.list_price)}
                </dd>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <dt className="text-sm text-gray-500">50% Down Price</dt>
                <dd className="text-xl font-semibold text-gray-900">
                  {formatCurrency(property.price_50_percent)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">20% Down Price</dt>
                <dd className="text-xl font-semibold text-gray-900">
                  {formatCurrency(property.price_20_percent)}
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Taxes</h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Annual Tax</dt>
                <dd className="font-medium text-gray-900">
                  {formatCurrency(property.tax_annual)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Tax Year</dt>
                <dd className="font-medium text-gray-900">{property.tax_year}</dd>
              </div>
            </dl>
          </Card>

          {property.status === 'available' && (
            <Link to={`/admin/sales?property=${property.id}`}>
              <Button className="w-full">Create Sale</Button>
            </Link>
          )}
        </div>
      </div>
    </Layout>
  )
}
