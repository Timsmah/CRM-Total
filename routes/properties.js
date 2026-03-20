const express = require('express');
const router = express.Router();
const db = require('../db');

const parsePhotos = (p) => { p.photos = JSON.parse(p.photos || '[]'); return p; };

router.get('/', (req, res) => {
  const archived = req.query.archived === 'true' ? 1 : 0;
  const props = db.prepare(
    'SELECT * FROM properties WHERE archived = ? ORDER BY created_at DESC'
  ).all(archived);
  res.json(props.map(parsePhotos));
});

router.get('/:id', (req, res) => {
  const prop = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
  if (!prop) return res.status(404).json({ error: 'Bien non trouvé' });
  res.json(parsePhotos(prop));
});

router.post('/', (req, res) => {
  const { title, price, zone, description, photos, status, external_url } = req.body;
  const photosStr = JSON.stringify(Array.isArray(photos) ? photos : []);
  const result = db.prepare(`
    INSERT INTO properties (title, price, zone, description, photos, status, external_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, price || null, zone || '', description || '', photosStr,
         status || 'Disponible', external_url || null);
  res.json(parsePhotos(db.prepare('SELECT * FROM properties WHERE id = ?').get(result.lastInsertRowid)));
});

router.put('/:id', (req, res) => {
  const { title, price, zone, description, photos, status, archived, external_url } = req.body;
  const photosStr = JSON.stringify(Array.isArray(photos) ? photos : []);
  db.prepare(`
    UPDATE properties SET title=?, price=?, zone=?, description=?, photos=?,
    status=?, archived=?, external_url=? WHERE id=?
  `).run(title, price || null, zone, description, photosStr,
         status, archived ? 1 : 0, external_url || null, req.params.id);
  res.json(parsePhotos(db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM properties WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.patch('/:id/archive', (req, res) => {
  const prop = db.prepare('SELECT archived FROM properties WHERE id = ?').get(req.params.id);
  if (!prop) return res.status(404).json({ error: 'Bien non trouvé' });
  const newVal = prop.archived ? 0 : 1;
  db.prepare('UPDATE properties SET archived = ? WHERE id = ?').run(newVal, req.params.id);
  res.json({ archived: !!newVal });
});

module.exports = router;
