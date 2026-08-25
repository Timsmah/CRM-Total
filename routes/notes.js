const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET — charge les notes
router.get('/', async (req, res) => {
  const { data, error } = await db.from('dashboard_notes').select('*').eq('id', 1).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT — met à jour tasks et/ou notes
router.put('/', async (req, res) => {
  const { tasks, notes } = req.body;
  const update = { updated_at: new Date().toISOString() };
  if (tasks !== undefined) update.tasks = tasks;
  if (notes !== undefined) update.notes = notes;
  const { data, error } = await db.from('dashboard_notes')
    .update(update).eq('id', 1).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
