const express = require('express');
const router = express.Router();
const db = require('../db');
const { google } = require('googleapis');

router.get('/', (req, res) => {
  const archived = req.query.archived === 'true' ? 1 : 0;
  const clients = db.prepare(
    'SELECT * FROM clients WHERE archived = ? ORDER BY created_at DESC'
  ).all(archived);
  res.json(clients);
});

router.get('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client non trouvé' });
  res.json(client);
});

router.post('/', (req, res) => {
  const { name, whatsapp, budget_min, budget_max, zones, criteria, source, status } = req.body;
  const result = db.prepare(`
    INSERT INTO clients (name, whatsapp, budget_min, budget_max, zones, criteria, source, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, whatsapp || '', budget_min || null, budget_max || null,
         zones || '', criteria || '', source || 'Autre', status || 'Prospect');
  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, whatsapp, budget_min, budget_max, zones, criteria, source, status, research_fees_paid, archived } = req.body;
  db.prepare(`
    UPDATE clients SET name=?, whatsapp=?, budget_min=?, budget_max=?, zones=?,
    criteria=?, source=?, status=?, research_fees_paid=?, archived=? WHERE id=?
  `).run(name, whatsapp, budget_min || null, budget_max || null, zones, criteria,
         source, status, research_fees_paid ? 1 : 0, archived ? 1 : 0, req.params.id);
  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.patch('/:id/archive', (req, res) => {
  const client = db.prepare('SELECT archived FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client non trouvé' });
  const newVal = client.archived ? 0 : 1;
  db.prepare('UPDATE clients SET archived = ? WHERE id = ?').run(newVal, req.params.id);
  res.json({ archived: !!newVal });
});

router.patch('/:id/fees', (req, res) => {
  const client = db.prepare('SELECT research_fees_paid FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client non trouvé' });
  const newVal = client.research_fees_paid ? 0 : 1;
  db.prepare('UPDATE clients SET research_fees_paid = ? WHERE id = ?').run(newVal, req.params.id);
  res.json({ research_fees_paid: newVal });
});

// Colonnes du sheet :
// A=Date  B=Projet  C=Localisation  D=Type de bien  E=Ville  F=Chambres
// G=Budget(฿)  H=Budget(€)  I=Date emménagement  J=Durée  K=Quartiers
// L=Critères  M=Nom  N=Téléphone
router.post('/sync/sheets', async (req, res) => {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) return res.status(400).json({ error: 'GOOGLE_SHEET_ID non configuré' });

    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_KEY_FILE || './google-credentials.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A2:N'
    });

    const rows = response.data.values || [];
    let imported = 0;
    let updated = 0;

    rows.forEach((row, index) => {
      const sheetRow = index + 2;

      const date        = row[0]  || '';
      const project     = row[1]  || '';
      const location    = row[2]  || '';
      const propType    = row[3]  || '';
      const city        = row[4]  || '';
      const bedrooms    = row[5]  || '';
      const budgetThb   = parseInt((row[6]  || '').toString().replace(/\D/g, '')) || null;
      const budgetEur   = parseInt((row[7]  || '').toString().replace(/\D/g, '')) || null;
      const moveInDate  = row[8]  || '';
      const duration    = row[9]  || '';
      const zones       = row[10] || location; // Quartiers, fallback sur Localisation
      const criteria    = row[11] || '';
      const name        = row[12] || '';
      const phone       = row[13] || '';

      if (!name) return;

      const existing = db.prepare('SELECT id FROM clients WHERE sheet_row = ?').get(sheetRow);

      if (!existing) {
        db.prepare(`
          INSERT INTO clients
            (name, whatsapp, budget_max, budget_eur, zones, criteria,
             property_type, city, bedrooms, move_in_date, duration, project,
             source, sheet_row)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'Formulaire',?)
        `).run(name, phone, budgetThb, budgetEur, zones, criteria,
               propType, city, bedrooms, moveInDate, duration, project, sheetRow);
        imported++;
      } else {
        // Mise à jour si la ligne existait déjà (re-sync)
        db.prepare(`
          UPDATE clients SET
            name=?, whatsapp=?, budget_max=?, budget_eur=?, zones=?, criteria=?,
            property_type=?, city=?, bedrooms=?, move_in_date=?, duration=?, project=?
          WHERE sheet_row=?
        `).run(name, phone, budgetThb, budgetEur, zones, criteria,
               propType, city, bedrooms, moveInDate, duration, project, sheetRow);
        updated++;
      }
    });

    res.json({ imported, updated, total: rows.length });
  } catch (err) {
    console.error('Sheets sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
