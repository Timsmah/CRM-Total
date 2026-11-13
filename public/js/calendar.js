// ── Calendrier arrivées (clients sélectionnés manuellement) ──────────────────
const CalendarView = {
  _clients: [],       // cache complet pour lookup rapide
  _pins: {},          // { clientId: "YYYY-MM-DD" }  — persiste en localStorage
  _phantoms: [],      // [{ id: "ph_xxx", name: "...", date: "YYYY-MM-DD" }]
  year:  new Date().getFullYear(),
  month: new Date().getMonth(),

  // ── Persistance ────────────────────────────────────────────────────────────
  _loadPins() {
    try { this._pins = JSON.parse(localStorage.getItem('crm_cal_pins') || '{}'); }
    catch { this._pins = {}; }
    try { this._phantoms = JSON.parse(localStorage.getItem('crm_cal_phantoms') || '[]'); }
    catch { this._phantoms = []; }
  },
  _savePins() {
    try { localStorage.setItem('crm_cal_pins', JSON.stringify(this._pins)); }
    catch {}
  },
  _savePhantoms() {
    try { localStorage.setItem('crm_cal_phantoms', JSON.stringify(this._phantoms)); }
    catch {}
  },

  // ── Init ───────────────────────────────────────────────────────────────────
  async init() {
    this._loadPins();
    document.getElementById('content').innerHTML = '<p class="spinner">Chargement…</p>';
    this._clients = await api.get('/clients').catch(() => []);
    this.render();
  },

  // ── Clients épinglés (réels + fantômes) ───────────────────────────────────
  _pinnedClients() {
    const real = Object.entries(this._pins)
      .map(([idStr, date]) => {
        const c = this._clients.find(x => x.id === parseInt(idStr));
        return c ? { ...c, _calDate: date, _isPhantom: false } : null;
      })
      .filter(Boolean);
    const phantoms = this._phantoms.map(p => ({
      id: p.id, name: p.name, _calDate: p.date, _isPhantom: true,
      suivi_status: null, budget_max: null, commission_earned: null,
    }));
    return [...real, ...phantoms];
  },

  _forDay(day) {
    const ds = `${this.year}-${String(this.month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return this._pinnedClients().filter(c => c._calDate === ds);
  },

  _upcoming() {
    const now = new Date(); now.setHours(0,0,0,0);
    const horizon = new Date(now); horizon.setDate(horizon.getDate() + 60);
    return this._pinnedClients()
      .map(c => ({ c, d: new Date(c._calDate + 'T12:00:00') }))
      .filter(({ d }) => d >= now && d <= horizon)
      .sort((a, b) => a.d - b.d);
  },

  _urgencyClass(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    const now = new Date(); now.setHours(0,0,0,0);
    const days = Math.round((d - now) / 86400000);
    if (days < 0)   return 'cal-chip-overdue';
    if (days <= 7)  return 'cal-chip-urgent';
    if (days <= 30) return 'cal-chip-soon';
    return 'cal-chip-future';
  },

  _statusLabel(c) {
    const map = { nouveau: 'Nouveau', en_closing: 'Closing', recherche_lancee: 'Recherche',
                  en_attente_signature: 'Signature', signe: 'Signé' };
    return map[c.suivi_status] || (c.suivi_status || 'Nouveau');
  },

  // ── Stats bar ──────────────────────────────────────────────────────────────
  _statsBar(pinned, upcoming, today) {
    // Prochain client (tous, pas seulement 60j)
    const allFuture = pinned
      .filter(c => c._calDate)
      .map(c => ({ c, d: new Date(c._calDate + 'T12:00:00') }))
      .filter(({ d }) => d >= today)
      .sort((a, b) => a.d - b.d);

    const nextClient = allFuture[0];
    const nextDays   = nextClient ? Math.round((nextClient.d - today) / 86400000) : null;
    const nextLabel  = nextDays === null ? '—'
      : nextDays === 0 ? "Aujourd'hui !"
      : nextDays === 1 ? 'Demain'
      : `Dans ${nextDays}j`;
    const nextName   = nextClient ? nextClient.c.name.split(' ')[0] : '—';
    const nextUrgent = nextDays !== null && nextDays <= 7;

    // En retard (date passée)
    const overdue = pinned.filter(c => {
      if (!c._calDate) return false;
      return new Date(c._calDate + 'T12:00:00') < today;
    });

    // Potentiel commission : loyer × (mois/12) × 50% (co-agent)
    const _durationMonths = dur => {
      if (!dur) return null;
      const d = dur.toLowerCase();
      if (/\b(1 an|2 ans|3 ans|12 mois)\b/.test(d)) return 12;
      const m = d.match(/(\d+)\s*mois/);
      return m ? parseInt(m[1]) : null;
    };
    let totalPotentiel = 0;
    let clientsAvecPotentiel = 0;
    pinned.forEach(c => {
      if (c._isPhantom) return;
      const loyer = parseFloat(c.budget_eur) || 0;
      if (!loyer) return;
      const mois = _durationMonths(c.duration);
      if (!mois) return;
      // 1 an → 1 mois de loyer ; prorata sinon ; puis ÷2 co-agent
      const commission = loyer * (Math.min(mois, 12) / 12) * 0.5;
      totalPotentiel += commission;
      clientsAvecPotentiel++;
    });

    // Tiles
    const tiles = [
      {
        n: pinned.length,
        l: `suivi${pinned.length !== 1 ? 's' : ''}`,
        sub: pinned.length === 0 ? 'Aucun client' : `${upcoming.length} dans 60j`,
        warn: false,
      },
      {
        n: nextLabel,
        l: 'prochain',
        sub: nextClient ? nextClient.c.name : 'Aucune date à venir',
        warn: nextUrgent,
        accent: nextDays === 0,
      },
      {
        n: overdue.length || '—',
        l: overdue.length ? `en retard` : 'en retard',
        sub: overdue.length ? overdue.map(c => c.name.split(' ')[0]).join(', ') : 'Nickel',
        warn: overdue.length > 0,
        danger: overdue.length > 0,
      },
      ...(totalPotentiel > 0 ? [{
        n: Math.round(totalPotentiel).toLocaleString('fr-FR') + ' €',
        l: 'potentiel',
        sub: `${clientsAvecPotentiel} client${clientsAvecPotentiel !== 1 ? 's' : ''} · co-agent 50%`,
        warn: false,
        accent: true,
      }] : []),
    ];

    return `<div class="cal-stats-bar">
      ${tiles.map(t => `
        <div class="cal-stat ${t.danger ? 'cal-stat-danger' : t.warn ? 'cal-stat-warn' : ''} ${t.accent ? 'cal-stat-accent' : ''}">
          <div class="cal-stat-top">
            <span class="cal-stat-n">${t.n}</span>
            <span class="cal-stat-l">${t.l}</span>
          </div>
          <div class="cal-stat-sub">${t.sub}</div>
        </div>`).join('')}
    </div>`;
  },

  // ── Render principal ───────────────────────────────────────────────────────
  render() {
    const today = new Date(); today.setHours(0,0,0,0);
    const isCurrentMonth = today.getFullYear() === this.year && today.getMonth() === this.month;

    const firstDow   = new Date(this.year, this.month, 1).getDay();
    const startOffset = (firstDow + 6) % 7;
    const daysInMonth = new Date(this.year, this.month + 1, 0).getDate();
    const totalCells  = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const monthName = new Date(this.year, this.month, 1)
      .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    const upcoming = this._upcoming();
    const pinned   = this._pinnedClients();

    // Cellules du calendrier
    const cells = [];
    for (let i = 0; i < totalCells; i++) {
      const day = i - startOffset + 1;
      if (day < 1 || day > daysInMonth) {
        cells.push(`<div class="cal-cell cal-cell-empty"></div>`);
        continue;
      }
      const dayClients = this._forDay(day);
      const isToday = isCurrentMonth && day === today.getDate();
      const dateObj = new Date(this.year, this.month, day);
      const isPast  = dateObj < today && !isToday;

      cells.push(`
        <div class="cal-cell ${isToday ? 'cal-cell-today' : ''} ${isPast ? 'cal-cell-past' : ''}">
          <div class="cal-day-num ${isToday ? 'cal-today-num' : ''}">${day}</div>
          <div class="cal-day-chips">
            ${dayClients.map(c => `
              <div class="cal-chip ${this._urgencyClass(c._calDate)} ${c._isPhantom ? 'cal-chip-phantom' : ''}"
                onclick="${c._isPhantom ? '' : `Clients.openDetailModal(${c.id})`}"
                oncontextmenu="event.preventDefault();CalendarView._chipMenu(event,'${c.id}')"
                title="${c.name}${c._isPhantom ? ' (hors CRM)' : ''}">
                <span class="cal-chip-name">${c.name.split(' ')[0]}</span>
              </div>`).join('')}
          </div>
        </div>`);
    }

    document.getElementById('content').innerHTML = `
      <div class="cal-layout">

        <!-- Calendrier principal -->
        <div class="cal-main">
          <div class="section-header">
            <h2 style="text-transform:capitalize">${monthName}</h2>
            <div class="header-actions">
              <button class="btn btn-ghost btn-sm" onclick="CalendarView._prevMonth()">‹</button>
              <button class="btn btn-ghost btn-sm" onclick="CalendarView._today()">Aujourd'hui</button>
              <button class="btn btn-ghost btn-sm" onclick="CalendarView._nextMonth()">›</button>
              <button class="btn btn-primary btn-sm" onclick="CalendarView._openAddModal()">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/></svg>
                Ajouter
              </button>
            </div>
          </div>

          <!-- Stats bar -->
          ${this._statsBar(pinned, upcoming, today)}

          <!-- Grille -->
          <div class="cal-grid">
            ${['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d =>
              `<div class="cal-dow">${d}</div>`).join('')}
            ${cells.join('')}
          </div>
        </div>

        <!-- Sidebar -->
        <div class="cal-sidebar">
          <div class="cal-sb-title">
            Clients suivis
            <span style="font-size:10px;font-weight:400;color:var(--text-3)">${pinned.length}</span>
          </div>
          ${pinned.length === 0
            ? `<p class="cal-sb-empty">Faites clic droit sur un client → <strong>Ajouter au calendrier</strong> pour le suivre ici.</p>`
            : pinned
                .sort((a,b) => (a._calDate||'').localeCompare(b._calDate||''))
                .map(c => {
                  const d = new Date(c._calDate + 'T12:00:00');
                  const now = new Date(); now.setHours(0,0,0,0);
                  const days = Math.round((d - now) / 86400000);
                  const label = days === 0 ? "Aujourd'hui" : days === 1 ? 'Demain' : days < 0 ? `Il y a ${-days}j` : `Dans ${days}j`;
                  const dateStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                  const idStr = JSON.stringify(String(c.id));
                  return `
                    <div class="cal-sb-row" onclick="${c._isPhantom ? '' : `Clients.openDetailModal(${c.id})`}">
                      <div class="cal-sb-dot ${this._urgencyClass(c._calDate)}"></div>
                      <div class="cal-sb-info">
                        <div class="cal-sb-name">
                          ${c.name}
                          ${c._isPhantom ? '<span style="font-size:9px;color:var(--text-3);margin-left:4px;background:var(--surface-3);border-radius:3px;padding:1px 4px">hors CRM</span>' : ''}
                        </div>
                        <div class="cal-sb-meta">${dateStr} · <span class="cal-sb-countdown">${label}</span></div>
                        <div class="cal-sb-status">${c._isPhantom ? 'Non créé' : this._statusLabel(c)}</div>
                      </div>
                      <button class="cal-sb-edit" title="Modifier la date"
                        onclick="event.stopPropagation();CalendarView._editPin(${idStr})">
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2l2 2-7 7H3v-2l7-7z"/></svg>
                      </button>
                      <button class="cal-sb-edit" title="Retirer du calendrier"
                        onclick="event.stopPropagation();CalendarView._removePin(${idStr})"
                        style="color:var(--text-3)">
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/></svg>
                      </button>
                    </div>`;
                }).join('')}
        </div>
      </div>`;
  },

  // ── Navigation ─────────────────────────────────────────────────────────────
  _prevMonth() {
    if (this.month === 0) { this.month = 11; this.year--; } else this.month--;
    this.render();
  },
  _nextMonth() {
    if (this.month === 11) { this.month = 0; this.year++; } else this.month++;
    this.render();
  },
  _today() {
    const now = new Date();
    this.year = now.getFullYear(); this.month = now.getMonth();
    this.render();
  },

  // ── Ajout (depuis bouton + Ajouter) ───────────────────────────────────────
  _openAddModal() {
    const available = this._clients
      .filter(c => !c.archived)
      .sort((a,b) => a.name.localeCompare(b.name));

    Modal.open('Ajouter au calendrier', `
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="form-group">
          <label class="form-label">Client</label>
          <input type="text" id="cal-search" class="form-input" placeholder="Rechercher ou saisir un nom…"
            autocomplete="off" oninput="CalendarView._filterList(this.value)">
          <div id="cal-list" style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:7px;margin-top:4px">
            ${available.map(c => `
              <div class="cal-pick-row" data-id="${c.id}" data-name="${c.name}"
                onclick="CalendarView._selectClient(this,${c.id},false)">
                <span>${c.name}</span>
                ${this._pins[c.id] ? `<span style="font-size:10px;color:var(--text-3)">${this._pins[c.id]}</span>` : ''}
              </div>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Date d'arrivée</label>
          <input type="date" id="cal-date-input" class="form-input">
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" onclick="Modal.close()">Annuler</button>
          <button class="btn btn-primary" id="cal-save-btn" disabled
            onclick="CalendarView._confirmAdd()">Ajouter</button>
        </div>
      </div>`);
  },

  _selectedClientId: null,
  _selectedIsPhantom: false,

  _selectClient(el, id, isPhantom) {
    document.querySelectorAll('.cal-pick-row').forEach(r => r.classList.remove('cal-pick-selected'));
    el.classList.add('cal-pick-selected');
    this._selectedClientId = id;
    this._selectedIsPhantom = !!isPhantom;
    if (!isPhantom && this._pins[id]) {
      const di = document.getElementById('cal-date-input');
      if (di && !di.value) di.value = this._pins[id];
    }
    document.getElementById('cal-save-btn').disabled = false;
  },

  _filterList(q) {
    const rows = document.querySelectorAll('.cal-pick-row:not(#cal-create-row)');
    let visible = 0;
    rows.forEach(row => {
      const match = !q || row.dataset.name.toLowerCase().includes(q.toLowerCase());
      row.style.display = match ? '' : 'none';
      if (match) visible++;
    });
    // Ligne "Créer « q »" si aucun résultat et q non vide
    let createRow = document.getElementById('cal-create-row');
    if (q && visible === 0) {
      if (!createRow) {
        createRow = document.createElement('div');
        createRow.id = 'cal-create-row';
        createRow.className = 'cal-pick-row';
        createRow.style.color = 'var(--accent)';
        createRow.style.fontWeight = '600';
        document.getElementById('cal-list').appendChild(createRow);
      }
      createRow.textContent = `+ Créer "${q}" (hors CRM)`;
      createRow.onclick = () => CalendarView._selectPhantom(q);
      createRow.style.display = '';
    } else if (createRow) {
      createRow.style.display = 'none';
    }
    // Reset sélection si le texte change — mais activer le bouton si du texte est présent
    this._selectedClientId = null;
    this._selectedIsPhantom = false;
    document.getElementById('cal-save-btn').disabled = !q;
  },

  _selectPhantom(name) {
    document.querySelectorAll('.cal-pick-row').forEach(r => r.classList.remove('cal-pick-selected'));
    document.getElementById('cal-create-row').classList.add('cal-pick-selected');
    this._selectedClientId = name; // On stocke le nom temporairement
    this._selectedIsPhantom = true;
    document.getElementById('cal-save-btn').disabled = false;
  },

  async _confirmAdd() {
    let id   = this._selectedClientId;
    const date = document.getElementById('cal-date-input')?.value;
    // Fallback : si rien de sélectionné mais du texte dans le champ → phantom
    if (!id) {
      const q = document.getElementById('cal-search')?.value?.trim();
      if (q) { id = q; this._selectedIsPhantom = true; }
    }
    if (!id || !date) return;
    Modal.close();

    if (this._selectedIsPhantom) {
      const phantomId = 'ph_' + Date.now();
      this._phantoms.push({ id: phantomId, name: id, date });
      this._savePhantoms();
      Toast.show(`${id} ajouté au calendrier`);
    } else {
      this._pins[id] = date;
      this._savePins();
      api.patch(`/clients/${id}`, { move_in_date: date }).catch(() => {});
      const c = this._clients.find(x => x.id === id);
      Toast.show(`${c?.name || 'Client'} ajouté au calendrier`);
    }
    this.render();
  },

  // ── Édition / suppression ──────────────────────────────────────────────────
  _editPin(clientId) {
    const idStr = String(clientId);
    const isPhantom = idStr.startsWith('ph_');
    const phantom = isPhantom ? this._phantoms.find(p => p.id === idStr) : null;
    const c = isPhantom ? phantom : this._clients.find(x => x.id === parseInt(idStr));
    if (!c) return;
    const currentDate = isPhantom ? phantom.date : (this._pins[parseInt(idStr)] || '');
    Modal.open(`Modifier — ${c.name}`, `
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="form-group">
          <label class="form-label">Date d'arrivée</label>
          <input type="date" id="cal-edit-date" class="form-input" value="${currentDate}">
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" onclick="Modal.close()">Annuler</button>
          <button class="btn btn-primary" onclick="CalendarView._saveEdit('${idStr}')">Enregistrer</button>
        </div>
      </div>`);
  },

  async _saveEdit(clientId) {
    const date = document.getElementById('cal-edit-date')?.value;
    if (!date) return;
    Modal.close();
    const idStr = String(clientId);
    if (idStr.startsWith('ph_')) {
      const p = this._phantoms.find(x => x.id === idStr);
      if (p) { p.date = date; this._savePhantoms(); }
    } else {
      const numId = parseInt(idStr);
      this._pins[numId] = date;
      this._savePins();
      api.patch(`/clients/${numId}`, { move_in_date: date }).catch(() => {});
    }
    Toast.show('Date mise à jour');
    this.render();
  },

  _removePin(clientId) {
    const idStr = String(clientId);
    let name = idStr;
    if (idStr.startsWith('ph_')) {
      const idx = this._phantoms.findIndex(p => p.id === idStr);
      if (idx !== -1) { name = this._phantoms[idx].name; this._phantoms.splice(idx, 1); }
      this._savePhantoms();
    } else {
      const numId = parseInt(idStr);
      const c = this._clients.find(x => x.id === numId);
      name = c?.name || idStr;
      delete this._pins[numId];
      this._savePins();
    }
    Toast.show(`${name} retiré du calendrier`);
    this.render();
  },

  // ── Menu contextuel depuis puce du calendrier ──────────────────────────────
  _chipMenu(event, clientId) {
    const items = [
      { label: 'Modifier la date', action: () => this._editPin(clientId) },
      { label: 'Retirer du calendrier', action: () => this._removePin(clientId) },
      { label: 'Voir la fiche', action: () => Clients.openDetailModal(clientId) },
    ];
    // Réutilise le système de menu contextuel existant si disponible
    if (typeof ContextMenu !== 'undefined') {
      ContextMenu.show(event, items);
    } else {
      this._editPin(clientId);
    }
  },

  // ── Appelé depuis clients.js (clic droit → Ajouter au calendrier) ──────────
  openAddToCalendar(clientId) {
    this._loadPins();
    const finish = (clients) => {
      this._clients = clients;
      const c = clients.find(x => x.id === clientId);
      const name = c?.name || 'Client';
      const existing = this._pins[clientId] || '';
      Modal.open(`Calendrier — ${name}`, `
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="form-group">
            <label class="form-label">Date d'arrivée</label>
            <input type="date" id="cal-date-input" class="form-input" value="${existing}">
          </div>
          <div class="form-actions">
            <button class="btn btn-ghost" onclick="Modal.close()">Annuler</button>
            <button class="btn btn-primary" onclick="CalendarView._confirmDirect(${clientId})">
              ${existing ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </div>`);
    };
    if (this._clients.length) finish(this._clients);
    else api.get('/clients').then(finish);
  },

  async _confirmDirect(clientId) {
    const date = document.getElementById('cal-date-input')?.value;
    if (!date) return;
    Modal.close();
    this._pins[clientId] = date;
    this._savePins();
    api.patch(`/clients/${clientId}`, { move_in_date: date }).catch(() => {});
    const c = this._clients.find(x => x.id === clientId);
    Toast.show(`${c?.name || 'Client'} ajouté au calendrier`);
  },
};
