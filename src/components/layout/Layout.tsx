import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface LayoutProps {
  children: ReactNode
  title: string
  userRole: 'admin' | 'buyer'
}

export function Layout({ children, title, userRole }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar userRole={userRole} />

      <div className="ml-64">
        <Header title={title} />

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
