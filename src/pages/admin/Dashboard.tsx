import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { Card, StatCard } from '@/components/ui'
import { getDashboardStats, getSales, getPendingPayments } from '@/lib/supabase'
import { formatCurrency } from '@/lib/calculations'
import type { DashboardStats, Sale, Payment } from '@/types'
import {
  MapIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { format } from 'date-fns'

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#6b7280']

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statsData, salesData, paymentsData] = await Promise.all([
        getDashboardStats(),
        getSales(),
        getPendingPayments()
      ])
      setStats(statsData)
      setRecentSales(salesData.slice(0, 5))
      setPendingPayments(paymentsData.slice(0, 5))
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const propertyChartData = stats
    ? [
        { name: 'Available', value: stats.availableProperties },
        { name: 'Sold', value: stats.soldProperties },
        { name: 'Pending', value: stats.pendingProperties },
        {
          name: 'Not For Sale',
          value:
            stats.totalProperties -
            stats.availableProperties -
            stats.soldProperties -
            stats.pendingProperties
        }
      ]
    : []

  if (loading) {
    return (
      <Layout title="Dashboard" userRole="admin">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Dashboard" userRole="admin">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Properties"
          value={stats?.totalProperties || 0}
          icon={<MapIcon className="h-6 w-6 text-primary-600" />}
        />
        <StatCard
          title="Active Sales"
          value={stats?.activeSales || 0}
          icon={<CurrencyDollarIcon className="h-6 w-6 text-primary-600" />}
        />
        <StatCard
          title="Total Buyers"
          value={stats?.totalBuyers || 0}
          icon={<UsersIcon className="h-6 w-6 text-primary-600" />}
        />
        <StatCard
          title="Outstanding Payments"
          value={formatCurrency(stats?.outstandingPayments || 0)}
          icon={<ClockIcon className="h-6 w-6 text-primary-600" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Property Status
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={propertyChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {propertyChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue Overview
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Total Revenue', value: stats?.totalRevenue || 0 },
                  { name: 'Outstanding', value: stats?.outstandingPayments || 0 }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Sales</h3>
            <Link
              to="/admin/sales"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              View all
            </Link>
          </div>
          {recentSales.length === 0 ? (
            <p className="text-gray-500 text-sm">No sales yet</p>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <Link
                  key={sale.id}
                  to={`/admin/sales/${sale.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {sale.property?.reference}
                    </p>
                    <p className="text-sm text-gray-500">
                      {sale.buyer?.full_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(sale.sale_price)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(sale.sale_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Upcoming Payments
            </h3>
            <Link
              to="/admin/sales"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              View all
            </Link>
          </div>
          {pendingPayments.length === 0 ? (
            <p className="text-gray-500 text-sm">No pending payments</p>
          ) : (
            <div className="space-y-3">
              {pendingPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      Payment #{payment.payment_number}
                    </p>
                    <p className="text-sm text-gray-500">
                      Due: {format(new Date(payment.due_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(payment.amount_due)}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        payment.status === 'late'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  )
}
