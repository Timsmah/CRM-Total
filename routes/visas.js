const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', async (req, res) => {
  const { data, error } = await db.from('visas').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { name, phone, notes, status } = req.body;
  const { data, error } = await db.from('visas')
    .insert({ name, phone: phone || '', notes: notes || '', status: status || 'À contacter' })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const { data, error } = await db.from('visas').update({ status }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.put('/:id', async (req, res) => {
  const { name, phone, notes, status } = req.body;
  const { data, error } = await db.from('visas')
    .update({ name, phone: phone || '', notes: notes || '', status })
    .eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await db.from('visas').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
