const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/notes?date=YYYY-MM-DD
router.get('/', async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const { data, error } = await db.from('daily_notes').select('*').eq('date', date).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || { date, tasks: [], notes: '' });
});

// PUT /api/notes?date=YYYY-MM-DD
router.put('/', async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const { tasks, notes } = req.body;
  const payload = { date };
  if (tasks !== undefined) payload.tasks = tasks;
  if (notes !== undefined) payload.notes = notes;
  const { data, error } = await db.from('daily_notes')
    .upsert(payload, { onConflict: 'date' }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
