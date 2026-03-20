const Properties = {
  data: [],
  filter: 'tous',
  showArchived: false,

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
          <button class="btn btn-ghost" onclick="Properties.toggleArchived()">
            ${this.showArchived ? '← Vue active' : '🗃 Archivés'}
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
    const photo = p.photos && p.photos[0];
    return `
      <div class="card">
        ${photo
          ? `<img class="prop-photo" src="${photo}" alt="${p.title}" onerror="this.style.display='none'">`
          : `<div class="prop-no-photo">🏠</div>`}
        <div class="card-top">
          ${badge(p.status)}
          ${p.external_url ? `<a href="${p.external_url}" target="_blank" style="color:var(--text-2);font-size:11px;text-decoration:none">🔗 Source</a>` : ''}
        </div>
        <div class="prop-title">${p.title}</div>
        ${p.price ? `<div class="prop-price">${Number(p.price).toLocaleString('fr-FR')} THB/mois</div>` : ''}
        ${p.zone ? `<div class="prop-zone">📍 ${p.zone}</div>` : ''}
        ${p.description ? `<p style="color:var(--text-2);font-size:12px;margin-top:6px;line-height:1.4">${p.description.substring(0,120)}${p.description.length>120?'…':''}</p>` : ''}
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

  openAddModal() { Modal.open('Ajouter un bien', this.formHTML(null)); },
  openEditModal(id) {
    const p = this.data.find(x => x.id === id);
    Modal.open('Modifier le bien', this.formHTML(p));
  },

  formHTML(p) {
    const statuses = ['Disponible','Proposé','Loué'];
    const photosVal = p?.photos ? p.photos.join('\n') : '';
    return `
      <form onsubmit="Properties.submit(event, ${p ? p.id : 'null'})">
        <div class="form-row">
          <label>Titre *</label>
          <input name="title" required value="${p?.title || ''}">
        </div>
        <div class="form-2">
          <div class="form-row">
            <label>Prix (THB/mois)</label>
            <input name="price" type="number" value="${p?.price || ''}">
          </div>
          <div class="form-row">
            <label>Zone</label>
            <input name="zone" placeholder="Sukhumvit, Ari…" value="${p?.zone || ''}">
          </div>
        </div>
        <div class="form-row">
          <label>Description</label>
          <textarea name="description" rows="3">${p?.description || ''}</textarea>
        </div>
        <div class="form-row">
          <label>Photos (URLs, une par ligne)</label>
          <textarea name="photos_raw" rows="3" placeholder="https://…">${photosVal}</textarea>
        </div>
        <div class="form-row">
          <label>URL source (annonce)</label>
          <input name="external_url" placeholder="https://…" value="${p?.external_url || ''}">
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
    const photos = fd.photos_raw
      ? fd.photos_raw.split('\n').map(s => s.trim()).filter(Boolean)
      : [];
    const data = { ...fd, photos };
    delete data.photos_raw;

    try {
      if (id) {
        const existing = this.data.find(p => p.id === id);
        await api.put(`/properties/${id}`, { ...existing, ...data });
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
