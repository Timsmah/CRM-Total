const Deals = {
  data: [],
  clients: [],
  properties: [],

  async load() {
    [this.data, this.clients, this.properties] = await Promise.all([
      api.get('/deals'),
      api.get('/clients'),
      api.get('/properties'),
    ]);
  },

  _mobileTab: 'En cours',

  render() {
    if (isMobile()) { this.renderMobile(); return; }
    document.getElementById('content').innerHTML = `
      <div class="section-header">
        <h2>Deals</h2>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="Deals.openAddModal()">+ Nouveau deal</button>
        </div>
      </div>
      <div class="deals-list">
        ${this.data.map(d => this.cardHTML(d)).join('') || '<p class="empty">Aucun deal</p>'}
      </div>`;
  },

  renderMobile() {
    const statuses = ['En cours','Envoyé au client','Visite planifiée','Signé','Annulé'];
    const tab = this._mobileTab;
    const byStatus = (s) => this.data.filter(d => d.status === s);
    const NEXT = { 'En cours': 'Envoyé au client', 'Envoyé au client': 'Visite planifiée', 'Visite planifiée': 'Signé' };

    const tabsHTML = statuses.map(s => {
      const n = byStatus(s).length;
      return `<div class="mobile-deal-tab${s === tab ? ' active' : ''}" onclick="Deals.setMobileTab('${s}')">
        ${s}<span class="mobile-deal-tab-count">${n}</span>
      </div>`;
    }).join('');

    const colItems = byStatus(tab);
    const next = NEXT[tab];
    const cardsHTML = colItems.length
      ? colItems.map(d => {
          const price = d.property_price ? Number(d.property_price).toLocaleString('fr-FR') + ' ฿' : '';
          const advBtn = next ? `<button class="mobile-deal-btn advance" onclick="event.stopPropagation();Deals.advance(${d.id},'${next}')">→ ${next.split(' ')[0]}</button>` : '';
          return `<div class="mobile-deal-card" onclick="Deals.openEditModal(${d.id})">
            <div class="mobile-deal-name">${d.client_name || '—'}</div>
            <div class="mobile-deal-prop">${d.property_title || '—'}${d.property_zone ? ' · ' + d.property_zone : ''}</div>
            <div class="mobile-deal-footer">
              <span class="mobile-deal-price">${price}</span>
              <div class="mobile-deal-btns">
                ${d.client_whatsapp ? `<button class="mobile-deal-btn" onclick="event.stopPropagation();Deals.sendToClient(${d.id})">📤</button>` : ''}
                ${advBtn}
              </div>
            </div>
          </div>`;
        }).join('')
      : '<p class="empty" style="padding:20px">Aucun deal ici</p>';

    document.getElementById('content').innerHTML = `
      <div class="section-header" style="padding:14px 14px 10px">
        <h2>Deals</h2>
        <button class="btn btn-primary btn-sm" onclick="Deals.openAddModal()">+ Nouveau</button>
      </div>
      <div class="mobile-deals-wrap">
        <div class="mobile-deals-tabs">${tabsHTML}</div>
        <div class="mobile-deals-col">${cardsHTML}</div>
      </div>`;
  },

  setMobileTab(status) {
    this._mobileTab = status;
    this.renderMobile();
  },

  async advance(id, nextStatus) {
    try {
      const d = this.data.find(x => x.id === id);
      await api.put(`/deals/${id}`, { ...d, status: nextStatus });
      d.status = nextStatus;
      Toast.show(`→ ${nextStatus}`);
      this.renderMobile();
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  cardHTML(d) {
    const price = d.property_price
      ? ` · ${Number(d.property_price).toLocaleString('fr-FR')} THB/mois` : '';
    return `
      <div class="deal-card">
        <div class="deal-info">
          <div class="deal-title">
            ${d.client_name || '—'}
            <span class="arrow">→</span>
            ${d.property_title || '—'}
          </div>
          <div class="deal-meta">
            ${d.property_zone ? d.property_zone : ''}${price}
            · ${fmtDate(d.created_at)}
          </div>
          ${d.notes ? `<div style="font-size:12px;color:var(--text-2);margin-top:4px;font-style:italic">${d.notes}</div>` : ''}
        </div>
        <div style="flex-shrink:0">${badge(d.status)}</div>
        <div class="deal-actions">
          <button class="btn btn-secondary btn-sm" onclick="Deals.openEditModal(${d.id})">Modifier</button>
          <button class="btn btn-wa btn-sm" onclick="Deals.sendToClient(${d.id})">📤 Envoyer</button>
          <button class="btn btn-ghost btn-sm" onclick="Deals.remove(${d.id})" title="Supprimer">✕</button>
        </div>
      </div>`;
  },

  openAddModal() {
    Modal.open('Nouveau deal', this.formHTML(null));
  },

  openEditModal(id) {
    const d = this.data.find(x => x.id === id);
    Modal.open('Modifier le deal', this.formHTML(d));
  },

  formHTML(d) {
    const statuses = ['En cours','Envoyé au client','Visite planifiée','Signé','Annulé'];
    return `
      <form onsubmit="Deals.submit(event, ${d ? d.id : 'null'})">
        <div class="form-row">
          <label>Client *</label>
          <select name="client_id" required>
            <option value="">Sélectionner un client…</option>
            ${this.clients.map(c =>
              `<option value="${c.id}" ${d?.client_id == c.id ? 'selected' : ''}>${c.name}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-row">
          <label>Bien *</label>
          <select name="property_id" required>
            <option value="">Sélectionner un bien…</option>
            ${this.properties.map(p =>
              `<option value="${p.id}" ${d?.property_id == p.id ? 'selected' : ''}>
                ${p.title}${p.zone ? ' — ' + p.zone : ''}
              </option>`
            ).join('')}
          </select>
        </div>
        <div class="form-row">
          <label>Statut</label>
          <select name="status">
            ${statuses.map(s => `<option ${d?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label>Notes</label>
          <textarea name="notes" rows="2" placeholder="Remarques internes…">${d?.notes || ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Annuler</button>
          <button type="submit" class="btn btn-primary">${d ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </form>`;
  },

  async submit(e, id) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      if (id) {
        await api.put(`/deals/${id}`, data);
        Toast.show('Deal modifié');
      } else {
        await api.post('/deals', data);
        Toast.show('Deal créé');
      }
      Modal.close();
      await this.load();
      this.render();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  async remove(id) {
    if (!confirm('Supprimer ce deal ?')) return;
    await api.del(`/deals/${id}`);
    this.data = this.data.filter(d => d.id !== id);
    this.render();
    Toast.show('Deal supprimé');
  },

  async sendToClient(id) {
    const deal = this.data.find(d => d.id === id);
    if (!deal) return;

    // Download PDF
    try {
      Toast.show('Génération du PDF…', 'info');
      const res = await fetch(`/api/deals/${id}/pdf`);
      if (!res.ok) throw new Error('Erreur PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(deal.property_title || 'bien').replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      Toast.show('Erreur génération PDF', 'error');
    }

    // Update status → "Envoyé au client"
    if (deal.status === 'En cours') {
      try {
        await api.put(`/deals/${id}`, { ...deal, status: 'Envoyé au client' });
        deal.status = 'Envoyé au client';
        this.render();
      } catch {}
    }

    // Open WhatsApp
    const phone = (deal.client_whatsapp || '').replace(/\D/g, '');
    if (phone) {
      const price = deal.property_price
        ? `\n💰 ${Number(deal.property_price).toLocaleString('fr-FR')} THB/mois` : '';
      const zone = deal.property_zone ? `\n📍 ${deal.property_zone}` : '';
      const msg = `Bonjour ${deal.client_name || ''},\n\nVoici un bien qui correspond à vos critères :\n\n🏠 ${deal.property_title || ''}${price}${zone}\n\nJe vous transmets la fiche détaillée en pièce jointe.\nN'hésitez pas à me contacter pour organiser une visite.\n\nCordialement`;
      setTimeout(() => {
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
      }, 600);
      Toast.show('PDF téléchargé · WhatsApp ouvert');
    } else {
      Toast.show('PDF téléchargé (pas de numéro WhatsApp)');
    }
  }
};
