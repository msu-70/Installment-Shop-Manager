const sqlite3 = require('sqlite3').verbose()
const { open } = require('sqlite')
const path = require('path')
const { app } = require('electron')

const DB_PATH = path.join(app.getPath('userData'), 'installment_shop.db')

let dbPromise = null

async function initDatabase() {
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  })
  
  await db.exec('PRAGMA journal_mode = WAL;')
  await db.exec('PRAGMA foreign_keys = ON;')

  await db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      cnic TEXT,
      address TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      description TEXT,
      total_price REAL NOT NULL,
      down_payment REAL NOT NULL DEFAULT 0,
      remaining_balance REAL NOT NULL,
      num_installments INTEGER NOT NULL,
      installment_amount REAL NOT NULL,
      start_date TEXT NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS installments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      installment_number INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY (sale_id) REFERENCES sales(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      notes TEXT,
      receipt_number TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (sale_id) REFERENCES sales(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
  `)
  
  dbPromise = db
  return db
}

function getDb() {
  return dbPromise
}

module.exports = { initDatabase, getDb }
