const express  = require('express');
const router   = express.Router();
const db       = require('../db');
const { verifyPassword } = require('../lib/auth-helpers');

const COOKIE_OPTS = {
  signed  : true,
  httpOnly: true,
  sameSite: 'lax',
  maxAge  : 7 * 24 * 60 * 60 * 1000   // 7 days
};

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !email.trim()) return res.status(401).json({ error: 'Identifiants incorrects' });

  const { data: user } = await db.from('crm_users')
    .select('*')
    .eq('email', email.trim().toLowerCase()).maybeSingle();

  if (!user) return res.status(401).json({ error: 'Identifiants incorrects' });

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Identifiants incorrects' });

  const payload = {
    id          : user.id,
    name        : user.name,
    role        : user.role,
    lang        : user.lang,
    avatar_type : user.avatar_type,
    sections    : user.sections || null,
  };
  res.cookie('crm_auth', JSON.stringify(payload), COOKIE_OPTS);
  return res.json({ success: true, ...payload, avatar_value: user.avatar_value });
});

// ── Logout ────────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('crm_auth');
  res.json({ success: true });
});

// ── Check session ─────────────────────────────────────────────────────────────
router.get('/check', async (req, res) => {
  const val = req.signedCookies?.crm_auth;
  if (!val) return res.json({ authenticated: false });

  // Format JSON
  try {
    const user = JSON.parse(val);
    if (user?.id) {
      // Charge avatar_value depuis la DB (non stocké dans le cookie pour éviter des cookies trop lourds)
      const { data } = await db.from('crm_users').select('avatar_value').eq('id', user.id).maybeSingle();
      return res.json({ authenticated: true, ...user, avatar_value: data?.avatar_value || null });
    }
  } catch {}

  res.json({ authenticated: false });
});

// ── Finance unlock ────────────────────────────────────────────────────────────
router.post('/finance-unlock', (req, res) => {
  const { password } = req.body;
  const correct = process.env.FINANCE_PASSWORD;
  if (!correct) return res.json({ success: true });
  if (password === correct) return res.json({ success: true });
  res.status(401).json({ error: 'Incorrect password' });
});

// ── Warmup Apps Script ────────────────────────────────────────────────────────
router.get('/warmup', (req, res) => {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (url) fetch(url, { redirect: 'follow' }).catch(() => {});
  res.json({ ok: true });
});

module.exports = router;
