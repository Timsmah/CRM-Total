const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/proposals?client_id=X  (sans filtre → tous)
router.get('/', async (req, res) => {
  const { client_id } = req.query;
  let query = db
    .from('proposals')
    .select('*, properties(id, title, zone, price, room_type)')
    .order('created_at', { ascending: false });
  if (client_id) query = query.eq('client_id', client_id);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/proposals — property_id OU property_title requis
router.post('/', async (req, res) => {
  const { client_id, property_id, property_title, property_url, photos, notes, status } = req.body;
  if (!client_id) return res.status(400).json({ error: 'client_id requis' });
  if (!property_id && !property_title) return res.status(400).json({ error: 'property_id ou property_title requis' });

  const insert = {
    client_id,
    notes       : notes  || null,
    status      : status || 'Envoyé',
    property_title: property_title || null,
    property_url  : property_url   || null,
    photos        : Array.isArray(photos) ? photos : [],
  };
  if (property_id) insert.property_id = property_id;

  const { data, error } = await db
    .from('proposals')
    .insert(insert)
    .select('*, properties(id, title, zone, price, room_type)')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /api/proposals/:id/status  (rétro-compat)
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
