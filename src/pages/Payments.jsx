import { useState, useEffect } from 'react'
import { CreditCard, Plus, Search, Printer, ChevronDown } from 'lucide-react'
import PaymentModal from '../components/PaymentModal'

function fmt(n) { return 'Rs. ' + (Number(n) || 0).toLocaleString('en-PK') }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }

export default function Payments() {
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [sales, setSales] = useState([])
  const [selectedSale, setSelectedSale] = useState(null)
  const [payments, setPayments] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPayment, setShowPayment] = useState(null)
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0])
  const [dailyPayments, setDailyPayments] = useState([])
  const [activeTab, setActiveTab] = useState('collect')

  useEffect(() => {
    window.api.getCustomers('').then(setCustomers)
    loadDailyPayments(dailyDate)
  }, [])

  const loadDailyPayments = async (date) => {
    const data = await window.api.getRecentPayments(date)
    setDailyPayments(data)
  }

  const handleCustomerSelect = async (customerId) => {
    if (!customerId) { setSelectedCustomer(null); setSales([]); setSelectedSale(null); setPayments([]); return }
    const c = customers.find(c => c.id === parseInt(customerId))
    setSelectedCustomer(c)
    const s = await window.api.getSales(parseInt(customerId))
    setSales(s.filter(s => s.status === 'active'))
    setSelectedSale(null)
    setPayments([])
  }

  const handleSaleSelect = async (saleId) => {
    if (!saleId) { setSelectedSale(null); setPayments([]); return }
    const s = sales.find(s => s.id === parseInt(saleId))
    setSelectedSale(s)
    const p = await window.api.getPayments(parseInt(saleId))
    setPayments(p)
  }

  const filteredCustomers = customers.filter(c => {
    const q = search.toLowerCase()
    return !q || c.full_name.toLowerCase().includes(q) || c.phone.includes(q)
  })

  return (
    <div>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h2 className="page-title">Payment Collection</h2>
            <p className="page-subtitle">Record installment payments and view payment history</p>
          </div>
        </div>
        <div className="tabs">
          <button className={`tab-btn ${activeTab === 'collect' ? 'active' : ''}`} onClick={() => setActiveTab('collect')}>Collect Payment</button>
          <button className={`tab-btn ${activeTab === 'daily' ? 'active' : ''}`} onClick={() => setActiveTab('daily')}>Daily Collections</button>
        </div>
      </div>

      <div className="page-body">
        {activeTab === 'collect' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
            {/* Customer selector panel */}
            <div className="card" style={{ height: 'fit-content' }}>
              <div className="card-header">
                <span className="card-title" style={{ fontSize: 13 }}>Select Customer</span>
              </div>
              <div className="search-bar" style={{ marginBottom: 10 }}>
                <Search size={14} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ fontSize: 13 }} />
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {filteredCustomers.map(c => (
                  <button key={c.id}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '9px 10px',
                      background: selectedCustomer?.id === c.id ? 'rgba(79,70,229,0.12)' : 'none',
                      border: 'none', borderRadius: 6, cursor: 'pointer',
                      color: selectedCustomer?.id === c.id ? '#818cf8' : 'var(--text-primary)',
                      marginBottom: 2, fontFamily: 'var(--font)',
                    }}
                    onClick={() => handleCustomerSelect(c.id)}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.full_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.phone}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right panel */}
            <div>
              {!selectedCustomer ? (
                <div className="empty-state">
                  <CreditCard size={48} />
                  <h3>Select a customer</h3>
                  <p>Choose a customer from the left to record their payment</p>
                </div>
              ) : (
                <div>
                  {/* Sale selector */}
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 10 }}>{selectedCustomer.full_name}</div>
                    {sales.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active installment plans for this customer.</div>
                    ) : (
                      <div>
                        <label>Select Installment Plan</label>
                        <select onChange={e => handleSaleSelect(e.target.value)} defaultValue="">
                          <option value="">-- Select a plan --</option>
                          {sales.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.product_name} — Balance: Rs. {(s.remaining_balance - (s.total_paid - s.down_payment)).toLocaleString()}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {selectedSale && (
                    <div>
                      {/* Sale details */}
                      <div className="card" style={{ marginBottom: 16 }}>
                        <div className="card-header">
                          <span className="card-title" style={{ fontSize: 13 }}>{selectedSale.product_name}</span>
                          <button className="btn btn-primary btn-sm" onClick={() => setShowPayment(selectedSale)}>
                            <Plus size={13} />Record Payment
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                          {[
                            ['Monthly Inst.', fmt(selectedSale.installment_amount)],
                            ['Total Collected', fmt(selectedSale.total_paid)],
                            ['Balance Due', fmt(Math.max(0, selectedSale.remaining_balance - (selectedSale.total_paid - selectedSale.down_payment)))],
                            ['Installments', `${selectedSale.num_installments} months`],
                          ].map(([k, v]) => (
                            <div key={k} style={{ background: 'var(--bg-tertiary)', padding: 10, borderRadius: 8 }}>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{k}</div>
                              <div style={{ fontWeight: 700, fontSize: 15 }}>{v}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Payment history */}
                      <div className="card">
                        <div className="card-header">
                          <span className="card-title" style={{ fontSize: 13 }}>Payment History</span>
                        </div>
                        {payments.length === 0 ? (
                          <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>No payments recorded yet</div>
                        ) : (
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Receipt #</th>
                                  <th>Date</th>
                                  <th>Amount</th>
                                  <th>Method</th>
                                  <th>Notes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {payments.map(p => (
                                  <tr key={p.id}>
                                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{p.receipt_number}</td>
                                    <td>{fmtDate(p.payment_date)}</td>
                                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt(p.amount)}</td>
                                    <td><span className="badge badge-muted">{p.payment_method}</span></td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{p.notes || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Daily Collections Tab */
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label>Select Date</label>
                  <input type="date" value={dailyDate}
                    onChange={e => { setDailyDate(e.target.value); loadDailyPayments(e.target.value) }} />
                </div>
                <div style={{ marginTop: 20 }}>
                  <button className="btn btn-secondary" onClick={() => window.api.printContent()}>
                    <Printer size={14} />Print Report
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  Collections for {fmtDate(dailyDate)}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                  Total: {fmt(dailyPayments.reduce((s, p) => s + p.amount, 0))}
                </span>
              </div>
              {dailyPayments.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <p>No payments collected on this date</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Receipt #</th>
                        <th>Customer</th>
                        <th>Product</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyPayments.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{p.receipt_number}</td>
                          <td style={{ fontWeight: 600 }}>{p.customer_name}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{p.product_name}</td>
                          <td style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt(p.amount)}</td>
                          <td><span className="badge badge-muted">{p.payment_method}</span></td>
                          <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--bg-tertiary)' }}>
                        <td colSpan={3} style={{ fontWeight: 700, padding: '10px 14px' }}>TOTAL ({dailyPayments.length} payments)</td>
                        <td style={{ fontWeight: 800, color: 'var(--success)', fontSize: 15 }}>
                          {fmt(dailyPayments.reduce((s, p) => s + p.amount, 0))}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showPayment && selectedCustomer && (
        <PaymentModal
          sale={showPayment}
          customer={selectedCustomer}
          onClose={() => setShowPayment(null)}
          onSave={async () => {
            setShowPayment(null)
            const s = await window.api.getSales(selectedCustomer.id)
            setSales(s.filter(s => s.status === 'active'))
            if (selectedSale) {
              const updated = s.find(x => x.id === selectedSale.id)
              setSelectedSale(updated || null)
              if (updated) {
                const p = await window.api.getPayments(selectedSale.id)
                setPayments(p)
              }
            }
          }}
        />
      )}
    </div>
  )
}
