const express = require('express');
const router  = express.Router();
const db      = require('../db');

const parseJSON  = (v) => { if (Array.isArray(v)) return v; try { return JSON.parse(v || '[]'); } catch { return []; } };
const parsePhotos = (p) => { p.photos = parseJSON(p.photos); p.cached_photos = parseJSON(p.cached_photos); return p; };

// Simple CSV parser (gère les champs entre guillemets)
function parseCSV(text) {
  return text.trim().split('\n').map(line => {
    const fields = [];
    let field = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuotes = !inQuotes; }
      else if (line[i] === ',' && !inQuotes) { fields.push(field.trim()); field = ''; }
      else { field += line[i]; }
    }
    fields.push(field.trim());
    return fields;
  });
}

router.get('/', async (req, res) => {
  const archived = req.query.archived === 'true' ? 1 : 0;
  const { data, error } = await db.from('properties')
    .select('*').eq('archived', archived).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(parsePhotos));
});

router.get('/:id', async (req, res) => {
  const { data, error } = await db.from('properties').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Bien non trouvé' });
  res.json(parsePhotos(data));
});

router.post('/', async (req, res) => {
  const { title, price, zone, description, photos, status, external_url } = req.body;
  const photosStr = JSON.stringify(Array.isArray(photos) ? photos : []);
  const { data, error } = await db.from('properties')
    .insert({ title, price: price || null, zone: zone || '', description: description || '',
              photos: photosStr, status: status || 'Disponible', external_url: external_url || null })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(parsePhotos(data));
});

router.put('/:id', async (req, res) => {
  const { title, price, zone, description, photos, status, archived, external_url } = req.body;
  const photosStr = JSON.stringify(Array.isArray(photos) ? photos : []);
  const { data, error } = await db.from('properties')
    .update({ title, price: price || null, zone, description, photos: photosStr,
              status, archived: archived ? 1 : 0, external_url: external_url || null })
    .eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(parsePhotos(data));
});

router.delete('/:id', async (req, res) => {
  const { error } = await db.from('properties').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

router.patch('/:id/archive', async (req, res) => {
  const { data: prop, error: fetchErr } = await db.from('properties').select('archived').eq('id', req.params.id).single();
  if (fetchErr) return res.status(404).json({ error: 'Bien non trouvé' });
  const newVal = prop.archived ? 0 : 1;
  await db.from('properties').update({ archived: newVal }).eq('id', req.params.id);
  res.json({ archived: !!newVal });
});

// Sync depuis Google Sheet public (CSV)
router.post('/sync/sheets', async (req, res) => {
  try {
    const SHEET_ID = '1S7Hwemso7y2wxWH7CvmJ17BzMikpzW_P49jfqxys-NA';
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) throw new Error(`Sheet HTTP ${response.status}`);

    const rows = parseCSV(await response.text()).slice(1); // skip header
    let imported = 0, updated = 0;

    const payload = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r[2] || !r[2].trim()) continue;
      payload.push({
        title        : r[2].trim(),
        zone         : r[0].trim(),
        room_no      : r[3].trim(),
        floor        : r[4].trim(),
        room_type    : r[5].trim(),
        sqm          : r[6].trim(),
        price        : parseInt(r[7].replace(/[^0-9]/g, '')) || null,
        owner_contact: r[8].trim(),
        drive_link   : r[9] ? r[9].trim() : '',
        status       : 'Disponible',
        sheet_row    : i + 2,
        photos       : '[]'
      });
    }

    if (payload.length) {
      const { error } = await db.from('properties')
        .upsert(payload, { onConflict: 'sheet_row', ignoreDuplicates: false });
      if (error) throw new Error(error.message);
    }

    res.json({ imported: payload.length, updated: 0, total: payload.length });
  } catch (err) {
    console.error('Properties sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Cache photos depuis Drive pour toutes les propriétés
router.post('/cache-photos', async (req, res) => {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'GOOGLE_DRIVE_API_KEY manquant' });

  const { data: props } = await db.from('properties')
    .select('id, drive_link').not('drive_link', 'is', null).neq('drive_link', '');

  const photoMap = {}; // propId → [{id, thumbnail}]
  const errors   = [];

  const fetchFolder = async (p) => {
    const m = p.drive_link.match(/folders\/([a-zA-Z0-9_-]+)/);
    if (!m) { errors.push({ id: p.id, reason: 'no_folder_id' }); return; }
    const folderId = m[1];
    try {
      // Sans filtre MIME — on prend tous les fichiers du dossier
      const url = `https://www.googleapis.com/drive/v3/files`
        + `?q='${folderId}'+in+parents`
        + `&fields=files(id,name,mimeType)&orderBy=name&pageSize=50&key=${apiKey}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.error) { errors.push({ id: p.id, reason: d.error.message }); return; }
      const files = (d.files || [])
        .filter(f => f.mimeType && (f.mimeType.startsWith('image/') || f.mimeType === 'application/octet-stream'))
        .map(f => ({ id: f.id, thumbnail: `https://drive.google.com/thumbnail?id=${f.id}&sz=w800` }));
      photoMap[p.id] = files;
      await db.from('properties').update({ cached_photos: JSON.stringify(files) }).eq('id', p.id);
    } catch (err) { errors.push({ id: p.id, reason: err.message }); }
  };

  // Batches de 4 avec 150ms entre chaque pour éviter le rate-limit Drive
  const BATCH = 4;
  for (let i = 0; i < (props || []).length; i += BATCH) {
    await Promise.all((props || []).slice(i, i + BATCH).map(fetchFolder));
    if (i + BATCH < (props || []).length) await new Promise(r => setTimeout(r, 150));
  }

  res.json({
    cached  : Object.keys(photoMap).length,
    total   : (props || []).length,
    errors,          // visible dans la console si besoin
    photoMap          // renvoyé au frontend pour affichage immédiat sans re-fetch Supabase
  });
});

module.exports = router;
