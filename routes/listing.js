const express = require('express');
const router  = express.Router();
const db      = require('../db');

const parseJSON = (v) => { if (Array.isArray(v)) return v; try { return JSON.parse(v || '[]'); } catch { return []; } };

// Public endpoint — no auth required
router.get('/:token', async (req, res) => {
  const { data, error } = await db.from('properties')
    .select('id, title, price, zone, room_type, sqm, floor, room_no, description, status, cached_photos')
    .eq('share_token', req.params.token)
    .eq('archived', 0)
    .single();
  if (error || !data) return res.status(404).json({ error: 'Listing not found' });
  data.cached_photos = parseJSON(data.cached_photos);
  res.json(data);
});

module.exports = router;
