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
  'Je ne sais pas encore': 'Not decided yet', 'je ne sais pas encore': 'Not decided yet',
  'À l\'étranger': 'Abroad', 'a l\'etranger': 'Abroad',
  'Pas encore décidé': 'Not decided yet',
  'Oui': 'Yes', 'Non': 'No',
  'Formulaire': 'Form', 'Location': 'Rental', 'Achat': 'Purchase',
  'Instagram DM': 'Instagram DM',
};

function tr(val) {
  if (!val) return val;
  if (typeof getLang === 'function' && getLang() === 'fr') return val;
  return FR_TO_EN[val] || FR_TO_EN[val.trim()] || val;
}

// Translate zone string (may contain multiple comma-separated zones)
function trZone(val) {
  if (!val) return val;
  if (typeof getLang === 'function' && getLang() === 'fr') return val;
  return val.split(/,\s*/).map(z => FR_TO_EN[z.trim()] || z.trim()).join(', ');
}

const ACTION_TAGS = [
  { key: 'appeler',  emoji: '📞', label: 'À appeler',          desc: 'Premier contact à passer' },
  { key: 'rappeler', emoji: '🔄', label: 'À rappeler',          desc: 'Relance planifiée' },
  { key: 'rep',      emoji: '💬', label: 'En attente réponse',  desc: 'Message envoyé, on attend leur réponse' },
  { key: 'payer',    emoji: '💳', label: 'À faire payer',       desc: 'Frais de recherche non réglés' },
  { key: 'visite',   emoji: '🏠', label: 'Visite à planifier',  desc: 'Des propriétés à faire visiter' },
  { key: 'contrat',  emoji: '📝', label: 'Contrat à signer',    desc: 'Prêt à signer, en attente de signature' },
  { key: 'nego',     emoji: '🤝', label: 'En négociation',      desc: 'Propriété trouvée, on négocie les termes' },
  { key: 'client',   emoji: '⏳', label: 'En attente client',   desc: 'Action requise de leur côté' },
  { key: 'stop',     emoji: '🚫', label: 'Ne pas contacter',    desc: 'Pause ou indisponible temporairement' },
  { key: 'hot',      emoji: '🔥', label: 'Prioritaire',         desc: 'Client chaud, à traiter en urgence' },
  { key: 'animals',  emoji: '🐕', label: 'Animaux',             desc: 'Client avec animaux, vérifie la politique' },
  { key: 'pool',     emoji: '🏊', label: 'Piscine requise',     desc: 'Piscine obligatoire dans les critères' },
  { key: 'alex',     emoji: '📲', label: 'Alex à appeler',      desc: 'À transmettre à Alex pour qu\'il appelle' },
  { key: 'tim',      emoji: '👤', label: 'Tim',                 desc: 'À traiter par Tim' },
];

