// ── Visas — kanban 3 colonnes ──────────────────────────────────────────────
const Visas = {
  data: [],

  COLS: [
    { key: 'À contacter',          label: '📞 À contacter',            cls: 'col-visa-contact' },
    { key: 'Envoyé à Manass',      label: '📨 Envoyé à Manass',        cls: 'col-visa-manass'  },
    { key: 'Payé (en attente de com)', label: '💰 Payé — en attente de com', cls: 'col-visa-paid' },
  ],

  async init() {
    document.getElementById('content').innerHTML = '<p class="spinner">Chargement…</p>';
    await this.load();
    this.render();
  },

  async load() {
    this.data = await api.get('/visas');
  },

  render() {
    const byCol = {};
    this.COLS.forEach(c => { byCol[c.key] = []; });
    this.data.forEach(v => {
      const key = this.COLS.find(c => c.key === v.status)?.key || this.COLS[0].key;
      byCol[key].push(v);
    });

    document.getElementById('content').innerHTML = `
      <div class="section-header">
        <h2>🛂 Visas</h2>
        <button class="btn btn-primary" onclick="Visas.openAdd()">+ Nouveau visa</button>
      </div>

      <div class="visa-kanban">
        ${this.COLS.map(col => `
          <div class="visa-col ${col.cls}">
            <div class="visa-col-header">
              <span class="visa-col-title">${col.label}</span>
              <span class="visa-col-count">${byCol[col.key].length}</span>
            </div>
            <div class="visa-col-body" id="vcol-${col.key.replace(/\s/g,'_').replace(/[()]/g,'')}">
              ${byCol[col.key].length
                ? byCol[col.key].map(v => this.cardHTML(v)).join('')
                : `<div class="visa-empty">Aucun</div>`}
            </div>
          </div>`).join('')}
      </div>`;
  },

  cardHTML(v) {
    return `
      <div class="visa-card" draggable="true" data-id="${v.id}">
        <div class="visa-card-name">${v.name}</div>
        ${v.phone ? `<div class="visa-card-phone">📱 ${v.phone}</div>` : ''}
        ${v.notes ? `<div class="visa-card-notes">${v.notes}</div>` : ''}
        <div class="visa-card-actions">
          <select class="visa-status-select" onchange="Visas.moveCard(${v.id}, this.value)">
            ${this.COLS.map(c => `<option value="${c.key}" ${c.key === v.status ? 'selected' : ''}>${c.label}</option>`).join('')}
          </select>
          <button class="btn btn-ghost btn-sm" onclick="Visas.openEdit(${v.id})" title="Modifier">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="Visas.remove(${v.id})" style="color:var(--red)" title="Supprimer">✕</button>
        </div>
      </div>`;
  },

  async moveCard(id, status) {
    await api.patch(`/visas/${id}/status`, { status });
    const v = this.data.find(x => x.id === id);
    if (v) v.status = status;
    this.render();
  },

  openAdd()    { Modal.open('Nouveau visa',   this.formHTML(null)); },
  openEdit(id) {
    const v = this.data.find(x => x.id === id);
    if (v) Modal.open('Modifier le visa', this.formHTML(v));
  },
  closeModal() { Modal.close(); },

  formHTML(v) {
    const isEdit = !!v;
    return `
      <div class="form-row">
        <label>Nom *</label>
        <input id="vf-name" type="text" value="${v?.name || ''}" placeholder="Prénom Nom">
      </div>
      <div class="form-row">
        <label>Téléphone</label>
        <input id="vf-phone" type="text" value="${v?.phone || ''}" placeholder="+66…">
      </div>
      <div class="form-row">
        <label>Statut</label>
        <select id="vf-status">
          ${this.COLS.map(c => `<option value="${c.key}" ${v?.status === c.key ? 'selected' : ''}>${c.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <label>Notes</label>
        <textarea id="vf-notes" rows="3" placeholder="Remarques, documents…">${v?.notes || ''}</textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" onclick="Modal.close()">Annuler</button>
        <button class="btn btn-primary" onclick="Visas.save(${v?.id || 'null'})">${isEdit ? 'Enregistrer' : 'Créer'}</button>
      </div>`;
  },

  async save(id) {
    const name   = document.getElementById('vf-name')?.value.trim();
    const phone  = document.getElementById('vf-phone')?.value.trim();
    const status = document.getElementById('vf-status')?.value;
    const notes  = document.getElementById('vf-notes')?.value.trim();
    if (!name) { Toast.show('Le nom est obligatoire', 'error'); return; }
    try {
      if (id) {
        const updated = await api.put(`/visas/${id}`, { name, phone, notes, status });
        const i = this.data.findIndex(x => x.id === id);
        if (i !== -1) this.data[i] = updated;
      } else {
        const created = await api.post('/visas', { name, phone, notes, status });
        this.data.unshift(created);
      }
      this.closeModal();
      this.render();
    } catch { Toast.show('Erreur lors de la sauvegarde', 'error'); }
  },

  async remove(id) {
    if (!confirm('Supprimer ce visa ?')) return;
    await api.del(`/visas/${id}`);
    this.data = this.data.filter(x => x.id !== id);
    this.render();
  },
};
