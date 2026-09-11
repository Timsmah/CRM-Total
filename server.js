require('dotenv').config();
const express      = require('express');
const cookieParser = require('cookie-parser');
const path         = require('path');

const app    = express();
const SECRET = process.env.SESSION_SECRET || 'crm-bkk-secret';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(SECRET));

// ── Auth middleware — supporte ancien cookie ('admin'/'guest') ET nouveau JSON ─
const requireAuth = (req, res, next) => {
  const val = req.signedCookies?.crm_auth;
  if (!val) return res.status(401).json({ error: 'Non autorisé' });

  // Legacy
  if (val === 'admin') { req.user = { id: null, name: 'Tim',  role: 'admin',  lang: 'fr', avatar_type: 'preset', avatar_value: '1' }; return next(); }
  if (val === 'guest') { req.user = { id: null, name: 'Nono', role: 'guest',  lang: 'fr', avatar_type: 'preset', avatar_value: '2' }; return next(); }

  // Nouveau format JSON
  try {
    const user = JSON.parse(val);
    if (user?.id) { req.user = user; return next(); }
  } catch {}

  res.status(401).json({ error: 'Non autorisé' });
};

// Admin-only routes (finance, contracts)
const requireAdmin = (req, res, next) => {
  const val = req.signedCookies?.crm_auth;
  if (val === 'admin') return next();
  try { const u = JSON.parse(val || '{}'); if (u.role === 'admin') return next(); } catch {}
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
