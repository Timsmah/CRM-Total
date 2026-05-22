const Recherches = {
  data: [],

  COLS: [
    { key: 'Property to Find', label: 'Property to Find', color: '#F97316', icon: '🔍' },
    { key: 'Property Sent',    label: 'Property Sent',    color: '#3B82F6', icon: '📤' },
    { key: 'Visit Planned',    label: 'Visit Planned',    color: '#8B5CF6', icon: '🏠' },
    { key: 'Closed',           label: 'Closed',           color: '#22C55E', icon: '✅' },
  ],

  async init() {
    document.getElementById('content').innerHTML = '<p class="spinner">Loading…</p>';
    try {
      this.data = await api.get('/clients?archived=0');
    } catch { Toast.show('Error loading recherches', 'error'); return; }
    this.render();
  },

  activeClients() {
    return this.data.filter(c => c.status === 'Recherche active');
  },

  stageOf(c) {
    return c.search_stage || 'Property to Find';
  },

  render() {
    const clients = this.activeClients();
    document.getElementById('content').innerHTML = `
      <div class="rech-header">
        <div>
          <h1 class="rech-title">🔍 Process Recherche</h1>
          <p class="rech-sub">${clients.length} client${clients.length !== 1 ? 's' : ''} en recherche active</p>
        </div>
        <button class="btn btn-primary" onclick="Recherches.openAddModal()">+ Nouveau client</button>
      </div>

      <div class="rech-board">
        ${this.COLS.map(col => {
          const colClients = clients.filter(c => this.stageOf(c) === col.key);
          return this.colHTML(col, colClients);
        }).join('')}
      </div>`;
  },

  colHTML(col, clients) {
    return `
      <div class="rech-col"
        ondragover="event.preventDefault();this.classList.add('rech-drag-over')"
        ondragleave="if(!this.contains(event.relatedTarget))this.classList.remove('rech-drag-over')"
        ondrop="Recherches.onDrop(event,'${col.key}')">
        <div class="rech-col-header" style="border-top:3px solid ${col.color}">
          <span class="rech-col-title">${col.icon} ${col.label}</span>
          <span class="rech-col-count" style="background:${col.color}22;color:${col.color}">${clients.length}</span>
        </div>
        <div class="rech-cards">
          ${clients.map(c => this.cardHTML(c)).join('')
            || '<p class="rech-empty">—</p>'}
        </div>
      </div>`;
  },

  cardHTML(c) {
    const budgetLine = c.budget_max
      ? `${Number(c.budget_max).toLocaleString('fr-FR')} ฿${c.budget_eur ? ` · ${Number(c.budget_eur).toLocaleString('fr-FR')} €` : ''}`
      : null;

    let urgencyColor = null;
    if (c.move_in_date) {
      const days = Math.ceil((new Date(c.move_in_date) - new Date()) / 86400000);
      urgencyColor = days <= 14 ? '#DC2626' : days <= 30 ? '#EA580C' : days <= 60 ? '#D97706' : null;
    }

    const colorDef = typeof CARD_COLORS !== 'undefined'
      ? (CARD_COLORS.find(x => x.key === (c.card_color || null)) || CARD_COLORS[0])
      : null;
    const cardStyle = colorDef?.bg ? `background:${colorDef.bg};border-color:${colorDef.border}` : '';

    return `
      <div class="rech-card" draggable="true" style="${cardStyle}"
        ondragstart="Recherches.onDragStart(event,${c.id})"
        ondragend="event.currentTarget.classList.remove('rech-dragging')"
        onclick="Recherches.openDetail(${c.id})">
        <div class="rech-card-name">${c.name}</div>
        <div class="rech-card-rows">
          ${budgetLine ? `<div class="rech-card-row">💰 ${budgetLine}</div>` : ''}
          ${c.zones ? `<div class="rech-card-row">📍 ${c.zones}</div>` : ''}
          ${c.property_type ? `<div class="rech-card-row">🏠 ${c.property_type}${c.bedrooms ? ' · ' + c.bedrooms : ''}</div>` : ''}
          ${c.move_in_date
            ? `<div class="rech-card-row" style="${urgencyColor ? `color:${urgencyColor};font-weight:600` : ''}">📅 ${formatDate(c.move_in_date)}</div>`
            : ''}
          ${c.duration ? `<div class="rech-card-row">⏱ ${tr(c.duration)}</div>` : ''}
        </div>
        ${c.criteria ? `<div class="rech-card-criteria">${c.criteria}</div>` : ''}
      </div>`;
  },

  onDragStart(e, id) {
    e.dataTransfer.setData('rechId', id);
    e.currentTarget.classList.add('rech-dragging');
  },

  async onDrop(e, stage) {
    e.preventDefault();
    e.currentTarget.classList.remove('rech-drag-over');
    const id = Number(e.dataTransfer.getData('rechId'));
    if (!id) return;
    const c = this.data.find(x => x.id === id);
    if (!c || this.stageOf(c) === stage) return;
    c.search_stage = stage;
    await api.patch(`/clients/${id}/search-stage`, { search_stage: stage });
    this.render();
  },

  openDetail(id) {
    // Merge into Clients.data so the shared detail modal works
    if (typeof Clients !== 'undefined') {
      const existing = Clients.data.findIndex(x => x.id === id);
      const c = this.data.find(x => x.id === id);
      if (!c) return;
      if (existing === -1) Clients.data.push(c);
      else Clients.data[existing] = c;
      Clients.openDetailModal(id);
    }
  },

  openAddModal() {
    if (typeof Clients !== 'undefined') {
      // Pre-fill status = Recherche active
      Modal.open('Nouveau client', Clients.formHTML({ status: 'Recherche active' }));
    }
  },
};
