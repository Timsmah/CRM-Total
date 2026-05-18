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

// ── Card colour palette ───────────────────────────────────────────────────────
const CARD_COLORS = [
  { key: null,       label: 'Défaut',  bg: null,      border: null,      dot: '#CBD5E1' },
  { key: 'red',      label: 'Rouge',   bg: '#FEE2E2', border: '#FCA5A5', dot: '#EF4444' },
  { key: 'orange',   label: 'Orange',  bg: '#FFEDD5', border: '#FDBA74', dot: '#F97316' },
  { key: 'yellow',   label: 'Jaune',   bg: '#FEF9C3', border: '#FDE047', dot: '#EAB308' },
  { key: 'green',    label: 'Vert',    bg: '#DCFCE7', border: '#86EFAC', dot: '#22C55E' },
  { key: 'blue',     label: 'Bleu',    bg: '#DBEAFE', border: '#93C5FD', dot: '#3B82F6' },
  { key: 'purple',   label: 'Violet',  bg: '#F3E8FF', border: '#D8B4FE', dot: '#A855F7' },
  { key: 'pink',     label: 'Rose',    bg: '#FCE7F3', border: '#F9A8D4', dot: '#EC4899' },
  { key: 'gray',     label: 'Gris',    bg: '#F1F5F9', border: '#CBD5E1', dot: '#94A3B8' },
];

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
  { key: 'nono_app', emoji: '📲', label: 'Nono à appeler',      desc: 'À transmettre à Nono pour qu\'il appelle' },
  { key: 'nono',     emoji: '👤', label: 'Nono',                desc: 'À traiter par Nono' },
  { key: 'tim',      emoji: '👤', label: 'Tim',                 desc: 'À traiter par Tim' },
];

function getContactCols() {
  return [
    { key: 'À contacter',      label: t('col_prospect'), cls: 'col-to-contact' },
    { key: 'Contacté',         label: t('col_toclose'),  cls: 'col-contacted'  },
    { key: 'Property to Find', label: t('col_search'),   cls: 'col-meeting'    },
    { key: 'Urgent Sending',   label: t('col_proposal'), cls: 'col-urgent'     },
    { key: 'Rappeler',         label: t('col_visit'),    cls: 'col-callback'   },
    { key: 'Closed',           label: 'Closed',          cls: 'col-closed'     },
  ];
}
const CONTACT_COLS = getContactCols(); // kept for compatibility, refreshed in render()

