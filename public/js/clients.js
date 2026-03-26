function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const CONTACT_COLS = [
  { key: 'À contacter',    label: 'To Contact',    cls: 'col-to-contact'  },
  { key: 'Contacté',       label: 'Contacted',     cls: 'col-contacted'   },
  { key: 'Pas de réponse', label: 'No Response',   cls: 'col-no-response' },
  { key: 'Rappeler',       label: 'Call Back',     cls: 'col-callback'    },
  { key: 'RDV fixé',       label: 'Meeting Set',   cls: 'col-meeting'     },
];

const Clients = {
  data: [],
  filter: 'tous',
  showArchived: false,
  focusedCol: null,

  async init() {
    // Affiche un placeholder rapide
    document.getElementById('content').innerHTML = '<p class="spinner">Syncing…</p>';
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
          <button class="btn btn-primary" onclick="Clients.openAddModal()">+ Add</button>
          <button class="btn btn-secondary" onclick="Clients.syncSheets()">↻ Sheets</button>
          <button class="btn btn-ghost" onclick="Clients.toggleArchived()">
            ${this.showArchived ? '← Active' : '🗃 Archived'}
          </button>
        </div>
      </div>
      <div class="filter-pills">
        ${[['tous','All'],['prospect','Prospect'],['onboarding','Onboarding'],['recherche active','Active Search'],['signé','Signed'],['perdu','Lost']].map(([val,lbl]) =>
          `<button class="pill ${this.filter === val ? 'active' : ''}"
            onclick="Clients.setFilter('${val}')">${lbl}</button>`
        ).join('')}
      </div>
      <div class="kanban-legend">
        <span class="legend-item"><span class="legend-dot dot-red"></span> Move-in &lt; 14 days</span>
        <span class="legend-item"><span class="legend-dot dot-amber"></span> Move-in &lt; 30 days</span>
        <span class="legend-item"><span class="legend-clock">🕐</span> Days since form submitted</span>
      </div>
      <div class="kanban-board ${this.focusedCol ? 'has-focus' : ''}">
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
      <div class="kanban-col ${this.focusedCol === col.key ? 'focused' : ''}"
        ondragover="Clients.onDragOver(event)"
        ondragleave="Clients.onDragLeave(event)"
        ondrop="Clients.onDrop(event, '${col.key}')">
        <div class="kanban-col-header ${col.cls}" onclick="Clients.toggleFocus('${col.key}')">
          <span>${col.label}</span>
          <div style="display:flex;align-items:center;gap:6px">
            <span class="kanban-count">${cards.length}</span>
            <span style="font-size:10px;opacity:.5">${this.focusedCol === col.key ? '✕' : '⊞'}</span>
          </div>
        </div>
        <div class="kanban-cards">
          ${cards.map(c => this.cardHTML(c)).join('') || '<p class="kanban-empty">—</p>'}
        </div>
      </div>`;
  },

  daysAgo(dateStr) {
    if (!dateStr) return null;
    const days = Math.floor((new Date() - new Date(dateStr)) / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return '1d ago';
    return `${days}d ago`;
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
    const urgency  = this.urgencyClass(c.move_in_date);
    const daysAgo  = this.daysAgo(c.created_at);

    return `
      <div class="card kanban-card" draggable="true"
        ondragstart="Clients.onDragStart(event, ${c.id})"
        ondragend="Clients.onDragEnd(event)">
        <div class="card-top">
          ${badge(c.status)}
          <div style="display:flex;align-items:center;gap:6px">
            ${daysAgo ? `<span class="days-ago-badge">🕐 ${daysAgo}</span>` : ''}
            <button class="fees-btn ${c.research_fees_paid ? 'paid' : ''}"
              onclick="Clients.toggleFees(${c.id})" title="Research fees">
              ${c.research_fees_paid ? '✓ Fees' : '○ Fees'}
            </button>
          </div>
        </div>
        <div class="client-name">${c.name}</div>
        <div class="client-details">
          ${c.whatsapp ? `<p>📱 ${c.whatsapp}</p>` : ''}
          ${budgetLine ? `<p>💰 ${budgetLine}</p>` : ''}
          ${c.zones ? `<p>📍 ${c.zones}</p>` : ''}
          ${c.move_in_date ? `<p class="${urgency}">📅 Arrival: ${formatDate(c.move_in_date)}${c.duration ? ' · ' + c.duration : ''}${urgency === 'urgent-red' ? ' 🔴' : urgency === 'urgent-amber' ? ' 🟡' : ''}</p>` : ''}
          ${c.criteria ? `<p class="card-criteria">${c.criteria}</p>` : ''}
        </div>
        <select class="cs-select" onchange="Clients.setContactStatus(${c.id}, this.value)">
          ${CONTACT_COLS.map(col =>
            `<option value="${col.key}" ${(c.contact_status || 'À contacter') === col.key ? 'selected' : ''}>${col.label}</option>`
          ).join('')}
        </select>
        <div class="card-actions">
          <button class="btn btn-secondary btn-sm" onclick="Clients.openEditModal(${c.id})">Edit</button>
          <button class="btn btn-ghost btn-sm" onclick="Clients.archive(${c.id})">
            ${this.showArchived ? 'Unarchive' : 'Archive'}
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
    Toast.show(this.showArchived ? 'Client unarchived' : 'Client archived');
  },

  toggleFocus(colKey) {
    this.focusedCol = this.focusedCol === colKey ? null : colKey;
    this.render();
  },

  // ── Drag & Drop ──────────────────────────────────
  onDragStart(e, id) {
    e.dataTransfer.setData('clientId', id);
    e.currentTarget.classList.add('dragging');
  },

  onDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('drag-over'));
  },

  onDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  },

  onDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget))
      e.currentTarget.classList.remove('drag-over');
  },

  async onDrop(e, colKey) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const id = Number(e.dataTransfer.getData('clientId'));
    if (!id) return;
    await this.setContactStatus(id, colKey);
  },

  openAddModal() { Modal.open('Add client', this.formHTML(null)); },
  openEditModal(id) {
    const c = this.data.find(x => x.id === id);
    Modal.open('Edit client', this.formHTML(c));
  },

  formHTML(c) {
    const statuses = ['Prospect','Onboarding','Recherche active','Signé','Perdu'];
    const sources  = ['Formulaire','Instagram DM','Autre'];
    return `
      <form onsubmit="Clients.submit(event, ${c ? c.id : 'null'})">
        <div class="form-row">
          <label>Name *</label>
          <input name="name" required value="${c?.name || ''}">
        </div>
        <div class="form-row">
          <label>WhatsApp</label>
          <input name="whatsapp" placeholder="+66 XX XXX XXXX" value="${c?.whatsapp || ''}">
        </div>
        <div class="form-2">
          <div class="form-row">
            <label>Min budget (THB)</label>
            <input name="budget_min" type="number" value="${c?.budget_min || ''}">
          </div>
          <div class="form-row">
            <label>Max budget (THB)</label>
            <input name="budget_max" type="number" value="${c?.budget_max || ''}">
          </div>
        </div>
        <div class="form-row">
          <label>Desired zones</label>
          <input name="zones" placeholder="Sukhumvit, Thonglor, Ari…" value="${c?.zones || ''}">
        </div>
        <div class="form-row">
          <label>Criteria</label>
          <textarea name="criteria" rows="2" placeholder="2 BR, balcony, pool…">${c?.criteria || ''}</textarea>
        </div>
        <div class="form-2">
          <div class="form-row">
            <label>Source</label>
            <select name="source">
              ${sources.map(s => `<option ${c?.source === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <label>Pipeline status</label>
            <select name="status">
              ${statuses.map(s => `<option ${c?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn btn-primary">${c ? 'Save' : 'Add'}</button>
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
        Toast.show('Client updated');
      } else {
        await api.post('/clients', data);
        Toast.show('Client added');
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
      Toast.show('Syncing…', 'info');
      const r = await api.post('/clients/sync/sheets', {});
      Toast.show(`${r.imported} imported · ${r.updated} updated`);
      await this.load();
      this.render();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }
};
