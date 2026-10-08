/**
 * POST /api/webhooks/calendly
 * Reçoit les événements Calendly (invitee.created = nouvelle réservation).
 * Loggue une activité sur le client correspondant (match par email ou téléphone).
 * Route publique — Calendly signe les requêtes avec CALENDLY_WEBHOOK_SECRET.
 */
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const crypto  = require('crypto');

// Vérifie la signature Calendly (optionnel mais recommandé)
function verifyCalendlySignature(req) {
  const secret = process.env.CALENDLY_WEBHOOK_SECRET;
  if (!secret) return true; // pas de secret configuré → on laisse passer

  const signature = req.headers['calendly-webhook-signature'];
  if (!signature) return false;

  // Format Calendly : "t=<timestamp>,v1=<hmac>"
  const parts = Object.fromEntries(signature.split(',').map(p => p.split('=')));
  const ts    = parts.t;
  const v1    = parts.v1;
  if (!ts || !v1) return false;

  const body   = JSON.stringify(req.body);
  const toSign = `${ts}.${body}`;
  const hmac   = crypto.createHmac('sha256', secret).update(toSign).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(v1));
}

router.post('/calendly', async (req, res) => {
  // Vérification signature
  if (!verifyCalendlySignature(req)) {
    return res.status(401).json({ error: 'Signature invalide' });
  }

  try {
    const event = req.body;
    const type  = event?.event;

    // On ne traite que les nouvelles réservations
    if (type !== 'invitee.created') {
      return res.json({ ok: true, skipped: true });
    }

    const payload  = event.payload || {};
    const invitee  = payload.invitee || {};
    const email    = invitee.email || null;
    const name     = invitee.name  || null;
    const phone    = invitee.text_reminder_number
      ? String(invitee.text_reminder_number).replace(/\D/g, '') : null;

    const eventName   = payload.event_type?.name || 'Appel';
    const startTime   = payload.scheduled_event?.start_time || null;
    const startFR     = startTime
      ? new Date(startTime).toLocaleString('fr-FR', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short' })
      : null;

    // Cherche le client par email, puis par téléphone
    let clientId = null;

    if (email) {
      // On cherche dans les activités ou dans un champ email si tu l'ajoutes plus tard
      // Pour l'instant on matche sur le nom (Calendly donne le nom complet)
    }

    if (!clientId && phone) {
      const { data } = await db.from('clients').select('id')
        .eq('whatsapp', phone).maybeSingle();
      if (data) clientId = data.id;
    }

    // Si toujours pas trouvé et qu'on a un nom → crée un prospect
    if (!clientId && name) {
      const { data: inserted, error } = await db.from('clients').insert({
        name,
        whatsapp       : phone || null,
        source         : 'Calendly',
        status         : 'Prospect',
        contact_status : 'Contacté',
      }).select('id').single();
      if (error) throw new Error(error.message);
      clientId = inserted.id;
    }

    if (!clientId) {
      return res.json({ ok: true, skipped: true, reason: 'Client introuvable et nom manquant' });
    }

    // Log l'activité "appel réservé"
    const noteContent = [
      `📅 Appel Calendly réservé : ${eventName}`,
      startFR ? `🕐 Le ${startFR} (Bangkok)` : null,
      email    ? `📧 ${email}` : null,
    ].filter(Boolean).join('\n');

    await db.from('activities').insert({
      client_id : clientId,
      type      : 'call',
      author    : 'Calendly',
      content   : noteContent,
    });

    // Avance vers "Contacté" si le client est encore en "À contacter"
    const { data: client } = await db.from('clients').select('contact_status').eq('id', clientId).single();
    if (client?.contact_status === 'À contacter') {
      await db.from('clients').update({ contact_status: 'Contacté' }).eq('id', clientId);
    }

    res.json({ ok: true, client_id: clientId });
  } catch (err) {
    console.error('Calendly webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Webhook formulaire HSC (web3forms) ────────────────────────────────────────
// POST /api/webhooks/hsc
// web3forms envoie les champs du formulaire en JSON.
// Protégé par HSC_WEBHOOK_SECRET en query param (?secret=...) ou header X-HSC-Secret.
router.post('/hsc', async (req, res) => {
  const secret = process.env.HSC_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.query.secret || req.headers['x-hsc-secret'];
    if (provided !== secret) return res.status(401).json({ error: 'Secret invalide' });
  }

  try {
    const b = req.body || {};

    // Champs acceptés : noms camelCase (timthld.com) ET labels français (web3forms)
    const nom          = b.nom    || b.name   || b['Nom']          || null;
    const tel          = b.tel    || b.phone  || b['Téléphone']    || b['Tel'] || null;
    const projet       = b.projet || b['Projet']                   || null;
    const localisation = b.localisation || b['Localisation']       || null;
    const typeBien     = b.typeBien     || b['Type de bien']       || null;
    const ville        = b.ville        || b['Ville']              || null;
    const chambres     = b.chambres     || b['Chambres']           || null;
    const budgetThbRaw = b.budgetThb    || b['Budget THB']         || b['Budget'] || null;
    const budgetEurRaw = b.budgetEur    || b['Budget EUR']         || null;
    const dateEmmen    = b.dateEmmenagement || b['Emménagement']   || null;
    const duree        = b.duree        || b['Durée']              || null;
    const quartiers    = b.quartiers    || b['Quartiers']          || null;
    const criteres     = b.criteres     || b['Critères']           || null;
    const email        = b.email        || b['Email']              || null;

    if (!nom || !String(nom).trim()) {
      return res.status(400).json({ error: 'Champ nom requis' });
    }

    const parseBudget = (raw) => {
      if (!raw) return null;
      const digits = String(raw).replace(/[^\d]/g, '');
      return parseInt(digits) || null;
    };

    const phone = tel ? String(tel).replace(/\D/g, '') : null;

    const payload = {
      name           : String(nom).trim(),
      whatsapp       : phone || null,
      budget_max     : parseBudget(budgetThbRaw),
      budget_eur     : parseBudget(budgetEurRaw),
      zones          : quartiers || localisation || null,
      criteria       : criteres || null,
      property_type  : typeBien || null,
      city           : ville || null,
      bedrooms       : chambres || null,
      move_in_date   : dateEmmen || null,
      duration       : duree || null,
      project        : projet || null,
      source         : 'Formulaire HSC',
      status         : 'Prospect',
      contact_status : 'Nouveau',
    };

    let clientId = null;
    if (phone) {
      const { data } = await db.from('clients').select('id').eq('whatsapp', phone).maybeSingle();
      if (data) { await db.from('clients').update(payload).eq('id', data.id); clientId = data.id; }
    }

    if (!clientId) {
      const { data: inserted, error } = await db.from('clients').insert(payload).select('id').single();
      if (error) throw new Error(error.message);
      clientId = inserted.id;
    }

    await db.from('activities').insert({
      client_id : clientId,
      type      : 'note',
      author    : 'Système',
      content   : `📋 Formulaire HSC reçu${email ? ` — ${email}` : ''}${projet ? ` — projet : ${projet}` : ''}`,
    });

    res.json({ ok: true, client_id: clientId });
  } catch (err) {
    console.error('HSC webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
