const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/proposals?client_id=X
router.get('/', async (req, res) => {
  const { client_id } = req.query;
  if (!client_id) return res.status(400).json({ error: 'client_id required' });
  const { data, error } = await db
    .from('proposals')
    .select('*, properties(id, title, zone, price, room_type)')
    .eq('client_id', client_id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/proposals
router.post('/', async (req, res) => {
  const { client_id, property_id, notes, status } = req.body;
  if (!client_id || !property_id) return res.status(400).json({ error: 'client_id and property_id required' });
  const { data, error } = await db
    .from('proposals')
    .insert({ client_id, property_id, notes: notes || null, status: status || 'Envoyé' })
    .select('*, properties(id, title, zone, price, room_type)')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /api/proposals/:id/status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const { error } = await db.from('proposals').update({ status }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ status });
});

// DELETE /api/proposals/:id
router.delete('/:id', async (req, res) => {
  const { error } = await db.from('proposals').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
