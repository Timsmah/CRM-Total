const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/properties/import — called by Chrome extension
// Headers: x-import-key: <IMPORT_KEY>
// Body: { title, price, zone, description, photos: [...urls], external_url }
router.post('/', (req, res) => {
  const { title, price, zone, description, photos, external_url } = req.body;
  if (!title) return res.status(400).json({ error: 'title requis' });

  const photosArr = Array.isArray(photos) ? photos : (photos ? [photos] : []);
  const result = db.prepare(`
    INSERT INTO properties (title, price, zone, description, photos, external_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, price || null, zone || '', description || '',
         JSON.stringify(photosArr), external_url || null);

  const prop = db.prepare('SELECT * FROM properties WHERE id = ?').get(result.lastInsertRowid);
  prop.photos = JSON.parse(prop.photos);
  res.json(prop);
});

module.exports = router;
