import { useState, useEffect } from 'react'
import {
  LayoutDashboard, TrendingUp, DollarSign, AlertTriangle,
  Calendar, RefreshCw, ArrowRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function fmt(n) {
  return 'Rs. ' + (Number(n) || 0).toLocaleString('en-PK', { minimumFractionDigits: 0 })
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const data = await window.api.getDashboardStats()
      setStats(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div>
      <div className="page-header">
        <div className="page-header-top">
          <div><h2 className="page-title">Dashboard</h2><p className="page-subtitle">Overview of your shop's installment activity</p></div>
        </div>
      </div>
      <div className="loading"><div className="spinner" />Loading...</div>
    </div>
  )

  const cards = [
    {
      label: 'Active Plans',
      value: stats?.activePlans ?? 0,
      icon: LayoutDashboard,
      iconClass: 'purple',
      cardClass: '',
      format: (v) => v,
    },
    {
      label: 'Collected This Month',
      value: stats?.monthlyCollected ?? 0,
      icon: TrendingUp,
      iconClass: 'green',
      cardClass: 'success',
      format: fmt,
    },
    {
      label: 'Total Pending',
      value: stats?.totalPending ?? 0,
      icon: DollarSign,
      iconClass: 'yellow',
      cardClass: 'warning',
      format: fmt,
    },
    {
      label: 'Overdue Accounts',
      value: stats?.overdueCount ?? 0,
      icon: AlertTriangle,
      iconClass: 'red',
      cardClass: 'danger',
      format: (v) => v,
    },
    {
      label: "Today's Expected",
      value: stats?.todayExpected ?? 0,
      icon: Calendar,
      iconClass: 'blue',
      cardClass: 'info',
      format: fmt,
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h2 className="page-title">Dashboard</h2>
            <p className="page-subtitle">Overview of your shop's installment activity</p>
          </div>
          <button className="btn btn-secondary" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Stats Grid */}
        <div className="stats-grid">
          {cards.map((card) => (
            <div key={card.label} className={`stat-card ${card.cardClass}`}>
              <div className={`stat-icon ${card.iconClass}`}>
                <card.icon size={20} />
              </div>
              <div className="stat-value">{card.format(card.value)}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Recent Payments */}
          <div className="card">
            <div className="card-header">
              <span className="card-title"><TrendingUp size={16} />Recent Collections</span>
              <button className="btn btn-sm btn-secondary" onClick={() => navigate('/payments')}>
                View All <ArrowRight size={12} />
              </button>
            </div>
            {stats?.recentPayments?.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <p>No payments recorded yet</p>
              </div>
            ) : (
              <div>
                {stats?.recentPayments?.map((p) => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0', borderBottom: '1px solid var(--border-light)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.customer_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.product_name} · {p.payment_date}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: 14 }}>{fmt(p.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <span className="card-title"><LayoutDashboard size={16} />Quick Actions</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Add New Customer', path: '/customers', color: 'var(--accent-primary)' },
                { label: 'Create New Sale', path: '/sales', color: 'var(--success)' },
                { label: 'Record a Payment', path: '/payments', color: 'var(--info)' },
                { label: 'View Overdue Accounts', path: '/overdue', color: 'var(--danger)' },
                { label: 'Generate Reports', path: '/reports', color: 'var(--warning)' },
              ].map((action) => (
                <button
                  key={action.path}
                  className="btn btn-secondary w-full"
                  style={{ justifyContent: 'space-between', borderLeft: `3px solid ${action.color}` }}
                  onClick={() => navigate(action.path)}
                >
                  {action.label}
                  <ArrowRight size={14} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
