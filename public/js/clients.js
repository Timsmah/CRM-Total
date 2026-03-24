function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const CONTACT_COLS = [
  { key: 'À contacter',    cls: 'col-to-contact'  },
  { key: 'Contacté',       cls: 'col-contacted'   },
  { key: 'Pas de réponse', cls: 'col-no-response' },
  { key: 'Rappeler',       cls: 'col-callback'    },
  { key: 'RDV fixé',       cls: 'col-meeting'     },
];

const Clients = {
  data: [],
  filter: 'tous',
  showArchived: false,

  async init() {
    // Affiche un placeholder rapide
    document.getElementById('content').innerHTML = '<p class="spinner">Synchronisation…</p>';
    // Sync silencieux au chargement
    try { await api.post('/clients/sync/sheets', {}); } catch {}
    await this.load();
    this.render();
  },

  async load() {
    this.data = await api.get('/clients?archived=' + this.showArchived);
  },

  render() {
    document.getElementById('content').innerHTML = `
      <div class="section-header">
        <h2>Clients</h2>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="Clients.openAddModal()">+ Ajouter</button>
          <button class="btn btn-secondary" onclick="Clients.syncSheets()">↻ Sheets</button>
          <button class="btn btn-ghost" onclick="Clients.toggleArchived()">
            ${this.showArchived ? '← Actifs' : '🗃 Archivés'}
          </button>
        </div>
      </div>
      <div class="filter-pills">
        ${['Tous','Prospect','Onboarding','Recherche active','Signé','Perdu'].map(s =>
          `<button class="pill ${this.filter === s.toLowerCase() ? 'active' : ''}"
            onclick="Clients.setFilter('${s.toLowerCase()}')">${s}</button>`
        ).join('')}
      </div>
      <div class="kanban-board">
        ${CONTACT_COLS.map(col => this.columnHTML(col)).join('')}
      </div>`;
  },

  filtered() {
    if (this.filter === 'tous') return this.data;
    return this.data.filter(c => c.status.toLowerCase() === this.filter);
  },

  columnHTML(col) {
    const cards = this.filtered()
      .filter(c => (c.contact_status || 'À contacter') === col.key)
      .sort((a, b) => {
        if (!a.move_in_date && !b.move_in_date) return 0;
        if (!a.move_in_date) return 1;
        if (!b.move_in_date) return -1;
        return new Date(a.move_in_date) - new Date(b.move_in_date);
      });
    return `
      <div class="kanban-col">
        <div class="kanban-col-header ${col.cls}">
          <span>${col.key}</span>
          <span class="kanban-count">${cards.length}</span>
        </div>
        <div class="kanban-cards">
          ${cards.map(c => this.cardHTML(c)).join('') || '<p class="kanban-empty">—</p>'}
        </div>
      </div>`;
  },

  urgencyClass(move_in_date) {
    if (!move_in_date) return '';
    const days = Math.ceil((new Date(move_in_date) - new Date()) / 86400000);
    if (days <= 14) return 'urgent-red';
    if (days <= 30) return 'urgent-amber';
    return '';
  },

  cardHTML(c) {
    const budgetLine = c.budget_max
      ? `${Number(c.budget_max).toLocaleString('fr-FR')} ฿${c.budget_eur ? ` · ${Number(c.budget_eur).toLocaleString('fr-FR')} €` : ''}`
      : null;
    const urgency = this.urgencyClass(c.move_in_date);

    return `
      <div class="card kanban-card">
        <div class="card-top">
          ${badge(c.status)}
          <button class="fees-btn ${c.research_fees_paid ? 'paid' : ''}"
            onclick="Clients.toggleFees(${c.id})" title="Frais de recherche">
            ${c.research_fees_paid ? '✓ Frais' : '○ Frais'}
          </button>
        </div>
        <div class="client-name">${c.name}</div>
        <div class="client-details">
          ${c.whatsapp ? `<p>📱 ${c.whatsapp}</p>` : ''}
          ${budgetLine ? `<p>💰 ${budgetLine}</p>` : ''}
          ${c.zones ? `<p>📍 ${c.zones}</p>` : ''}
          ${c.move_in_date ? `<p class="${urgency}">📅 ${formatDate(c.move_in_date)}${c.duration ? ' · ' + c.duration : ''}${urgency === 'urgent-red' ? ' 🔴' : urgency === 'urgent-amber' ? ' 🟡' : ''}</p>` : ''}
          ${c.criteria ? `<p class="card-criteria">${c.criteria}</p>` : ''}
        </div>
        <select class="cs-select" onchange="Clients.setContactStatus(${c.id}, this.value)">
          ${CONTACT_COLS.map(col =>
            `<option ${(c.contact_status || 'À contacter') === col.key ? 'selected' : ''}>${col.key}</option>`
          ).join('')}
        </select>
        <div class="card-actions">
          <button class="btn btn-secondary btn-sm" onclick="Clients.openEditModal(${c.id})">Modifier</button>
          <button class="btn btn-ghost btn-sm" onclick="Clients.archive(${c.id})">
            ${this.showArchived ? 'Désarchiver' : 'Archiver'}
          </button>
        </div>
      </div>`;
  },

  async setContactStatus(id, status) {
    await api.patch(`/clients/${id}/contact-status`, { contact_status: status });
    const c = this.data.find(x => x.id === id);
    if (c) c.contact_status = status;
    this.render();
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

  openAddModal() { Modal.open('Ajouter un client', this.formHTML(null)); },
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
            <label>Statut pipeline</label>
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
      Toast.show(`${r.imported} importé(s) · ${r.updated} mis à jour`);
      await this.load();
      this.render();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }
};
