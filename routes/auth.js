const express = require('express');
const router  = express.Router();

const COOKIE_OPTS = {
  signed  : true,
  httpOnly: true,
  sameSite: 'lax',
  maxAge  : 7 * 24 * 60 * 60 * 1000   // 7 days
};

router.post('/login', (req, res) => {
  const { password } = req.body;
  const correct = process.env.CRM_PASSWORD || 'admin';
  if (password === correct) {
    res.cookie('crm_auth', '1', COOKIE_OPTS);
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Mot de passe incorrect' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('crm_auth');
  res.json({ success: true });
});

router.get('/check', (req, res) => {
  const authenticated = !!(req.signedCookies && req.signedCookies.crm_auth === '1');
  res.json({ authenticated });
});

router.post('/finance-unlock', (req, res) => {
  const { password } = req.body;
  const correct = process.env.FINANCE_PASSWORD;
  if (!correct) return res.json({ success: true }); // pas de mdp configuré = ouvert
  if (password === correct) return res.json({ success: true });
  res.status(401).json({ error: 'Incorrect password' });
});

// Public warm-up: pings Apps Script so it's awake before the user logs in
router.get('/warmup', (req, res) => {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (url) fetch(url, { redirect: 'follow' }).catch(() => {});
  res.json({ ok: true });
});

module.exports = router;
