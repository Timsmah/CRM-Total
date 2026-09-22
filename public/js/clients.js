function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const FR_TO_EN = {
  // Durées
  '1 an': '1 year', '2 ans': '2 years', '3 ans': '3 years',
  '1 mois': '1 month', '2 mois': '2 months', '3 mois': '3 months',
  '4 mois': '4 months', '5 mois': '5 months', '6 mois': '6 months',
  '7 mois': '7 months', '8 mois': '8 months', '9 mois': '9 months',
  '10 mois': '10 months', '11 mois': '11 months', '12 mois': '12 months',
  // Divers
  'Autre': 'Other', 'autre': 'Other',
  'Non précisé': 'Not specified', 'non précisé': 'Not specified',
  'Je ne sais pas encore': 'Not decided yet', 'je ne sais pas encore': 'Not decided yet',
  'À l\'étranger': 'Abroad',
  'Pas encore décidé': 'Not decided yet',
  'Oui': 'Yes', 'Non': 'No',
  // Sources
  'Formulaire': 'Form', 'Référence': 'Referral', 'Bouche à oreille': 'Word of mouth',
  'Instagram DM': 'Instagram DM', 'Facebook': 'Facebook', 'LinkedIn': 'LinkedIn',
  // Types de biens
  'Condo / Appartement': 'Condo / Apartment', 'Appartement': 'Apartment',
  'Studio': 'Studio', 'Maison': 'House', 'Villa': 'Villa',
  'Chambre': 'Room', 'Duplex': 'Duplex', 'Penthouse': 'Penthouse',
  'Condo': 'Condo', 'Townhouse': 'Townhouse',
  // Meublé
  'Meublé': 'Furnished', 'Non meublé': 'Unfurnished', 'Semi-meublé': 'Semi-furnished',
  'meublé': 'furnished', 'non meublé': 'unfurnished',
  // Statuts client
  'Prospect': 'Prospect', 'Onboarding': 'Onboarding',
  'Recherche active': 'Active search', 'Signé': 'Signed', 'Perdu': 'Lost',
  // Transaction
  'Location': 'Rental', 'Achat': 'Purchase', 'Vente': 'Sale',
  // Chambres suffix
  ' ch.': ' bd.',
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

// ── Scoring client ────────────────────────────────────────────────────────────
function clientScore(c) {
  const b = Number(c.budget_max) || 0;
  if (!b) return null; // pas scorable sans budget

  // Budget (50%)
  let budget;
  if      (b >= 120000) budget = 10;
  else if (b >= 70000)  budget = 9;
  else if (b >= 40000)  budget = 7;
  else if (b >= 20000)  budget = 6;
  else                  budget = 5;

  // Durée du bail (35%)
  const dur = (c.duration || '').toLowerCase();
  let duree;
  if      (/\b(1 an|2 ans|3 ans|12 mois)\b/.test(dur))          duree = 10;
  else if (/\b(6 mois|7 mois|8 mois|9 mois|10 mois|11 mois)\b/.test(dur)) duree = 8;
  else if (/\b(3 mois|4 mois|5 mois)\b/.test(dur))              duree = 4;
  else if (/\b(1 mois|2 mois)\b/.test(dur))                     duree = 2;
  else                                                            duree = 5; // non précisé → neutre

  // Délai move-in (10%)
  let movein = 5;
  if (c.move_in_date) {
    const days = Math.ceil((new Date(c.move_in_date) - new Date()) / 86400000);
    if      (days < 0)   movein = 1;  // déjà arrivé
    else if (days <= 3)  movein = 2;
    else if (days <= 7)  movein = 4;
    else if (days <= 30) movein = 8;  // 1-4 semaines
    else if (days <= 60) movein = 10; // 1-2 mois — idéal
    else                 movein = 6;  // > 2 mois
  }

  // Clarté des critères (5%)
  const hasCriteria = (c.criteria || '').trim().length > 5;
  const hasZones    = (c.zones    || '').trim().length > 0;
  const clarte      = hasCriteria && hasZones ? 10 : (hasCriteria || hasZones) ? 6 : 2;

  const total = budget * 0.50 + duree * 0.35 + movein * 0.10 + clarte * 0.05;
  return { total: Math.round(total * 10) / 10, budget, duree, movein, clarte };
}

function scoreColor(s) {
  if (s >= 8) return '#0F766E';
  if (s >= 6) return '#16A34A';
  if (s >= 4) return '#D97706';
  return '#DC2626';
}

function scoreBadge(c) {
  const r = clientScore(c);
  if (!r) return '';
  const col = scoreColor(r.total);
  return `<span style="font-size:10px;font-weight:700;color:${col};background:${col}18;border:0.5px solid ${col}50;border-radius:5px;padding:1px 6px;letter-spacing:.3px">⭐ ${r.total.toFixed(1)}</span>`;
}

function scoreBreakdownHTML(c) {
  const r = clientScore(c);
  if (!r) return `<p style="font-size:12px;color:var(--text-3);padding:6px 0">Budget non renseigné — score impossible.</p>`;
  const col = scoreColor(r.total);
  const bar = v => `<div style="flex:1;background:var(--bg-2,#f1f5f9);border-radius:3px;height:5px;overflow:hidden"><div style="width:${v*10}%;height:100%;background:${col};border-radius:3px"></div></div>`;
  const row = (lbl, v, w) => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
    <span style="font-size:11px;color:var(--text-2);width:110px;flex-shrink:0">${lbl}</span>
    ${bar(v)}
    <span style="font-size:11px;font-weight:600;color:var(--text);width:26px;text-align:right">${v}/10</span>
    <span style="font-size:10px;color:var(--text-3);width:28px;text-align:right">${w}</span>
  </div>`;
  return `<div style="background:var(--surface-2,#f8fafc);border-radius:10px;padding:12px 14px;margin-top:4px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <span style="font-size:11px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Score client</span>
      <span style="font-size:22px;font-weight:800;color:${col}">${r.total.toFixed(1)}<span style="font-size:12px;font-weight:400;color:var(--text-3)">/10</span></span>
    </div>
    ${row('💰 Budget',  r.budget, '50%')}
    ${row('📋 Durée',   r.duree,  '35%')}
    ${row('🗓️ Move-in', r.movein, '10%')}
    ${row('🎯 Critères',r.clarte,  '5%')}
  </div>`;
}

function getContactCols() {
  return [
    { key: 'Nouveau',        label: t('col_nouveau'),      cls: 'col-nouveau',    ghost: false },
    { key: 'À contacter',    label: t('col_a_contacter'),  cls: 'col-to-contact', ghost: false },
    { key: 'en_recherche',   label: t('col_recherche'),    cls: 'col-recherche',  ghost: true  },
    { key: 'Visite / Offre', label: t('col_visite'),       cls: 'col-visite',     ghost: false },
    { key: 'Signé',          label: t('col_signe'),         cls: 'col-signed',    ghost: false },
  ];
}

// Mapping des anciennes valeurs contact_status vers les nouvelles colonnes
const CONTACT_STATUS_LEGACY_MAP = {
  'Contacté':         'À contacter',
  'Rappeler':         'À contacter',
  'Property to Find': 'À contacter',
  'Urgent Sending':   'À contacter',
  'Closed':           'Signé',
};
const CONTACT_COLS = getContactCols(); // kept for compatibility, refreshed in render()

const Clients = {
  data: [],
  filter: 'tous',
  showArchived: false,
  focusedCol: null,
  sortDir: 'desc',
  sortKey: 'date', // 'date' | 'score'
  focusMode: false,
  hiddenCols: new Set(JSON.parse(localStorage.getItem('crm_hidden_cols') || '[]')),
  selectionMode: false,
  selectedClients: new Set(),
  clientFilters: { name: '', urgency: '', scoreMin: '', agent: '' },
  viewMode: localStorage.getItem('crm_clients_view') || 'suivi',
  suiviSelectedId: null,
  _suiviUsers: null, // cached team members

  SUIVI_STATUSES: [
    { key: 'nouveau',          label: 'Nouveau',          color: '#378ADD', bg: '#E6F1FB' },
    { key: 'a_contacter',      label: 'À contacter',      color: '#EF9F27', bg: '#FAEEDA' },
    { key: 'en_attente',       label: 'En attente',       color: '#9B59B6', bg: '#F3E8FF' },
    { key: 'recherche_lancee', label: 'Recherche lancée', color: '#1D9E75', bg: '#E1F5EE' },
    { key: 'signe',            label: 'Signé',             color: '#888780', bg: '#F1EFE8' },
  ],

  suiviCollapsed: JSON.parse(localStorage.getItem('crm_suivi_collapsed') || '{}'),

  async init() {
    document.getElementById('content').innerHTML = '<p class="spinner">Loading…</p>';
    api.post('/clients/sync/sheets', {}).catch(() => {}); // fire & forget, ne bloque pas
    await Promise.all([this.load(), this._suiviGetUsers()]); // précharge users pour avatars
    this.render();
    this._checkReminders();
    this._checkNewAssignments();
    if (!Clients._keyHandler) {
      Clients._keyHandler = (e) => {
        if (e.key !== 's' && e.key !== 'S') return;
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (['input', 'textarea', 'select'].includes(tag) || document.activeElement?.isContentEditable) return;
        if (typeof Router !== 'undefined' && Router.current !== 'clients') return;
        Clients.toggleSelectionMode();
      };
      document.addEventListener('keydown', Clients._keyHandler);
    }
  },

  _checkNewAssignments() {
    const me = (typeof App !== 'undefined' && App.user?.name) || null;
    if (!me) return;

    // Clients actuellement assignés à moi
    const myClients = this.data.filter(c => !c.archived && c.suivi_assigned_to === me);
    const myIds = myClients.map(c => c.id).sort((a, b) => a - b);

    // IDs vus lors de la dernière session
    let seenIds = [];
    try { seenIds = JSON.parse(localStorage.getItem(`crm_assign_seen_${me}`) || '[]'); } catch {}

    // Nouveaux = assignés maintenant mais pas dans la liste vue
    const newIds = myIds.filter(id => !seenIds.includes(id));

    if (newIds.length > 0) {
      this._newAssignCount = newIds.length;
      this._newAssignClients = myClients.filter(c => newIds.includes(c.id));
      this._showAssignBadge(newIds.length);

      // Toast discret
      const names = this._newAssignClients.slice(0, 2).map(c => c.name.split(' ')[0]).join(', ');
      const more  = newIds.length > 2 ? ` +${newIds.length - 2}` : '';
      Toast.show(`👤 ${newIds.length} nouvelle${newIds.length > 1 ? 's' : ''} assignation${newIds.length > 1 ? 's' : ''} : ${names}${more}`, 'info', 5000);
    } else {
      this._newAssignCount = 0;
    }
  },

  _showAssignBadge(count) {
    // Retire un badge existant
    document.querySelectorAll('.nav-assign-badge').forEach(b => b.remove());
    if (!count) return;
    const navClients = document.querySelector('.nav-item[data-section="clients"]');
    if (!navClients) return;
    navClients.style.position = 'relative';
    const badge = document.createElement('span');
    badge.className = 'nav-assign-badge';
    badge.textContent = count;
    badge.style.cssText = `
      position:absolute;top:2px;right:2px;
      background:#EF4444;color:#fff;
      font-size:9px;font-weight:700;
      min-width:16px;height:16px;border-radius:99px;
      display:flex;align-items:center;justify-content:center;
      padding:0 4px;pointer-events:none;
      box-shadow:0 1px 3px rgba(0,0,0,.25)`;
    navClients.appendChild(badge);
  },

  _markAssignmentsSeen() {
    const me = (typeof App !== 'undefined' && App.user?.name) || null;
    if (!me) return;
    const myIds = this.data.filter(c => !c.archived && c.suivi_assigned_to === me).map(c => c.id);
    try { localStorage.setItem(`crm_assign_seen_${me}`, JSON.stringify(myIds)); } catch {}
    this._newAssignCount = 0;
    this._showAssignBadge(0);
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

  _mobileView: 'list',

  render() {
    if (isMobile() && this._mobileView === 'list') { this.renderMobile(); return; }
    const total = this.data.length;
    const isSuivi = this.viewMode === 'suivi';
    document.getElementById('content').innerHTML = `
      <div class="section-header">
        <h2>Clients <span style="font-size:14px;font-weight:400;color:var(--text-3);margin-left:4px">${total}</span></h2>
        <div class="header-actions">
          ${isMobile() ? `<button class="btn btn-ghost btn-sm" onclick="Clients._setMobileView('list')" style="padding:6px 10px;font-size:13px">← Retour</button>` : ''}
          <div class="view-toggle">
            <button class="view-toggle-btn ${isSuivi ? 'active' : ''}" onclick="Clients._setView('suivi')">📋 Suivi</button>
            <button class="view-toggle-btn ${!isSuivi ? 'active' : ''}" onclick="Clients._setView('kanban')">⠿ Kanban</button>
          </div>
          <button class="btn btn-primary${isMobile() ? ' btn-sm' : ''}" onclick="Clients.openAddModal()">+${isMobile() ? '' : ' Ajouter'}</button>
          ${!isSuivi && !isMobile() ? `<button class="btn ${this.selectionMode ? 'btn-secondary' : 'btn-ghost'}" onclick="Clients.toggleSelectionMode()">
            ${this.selectionMode ? '✕ Annuler' : '☑ Sélectionner'}
          </button>` : ''}
          <div style="position:relative">
            <button class="btn btn-ghost" onclick="Clients._toggleMoreMenu(event)" title="Plus d'options">···</button>
            <div id="clients-more-menu" style="display:none;position:absolute;right:0;top:calc(100% + 4px);background:var(--surface,#fff);border:0.5px solid var(--border);border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.13);z-index:200;min-width:170px;padding:4px">
              <button class="more-menu-item" onclick="Clients.syncSheets();Clients._closeMoreMenu()">🔄 Sync Sheets</button>
              <button class="more-menu-item" onclick="Clients.openCallHistory();Clients._closeMoreMenu()">📋 Listes d'appels</button>
              ${!isSuivi ? `<button class="more-menu-item" onclick="Clients.toggleFocusMode();Clients._closeMoreMenu()">${this.focusMode ? '⊞ Vue complète' : '◉ Vue focus'}</button>` : ''}
              <div style="height:0.5px;background:var(--border);margin:4px 0"></div>
              <button class="more-menu-item" onclick="Clients.toggleArchived();Clients._closeMoreMenu()">${this.showArchived ? '👥 Clients actifs' : '🗄 Voir archivés'}</button>
            </div>
          </div>
        </div>
      </div>
      ${isSuivi ? this._renderSuiviHTML() : `
        ${this.filterBarHTML()}
        <div class="kanban-board ${this.focusedCol ? 'has-focus' : ''} ${this.hiddenCols.size ? 'has-collapsed' : ''} ${this.selectionMode ? 'selection-mode' : ''}">
          ${getContactCols().map(col => this.columnHTML(col)).join('')}
        </div>
        ${this.selectionMode ? `
        <div class="call-sel-bar" id="call-sel-bar" style="${this.selectedClients.size ? '' : 'opacity:0;pointer-events:none'}">
          <span class="call-sel-count" id="call-sel-count">${this.selectedClients.size} sélectionné${this.selectedClients.size > 1 ? 's' : ''}</span>
          <button class="btn btn-primary btn-sm" onclick="Clients.openCallList()">📋 Liste d'appels</button>
          <button class="btn btn-ghost btn-sm btn-sel-action" onclick="Clients._toggleBulkPopover(this,'move')">→ Colonne</button>
          <button class="btn btn-ghost btn-sm btn-sel-action" onclick="Clients._toggleBulkPopover(this,'tag')">🏷 Tag</button>
          <button class="btn btn-ghost btn-sm" onclick="Clients.bulkArchive()">🗄 Archiver</button>
          <div class="sel-divider"></div>
          <button class="btn btn-ghost btn-sm" onclick="Clients.toggleSelectionMode()" title="Annuler (S)">✕</button>
        </div>` : ''}
      `}`;

    if (isSuivi && this.suiviSelectedId) {
      const stillExists = this.data.find(c => c.id === this.suiviSelectedId);
      if (stillExists) this._suiviLoadRight(this.suiviSelectedId);
    }

    if (isMobile()) {
      document.querySelectorAll('.kanban-card[data-cid]').forEach(card => {
        const id = Number(card.dataset.cid);
        addLongPress(card, () => {
          const rect = card.getBoundingClientRect();
          const fakeEvent = {
            clientX: rect.left + 12,
            clientY: rect.top + rect.height / 2,
            stopPropagation() {},
            target: { closest: () => null }
          };
          Clients.showCardMenu(id, fakeEvent);
        });
      });
    }
  },

  _mobileFilter: 'all',

  renderMobile() {
    const filter = this._mobileFilter;
    let clients = this.data;
    if (filter === 'active')   clients = clients.filter(c => !c.archived);
    if (filter === 'archived') clients = clients.filter(c => c.archived);

    const STATUSES = this.SUIVI_STATUSES;

    const grouped = {};
    STATUSES.forEach(s => { grouped[s.key] = []; });
    clients.forEach(c => {
      const key = c.suivi_status || STATUSES[0].key;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(c);
    });

    const avatarEl = (c) => {
      if (c.avatar_url) return `<img class="mobile-avatar" src="${c.avatar_url}" alt="">`;
      const initials = (c.name || '?').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
      return `<div class="mobile-avatar mobile-avatar-initials">${initials}</div>`;
    };

    const rowsHTML = STATUSES.map(({ key, label }) => {
      const group = grouped[key] || [];
      if (!group.length) return '';
      const rows = group.map(c => {
        const budget  = c.budget ? Number(c.budget).toLocaleString('fr-FR') + ' ฿' : '';
        const arrival = c.arrival_date ? new Date(c.arrival_date).toLocaleDateString('fr-FR', { day:'numeric', month:'short' }) : '';
        const score   = c.score ? `⭐ ${c.score}` : '';
        const sub1    = [budget, c.nationality].filter(Boolean).join(' · ');
        const sub2    = [arrival ? '📅 ' + arrival : '', score].filter(Boolean).join('  ');
        return `<div class="mobile-client-row" onclick="Clients.openDetailModal(${c.id})" data-id="${c.id}">
          ${avatarEl(c)}
          <div class="mobile-client-info">
            <div class="mobile-client-name">${c.name || '—'}</div>
            ${sub1 ? `<div class="mobile-client-sub">${sub1}</div>` : ''}
            ${sub2 ? `<div class="mobile-client-sub">${sub2}</div>` : ''}
          </div>
          <span class="mobile-client-chevron">›</span>
        </div>`;
      }).join('');
      return `<div class="mobile-section-label">${label} <span>${group.length}</span></div>${rows}`;
    }).join('');

    document.getElementById('content').innerHTML = `
      <div class="section-header" style="padding:14px 14px 0">
        <h2>Clients <span style="font-size:14px;font-weight:400;color:var(--text-3)">${clients.length}</span></h2>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-ghost btn-sm" onclick="Clients._setMobileView('kanban')" title="Vue kanban">⠿</button>
          <button class="btn btn-primary btn-sm" onclick="Clients.openAddModal()">+ Ajouter</button>
        </div>
      </div>
      <div class="mobile-filter-pills">
        <button class="mobile-pill${filter==='all'?' active':''}" onclick="Clients._setMobileFilter('all')">Tous</button>
        <button class="mobile-pill${filter==='active'?' active':''}" onclick="Clients._setMobileFilter('active')">Actifs</button>
        <button class="mobile-pill${filter==='archived'?' active':''}" onclick="Clients._setMobileFilter('archived')">Archivés</button>
      </div>
      <div class="mobile-client-list">${rowsHTML || '<p class="empty" style="padding:20px">Aucun client</p>'}</div>`;

    // Attach long-press for action sheet
    document.querySelectorAll('.mobile-client-row').forEach(row => {
      const id = Number(row.dataset.id);
      addLongPress(row, () => {
        const c = this.data.find(x => x.id === id);
        if (!c) return;
        const phone = (c.whatsapp || c.phone || '').replace(/\D/g,'');
        ActionSheet.open(c.name, [
          ...(phone ? [{ icon:'💬', label:'WhatsApp', fn: `()=>window.open('https://wa.me/${phone}','_blank')` }] : []),
          { icon:'✏️', label:'Modifier', fn: `()=>Clients.openDetailModal(${id})` },
          { icon:'🗄', label: 'Archiver', fn: `()=>Clients.archiveClient(${id})` },
        ]);
      });
    });
  },

  _setMobileFilter(f) {
    this._mobileFilter = f;
    this.renderMobile();
  },

  _setMobileView(v) {
    this._mobileView = v;
    this.render();
  },

  _setView(mode) {
    this.viewMode = mode;
    localStorage.setItem('crm_clients_view', mode);
    this.render();
  },

  _toggleMoreMenu(e) {
    e.stopPropagation();
    const m = document.getElementById('clients-more-menu');
    if (!m) return;
    const open = m.style.display !== 'none';
    m.style.display = open ? 'none' : 'block';
    if (!open) {
      setTimeout(() => document.addEventListener('click', () => {
        m.style.display = 'none';
      }, { once: true }), 10);
    }
  },
  _closeMoreMenu() {
    const m = document.getElementById('clients-more-menu');
    if (m) m.style.display = 'none';
  },

  filterBarHTML() {
    const f = this.clientFilters;
    const active = f.name || f.urgency || f.scoreMin || f.agent;
    const filtered = active ? this.countFiltered() : this.data.length;
    const users = this._suiviUsers || (typeof App !== 'undefined' && App._usersCache) || [];
    return `
      <div class="filter-bar">
        <input class="filter-search" type="text" placeholder="🔍 Rechercher un client…"
          value="${f.name || ''}"
          oninput="Clients.setClientFilter('name', this.value)">
        <select class="filter-select" onchange="Clients.setClientFilter('urgency',this.value)">
          <option value="">📅 Toutes urgences</option>
          <option value="urgent-red"    ${f.urgency==='urgent-red'?'selected':''}>🔴 Arrive &lt; 14j</option>
          <option value="urgent-amber"  ${f.urgency==='urgent-amber'?'selected':''}>🟠 Arrive &lt; 30j</option>
          <option value="urgent-yellow" ${f.urgency==='urgent-yellow'?'selected':''}>🟡 Arrive &lt; 60j</option>
          <option value="urgent-future" ${f.urgency==='urgent-future'?'selected':''}>🔵 Arrive &gt; 60j</option>
        </select>
        <select class="filter-select" onchange="Clients.setClientFilter('scoreMin',this.value)">
          <option value="">⭐ Tous scores</option>
          <option value="6" ${f.scoreMin==='6'?'selected':''}>⭐ Score ≥ 6</option>
          <option value="7" ${f.scoreMin==='7'?'selected':''}>⭐ Score ≥ 7</option>
          <option value="8" ${f.scoreMin==='8'?'selected':''}>⭐ Score ≥ 8</option>
        </select>
        <select class="filter-select" onchange="Clients.setClientFilter('agent',this.value)">
          <option value="">👤 Tous agents</option>
          ${users.map(u => `<option value="${u.name}" ${f.agent===u.name?'selected':''}>${u.name}</option>`).join('')}
          <option value="__none__" ${f.agent==='__none__'?'selected':''}>— Non assigné</option>
        </select>
        ${active ? `<button class="btn btn-ghost btn-sm" onclick="Clients.clearClientFilters()" style="flex-shrink:0">✕ Effacer</button>` : ''}
        <span style="margin-left:auto;font-size:12px;color:var(--text-3);flex-shrink:0">
          ${active ? `<strong style="color:var(--accent)">${filtered}</strong> / ` : ''}${this.data.length} clients
        </span>
      </div>`;
  },

  countFiltered() {
    return this.data.filter(c => this._matchClientFilters(c)).length;
  },

  _matchClientFilters(c) {
    const f = this.clientFilters;
    if (f.name) {
      const q = f.name.toLowerCase();
      if (!(c.name || '').toLowerCase().includes(q)) return false;
    }
    if (f.urgency && this.urgencyClass(c.move_in_date) !== f.urgency) return false;
    if (f.scoreMin) {
      const r = clientScore(c);
      if (!r || r.total < parseFloat(f.scoreMin)) return false;
    }
    if (f.agent) {
      if (f.agent === '__none__') {
        if (c.suivi_assigned_to) return false;
      } else {
        if (c.suivi_assigned_to !== f.agent) return false;
      }
    }
    return true;
  },

  setClientFilter(key, val) {
    this.clientFilters[key] = val;
    // Quand on filtre par son propre nom → marquer les assignations comme vues
    if (key === 'agent' && val && val !== '__none__') {
      const me = (typeof App !== 'undefined' && App.user?.name) || null;
      if (me && val === me) this._markAssignmentsSeen();
    }
    this.render();
  },

  clearClientFilters() {
    this.clientFilters = { name: '', urgency: '', scoreMin: '', agent: '' };
    this.render();
  },

  effectiveContactStatus(c) {
    const s = c.contact_status;
    if (!s) return (c.suivi_status === 'nouveau' || !c.suivi_status) ? 'Nouveau' : 'À contacter';
    return CONTACT_STATUS_LEGACY_MAP[s] || s;
  },

  // Couleur de bordure gauche = statut suivi
  _suiviBorderColor(c) {
    const st = this.SUIVI_STATUSES.find(s => s.key === (c.suivi_status || 'nouveau'));
    return st ? st.color : '#CBD5E1';
  },

  filtered() {
    if (this.filter === 'tous') return this.data;
    return this.data.filter(c => this.effectiveContactStatus(c) === this.filter);
  },

  async openCallHistory() {
    const lists = await api.get('/call-lists').catch(() => []);
    if (!lists.length) {
      Modal.open('📋 Listes d\'appels', `<p style="color:var(--text-2);padding:16px 0">Aucune liste sauvegardée.</p><div class="form-actions"><button class="btn btn-ghost" onclick="Modal.close()">Fermer</button></div>`);
      return;
    }
    const rows = lists.map(l => {
      const clients = l.clients || [];
      const date = new Date(l.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `
        <div class="cl-hist-row">
          <div class="cl-hist-info" onclick="Clients._openSavedList(${l.id})">
            <span class="cl-hist-label">${l.label || date}</span>
            <span class="cl-hist-meta">${date} · ${clients.length} client${clients.length > 1 ? 's' : ''} · ${l.created_by || 'Tim'}</span>
          </div>
          <button class="cl-hist-del" onclick="Clients._deleteCallList(${l.id},this)" title="Supprimer">✕</button>
        </div>`;
    }).join('');
    Modal.open(`📋 Listes d'appels (${lists.length})`, `
      <div class="cl-hist-list">${rows}</div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="Modal.close()">Fermer</button></div>`);
    Clients._cachedLists = lists;
  },

  async _deleteCallList(id, btn) {
    await api.del(`/call-lists/${id}`);
    btn.closest('.cl-hist-row').remove();
    Clients._cachedLists = (Clients._cachedLists || []).filter(l => l.id !== id);
    Toast.show('Liste supprimée');
  },

  _openSavedList(id) {
    const l = (Clients._cachedLists || []).find(x => x.id === id);
    if (!l) return;
    const clients = l.clients || [];
    const date = l.label || new Date(l.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const listHTML = clients.map((c, i) => {
      const urgency = this.urgencyClass(c.move_in_date);
      const daysNum = this.urgencyDays(c.move_in_date);
      const dateBadge = c.move_in_date
        ? (daysNum < 0
          ? `<span class="cl-date urgent-overdue">⚠️ En retard · ${Math.abs(daysNum)}j</span>`
          : `<span class="cl-date ${urgency}">📅 ${formatDate(c.move_in_date)}</span>`)
        : '';
      const budget = c.budget_max ? `${Number(c.budget_max).toLocaleString('fr-FR')} ฿${c.budget_eur ? ` · ${Number(c.budget_eur).toLocaleString('fr-FR')} €` : ''}` : null;
      return `
        <div class="cl-item" id="cl-item-${c.id}">
          <div class="cl-num">${i + 1}</div>
          <div class="cl-body">
            <div class="cl-name">${c.name}</div>
            <div class="cl-meta">
              ${c.whatsapp ? `<button class="cl-phone" onclick="navigator.clipboard.writeText('${c.whatsapp}').then(()=>Toast.show('Copié ✓','success'))">📱 ${c.whatsapp}</button>` : '<span class="cl-no-phone">Pas de numéro</span>'}
              ${budget ? `<span>💰 ${budget}</span>` : ''}
              ${c.zones ? `<span>📍 ${c.zones}</span>` : ''}
              ${c.duration ? `<span>⏱ ${tr(c.duration)}</span>` : ''}
              ${dateBadge}
            </div>
          </div>
          <label class="cl-check-wrap">
            <input type="checkbox" class="cl-check" onchange="this.closest('.cl-item').classList.toggle('cl-done',this.checked)">
            <span class="cl-check-box"></span>
          </label>
        </div>`;
    }).join('');

    Clients._callListText = `📋 ${date}\n\n` + clients.map((c, i) => {
      const parts = [c.name];
      if (c.whatsapp) parts.push(c.whatsapp);
      if (c.budget_max) parts.push(`${Number(c.budget_max).toLocaleString('fr-FR')} ฿`);
      if (c.zones) parts.push(c.zones);
      if (c.move_in_date) parts.push(`Arrivée ${formatDate(c.move_in_date)}`);
      return `${i + 1}. ${parts.join(' · ')}`;
    }).join('\n');

    Modal.open(`📋 ${date} — ${clients.length} client${clients.length > 1 ? 's' : ''}`, `
      <div class="cl-header">
        <span class="cl-date-label">${date}</span>
        <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText(Clients._callListText).then(()=>Toast.show('Copié ✓','success'))">📋 Copier tout</button>
      </div>
      <div class="cl-list">${listHTML}</div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="Modal.close()">Fermer</button></div>`);
  },

  toggleSelectionMode() {
    this.selectionMode = !this.selectionMode;
    this.selectedClients.clear();
    this.render();
  },

  toggleClientSelection(id) {
    if (this.selectedClients.has(id)) {
      this.selectedClients.delete(id);
    } else {
      this.selectedClients.add(id);
    }
    const card = document.querySelector(`.kanban-card[data-cid="${id}"]`);
    if (card) card.classList.toggle('card-selected', this.selectedClients.has(id));
    const count = this.selectedClients.size;
    const bar = document.getElementById('call-sel-bar');
    if (bar) {
      bar.style.opacity = count ? '1' : '0';
      bar.style.pointerEvents = count ? '' : 'none';
    }
    const counter = document.getElementById('call-sel-count');
    if (counter) counter.textContent = `${count} sélectionné${count > 1 ? 's' : ''}`;
  },

  openCallList() {
    const clients = [...this.selectedClients]
      .map(id => this.data.find(c => c.id === id)).filter(Boolean);
    const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    const listHTML = clients.map((c, i) => {
      const budget = c.budget_max ? `${Number(c.budget_max).toLocaleString('fr-FR')} ฿${c.budget_eur ? ` · ${Number(c.budget_eur).toLocaleString('fr-FR')} €` : ''}` : null;
      const urgency = this.urgencyClass(c.move_in_date);
      const daysNum = this.urgencyDays(c.move_in_date);
      const dateBadge = c.move_in_date
        ? (daysNum < 0
          ? `<span class="cl-date urgent-overdue">⚠️ En retard · ${Math.abs(daysNum)}j</span>`
          : `<span class="cl-date ${urgency}">📅 ${formatDate(c.move_in_date)}</span>`)
        : '';
      return `
        <div class="cl-item" id="cl-item-${c.id}">
          <div class="cl-num">${i + 1}</div>
          <div class="cl-body">
            <div class="cl-name">${c.name}</div>
            <div class="cl-meta">
              ${c.whatsapp
                ? `<button class="cl-phone" onclick="navigator.clipboard.writeText('${c.whatsapp}').then(()=>Toast.show('Copié ✓','success'))" title="Copier">📱 ${c.whatsapp}</button>`
                : `<span class="cl-no-phone">Pas de numéro</span>`}
              ${budget ? `<span>💰 ${budget}</span>` : ''}
              ${c.zones ? `<span>📍 ${c.zones}</span>` : ''}
              ${c.duration ? `<span>⏱ ${tr(c.duration)}</span>` : ''}
              ${dateBadge}
            </div>
          </div>
          <label class="cl-check-wrap" title="Marquer comme appelé">
            <input type="checkbox" class="cl-check" onchange="this.closest('.cl-item').classList.toggle('cl-done',this.checked)">
            <span class="cl-check-box"></span>
          </label>
        </div>`;
    }).join('');

    const snapshot = clients.map(c => ({
      id: c.id, name: c.name, whatsapp: c.whatsapp || null,
      budget_max: c.budget_max || null, budget_eur: c.budget_eur || null,
      zones: c.zones || null, move_in_date: c.move_in_date || null, duration: c.duration || null,
    }));
    const author = (typeof App !== 'undefined' && App.user?.name) ? App.user.name : 'Tim';
    api.post('/call-lists', { label: today, clients: snapshot, created_by: author }).catch(() => {});

    Clients._callListText = `📋 Liste d'appels — ${today}\n\n` + clients.map((c, i) => {
      const budget = c.budget_max ? `${Number(c.budget_max).toLocaleString('fr-FR')} ฿` : null;
      const date = c.move_in_date ? formatDate(c.move_in_date) : null;
      const parts = [c.name];
      if (c.whatsapp) parts.push(c.whatsapp);
      if (budget) parts.push(budget);
      if (c.zones) parts.push(c.zones);
      if (date) parts.push(`Arrivée ${date}`);
      return `${i + 1}. ${parts.join(' · ')}`;
    }).join('\n');

    Modal.open(`📋 Liste d'appels — ${clients.length} client${clients.length > 1 ? 's' : ''}`, `
      <div class="cl-header">
        <span class="cl-date-label">${today}</span>
        <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText(Clients._callListText).then(()=>Toast.show('Copié ✓','success'))">📋 Copier tout</button>
      </div>
      <div class="cl-list">${listHTML}</div>
      <div class="form-actions">
        <button class="btn btn-ghost" onclick="Modal.close()">Fermer</button>
      </div>`);
  },

  async bulkArchive() {
    const ids = [...this.selectedClients];
    if (!ids.length) return;
    await Promise.all(ids.map(id => api.patch(`/clients/${id}/archive`)));
    this.data = this.data.filter(c => !this.selectedClients.has(c.id));
    ids.forEach(id => { const el = document.querySelector(`.kanban-card[data-cid="${id}"]`); if (el) el.remove(); });
    const n = ids.length;
    Toast.show(`🗄 ${n} client${n > 1 ? 's' : ''} archivé${n > 1 ? 's' : ''}`);
    this.toggleSelectionMode();
  },

  async bulkMove(colKey) {
    const ids = [...this.selectedClients];
    if (!ids.length) return;
    document.querySelectorAll('.bulk-popover').forEach(p => p.remove());
    await Promise.all(ids.map(id => api.patch(`/clients/${id}/contact-status`, { contact_status: colKey })));
    ids.forEach(id => { const c = this.data.find(x => x.id === id); if (c) c.contact_status = colKey; });
    const n = ids.length;
    Toast.show(`✓ ${n} client${n > 1 ? 's' : ''} déplacé${n > 1 ? 's' : ''}`);
    this.toggleSelectionMode();
  },

  async bulkSetColor(colorKey) {
    const ids = [...this.selectedClients];
    if (!ids.length) return;
    document.querySelectorAll('.bulk-popover').forEach(p => p.remove());
    const key = colorKey || null;
    const colorDef = CARD_COLORS.find(x => x.key === key) || CARD_COLORS[0];
    await Promise.all(ids.map(id => api.patch(`/clients/${id}/color`, { card_color: key })));
    ids.forEach(id => {
      const c = this.data.find(x => x.id === id);
      if (c) c.card_color = key;
      const card = document.querySelector(`.kanban-card[data-cid="${id}"]`);
      if (card) card.querySelectorAll('.card-face').forEach(f => {
        f.style.background = colorDef.bg || ''; f.style.borderColor = colorDef.border || '';
      });
    });
    Toast.show('🎨 Couleur appliquée');
  },

  async bulkAddTag(tagKey) {
    const ids = [...this.selectedClients];
    if (!ids.length) return;
    document.querySelectorAll('.bulk-popover').forEach(p => p.remove());
    await Promise.all(ids.map(async id => {
      const c = this.data.find(x => x.id === id);
      if (!c) return;
      const tags = this.getTags(c);
      if (tags.includes(tagKey)) return;
      tags.push(tagKey);
      c.action_tags = JSON.stringify(tags);
      await api.patch(`/clients/${id}/tags`, { action_tags: tags });
      const display = document.querySelector(`.kanban-card[data-cid="${id}"] .action-tags-display`);
      if (display) display.innerHTML = this.fullTagsHTML(c);
    }));
    const tag = ACTION_TAGS.find(t => t.key === tagKey);
    Toast.show(`✓ Tag "${tag?.emoji} ${tag?.label}" ajouté`);
  },

  _toggleBulkPopover(btn, type) {
    const existing = document.querySelector('.bulk-popover');
    if (existing) { existing.remove(); if (existing.dataset.type === type) return; }

    let inner = '';
    if (type === 'move') {
      inner = getContactCols().filter(col => !col.ghost).map(col =>
        `<button class="bulk-pop-item" onclick="Clients.bulkMove('${col.key}')">${col.label}</button>`
      ).join('');
    } else if (type === 'tag') {
      inner = ACTION_TAGS.map(tag =>
        `<button class="bulk-pop-item" onclick="Clients.bulkAddTag('${tag.key}')">${tag.emoji} ${tag.label}</button>`
      ).join('');
    } else if (type === 'color') {
      inner = `<div class="bulk-pop-colors">${CARD_COLORS.map(col =>
        `<button class="ctx-dot" style="background:${col.bg||'#fff'};border-color:${col.border||'#CBD5E1'}"
          onclick="Clients.bulkSetColor('${col.key||''}')" title="${col.label}"></button>`
      ).join('')}</div>`;
    }

    const pop = document.createElement('div');
    pop.className = 'bulk-popover'; pop.dataset.type = type;
    pop.innerHTML = inner;
    const rect = btn.getBoundingClientRect();
    const left = Math.min(rect.left, window.innerWidth - 200);
    pop.style.cssText = `position:fixed;bottom:${window.innerHeight - rect.top + 8}px;left:${left}px;z-index:9999`;
    document.body.appendChild(pop);

    setTimeout(() => {
      document.addEventListener('click', function h(e) {
        if (!e.target.closest('.bulk-popover') && !e.target.closest('.btn-sel-action')) {
          pop.remove(); document.removeEventListener('click', h);
        }
      });
    }, 50);
  },

  toggleColHide(colKey) {
    if (this.hiddenCols.has(colKey)) {
      this.hiddenCols.delete(colKey);
    } else {
      this.hiddenCols.add(colKey);
    }
    localStorage.setItem('crm_hidden_cols', JSON.stringify([...this.hiddenCols]));
    this.render();
  },

  columnHTML(col) {

    const daysAgoNum = (c) => {
      const dateStr = c.form_submitted_at || c.created_at;
      if (!dateStr) return -1;
      return Math.floor((new Date() - new Date(dateStr)) / 86400000);
    };

    const scoreOf = c => { const r = clientScore(c); return r ? r.total : -1; };

    let cards;
    if (col.ghost) {
      // Colonne fantôme : même filtre que l'onglet Recherches
      // = clients avec status = 'Recherche active', sauf ceux en Visite/Offre ou Signé
      cards = this.data.filter(c => {
        const ecs = this.effectiveContactStatus(c);
        return c.status === 'Recherche active'
          && ecs !== 'Visite / Offre'
          && ecs !== 'Signé';
      }).filter(c => this._matchClientFilters(c));
    } else {
      cards = this.data
        .filter(c => {
          const ecs = this.effectiveContactStatus(c);
          if (ecs !== col.key) return false;
          // Pour les colonnes hors Visite/Offre et Signé : exclure les clients en Recherche active
          if (col.key !== 'Visite / Offre' && col.key !== 'Signé' && c.status === 'Recherche active') return false;
          return true;
        })
        .filter(c => this._matchClientFilters(c));
    }

    cards = cards.sort((a, b) => {
        if (this.sortKey === 'score') {
          return this.sortDir === 'desc'
            ? scoreOf(b) - scoreOf(a)
            : scoreOf(a) - scoreOf(b);
        }
        return this.sortDir === 'desc'
          ? daysAgoNum(a) - daysAgoNum(b)
          : daysAgoNum(b) - daysAgoNum(a);
      });

    const SORT_MODES = [
      { key: 'date',  dir: 'desc', icon: '↑', label: 'Recent first' },
      { key: 'date',  dir: 'asc',  icon: '↓', label: 'Oldest first' },
      { key: 'score', dir: 'desc', icon: '⭐', label: 'Score ↓' },
      { key: 'score', dir: 'asc',  icon: '⭐', label: 'Score ↑' },
    ];
    const curMode = SORT_MODES.find(m => m.key === this.sortKey && m.dir === this.sortDir) || SORT_MODES[0];
    const sortIcon  = curMode.icon;
    const sortTitle = curMode.label;

    if (this.hiddenCols.has(col.key)) {
      return `
        <div class="kanban-col col-collapsed"
          ondragover="${col.ghost ? '' : 'Clients.onDragOver(event)'}"
          ondragleave="${col.ghost ? '' : 'Clients.onDragLeave(event)'}"
          ondrop="${col.ghost ? '' : `Clients.onDrop(event, '${col.key}')`}"
          onclick="Clients.toggleColHide('${col.key}')" title="Afficher ${col.label}">
          <div class="col-collapsed-inner">
            <span class="kanban-count ${col.cls}">${cards.length}</span>
            <span class="col-collapsed-title ${col.cls}">${col.label}</span>
          </div>
        </div>`;
    }

    return `
      <div class="kanban-col ${this.focusedCol === col.key ? 'focused' : ''} ${col.ghost ? 'col-ghost' : ''}"
        ${col.ghost ? '' : `ondragover="Clients.onDragOver(event)" ondragleave="Clients.onDragLeave(event)" ondrop="Clients.onDrop(event, '${col.key}')"`}>
        <div class="kanban-col-header ${col.cls}" onclick="Clients.toggleFocus('${col.key}')">
          <span>${col.label}</span>
          <div style="display:flex;align-items:center;gap:6px">
            ${col.ghost ? `<span style="font-size:9px;opacity:.5;font-style:italic">${t('col_ghost_hint')}</span>` : `<button class="sort-btn" onclick="Clients.toggleSort(event)" title="${sortTitle}">${sortIcon} ${sortTitle}</button>`}
            <span class="kanban-count">${cards.length}</span>
            <button class="col-hide-btn" onclick="event.stopPropagation();Clients.toggleColHide('${col.key}')" title="Masquer">‹</button>
          </div>
        </div>
        <div class="kanban-cards">
          ${col.ghost
            ? (cards.map(c => this.ghostCardHTML(c)).join('') || '<p class="kanban-empty">—</p>')
            : (cards.map(c => this.cardHTML(c)).join('') || '<p class="kanban-empty">—</p>')}
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
    if (days < 0) return 'urgent-overdue';
    if (days <= 14) return 'urgent-red';
    if (days <= 30) return 'urgent-amber';
    if (days <= 60) return 'urgent-yellow';
    if (days > 60) return 'urgent-future';
    return '';
  },

  urgencyDays(move_in_date) {
    if (!move_in_date) return null;
    return Math.ceil((new Date(move_in_date) - new Date()) / 86400000);
  },

  toggleFocusMode() {
    this.focusMode = !this.focusMode;
    this.render();
  },

  cardFocusHTML(c) {
    const budgetLine = c.budget_max
      ? `${Number(c.budget_max).toLocaleString('fr-FR')} ฿${c.budget_eur ? ` · ${Number(c.budget_eur).toLocaleString('fr-FR')} €` : ''}`
      : null;
    const urgency = this.urgencyClass(c.move_in_date);
    const daysNum = this.urgencyDays(c.move_in_date);

    let dateBadge = '';
    if (c.move_in_date) {
      if (daysNum < 0) {
        dateBadge = `<span class="focus-date urgent-overdue">⚠️ En retard · ${Math.abs(daysNum)}j</span>`;
      } else {
        dateBadge = `<span class="focus-date ${urgency}">📅 ${formatDate(c.move_in_date)}</span>`;
      }
    }

    return `
      <div class="kanban-card ${this.selectedClients.has(c.id) ? 'card-selected' : ''}" data-cid="${c.id}" draggable="${isMobile() || this.selectionMode ? 'false' : 'true'}"
        ondragstart="Clients.onDragStart(event, ${c.id})"
        ondragend="Clients.onDragEnd(event)">
        <div class="card-inner" id="card-inner-${c.id}"
          onclick="Clients.flipCard(${c.id}, event)"
          oncontextmenu="event.preventDefault();Clients.showCardMenu(${c.id}, event)">

          <div class="card-face card-front card-focus-front" style="">
            ${this.selectionMode ? `<div class="sel-indicator ${this.selectedClients.has(c.id) ? 'sel-checked' : ''}"></div>` : ''}
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:4px">
              <div class="focus-name" style="flex:1">${c.name}</div>
              ${scoreBadge(c)}
            </div>
            <div class="focus-meta">
              ${budgetLine ? `<span>💰 ${budgetLine}</span>` : ''}
              ${budgetLine && c.duration ? `<span class="focus-sep">·</span>` : ''}
              ${c.duration ? `<span>⏱ ${tr(c.duration)}</span>` : ''}
            </div>
            ${dateBadge ? `<div class="focus-date-row">${dateBadge}</div>` : ''}
          </div>

          <div class="card-face card-back">
            <div class="card-back-header">
              <span class="card-back-name">${c.name.split(' ')[0]}</span>
            </div>
            ${c.whatsapp
              ? `<div class="card-contact-row" onclick="event.stopPropagation()">
                  <span>📱</span>
                  <span class="card-contact-link">${c.whatsapp}</span>
                  <button class="card-copy-btn" onclick="event.stopPropagation();navigator.clipboard.writeText('${c.whatsapp}').then(()=>Toast.show('Copié ✓','success'))" title="Copier">📋</button>
                </div>`
              : `<p class="card-no-contact">Pas de numéro</p>`}
            <div class="card-act-log" id="card-act-${c.id}">
              <span class="card-act-loading">…</span>
            </div>
          </div>

        </div>
      </div>`;
  },

  cardHTML(c) {
    if (this.focusMode) return this.cardFocusHTML(c);
    const budgetLine = c.budget_max
      ? `${Number(c.budget_max).toLocaleString('fr-FR')} ฿${c.budget_eur ? ` · ${Number(c.budget_eur).toLocaleString('fr-FR')} €` : ''}`
      : null;
    const urgency = this.urgencyClass(c.move_in_date);
    const daysNum = this.urgencyDays(c.move_in_date);
    const daysAgo = this.daysAgo(c);
    const urgencyDot = urgency ? `<span class="legend-dot ${urgency.replace('urgent-', 'dot-')}" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-left:4px;vertical-align:middle;flex-shrink:0"></span>` : '';
    const moveinLine = c.move_in_date
      ? (daysNum < 0
          ? `<p class="urgent-overdue" style="display:flex;align-items:center;gap:4px">⚠️ En retard · ${Math.abs(daysNum)}j</p>`
          : `<p class="${urgency}" style="display:flex;align-items:center;gap:0">📅 ${t('card_arrival')}: ${formatDate(c.move_in_date)}${urgencyDot}</p>`)
      : '';

    // Bordure gauche = couleur suivi
    const suiviColor = this._suiviBorderColor(c);

    // Avatar agent assigné
    const agentAv = (() => {
      const name = c.suivi_assigned_to;
      if (!name) return '';
      const user = (typeof App !== 'undefined' && App.getUserByName?.(name)) || (Clients._suiviUsers||[]).find(u=>u.name===name) || null;
      if (user && typeof avatarHTML === 'function') {
        return `<div title="${name}" style="width:18px;height:18px;border-radius:50%;overflow:hidden;flex-shrink:0">${avatarHTML(user, 18)}</div>`;
      }
      const col = this._suiviUserColor?.(name) || { bg: '#E2E8F0', color: '#64748B' };
      return `<div title="${name}" style="width:18px;height:18px;border-radius:50%;background:${col.bg};color:${col.color};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;flex-shrink:0">${name[0]?.toUpperCase()||'?'}</div>`;
    })();

    return `
      <div class="kanban-card ${this.selectedClients.has(c.id) ? 'card-selected' : ''}" data-cid="${c.id}" draggable="${isMobile() || this.selectionMode ? 'false' : 'true'}"
        ondragstart="Clients.onDragStart(event, ${c.id})"
        ondragend="Clients.onDragEnd(event)">

        <div class="card-inner" id="card-inner-${c.id}"
          onclick="Clients.flipCard(${c.id}, event)"
          oncontextmenu="event.preventDefault();Clients.showCardMenu(${c.id}, event)">

          <!-- ── FRONT ── -->
          <div class="card-face card-front">
            ${this.selectionMode ? `<div class="sel-indicator ${this.selectedClients.has(c.id) ? 'sel-checked' : ''}"></div>` : ''}

            <!-- Top : nom + score -->
            <div class="card-top" style="margin-bottom:4px">
              <div class="client-name" style="margin-bottom:0">${c.name}</div>
              <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
                ${scoreBadge(c)}
                <button class="fees-btn ${c.research_fees_paid ? 'paid' : ''}"
                  onclick="event.stopPropagation();Clients.toggleFees(${c.id})" title="Research fees" style="font-size:9px;padding:1px 5px">
                  ${c.research_fees_paid ? '✓' : t('clients_fees_unpaid')}
                </button>
              </div>
            </div>

            <div class="client-details">
              ${budgetLine ? `<p>💰 ${budgetLine}</p>` : ''}
              ${moveinLine}
              ${c.duration ? `<p>⏱ ${tr(c.duration)}</p>` : ''}
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

            <!-- Footer : agent + actions rapides + date -->
            <div class="card-quick-row" onclick="event.stopPropagation()">
              <div style="display:flex;align-items:center;gap:4px">
                ${agentAv}
                ${daysAgo ? `<span style="font-size:9.5px;color:var(--text-3)">${daysAgo}</span>` : ''}
              </div>
              <div style="display:flex;align-items:center;gap:3px">
                ${c.whatsapp ? `<button class="card-quick-btn" onclick="navigator.clipboard.writeText('${c.whatsapp}').then(()=>Toast.show('📱 Copié','success'))" title="Copier WA">📱</button>` : ''}
                <button class="card-quick-btn" onclick="Clients.openDetailModal(${c.id})" title="Voir la fiche">↗</button>
              </div>
            </div>

          </div>

          <!-- ── BACK ── -->
          <div class="card-face card-back">

            <div class="card-back-header">
              <span class="card-back-name">${c.name.split(' ')[0]}</span>
            </div>

            ${c.whatsapp
              ? `<div class="card-contact-row" onclick="event.stopPropagation()">
                  <span>📱</span>
                  <span class="card-contact-link">${c.whatsapp}</span>
                  <button class="card-copy-btn" onclick="event.stopPropagation();navigator.clipboard.writeText('${c.whatsapp}').then(()=>Toast.show('Copié ✓','success'))" title="Copier">📋</button>
                </div>`
              : `<p class="card-no-contact">Pas de numéro</p>`}

            <!-- Recent activity log (loaded on flip) -->
            <div class="card-act-log" id="card-act-${c.id}">
              <span class="card-act-loading">…</span>
            </div>

          </div>

        </div>
      </div>`;
  },

  // ── Carte fantôme pour la colonne "En recherche" ─────────────────────────
  ghostCardHTML(c) {
    const budgetLine = c.budget_max
      ? `${Number(c.budget_max).toLocaleString('fr-FR')} ฿`
      : null;
    const suiviColor = '#1D9E75'; // toujours vert recherche_lancee

    const agentAv = (() => {
      const name = c.suivi_assigned_to;
      if (!name) return '';
      const user = (typeof App !== 'undefined' && App.getUserByName?.(name)) || (Clients._suiviUsers||[]).find(u=>u.name===name) || null;
      if (user && typeof avatarHTML === 'function') {
        return `<div title="${name}" style="width:16px;height:16px;border-radius:50%;overflow:hidden;flex-shrink:0">${avatarHTML(user, 16)}</div>`;
      }
      return `<div title="${name}" style="width:16px;height:16px;border-radius:50%;background:#E1F5EE;color:#1D9E75;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;flex-shrink:0">${name[0]?.toUpperCase()||'?'}</div>`;
    })();

    return `
      <div class="kanban-card kanban-card-ghost" data-cid="${c.id}"
        oncontextmenu="event.preventDefault();Clients.showCardMenu(${c.id}, event)"
        style="border-left:3px solid ${suiviColor};border-style:solid;border-left-style:solid">
        <div class="card-face card-front" style="border-style:dashed;border-left-style:solid">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
            <div class="client-name" style="margin-bottom:0;font-size:13.5px">${c.name}</div>
            ${agentAv}
          </div>
          <div class="client-details">
            ${budgetLine ? `<p>💰 ${budgetLine}</p>` : ''}
          </div>
          <button class="card-ghost-link" onclick="event.stopPropagation();App.navigateTo('recherches');setTimeout(()=>{ if(typeof Recherches!=='undefined') Recherches.selectClient(${c.id}); },200)">
            🔍 Voir dans Recherches →
          </button>
        </div>
      </div>`;
  },

  flipCard(id, event) {
    if (this.selectionMode) { this.toggleClientSelection(id); return; }
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
    // Désactiver le drag quand la carte est retournée pour permettre la sélection de texte
    const card = inner.closest('.kanban-card');
    if (card) card.draggable = !isFlipping;
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
      slot.innerHTML = rows.slice(0, 3).map(r => {
        const authorUser = (typeof App !== 'undefined' && App.getUserByName?.(r.author)) || (Clients._suiviUsers||[]).find(u=>u.name===r.author) || null;
        const avEl = authorUser && typeof avatarHTML === 'function'
          ? `<div style="width:20px;height:20px;border-radius:50%;overflow:hidden;flex-shrink:0">${avatarHTML(authorUser, 20)}</div>`
          : (() => {
              const col = this._suiviUserColor?.(r.author||'') || { bg:'#E2E8F0', color:'#64748B' };
              return `<div style="width:20px;height:20px;border-radius:50%;background:${col.bg};color:${col.color};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0">${(r.author||'?')[0].toUpperCase()}</div>`;
            })();
        return `
        <div class="card-act-entry">
          ${avEl}
          <div class="card-act-body">
            <span class="card-act-meta">${r.author} · ${this._relativeTime(r.created_at)}</span>
            ${r.content ? `<p class="card-act-text">${r.content}</p>` : ''}
          </div>
        </div>`;
      }).join('');
    } catch {
      slot.innerHTML = '<p class="card-act-empty">—</p>';
    }
  },

  flipBack(id) {
    const inner = document.getElementById(`card-inner-${id}`);
    if (inner) {
      inner.classList.remove('flipped');
      const card = inner.closest('.kanban-card');
      if (card) card.draggable = true;
    }
  },

  // ── Card context menu (left click) ──────────────────────────────────────────
  showCardMenu(id, event) {
    if (this.selectionMode) return;
    if (event && (
      event.target.closest('button') ||
      event.target.closest('select') ||
      event.target.closest('a') ||
      event.target.closest('.action-tags-row') ||
      event.target.closest('.tags-popover') ||
      event.target.closest('.card-ctx-menu')
    )) return;
    event.stopPropagation();
    document.querySelectorAll('.card-ctx-menu').forEach(m => m.remove());
    const c = this.data.find(x => x.id === id);
    if (!c) return;

    const actTypes = [['call','📞','Appel'],['whatsapp','💬','WhatsApp'],['visit','🏠','Visite'],['email','✉️','Email'],['note','📝','Note']];

    const menu = document.createElement('div');
    menu.className = 'card-ctx-menu';
    menu.innerHTML = `
      <div class="ctx-item" onclick="event.stopPropagation();document.querySelectorAll('.card-ctx-menu').forEach(m=>m.remove());Clients.openDetailModal(${id})">
        📋 Ouvrir la fiche
      </div>
      <div class="ctx-sep"></div>
      ${c.status !== 'Recherche active' ? `
      <div class="ctx-item" onclick="event.stopPropagation();document.querySelectorAll('.card-ctx-menu').forEach(m=>m.remove());Clients.sendToRecherches(${id})">
        🔍 Envoyer en Recherches
      </div>` : `
      <div class="ctx-item ctx-disabled">
        🔍 Déjà dans Recherches
      </div>`}
      <div class="ctx-item ctx-has-sub" onclick="event.stopPropagation();this.nextElementSibling.classList.toggle('hidden')">
        → Déplacer vers <span class="ctx-arrow">›</span>
      </div>
      <div class="ctx-sub hidden">
        ${getContactCols().filter(col => !col.ghost && col.key !== this.effectiveContactStatus(c)).map(col => `
          <div class="ctx-item ctx-sub-item"
            onclick="event.stopPropagation();document.querySelectorAll('.card-ctx-menu').forEach(m=>m.remove());Clients.setContactStatus(${id},'${col.key}')">
            ${col.label}
          </div>`).join('')}
      </div>
      <div class="ctx-sep"></div>
      <div class="ctx-item ctx-has-sub" onclick="event.stopPropagation();this.nextElementSibling.classList.toggle('hidden')">
        📝 Logger une activité <span class="ctx-arrow">›</span>
      </div>
      <div class="ctx-sub hidden">
        ${actTypes.map(([type, emoji, label]) => `
          <div class="ctx-item ctx-sub-item"
            onclick="event.stopPropagation();document.querySelectorAll('.card-ctx-menu').forEach(m=>m.remove());Clients.quickLog(${id},'${type}','${emoji} ${label}')">
            ${emoji} ${label}
          </div>`).join('')}
      </div>
      <div class="ctx-sep"></div>
      <div class="ctx-item ctx-has-sub" onclick="event.stopPropagation();this.nextElementSibling.classList.toggle('hidden')">
        👤 Assigner à <span class="ctx-arrow">›</span>
      </div>
      <div class="ctx-sub hidden">
        ${(typeof App !== 'undefined' && App._usersCache || []).map(u => `
          <div class="ctx-item ctx-sub-item ${c.suivi_assigned_to === u.name ? 'ctx-active' : ''}"
            onclick="event.stopPropagation();document.querySelectorAll('.card-ctx-menu').forEach(m=>m.remove());Clients._kanbanAssign(${id},'${u.name}')">
            ${c.suivi_assigned_to === u.name ? '✓ ' : ''}${u.name}
          </div>`).join('')}
        ${c.suivi_assigned_to ? `
          <div class="ctx-item ctx-sub-item" style="color:var(--text-3);border-top:0.5px solid var(--border);margin-top:3px;padding-top:5px"
            onclick="event.stopPropagation();document.querySelectorAll('.card-ctx-menu').forEach(m=>m.remove());Clients._kanbanAssign(${id},null)">
            ✕ Retirer l'assignation
          </div>` : ''}
      </div>
      <div class="ctx-sep"></div>
      <div class="ctx-item ctx-danger" onclick="event.stopPropagation();document.querySelectorAll('.card-ctx-menu').forEach(m=>m.remove());Clients.archive(${id})">
        🗄 Archiver
      </div>`;

    const x = Math.min(event.clientX, window.innerWidth - 210);
    const y = Math.min(event.clientY + 4, window.innerHeight - 280);
    menu.style.cssText = `position:fixed;top:${y}px;left:${x}px;z-index:9999`;
    document.body.appendChild(menu);

    setTimeout(() => {
      document.addEventListener('click', function h() {
        document.querySelectorAll('.card-ctx-menu').forEach(m => m.remove());
        document.removeEventListener('click', h);
      });
    }, 50);
  },

  async _kanbanAssign(id, name) {
    const c = this.data.find(x => x.id === id);
    if (!c) return;
    const newVal = name || null;
    await api.patch(`/clients/${id}/suivi`, { suivi_assigned_to: newVal });
    c.suivi_assigned_to = newVal;
    // Si on s'assigne à soi-même → pas de badge pour soi
    this._markAssignmentsSeen();
    // Update avatar on card without full re-render
    const card = document.querySelector(`.kanban-card[data-cid="${id}"]`);
    if (card) {
      // Re-render just this card
      const col = this.getContactCols ? getContactCols().find(col => this.effectiveContactStatus(c) === col.key) : null;
      const slot = card.parentElement;
      if (slot) {
        const tmp = document.createElement('div');
        tmp.innerHTML = this.cardHTML(c);
        card.replaceWith(tmp.firstElementChild);
      }
    }
    Toast.show(newVal ? `👤 Assigné à ${newVal}` : '✓ Assignation retirée');
  },

  quickLog(id, type, label) {
    document.querySelectorAll('.card-ctx-menu').forEach(m => m.remove());
    Modal.open(label, `
      <div style="padding:4px 0 8px">
        <input id="quick-log-input" type="text" placeholder="Ajouter une note (optionnel)…"
          style="width:100%;font-family:inherit;font-size:14px;padding:10px 12px;border:1.5px solid var(--accent);border-radius:8px;outline:none;box-sizing:border-box"
          onkeydown="if(event.key==='Enter')Clients._submitQuickLog(${id},'${type}','${label}')">
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" onclick="Modal.close()">Annuler</button>
        <button class="btn btn-primary" onclick="Clients._submitQuickLog(${id},'${type}','${label}')">Logger</button>
      </div>`);
    setTimeout(() => document.getElementById('quick-log-input')?.focus(), 80);
  },

  async _submitQuickLog(id, type, label) {
    const content = document.getElementById('quick-log-input')?.value?.trim() || null;
    Modal.close();
    const author = (typeof App !== 'undefined' && App.user?.name) ? App.user.name : 'Tim';
    await api.post('/activities', { client_id: id, type, content, author });
    Toast.show(`✓ ${label} enregistré`);
    const cardSlot = document.getElementById(`card-act-${id}`);
    if (cardSlot) delete cardSlot.dataset.loaded;
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
    const body = { contact_status: status };
    // Sync suivi_status quand on signe depuis le kanban
    if (status === 'Signé') body.suivi_status = 'signe';
    await api.patch(`/clients/${id}/contact-status`, body);
    const c = this.data.find(x => x.id === id);
    if (c) {
      c.contact_status = status;
      if (status === 'Signé') c.suivi_status = 'signe';
    }
    this.render();
  },

  async sendToRecherches(id) {
    // Passe suivi_status à recherche_lancee (ce qui sync status → Recherche active via backend)
    await api.patch(`/clients/${id}/suivi`, { suivi_status: 'recherche_lancee' });
    const c = this.data.find(x => x.id === id);
    if (c) { c.suivi_status = 'recherche_lancee'; c.status = 'Recherche active'; }
    this.render();
    Toast.show('🔍 Client en recherche active');
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
    const MODES = [
      { key: 'date',  dir: 'desc' },
      { key: 'date',  dir: 'asc'  },
      { key: 'score', dir: 'desc' },
      { key: 'score', dir: 'asc'  },
    ];
    const idx = MODES.findIndex(m => m.key === this.sortKey && m.dir === this.sortDir);
    const next = MODES[(idx + 1) % MODES.length];
    this.sortKey = next.key;
    this.sortDir = next.dir;
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
    // Remove card from DOM directly to avoid scroll reset
    const card = document.querySelector(`.kanban-card[data-cid="${id}"]`);
    if (card) card.remove();
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
    if (colKey === 'en_recherche') return; // ghost col = read-only
    const id = Number(e.dataTransfer.getData('clientId'));
    if (!id) return;
    await this.setContactStatus(id, colKey);
    if (colKey === 'Signé') await this._createContractFromClient(id);
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
      <div class="modal-sub-title">⭐ Score client</div>
      ${scoreBreakdownHTML(c)}

      <div class="modal-sep"></div>
      <div class="modal-sub-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>🏠 ${t('match_title')}</span>
      </div>
      <div id="matching-slot-${id}" class="sub-list-slot"><span class="spinner-sm">…</span></div>

      <div class="modal-sep"></div>
      <div class="modal-sub-title">📓 Activity log</div>

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
  _usersCache: null,
  async _getUsers() {
    if (this._usersCache) return this._usersCache;
    try { this._usersCache = await api.get('/users'); } catch { this._usersCache = []; }
    return this._usersCache;
  },

  async _loadActivities(clientId) {
    const slot = document.getElementById(`activity-slot-${clientId}`);
    if (!slot) return;
    try {
      const [rows, users] = await Promise.all([
        api.get(`/activities?client_id=${clientId}`),
        this._getUsers().catch(() => []),
      ]);
      if (!rows.length) { slot.innerHTML = `<p class="sub-empty">No activity yet. Log your first interaction above.</p>`; return; }
      const ICONS = { call:'📞', whatsapp:'💬', visit:'🏠', email:'✉️', note:'📝', proposal:'📤', system:'⚙️' };
      slot.innerHTML = rows.map(r => {
        const user = users.find(u => u.name === r.author);
        const avatarEl = (typeof avatarHTML === 'function' && user)
          ? avatarHTML(user, 24)
          : `<span style="width:24px;height:24px;border-radius:50%;background:var(--surface-2,#222);display:inline-flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0">${(r.author||'?')[0]}</span>`;
        return `
        <div class="activity-entry">
          <span class="activity-icon">${ICONS[r.type]||'📌'}</span>
          <div class="activity-content">
            <div style="display:flex;align-items:center;gap:6px">
              ${avatarEl}
              <span class="activity-author">${r.author}</span>
              <span class="activity-time">${this._relativeTime(r.created_at)}</span>
            </div>
            ${r.content ? `<p class="activity-text">${r.content}</p>` : ''}
          </div>
          <button class="activity-del" onclick="Clients.deleteActivity(${r.id},${clientId})" title="Delete">✕</button>
        </div>`;
      }).join('');
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
    const author = (typeof App !== 'undefined' && App.user?.name) ? App.user.name : 'Tim';
    try {
      await api.post('/activities', { client_id: clientId, type, content: content || null, author });
      const wrap = document.getElementById(`activity-input-${clientId}`);
      if (wrap) wrap.classList.add('hidden');
      this._loadActivities(clientId);
      // Invalidate card back cache so next flip shows fresh activity
      const cardSlot = document.getElementById(`card-act-${clientId}`);
      if (cardSlot) delete cardSlot.dataset.loaded;

      // Auto-advance kanban column on WhatsApp activity (skip ghost col)
      if (type === 'whatsapp') {
        const COLS = getContactCols().filter(col => !col.ghost);
        const c = this.data.find(x => x.id === clientId);
        if (c) {
          const cur = this.effectiveContactStatus(c);
          const idx = COLS.findIndex(col => col.key === cur);
          if (idx !== -1 && idx < COLS.length - 1) {
            const next = COLS[idx + 1].key;
            c.contact_status = next;
            api.patch(`/clients/${clientId}/contact-status`, { contact_status: next }).catch(() => {});
            Toast.show(`💬 WhatsApp logué · → ${next}`);
            this.render();
            return;
          }
        }
      }

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
      if (typeof Router !== 'undefined' && Router.current !== 'clients') {
        await Router.navigate(Router.current);
      } else {
        this.render();
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  // ══════════════════════════════════════════════════════════════════
  // VUE SUIVI — split view
  // ══════════════════════════════════════════════════════════════════

  _getSuiviStatus(c) {
    return c.suivi_status || 'nouveau';
  },

  _toggleSuiviGroup(key) {
    this.suiviCollapsed[key] = !this.suiviCollapsed[key];
    localStorage.setItem('crm_suivi_collapsed', JSON.stringify(this.suiviCollapsed));
    // Toggle DOM without full re-render
    const grp = document.querySelector(`.suivi-grp-body[data-grp="${key}"]`);
    const btn = document.querySelector(`.suivi-grp-hdr[data-grp="${key}"] .suivi-grp-chevron`);
    if (grp) grp.style.display = this.suiviCollapsed[key] ? 'none' : '';
    if (btn) btn.style.transform = this.suiviCollapsed[key] ? 'rotate(-90deg)' : 'rotate(0deg)';
  },

  _renderSuiviHTML() {
    const active = this.data.filter(c => !c.archived);
    const groups = this.SUIVI_STATUSES.map(st => ({
      ...st,
      clients: active.filter(c => this._getSuiviStatus(c) === st.key),
    }));

    const leftHTML = groups.map(g => {
      const collapsed = !!this.suiviCollapsed[g.key];
      const rows = g.clients.map(c => {
        const isSel = c.id === this.suiviSelectedId;
        const assigned = c.suivi_assigned_to || '';
        const avHTML = this._suiviMiniAv(assigned);
        const budget = c.budget_max ? `฿${Number(c.budget_max).toLocaleString('fr-FR')}` : '';
        const type = c.property_type ? tr(c.property_type) : '';
        const sub = [budget, type].filter(Boolean).join(' · ');
        return `<div class="suivi-row ${isSel ? 'sel' : ''}" style="border-left:2.5px solid ${g.color}"
          onclick="Clients._suiviSelect(${c.id})"
          oncontextmenu="Clients._suiviCtxMenu(${c.id},event)">
          <div class="suivi-row-info">
            <div class="suivi-row-name">${c.name}</div>
            ${sub ? `<div class="suivi-row-sub">${sub}</div>` : ''}
          </div>
          ${avHTML}
        </div>`;
      }).join('');
      return `
        <div class="suivi-grp-hdr" data-grp="${g.key}" onclick="Clients._toggleSuiviGroup('${g.key}')">
          <div class="suivi-grp-dot" style="background:${g.color}"></div>
          <span class="suivi-grp-lbl">${g.label}</span>
          <span class="suivi-grp-count">· ${g.clients.length}</span>
          <span class="suivi-grp-chevron" style="transform:rotate(${collapsed ? '-90' : '0'}deg)">›</span>
        </div>
        <div class="suivi-grp-body" data-grp="${g.key}" style="${collapsed ? 'display:none' : ''}">
          ${rows.length ? rows : '<div class="suivi-grp-empty">—</div>'}
        </div>`;
    }).join('');

    return `<div class="suivi-container">
      <div class="suivi-left">${leftHTML || '<div class="suivi-empty">Aucun client</div>'}</div>
      <div class="suivi-right" id="suivi-right">
        <div class="suivi-empty">← Sélectionne un client</div>
      </div>
    </div>`;
  },

  _suiviSelect(id) {
    this.suiviSelectedId = id;
    // update selection highlight
    document.querySelectorAll('.suivi-row').forEach(r => r.classList.remove('sel'));
    const rows = document.querySelectorAll('.suivi-row');
    rows.forEach(r => {
      if (r.getAttribute('onclick') && r.getAttribute('onclick').includes(`(${id})`)) {
        r.classList.add('sel');
      }
    });
    this._suiviLoadRight(id);
  },

  async _suiviLoadRight(id) {
    const c = this.data.find(x => x.id === id);
    if (!c) return;
    const right = document.getElementById('suivi-right');
    if (!right) return;

    const st = this._getSuiviStatus(c);
    const stObj = this.SUIVI_STATUSES.find(s => s.key === st) || this.SUIVI_STATUSES[0];
    const color = stObj.color;
    const isAdmin = typeof App !== 'undefined' && App.user?.role === 'admin';

    // Budget / meta
    const budget = c.budget_max ? `฿${Number(c.budget_max).toLocaleString('fr-FR')}/mois` : null;
    const type   = c.property_type ? tr(c.property_type) : null;
    const beds   = c.bedrooms ? `${c.bedrooms} ch.` : null;
    const arrival = c.move_in_date ? fmtDate(c.move_in_date) : null;
    const dur    = c.duration ? tr(c.duration) : null;
    const pills  = [budget, type && beds ? `${type} ${beds}` : (type || beds), arrival, dur].filter(Boolean)
      .map(p => `<span class="suivi-pill">${p}</span>`).join('');

    // Avatar (initiales) pour header
    const initials = c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const avStyle  = `background:${stObj.bg};color:${color};`;

    // Track HTML
    const curIdx = this.SUIVI_STATUSES.findIndex(s => s.key === st);
    const trackHTML = this.SUIVI_STATUSES.map((s, i) => {
      const isDone = i < curIdx;
      const isCur  = i === curIdx;
      const lineColor = (isDone || isCur) ? color : 'var(--border)';
      const dotBg     = isDone ? color : (isCur ? '#fff' : 'var(--surface-1,#f8fafc)');
      const dotBorder = (isDone || isCur) ? color : 'var(--border)';
      const dotShadow = isCur ? `0 0 0 3px ${stObj.bg}` : 'none';
      const lblColor  = isCur ? color : (isDone ? 'var(--text-2)' : 'var(--text-3)');
      const lblWeight = isCur ? '600' : '400';
      return `<div class="suivi-step ${isDone?'done':''} ${isCur?'cur':''}"
          onclick="Clients._suiviSetStatus(${id},'${s.key}')"
          title="Passer à : ${s.label}">
        ${i > 0 ? `<div class="suivi-step-line" style="background:${lineColor}"></div>` : ''}
        <div class="suivi-step-dot" style="background:${dotBg};border-color:${dotBorder};box-shadow:${dotShadow}"></div>
        <div class="suivi-step-lbl" style="color:${lblColor};font-weight:${lblWeight}">${s.label}</div>
      </div>`;
    }).join('');

    // Assign chips
    const users = await this._suiviGetUsers();
    const assignHTML = isAdmin ? `
      <div class="suivi-assign-row">
        <span class="suivi-assign-label">Géré par</span>
        ${users.map(u => {
          const isActive = (c.suivi_assigned_to === u.name);
          const avEl = u.avatar_type === 'upload' && u.avatar_value
            ? `<div class="suivi-assign-av"><img src="${u.avatar_value}" alt="${u.name}"></div>`
            : `<div class="suivi-assign-av" style="background:${this._suiviUserColor(u.name).bg};color:${this._suiviUserColor(u.name).color}">${(u.name||'?')[0].toUpperCase()}</div>`;
          return `<div class="suivi-assign-chip ${isActive?'active':''}"
            style="${isActive ? `border-color:${color};background:${stObj.bg}` : ''}"
            onclick="Clients._suiviAssign(${id},'${u.name}')">
            ${avEl}${u.name}
          </div>`;
        }).join('')}
      </div>` : (c.suivi_assigned_to ? `
      <div class="suivi-assign-row">
        <span class="suivi-assign-label">Géré par <strong>${c.suivi_assigned_to}</strong></span>
      </div>` : '');

    right.innerHTML = `
      <div class="suivi-right-head">
        <div class="suivi-client-row">
          <div class="suivi-big-av" style="${avStyle}">${initials}</div>
          <div>
            <div class="suivi-client-name">${c.name}</div>
            <div class="suivi-client-meta">${[tr(c.status||''), c.whatsapp].filter(Boolean).join(' · ')}</div>
          </div>
          <button class="suivi-fiche-link" onclick="Clients.openDetailModal(${id})">↗ Fiche</button>
        </div>
        <div class="suivi-track">${trackHTML}</div>
      </div>
      ${assignHTML}
      ${pills ? `<div class="suivi-pills">${pills}</div>` : ''}
      <div id="suivi-late-${id}"></div>
      <div class="suivi-log" id="suivi-log-${id}"><div class="suivi-log-empty">Chargement…</div></div>
      <div class="suivi-add-log">
        <select class="suivi-add-select" id="suivi-chan-${id}">
          <option value="whatsapp">💬 WhatsApp</option>
          <option value="call">📞 Appel</option>
          <option value="line">📱 Line</option>
          <option value="email">✉️ Email</option>
          <option value="note">📝 Note</option>
        </select>
        <input class="suivi-add-input" id="suivi-note-${id}" placeholder="Loguer une action…"
          onkeydown="if(event.key==='Enter')Clients._suiviAddLog(${id})">
        <button class="suivi-add-btn" onclick="Clients._suiviAddLog(${id})">Ajouter</button>
      </div>`;

    this._suiviLoadLog(id);
  },

  async _suiviGetUsers() {
    if (this._suiviUsers) return this._suiviUsers;
    try {
      const users = await api.get('/users');
      this._suiviUsers = (users || []).filter(u => u.role !== 'admin' || true);
      return this._suiviUsers;
    } catch {
      return [{ name: 'Tim', avatar_type: 'preset' }, { name: 'Nono', avatar_type: 'preset' }, { name: 'Chompoo', avatar_type: 'preset' }];
    }
  },

  _suiviUserColor(name) {
    const palette = {
      Tim:     { bg: '#EEEDFE', color: '#3C3489' },
      Nono:    { bg: '#E1F5EE', color: '#085041' },
      Chompoo: { bg: '#FAEEDA', color: '#633806' },
    };
    return palette[name] || { bg: '#E6F1FB', color: '#0C447C' };
  },

  _suiviTagDots(c) {
    // Dots visibles pour les tags clés — max 3 dots
    const TAG_COLORS = {
      hot:      '#EF4444', // rouge — prioritaire
      rappeler: '#F97316', // orange — à relancer
      appeler:  '#3B82F6', // bleu — à appeler
      rep:      '#94A3B8', // gris — en attente réponse
      visite:   '#8B5CF6', // violet — visite à planifier
      contrat:  '#16A34A', // vert — contrat
      nego:     '#D97706', // ambre — négociation
      stop:     '#64748B', // slate — ne pas contacter
      payer:    '#DC2626', // rouge foncé — à payer
    };
    const ORDER = ['hot','stop','payer','rappeler','appeler','contrat','nego','visite','rep'];
    let tags = [];
    try { tags = JSON.parse(c.action_tags || '[]'); } catch { tags = []; }
    if (!Array.isArray(tags)) tags = [];
    const dots = ORDER.filter(k => tags.includes(k) && TAG_COLORS[k]).slice(0, 3);
    if (!dots.length) return '';
    return dots.map(k => {
      const tag = ACTION_TAGS.find(t => t.key === k);
      return `<span title="${tag?.label || k}" style="width:6px;height:6px;border-radius:50%;background:${TAG_COLORS[k]};display:inline-block;flex-shrink:0"></span>`;
    }).join('');
  },

  _suiviMiniAv(name, size = 20) {
    if (!name) return '';
    // Vrai avatar depuis le cache global App ou le cache local
    const user = (typeof App !== 'undefined' && App.getUserByName?.(name))
               || (this._suiviUsers || []).find(u => u.name === name);
    if (user && typeof avatarHTML === 'function') {
      return `<div class="suivi-row-av" title="${name}" style="width:${size}px;height:${size}px;overflow:hidden;border-radius:50%;flex-shrink:0">${avatarHTML(user, size)}</div>`;
    }
    // Fallback initiale colorée
    const col = this._suiviUserColor(name);
    return `<div class="suivi-row-av" title="${name}" style="background:${col.bg};color:${col.color}">${name[0]?.toUpperCase()||'?'}</div>`;
  },

  async _suiviLoadLog(id) {
    const slot = document.getElementById(`suivi-log-${id}`);
    const lateBadge = document.getElementById(`suivi-late-${id}`);
    if (!slot) return;
    try {
      const rows = await api.get(`/activities?client_id=${id}`);
      const ICONS = { call:'📞', whatsapp:'💬', line:'📱', visit:'🏠', email:'✉️', note:'📝', proposal:'📤', system:'⚙️' };

      // Calcul jours sans contact
      if (lateBadge && rows.length) {
        const last = new Date(rows[0].created_at);
        const days = Math.floor((Date.now() - last) / 86400000);
        if (days >= 7) {
          lateBadge.innerHTML = `<div class="suivi-late-badge">⚠️ ${days} jours sans contact — à relancer</div>`;
        }
      }

      if (!rows.length) {
        slot.innerHTML = '<div class="suivi-log-empty">Aucune activité — loguez le premier échange.</div>';
        return;
      }

      // Grouper par date
      let lastDay = null;
      const items = rows.map(r => {
        const d = new Date(r.created_at);
        const dayKey = d.toISOString().split('T')[0];
        let sep = '';
        if (dayKey !== lastDay) {
          lastDay = dayKey;
          const label = this._suiviRelDay(d);
          sep = `<div class="suivi-log-sep"><span>${label}</span></div>`;
        }
        const icon = ICONS[r.type] || '📌';
        const chan = r.type ? `<span class="suivi-log-channel">${icon} ${r.type}</span>` : '';
        const when = this._relativeTime(r.created_at);

        // Avatar auteur — vrai avatar depuis cache global
        const authorUser = (typeof App !== 'undefined' && App.getUserByName?.(r.author))
                        || (this._suiviUsers || []).find(u => u.name === r.author);
        const avHTML = (authorUser && typeof avatarHTML === 'function')
          ? `<div class="suivi-log-av" style="overflow:hidden;padding:0;border-radius:50%">${avatarHTML(authorUser, 28)}</div>`
          : (() => { const col = this._suiviUserColor(r.author||''); return `<div class="suivi-log-av" style="background:${col.bg};color:${col.color}">${(r.author||'?')[0].toUpperCase()}</div>`; })();

        return `${sep}<div class="suivi-log-entry">
          ${avHTML}
          <div class="suivi-log-bubble">
            <div class="suivi-log-top">
              <span class="suivi-log-who">${r.author || '—'}</span>
              ${chan}
              <span class="suivi-log-when">${when}</span>
            </div>
            ${r.content ? `<div class="suivi-log-text">${r.content}</div>` : ''}
          </div>
        </div>`;
      }).join('');
      slot.innerHTML = items;
    } catch {
      slot.innerHTML = '<div class="suivi-log-empty">Erreur de chargement.</div>';
    }
  },

  _suiviRelDay(d) {
    const today = new Date(); today.setHours(0,0,0,0);
    const day   = new Date(d); day.setHours(0,0,0,0);
    const diff  = Math.round((today - day) / 86400000);
    if (diff === 0) return 'Aujourd\'hui';
    if (diff === 1) return 'Hier';
    if (diff < 7)  return `Il y a ${diff} jours`;
    return d.toLocaleDateString(getLang()==='en' ? 'en-GB' : 'fr-FR', { day:'2-digit', month:'short' });
  },

  async _suiviAddLog(id) {
    const chanEl = document.getElementById(`suivi-chan-${id}`);
    const noteEl = document.getElementById(`suivi-note-${id}`);
    if (!chanEl || !noteEl) return;
    const type    = chanEl.value;
    const content = noteEl.value.trim() || null;
    const author  = (typeof App !== 'undefined' && App.user?.name) ? App.user.name : 'Tim';
    noteEl.value = '';
    await api.post('/activities', { client_id: id, type, content, author });
    Toast.show('✓ Activité enregistrée', 'success');
    // Reload log
    const slot = document.getElementById(`suivi-log-${id}`);
    if (slot) { slot.innerHTML = '<div class="suivi-log-empty">Chargement…</div>'; }
    await this._suiviLoadLog(id);
  },

  async _suiviSetStatus(id, status) {
    const c = this.data.find(x => x.id === id);
    if (!c) return;
    await api.patch(`/clients/${id}/suivi`, { suivi_status: status });
    c.suivi_status = status;
    // Update left sidebar row highlight color
    this.render();
    // Re-select to refresh right panel
    setTimeout(() => this._suiviLoadRight(id), 0);
  },

  async _suiviAssign(id, name) {
    const isAdmin = typeof App !== 'undefined' && App.user?.role === 'admin';
    if (!isAdmin) return;
    const c = this.data.find(x => x.id === id);
    if (!c) return;
    const newVal = c.suivi_assigned_to === name ? null : name;
    await api.patch(`/clients/${id}/suivi`, { suivi_assigned_to: newVal });
    c.suivi_assigned_to = newVal;
    // Update left sidebar avatar + right panel chips
    this.render();
    setTimeout(() => this._suiviLoadRight(id), 0);
  },

  _suiviCtxMenu(id, event) {
    event.preventDefault();
    document.querySelectorAll('.suivi-ctx-menu').forEach(m => m.remove());
    const c = this.data.find(x => x.id === id);
    if (!c) return;
    const isAdmin = typeof App !== 'undefined' && App.user?.role === 'admin';
    const cur = this._getSuiviStatus(c);

    const statusItems = this.SUIVI_STATUSES.filter(s => s.key !== cur).map(s =>
      `<div class="suivi-ctx-item" onclick="document.querySelectorAll('.suivi-ctx-menu').forEach(m=>m.remove());Clients._suiviSetStatus(${id},'${s.key}')">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.color};margin-right:6px;vertical-align:middle"></span>${s.label}
      </div>`).join('');

    const assignItems = isAdmin ? `
      <div class="suivi-ctx-sep"></div>
      <div class="suivi-ctx-item" style="font-size:11px;color:var(--text-3);padding-bottom:2px">Assigner à</div>
      ${['Tim','Nono','Chompoo'].map(n =>
        `<div class="suivi-ctx-item ${c.suivi_assigned_to===n?'active':''}"
          onclick="document.querySelectorAll('.suivi-ctx-menu').forEach(m=>m.remove());Clients._suiviAssign(${id},'${n}')">
          ${c.suivi_assigned_to===n?'✓ ':''} ${n}
        </div>`).join('')}` : '';

    const menu = document.createElement('div');
    menu.className = 'suivi-ctx-menu';
    menu.innerHTML = `
      ${statusItems}
      <div class="suivi-ctx-sep"></div>
      <div class="suivi-ctx-item" onclick="document.querySelectorAll('.suivi-ctx-menu').forEach(m=>m.remove());Clients.openDetailModal(${id})">↗ Voir la fiche</div>
      ${assignItems}
      <div class="suivi-ctx-sep"></div>
      <div class="suivi-ctx-item danger" onclick="document.querySelectorAll('.suivi-ctx-menu').forEach(m=>m.remove());Clients.archiveClient(${id})">🗄 Archiver</div>`;

    const x = Math.min(event.clientX, window.innerWidth - 210);
    const y = Math.min(event.clientY, window.innerHeight - 250);
    menu.style.cssText = `top:${y}px;left:${x}px`;
    document.body.appendChild(menu);
    setTimeout(() => {
      document.addEventListener('click', function h() { menu.remove(); document.removeEventListener('click', h); });
    }, 50);
  },

  async archiveClient(id) {
    await api.patch(`/clients/${id}/archive`);
    const c = this.data.find(x => x.id === id);
    if (c) c.archived = 1;
    if (this.suiviSelectedId === id) this.suiviSelectedId = null;
    Toast.show('Client archivé');
    await this.load();
    this.render();
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
