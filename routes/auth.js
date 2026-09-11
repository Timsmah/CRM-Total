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

  // ── Nouveau login multi-utilisateur (email + mot de passe) ────────────────
  if (email && email.trim()) {
    const { data: user } = await db.from('crm_users')
      .select('id,name,email,role,lang,avatar_type,avatar_value,sections,password_hash')
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
      avatar_value: user.avatar_value,
      sections    : user.sections || null,
    };
    res.cookie('crm_auth', JSON.stringify(payload), COOKIE_OPTS);
    return res.json({ success: true, ...payload });
  }

  // ── Fallback temporaire (à supprimer après création des comptes) ──────────
  const adminPw = process.env.CRM_PASSWORD;
  if (adminPw && password === adminPw) {
    res.cookie('crm_auth', 'admin', COOKIE_OPTS);
    return res.json({ success: true, role: 'admin', name: 'Tim', lang: 'fr', id: null, avatar_type: 'preset', avatar_value: '1' });
  }
  res.status(401).json({ error: 'Identifiants incorrects' });
});

// ── Logout ────────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('crm_auth');
  res.json({ success: true });
});

// ── Check session ─────────────────────────────────────────────────────────────
router.get('/check', (req, res) => {
  const val = req.signedCookies?.crm_auth;
  if (!val) return res.json({ authenticated: false });

  // Legacy
  if (val === 'admin') return res.json({ authenticated: true, id: null, role: 'admin', name: 'Tim', lang: 'fr', avatar_type: 'preset', avatar_value: '1' });
  if (val === 'guest') return res.json({ authenticated: true, id: null, role: 'guest', name: 'Nono', lang: 'fr', avatar_type: 'preset', avatar_value: '2' });

  // Nouveau format JSON
  try {
    const user = JSON.parse(val);
    if (user?.id) return res.json({ authenticated: true, ...user });
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
