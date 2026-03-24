const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', async (req, res) => {
  const { data, error } = await db.from('finance')
    .select('*').order('date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { amount, date, type, account, notes } = req.body;
  const { data, error } = await db.from('finance')
    .insert({ amount, date, type, account, notes: notes || '' })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.put('/:id', async (req, res) => {
  const { amount, date, type, account, notes } = req.body;
  const { data, error } = await db.from('finance')
    .update({ amount, date, type, account, notes })
    .eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await db.from('finance').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
