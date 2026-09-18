/**
 * /api/users  — Gestion des comptes utilisateurs CRM
 * Toutes les routes nécessitent auth. Création/suppression réservées à l'admin.
 */
const express  = require('express');
const router   = express.Router();
const db       = require('../db');
const { hashPassword } = require('../lib/auth-helpers');

const COOKIE_OPTS = {
  signed  : true,
  httpOnly: true,
  sameSite: 'lax',
  maxAge  : 7 * 24 * 60 * 60 * 1000
};

// ── GET /api/users — liste tous les utilisateurs (tous les membres) ─────────
router.get('/', async (req, res) => {
  // Admins voient tout, membres voient les infos publiques (nom + avatar)
  const select = req.user.role === 'admin'
    ? 'id, name, email, role, lang, avatar_type, avatar_value, sections, created_at'
    : 'id, name, avatar_type, avatar_value';
  const { data, error } = await db.from('crm_users').select(select).order('created_at');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── POST /api/users — créer un utilisateur (admin seulement) ─────────────
router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin requis' });
  const { name, email, password, role = 'member', lang = 'fr', avatar_type = 'preset', avatar_value = '1', sections = null } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email et password requis' });

  const password_hash = await hashPassword(password);
  const { data, error } = await db.from('crm_users').insert({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password_hash,
    role,
    lang,
    avatar_type,
    avatar_value,
    sections: sections && sections.length ? sections : null,
  }).select('id, name, email, role, lang, avatar_type, avatar_value, sections').single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// ── PATCH /api/users/:id — modifier un utilisateur (admin seulement) ────────
router.patch('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin requis' });
  const { name, role, lang, sections } = req.body;
  const updates = {};
  if (name)    updates.name = name.trim();
  if (role)    updates.role = role;
  if (lang)    updates.lang = lang;
  if ('sections' in req.body) updates.sections = (sections && sections.length && role !== 'admin') ? sections : null;

  const { data, error } = await db.from('crm_users')
    .update(updates).eq('id', req.params.id)
    .select('id, name, email, role, lang, avatar_type, avatar_value, sections').single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── DELETE /api/users/:id — supprimer un utilisateur (admin seulement) ────
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin requis' });
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Impossible de se supprimer soi-même' });
  const { error } = await db.from('crm_users').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── PATCH /api/users/me — mettre à jour son propre profil ─────────────────
router.patch('/me', async (req, res) => {
  const { name, lang, avatar_type, avatar_value } = req.body;
  if (!req.user.id) return res.status(400).json({ error: 'Compte legacy — créez un vrai compte' });

  const updates = {};
  if (name) updates.name = name.trim();
  if (lang) updates.lang = lang;
  if (avatar_type) updates.avatar_type = avatar_type;
  if (avatar_value !== undefined) updates.avatar_value = avatar_value;

  const { data, error } = await db.from('crm_users')
    .update(updates).eq('id', req.user.id)
    .select('id, name, email, role, lang, avatar_type, avatar_value').single();

  if (error) return res.status(500).json({ error: error.message });

  const { avatar_value: _ignored, ...cookiePayload } = data;
  res.cookie('crm_auth', JSON.stringify(cookiePayload), COOKIE_OPTS);
  res.json(data);
});

// ── POST /api/users/me/password — changer son mot de passe ───────────────
router.post('/me/password', async (req, res) => {
  if (!req.user.id) return res.status(400).json({ error: 'Compte legacy — créez un vrai compte' });
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Les deux mots de passe sont requis' });
  if (new_password.length < 6) return res.status(400).json({ error: 'Minimum 6 caractères' });

  const { data: user } = await db.from('crm_users').select('password_hash').eq('id', req.user.id).single();
  const { verifyPassword } = require('../lib/auth-helpers');
  const ok = await verifyPassword(current_password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });

  const password_hash = await hashPassword(new_password);
  await db.from('crm_users').update({ password_hash }).eq('id', req.user.id);
  res.json({ ok: true });
});

// ── POST /api/users/me/avatar — uploader une photo de profil ─────────────
router.post('/me/avatar', async (req, res) => {
  if (!req.user.id) return res.status(400).json({ error: 'Compte legacy — créez un vrai compte' });
  const { data_url } = req.body; // base64 data URL envoyée depuis le frontend
  if (!data_url || !data_url.startsWith('data:image/')) return res.status(400).json({ error: 'Image invalide' });

  // Taille max 800 KB
  const bytes = Buffer.byteLength(data_url, 'utf8');
  if (bytes > 800 * 1024) return res.status(400).json({ error: 'Image trop lourde (max 800 Ko)' });

  const { data, error } = await db.from('crm_users')
    .update({ avatar_type: 'upload', avatar_value: data_url })
    .eq('id', req.user.id)
    .select('id, name, email, role, lang, avatar_type, avatar_value').single();

  if (error) return res.status(500).json({ error: error.message });
  const { avatar_value: _av, ...cookiePayload2 } = data;
  res.cookie('crm_auth', JSON.stringify(cookiePayload2), COOKIE_OPTS);
  res.json(data);
});

// ── POST /api/users/:id/reset-password — reset mdp par l'admin ───────────
router.post('/:id/reset-password', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin requis' });
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) return res.status(400).json({ error: 'Minimum 6 caractères' });
  const password_hash = await hashPassword(new_password);
  const { error } = await db.from('crm_users').update({ password_hash }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
