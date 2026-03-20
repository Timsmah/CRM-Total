const express = require('express');
const router = express.Router();
const db = require('../db');

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

// Sync via Google Apps Script Web App (aucun credential requis)
router.post('/sync/sheets', async (req, res) => {
  try {
    const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!scriptUrl) return res.status(400).json({ error: 'GOOGLE_APPS_SCRIPT_URL non configuré dans .env' });

    const response = await fetch(scriptUrl, { redirect: 'follow' });
    if (!response.ok) throw new Error(`Apps Script HTTP ${response.status}`);

    const { rows = [] } = await response.json();
    let imported = 0;
    let updated  = 0;

    rows.forEach(r => {
      if (!r.name || !r.name.trim()) return;

      const budgetThb = parseInt(r.budgetThb) || null;
      const budgetEur = parseInt(r.budgetEur) || null;
      const zones     = r.zones || r.location || '';

      const existing = db.prepare('SELECT id FROM clients WHERE sheet_row = ?').get(r.sheetRow);

      if (!existing) {
        db.prepare(`
          INSERT INTO clients
            (name, whatsapp, budget_max, budget_eur, zones, criteria,
             property_type, city, bedrooms, move_in_date, duration, project,
             source, sheet_row)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'Formulaire',?)
        `).run(r.name, r.phone, budgetThb, budgetEur, zones, r.criteria,
               r.propertyType, r.city, r.bedrooms, r.moveInDate, r.duration, r.project,
               r.sheetRow);
        imported++;
      } else {
        db.prepare(`
          UPDATE clients SET
            name=?, whatsapp=?, budget_max=?, budget_eur=?, zones=?, criteria=?,
            property_type=?, city=?, bedrooms=?, move_in_date=?, duration=?, project=?
          WHERE sheet_row=?
        `).run(r.name, r.phone, budgetThb, budgetEur, zones, r.criteria,
               r.propertyType, r.city, r.bedrooms, r.moveInDate, r.duration, r.project,
               r.sheetRow);
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
