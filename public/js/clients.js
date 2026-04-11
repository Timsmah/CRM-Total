function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const FR_TO_EN = {
  '1 an': '1 year', '2 ans': '2 years', '3 ans': '3 years',
  '1 mois': '1 month', '2 mois': '2 months', '3 mois': '3 months',
  '4 mois': '4 months', '5 mois': '5 months', '6 mois': '6 months',
  '7 mois': '7 months', '8 mois': '8 months', '9 mois': '9 months',
  '10 mois': '10 months', '11 mois': '11 months', '12 mois': '12 months',
  'Autre': 'Other', 'autre': 'Other',
  'Non précisé': 'Not specified', 'non précisé': 'Not specified',
  'Oui': 'Yes', 'Non': 'No',
  'Formulaire': 'Form', 'Location': 'Rental', 'Achat': 'Purchase',
};

function tr(val) {
  if (!val) return val;
  return FR_TO_EN[val] || FR_TO_EN[val.trim()] || val;
}

const CONTACT_COLS = [
  { key: 'À contacter',      label: '🆕 Prospect',        cls: 'col-to-contact'  },
  { key: 'Contacté',         label: '🎯 To Close',         cls: 'col-contacted'   },
  { key: 'Property to Find', label: '🔍 Active Search',    cls: 'col-meeting'     },
  { key: 'Urgent Sending',   label: '📤 Proposal Sent',    cls: 'col-urgent'      },
  { key: 'Rappeler',         label: '📅 Visit Planned',    cls: 'col-callback'    },
];

