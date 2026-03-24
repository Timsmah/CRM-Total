const Properties = {
  data: [],
  filter: 'tous',
  showArchived: false,

  async init() {
    document.getElementById('content').innerHTML = '<p class="spinner">Synchronisation…</p>';
    try { await api.post('/properties/sync/sheets', {}); } catch {}
    await this.load();
    this.render();
  },

  async load() {
    this.data = await api.get('/properties?archived=' + this.showArchived);
  },

  render() {
    const statuses = ['Tous','Disponible','Proposé','Loué'];
    document.getElementById('content').innerHTML = `
      <div class="section-header">
        <h2>Properties</h2>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="Properties.openAddModal()">+ Ajouter</button>
          <button class="btn btn-secondary" onclick="Properties.syncSheets()">↻ Sheets</button>
          <button class="btn btn-ghost" onclick="Properties.toggleArchived()">
            ${this.showArchived ? '← Actifs' : '🗃 Archivés'}
          </button>
        </div>
      </div>
      <div class="filter-pills">
        ${statuses.map(s =>
          `<button class="pill ${this.filter === s.toLowerCase() ? 'active' : ''}"
            onclick="Properties.setFilter('${s.toLowerCase()}')">${s}</button>`
        ).join('')}
      </div>
      <div class="cards-grid">
        ${this.filtered().map(p => this.cardHTML(p)).join('') || '<p class="empty">Aucun bien</p>'}
      </div>`;
  },

  filtered() {
    if (this.filter === 'tous') return this.data;
    return this.data.filter(p => p.status.toLowerCase() === this.filter);
  },

  cardHTML(p) {
    return `
      <div class="card">
        <div class="prop-no-photo">🏠</div>
        <div class="card-top" style="margin-bottom:8px">
          ${badge(p.status)}
          ${p.drive_link
            ? `<a href="${p.drive_link}" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none">📸 Photos</a>`
            : ''}
        </div>
        <div class="prop-title">${p.title}</div>
        ${p.price ? `<div class="prop-price">${Number(p.price).toLocaleString('fr-FR')} ฿/mois</div>` : ''}
        <div class="prop-zone" style="margin-top:6px;display:flex;flex-direction:column;gap:3px">
          ${p.zone    ? `<span>📍 ${p.zone}</span>` : ''}
          ${p.room_type ? `<span>🛏 ${p.room_type}${p.sqm ? ' · ' + p.sqm : ''}</span>` : ''}
          ${p.floor   ? `<span>🏢 Étage ${p.floor}</span>` : ''}
          ${p.room_no ? `<span>🔑 Appt ${p.room_no}</span>` : ''}
          ${p.owner_contact ? `<span style="color:var(--text-2);font-size:11px;margin-top:2px">👤 ${p.owner_contact}</span>` : ''}
        </div>
        ${p.description ? `<p style="color:var(--text-2);font-size:12px;margin-top:6px;line-height:1.4">${p.description.substring(0,100)}${p.description.length>100?'…':''}</p>` : ''}
        <div class="card-actions">
          <button class="btn btn-secondary btn-sm" onclick="Properties.openEditModal(${p.id})">Modifier</button>
          <button class="btn btn-ghost btn-sm" onclick="Properties.archive(${p.id})">
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

  async archive(id) {
    await api.patch(`/properties/${id}/archive`);
    this.data = this.data.filter(p => p.id !== id);
    this.render();
    Toast.show(this.showArchived ? 'Bien désarchivé' : 'Bien archivé');
  },

  async syncSheets() {
    try {
      Toast.show('Synchronisation…', 'info');
      const r = await api.post('/properties/sync/sheets', {});
      Toast.show(`${r.imported} importé(s) · ${r.updated} mis à jour`);
      await this.load();
      this.render();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  openAddModal() { Modal.open('Ajouter un bien', this.formHTML(null)); },
  openEditModal(id) {
    const p = this.data.find(x => x.id === id);
    Modal.open('Modifier le bien', this.formHTML(p));
  },

  formHTML(p) {
    const statuses = ['Disponible','Proposé','Loué'];
    return `
      <form onsubmit="Properties.submit(event, ${p ? p.id : 'null'})">
        <div class="form-row">
          <label>Titre / Projet *</label>
          <input name="title" required value="${p?.title || ''}">
        </div>
        <div class="form-2">
          <div class="form-row">
            <label>Prix (THB/mois)</label>
            <input name="price" type="number" value="${p?.price || ''}">
          </div>
          <div class="form-row">
            <label>Zone</label>
            <input name="zone" placeholder="Thonglor, Ari…" value="${p?.zone || ''}">
          </div>
        </div>
        <div class="form-2">
          <div class="form-row">
            <label>Type</label>
            <input name="room_type" placeholder="2BR 2Bath" value="${p?.room_type || ''}">
          </div>
          <div class="form-row">
            <label>Superficie</label>
            <input name="sqm" placeholder="85 Sq.m." value="${p?.sqm || ''}">
          </div>
        </div>
        <div class="form-2">
          <div class="form-row">
            <label>Étage</label>
            <input name="floor" placeholder="7th" value="${p?.floor || ''}">
          </div>
          <div class="form-row">
            <label>N° appartement</label>
            <input name="room_no" value="${p?.room_no || ''}">
          </div>
        </div>
        <div class="form-row">
          <label>Contact propriétaire</label>
          <input name="owner_contact" placeholder="Tel / Line / FB" value="${p?.owner_contact || ''}">
        </div>
        <div class="form-row">
          <label>Lien Google Drive (photos)</label>
          <input name="drive_link" placeholder="https://drive.google.com/drive/folders/…" value="${p?.drive_link || ''}">
        </div>
        <div class="form-row">
          <label>Description</label>
          <textarea name="description" rows="2">${p?.description || ''}</textarea>
        </div>
        <div class="form-row">
          <label>Statut</label>
          <select name="status">
            ${statuses.map(s => `<option ${p?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Annuler</button>
          <button type="submit" class="btn btn-primary">${p ? 'Enregistrer' : 'Ajouter'}</button>
        </div>
      </form>`;
  },

  async submit(e, id) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    const data = { ...fd, photos: '[]' };
    try {
      if (id) {
        await api.put(`/properties/${id}`, { ...this.data.find(p => p.id === id), ...data });
        Toast.show('Bien modifié');
      } else {
        await api.post('/properties', data);
        Toast.show('Bien ajouté');
      }
      Modal.close();
      await this.load();
      this.render();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }
};
