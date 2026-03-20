const Clients = {
  data: [],
  filter: 'tous',
  showArchived: false,

  async load() {
    this.data = await api.get('/clients?archived=' + this.showArchived);
  },

  render() {
    document.getElementById('content').innerHTML = `
      <div class="section-header">
        <h2>Clients</h2>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="Clients.openAddModal()">+ Ajouter</button>
          <button class="btn btn-secondary" onclick="Clients.syncSheets()">↻ Google Sheets</button>
          <button class="btn btn-ghost" onclick="Clients.toggleArchived()">
            ${this.showArchived ? '← Vue active' : '🗃 Archivés'}
          </button>
        </div>
      </div>
      <div class="filter-pills">
        ${['Tous','Prospect','Onboarding','Recherche active','Signé','Perdu'].map(s =>
          `<button class="pill ${this.filter === s.toLowerCase() ? 'active' : ''}"
            onclick="Clients.setFilter('${s.toLowerCase()}')">${s}</button>`
        ).join('')}
      </div>
      <div class="cards-grid">
        ${this.filtered().map(c => this.cardHTML(c)).join('') || '<p class="empty">Aucun client</p>'}
      </div>`;
  },

  filtered() {
    if (this.filter === 'tous') return this.data;
    return this.data.filter(c => c.status.toLowerCase() === this.filter);
  },

  cardHTML(c) {
    const budgetLine = c.budget_max
      ? `${Number(c.budget_max).toLocaleString('fr-FR')} ฿${c.budget_eur ? ` · ${Number(c.budget_eur).toLocaleString('fr-FR')} €` : ''}`
      : null;
    const typeLine = [c.property_type, c.bedrooms ? c.bedrooms + ' ch.' : '', c.city].filter(Boolean).join(' · ');

    return `
      <div class="card">
        <div class="card-top">
          ${badge(c.status)}
          <button class="fees-btn ${c.research_fees_paid ? 'paid' : ''}"
            onclick="Clients.toggleFees(${c.id})" title="Frais de recherche">
            ${c.research_fees_paid ? '✓ Frais payés' : '○ Frais non payés'}
          </button>
        </div>
        <div class="client-name">${c.name}</div>
        <div class="client-details">
          ${c.whatsapp ? `<p>📱 ${c.whatsapp}</p>` : ''}
          ${budgetLine ? `<p>💰 ${budgetLine}</p>` : ''}
          ${c.zones ? `<p>📍 ${c.zones}</p>` : ''}
          ${typeLine ? `<p>🏠 ${typeLine}</p>` : ''}
          ${c.move_in_date ? `<p>📅 ${c.move_in_date}${c.duration ? ' · ' + c.duration : ''}</p>` : ''}
          ${c.criteria ? `<p style="color:var(--text-2);font-size:12px;margin-top:4px;font-style:italic">${c.criteria}</p>` : ''}
          <div style="margin-top:6px;display:flex;gap:5px;flex-wrap:wrap">
            <span class="source-tag">${c.source}</span>
            ${c.project ? `<span class="source-tag">${c.project}</span>` : ''}
          </div>
        </div>
        <div class="card-actions">
          <button class="btn btn-secondary btn-sm" onclick="Clients.openEditModal(${c.id})">Modifier</button>
          <button class="btn btn-ghost btn-sm" onclick="Clients.archive(${c.id})">
            ${this.showArchived ? 'Désarchiver' : 'Archiver'}
          </button>
        </div>
      </div>`;
  },

  setFilter(f) { this.filter = f; this.render(); },

  async toggleArchived() {
    this.showArchived = !this.showArchived;
    await this.load();
    this.render();
  },

  async toggleFees(id) {
    await api.patch(`/clients/${id}/fees`);
    const c = this.data.find(x => x.id === id);
    if (c) c.research_fees_paid = c.research_fees_paid ? 0 : 1;
    this.render();
  },

  async archive(id) {
    await api.patch(`/clients/${id}/archive`);
    this.data = this.data.filter(c => c.id !== id);
    this.render();
    Toast.show(this.showArchived ? 'Client désarchivé' : 'Client archivé');
  },

  openAddModal() {
    Modal.open('Ajouter un client', this.formHTML(null));
  },

  openEditModal(id) {
    const c = this.data.find(x => x.id === id);
    Modal.open('Modifier le client', this.formHTML(c));
  },

  formHTML(c) {
    const statuses = ['Prospect','Onboarding','Recherche active','Signé','Perdu'];
    const sources  = ['Formulaire','Instagram DM','Autre'];
    return `
      <form onsubmit="Clients.submit(event, ${c ? c.id : 'null'})">
        <div class="form-row">
          <label>Nom *</label>
          <input name="name" required value="${c?.name || ''}">
        </div>
        <div class="form-row">
          <label>WhatsApp</label>
          <input name="whatsapp" placeholder="+66 XX XXX XXXX" value="${c?.whatsapp || ''}">
        </div>
        <div class="form-2">
          <div class="form-row">
            <label>Budget min (THB)</label>
            <input name="budget_min" type="number" value="${c?.budget_min || ''}">
          </div>
          <div class="form-row">
            <label>Budget max (THB)</label>
            <input name="budget_max" type="number" value="${c?.budget_max || ''}">
          </div>
        </div>
        <div class="form-row">
          <label>Zones souhaitées</label>
          <input name="zones" placeholder="Sukhumvit, Thonglor, Ari…" value="${c?.zones || ''}">
        </div>
        <div class="form-row">
          <label>Critères</label>
          <textarea name="criteria" rows="2" placeholder="2 BR, balcon, piscine…">${c?.criteria || ''}</textarea>
        </div>
        <div class="form-2">
          <div class="form-row">
            <label>Source</label>
            <select name="source">
              ${sources.map(s => `<option ${c?.source === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <label>Statut</label>
            <select name="status">
              ${statuses.map(s => `<option ${c?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Annuler</button>
          <button type="submit" class="btn btn-primary">${c ? 'Enregistrer' : 'Ajouter'}</button>
        </div>
      </form>`;
  },

  async submit(e, id) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      if (id) {
        const existing = this.data.find(c => c.id === id);
        await api.put(`/clients/${id}`, { ...existing, ...data });
        Toast.show('Client modifié');
      } else {
        await api.post('/clients', data);
        Toast.show('Client ajouté');
      }
      Modal.close();
      await this.load();
      this.render();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  async syncSheets() {
    try {
      Toast.show('Synchronisation…', 'info');
      const r = await api.post('/clients/sync/sheets', {});
      Toast.show(`${r.imported} importé(s) · ${r.updated} mis à jour · ${r.total} lignes`);
      await this.load();
      this.render();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }
};
