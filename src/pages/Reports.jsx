import { useState, useEffect } from 'react'
import { FileText, Printer, Search, Calendar, Users, AlertTriangle } from 'lucide-react'

function fmt(n) { return 'Rs. ' + (Number(n) || 0).toLocaleString('en-PK') }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }

function CustomerStatement() {
  const [customers, setCustomers] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { window.api.getCustomers('').then(setCustomers) }, [])

  const load = async () => {
    if (!selectedId) return
    setLoading(true)
    try {
      const result = await window.api.getCustomerStatement(parseInt(selectedId))
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label>Select Customer</label>
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">-- Choose Customer --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.phone}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={load} disabled={!selectedId}>
            <Search size={14} />Generate
          </button>
          {data && (
            <button className="btn btn-secondary" onClick={() => window.api.printContent()}>
              <Printer size={14} />Print
            </button>
          )}
        </div>
      </div>

      {loading && <div className="loading"><div className="spinner" />Loading...</div>}

      {data && (
        <div id="statement-print">
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="print-header">
              <h1>Hanan Installments</h1>
              <p>Haq Palaza Mulhal Mughlan | Phone: 03105589669</p>
              <h2 style={{ marginTop: '15px' }}>CUSTOMER ACCOUNT STATEMENT</h2>
            </div>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 14 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800 }}>{data.customer.full_name}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 10 }}>
                <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Phone: </span>{data.customer.phone}</div>
                <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>CNIC: </span>{data.customer.cnic || '—'}</div>
                <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Address: </span>{data.customer.address || '—'}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                ['Total Plans', data.sales.length],
                ['Total Business', fmt(data.sales.reduce((s, x) => s + x.total_price, 0))],
                ['Total Collected', fmt(data.sales.reduce((s, x) => s + x.total_paid, 0))],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{k}</div>
                  <div style={{ fontWeight: 800, fontSize: 18, marginTop: 4 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {data.sales.map(sale => (
            <div key={sale.id} className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{sale.product_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(sale.start_date)} · {sale.num_installments} months · {fmt(sale.installment_amount)}/month</div>
                </div>
                <span className={`badge ${sale.status === 'active' ? 'badge-info' : 'badge-success'}`}>{sale.status}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                {[
                  ['Total Price', fmt(sale.total_price)],
                  ['Down Payment', fmt(sale.down_payment)],
                  ['Total Paid', fmt(sale.total_paid)],
                  ['Balance', fmt(Math.max(0, sale.remaining_balance - (sale.total_paid - sale.down_payment)))],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--bg-tertiary)', padding: 10, borderRadius: 6 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{k}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>

              {sale.payments?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Payment History</div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th><th>Amount</th><th>Method</th><th>Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sale.payments.map(p => (
                          <tr key={p.id}>
                            <td>{fmtDate(p.payment_date)}</td>
                            <td style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt(p.amount)}</td>
                            <td><span className="badge badge-muted">{p.payment_method}</span></td>
                            <td style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.receipt_number}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DailyReport() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const result = await window.api.getDailyReport(date)
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label>Report Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={load}><Search size={14} />Load</button>
          {data && <button className="btn btn-secondary" onClick={() => window.api.printContent()}><Printer size={14} />Print</button>}
        </div>
      </div>

      {loading && <div className="loading"><div className="spinner" />Loading...</div>}

      {data && (
        <div className="card" id="daily-print">
          <div className="print-header">
            <h1>Hanan Installments</h1>
            <p>Haq Palaza Mulhal Mughlan | Phone: 03105589669</p>
            <h2 style={{ marginTop: '15px' }}>DAILY COLLECTION REPORT</h2>
            <p>Date: {fmtDate(data.date)}</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Collected</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--success)' }}>{fmt(data.total)}</div>
            </div>
          </div>

          {data.payments.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}><p>No payments on this date</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Customer</th><th>Phone</th><th>Product</th><th>Amount</th><th>Method</th><th>Receipt</th></tr>
                </thead>
                <tbody>
                  {data.payments.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{p.customer_name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{p.phone}</td>
                      <td>{p.product_name}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt(p.amount)}</td>
                      <td><span className="badge badge-muted">{p.payment_method}</span></td>
                      <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{p.receipt_number}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg-tertiary)' }}>
                    <td colSpan={4} style={{ fontWeight: 700, padding: '10px 14px' }}>TOTAL ({data.payments.length} payments)</td>
                    <td style={{ fontWeight: 800, color: 'var(--success)', fontSize: 15 }}>{fmt(data.total)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OverdueReport() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const result = await window.api.getOverdueReport()
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const totalOverdue = data?.reduce((s, r) => s + r.overdue_amount, 0) || 0

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>All customers with outstanding overdue installments</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={load}><Search size={13} />Refresh</button>
            {data && <button className="btn btn-secondary btn-sm" onClick={() => window.api.printContent()}><Printer size={13} />Print</button>}
          </div>
        </div>
      </div>

      {loading && <div className="loading"><div className="spinner" />Loading...</div>}

      {data && (
        <div className="card" id="overdue-print">
          <div className="print-header">
            <h1>Hanan Installments</h1>
            <p>Haq Palaza Mulhal Mughlan | Phone: 03105589669</p>
            <h2 style={{ marginTop: '15px' }}>OVERDUE ACCOUNTS REPORT</h2>
            <p>Generated: {fmtDate(new Date().toISOString().split('T')[0])}</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <div style={{ fontWeight: 800, color: 'var(--danger)', fontSize: 18 }}>Total Overdue: {fmt(totalOverdue)}</div>
          </div>
          {data.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}><p>No overdue accounts 🎉</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Customer</th><th>Phone</th><th>CNIC</th><th>Product</th>
                    <th>Overdue Inst.</th><th>Overdue Amount</th><th>Earliest Due</th><th>Max Days</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r, i) => (
                    <tr key={`${r.sale_id}`} className="row-overdue">
                      <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{r.full_name}</td>
                      <td>{r.phone}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{r.cnic || '—'}</td>
                      <td>{r.product_name}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-danger">{r.overdue_count}</span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{fmt(r.overdue_amount)}</td>
                      <td style={{ fontWeight: 600 }}>{fmtDate(r.earliest_due)}</td>
                      <td>
                        <span className="badge badge-danger">
                          <AlertTriangle size={10} />{Math.floor(r.max_days_overdue)}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg-tertiary)' }}>
                    <td colSpan={5} style={{ fontWeight: 700, padding: '10px 14px' }}>TOTAL ({data.length} accounts)</td>
                    <td style={{ fontWeight: 700, textAlign: 'center' }}>{data.reduce((s, r) => s + r.overdue_count, 0)}</td>
                    <td style={{ fontWeight: 800, color: 'var(--danger)', fontSize: 14 }}>{fmt(totalOverdue)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState('statement')

  const tabs = [
    { key: 'statement', label: 'Customer Statement', icon: Users },
    { key: 'daily', label: 'Daily Collections', icon: Calendar },
    { key: 'overdue', label: 'Overdue Report', icon: AlertTriangle },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h2 className="page-title">Reports</h2>
            <p className="page-subtitle">Generate and print detailed reports</p>
          </div>
        </div>
        <div className="tabs">
          {tabs.map(t => (
            <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}>
              <t.icon size={14} style={{ marginRight: 4 }} />{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body">
        {activeTab === 'statement' && <CustomerStatement />}
        {activeTab === 'daily' && <DailyReport />}
        {activeTab === 'overdue' && <OverdueReport />}
      </div>
    </div>
  )
}
