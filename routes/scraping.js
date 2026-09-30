const express = require('express');
const router  = express.Router();
const db      = require('../db');

// Liste des annonces FB
router.get('/', async (req, res) => {
  const { status, active } = req.query;
  let query = db.from('fb_annonces').select('*').order('scraped_at', { ascending: false });
  if (status) query = query.eq('status', status);
  if (active !== undefined) query = query.eq('active', active !== 'false');
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Changer le statut (new / seen / archived)
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const { error } = await db.from('fb_annonces').update({ status }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ status });
});

// Supprimer une annonce
router.delete('/:id', async (req, res) => {
  const { error } = await db.from('fb_annonces').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Matching d'un client : annonces correspondantes avec score
router.get('/matching/:client_id', async (req, res) => {
  const { data, error } = await db.from('fb_matching')
    .select('score, reason, fb_annonces(*)')
    .eq('client_id', req.params.client_id)
    .order('score', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
