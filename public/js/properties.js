const Properties = {
  data: [],
  filterStatus : 'tous',
  filterZone   : 'toutes',
  filterBeds   : 'tous',
  filterPriceMax: 250000,
  showArchived : false,
  photoCache   : {},   // folderId → [{ id, thumbnail }]
  photoIndex   : {},   // propertyId → current index

  async init() {
    document.getElementById('content').innerHTML = '<p class="spinner">Syncing…</p>';
    try { await api.post('/properties/sync/sheets', {}); } catch {}
    await this.load();
    this.render();
  },

  async load() {
    this.data = await api.get('/properties?archived=' + this.showArchived);
  },

  // Extrait le nombre de chambres depuis room_type ("2BR 2Bath" → "2")
  extractBeds(room_type) {
    if (!room_type) return null;
    const m = room_type.match(/(\d+)\s*BR/i);
    return m ? m[1] : null;
  },

  // Listes dynamiques générées depuis les données
  uniqueZones() {
    return [...new Set(this.data.map(p => p.zone).filter(Boolean))].sort();
  },
  uniqueBeds() {
    return [...new Set(this.data.map(p => this.extractBeds(p.room_type)).filter(Boolean))]
      .sort((a, b) => Number(a) - Number(b));
  },

  render() {
    const zones = this.uniqueZones();
    const beds  = this.uniqueBeds();
    document.getElementById('content').innerHTML = `
      <div class="section-header">
        <h2>Properties</h2>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="Properties.openAddModal()">+ Add</button>
          <button class="btn btn-secondary" onclick="Properties.syncSheets()">↻ Sheets</button>
          <button class="btn btn-ghost" onclick="Properties.toggleArchived()">
            ${this.showArchived ? '← Active' : '🗃 Archived'}
          </button>
        </div>
      </div>

      <div class="filters-block">
        <div class="filter-group">
          <span class="filter-label">Status</span>
          <div class="filter-pills">
            ${[['tous','All'],['disponible','Available'],['proposé','Proposed'],['loué','Rented']].map(([val,lbl]) =>
              `<button class="pill ${this.filterStatus === val ? 'active' : ''}"
                onclick="Properties.setFilter('status','${val}')">${lbl}</button>`
            ).join('')}
          </div>
        </div>

        ${zones.length ? `
        <div class="filter-group">
          <span class="filter-label">Zone</span>
          <div class="filter-pills">
            <button class="pill ${this.filterZone === 'toutes' ? 'active' : ''}"
              onclick="Properties.setFilter('zone','toutes')">All</button>
            ${zones.map(z =>
              `<button class="pill ${this.filterZone === z ? 'active' : ''}"
                onclick="Properties.setFilter('zone','${z}')">${z}</button>`
            ).join('')}
          </div>
        </div>` : ''}

        ${beds.length ? `
        <div class="filter-group">
          <span class="filter-label">Bedrooms</span>
          <div class="filter-pills">
            <button class="pill ${this.filterBeds === 'tous' ? 'active' : ''}"
              onclick="Properties.setFilter('beds','tous')">All</button>
            ${beds.map(b =>
              `<button class="pill ${this.filterBeds === b ? 'active' : ''}"
                onclick="Properties.setFilter('beds','${b}')">${b} BR</button>`
            ).join('')}
          </div>
        </div>` : ''}

        <div class="filter-group">
          <span class="filter-label">Max price</span>
          <div class="price-slider-wrap">
            <input type="range" min="0" max="250000" step="5000"
              value="${this.filterPriceMax}"
              oninput="Properties.setFilter('price', this.value)"
              class="price-slider">
            <span class="price-slider-val">
              ${this.filterPriceMax >= 250000 ? 'No limit' : Number(this.filterPriceMax).toLocaleString('fr-FR') + ' ฿'}
            </span>
          </div>
        </div>
      </div>

      <div class="cards-grid">
        ${this.filtered().map(p => this.cardHTML(p)).join('') || '<p class="empty">No properties</p>'}
      </div>`;
    // Lazy-load photos après rendu
    setTimeout(() => {
      this.filtered().forEach(p => {
        if (p.drive_link) this.loadPhotos(p.id, p.drive_link);
      });
    }, 0);
  },

  filtered() {
    return this.data.filter(p => {
      if (this.filterStatus !== 'tous' && p.status.toLowerCase() !== this.filterStatus) return false;
      if (this.filterZone !== 'toutes' && p.zone !== this.filterZone) return false;
      if (this.filterBeds !== 'tous' && this.extractBeds(p.room_type) !== this.filterBeds) return false;
      if (p.price && p.price > this.filterPriceMax) return false;
      return true;
    });
  },

  setFilter(type, val) {
    if (type === 'status') this.filterStatus  = val;
    if (type === 'zone')   this.filterZone    = val;
    if (type === 'beds')   this.filterBeds    = val;
    if (type === 'price')  this.filterPriceMax = Number(val);
    this.render();
  },

  extractFolderId(url) {
    if (!url) return null;
    const m = url.match(/folders\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  },

  async loadPhotos(propertyId, driveLink) {
    const folderId = this.extractFolderId(driveLink);
    if (!folderId) return;
    if (this.photoCache[folderId] !== undefined) {
      const el = document.getElementById(`photo-${propertyId}`);
      if (el) this.renderCarouselEl(el, propertyId, folderId);
      return;
    }
    this.photoCache[folderId] = [];
    try {
      const data = await api.get(`/drive/folder/${folderId}`);
      this.photoCache[folderId] = data.files || [];
    } catch {}
    const el = document.getElementById(`photo-${propertyId}`);
    if (el) this.renderCarouselEl(el, propertyId, folderId);
  },

  renderCarouselEl(el, propertyId, folderId) {
    const photos = this.photoCache[folderId] || [];
    if (!photos.length) return;
    const idx = this.photoIndex[propertyId] || 0;
    const photo = photos[idx];
    el.innerHTML = `
      <div class="carousel-wrap">
        <img src="${photo.thumbnail}" class="prop-photo"
          onerror="this.src=''" alt="${photo.name}">
        ${photos.length > 1 ? `
          <button class="car-btn car-prev" onclick="Properties.carNav(${propertyId},-1,event)">‹</button>
          <button class="car-btn car-next" onclick="Properties.carNav(${propertyId},1,event)">›</button>
          <span class="car-count">${idx+1} / ${photos.length}</span>
        ` : ''}
      </div>`;
  },

  carNav(propertyId, dir, e) {
    e.stopPropagation();
    const p = this.data.find(x => x.id === propertyId);
    const folderId = this.extractFolderId(p?.drive_link);
    const photos = this.photoCache[folderId] || [];
    if (!photos.length) return;
    const cur = this.photoIndex[propertyId] || 0;
    this.photoIndex[propertyId] = (cur + dir + photos.length) % photos.length;
    const el = document.getElementById(`photo-${propertyId}`);
    if (el) this.renderCarouselEl(el, propertyId, folderId);
  },

  cardHTML(p) {
    return `
      <div class="card" onclick="Properties.openDetailModal(${p.id}, event)" style="cursor:pointer">
        <div id="photo-${p.id}" class="prop-photo-slot">
          <div class="prop-no-photo">🏠</div>
        </div>
        <div class="card-top" style="margin-bottom:8px;margin-top:10px">
          ${badge(p.status)}
        </div>
        <div class="prop-title">${p.title}</div>
        ${p.price ? `<div class="prop-price">${Number(p.price).toLocaleString('fr-FR')} ฿/mois</div>` : ''}
        <div class="prop-zone" style="margin-top:6px;display:flex;flex-direction:column;gap:3px">
          ${p.zone      ? `<span>📍 ${p.zone}</span>` : ''}
          ${p.room_type ? `<span>🛏 ${p.room_type}${p.sqm ? ' · ' + p.sqm : ''}</span>` : ''}
          ${p.floor     ? `<span>🏢 Floor ${p.floor}</span>` : ''}
          ${p.room_no   ? `<span>🔑 Unit ${p.room_no}</span>` : ''}
          ${p.owner_contact ? `<span style="color:var(--text-2);font-size:11px;margin-top:2px">👤 ${p.owner_contact}</span>` : ''}
        </div>
        <div class="card-actions">
          <button class="btn btn-secondary btn-sm" onclick="Properties.openEditModal(${p.id})">Edit</button>
          <button class="btn btn-ghost btn-sm" onclick="Properties.archive(${p.id})">
            ${this.showArchived ? 'Unarchive' : 'Archive'}
          </button>
        </div>
      </div>`;
  },

  openDetailModal(id, e) {
    if (e && (e.target.closest('button') || e.target.closest('a'))) return;
    const p = this.data.find(x => x.id === id);
    if (!p) return;
    const folderId = this.extractFolderId(p.drive_link);
    const photos = folderId ? (this.photoCache[folderId] || []) : [];
    const idx = this.photoIndex[id] || 0;
    Modal.open(p.title, `
      <div id="modal-photo-${id}" style="margin-bottom:14px">
        ${photos.length ? `
          <div class="carousel-wrap modal-carousel">
            <img src="${photos[idx].thumbnail}" class="prop-photo" style="height:220px">
            ${photos.length > 1 ? `
              <button class="car-btn car-prev" onclick="Properties.carNav(${id},-1,event)">‹</button>
              <button class="car-btn car-next" onclick="Properties.carNav(${id},1,event)">›</button>
              <span class="car-count">${idx+1} / ${photos.length}</span>
            ` : ''}
          </div>` : '<div class="prop-no-photo" style="height:120px">🏠</div>'}
      </div>
      <div class="detail-grid">
        ${p.price ? `<div class="detail-row"><span class="detail-label">💰 Price</span><span style="color:var(--accent);font-weight:700">${Number(p.price).toLocaleString('fr-FR')} ฿/mois</span></div>` : ''}
        ${p.zone ? `<div class="detail-row"><span class="detail-label">📍 Zone</span><span>${p.zone}</span></div>` : ''}
        ${p.room_type ? `<div class="detail-row"><span class="detail-label">🛏 Type</span><span>${p.room_type}${p.sqm ? ' · ' + p.sqm : ''}</span></div>` : ''}
        ${p.floor ? `<div class="detail-row"><span class="detail-label">🏢 Floor</span><span>${p.floor}</span></div>` : ''}
        ${p.room_no ? `<div class="detail-row"><span class="detail-label">🔑 Unit</span><span>${p.room_no}</span></div>` : ''}
        ${p.owner_contact ? `<div class="detail-row"><span class="detail-label">👤 Contact</span><span>${p.owner_contact}</span></div>` : ''}
        ${p.description ? `<div class="detail-row"><span class="detail-label">📝 Notes</span><span>${p.description}</span></div>` : ''}
        ${p.drive_link ? `<div class="detail-row"><span class="detail-label">📸 Drive</span><a href="${p.drive_link}" target="_blank" style="color:var(--blue)">Open folder</a></div>` : ''}
      </div>
      <div class="form-actions" style="margin-top:16px">
        <button class="btn btn-ghost" onclick="Modal.close()">Close</button>
        <button class="btn btn-secondary" onclick="Modal.close();Properties.openEditModal(${id})">Edit</button>
      </div>`);
  },


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
      Toast.show('Syncing…', 'info');
      const r = await api.post('/properties/sync/sheets', {});
      Toast.show(`${r.imported} imported · ${r.updated} updated`);
      await this.load();
      this.render();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  openAddModal() { Modal.open('Add property', this.formHTML(null)); },
  openEditModal(id) {
    const p = this.data.find(x => x.id === id);
    Modal.open('Edit property', this.formHTML(p));
  },

  formHTML(p) {
    const statuses = ['Disponible','Proposé','Loué'];
    return `
      <form onsubmit="Properties.submit(event, ${p ? p.id : 'null'})">
        <div class="form-row">
          <label>Title / Project *</label>
          <input name="title" required value="${p?.title || ''}">
        </div>
        <div class="form-2">
          <div class="form-row">
            <label>Price (THB/month)</label>
            <input name="price" type="number" value="${p?.price || ''}">
          </div>
          <div class="form-row">
            <label>Zone</label>
            <input name="zone" placeholder="Thonglor, Ari…" value="${p?.zone || ''}">
          </div>
        </div>
        <div class="form-2">
          <div class="form-row">
            <label>Room type</label>
            <input name="room_type" placeholder="2BR 2Bath" value="${p?.room_type || ''}">
          </div>
          <div class="form-row">
            <label>Floor area</label>
            <input name="sqm" placeholder="85 Sq.m." value="${p?.sqm || ''}">
          </div>
        </div>
        <div class="form-2">
          <div class="form-row">
            <label>Floor</label>
            <input name="floor" placeholder="7th" value="${p?.floor || ''}">
          </div>
          <div class="form-row">
            <label>Unit no.</label>
            <input name="room_no" value="${p?.room_no || ''}">
          </div>
        </div>
        <div class="form-row">
          <label>Owner contact</label>
          <input name="owner_contact" placeholder="Tel / Line / FB" value="${p?.owner_contact || ''}">
        </div>
        <div class="form-row">
          <label>Google Drive link (photos)</label>
          <input name="drive_link" placeholder="https://drive.google.com/drive/folders/…" value="${p?.drive_link || ''}">
        </div>
        <div class="form-row">
          <label>Description</label>
          <textarea name="description" rows="2">${p?.description || ''}</textarea>
        </div>
        <div class="form-row">
          <label>Status</label>
          <select name="status">
            ${statuses.map(s => `<option ${p?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn btn-primary">${p ? 'Save' : 'Add'}</button>
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
