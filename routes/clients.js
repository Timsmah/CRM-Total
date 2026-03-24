const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', async (req, res) => {
  const archived = req.query.archived === 'true' ? 1 : 0;
  const { data, error } = await db.from('clients')
    .select('*').eq('archived', archived).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const { data, error } = await db.from('clients').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Client non trouvé' });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { name, whatsapp, budget_min, budget_max, zones, criteria, source, status } = req.body;
  const { data, error } = await db.from('clients')
    .insert({ name, whatsapp: whatsapp || '', budget_min: budget_min || null,
              budget_max: budget_max || null, zones: zones || '', criteria: criteria || '',
              source: source || 'Autre', status: status || 'Prospect' })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.put('/:id', async (req, res) => {
  const { name, whatsapp, budget_min, budget_max, zones, criteria, source, status, research_fees_paid, archived } = req.body;
  const { data, error } = await db.from('clients')
    .update({ name, whatsapp, budget_min: budget_min || null, budget_max: budget_max || null,
              zones, criteria, source, status,
              research_fees_paid: research_fees_paid ? 1 : 0,
              archived: archived ? 1 : 0 })
    .eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await db.from('clients').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

router.patch('/:id/archive', async (req, res) => {
  const { data: client, error: fetchErr } = await db.from('clients').select('archived').eq('id', req.params.id).single();
  if (fetchErr) return res.status(404).json({ error: 'Client non trouvé' });
  const newVal = client.archived ? 0 : 1;
  await db.from('clients').update({ archived: newVal }).eq('id', req.params.id);
  res.json({ archived: !!newVal });
});

router.patch('/:id/contact-status', async (req, res) => {
  const { contact_status } = req.body;
  const { error } = await db.from('clients').update({ contact_status }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ contact_status });
});

router.patch('/:id/fees', async (req, res) => {
  const { data: client, error: fetchErr } = await db.from('clients').select('research_fees_paid').eq('id', req.params.id).single();
  if (fetchErr) return res.status(404).json({ error: 'Client non trouvé' });
  const newVal = client.research_fees_paid ? 0 : 1;
  await db.from('clients').update({ research_fees_paid: newVal }).eq('id', req.params.id);
  res.json({ research_fees_paid: newVal });
});

// Sync via Google Apps Script Web App
router.post('/sync/sheets', async (req, res) => {
  try {
    const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!scriptUrl) return res.status(400).json({ error: 'GOOGLE_APPS_SCRIPT_URL non configuré' });

    const response = await fetch(scriptUrl, { redirect: 'follow' });
    if (!response.ok) throw new Error(`Apps Script HTTP ${response.status}`);

    const { rows = [] } = await response.json();
    let imported = 0, updated = 0;

    for (const r of rows) {
      if (!r.name || !r.name.trim()) continue;
      const budgetThb = parseInt(r.budgetThb) || null;
      const budgetEur = parseInt(r.budgetEur) || null;
      const zones     = r.zones || r.location || '';

      const { data: existing } = await db.from('clients').select('id').eq('sheet_row', r.sheetRow).single();

      if (!existing) {
        await db.from('clients').insert({
          name: r.name, whatsapp: r.phone, budget_max: budgetThb, budget_eur: budgetEur,
          zones, criteria: r.criteria, property_type: r.propertyType, city: r.city,
          bedrooms: r.bedrooms, move_in_date: r.moveInDate, duration: r.duration,
          project: r.project, source: 'Formulaire', sheet_row: r.sheetRow
        });
        imported++;
      } else {
        await db.from('clients').update({
          name: r.name, whatsapp: r.phone, budget_max: budgetThb, budget_eur: budgetEur,
          zones, criteria: r.criteria, property_type: r.propertyType, city: r.city,
          bedrooms: r.bedrooms, move_in_date: r.moveInDate, duration: r.duration, project: r.project
        }).eq('sheet_row', r.sheetRow);
        updated++;
      }
    }

    res.json({ imported, updated, total: rows.length });
  } catch (err) {
    console.error('Sheets sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
