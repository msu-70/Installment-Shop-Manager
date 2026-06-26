import { useState } from 'react'
import { X, CreditCard, Printer, CheckCircle } from 'lucide-react'

function fmt(n) { return 'Rs. ' + (Number(n) || 0).toLocaleString('en-PK') }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }

export default function PaymentModal({ sale, customer, onClose, onSave }) {
  const today = new Date().toISOString().split('T')[0]
  const totalPaidExcl = (sale.total_paid || 0) - (sale.down_payment || 0)
  const balanceDue = Math.max(0, sale.remaining_balance - totalPaidExcl)

  const [form, setForm] = useState({
    amount: '',
    payment_date: today,
    payment_method: 'cash',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) { setError('Enter a valid amount'); return }
    if (amount > balanceDue + 1) { setError(`Amount cannot exceed balance due of ${fmt(balanceDue)}`); return }
    setSaving(true)
    try {
      const result = await window.api.addPayment({
        sale_id: sale.id,
        customer_id: customer.id,
        amount,
        payment_date: form.payment_date,
        payment_method: form.payment_method,
        notes: form.notes,
      })
      setReceipt({ 
        ...form, 
        amount, 
        receipt_number: result.receipt_number,
        next_due_date: result.next_due_date,
        next_due_amount: result.next_due_amount
      })
    } catch (err) {
      setError(err.message || 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  if (receipt) {
    const newBalance = Math.max(0, balanceDue - receipt.amount)
    return (
      <div className="modal-overlay">
        <div className="modal modal-md">
          <div className="modal-header">
            <div className="modal-title"><CheckCircle size={18} color="var(--success)" />Payment Recorded</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => window.api.printContent()}><Printer size={13} />Print Receipt</button>
              <button className="btn btn-icon btn-secondary btn-sm" onClick={onSave}><X size={16} /></button>
            </div>
          </div>
          <div className="modal-body" id="receipt-print" style={{ padding: 0 }}>
            <div className="pos-receipt" style={{ 
              fontFamily: 'Arial, Helvetica, sans-serif', 
              color: '#000', 
              maxWidth: '600px', 
              margin: '0 auto', 
              padding: '20px',
              backgroundColor: '#fff'
            }}>
              {/* HEADER */}
              <div style={{ textAlign: 'center', borderBottom: '1px solid #000', paddingBottom: '15px', marginBottom: '15px' }}>
                <div style={{ fontSize: '24pt', fontWeight: 'bold', textTransform: 'uppercase' }}>Hanan Installments</div>
                <div style={{ fontSize: '12pt', fontStyle: 'italic', margin: '4px 0' }}>Quality Products on Easy Installments</div>
                <div style={{ fontSize: '10pt' }}>Phone: 03105589669</div>
                <div style={{ fontSize: '10pt' }}>Haq Palaza Mulhal Mughlan</div>
              </div>

              <div style={{ fontSize: '14pt', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', margin: '15px 0' }}>
                PAYMENT RECEIPT
              </div>

              {/* Section 1: Receipt Info */}
              <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10pt' }}>Receipt No:</span>
                  <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>{receipt.receipt_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10pt' }}>Date:</span>
                  <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>{new Date().toLocaleDateString('en-PK')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10pt' }}>Time:</span>
                  <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>{new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

              {/* Section 2: Customer Info */}
              <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10pt' }}>Customer Name:</span>
                  <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>{customer.full_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10pt' }}>Phone:</span>
                  <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>{customer.phone}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10pt' }}>CNIC:</span>
                  <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>{customer.cnic || '—'}</span>
                </div>
              </div>

              <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

              {/* Section 3: Installment Plan Details */}
              <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10pt' }}>Product:</span>
                  <span style={{ fontSize: '10pt', fontWeight: 'bold', textAlign: 'right', maxWidth: '60%' }}>{sale.product_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10pt' }}>Total Price:</span>
                  <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>Rs. {sale.total_price.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10pt' }}>Down Payment:</span>
                  <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>Rs. {sale.down_payment.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10pt' }}>Total Installments:</span>
                  <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>{sale.num_installments}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10pt' }}>Installment Amount:</span>
                  <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>Rs. {sale.installment_amount.toLocaleString()}/month</span>
                </div>
              </div>

              <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

              {/* Section 4: This Payment */}
              <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10pt' }}>Amount Paid:</span>
                  <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>Rs. {receipt.amount.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10pt' }}>Payment Date:</span>
                  <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>{new Date(receipt.payment_date).toLocaleDateString('en-PK')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10pt' }}>Payment Method:</span>
                  <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>{receipt.payment_method.toUpperCase()}</span>
                </div>
                {receipt.notes && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10pt' }}>Notes:</span>
                    <span style={{ fontSize: '10pt', fontWeight: 'bold', maxWidth: '60%', textAlign: 'right' }}>{receipt.notes}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ fontSize: '12pt', fontWeight: 'bold' }}>Remaining Balance:</span>
                  <span style={{ fontSize: '12pt', fontWeight: 'bold' }}>Rs. {newBalance.toLocaleString()}</span>
                </div>
              </div>

              {/* Section 5: Upcoming Next Due */}
              {(receipt.next_due_date || newBalance > 0) && (
                <>
                  <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10pt' }}>Next Due Date:</span>
                      <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>{receipt.next_due_date ? new Date(receipt.next_due_date).toLocaleDateString('en-PK') : '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10pt' }}>Next Due Amount:</span>
                      <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>Rs. {receipt.next_due_amount ? receipt.next_due_amount.toLocaleString() : '0'}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Footer */}
              <div style={{ borderBottom: '1px solid #000', margin: '15px 0' }}></div>
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '8pt', fontStyle: 'italic', marginBottom: '4px' }}>Thank you for your trust in us.</div>
                <div style={{ fontSize: '8pt', fontStyle: 'italic', marginBottom: '4px' }}>Please keep this receipt for your records.</div>
                <div style={{ fontSize: '8pt', marginTop: '8px' }}>HANAN INSTALLMENTS | 03105589669</div>
              </div>
              <div style={{ textAlign: 'center', marginTop: '15px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '10pt', border: '1px solid #000', padding: '4px 10px', display: 'inline-block' }}>
                  CUSTOMER COPY
                </span>
              </div>

            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-primary" onClick={onSave}>Done</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-md">
        <div className="modal-header">
          <div className="modal-title"><CreditCard size={18} />Record Payment</div>
          <button className="btn btn-icon btn-secondary btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Summary */}
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{sale.product_name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Monthly Installment</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{fmt(sale.installment_amount)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Balance Due</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--danger)' }}>{fmt(balanceDue)}</div>
                </div>
              </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="form-row">
              <div className="form-group">
                <label>Amount Received *</label>
                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  placeholder={`Max: ${balanceDue}`} min="1" step="0.01" autoFocus />
                <div className="form-hint">Balance due: {fmt(balanceDue)}</div>
              </div>
              <div className="form-group">
                <label>Payment Date *</label>
                <input type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Payment Method</label>
              <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Notes (Optional)</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Any additional notes..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Processing...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
