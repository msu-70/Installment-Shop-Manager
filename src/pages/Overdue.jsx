import { useState, useEffect } from 'react'
import { AlertTriangle, RefreshCw, Phone, Calendar } from 'lucide-react'
import PaymentModal from '../components/PaymentModal'

function fmt(n) { return 'Rs. ' + (Number(n) || 0).toLocaleString('en-PK') }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }

export default function Overdue() {
  const [filter, setFilter] = useState('all')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPayment, setShowPayment] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      let data
      if (filter === 'today') data = await window.api.getTodayInstallments()
      else if (filter === 'week') data = await window.api.getWeekInstallments()
      else data = await window.api.getOverdueInstallments()
      setItems(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  const totalOverdue = items.reduce((s, i) => s + (i.amount - (i.paid_amount || 0)), 0)

  return (
    <div>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h2 className="page-title">Overdue & Pending Tracking</h2>
            <p className="page-subtitle">Monitor overdue installments and pending collections</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={load}><RefreshCw size={14} />Refresh</button>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
          {[
            { label: 'Total Overdue Records', value: items.length, color: 'var(--danger)' },
            { label: 'Total Amount Overdue', value: fmt(totalOverdue), color: 'var(--warning)' },
            { label: 'Unique Customers', value: new Set(items.map(i => i.customer_id)).size, color: 'var(--info)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card" style={{ borderLeft: `3px solid ${color}` }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { key: 'all', label: 'All Overdue' },
            { key: 'today', label: "Today's Due" },
            { key: 'week', label: 'This Week' },
          ].map(f => (
            <button key={f.key} className={`filter-tab ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" />Loading...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <AlertTriangle size={48} />
            <h3>No overdue installments</h3>
            <p>{filter === 'today' ? 'No dues today!' : filter === 'week' ? 'No dues this week!' : 'All accounts are up to date!'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Product</th>
                  <th>Inst. #</th>
                  <th>Due Date</th>
                  <th>Amount Due</th>
                  <th>Days Overdue</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const daysOverdue = item.days_overdue != null ? Math.floor(item.days_overdue) : 0
                  const amtDue = item.amount - (item.paid_amount || 0)
                  return (
                    <tr key={item.id} className={daysOverdue > 0 ? 'row-overdue' : ''}>
                      <td style={{ fontWeight: 600 }}>{item.customer_name}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                          <Phone size={11} style={{ color: 'var(--text-muted)' }} />{item.phone}
                        </span>
                      </td>
                      <td>{item.product_name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>#{item.installment_number}</td>
                      <td style={{ fontWeight: 600 }}>{fmtDate(item.due_date)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{fmt(amtDue)}</td>
                      <td>
                        {daysOverdue > 0 ? (
                          <span className="badge badge-danger">
                            <AlertTriangle size={10} />{daysOverdue}d overdue
                          </span>
                        ) : (
                          <span className="badge badge-warning">
                            <Calendar size={10} />Due today
                          </span>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-sm btn-success"
                          onClick={async () => {
                            const sales = await window.api.getSales(item.customer_id)
                            const sale = sales.find(s => s.id === item.sale_id)
                            const customer = { id: item.customer_id, full_name: item.customer_name, phone: item.phone }
                            if (sale) setShowPayment({ sale, customer })
                          }}>
                          Collect
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPayment && (
        <PaymentModal
          sale={showPayment.sale}
          customer={showPayment.customer}
          onClose={() => setShowPayment(null)}
          onSave={() => { setShowPayment(null); load() }}
        />
      )}
    </div>
  )
}