const Clients = {
  data: [],
  filter: 'tous',
  showArchived: false,
  focusedCol: null,
  sortDir: 'desc',
  clientFilters: { status: '', zone: '', tag: '', urgency: '' },

  async init() {
    document.getElementById('content').innerHTML = '<p class="spinner">Syncing…</p>';
    try { await api.post('/clients/sync/sheets', {}); } catch {}
    await this.load();
    this.render();
    this._checkReminders();
  },

  _checkReminders() {
    const today = new Date().toISOString().split('T')[0];
    const due = this.data.filter(c => c.reminder_date && c.reminder_date <= today);
    if (!due.length) return;

    // Notification navigateur
    const send = () => {
      due.forEach(c => {
        const isPast = c.reminder_date < today;
        const title = isPast ? `⏰ Rappel en retard — ${c.name}` : `🔔 Rappel aujourd'hui — ${c.name}`;
        const body  = c.reminder_note || 'Pas de note';
        new Notification(title, { body, icon: '/favicon.svg' });
      });
    };

    if (Notification.permission === 'granted') {
      send();
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => { if (p === 'granted') send(); });
    }

    // Toast récap dans l'app
    const label = due.length === 1
      ? `🔔 1 rappel aujourd'hui : ${due[0].name}`
      : `🔔 ${due.length} rappels en attente`;
    Toast.show(label, 'info');
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
        <button class="legend-btn" onclick="Clients.showLegend(this)" title="Légende couleurs">🎨</button>
      </div>
      ${this.filterBarHTML()}
      <div class="kanban-board ${this.focusedCol ? 'has-focus' : ''}">
        ${getContactCols().map(col => this.columnHTML(col)).join('')}
      </div>`;
  },

  filterBarHTML() {
    const SKIP = /non\s*pr[eé]cis[eé]|je ne sais|pas encore|autre/i;
    const zones = [...new Set(
      this.data.flatMap(c => (c.zones||'').split(/,\s*/).map(z => z.trim()).filter(z => z && !SKIP.test(z)))
    )].sort();
    const statuses = ['Prospect','Onboarding','Recherche active','Signé','Perdu'];
    const f = this.clientFilters;
    const active = Object.values(f).some(v => v);
    return `
      <div class="filter-bar">
        <select class="filter-select" onchange="Clients.setClientFilter('status',this.value)">
          <option value="">All statuses</option>
          ${statuses.map(s => `<option value="${s}" ${f.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
        <select class="filter-select" onchange="Clients.setClientFilter('zone',this.value)">
          <option value="">All zones</option>
          ${zones.map(z => `<option value="${z}" ${f.zone===z?'selected':''}>${z}</option>`).join('')}
        </select>
        <select class="filter-select" onchange="Clients.setClientFilter('tag',this.value)">
          <option value="">All tags</option>
          ${ACTION_TAGS.map(tag => `<option value="${tag.key}" ${f.tag===tag.key?'selected':''}>${tag.emoji} ${tag.label}</option>`).join('')}
        </select>
        <select class="filter-select" onchange="Clients.setClientFilter('urgency',this.value)">
          <option value="">All urgencies</option>
          <option value="urgent-red"    ${f.urgency==='urgent-red'?'selected':''}>🔴 &lt;14 days</option>
          <option value="urgent-amber"  ${f.urgency==='urgent-amber'?'selected':''}>🟠 &lt;30 days</option>
          <option value="urgent-yellow" ${f.urgency==='urgent-yellow'?'selected':''}>🟡 &lt;60 days</option>
          <option value="urgent-future" ${f.urgency==='urgent-future'?'selected':''}>🔵 &gt;60 days</option>
        </select>
        ${active ? `<button class="btn btn-ghost btn-sm" onclick="Clients.clearClientFilters()">✕ Clear</button>` : ''}
        <span style="margin-left:auto;font-size:12px;color:var(--text-3)">
          ${active
            ? `<strong style="color:var(--accent)">${this.countFiltered()}</strong> / ${this.data.length} clients`
            : `${this.data.length} clients`}
        </span>
      </div>`;
  },

  countFiltered() {
    return this.data.filter(c => this._matchClientFilters(c)).length;
  },

  _matchClientFilters(c) {
    const f = this.clientFilters;
    if (f.status && c.status !== f.status) return false;
    if (f.zone && !(c.zones||'').toLowerCase().includes(f.zone.toLowerCase())) return false;
    if (f.tag && !this.getTags(c).includes(f.tag)) return false;
    if (f.urgency && this.urgencyClass(c.move_in_date) !== f.urgency) return false;
    return true;
  },

  setClientFilter(key, val) {
    this.clientFilters[key] = val;
    this.render();
  },

  clearClientFilters() {
    this.clientFilters = { status: '', zone: '', tag: '', urgency: '' };
    this.render();
  },

  effectiveContactStatus(c) {
    return c.contact_status || 'À contacter';
  },

  filtered() {
    if (this.filter === 'tous') return this.data;
    return this.data.filter(c => this.effectiveContactStatus(c) === this.filter);
  },

  columnHTML(col) {

    const daysAgoNum = (c) => {
      const dateStr = c.form_submitted_at || c.created_at;
      if (!dateStr) return -1;
      return Math.floor((new Date() - new Date(dateStr)) / 86400000);
    };

    const cards = this.filtered()
      .filter(c => this.effectiveContactStatus(c) === col.key)
      .filter(c => this._matchClientFilters(c))
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

    // Manual card color
    const colorDef = CARD_COLORS.find(x => x.key === (c.card_color || null)) || CARD_COLORS[0];
    const cardStyle = colorDef.bg
      ? `background:${colorDef.bg};border-color:${colorDef.border}`
      : '';

    // Back face: note preview
    const noteText = c.note_tim || c.note_alex || '';
    const notePreview = noteText
      ? `<div class="card-back-note">📌 ${noteText.substring(0, 90)}${noteText.length > 90 ? '…' : ''}</div>`
      : '';

    // Back face: quick tag state
    const tags = this.getTags(c);
    const hasAppeler  = tags.includes('appeler');
    const hasRappeler = tags.includes('rappeler');

    return `
      <div class="kanban-card" data-cid="${c.id}" draggable="true"
        ondragstart="Clients.onDragStart(event, ${c.id})"
        ondragend="Clients.onDragEnd(event)">

        <div class="card-inner" id="card-inner-${c.id}"
          onclick="Clients.flipCard(${c.id}, event)">

          <!-- ── FRONT ── -->
          <div class="card-face card-front" style="${cardStyle}"
            oncontextmenu="event.preventDefault();event.stopPropagation();Clients.showColorPicker(${c.id}, event)">

            <div class="card-top">
              ${badge(c.status)}
              <div style="display:flex;align-items:center;gap:6px">
                ${daysAgo ? `<span class="days-ago-badge">🕐 ${daysAgo}</span>` : ''}
                <button class="fees-btn ${c.research_fees_paid ? 'paid' : ''}"
                  onclick="event.stopPropagation();Clients.toggleFees(${c.id})" title="Research fees">
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
            </div>

            <div class="action-tags-row" onclick="event.stopPropagation()">
              <div class="action-tags-display">
                <div class="tags-group tags-group-actions">
                  ${this.actionTagsHTML(this.getTags(c))}
                  ${this.reminderChipHTML(c)}
                  ${this.allTagsEmpty(c) ? `<span class="no-tags">${t('clients_no_tags')}</span>` : ''}
                </div>
                ${this.personTagsHTML(this.getTags(c), c) ? `
                  <div class="tags-group tags-group-people">
                    ${this.personTagsHTML(this.getTags(c), c)}
                  </div>` : ''}
              </div>
              <button class="add-tag-btn" onclick="Clients.toggleTagPanel(${c.id}, this)" title="Add tag">＋</button>
            </div>

          </div>

          <!-- ── BACK ── -->
          <div class="card-face card-back" style="${cardStyle}">

            <div class="card-back-header">
              <span class="card-back-name">${c.name.split(' ')[0]}</span>
              <span class="card-back-hint">clic pour retourner</span>
            </div>

            ${c.whatsapp
              ? `<div class="card-contact-row">
                  <span>📱</span>
                  <a href="tel:${c.whatsapp}" class="card-contact-link" onclick="event.stopPropagation()">${c.whatsapp}</a>
                  <button class="card-copy-btn" onclick="event.stopPropagation();navigator.clipboard.writeText('${c.whatsapp}').then(()=>Toast.show('Copié ✓','success'))" title="Copier">📋</button>
                </div>`
              : `<p class="card-no-contact">Pas de numéro</p>`}

            ${notePreview}

            <!-- Recent activity log (loaded on flip) -->
            <div class="card-act-log" id="card-act-${c.id}">
              <span class="card-act-loading">…</span>
            </div>

            <div class="card-back-actions">
              <button class="card-back-btn ${hasAppeler ? 'cbtn-active' : ''}"
                onclick="event.stopPropagation();Clients.toggleTagFromBack(${c.id},'appeler',this)">📞 Appeler</button>
              <button class="card-back-btn ${hasRappeler ? 'cbtn-active' : ''}"
                onclick="event.stopPropagation();Clients.toggleTagFromBack(${c.id},'rappeler',this)">🔄 Rappeler</button>
              <button class="card-back-btn cbtn-open"
                onclick="event.stopPropagation();Clients.flipBack(${c.id});setTimeout(()=>Clients.openDetailModal(${c.id}),120)">📋 Fiche</button>
            </div>

          </div>

        </div>
      </div>`;
  },

  flipCard(id, event) {
    if (event && (
      event.target.closest('button') ||
      event.target.closest('select') ||
      event.target.closest('a') ||
      event.target.closest('.action-tags-row') ||
      event.target.closest('.tags-popover') ||
      event.target.closest('.color-picker-popover')
    )) return;
    const inner = document.getElementById(`card-inner-${id}`);
    if (!inner) return;
    const isFlipping = !inner.classList.contains('flipped');
    inner.classList.toggle('flipped');
    if (isFlipping) this._loadCardActivities(id);
  },

  async _loadCardActivities(id) {
    const slot = document.getElementById(`card-act-${id}`);
    if (!slot || slot.dataset.loaded) return; // only fetch once
    slot.dataset.loaded = '1';
    try {
      const rows = await api.get(`/activities?client_id=${id}`);
      if (!rows.length) {
        slot.innerHTML = '<p class="card-act-empty">Aucune activité récente</p>';
        return;
      }
      const ICONS = { call:'📞', whatsapp:'💬', visit:'🏠', email:'✉️', note:'📝', proposal:'📤', system:'⚙️' };
      slot.innerHTML = rows.slice(0, 3).map(r => `
        <div class="card-act-entry">
          <span class="card-act-icon">${ICONS[r.type] || '📌'}</span>
          <div class="card-act-body">
            <span class="card-act-meta">${r.author} · ${this._relativeTime(r.created_at)}</span>
            ${r.content ? `<p class="card-act-text">${r.content}</p>` : ''}
          </div>
        </div>`).join('');
    } catch {
      slot.innerHTML = '<p class="card-act-empty">—</p>';
    }
  },

  flipBack(id) {
    const inner = document.getElementById(`card-inner-${id}`);
    if (inner) inner.classList.remove('flipped');
  },

  async toggleTagFromBack(id, key, btn) {
    const c = this.data.find(x => x.id === id);
    if (!c) return;
    let tags = this.getTags(c);
    if (tags.includes(key)) {
      tags = tags.filter(k => k !== key);
      btn.classList.remove('cbtn-active');
    } else {
      tags.push(key);
      btn.classList.add('cbtn-active');
    }
    c.action_tags = JSON.stringify(tags);
    await api.patch(`/clients/${id}/tags`, { action_tags: tags });
    const display = document.querySelector(`.kanban-card[data-cid="${id}"] .action-tags-display`);
    if (display) display.innerHTML = this.fullTagsHTML(c);
  },

  // ── Card colour picker ───────────────────────────────────────────────────────
  showColorPicker(id, event) {
    document.querySelectorAll('.color-picker-popover').forEach(p => p.remove());
    const c = this.data.find(x => x.id === id);
    if (!c) return;

    const labels = this._colorLabels();
    const picker = document.createElement('div');
    picker.className = 'color-picker-popover';
    picker.innerHTML = `
      <div class="cp-title">🎨 Couleur de la carte</div>
      <div class="cp-swatches">
        ${CARD_COLORS.map(col => `
          <button class="cp-swatch ${(c.card_color || null) === col.key ? 'cp-active' : ''}"
            style="background:${col.bg || '#fff'};border-color:${col.border || '#CBD5E1'}"
            title="${labels[col.key] || col.label}"
            onclick="event.stopPropagation();Clients.setCardColor(${id},'${col.key || ''}',this)">
            ${(c.card_color || null) === col.key ? '✓' : ''}
          </button>`).join('')}
      </div>
      <div class="cp-hint">Clic droit sur une carte pour changer</div>`;

    const x = Math.min(event.clientX, window.innerWidth - 230);
    const y = Math.min(event.clientY, window.innerHeight - 160);
    picker.style.cssText = `position:fixed;top:${y}px;left:${x}px;z-index:9999`;
    document.body.appendChild(picker);

    setTimeout(() => {
      document.addEventListener('click', function h() {
        picker.remove();
        document.removeEventListener('click', h);
      });
    }, 50);
  },

  setCardColor(id, colorKey, swatchBtn) {
    const c = this.data.find(x => x.id === id);
    if (!c) return;
    const key = colorKey || null;
    c.card_color = key;

    // ── 1. Update DOM instantly (optimistic) ──────────────────────────────
    const colorDef = CARD_COLORS.find(x => x.key === key) || CARD_COLORS[0];
    const bg     = colorDef.bg     || '';
    const border = colorDef.border || '';
    const card = document.querySelector(`.kanban-card[data-cid="${id}"]`);
    if (card) {
      card.querySelectorAll('.card-face').forEach(face => {
        face.style.background    = bg;
        face.style.borderColor   = border;
      });
    }

    // Update swatch checkmarks
    const picker = swatchBtn.closest('.color-picker-popover');
    if (picker) {
      picker.querySelectorAll('.cp-swatch').forEach(b => { b.textContent = ''; b.classList.remove('cp-active'); });
      swatchBtn.textContent = '✓';
      swatchBtn.classList.add('cp-active');
    }

    // Close picker
    setTimeout(() => document.querySelectorAll('.color-picker-popover').forEach(p => p.remove()), 280);

    // ── 2. Persist to DB (async, silent failure) ──────────────────────────
    api.patch(`/clients/${id}/color`, { card_color: key })
      .catch(() => Toast.show('Couleur non sauvegardée — vérifiez la colonne card_color en DB', 'error'));
  },

  // ── Legend ───────────────────────────────────────────────────────────────────
  _colorLabels() {
    try { return JSON.parse(localStorage.getItem('card_color_labels') || '{}'); } catch { return {}; }
  },
  _saveColorLabel(key, label) {
    const obj = this._colorLabels();
    if (label) obj[key || 'default'] = label; else delete obj[key || 'default'];
    localStorage.setItem('card_color_labels', JSON.stringify(obj));
  },

  showLegend(btn) {
    const existing = document.querySelector('.color-legend-panel');
    if (existing) { existing.remove(); return; }

    const labels = this._colorLabels();
    const panel = document.createElement('div');
    panel.className = 'color-legend-panel';
    panel.innerHTML = `
      <div class="cp-title" style="margin-bottom:10px">🎨 Légende des couleurs</div>
      ${CARD_COLORS.slice(1).map(col => `
        <div class="legend-row">
          <span class="legend-dot-color" style="background:${col.dot}"></span>
          <input class="legend-label-input" type="text" placeholder="${col.label}"
            value="${labels[col.key] || ''}"
            oninput="Clients._saveColorLabel('${col.key}', this.value)"
            style="background:${col.bg};border-color:${col.border}">
        </div>`).join('')}
      <p style="font-size:11px;color:var(--text-3);margin-top:10px">Les libellés sont sauvegardés localement.</p>`;

    const rect = btn.getBoundingClientRect();
    panel.style.cssText = `position:fixed;top:${rect.bottom + 6}px;left:${rect.left}px;z-index:9999`;
    document.body.appendChild(panel);

    setTimeout(() => {
      document.addEventListener('click', function h(e) {
        if (!e.target.closest('.color-legend-panel') && !e.target.closest('.legend-btn')) {
          panel.remove(); document.removeEventListener('click', h);
        }
      });
    }, 50);
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

  _PERSON_KEYS: ['tim', 'nono'],

  _tagHTML(key) {
    const tag = ACTION_TAGS.find(x => x.key === key);
    if (!tag) return '';
    const label = getLang() === 'en' ? (TAG_EN[key] || tag.label) : tag.label;
    const extra = key === 'hot' ? ' tag-hot' : key === 'payer' ? ' tag-payer' : key === 'stop' ? ' tag-stop' : key === 'tim' ? ' tag-tim' : (key === 'nono' || key === 'nono_app') ? ' tag-nono' : '';
    return `<span class="action-tag${extra}">${tag.emoji} ${label}</span>`;
  },

  // Tags d'action (À appeler, En attente, Nono à appeler, etc.) — hors personnes simples
  actionTagsHTML(tags) {
    if (!tags || !tags.length) return '';
    // Migration alex → nono_app
    const normalized = tags.map(k => k === 'alex' ? 'nono_app' : k);
    return normalized.filter(k => !this._PERSON_KEYS.includes(k)).map(k => this._tagHTML(k)).join('');
  },

  // Tags personnes (tout le monde voit tout, admin inclus)
  personTagsHTML(tags, c) {
    // Migration : alex → nono_app pour les anciens tags
    const normalized = (tags || []).map(k => k === 'alex' ? 'nono_app' : k);
    const personTags = normalized.filter(k => this._PERSON_KEYS.includes(k)).map(k => this._tagHTML(k)).join('');
    const notes = (c.note_tim  ? `<span class="action-tag tag-tim"  onclick="event.stopPropagation();Clients.openDetailModal(${c.id})"  title="${c.note_tim}">📝 Tim</span>`  : '')
                + (c.note_alex ? `<span class="action-tag tag-nono" onclick="event.stopPropagation();Clients.openDetailModal(${c.id})" title="${c.note_alex}">📝 Nono</span>` : '');
    return personTags + notes;
  },

  // Rendu complet des tags avec séparation action | personnes (pour mise à jour live)
  fullTagsHTML(c) {
    const tags = this.getTags(c);
    const actionHtml = this.actionTagsHTML(tags) + this.reminderChipHTML(c);
    const personHtml = this.personTagsHTML(tags, c);
    const isEmpty = !actionHtml && !personHtml;
    return `
      <div class="tags-group tags-group-actions">
        ${actionHtml}
        ${isEmpty ? `<span class="no-tags">${t('clients_no_tags')}</span>` : ''}
      </div>
      ${personHtml ? `<div class="tags-group tags-group-people">${personHtml}</div>` : ''}`;
  },

  // Gardé pour compatibilité (legend, etc.)
  tagsHTML(tags) {
    if (!tags || !tags.length) return '';
    return tags.map(k => this._tagHTML(k)).join('');
  },

  noteChipsHTML(c) {
    return (c.note_tim  ? `<span class="action-tag tag-tim"  onclick="event.stopPropagation();Clients.openDetailModal(${c.id})" title="${c.note_tim}">📝 Tim</span>`  : '')
         + (c.note_alex ? `<span class="action-tag tag-nono" onclick="event.stopPropagation();Clients.openDetailModal(${c.id})" title="${c.note_alex}">📝 Nono</span>` : '');
  },

  reminderChipHTML(c) {
    if (!c.reminder_date) return '';
    const today = new Date().toISOString().split('T')[0];
    const isToday = c.reminder_date === today;
    const isPast  = c.reminder_date < today;
    const cls     = isPast ? ' tag-hot' : isToday ? ' tag-payer' : ' tag-reminder';
    const dateStr = fmtDate(c.reminder_date);
    return `<span class="action-tag${cls} reminder-chip" onclick="event.stopPropagation();Clients.openReminderModal(${c.id})" title="${c.reminder_note || ''}">🔔 ${dateStr}</span>`;
  },

  allTagsEmpty(c) {
    const tags = this.getTags(c);
    return !tags.length && !c.note_tim && !c.note_alex && !c.reminder_date;
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
      <button class="tag-option tag-option-note ${c.note_tim || c.note_alex ? 'active' : ''}"
        onclick="event.stopPropagation(); document.querySelectorAll('.tags-popover').forEach(p=>p.remove()); Clients.openDetailModal(${id})">
        📌 ${c.note_tim || c.note_alex ? 'Voir la note' : 'Ajouter une note'}
      </button>
      <button class="tag-option tag-option-reminder ${c.reminder_date ? 'active' : ''}"
        onclick="event.stopPropagation(); Clients.openReminderModal(${id})">
        🔔 ${t('reminder_tag')}
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
    if (display) display.innerHTML = this.fullTagsHTML(c);
  },

  editPinnedNote(id) {
    const c = this.data.find(x => x.id === id);
    if (!c) return;
    const noteKey = (typeof App !== 'undefined' && App.role === 'guest') ? 'note_alex' : 'note_tim';
    const current = c[noteKey] || '';
    const body = document.getElementById(`pinned-note-body-${id}`);
    if (!body) return;
    body.innerHTML = `
      <textarea id="pinned-textarea-${id}" rows="3"
        style="width:100%;resize:vertical;font-family:inherit;font-size:13px;padding:8px;border:1px solid var(--accent);border-radius:8px;outline:none;box-sizing:border-box;margin-bottom:6px">${current}</textarea>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost btn-sm" onclick="Clients._cancelPinnedNote(${id},'${current.replace(/'/g,"\\'")}')">Annuler</button>
        ${current ? `<button class="btn btn-ghost btn-sm" onclick="Clients.savePinnedNote(${id},'${noteKey}','')">🗑 Supprimer</button>` : ''}
        <button class="btn btn-primary btn-sm" onclick="Clients.savePinnedNote(${id},'${noteKey}',document.getElementById('pinned-textarea-${id}').value)">Enregistrer</button>
      </div>`;
    document.getElementById(`pinned-textarea-${id}`)?.focus();
  },

  _cancelPinnedNote(id, original) {
    const body = document.getElementById(`pinned-note-body-${id}`);
    if (!body) return;
    body.innerHTML = original
      ? `<p class="pinned-note-text">${original}</p>`
      : `<p class="pinned-note-empty">Aucune note…</p>`;
  },

  async savePinnedNote(id, noteKey, value) {
    const c = this.data.find(x => x.id === id);
    if (!c) return;
    c[noteKey] = value || null;
    await api.patch(`/clients/${id}/note`, { [noteKey]: value || null });
    const body = document.getElementById(`pinned-note-body-${id}`);
    if (body) body.innerHTML = value
      ? `<p class="pinned-note-text">${value}</p>`
      : `<p class="pinned-note-empty">Aucune note…</p>`;
    // Mettre à jour le chip sur la carte
    const display = document.querySelector(`.kanban-card[data-cid="${id}"] .action-tags-display`);
    if (display) display.innerHTML = this.fullTagsHTML(c);
  },

  // ── Reminders ────────────────────────────────────
  openReminderModal(id) {
    document.querySelectorAll('.tags-popover').forEach(p => p.remove());
    document.removeEventListener('click', this._closeTagHandler);
    this._tagPopoverClientId = null;
    const c = this.data.find(x => x.id === id);
    if (!c) return;
    const today = new Date().toISOString().split('T')[0];
    const curDate = c.reminder_date || today;
    const curNote = c.reminder_note || '';
    Modal.open(t('reminder_title'), `
      <div class="form-row">
        <label>${t('reminder_date_lbl')}</label>
        <input type="date" id="rem-date" value="${curDate}" style="font-family:inherit">
      </div>
      <div class="form-row">
        <label>${t('reminder_note_lbl')}</label>
        <textarea id="rem-note" rows="3" placeholder="Relancer pour…" style="font-family:inherit">${curNote}</textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" onclick="Modal.close()">${t('reminder_cancel')}</button>
        ${c.reminder_date ? `<button class="btn btn-ghost" onclick="Clients.saveReminder(${id},'','')">${t('reminder_delete')}</button>` : ''}
        <button class="btn btn-primary" onclick="Clients.saveReminder(${id},document.getElementById('rem-date').value,document.getElementById('rem-note').value)">${t('reminder_save')}</button>
      </div>`);
  },

  async saveReminder(id, date, note) {
    Modal.close();
    const c = this.data.find(x => x.id === id);
    if (c) { c.reminder_date = date || null; c.reminder_note = note || null; }
    await api.patch(`/clients/${id}/reminder`, { reminder_date: date || null, reminder_note: note || null });
    // Update card chip in-place
    const cardEl = document.querySelector(`.kanban-card[data-cid="${id}"] .reminder-chip`);
    const display = document.querySelector(`.kanban-card[data-cid="${id}"] .action-tags-display`);
    if (display && c) {
      // Re-render just the tags display
      const tags = this.getTags(c);
      display.innerHTML = this.fullTagsHTML(c);
    }
    // Also refresh Today if visible
    if (typeof Today !== 'undefined' && Router.current === 'today') Today.init();
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
    this.flipBack(id); // reset flip before drag
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
    if (colKey === 'Closed') await this._createContractFromClient(id);
  },

  async _createContractFromClient(clientId) {
    const c = this.data.find(x => x.id === clientId);
    if (!c) return;
    // Check if an active contract already exists for this client
    try {
      const deals = await api.get('/deals');
      const existing = deals.find(d => d.client_id === clientId && d.status === 'En cours');
      if (existing) {
        Toast.show(`📋 Contrat déjà existant pour ${c.name}`);
        return;
      }
      await api.post('/deals', { client_id: clientId, status: 'En cours' });
      Toast.show(`✅ Contrat créé pour ${c.name} — voir l'onglet Contracts`);
    } catch (err) {
      Toast.show('Erreur création contrat : ' + err.message, 'error');
    }
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
        ${c.reminder_date ? `<div class="detail-row"><span class="detail-label">🔔 ${t('reminder_title')}</span><span>${fmtDate(c.reminder_date)}${c.reminder_note ? ' — ' + c.reminder_note : ''}</span></div>` : ''}
      </div>

      <div class="modal-sep"></div>
      <div class="modal-sub-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>🏠 ${t('match_title')}</span>
      </div>
      <div id="matching-slot-${id}" class="sub-list-slot"><span class="spinner-sm">…</span></div>

      <div class="modal-sep"></div>
      <div class="modal-sub-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>📋 ${t('proposals_title')}</span>
        <button class="btn btn-sm btn-secondary" onclick="Clients.openProposalPickModal(${id})">+ ${t('proposals_add')}</button>
      </div>
      <div id="proposals-slot-${id}" class="sub-list-slot"><span class="spinner-sm">…</span></div>

      <div class="modal-sep"></div>
      <div class="modal-sub-title">📓 Activity log</div>

      <!-- Note épinglée -->
      <div class="pinned-note" id="pinned-note-${id}">
        <div class="pinned-note-header">
          <span class="pinned-note-label">📌 Note rapide</span>
          <button class="pinned-note-btn" onclick="Clients.editPinnedNote(${id})">Modifier</button>
        </div>
        <div class="pinned-note-body" id="pinned-note-body-${id}">
          ${(c.note_tim || c.note_alex)
            ? `<p class="pinned-note-text">${c.note_tim || c.note_alex}</p>`
            : `<p class="pinned-note-empty">Aucune note…</p>`}
        </div>
      </div>

      <!-- Boutons + timeline -->
      <div class="activity-quick-btns" style="margin-top:10px">
        ${[['call','📞','Called'],['whatsapp','💬','WhatsApp'],['visit','🏠','Visit'],['email','✉️','Email'],['note','📝','Note']].map(([type,emoji,label]) =>
          `<button class="activity-quick-btn" onclick="Clients.showActivityInput(${id},'${type}','${emoji} ${label}')">${emoji} ${label}</button>`
        ).join('')}
      </div>
      <div id="activity-input-${id}" class="activity-input-wrap hidden"></div>
      <div id="activity-slot-${id}" class="activity-timeline"><span class="spinner-sm">…</span></div>

      <div class="form-actions" style="margin-top:16px">
        <button class="btn btn-ghost" onclick="Modal.close()">${t('clients_close')}</button>
        <button class="btn btn-secondary" onclick="Modal.close(); Clients.openEditModal(${c.id})">${t('clients_edit')}</button>
        <button class="btn btn-danger btn-sm" onclick="Modal.close(); Clients.archive(${c.id})">${this.showArchived ? t('clients_unarchive') : t('clients_archive')}</button>
      </div>`);
    // Async-load all sections
    this._loadMatching(id, c);
    this._loadProposals(id);
    this._loadActivities(id);
  },

  // ── Matching auto ────────────────────────────────
  async _loadMatching(clientId, c) {
    const slot = document.getElementById(`matching-slot-${clientId}`);
    if (!slot) return;
    try {
      const props = await api.get('/properties?archived=false');
      // Case-insensitive status check
      const available = props.filter(p => (p.status || '').toLowerCase() === 'disponible');

      // Normalize + alias Bangkok zone names (handles typos & spelling variants)
      const ZONE_ALIASES = { 'thonglhor':'thonglor','thonglor':'thonglor','sathon':'sathorn','silom/sathon':'sathorn','silom':'silom','sathorn':'sathorn','onnut':'onnut','onut':'onnut','phrompong':'phromphong','phromphong':'phromphong','promphong':'phromphong','ekkamai':'ekkamai','asoke':'asoke','ploenchit':'ploenchit','ari':'ari','ratchada':'ratchada','sukhumvit':'sukhumvit' };
      const normZone = z => { const n = z.toLowerCase().replace(/[\s\-_\.]/g, ''); return ZONE_ALIASES[n] || n; };

      // Zones the client entered that mean "no preference" → skip zone filter
      const NO_PREF = ['nonprécisé', 'nonprecise', 'jesaispasencore', 'pasencoredécidé', ''];
      const clientHasZonePref = c.zones && !NO_PREF.includes(normZone(c.zones));

      const matches = available.filter(p => {
        // Budget : seulement si le client ET le bien ont une valeur
        if (c.budget_max && p.price && Number(p.price) > Number(c.budget_max) + 5000) return false;
        // Zone : uniquement si le client a une préférence ET le bien a une zone
        if (clientHasZonePref && p.zone) {
          const cZones = c.zones.split(/,\s*/).map(z => normZone(z));
          const pZone  = normZone(p.zone);
          if (!cZones.some(z => z && (pZone.includes(z) || z.includes(pZone)))) return false;
        }
        return true;
      });

      // Debug info
      const debugLine = `<p style="font-size:10px;color:var(--text-3);margin-bottom:6px">${available.length} dispo · ${matches.length} match${c.budget_max ? ' · ≤ ' + Number(Number(c.budget_max)+5000).toLocaleString('fr-FR') + ' ฿' : ''}${clientHasZonePref ? ' · zones: ' + c.zones : ' · zones: toutes'}</p>`;

      if (!matches.length) {
        slot.innerHTML = debugLine + `<p class="sub-empty">${t('match_none')}</p>`;
        return;
      }
      slot.innerHTML = debugLine + matches.slice(0, 8).map(p => `
        <div class="match-item">
          <div class="match-info">
            <span class="match-title">${p.title}</span>
            <span class="match-sub">${p.zone || '—'}${p.price ? ' · ' + Number(p.price).toLocaleString('fr-FR') + ' ฿' : ' · prix non renseigné'}</span>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="Clients.proposeProperty(${clientId},${p.id},'${p.title.replace(/'/g, '&#39;')}',this)">📤</button>
        </div>`).join('');
    } catch(err) { slot.innerHTML = `<p class="sub-empty">Erreur: ${err.message}</p>`; }
  },

  async proposeProperty(clientId, propertyId, propTitle, btn) {
    btn.disabled = true; btn.textContent = '…';
    try {
      await api.post('/proposals', { client_id: clientId, property_id: propertyId });
      btn.textContent = '✓'; btn.classList.add('btn-success');
      this._loadProposals(clientId);
      Toast.show('📤 Proposition enregistrée');
    } catch (err) { Toast.show(err.message, 'error'); btn.disabled = false; btn.textContent = '📤'; }
  },

  // ── Proposals history ─────────────────────────────
  async _loadProposals(clientId) {
    const slot = document.getElementById(`proposals-slot-${clientId}`);
    if (!slot) return;
    try {
      const rows = await api.get(`/proposals?client_id=${clientId}`);
      if (!rows.length) { slot.innerHTML = `<p class="sub-empty">${t('proposals_none')}</p>`; return; }
      const statusLabels = { 'Envoyé': t('proposals_sent'), 'Visite': t('proposals_visit'), 'Refusé': t('proposals_refused'), 'Signé': t('proposals_signed') };
      slot.innerHTML = rows.map(r => `
        <div class="proposal-item">
          <div class="match-info">
            <span class="match-title">${r.properties?.title || '—'}</span>
            <span class="match-sub">${r.properties?.zone || ''}${r.properties?.price ? ' · ' + Number(r.properties.price).toLocaleString('fr-FR') + ' ฿' : ''} · ${fmtDate(r.proposed_at)}</span>
          </div>
          <select class="proposal-status-sel" onchange="Clients.updateProposalStatus(${r.id},this.value)">
            ${['Envoyé','Visite','Refusé','Signé'].map(s => `<option value="${s}" ${r.status===s?'selected':''}>${statusLabels[s]||s}</option>`).join('')}
          </select>
        </div>`).join('');
    } catch { slot.innerHTML = '<p class="sub-empty">—</p>'; }
  },

  async openProposalPickModal(clientId) {
    const props = await api.get('/properties?archived=false');
    const available = props.filter(p => p.status === 'Disponible');
    Modal.open(t('proposals_pick'), `
      <div class="sub-list-slot" style="max-height:340px;overflow-y:auto">
        ${available.length ? available.map(p => `
          <div class="match-item">
            <div class="match-info">
              <span class="match-title">${p.title}</span>
              <span class="match-sub">${p.zone || ''}${p.price ? ' · ' + Number(p.price).toLocaleString('fr-FR') + ' ฿' : ''}</span>
            </div>
            <button class="btn btn-sm btn-secondary" onclick="Clients.proposeFromPick(${clientId},${p.id},'${p.title.replace(/'/g, '&#39;')}',this)">📤</button>
          </div>`).join('') : `<p class="sub-empty">${t('match_none')}</p>`}
      </div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="Modal.close()">${t('clients_close')}</button></div>`);
  },

  async proposeFromPick(clientId, propertyId, title, btn) {
    btn.disabled = true; btn.textContent = '…';
    try {
      await api.post('/proposals', { client_id: clientId, property_id: propertyId });
      btn.textContent = '✓'; btn.classList.add('btn-success');
      Toast.show('📤 Proposition enregistrée');
    } catch (err) { Toast.show(err.message, 'error'); btn.disabled = false; btn.textContent = '📤'; }
  },

  async updateProposalStatus(proposalId, status) {
    try {
      await api.patch(`/proposals/${proposalId}/status`, { status });
      Toast.show('✓ Statut mis à jour');
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  // ── Activity log ─────────────────────────────────
  async _loadActivities(clientId) {
    const slot = document.getElementById(`activity-slot-${clientId}`);
    if (!slot) return;
    try {
      const rows = await api.get(`/activities?client_id=${clientId}`);
      if (!rows.length) { slot.innerHTML = `<p class="sub-empty">No activity yet. Log your first interaction above.</p>`; return; }
      const ICONS = { call:'📞', whatsapp:'💬', visit:'🏠', email:'✉️', note:'📝', proposal:'📤', system:'⚙️' };
      slot.innerHTML = rows.map(r => `
        <div class="activity-entry">
          <span class="activity-icon">${ICONS[r.type]||'📌'}</span>
          <div class="activity-content">
            <span class="activity-author">${r.author}</span>
            <span class="activity-time">${this._relativeTime(r.created_at)}</span>
            ${r.content ? `<p class="activity-text">${r.content}</p>` : ''}
          </div>
          <button class="activity-del" onclick="Clients.deleteActivity(${r.id},${clientId})" title="Delete">✕</button>
        </div>`).join('');
    } catch { slot.innerHTML = '<p class="sub-empty">—</p>'; }
  },

  showActivityInput(clientId, type, label) {
    const wrap = document.getElementById(`activity-input-${clientId}`);
    if (!wrap) return;
    wrap.classList.remove('hidden');
    wrap.innerHTML = `
      <div class="activity-input-row">
        <span style="font-size:13px;font-weight:600;color:var(--text)">${label}</span>
        <input id="act-note-${clientId}" type="text" placeholder="Add a note (optional)…"
          class="activity-note-input" onkeydown="if(event.key==='Enter')Clients.logActivity(${clientId},'${type}',this.value)">
        <button class="btn btn-sm btn-primary" onclick="Clients.logActivity(${clientId},'${type}',document.getElementById('act-note-${clientId}').value)">Log</button>
        <button class="btn btn-sm btn-ghost" onclick="document.getElementById('activity-input-${clientId}').classList.add('hidden')">✕</button>
      </div>`;
    setTimeout(() => document.getElementById(`act-note-${clientId}`)?.focus(), 50);
  },

  async logActivity(clientId, type, content) {
    const author = (typeof App !== 'undefined' && App.role === 'guest') ? 'Nono' : 'Tim';
    try {
      await api.post('/activities', { client_id: clientId, type, content: content || null, author });
      const wrap = document.getElementById(`activity-input-${clientId}`);
      if (wrap) wrap.classList.add('hidden');
      this._loadActivities(clientId);
      // Invalidate card back cache so next flip shows fresh activity
      const cardSlot = document.getElementById(`card-act-${clientId}`);
      if (cardSlot) delete cardSlot.dataset.loaded;
      Toast.show('✓ Activity logged');
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  async deleteActivity(activityId, clientId) {
    await api.del(`/activities/${activityId}`);
    this._loadActivities(clientId);
  },

  _relativeTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7)  return `${d}d ago`;
    return fmtDate(iso);
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
        <div class="form-2">
          <div class="form-row">
            <label>⏱ ${t('form_duration')}</label>
            <select name="duration">
              <option value="" ${!c?.duration ? 'selected' : ''}>—</option>
              ${['1 mois','2 mois','3 mois','4 mois','5 mois','6 mois','7 mois','8 mois','9 mois','10 mois','11 mois','12 mois','1 an','2 ans','3 ans','Autre'].map(d =>
                `<option value="${d}" ${c?.duration === d ? 'selected' : ''}>${d}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-row">
            <label>📅 ${t('form_move_in')}</label>
            <input type="date" name="move_in_date" value="${c?.move_in_date || ''}">
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
