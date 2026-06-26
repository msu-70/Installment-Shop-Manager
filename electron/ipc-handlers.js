const { getDb } = require('./database')
const { BrowserWindow } = require('electron')

function generateReceiptNumber() {
  const now = new Date()
  return `RCP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getTime()).slice(-5)}`
}

function registerHandlers(ipcMain) {
  const db = () => getDb()

  // ============ CUSTOMERS ============
  ipcMain.handle('get-customers', async (_, search) => {
    if (search && search.trim()) {
      return await db().all(`
        SELECT c.*, 
          COUNT(DISTINCT s.id) as total_plans,
          COALESCE(SUM(CASE WHEN s.status='active' THEN 1 ELSE 0 END), 0) as active_plans
        FROM customers c
        LEFT JOIN sales s ON s.customer_id = c.id
        WHERE c.full_name LIKE ? OR c.phone LIKE ? OR c.cnic LIKE ?
        GROUP BY c.id ORDER BY c.full_name
      `, [`%${search}%`, `%${search}%`, `%${search}%`])
    }
    return await db().all(`
      SELECT c.*,
        COUNT(DISTINCT s.id) as total_plans,
        COALESCE(SUM(CASE WHEN s.status='active' THEN 1 ELSE 0 END), 0) as active_plans
      FROM customers c
      LEFT JOIN sales s ON s.customer_id = c.id
      GROUP BY c.id ORDER BY c.full_name
    `)
  })

  ipcMain.handle('get-customer', async (_, id) => {
    return await db().get('SELECT * FROM customers WHERE id = ?', [id])
  })

  ipcMain.handle('add-customer', async (_, data) => {
    const result = await db().run(
      'INSERT INTO customers (full_name, phone, cnic, address) VALUES (?, ?, ?, ?)',
      [data.full_name, data.phone, data.cnic, data.address]
    )
    return { id: result.lastID, ...data }
  })

  ipcMain.handle('update-customer', async (_, id, data) => {
    await db().run(
      'UPDATE customers SET full_name=?, phone=?, cnic=?, address=? WHERE id=?',
      [data.full_name, data.phone, data.cnic, data.address, id]
    )
    return { id, ...data }
  })

  ipcMain.handle('delete-customer', async (_, id) => {
    await db().run('DELETE FROM customers WHERE id = ?', [id])
    return { success: true }
  })

  // ============ SALES ============
  ipcMain.handle('get-sales', async (_, customerId) => {
    if (customerId) {
      return await db().all(`
        SELECT s.*, c.full_name as customer_name, c.phone as customer_phone,
          (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE sale_id = s.id) as total_paid,
          s.remaining_balance - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE sale_id = s.id) as balance_due,
          (SELECT COUNT(*) FROM installments WHERE sale_id = s.id AND status='paid') as paid_installments,
          (SELECT COUNT(*) FROM installments WHERE sale_id = s.id) as total_installments_count
        FROM sales s
        JOIN customers c ON c.id = s.customer_id
        WHERE s.customer_id = ?
        ORDER BY s.created_at DESC
      `, [customerId])
    }
    return await db().all(`
      SELECT s.*, c.full_name as customer_name, c.phone as customer_phone,
        COALESCE(SUM(p.amount), 0) as total_paid
      FROM sales s
      JOIN customers c ON c.id = s.customer_id
      LEFT JOIN payments p ON p.sale_id = s.id
      GROUP BY s.id ORDER BY s.created_at DESC
    `)
  })

  ipcMain.handle('get-sale', async (_, id) => {
    return await db().get(`
      SELECT s.*, c.full_name as customer_name, c.phone as customer_phone, c.cnic, c.address,
        COALESCE(SUM(p.amount), 0) as total_paid
      FROM sales s
      JOIN customers c ON c.id = s.customer_id
      LEFT JOIN payments p ON p.sale_id = s.id
      WHERE s.id = ?
      GROUP BY s.id
    `, [id])
  })

  ipcMain.handle('add-sale', async (_, data) => {
    const result = await db().run(
      `INSERT INTO sales (customer_id, product_name, description, total_price, down_payment, 
        remaining_balance, num_installments, installment_amount, start_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.customer_id, data.product_name, data.description,
        data.total_price, data.down_payment, data.remaining_balance,
        data.num_installments, data.installment_amount, data.start_date, data.notes
      ]
    )
    const saleId = result.lastID

    // Generate installments
    const startDate = new Date(data.start_date)
    for (let i = 1; i <= data.num_installments; i++) {
      const dueDate = new Date(startDate)
      dueDate.setMonth(dueDate.getMonth() + i)
      const dueDateStr = dueDate.toISOString().split('T')[0]
      await db().run(
        'INSERT INTO installments (sale_id, installment_number, due_date, amount) VALUES (?, ?, ?, ?)',
        [saleId, i, dueDateStr, data.installment_amount]
      )
    }

    // Record down payment if any
    if (data.down_payment > 0) {
      await db().run(
        `INSERT INTO payments (sale_id, customer_id, amount, payment_date, payment_method, notes, receipt_number)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [saleId, data.customer_id, data.down_payment, data.start_date, 'cash', 'Down Payment', generateReceiptNumber()]
      )
    }

    return { id: saleId }
  })

  ipcMain.handle('update-sale', async (_, id, data) => {
    await db().run(
      'UPDATE sales SET status=?, notes=? WHERE id=?',
      [data.status, data.notes, id]
    )
    return { success: true }
  })

  ipcMain.handle('delete-sale', async (_, id) => {
    await db().run('DELETE FROM installments WHERE sale_id = ?', [id])
    await db().run('DELETE FROM payments WHERE sale_id = ?', [id])
    await db().run('DELETE FROM sales WHERE id = ?', [id])
    return { success: true }
  })

  // ============ INSTALLMENTS ============
  ipcMain.handle('get-installments', async (_, saleId) => {
    return await db().all(
      'SELECT * FROM installments WHERE sale_id = ? ORDER BY installment_number',
      [saleId]
    )
  })

  ipcMain.handle('get-overdue-installments', async () => {
    const today = new Date().toISOString().split('T')[0]
    return await db().all(`
      SELECT i.*, s.product_name, s.installment_amount, s.customer_id,
        c.full_name as customer_name, c.phone,
        julianday('now') - julianday(i.due_date) as days_overdue
      FROM installments i
      JOIN sales s ON s.id = i.sale_id
      JOIN customers c ON c.id = s.customer_id
      WHERE i.due_date < ? AND i.status != 'paid' AND s.status = 'active'
      ORDER BY i.due_date ASC
    `, [today])
  })

  ipcMain.handle('get-today-installments', async () => {
    const today = new Date().toISOString().split('T')[0]
    return await db().all(`
      SELECT i.*, s.product_name, s.customer_id,
        c.full_name as customer_name, c.phone
      FROM installments i
      JOIN sales s ON s.id = i.sale_id
      JOIN customers c ON c.id = s.customer_id
      WHERE i.due_date = ? AND i.status != 'paid' AND s.status = 'active'
      ORDER BY c.full_name
    `, [today])
  })

  ipcMain.handle('get-week-installments', async () => {
    return await db().all(`
      SELECT i.*, s.product_name, s.customer_id,
        c.full_name as customer_name, c.phone
      FROM installments i
      JOIN sales s ON s.id = i.sale_id
      JOIN customers c ON c.id = s.customer_id
      WHERE i.due_date BETWEEN date('now') AND date('now', '+7 days')
        AND i.status != 'paid' AND s.status = 'active'
      ORDER BY i.due_date, c.full_name
    `)
  })

  // ============ PAYMENTS ============
  ipcMain.handle('get-payments', async (_, saleId) => {
    return await db().all(`
      SELECT p.*, c.full_name as customer_name
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      WHERE p.sale_id = ?
      ORDER BY p.payment_date DESC
    `, [saleId])
  })

  ipcMain.handle('add-payment', async (_, data) => {
    const receiptNumber = generateReceiptNumber()

    const paymentResult = await db().run(
      `INSERT INTO payments (sale_id, customer_id, amount, payment_date, payment_method, notes, receipt_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.sale_id, data.customer_id, data.amount, data.payment_date, data.payment_method, data.notes || '', receiptNumber]
    )

    // Auto-mark installments as paid
    let remaining = data.amount
    const pendingInstallments = await db().all(
      `SELECT * FROM installments WHERE sale_id = ? AND status != 'paid' ORDER BY due_date ASC`,
      [data.sale_id]
    )

    for (const inst of pendingInstallments) {
      if (remaining <= 0) break
      const toPay = Math.min(remaining, inst.amount - inst.paid_amount)
      const newPaid = inst.paid_amount + toPay
      remaining -= toPay
      const newStatus = newPaid >= inst.amount ? 'paid' : 'partial'
      await db().run(
        'UPDATE installments SET paid_amount=?, status=? WHERE id=?',
        [newPaid, newStatus, inst.id]
      )
    }

    // Check if all installments paid - close plan
    const unpaid = await db().get(
      `SELECT COUNT(*) as cnt FROM installments WHERE sale_id = ? AND status != 'paid'`,
      [data.sale_id]
    )
    if (unpaid.cnt === 0) {
      await db().run(`UPDATE sales SET status='completed' WHERE id=?`, [data.sale_id])
    }

    const nextPending = await db().get(
      `SELECT * FROM installments WHERE sale_id = ? AND status != 'paid' ORDER BY due_date ASC LIMIT 1`,
      [data.sale_id]
    )

    return { 
      id: paymentResult.lastID, 
      receipt_number: receiptNumber,
      next_due_date: nextPending ? nextPending.due_date : null,
      next_due_amount: nextPending ? (nextPending.amount - nextPending.paid_amount) : 0
    }
  })

  ipcMain.handle('get-recent-payments', async (_, date) => {
    const target = date || new Date().toISOString().split('T')[0]
    return await db().all(`
      SELECT p.*, c.full_name as customer_name, s.product_name
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      JOIN sales s ON s.id = p.sale_id
      WHERE p.payment_date = ?
      ORDER BY p.created_at DESC
    `, [target])
  })

  // ============ DASHBOARD ============
  ipcMain.handle('get-dashboard-stats', async () => {
    const today = new Date().toISOString().split('T')[0]
    const monthStart = today.substring(0, 7) + '-01'

    const activePlans = await db().get(
      `SELECT COUNT(*) as cnt FROM sales WHERE status='active'`
    )

    const monthlyCollected = await db().get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_date >= ? AND payment_date <= ?`,
      [monthStart, today]
    )

    const totalPending = await db().get(
      `SELECT COALESCE(SUM(i.amount - i.paid_amount), 0) as total
       FROM installments i JOIN sales s ON s.id = i.sale_id
       WHERE i.status != 'paid' AND s.status = 'active'`
    )

    const overdueCount = await db().get(
      `SELECT COUNT(DISTINCT s.customer_id) as cnt
       FROM installments i JOIN sales s ON s.id = i.sale_id
       WHERE i.due_date < ? AND i.status != 'paid' AND s.status = 'active'`,
      [today]
    )

    const todayExpected = await db().get(
      `SELECT COALESCE(SUM(i.amount - i.paid_amount), 0) as total
       FROM installments i JOIN sales s ON s.id = i.sale_id
       WHERE i.due_date = ? AND i.status != 'paid' AND s.status = 'active'`,
      [today]
    )

    const recentPayments = await db().all(`
      SELECT p.*, c.full_name as customer_name, s.product_name
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      JOIN sales s ON s.id = p.sale_id
      ORDER BY p.created_at DESC LIMIT 5
    `)

    return {
      activePlans: activePlans.cnt,
      monthlyCollected: monthlyCollected.total,
      totalPending: totalPending.total,
      overdueCount: overdueCount.cnt,
      todayExpected: todayExpected.total,
      recentPayments,
    }
  })

  // ============ REPORTS ============
  ipcMain.handle('get-customer-statement', async (_, customerId) => {
    const customer = await db().get('SELECT * FROM customers WHERE id = ?', [customerId])
    const sales = await db().all(`
      SELECT s.*,
        COALESCE(SUM(p.amount), 0) as total_paid
      FROM sales s LEFT JOIN payments p ON p.sale_id = s.id
      WHERE s.customer_id = ? GROUP BY s.id ORDER BY s.created_at DESC
    `, [customerId])

    for (const sale of sales) {
      sale.installments = await db().all(
        'SELECT * FROM installments WHERE sale_id = ? ORDER BY installment_number',
        [sale.id]
      )
      sale.payments = await db().all(
        'SELECT * FROM payments WHERE sale_id = ? ORDER BY payment_date DESC',
        [sale.id]
      )
    }

    return { customer, sales }
  })

  ipcMain.handle('get-daily-report', async (_, date) => {
    const target = date || new Date().toISOString().split('T')[0]
    const payments = await db().all(`
      SELECT p.*, c.full_name as customer_name, c.phone, s.product_name
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      JOIN sales s ON s.id = p.sale_id
      WHERE p.payment_date = ?
      ORDER BY p.created_at DESC
    `, [target])

    const total = payments.reduce((sum, p) => sum + p.amount, 0)
    return { date: target, payments, total }
  })

  ipcMain.handle('get-overdue-report', async () => {
    const today = new Date().toISOString().split('T')[0]
    return await db().all(`
      SELECT c.full_name, c.phone, c.cnic, s.product_name, s.id as sale_id,
        COUNT(i.id) as overdue_count,
        SUM(i.amount - i.paid_amount) as overdue_amount,
        MIN(i.due_date) as earliest_due,
        MAX(julianday('now') - julianday(i.due_date)) as max_days_overdue
      FROM installments i
      JOIN sales s ON s.id = i.sale_id
      JOIN customers c ON c.id = s.customer_id
      WHERE i.due_date < ? AND i.status != 'paid' AND s.status = 'active'
      GROUP BY s.id
      ORDER BY max_days_overdue DESC
    `, [today])
  })

  // Print: trigger window print dialog
  ipcMain.handle('print-content', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.webContents.print({ silent: false, printBackground: true })
    return { success: true }
  })
}

module.exports = { registerHandlers }
