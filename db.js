const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Vercel n'a accès en écriture qu'à /tmp
const DB_PATH = process.env.DB_PATH ||
  (process.env.VERCEL ? '/tmp/crm.db' : path.join(__dirname, 'data', 'crm.db'));
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    whatsapp TEXT,
    budget_min INTEGER,
    budget_max INTEGER,
    budget_eur INTEGER,
    zones TEXT,
    criteria TEXT,
    property_type TEXT,
    city TEXT,
    bedrooms TEXT,
    move_in_date TEXT,
    duration TEXT,
    project TEXT,
    source TEXT DEFAULT 'Formulaire',
    status TEXT DEFAULT 'Prospect',
    research_fees_paid INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0,
    sheet_row INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    price INTEGER,
    zone TEXT,
    description TEXT,
    photos TEXT DEFAULT '[]',
    status TEXT DEFAULT 'Disponible',
    archived INTEGER DEFAULT 0,
    external_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id),
    property_id INTEGER REFERENCES properties(id),
    status TEXT DEFAULT 'En cours',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS finance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    account TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrate existing clients table if needed
const newCols = ['budget_eur','property_type','city','bedrooms','move_in_date','duration','project','contact_status'];
newCols.forEach(col => {
  try { db.exec(`ALTER TABLE clients ADD COLUMN ${col} TEXT`); } catch {}
});

module.exports = db;
