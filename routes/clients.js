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
  const { name, whatsapp, budget_min, budget_max, zones, criteria, source, status, research_fees_paid, archived, duration, move_in_date } = req.body;
  const { data, error } = await db.from('clients')
    .update({ name, whatsapp, budget_min: budget_min || null, budget_max: budget_max || null,
              zones, criteria, source, status,
              duration: duration || null,
              move_in_date: move_in_date || null,
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

router.patch('/:id/note', async (req, res) => {
  const { note_tim, note_alex } = req.body;
  const update = {};
  if (note_tim !== undefined) update.note_tim = note_tim || null;
  if (note_alex !== undefined) update.note_alex = note_alex || null;
  const { error } = await db.from('clients').update(update).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(update);
});

router.patch('/:id/tags', async (req, res) => {
  const { action_tags } = req.body;
  const val = Array.isArray(action_tags) ? JSON.stringify(action_tags) : action_tags;
  const { error } = await db.from('clients').update({ action_tags: val }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ action_tags: val });
});

router.patch('/:id/reminder', async (req, res) => {
  const { reminder_date, reminder_note } = req.body;
  const update = {
    reminder_date: reminder_date || null,
    reminder_note: reminder_note || null
  };
  const { error } = await db.from('clients').update(update).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(update);
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

    // Sheets exports #ERROR!, #REF!, #VALUE! etc. when a cell formula fails
    // (e.g. phone numbers starting with '+' are parsed as formulas)
    const clean = v => (typeof v === 'string' && v.startsWith('#')) ? '' : (v || '');

    const payload = rows
      .filter(r => r.name && r.name.trim() && !r.name.startsWith('#'))
      .map(r => ({
        name             : clean(r.name),
        whatsapp         : clean(r.phone),
        budget_max       : parseInt(clean(r.budgetThb)) || null,
        budget_eur       : parseInt(clean(r.budgetEur)) || null,
        zones            : clean(r.zones) || clean(r.location),
        criteria         : clean(r.criteria),
        property_type    : clean(r.propertyType),
        city             : clean(r.city),
        bedrooms         : clean(r.bedrooms),
        move_in_date     : clean(r.moveInDate) || null,
        duration         : clean(r.duration),
        project          : clean(r.project),
        source           : 'Formulaire',
        sheet_row        : r.sheetRow,
        form_submitted_at: clean(r.date) || null
      }));

    if (!payload.length) return res.json({ imported: 0, updated: 0, total: 0 });

    // 1 seule requête upsert au lieu de N×SELECT + N×INSERT/UPDATE
    const { error } = await db.from('clients')
      .upsert(payload, { onConflict: 'sheet_row', ignoreDuplicates: false });

    if (error) throw new Error(error.message);

    res.json({ imported: payload.length, updated: 0, total: payload.length });
  } catch (err) {
    console.error('Sheets sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
