const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // Customers
  getCustomers: (search) => ipcRenderer.invoke('get-customers', search),
  getCustomer: (id) => ipcRenderer.invoke('get-customer', id),
  addCustomer: (data) => ipcRenderer.invoke('add-customer', data),
  updateCustomer: (id, data) => ipcRenderer.invoke('update-customer', id, data),
  deleteCustomer: (id) => ipcRenderer.invoke('delete-customer', id),

  // Sales / Plans
  getSales: (customerId) => ipcRenderer.invoke('get-sales', customerId),
  getSale: (id) => ipcRenderer.invoke('get-sale', id),
  addSale: (data) => ipcRenderer.invoke('add-sale', data),
  updateSale: (id, data) => ipcRenderer.invoke('update-sale', id, data),
  deleteSale: (id) => ipcRenderer.invoke('delete-sale', id),

  // Installments
  getInstallments: (saleId) => ipcRenderer.invoke('get-installments', saleId),
  getOverdueInstallments: () => ipcRenderer.invoke('get-overdue-installments'),
  getTodayInstallments: () => ipcRenderer.invoke('get-today-installments'),
  getWeekInstallments: () => ipcRenderer.invoke('get-week-installments'),

  // Payments
  getPayments: (saleId) => ipcRenderer.invoke('get-payments', saleId),
  addPayment: (data) => ipcRenderer.invoke('add-payment', data),
  getRecentPayments: (date) => ipcRenderer.invoke('get-recent-payments', date),

  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),

  // Reports
  getCustomerStatement: (customerId) => ipcRenderer.invoke('get-customer-statement', customerId),
  getDailyReport: (date) => ipcRenderer.invoke('get-daily-report', date),
  getOverdueReport: () => ipcRenderer.invoke('get-overdue-report'),

  // Print
  printContent: () => ipcRenderer.invoke('print-content'),
})
