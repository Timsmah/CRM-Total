const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const transactions = db.prepare(
    'SELECT * FROM finance ORDER BY date DESC, created_at DESC'
  ).all();
  res.json(transactions);
});

router.post('/', (req, res) => {
  const { amount, date, type, account, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO finance (amount, date, type, account, notes) VALUES (?, ?, ?, ?, ?)
  `).run(amount, date, type, account, notes || '');
  res.json(db.prepare('SELECT * FROM finance WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { amount, date, type, account, notes } = req.body;
  db.prepare(`
    UPDATE finance SET amount=?, date=?, type=?, account=?, notes=? WHERE id=?
  `).run(amount, date, type, account, notes, req.params.id);
  res.json(db.prepare('SELECT * FROM finance WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM finance WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
