const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', async (req, res) => {
  const { client_id } = req.query;
  if (!client_id) return res.status(400).json({ error: 'client_id required' });
  const { data, error } = await db
    .from('activities')
    .select('*')
    .eq('client_id', client_id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { client_id, type, content, author } = req.body;
  if (!client_id || !type) return res.status(400).json({ error: 'client_id and type required' });
  const { data, error } = await db
    .from('activities')
    .insert({ client_id, type, content: content || null, author: author || 'Tim' })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await db.from('activities').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
