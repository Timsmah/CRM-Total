const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', async (req, res) => {
  const status = req.query.status || null;
  let query = db.from('scraping').select('*').order('scraped_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const { error } = await db.from('scraping').update({ status }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ status });
});

router.delete('/:id', async (req, res) => {
  const { error } = await db.from('scraping').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