const Clients = {
  data: [],
  filter: 'tous',
  showArchived: false,
  focusedCol: null,
  sortDir: 'desc', // 'desc' = plus récent en premier, 'asc' = plus vieux en premier

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
        <button class="pill ${this.filter === 'tous' ? 'active' : ''}" onclick="Clients.setFilter('tous')">All</button>
        ${CONTACT_COLS.map(col =>
          `<button class="pill ${this.filter === col.key ? 'active' : ''}"
            onclick="Clients.setFilter('${col.key}')">${col.label}</button>`
        ).join('')}
      </div>
      <div class="kanban-legend">
        <span class="legend-item"><span class="legend-dot dot-red"></span>Move-in &lt; 14 days</span>
        <span class="legend-item"><span class="legend-dot dot-amber"></span>Move-in &lt; 30 days</span>
        <span class="legend-item"><span class="legend-dot dot-yellow"></span>Move-in &lt; 60 days</span>
        <span class="legend-item"><span class="legend-clock">🕐</span>Days since form submitted</span>
      </div>
      <div class="kanban-board ${this.focusedCol ? 'has-focus' : ''}">
        ${CONTACT_COLS.map(col => this.columnHTML(col)).join('')}
      </div>`;
  },

  effectiveContactStatus(c) {
    if (c.research_fees_paid && c.status === 'Recherche active') return 'Property to Find';
    return c.contact_status || 'À contacter';
  },

  filtered() {
    if (this.filter === 'tous') return this.data;
    return this.data.filter(c => this.effectiveContactStatus(c) === this.filter);
  },

  columnHTML(col) {
    // Auto-save any client that should be in 'Property to Find' but isn't stored as such
    this.filtered().forEach(c => {
      const effective = this.effectiveContactStatus(c);
      if (effective !== (c.contact_status || 'À contacter') && c.contact_status !== effective) {
        c.contact_status = effective;
        api.patch(`/clients/${c.id}/contact-status`, { contact_status: effective }).catch(() => {});
      }
    });

    const daysAgoNum = (c) => {
      const dateStr = c.form_submitted_at || c.created_at;
      if (!dateStr) return -1;
      return Math.floor((new Date() - new Date(dateStr)) / 86400000);
    };

    const cards = this.filtered()
      .filter(c => this.effectiveContactStatus(c) === col.key)
      .sort((a, b) => this.sortDir === 'desc'
        ? daysAgoNum(a) - daysAgoNum(b)   // récent en premier (peu de jours)
        : daysAgoNum(b) - daysAgoNum(a)); // vieux en premier (beaucoup de jours)

    const sortIcon = this.sortDir === 'desc' ? '↑' : '↓';
    const sortTitle = this.sortDir === 'desc' ? 'Most recent first' : 'Oldest first';

    return `
      <div class="kanban-col ${this.focusedCol === col.key ? 'focused' : ''}"
        ondragover="Clients.onDragOver(event)"
        ondragleave="Clients.onDragLeave(event)"
        ondrop="Clients.onDrop(event, '${col.key}')">
        <div class="kanban-col-header ${col.cls}" onclick="Clients.toggleFocus('${col.key}')">
          <span>${col.label}</span>
          <div style="display:flex;align-items:center;gap:6px">
            <button class="sort-btn" onclick="Clients.toggleSort(event)" title="${sortTitle}">${sortIcon} ${sortTitle}</button>
            <span class="kanban-count">${cards.length}</span>
            <span style="font-size:10px;opacity:.5">${this.focusedCol === col.key ? '✕' : '⊞'}</span>
          </div>
        </div>
        <div class="kanban-cards">
          ${cards.map(c => this.cardHTML(c)).join('') || '<p class="kanban-empty">—</p>'}
        </div>
      </div>`;
  },

  daysAgo(c) {
    const dateStr = c.form_submitted_at || c.created_at;
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
    if (days <= 60) return 'urgent-yellow';
    return '';
  },

  cardHTML(c) {
    const budgetLine = c.budget_max
      ? `${Number(c.budget_max).toLocaleString('fr-FR')} ฿${c.budget_eur ? ` · ${Number(c.budget_eur).toLocaleString('fr-FR')} €` : ''}`
      : null;
    const urgency = this.urgencyClass(c.move_in_date);
    const daysAgo = this.daysAgo(c);
    const urgencyIcon = urgency === 'urgent-red' ? ' 🔴' : urgency === 'urgent-amber' ? ' 🟠' : urgency === 'urgent-yellow' ? ' 🟡' : '';

    return `
      <div class="card kanban-card" draggable="true"
        ondragstart="Clients.onDragStart(event, ${c.id})"
        ondragend="Clients.onDragEnd(event)"
        onclick="Clients.openDetailModal(${c.id}, event)">
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
          ${budgetLine ? `<p>💰 ${budgetLine}</p>` : ''}
          ${c.zones ? `<p>📍 ${c.zones}</p>` : ''}
          ${c.move_in_date ? `<p class="${urgency}">📅 Arrival: ${formatDate(c.move_in_date)}${urgencyIcon}</p>` : ''}
          ${c.duration ? `<p>⏱ Duration: ${tr(c.duration)}</p>` : ''}
          ${c.criteria ? `<p class="card-criteria">${c.criteria}</p>` : ''}
        </div>
        <select class="cs-select" onchange="Clients.setContactStatus(${c.id}, this.value)"
          ${c.research_fees_paid && c.status === 'Recherche active' ? 'disabled title="Auto: Fees paid + Active Search"' : ''}>
          ${CONTACT_COLS.map(col =>
            `<option value="${col.key}" ${this.effectiveContactStatus(c) === col.key ? 'selected' : ''}>${col.label}</option>`
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

  toggleSort(e) {
    e.stopPropagation();
    this.sortDir = this.sortDir === 'desc' ? 'asc' : 'desc';
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

  openDetailModal(id, e) {
    if (e && (e.target.closest('button') || e.target.closest('select'))) return;
    const c = this.data.find(x => x.id === id);
    if (!c) return;
    const urgency = this.urgencyClass(c.move_in_date);
    const urgencyIcon = urgency === 'urgent-red' ? ' 🔴' : urgency === 'urgent-amber' ? ' 🟠' : urgency === 'urgent-yellow' ? ' 🟡' : '';
    const budgetLine = c.budget_max
      ? `${Number(c.budget_max).toLocaleString('fr-FR')} ฿${c.budget_eur ? ` · ${Number(c.budget_eur).toLocaleString('fr-FR')} €` : ''}`
      : '—';
    Modal.open(c.name, `
      <div class="detail-grid">
        <div class="detail-row">${badge(c.status)}${c.research_fees_paid ? '<span class="fees-btn paid">✓ Fees paid</span>' : ''}</div>
        ${c.whatsapp ? `<div class="detail-row"><span class="detail-label">📱 Phone</span><span>${c.whatsapp}</span></div>` : ''}
        <div class="detail-row"><span class="detail-label">💰 Budget</span><span>${budgetLine}</span></div>
        ${c.zones ? `<div class="detail-row"><span class="detail-label">📍 Zones</span><span>${c.zones}</span></div>` : ''}
        ${c.move_in_date ? `<div class="detail-row"><span class="detail-label">📅 Arrival</span><span class="${urgency}">${formatDate(c.move_in_date)}${urgencyIcon}</span></div>` : ''}
        ${c.duration ? `<div class="detail-row"><span class="detail-label">⏱ Duration</span><span>${tr(c.duration)}</span></div>` : ''}
        ${c.property_type ? `<div class="detail-row"><span class="detail-label">🏠 Type</span><span>${c.property_type}</span></div>` : ''}
        ${c.bedrooms ? `<div class="detail-row"><span class="detail-label">🛏 Bedrooms</span><span>${c.bedrooms}</span></div>` : ''}
        ${c.criteria ? `<div class="detail-row"><span class="detail-label">📝 Criteria</span><span>${c.criteria}</span></div>` : ''}
        ${c.source ? `<div class="detail-row"><span class="detail-label">🔗 Source</span><span>${tr(c.source)}</span></div>` : ''}
      </div>
      <div class="form-actions" style="margin-top:16px">
        <button class="btn btn-ghost" onclick="Modal.close()">Close</button>
        <button class="btn btn-secondary" onclick="Modal.close(); Clients.openEditModal(${c.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="Modal.close(); Clients.archive(${c.id})">${this.showArchived ? 'Unarchive' : 'Archive'}</button>
      </div>`);
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
