import { NavLink } from 'react-router-dom'
import {
  HomeIcon,
  MapIcon,
  CurrencyDollarIcon,
  UsersIcon,
  DocumentTextIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

const adminNavItems = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Properties', href: '/admin/properties', icon: MapIcon },
  { name: 'Sales', href: '/admin/sales', icon: CurrencyDollarIcon },
  { name: 'Buyers', href: '/admin/buyers', icon: UsersIcon },
  { name: 'Tax Tracker', href: '/admin/taxes', icon: DocumentTextIcon },
]

const buyerNavItems = [
  { name: 'Dashboard', href: '/buyer', icon: HomeIcon },
  { name: 'My Properties', href: '/buyer/properties', icon: MapIcon },
  { name: 'Payments', href: '/buyer/payments', icon: CurrencyDollarIcon },
]

interface SidebarProps {
  userRole: 'admin' | 'buyer'
}

export function Sidebar({ userRole }: SidebarProps) {
  const navItems = userRole === 'admin' ? adminNavItems : buyerNavItems

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white">
      <div className="flex items-center h-16 px-6 border-b border-gray-800">
        <MapIcon className="h-8 w-8 text-primary-500" />
        <span className="ml-3 text-xl font-bold">Land Manager</span>
      </div>

      <nav className="mt-6 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                end={item.href === '/admin' || item.href === '/buyer'}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-800">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center px-3 py-2.5 rounded-lg transition-colors ${
              isActive
                ? 'bg-primary-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`
          }
        >
          <Cog6ToothIcon className="h-5 w-5 mr-3" />
          Settings
        </NavLink>
      </div>
    </aside>
  )
}
