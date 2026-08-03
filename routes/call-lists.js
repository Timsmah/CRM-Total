const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', async (req, res) => {
  const { data, error } = await db
    .from('call_lists')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { label, clients, created_by } = req.body;
  if (!clients || !clients.length) return res.status(400).json({ error: 'clients required' });
  const { data, error } = await db
    .from('call_lists')
    .insert({ label: label || null, clients, created_by: created_by || 'Tim' })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await db.from('call_lists').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
