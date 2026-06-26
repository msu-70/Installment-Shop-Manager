import { useState, useEffect } from 'react'
import { ShoppingBag, Plus, Search, Eye, Trash2, X, Users, Calendar, CheckCircle, Clock, Printer } from 'lucide-react'
import PaymentSchedule from '../components/PaymentSchedule'

function fmt(n) { return 'Rs. ' + (Number(n) || 0).toLocaleString('en-PK') }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }

function NewSaleModal({ onClose, onSave }) {
  const [customers, setCustomers] = useState([])
  const [form, setForm] = useState({
    customer_id: '',
    product_name: '',
    description: '',
    total_price: '',
    down_payment: '0',
    num_installments: '12',
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    window.api.getCustomers('').then(setCustomers)
  }, [])

  const totalPrice = parseFloat(form.total_price) || 0
  const downPayment = parseFloat(form.down_payment) || 0
  const remaining = Math.max(0, totalPrice - downPayment)
  const numInst = parseInt(form.num_installments) || 1
  const instAmount = numInst > 0 ? remaining / numInst : 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.customer_id) { setError('Please select a customer'); return }
    if (!form.product_name.trim()) { setError('Product name is required'); return }
    if (!totalPrice || totalPrice <= 0) { setError('Enter a valid total price'); return }
    if (downPayment > totalPrice) { setError('Down payment cannot exceed total price'); return }
    setSaving(true)
    try {
      await window.api.addSale({
        customer_id: parseInt(form.customer_id),
        product_name: form.product_name,
        description: form.description,
        total_price: totalPrice,
        down_payment: downPayment,
        remaining_balance: remaining,
        num_installments: numInst,
        installment_amount: instAmount,
        start_date: form.start_date,
        notes: form.notes,
      })
      onSave()
    } catch (err) {
      setError(err.message || 'Failed to create sale')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-xl">
        <div className="modal-header">
          <div className="modal-title"><ShoppingBag size={18} />New Installment Sale</div>
          <button className="btn btn-icon btn-secondary btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Left Column */}
              <div>
                <div className="form-group">
                  <label>Customer *</label>
                  <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}>
                    <option value="">-- Select Customer --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.phone}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Product Name *</label>
                  <input value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })}
                    placeholder="e.g. Samsung TV 43-inch" autoFocus />
                </div>
                <div className="form-group">
                  <label>Product Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Model, color, serial number, specs..." rows={2} />
                </div>
                <div className="form-group">
                  <label>Start Date *</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Notes / Guarantor Info</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="Guarantor name, address, contact or any notes..." rows={2} />
                </div>
              </div>

              {/* Right Column - Financial */}
              <div>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Financial Summary</div>

                  <div className="form-group">
                    <label>Total Price (Rs.) *</label>
                    <input type="number" value={form.total_price} onChange={e => setForm({ ...form, total_price: e.target.value })}
                      placeholder="0.00" min="0" step="0.01" />
                  </div>
                  <div className="form-group">
                    <label>Down Payment (Rs.)</label>
                    <input type="number" value={form.down_payment} onChange={e => setForm({ ...form, down_payment: e.target.value })}
                      placeholder="0.00" min="0" step="0.01" />
                  </div>
                  <div className="form-group">
                    <label>Number of Installments</label>
                    <select value={form.num_installments} onChange={e => setForm({ ...form, num_installments: e.target.value })}>
                      {[3,6,9,12,18,24,36,48].map(n => <option key={n} value={n}>{n} months</option>)}
                    </select>
                  </div>
                </div>

                {/* Auto-calculated summary */}
                <div style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 12, color: '#818cf8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Auto-Calculated</div>
                  {[
                    ['Total Price', fmt(totalPrice)],
                    ['Down Payment', fmt(downPayment)],
                    ['Remaining Balance', fmt(remaining)],
                    ['Installments', `${numInst} months`],
                    ['Monthly Installment', fmt(instAmount)],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(79,70,229,0.1)' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{k}</span>
                      <span style={{ fontWeight: 700, color: k === 'Monthly Installment' ? '#818cf8' : 'var(--text-primary)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Installment Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Sales() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showSchedule, setShowSchedule] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await window.api.getSales(null)
      setSales(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = sales.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.customer_name?.toLowerCase().includes(q) || s.product_name?.toLowerCase().includes(q)
    const matchFilter = filter === 'all' || s.status === filter
    return matchSearch && matchFilter
  })

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete sale "${s.product_name}" for ${s.customer_name}? This cannot be undone.`)) return
    await window.api.deleteSale(s.id)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h2 className="page-title">Sales & Installment Plans</h2>
            <p className="page-subtitle">{sales.filter(s => s.status === 'active').length} active plans</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            <Plus size={15} />New Sale
          </button>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1 }}>
            <Search size={15} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer or product..." />
          </div>
          <div className="filter-tabs">
            {['all', 'active', 'completed'].map(f => (
              <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'all' && ` (${sales.filter(s => s.status === f).length})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" />Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <ShoppingBag size={48} />
            <h3>No sales found</h3>
            <p>{search ? 'Try a different search' : 'Create your first installment sale'}</p>
            {!search && <button className="btn btn-primary mt-4" onClick={() => setShowNew(true)}><Plus size={15} />New Sale</button>}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Total Price</th>
                  <th>Down Pmt</th>
                  <th>Monthly</th>
                  <th>Collected</th>
                  <th>Start Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.customer_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.customer_phone}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.product_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.num_installments} months</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{fmt(s.total_price)}</td>
                    <td>{fmt(s.down_payment)}</td>
                    <td>{fmt(s.installment_amount)}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(s.total_paid)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{fmtDate(s.start_date)}</td>
                    <td>
                      <span className={`badge ${s.status === 'active' ? 'badge-info' : s.status === 'completed' ? 'badge-success' : 'badge-muted'}`}>
                        {s.status === 'active' ? <Clock size={10} /> : <CheckCircle size={10} />}
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-sm btn-secondary" title="Payment Schedule"
                          onClick={async () => {
                            const fullSale = await window.api.getSale(s.id)
                            const cust = await window.api.getCustomer(s.customer_id)
                            setShowSchedule({ sale: fullSale || s, customer: cust })
                          }}>
                          <Printer size={13} />
                        </button>
                        <button className="btn btn-sm btn-danger" title="Delete" onClick={() => handleDelete(s)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && <NewSaleModal onClose={() => setShowNew(false)} onSave={() => { setShowNew(false); load() }} />}
      {showSchedule && (
        <PaymentSchedule
          sale={showSchedule.sale}
          customer={showSchedule.customer}
          onClose={() => setShowSchedule(null)}
        />
      )}
    </div>
  )
}
