require('dotenv').config();
const express      = require('express');
const cookieParser = require('cookie-parser');
const path         = require('path');

const app    = express();
const SECRET = process.env.SESSION_SECRET || 'crm-bkk-secret';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(SECRET));

// ── Auth middleware (signed cookie, works across serverless instances) ──────
const requireAuth = (req, res, next) => {
  if (req.signedCookies && req.signedCookies.crm_auth === '1') return next();
  res.status(401).json({ error: 'Non autorisé' });
};

// Auth & public routes
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/listing', require('./routes/listing'));

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
app.use('/api/finance',    requireAuth, require('./routes/finance'));

// Static files & SPA fallback
app.use(express.static(path.join(__dirname, 'public')));
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
