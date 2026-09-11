/**
 * POST /api/leads
 * Reçoit les soumissions du formulaire timthld.com en temps réel.
 * Crée ou met à jour le client dans Supabase (dédup par numéro de téléphone).
 * Route publique — protégée par un secret partagé (LEADS_SECRET en env var).
 */
const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.post('/', async (req, res) => {
  // Vérification du secret partagé (header X-Leads-Secret)
  const secret = process.env.LEADS_SECRET;
  if (secret && req.headers['x-leads-secret'] !== secret) {
    return res.status(401).json({ error: 'Secret invalide' });
  }

  try {
    const {
      nom, tel, projet, localisation, typeBien, ville,
      chambres, budgetThb, budgetEur, dateEmmenagement,
      duree, quartiers, criteres
    } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: 'Champ nom requis' });
    }

    // Nettoyage du numéro de téléphone
    const phone = tel ? String(tel).replace(/\D/g, '') : null;

    const payload = {
      name           : nom.trim(),
      whatsapp       : phone || null,
      budget_max     : parseInt(budgetThb) || null,
      budget_eur     : parseInt(budgetEur) || null,
      zones          : quartiers || localisation || null,
      criteria       : criteres || null,
      property_type  : typeBien || null,
      city           : ville || null,
      bedrooms       : chambres || null,
      move_in_date   : dateEmmenagement || null,
      duration       : duree || null,
      project        : projet || null,
      source         : 'Formulaire',
      status         : 'Prospect',
      contact_status : 'À contacter',
    };

    // Dédup par téléphone si disponible, sinon insert
    let clientId = null;
    if (phone) {
      const { data: existing } = await db.from('clients')
        .select('id').eq('whatsapp', phone).maybeSingle();
      if (existing) {
        // Mise à jour du client existant (sans écraser les champs déjà remplis)
        await db.from('clients').update(payload).eq('id', existing.id);
        clientId = existing.id;
      }
    }

    if (!clientId) {
      const { data: inserted, error } = await db.from('clients')
        .insert(payload).select('id').single();
      if (error) throw new Error(error.message);
      clientId = inserted.id;
    }

    // Log activité "formulaire reçu"
    await db.from('activities').insert({
      client_id : clientId,
      type      : 'note',
      author    : 'Système',
      content   : `📋 Formulaire reçu depuis timthld.com${projet ? ` — projet : ${projet}` : ''}`,
    });

    res.json({ ok: true, client_id: clientId });
  } catch (err) {
    console.error('Leads error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
