import { useState, useEffect, useRef } from 'react'
import { X, Printer, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

function fmt(n) { return 'Rs. ' + (Number(n) || 0).toLocaleString('en-PK') }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }

export default function PaymentSchedule({ sale, customer, onClose }) {
  const [installments, setInstallments] = useState([])
  const [loading, setLoading] = useState(true)
  const printRef = useRef()
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    window.api.getInstallments(sale.id).then(data => {
      setInstallments(data)
      setLoading(false)
    })
  }, [sale.id])

  const handlePrint = () => window.api.printContent()

  const getStatus = (inst) => {
    if (inst.status === 'paid') return { label: 'Paid', cls: 'badge-success', icon: <CheckCircle size={10} /> }
    if (inst.due_date < today) return { label: 'Overdue', cls: 'badge-danger', icon: <AlertTriangle size={10} /> }
    if (inst.status === 'partial') return { label: 'Partial', cls: 'badge-warning', icon: <Clock size={10} /> }
    return { label: 'Pending', cls: 'badge-muted', icon: <Clock size={10} /> }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header no-print">
          <div className="modal-title"><Printer size={18} />Payment Schedule</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handlePrint}><Printer size={13} />Print</button>
            <button className="btn btn-icon btn-secondary btn-sm" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <div className="modal-body" ref={printRef} id="print-schedule">
          {/* Print Header */}
          <div className="print-header">
            <h1>Hanan Installments</h1>
            <p>Haq Palaza Mulhal Mughlan | Phone: 03105589669</p>
            <h2 style={{ marginTop: '15px' }}>INSTALLMENT PAYMENT SCHEDULE</h2>
            <p>Generated: {fmtDate(today)}</p>
          </div>

          {/* Customer & Sale Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, background: 'var(--bg-tertiary)', padding: 16, borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Customer Info</div>
              <div><strong>{customer.full_name}</strong></div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>📞 {customer.phone}</div>
              {customer.cnic && <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>🪪 {customer.cnic}</div>}
              {customer.address && <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>📍 {customer.address}</div>}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Sale Info</div>
              <div><strong>{sale.product_name}</strong></div>
              {sale.description && <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{sale.description}</div>}
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Total: {fmt(sale.total_price)}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Down Payment: {fmt(sale.down_payment)}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Monthly: {fmt(sale.installment_amount)}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Start Date: {fmtDate(sale.start_date)}</div>
            </div>
          </div>

          {/* Installments Table */}
          {loading ? (
            <div className="loading"><div className="spinner" />Loading...</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Due Date</th>
                    <th>Amount Due</th>
                    <th>Amount Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th className="no-print">Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map((inst) => {
                    const status = getStatus(inst)
                    const balance = inst.amount - inst.paid_amount
                    return (
                      <tr key={inst.id} className={inst.due_date < today && inst.status !== 'paid' ? 'row-overdue' : ''}>
                        <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{inst.installment_number}</td>
                        <td style={{ fontWeight: 600 }}>{fmtDate(inst.due_date)}</td>
                        <td>{fmt(inst.amount)}</td>
                        <td style={{ color: inst.paid_amount > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                          {inst.paid_amount > 0 ? fmt(inst.paid_amount) : '—'}
                        </td>
                        <td style={{ color: balance > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                          {balance > 0 ? fmt(balance) : 'Paid ✓'}
                        </td>
                        <td><span className={`badge ${status.cls}`}>{status.icon}{status.label}</span></td>
                        <td className="no-print" style={{ width: 120, borderBottom: '1px solid var(--border)' }}></td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg-tertiary)' }}>
                    <td colSpan={2} style={{ fontWeight: 700, padding: '10px 14px' }}>TOTAL</td>
                    <td style={{ fontWeight: 700 }}>{fmt(installments.reduce((s, i) => s + i.amount, 0))}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt(installments.reduce((s, i) => s + i.paid_amount, 0))}</td>
                    <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{fmt(installments.reduce((s, i) => s + Math.max(0, i.amount - i.paid_amount), 0))}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {sale.notes && (
            <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
              <strong>Notes / Guarantor:</strong> {sale.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
