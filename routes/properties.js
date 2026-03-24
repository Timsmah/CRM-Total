const express = require('express');
const router  = express.Router();
const db      = require('../db');

const parsePhotos = (p) => { p.photos = JSON.parse(p.photos || '[]'); return p; };

router.get('/', async (req, res) => {
  const archived = req.query.archived === 'true' ? 1 : 0;
  const { data, error } = await db.from('properties')
    .select('*').eq('archived', archived).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(parsePhotos));
});

router.get('/:id', async (req, res) => {
  const { data, error } = await db.from('properties').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Bien non trouvé' });
  res.json(parsePhotos(data));
});

router.post('/', async (req, res) => {
  const { title, price, zone, description, photos, status, external_url } = req.body;
  const photosStr = JSON.stringify(Array.isArray(photos) ? photos : []);
  const { data, error } = await db.from('properties')
    .insert({ title, price: price || null, zone: zone || '', description: description || '',
              photos: photosStr, status: status || 'Disponible', external_url: external_url || null })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(parsePhotos(data));
});

router.put('/:id', async (req, res) => {
  const { title, price, zone, description, photos, status, archived, external_url } = req.body;
  const photosStr = JSON.stringify(Array.isArray(photos) ? photos : []);
  const { data, error } = await db.from('properties')
    .update({ title, price: price || null, zone, description, photos: photosStr,
              status, archived: archived ? 1 : 0, external_url: external_url || null })
    .eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(parsePhotos(data));
});

router.delete('/:id', async (req, res) => {
  const { error } = await db.from('properties').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

router.patch('/:id/archive', async (req, res) => {
  const { data: prop, error: fetchErr } = await db.from('properties').select('archived').eq('id', req.params.id).single();
  if (fetchErr) return res.status(404).json({ error: 'Bien non trouvé' });
  const newVal = prop.archived ? 0 : 1;
  await db.from('properties').update({ archived: newVal }).eq('id', req.params.id);
  res.json({ archived: !!newVal });
});

module.exports = router;
