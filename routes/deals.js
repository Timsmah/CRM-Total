const express = require('express');
const router = express.Router();
const db = require('../db');
const PDFDocument = require('pdfkit');

const dealQuery = `
  SELECT d.*, c.name as client_name, c.whatsapp as client_whatsapp,
         p.title as property_title, p.price as property_price,
         p.zone as property_zone, p.description as property_description,
         p.photos as property_photos
  FROM deals d
  LEFT JOIN clients c ON d.client_id = c.id
  LEFT JOIN properties p ON d.property_id = p.id
`;

router.get('/', (req, res) => {
  const deals = db.prepare(dealQuery + ' ORDER BY d.created_at DESC').all();
  res.json(deals);
});

router.post('/', (req, res) => {
  const { client_id, property_id, status, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO deals (client_id, property_id, status, notes)
    VALUES (?, ?, ?, ?)
  `).run(client_id, property_id, status || 'En cours', notes || '');

  if (status === 'Signé') {
    db.prepare("UPDATE properties SET status = 'Loué' WHERE id = ?").run(property_id);
  }

  res.json(db.prepare(dealQuery + ' WHERE d.id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { client_id, property_id, status, notes } = req.body;
  db.prepare(`
    UPDATE deals SET client_id=?, property_id=?, status=?, notes=?,
    updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(client_id, property_id, status, notes, req.params.id);

  if (status === 'Signé') {
    db.prepare("UPDATE properties SET status = 'Loué' WHERE id = ?").run(property_id);
  } else if (status === 'Annulé') {
    db.prepare("UPDATE properties SET status = 'Disponible' WHERE id = ?").run(property_id);
  }

  res.json(db.prepare(dealQuery + ' WHERE d.id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM deals WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// PDF generation
router.get('/:id/pdf', (req, res) => {
  const deal = db.prepare(dealQuery + ' WHERE d.id = ?').get(req.params.id);
  if (!deal) return res.status(404).json({ error: 'Deal non trouvé' });

  const photos = JSON.parse(deal.property_photos || '[]');
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="bien-${deal.id}.pdf"`);
  doc.pipe(res);

  // Header band
  doc.rect(0, 0, 595, 80).fill('#0f0f0f');
  doc.fontSize(22).fillColor('#d4a853').text(deal.property_title || 'Fiche Bien', 50, 25, { align: 'center' });

  doc.moveDown(3);

  // Price & zone
  if (deal.property_price) {
    doc.fontSize(18).fillColor('#333')
      .text(`${Number(deal.property_price).toLocaleString('fr-FR')} THB / mois`, { align: 'center' });
  }
  if (deal.property_zone) {
    doc.fontSize(12).fillColor('#666').text(`Zone : ${deal.property_zone}`, { align: 'center' });
  }

  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.5).strokeColor('#ddd').stroke();
  doc.moveDown();

  // Description
  if (deal.property_description) {
    doc.fontSize(11).fillColor('#333').text(deal.property_description, { lineGap: 4 });
  }

  // Photo URLs
  if (photos.length > 0) {
    doc.moveDown();
    doc.fontSize(10).fillColor('#999').text('Photos :');
    photos.forEach(url => {
      doc.fontSize(9).fillColor('#3b82f6').text(url, { link: url, underline: true });
    });
  }

  // Client info
  doc.moveDown(2);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.5).strokeColor('#eee').stroke();
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor('#aaa')
    .text(`Préparé pour : ${deal.client_name || ''}  |  Document confidentiel`, { align: 'center' });

  doc.end();
});

module.exports = router;
