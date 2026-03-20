require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'crm-bkk-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

const requireAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) return next();
  res.status(401).json({ error: 'Non autorisé' });
};

// Auth (public)
app.use('/api/auth', require('./routes/auth'));

// Chrome extension import — uses API key, not session
app.post('/api/properties/import', (req, res, next) => {
  const key = req.headers['x-import-key'];
  if (!process.env.IMPORT_KEY || key !== process.env.IMPORT_KEY) {
    return res.status(401).json({ error: 'Clé d\'import invalide' });
  }
  next();
}, require('./routes/propertyImport'));

// Protected routes
app.use('/api/clients', requireAuth, require('./routes/clients'));
app.use('/api/properties', requireAuth, require('./routes/properties'));
app.use('/api/deals', requireAuth, require('./routes/deals'));
app.use('/api/finance', requireAuth, require('./routes/finance'));

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
