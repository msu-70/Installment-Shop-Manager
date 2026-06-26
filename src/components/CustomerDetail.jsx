import { useState, useEffect } from 'react'
import { ArrowLeft, Phone, MapPin, CreditCard, ShoppingBag, Plus, Printer, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import PaymentModal from './PaymentModal'
import PaymentSchedule from './PaymentSchedule'

function fmt(n) { return 'Rs. ' + (Number(n) || 0).toLocaleString('en-PK') }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }

export default function CustomerDetail({ customerId, onBack }) {
  const [customer, setCustomer] = useState(null)
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSale, setSelectedSale] = useState(null)
  const [showPayment, setShowPayment] = useState(null)
  const [showSchedule, setShowSchedule] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const c = await window.api.getCustomer(customerId)
      const s = await window.api.getSales(customerId)
      setCustomer(c)
      setSales(s)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [customerId])

  if (loading) return <div className="loading"><div className="spinner" />Loading...</div>
  if (!customer) return <div className="empty-state"><h3>Customer not found</h3></div>

  const totalOwed = sales.filter(s => s.status === 'active').reduce((sum, s) => sum + (s.remaining_balance - (s.total_paid - s.down_payment)), 0)

  return (
    <div>
      <div className="page-header">
        <div className="page-header-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="btn btn-secondary btn-sm" onClick={onBack}><ArrowLeft size={14} /> Back</button>
            <div>
              <h2 className="page-title">{customer.full_name}</h2>
              <p className="page-subtitle">Customer Account Details</p>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Customer Info Card */}
        <div className="card mb-4" style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Phone</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={13} style={{ color: 'var(--accent-primary)' }} />{customer.phone}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>CNIC</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={13} style={{ color: 'var(--accent-primary)' }} />{customer.cnic || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Address</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={13} style={{ color: 'var(--accent-primary)' }} />{customer.address || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Total Balance Due</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: totalOwed > 0 ? 'var(--danger)' : 'var(--success)' }}>{fmt(Math.max(0, totalOwed))}</div>
            </div>
          </div>
        </div>

        {/* Sales / Plans */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><ShoppingBag size={16} />Installment Plans ({sales.length})</span>
          </div>

          {sales.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <ShoppingBag size={32} />
              <h3>No installment plans</h3>
              <p>This customer has no sales on record</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sales.map((sale) => {
                const totalPaidExcl = sale.total_paid - (sale.down_payment || 0)
                const balDue = Math.max(0, sale.remaining_balance - totalPaidExcl)
                const pct = sale.remaining_balance > 0
                  ? Math.min(100, (totalPaidExcl / sale.remaining_balance) * 100)
                  : 100

                return (
                  <div key={sale.id} style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 16,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{sale.product_name}</div>
                        {sale.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{sale.description}</div>}
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Started: {fmtDate(sale.start_date)} · {sale.num_installments} installments</div>
                      </div>
                      <span className={`badge ${sale.status === 'active' ? 'badge-info' : sale.status === 'completed' ? 'badge-success' : 'badge-muted'}`}>
                        {sale.status === 'active' ? <Clock size={10} /> : <CheckCircle size={10} />}
                        {sale.status}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
                      {[
                        ['Total Price', fmt(sale.total_price)],
                        ['Down Payment', fmt(sale.down_payment)],
                        ['Monthly Inst.', fmt(sale.installment_amount)],
                        ['Balance Due', fmt(balDue)],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: label === 'Balance Due' && balDue > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: 5, background: 'var(--border)', borderRadius: 99, marginBottom: 12, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? 'var(--success)' : 'var(--accent-primary)', borderRadius: 99, transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>{pct.toFixed(0)}% collected ({fmt(totalPaidExcl)} of {fmt(sale.remaining_balance)})</div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {sale.status === 'active' && (
                        <button className="btn btn-success btn-sm" onClick={() => setShowPayment(sale)}>
                          <Plus size={13} />Record Payment
                        </button>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={() => setShowSchedule(sale)}>
                        <Printer size={13} />Payment Schedule
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          sale={showPayment}
          customer={customer}
          onClose={() => setShowPayment(null)}
          onSave={() => { setShowPayment(null); load() }}
        />
      )}
      {showSchedule && (
        <PaymentSchedule
          sale={showSchedule}
          customer={customer}
          onClose={() => setShowSchedule(null)}
        />
      )}
    </div>
  )
}
