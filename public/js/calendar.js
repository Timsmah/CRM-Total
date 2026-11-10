// ── Calendrier arrivées (clients sélectionnés manuellement) ──────────────────
const CalendarView = {
  _clients: [],       // cache complet pour lookup rapide
  _pins: {},          // { clientId: "YYYY-MM-DD" }  — persiste en localStorage
  year:  new Date().getFullYear(),
  month: new Date().getMonth(),

  // ── Persistance ────────────────────────────────────────────────────────────
  _loadPins() {
    try { this._pins = JSON.parse(localStorage.getItem('crm_cal_pins') || '{}'); }
    catch { this._pins = {}; }
  },
  _savePins() {
    try { localStorage.setItem('crm_cal_pins', JSON.stringify(this._pins)); }
    catch {}
  },

  // ── Init ───────────────────────────────────────────────────────────────────
  async init() {
    this._loadPins();
    document.getElementById('content').innerHTML = '<p class="spinner">Chargement…</p>';
    this._clients = await api.get('/clients').catch(() => []);
    this.render();
  },

  // ── Clients épinglés ───────────────────────────────────────────────────────
  _pinnedClients() {
    return Object.entries(this._pins)
      .map(([idStr, date]) => {
        const c = this._clients.find(x => x.id === parseInt(idStr));
        return c ? { ...c, _calDate: date } : null;
      })
      .filter(Boolean);
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

    // Revenus potentiels (commission_earned ou budget_max comme proxy)
    const totalBudget = pinned.reduce((sum, c) => {
      const v = parseFloat(c.commission_earned || c.budget_eur || 0);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);

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
      ...(totalBudget > 0 ? [{
        n: totalBudget.toLocaleString('fr-FR') + ' €',
        l: 'commissions',
        sub: `sur ${pinned.length} client${pinned.length !== 1 ? 's' : ''}`,
        warn: false,
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
              <div class="cal-chip ${this._urgencyClass(c._calDate)}"
                onclick="Clients.openDetailModal(${c.id})"
                oncontextmenu="event.preventDefault();CalendarView._chipMenu(event,${c.id})"
                title="${c.name}">
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
                  return `
                    <div class="cal-sb-row" onclick="Clients.openDetailModal(${c.id})">
                      <div class="cal-sb-dot ${this._urgencyClass(c._calDate)}"></div>
                      <div class="cal-sb-info">
                        <div class="cal-sb-name">${c.name}</div>
                        <div class="cal-sb-meta">${dateStr} · <span class="cal-sb-countdown">${label}</span></div>
                        <div class="cal-sb-status">${this._statusLabel(c)}</div>
                      </div>
                      <button class="cal-sb-edit" title="Modifier la date"
                        onclick="event.stopPropagation();CalendarView._editPin(${c.id})">
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2l2 2-7 7H3v-2l7-7z"/></svg>
                      </button>
                      <button class="cal-sb-edit" title="Retirer du calendrier"
                        onclick="event.stopPropagation();CalendarView._removePin(${c.id})"
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

  // ── Ajout (depuis bouton ou clic droit sidebar) ────────────────────────────
  _openAddModal(preselectedId, preselectedDate) {
    if (!this._clients.length) return;
    const available = this._clients
      .filter(c => !c.archived)
      .sort((a,b) => a.name.localeCompare(b.name));

    Modal.open('Ajouter au calendrier', `
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="form-group">
          <label class="form-label">Client</label>
          <input type="text" id="cal-search" class="form-input" placeholder="Rechercher…" autocomplete="off"
            oninput="CalendarView._filterList(this.value)" value="${preselectedId ? '' : ''}">
          <div id="cal-list" style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:7px;margin-top:4px">
            ${available.map(c => `
              <div class="cal-pick-row ${c.id === preselectedId ? 'cal-pick-selected' : ''}"
                data-id="${c.id}" data-name="${c.name}"
                onclick="CalendarView._selectClient(this,${c.id})">
                <span>${c.name}</span>
                ${this._pins[c.id] ? `<span style="font-size:10px;color:var(--text-3)">${this._pins[c.id]}</span>` : ''}
              </div>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Date d'arrivée</label>
          <input type="date" id="cal-date-input" class="form-input" value="${preselectedDate || ''}">
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" onclick="Modal.close()">Annuler</button>
          <button class="btn btn-primary" id="cal-save-btn" disabled
            onclick="CalendarView._confirmAdd()">Ajouter</button>
        </div>
      </div>`);

    if (preselectedId) {
      const row = document.querySelector(`.cal-pick-row[data-id="${preselectedId}"]`);
      if (row) this._selectClient(row, preselectedId);
    }
  },

  _selectedClientId: null,
  _selectClient(el, id) {
    document.querySelectorAll('.cal-pick-row').forEach(r => r.classList.remove('cal-pick-selected'));
    el.classList.add('cal-pick-selected');
    this._selectedClientId = id;
    if (this._pins[id]) {
      const di = document.getElementById('cal-date-input');
      if (di && !di.value) di.value = this._pins[id];
    }
    const btn = document.getElementById('cal-save-btn');
    if (btn) btn.disabled = false;
  },

  _filterList(q) {
    document.querySelectorAll('.cal-pick-row').forEach(row => {
      row.style.display = row.dataset.name.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
    });
  },

  async _confirmAdd() {
    const id   = this._selectedClientId;
    const date = document.getElementById('cal-date-input')?.value;
    if (!id || !date) return;
    Modal.close();
    this._pins[id] = date;
    this._savePins();
    // Mise à jour move_in_date sur le serveur pour cohérence
    api.patch(`/clients/${id}`, { move_in_date: date }).catch(() => {});
    const c = this._clients.find(x => x.id === id);
    Toast.show(`📅 ${c?.name || 'Client'} ajouté au calendrier`);
    this.render();
  },

  // ── Édition / suppression ──────────────────────────────────────────────────
  _editPin(clientId) {
    const c = this._clients.find(x => x.id === clientId);
    if (!c) return;
    Modal.open(`Modifier — ${c.name}`, `
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="form-group">
          <label class="form-label">Date d'arrivée</label>
          <input type="date" id="cal-edit-date" class="form-input" value="${this._pins[clientId] || ''}">
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" onclick="Modal.close()">Annuler</button>
          <button class="btn btn-primary" onclick="CalendarView._saveEdit(${clientId})">Enregistrer</button>
        </div>
      </div>`);
  },

  async _saveEdit(clientId) {
    const date = document.getElementById('cal-edit-date')?.value;
    if (!date) return;
    Modal.close();
    this._pins[clientId] = date;
    this._savePins();
    api.patch(`/clients/${clientId}`, { move_in_date: date }).catch(() => {});
    Toast.show('📅 Date mise à jour');
    this.render();
  },

  _removePin(clientId) {
    const c = this._clients.find(x => x.id === clientId);
    delete this._pins[clientId];
    this._savePins();
    Toast.show(`${c?.name || 'Client'} retiré du calendrier`);
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
    Toast.show(`📅 ${c?.name || 'Client'} ajouté au calendrier`);
  },
};
