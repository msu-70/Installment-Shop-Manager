import { useState, useEffect } from 'react'
import { Users, Plus, Search, Edit2, Trash2, Eye, X, Phone, CreditCard, MapPin, ShoppingBag } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import CustomerDetail from '../components/CustomerDetail'

function AddEditModal({ customer, onClose, onSave }) {
  const [form, setForm] = useState(
    customer || { full_name: '', phone: '', cnic: '', address: '' }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.full_name.trim() || !form.phone.trim()) {
      setError('Name and Phone are required')
      return
    }
    setSaving(true)
    try {
      if (customer?.id) {
        await window.api.updateCustomer(customer.id, form)
      } else {
        await window.api.addCustomer(form)
      }
      onSave()
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-md">
        <div className="modal-header">
          <div className="modal-title"><Users size={18} />{customer?.id ? 'Edit Customer' : 'Add New Customer'}</div>
          <button className="btn btn-icon btn-secondary btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="form-group">
              <label>Full Name *</label>
              <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                placeholder="Enter full name" autoFocus />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Phone Number *</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="03XX-XXXXXXX" />
              </div>
              <div className="form-group">
                <label>CNIC / ID Number</label>
                <input value={form.cnic} onChange={e => setForm({ ...form, cnic: e.target.value })}
                  placeholder="XXXXX-XXXXXXX-X" />
              </div>
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="Full address..." rows={2} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : (customer?.id ? 'Update Customer' : 'Add Customer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewingId, setViewingId] = useState(null)
  const { id } = useParams()
  const navigate = useNavigate()

  const load = async (q = search) => {
    setLoading(true)
    try {
      const data = await window.api.getCustomers(q)
      setCustomers(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (id) setViewingId(parseInt(id))
  }, [id])

  const handleSearch = (e) => {
    setSearch(e.target.value)
    load(e.target.value)
  }

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete customer "${c.full_name}"? This will also delete all their sales and payment records.`)) return
    await window.api.deleteCustomer(c.id)
    load()
  }

  const handleSave = () => {
    setShowAdd(false)
    setEditing(null)
    load()
  }

  if (viewingId) {
    return <CustomerDetail customerId={viewingId} onBack={() => { setViewingId(null); navigate('/customers') }} />
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h2 className="page-title">Customers</h2>
            <p className="page-subtitle">{customers.length} customer{customers.length !== 1 ? 's' : ''} registered</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Add Customer
          </button>
        </div>
      </div>

      <div className="page-body">
        <div style={{ marginBottom: 16 }}>
          <div className="search-bar">
            <Search size={15} />
            <input value={search} onChange={handleSearch} placeholder="Search by name, phone, or CNIC..." />
          </div>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" />Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>{search ? 'No customers found' : 'No customers yet'}</h3>
            <p>{search ? 'Try a different search term' : 'Add your first customer to get started'}</p>
            {!search && <button className="btn btn-primary mt-4" onClick={() => setShowAdd(true)}><Plus size={15} />Add Customer</button>}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer Name</th>
                  <th>Phone</th>
                  <th>CNIC</th>
                  <th>Address</th>
                  <th>Plans</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.full_name}</div>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Phone size={12} style={{ color: 'var(--text-muted)' }} />{c.phone}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.cnic || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address || '—'}</td>
                    <td>
                      <span className={`badge ${c.active_plans > 0 ? 'badge-info' : 'badge-muted'}`}>
                        <ShoppingBag size={10} />{c.active_plans} active / {c.total_plans} total
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-secondary" title="View Details"
                          onClick={() => setViewingId(c.id)}>
                          <Eye size={13} />
                        </button>
                        <button className="btn btn-sm btn-secondary" title="Edit"
                          onClick={() => setEditing(c)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="btn btn-sm btn-danger" title="Delete"
                          onClick={() => handleDelete(c)}>
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

      {(showAdd || editing) && (
        <AddEditModal
          customer={editing}
          onClose={() => { setShowAdd(false); setEditing(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
