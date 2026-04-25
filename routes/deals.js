const express    = require('express');
const router     = express.Router();
const db         = require('../db');
const PDFDocument = require('pdfkit');

function flattenDeal(d) {
  return {
    ...d,
    client_name         : d.clients?.name || d.client_custom,
    client_whatsapp     : d.clients?.whatsapp,
    property_title      : d.properties?.title,
    property_price      : d.properties?.price,
    property_zone       : d.properties?.zone,
    property_description: d.properties?.description,
    property_photos     : d.properties?.photos,
    // property_custom and client_custom already in ...d
    clients             : undefined,
    properties          : undefined,
  };
}

const dealSelect = `*, clients!client_id(name, whatsapp), properties!property_id(title, price, zone, description, photos)`;

router.get('/', async (req, res) => {
  const { data, error } = await db.from('deals')
    .select(dealSelect).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(flattenDeal));
});

router.post('/', async (req, res) => {
  const { client_id, client_custom, property_id, property_custom, status, notes, lease_start, lease_end, monthly_rent, deposit, commission_amount, commission_paid } = req.body;
  const { data, error } = await db.from('deals')
    .insert({ client_id: client_id || null, client_custom: client_id ? null : (client_custom || null),
      property_id: property_id || null, property_custom: property_custom || null,
      status: status || 'En cours', notes: notes || '',
      lease_start: lease_start || null, lease_end: lease_end || null,
      monthly_rent: monthly_rent || null, deposit: deposit || null,
      commission_amount: commission_amount || null,
      commission_paid: commission_paid ? true : false })
    .select(dealSelect).single();
  if (error) return res.status(500).json({ error: error.message });
  if (status === 'Signé') await db.from('properties').update({ status: 'Loué' }).eq('id', property_id);
  res.json(flattenDeal(data));
});

router.put('/:id', async (req, res) => {
  const { client_id, client_custom, property_id, property_custom, status, notes, lease_start, lease_end, monthly_rent, deposit, commission_amount, commission_paid } = req.body;
  const { data, error } = await db.from('deals')
    .update({ client_id: client_id || null, client_custom: client_id ? null : (client_custom || null),
      property_id: property_id || null, property_custom: property_custom || null,
      status, notes: notes || '',
      lease_start: lease_start || null, lease_end: lease_end || null,
      monthly_rent: monthly_rent || null, deposit: deposit || null,
      commission_amount: commission_amount || null,
      commission_paid: commission_paid ? true : false,
      updated_at: new Date().toISOString() })
    .eq('id', req.params.id).select(dealSelect).single();
  if (error) return res.status(500).json({ error: error.message });
  if (status === 'Signé') await db.from('properties').update({ status: 'Loué' }).eq('id', property_id);
  else if (status === 'Annulé') await db.from('properties').update({ status: 'Disponible' }).eq('id', property_id);
  res.json(flattenDeal(data));
});

router.patch('/:id/commission', async (req, res) => {
  const { commission_paid } = req.body;
  const { error } = await db.from('deals').update({ commission_paid }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ commission_paid });
});

router.delete('/:id', async (req, res) => {
  const { error } = await db.from('deals').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// PDF generation
router.get('/:id/pdf', async (req, res) => {
  const { data: deal, error } = await db.from('deals')
    .select(dealSelect).eq('id', req.params.id).single();
  if (error || !deal) return res.status(404).json({ error: 'Deal non trouvé' });

  const d = flattenDeal(deal);
  const photos = JSON.parse(d.property_photos || '[]');
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="bien-${d.id}.pdf"`);
  doc.pipe(res);

  doc.rect(0, 0, 595, 80).fill('#0f0f0f');
  doc.fontSize(22).fillColor('#d4a853').text(d.property_title || 'Fiche Bien', 50, 25, { align: 'center' });
  doc.moveDown(3);

  if (d.property_price) {
    doc.fontSize(18).fillColor('#333').text(`${Number(d.property_price).toLocaleString('fr-FR')} THB / mois`, { align: 'center' });
  }
  if (d.property_zone) {
    doc.fontSize(12).fillColor('#666').text(`Zone : ${d.property_zone}`, { align: 'center' });
  }

  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.5).strokeColor('#ddd').stroke();
  doc.moveDown();

  if (d.property_description) {
    doc.fontSize(11).fillColor('#333').text(d.property_description, { lineGap: 4 });
  }

  if (photos.length > 0) {
    doc.moveDown();
    doc.fontSize(10).fillColor('#999').text('Photos :');
    photos.forEach(url => {
      doc.fontSize(9).fillColor('#3b82f6').text(url, { link: url, underline: true });
    });
  }

  doc.moveDown(2);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.5).strokeColor('#eee').stroke();
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor('#aaa')
    .text(`Préparé pour : ${d.client_name || ''}  |  Document confidentiel`, { align: 'center' });

  doc.end();
});

module.exports = router;
