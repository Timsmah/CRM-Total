require('dotenv').config();
const express      = require('express');
const cookieParser = require('cookie-parser');
const path         = require('path');

const app    = express();
const SECRET = process.env.SESSION_SECRET || 'crm-bkk-secret';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(SECRET));

// ── Auth middleware ────────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  const val = req.signedCookies?.crm_auth;
  if (!val) return res.status(401).json({ error: 'Non autorisé' });
  try {
    const user = JSON.parse(val);
    if (user?.id) { req.user = user; return next(); }
  } catch {}
  res.status(401).json({ error: 'Non autorisé' });
};

// Admin-only routes (finance, contracts)
const requireAdmin = (req, res, next) => {
  try { const u = JSON.parse(req.signedCookies?.crm_auth || '{}'); if (u.role === 'admin') return next(); } catch {}
  res.status(403).json({ error: 'Accès réservé à l\'administrateur' });
};

// Auth & public routes
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/listing', require('./routes/listing'));

// Public inbound routes (form + Calendly webhook — pas de session requise)
app.use('/api/leads',    require('./routes/leads'));
app.use('/api/webhooks', require('./routes/webhooks'));

// Gestion des utilisateurs (nécessite auth)
app.use('/api/users', requireAuth, require('./routes/users'));

// Public properties endpoint for HSC website (no auth)
app.get('/api/properties/public', require('./routes/properties').publicHandler);

// Public listing page
app.get('/listing/:token', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'listing.html'));
});

// Bot scraping — lecture seule, protégée par BOT_API_KEY
app.get('/api/bot/properties', async (req, res) => {
  const key = req.headers['x-api-key'];
  if (!process.env.BOT_API_KEY || key !== process.env.BOT_API_KEY)
    return res.status(401).json({ error: 'Clé invalide' });
  const db = require('./db');
  const { data, error } = await db.from('properties')
    .select('id, title, price, zone, floor, room_type, sqm, status, photos, cached_photos, drive_link, created_at')
    .eq('archived', 0)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Bot scraping — clients en recherche active uniquement (pour matching)
app.get('/api/bot/clients', async (req, res) => {
  const key = req.headers['x-api-key'];
  if (!process.env.BOT_API_KEY || key !== process.env.BOT_API_KEY)
    return res.status(401).json({ error: 'Clé invalide' });
  const db = require('./db');
  const { data, error } = await db.from('clients')
    .select('id, name, status, contact_status, project, property_type, bedrooms, budget_min, budget_max, zones, criteria, move_in_date, duration')
    .eq('archived', 0)
    .eq('status', 'Recherche active')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Chrome extension import — uses API key, not session
app.post('/api/properties/import', (req, res, next) => {
  const key = req.headers['x-import-key'];
  if (!process.env.IMPORT_KEY || key !== process.env.IMPORT_KEY) {
    return res.status(401).json({ error: 'Clé d\'import invalide' });
  }
  next();
}, require('./routes/propertyImport'));

// Protected routes
app.use('/api/drive',      requireAuth, require('./routes/drive'));
app.use('/api/clients',    requireAuth, require('./routes/clients'));
app.use('/api/properties', requireAuth, require('./routes/properties'));
app.use('/api/deals',      requireAuth, require('./routes/deals'));
app.use('/api/finance',    requireAdmin, require('./routes/finance'));
app.use('/api/proposals',  requireAuth, require('./routes/proposals'));
app.use('/api/activities',  requireAuth, require('./routes/activities'));
app.use('/api/call-lists', requireAuth, require('./routes/call-lists'));
app.use('/api/notes',     requireAuth, require('./routes/notes'));
app.use('/api/visas',     requireAuth, require('./routes/visas'));

// Static files & SPA fallback — no-cache on JS/CSS so deploys take effect immediately
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Local dev
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`CRM Bangkok → http://localhost:${PORT}`));
}

// Vercel serverless export
module.exports = app;