function getContactCols() {
  return [
    { key: 'À contacter',      label: t('col_prospect'), cls: 'col-to-contact' },
    { key: 'Contacté',         label: t('col_toclose'),  cls: 'col-contacted'  },
    { key: 'Property to Find', label: t('col_search'),   cls: 'col-meeting'    },
    { key: 'Urgent Sending',   label: t('col_proposal'), cls: 'col-urgent'     },
    { key: 'Rappeler',         label: t('col_visit'),    cls: 'col-callback'   },
  ];
}
const CONTACT_COLS = getContactCols(); // kept for compatibility, refreshed in render()

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
          <button class="btn btn-primary" onclick="Clients.openAddModal()">${t('clients_add')}</button>
          <button class="btn btn-secondary" onclick="Clients.syncSheets()">${t('clients_sync')}</button>
          <button class="btn btn-ghost" onclick="Clients.toggleArchived()">
            ${this.showArchived ? t('clients_active') : t('clients_archived')}
          </button>
        </div>
      </div>
      <div class="kanban-legend">
        <span class="legend-item"><span class="legend-dot dot-red"></span>${t('clients_legend_14')}</span>
        <span class="legend-sep"></span>
        <span class="legend-item"><span class="legend-dot dot-amber"></span>${t('clients_legend_30')}</span>
        <span class="legend-sep"></span>
        <span class="legend-item"><span class="legend-dot dot-yellow"></span>${t('clients_legend_60')}</span>
        <span class="legend-sep"></span>
        <span class="legend-item"><span class="legend-dot dot-future"></span>${t('clients_legend_future')}</span>
        <span class="legend-sep"></span>
        <span class="legend-item"><span class="legend-clock">🕐</span>${t('clients_legend_days')}</span>
        <button class="legend-help-btn" onclick="Clients.showTagsLegend(event)" title="Badges legend">?</button>
      </div>
      <div class="kanban-board ${this.focusedCol ? 'has-focus' : ''}">
        ${getContactCols().map(col => this.columnHTML(col)).join('')}
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
    if (days > 60) return 'urgent-future';
    return '';
  },

  cardHTML(c) {
    const budgetLine = c.budget_max
      ? `${Number(c.budget_max).toLocaleString('fr-FR')} ฿${c.budget_eur ? ` · ${Number(c.budget_eur).toLocaleString('fr-FR')} €` : ''}`
      : null;
    const urgency = this.urgencyClass(c.move_in_date);
    const daysAgo = this.daysAgo(c);
    const urgencyDot = urgency ? `<span class="legend-dot ${urgency.replace('urgent-', 'dot-')}" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-left:4px;vertical-align:middle;flex-shrink:0"></span>` : '';

    return `
      <div class="card kanban-card" data-cid="${c.id}" draggable="true"
        ondragstart="Clients.onDragStart(event, ${c.id})"
        ondragend="Clients.onDragEnd(event)"
        onclick="Clients.openDetailModal(${c.id}, event)">
        <div class="card-top">
          ${badge(c.status)}
          <div style="display:flex;align-items:center;gap:6px">
            ${daysAgo ? `<span class="days-ago-badge">🕐 ${daysAgo}</span>` : ''}
            <button class="fees-btn ${c.research_fees_paid ? 'paid' : ''}"
              onclick="Clients.toggleFees(${c.id})" title="Research fees">
              ${c.research_fees_paid ? t('clients_fees_paid') : t('clients_fees_unpaid')}
            </button>
          </div>
        </div>
        <div class="client-name">${c.name}</div>
        <div class="client-details">
          ${budgetLine ? `<p>💰 ${budgetLine}</p>` : ''}
          ${c.zones ? `<p>📍 ${trZone(c.zones)}</p>` : ''}
          ${c.move_in_date ? `<p class="${urgency}" style="display:flex;align-items:center;gap:0">📅 ${t('card_arrival')}: ${formatDate(c.move_in_date)}${urgencyDot}</p>` : ''}
          ${c.duration ? `<p>⏱ ${t('card_duration')}: ${tr(c.duration)}</p>` : ''}
          ${c.criteria ? `<p class="card-criteria">${c.criteria}</p>` : ''}
        </div>
        <div class="action-tags-row" onclick="event.stopPropagation()">
          <div class="action-tags-display">
            ${this.tagsHTML(this.getTags(c))}
            ${c.note_tim ? `<span class="action-tag tag-note" onclick="event.stopPropagation();Clients.openNoteModal(${c.id},'note_tim')" title="${c.note_tim}">📝 Tim</span>` : ''}
            ${c.note_alex ? `<span class="action-tag tag-note" onclick="event.stopPropagation();Clients.openNoteModal(${c.id},'note_alex')" title="${c.note_alex}">📝 Alex</span>` : ''}
          </div>
          <button class="add-tag-btn" onclick="Clients.toggleTagPanel(${c.id}, this)" title="Add tag">＋</button>
        </div>
        <div class="card-actions">
          <button class="btn btn-secondary btn-sm" onclick="Clients.openEditModal(${c.id})">${t('clients_edit')}</button>
          <button class="btn btn-ghost btn-sm" onclick="Clients.archive(${c.id})">
            ${this.showArchived ? t('clients_unarchive') : t('clients_archive')}
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

  // ── Action Tags ──────────────────────────────────
  getTags(c) {
    if (!c.action_tags) return [];
    try { return JSON.parse(c.action_tags); } catch { return []; }
  },

  tagsHTML(tags) {
    if (!tags || !tags.length) return `<span class="no-tags">${t('clients_no_tags')}</span>`;
    return tags.map(key => {
      const tag = ACTION_TAGS.find(x => x.key === key);
      if (!tag) return '';
      const label = getLang() === 'en' ? (TAG_EN[key] || tag.label) : tag.label;
      const extra = key === 'hot' ? ' tag-hot' : key === 'payer' ? ' tag-payer' : key === 'stop' ? ' tag-stop' : '';
      return `<span class="action-tag${extra}">${tag.emoji} ${label}</span>`;
    }).join('');
  },

  _tagPopoverClientId: null,
  _closeTagHandler: null,

  toggleTagPanel(id, btnEl) {
    // Remove any existing panel
    document.querySelectorAll('.tags-popover').forEach(p => p.remove());
    document.removeEventListener('click', this._closeTagHandler);
    // Toggle off if same card
    if (this._tagPopoverClientId === id) { this._tagPopoverClientId = null; return; }
    this._tagPopoverClientId = id;
    const c = this.data.find(x => x.id === id);
    if (!c) return;
    const tags = this.getTags(c);
    const panel = document.createElement('div');
    panel.className = 'tags-popover';
    panel.innerHTML = ACTION_TAGS.map(tag => {
      const label = getLang() === 'en' ? (TAG_EN[tag.key] || tag.label) : tag.label;
      return `<button class="tag-option ${tags.includes(tag.key) ? 'active' : ''}"
        onclick="event.stopPropagation(); Clients.toggleTag(${id}, '${tag.key}', this)">
        ${tag.emoji} ${label}
      </button>`;
    }).join('') + `
      <div style="width:100%;height:1px;background:var(--border);margin:4px 0"></div>
      <button class="tag-option tag-option-note ${c.note_tim ? 'active' : ''}"
        onclick="event.stopPropagation(); Clients.openNoteModal(${id}, 'note_tim')">
        📝 Note de Tim
      </button>
      <button class="tag-option tag-option-note ${c.note_alex ? 'active' : ''}"
        onclick="event.stopPropagation(); Clients.openNoteModal(${id}, 'note_alex')">
        📝 Note d'Alex
      </button>`;
    const rect = btnEl.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const topPos = spaceBelow < 220 ? rect.top - 220 : rect.bottom + 6;
    panel.style.cssText = `position:fixed;top:${Math.max(8, topPos)}px;left:${Math.max(8, rect.right - 244)}px;width:244px;z-index:9999;max-height:220px;overflow-y:auto`;
    document.body.appendChild(panel);
    setTimeout(() => {
      document.addEventListener('click', this._closeTagHandler = () => {
        panel.remove();
        this._tagPopoverClientId = null;
        document.removeEventListener('click', this._closeTagHandler);
      });
    }, 50);
  },

  async toggleTag(id, key, btn) {
    const c = this.data.find(x => x.id === id);
    if (!c) return;
    let tags = this.getTags(c);
    if (tags.includes(key)) {
      tags = tags.filter(t => t !== key);
      btn.classList.remove('active');
    } else {
      tags.push(key);
      btn.classList.add('active');
    }
    c.action_tags = JSON.stringify(tags);
    await api.patch(`/clients/${id}/tags`, { action_tags: tags });
    // Update display on the card directly
    const display = document.querySelector(`.kanban-card[data-cid="${id}"] .action-tags-display`);
    if (display) display.innerHTML = this.tagsHTML(tags);
  },

  openNoteModal(id, noteKey) {
    document.querySelectorAll('.tags-popover').forEach(p => p.remove());
    document.removeEventListener('click', this._closeTagHandler);
    this._tagPopoverClientId = null;
    const c = this.data.find(x => x.id === id);
    if (!c) return;
    const label = noteKey === 'note_tim' ? 'Tim' : 'Alex';
    const current = c[noteKey] || '';
    Modal.open(`📝 Note de ${label}`, `
      <textarea id="note-input" rows="6" placeholder="${t('note_write')}"
        style="width:100%;resize:vertical;font-family:inherit;font-size:13px;padding:10px;border:1px solid var(--border);border-radius:8px;outline:none;box-sizing:border-box">${current}</textarea>
      <div class="form-actions" style="margin-top:12px">
        <button class="btn btn-ghost" onclick="Modal.close()">${t('note_cancel')}</button>
        ${current ? `<button class="btn btn-ghost" onclick="Clients.saveNote(${id},'${noteKey}','')">${t('note_delete')}</button>` : ''}
        <button class="btn btn-primary" onclick="Clients.saveNote(${id},'${noteKey}',document.getElementById('note-input').value)">${t('note_save')}</button>
      </div>`);
  },

  async saveNote(id, noteKey, value) {
    Modal.close();
    const c = this.data.find(x => x.id === id);
    if (c) c[noteKey] = value || null;
    await api.patch(`/clients/${id}/note`, { [noteKey]: value || null });
    this.render();
  },

  showTagsLegend(e) {
    e.stopPropagation();
    Modal.open(t('clients_tags_legend'), `
      <div class="tags-legend-grid">
        ${ACTION_TAGS.map(tag => {
          const label = getLang() === 'en' ? (TAG_EN[tag.key] || tag.label) : tag.label;
          return `<div class="tags-legend-item">
            <span class="action-tag">${tag.emoji} ${label}</span>
            <span class="tags-legend-desc">${tag.desc}</span>
          </div>`;
        }).join('')}
      </div>
      <div class="form-actions" style="margin-top:16px">
        <button class="btn btn-ghost" onclick="Modal.close()">${t('clients_close')}</button>
      </div>`);
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
    Toast.show(this.showArchived ? t('toast_unarchived') : t('toast_archived'));
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
    if (e && (e.target.closest('button') || e.target.closest('select') || e.target.closest('.action-tags-row') || e.target.closest('.tags-popover'))) return;
    const c = this.data.find(x => x.id === id);
    if (!c) return;
    const urgency = this.urgencyClass(c.move_in_date);
    const urgencyDot = urgency ? `<span class="legend-dot ${urgency.replace('urgent-', 'dot-')}" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-left:6px;vertical-align:middle;flex-shrink:0"></span>` : '';
    const budgetLine = c.budget_max
      ? `${Number(c.budget_max).toLocaleString('fr-FR')} ฿${c.budget_eur ? ` · ${Number(c.budget_eur).toLocaleString('fr-FR')} €` : ''}`
      : '—';
    Modal.open(c.name, `
      <div class="detail-grid">
        <div class="detail-row">${badge(c.status)}${c.research_fees_paid ? `<span class="fees-btn paid">${t('detail_fees_paid')}</span>` : ''}</div>
        ${c.whatsapp ? `<div class="detail-row"><span class="detail-label">📱 ${t('detail_phone')}</span><span>${c.whatsapp}</span></div>` : ''}
        <div class="detail-row"><span class="detail-label">💰 ${t('detail_budget')}</span><span>${budgetLine}</span></div>
        ${c.zones ? `<div class="detail-row"><span class="detail-label">📍 ${t('detail_zones')}</span><span>${trZone(c.zones)}</span></div>` : ''}
        ${c.move_in_date ? `<div class="detail-row"><span class="detail-label">📅 ${t('detail_arrival')}</span><span class="${urgency}" style="display:flex;align-items:center;gap:6px">${formatDate(c.move_in_date)}${urgencyDot}</span></div>` : ''}
        ${c.duration ? `<div class="detail-row"><span class="detail-label">⏱ ${t('detail_duration')}</span><span>${tr(c.duration)}</span></div>` : ''}
        ${c.property_type ? `<div class="detail-row"><span class="detail-label">🏠 ${t('detail_type')}</span><span>${c.property_type}</span></div>` : ''}
        ${c.bedrooms ? `<div class="detail-row"><span class="detail-label">🛏 ${t('detail_bedrooms')}</span><span>${c.bedrooms}</span></div>` : ''}
        ${c.criteria ? `<div class="detail-row"><span class="detail-label">📝 ${t('detail_criteria')}</span><span>${c.criteria}</span></div>` : ''}
        ${c.source ? `<div class="detail-row"><span class="detail-label">🔗 ${t('detail_source')}</span><span>${tr(c.source)}</span></div>` : ''}
      </div>
      <div class="form-actions" style="margin-top:16px">
        <button class="btn btn-ghost" onclick="Modal.close()">${t('clients_close')}</button>
        <button class="btn btn-secondary" onclick="Modal.close(); Clients.openEditModal(${c.id})">${t('clients_edit')}</button>
        <button class="btn btn-danger btn-sm" onclick="Modal.close(); Clients.archive(${c.id})">${this.showArchived ? t('clients_unarchive') : t('clients_archive')}</button>
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
          <label>${t('form_name')}</label>
          <input name="name" required value="${c?.name || ''}">
        </div>
        <div class="form-row">
          <label>${t('form_whatsapp')}</label>
          <input name="whatsapp" placeholder="+66 XX XXX XXXX" value="${c?.whatsapp || ''}">
        </div>
        <div class="form-2">
          <div class="form-row">
            <label>${t('form_budget_min')}</label>
            <input name="budget_min" type="number" value="${c?.budget_min || ''}">
          </div>
          <div class="form-row">
            <label>${t('form_budget_max')}</label>
            <input name="budget_max" type="number" value="${c?.budget_max || ''}">
          </div>
        </div>
        <div class="form-row">
          <label>${t('form_zones')}</label>
          <input name="zones" placeholder="Sukhumvit, Thonglor, Ari…" value="${c?.zones || ''}">
        </div>
        <div class="form-row">
          <label>${t('form_criteria')}</label>
          <textarea name="criteria" rows="2" placeholder="2 BR, balcony, pool…">${c?.criteria || ''}</textarea>
        </div>
        <div class="form-2">
          <div class="form-row">
            <label>${t('form_source')}</label>
            <select name="source">
              ${sources.map(s => `<option ${c?.source === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <label>${t('form_pipeline')}</label>
            <select name="status">
              ${statuses.map(s => `<option ${c?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">${t('clients_cancel')}</button>
          <button type="submit" class="btn btn-primary">${c ? t('clients_save') : t('clients_add_btn')}</button>
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
