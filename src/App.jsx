import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, ShoppingBag, CreditCard,
  AlertTriangle, FileText, ChevronRight, Store
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Sales from './pages/Sales'
import Payments from './pages/Payments'
import Overdue from './pages/Overdue'
import Reports from './pages/Reports'

function Sidebar({ overdueCount }) {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/sales', icon: ShoppingBag, label: 'Sales & Plans' },
    { to: '/payments', icon: CreditCard, label: 'Payments' },
    { to: '/overdue', icon: AlertTriangle, label: 'Overdue', badge: overdueCount > 0 ? overdueCount : null },
    { to: '/reports', icon: FileText, label: 'Reports' },
  ]

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Store size={20} color="white" />
        </div>
        <div>
          <h1>Installment<br />Manager</h1>
        </div>
      </div>

      <div className="sidebar-nav">
        <div className="nav-section-title">Main Menu</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <item.icon size={17} className="nav-icon" />
            {item.label}
            {item.badge && <span className="nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>}
          </NavLink>
        ))}
      </div>

      <div className="sidebar-footer">
        <div style={{ marginBottom: 4, color: 'var(--text-muted)', fontSize: 10 }}>
          {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Offline · v1.0.0</div>
      </div>
    </nav>
  )
}

function AppContent() {
  const [overdueCount, setOverdueCount] = useState(0)

  useEffect(() => {
    const loadOverdue = async () => {
      try {
        const items = await window.api.getOverdueInstallments()
        const uniqueCustomers = new Set(items.map(i => i.customer_id))
        setOverdueCount(uniqueCustomers.size)
      } catch (e) { /* ignore */ }
    }
    loadOverdue()
    const interval = setInterval(loadOverdue, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="app-layout">
      <Sidebar overdueCount={overdueCount} />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<Customers />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/overdue" element={<Overdue />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  )
}
