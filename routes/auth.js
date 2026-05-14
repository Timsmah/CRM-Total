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
  const adminPw = process.env.CRM_PASSWORD || 'admin';
  const guestPw = process.env.GUEST_PASSWORD;
  if (password === adminPw) {
    res.cookie('crm_auth', 'admin', COOKIE_OPTS);
    res.json({ success: true, role: 'admin' });
  } else if (guestPw && password === guestPw) {
    res.cookie('crm_auth', 'guest', COOKIE_OPTS);
    res.json({ success: true, role: 'guest' });
  } else {
    res.status(401).json({ error: 'Mot de passe incorrect' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('crm_auth');
  res.json({ success: true });
});

router.get('/check', (req, res) => {
  const role = req.signedCookies?.crm_auth; // 'admin' | 'guest' | undefined
  const authenticated = role === 'admin' || role === 'guest';
  res.json({ authenticated, role: role || null });
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
