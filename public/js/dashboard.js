const DB_STAGES = [
  { key: 'nouveau',          label: 'Nouveau',          color: '#4F6BED' },
  { key: 'en_closing',       label: 'En closing',       color: '#C9922A' },
  { key: 'en_attente',       label: 'En attente',       color: '#9B59B6' },
  { key: 'recherche_lancee', label: 'Recherche lancée', color: '#0F9F8A' },
  { key: 'signe',            label: 'Signé',            color: '#00A35A' },
];

const DB_COUNTRIES = {
  FR: 'France', BE: 'Belgique', CH: 'Suisse', ES: 'Espagne', UK: 'Royaume-Uni', DE: 'Allemagne',
  IT: 'Italie', LU: 'Luxembourg', NL: 'Pays-Bas', PT: 'Portugal', US: 'États-Unis / Canada',
  TH: 'Thaïlande', AE: 'Émirats', AU: 'Australie', XX: 'Autre',
};

const dbEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const Dashboard = {
  clients: [], properties: [], finance: [],
  _notes: { tasks: [], notes: '' },
  _viewDate: new Date().toISOString().slice(0, 10),
  _ctxIdx: null,
  _lastSeen: null,
  _weeks: [],
  _listenersBound: false,

  _today() { return new Date().toISOString().slice(0, 10); },
  isToday() { return this._viewDate === this._today(); },

  async init() {
    this._viewDate = this._today();
    this._lastSeen = localStorage.getItem('crm_last_seen') || null;
    document.getElementById('content').innerHTML = '<p class="spinner">Loading…</p>';
    try {
      const [clients, properties, finance, notes] = await Promise.all([
        api.get('/clients?archived=0'),
        api.get('/properties?archived=0'),
        api.get('/finance').catch(() => []),
        api.get(`/notes?date=${this._viewDate}`).catch(() => ({ tasks: [], notes: '' })),
      ]);
      this.clients    = clients.map(c => ({ ...c, move_in_date: this._isoDate(c.move_in_date) }));
      this.properties = properties;
      this.finance    = finance;
      this._notes     = { tasks: notes.tasks || [], notes: notes.notes || '' };
    } catch (err) { Toast.show('Erreur chargement dashboard', 'error'); return; }
    this.render();
  },

  // ── Notes / checklist ─────────────────────────────────────────────────────
  async _syncNotes() {
    try { await api.put(`/notes?date=${this._viewDate}`, { tasks: this._notes.tasks, notes: this._notes.notes }); }
    catch { Toast.show('Erreur sauvegarde notes', 'error'); }
  },

  async _loadNotes(date) {
    const n = await api.get(`/notes?date=${date}`).catch(() => ({ tasks: [], notes: '' }));
    this._notes = { tasks: n.tasks || [], notes: n.notes || '' };
  },

  async prevDay() {
    const d = new Date(this._viewDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    this._viewDate = d.toISOString().slice(0, 10);
    await this._loadNotes(this._viewDate);
    this._renderNotes();
  },

  async nextDay() {
    const d = new Date(this._viewDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const next = d.toISOString().slice(0, 10);
    if (next > this._today()) return;
    this._viewDate = next;
    await this._loadNotes(this._viewDate);
    this._renderNotes();
  },

  _dateLabelFR() {
    const today = this._today();
    const d1 = new Date(today + 'T12:00:00'); d1.setDate(d1.getDate() - 1);
    const d2 = new Date(today + 'T12:00:00'); d2.setDate(d2.getDate() - 2);
    if (this._viewDate === today) return "Aujourd'hui";
    if (this._viewDate === d1.toISOString().slice(0, 10)) return 'Hier';
    if (this._viewDate === d2.toISOString().slice(0, 10)) return 'Avant-hier';
    return new Date(this._viewDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  },

  _showCtx(e, i) {
    e.preventDefault();
    this._ctxIdx = i;
    const menu = document.getElementById('task-ctx-menu');
    if (!menu) return;
    menu.style.display = 'block';
    menu.style.left = e.clientX + 'px';
    menu.style.top  = e.clientY + 'px';
    requestAnimationFrame(() => {
      const r = menu.getBoundingClientRect();
      if (r.right  > window.innerWidth)  menu.style.left = (e.clientX - r.width)  + 'px';
      if (r.bottom > window.innerHeight) menu.style.top  = (e.clientY - r.height) + 'px';
    });
  },
  _hideCtx() {
    const m = document.getElementById('task-ctx-menu');
    if (m) m.style.display = 'none';
    this._ctxIdx = null;
  },

  async carryForward() {
    const i = this._ctxIdx;
    this._hideCtx();
    if (i === null || !this._notes.tasks[i]) return;
    const taskText = this._notes.tasks[i].text;
    const today = this._today();
    const todayData = await api.get(`/notes?date=${today}`).catch(() => ({ tasks: [], notes: '' }));
    const todayTasks = todayData.tasks || [];
    if (!todayTasks.find(t => t.text === taskText)) todayTasks.push({ text: taskText, done: false });
    await api.put(`/notes?date=${today}`, { tasks: todayTasks, notes: todayData.notes || '' });
    Toast.show("Tâche envoyée à aujourd'hui ✓");
    if (this.isToday()) { this._notes.tasks = todayTasks; this._renderNotes(); }
  },

  async addTask() {
    if (!this.isToday()) return;
    const inp = document.getElementById('dash-task-input');
    const txt = inp?.value.trim();
    if (!txt) return;
    this._notes.tasks.push({ text: txt, done: false });
    inp.value = '';
    await this._syncNotes();
    this._renderNotes();
    document.getElementById('dash-task-input')?.focus();
  },
  async toggleTask(i) {
    if (!this._notes.tasks[i]) return;
    this._notes.tasks[i].done = !this._notes.tasks[i].done;
    await this._syncNotes();
    this._renderNotes();
  },
  async deleteTask(i) {
    if (!this.isToday()) return;
    this._notes.tasks.splice(i, 1);
    await this._syncNotes();
    this._renderNotes();
  },
  async saveNoteText() {
    const el = document.getElementById('dash-notes-text');
    if (!el) return;
    this._notes.notes = el.value;
    await this._syncNotes();
  },
  async clearDone() {
    if (!this.isToday()) return;
    this._notes.tasks = this._notes.tasks.filter(t => !t.done);
    await this._syncNotes();
    this._renderNotes();
  },

  _renderNotes() {
    const el = document.getElementById('dash-notes-block');
    if (!el) return;
    el.innerHTML = this._notesHTML();
    this._bindNotes();
  },

  _bindNotes() {
    const ta = document.getElementById('dash-notes-text');
    if (ta) ta.addEventListener('blur', () => this.saveNoteText());
    const inp = document.getElementById('dash-task-input');
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') this.addTask(); });
  },

  _notesHTML() {
    const tasks   = this._notes.tasks;
    const done    = tasks.filter(t => t.done).length;
    const pct     = tasks.length ? done / tasks.length * 100 : 0;
    const atToday = this.isToday();

    const taskList = tasks.length
      ? `<div class="db-tasks">
          ${tasks.map((t, i) => `
            <label class="db-task${t.done ? ' done' : ''}" ${atToday ? '' : `oncontextmenu="Dashboard._showCtx(event,${i})"`}>
              <input type="checkbox" ${t.done ? 'checked' : ''} onchange="Dashboard.toggleTask(${i})">
              <span class="db-task-box"><i class=ico-check-square></i></span>
              <span class="db-task-txt">${dbEsc(t.text)}</span>
              ${atToday ? `<button class="fin-icon-btn" onclick="event.preventDefault();Dashboard.deleteTask(${i})" title="Supprimer">${FIN_ICONS.trash}</button>` : ''}
            </label>`).join('')}
        </div>`
      : `<p class="db-empty">${atToday ? 'Aucune tâche pour le moment.' : 'Aucune tâche ce jour-là.'}</p>`;

    return `
      <div class="db-notes-nav">
        <button class="fin-icon-btn" onclick="Dashboard.prevDay()" title="Jour précédent">‹</button>
        <span class="db-notes-day${atToday ? ' today' : ''}">${this._dateLabelFR()}</span>
        <button class="fin-icon-btn" onclick="Dashboard.nextDay()" ${atToday ? 'disabled' : ''} title="Jour suivant">›</button>
      </div>
      ${tasks.length ? `
        <div class="db-notes-progress">
          ${Finance._segments(pct, { n: 20, delay: 100 })}
          <span>${done} / ${tasks.length}</span>
          ${done && atToday ? `<button class="db-link" onclick="Dashboard.clearDone()">Effacer terminées</button>` : ''}
        </div>` : ''}
      ${taskList}
      ${atToday ? `
        <div class="db-task-add">
          <input id="dash-task-input" type="text" placeholder="Ajouter une tâche…">
          <button class="fin-ctl fin-ctl-primary" onclick="Dashboard.addTask()" aria-label="Ajouter">${FIN_ICONS.plus}</button>
        </div>` : `<p class="db-hint">Clic droit sur une tâche pour l'envoyer à aujourd'hui</p>`}
      <div class="db-notes-free">
        <span class="fin-eyebrow">Notes libres</span>
        <textarea id="dash-notes-text" placeholder="Notes, idées, rappels…">${dbEsc(this._notes.notes)}</textarea>
      </div>`;
  },

  greeting() {
    const h = new Date().getHours();
    if (h < 12) return t('dash_morning');
    if (h < 18) return t('dash_afternoon');
    return t('dash_evening');
  },

  // ── Data helpers ─────────────────────────────────────────────────────────
  // move_in_date arrives either as "YYYY-MM-DD" or as a Date.toString() value
  _isoDate(v) {
    if (!v) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return String(v).slice(0, 10);
    const d = new Date(v);
    if (isNaN(d)) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },
  _rate() { return parseFloat(localStorage.getItem('eur_rate') || '37'); },
  _toTHB(tx) { return tx.currency === 'EUR' ? Number(tx.amount) * this._rate() : Number(tx.amount); },
  _ym(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; },
  _daysTo(date) {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.round((new Date(date + 'T00:00:00') - now) / 86400000);
  },
  _months(duration) {
    const s = String(duration || '').toLowerCase();
    const y = s.match(/(\d+(?:[.,]\d+)?)\s*(an|ans|year)/);
    if (y) return parseFloat(y[1].replace(',', '.')) * 12;
    const m = s.match(/(\d+)\s*(mois|month)/);
    if (m) return Number(m[1]);
    return 0;
  },
  _commission(c) {
    const eur = Number(c.budget_eur) || (Number(c.budget_max) || 0) / this._rate();
    return eur * this._months(c.duration) / 12 * 0.5;
  },
  _country(num) {
    let d = String(num || '').replace(/\D/g, '');
    if (!d) return null;
    if (d.startsWith('00')) d = d.slice(2);
    if (d.length === 10 && d.startsWith('0')) return 'FR';
    if (d.length === 9 && /^[67]/.test(d)) return 'FR';
    const codes = [['352', 'LU'], ['351', 'PT'], ['971', 'AE'], ['33', 'FR'], ['32', 'BE'], ['41', 'CH'], ['34', 'ES'],
      ['44', 'UK'], ['49', 'DE'], ['39', 'IT'], ['31', 'NL'], ['66', 'TH'], ['61', 'AU'], ['1', 'US']];
    const hit = codes.find(([p]) => d.startsWith(p));
    return hit ? hit[1] : 'XX';
  },
  _stage(c) { return DB_STAGES.find(s => s.key === c.suivi_status) || DB_STAGES[0]; },

  _weeksAhead(n) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return Array.from({ length: n }, (_, i) => {
      const from = new Date(start); from.setDate(start.getDate() + i * 7);
      const to = new Date(from); to.setDate(from.getDate() + 6);
      const list = this.clients
        .filter(c => c.move_in_date && c.move_in_date >= iso(from) && c.move_in_date <= iso(to))
        .sort((a, b) => a.move_in_date.localeCompare(b.move_in_date));
      return { list, label: from.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '') };
    });
  },

  _arrivalBarsHTML() {
    const SEG = 14;
    const max = Math.max(...this._weeks.map(w => w.list.length), 1);
    return this._weeks.map((w, i) => {
      const total = w.list.length;
      const filled = total ? Math.max(1, Math.round(total / max * SEG)) : 0;
      const colors = [];
      let cum = 0;
      DB_STAGES.forEach(st => {
        cum += w.list.filter(c => this._stage(c).key === st.key).length;
        const end = total ? Math.round(cum / total * filled) : 0;
        while (colors.length < end) colors.push(st.color);
      });
      let segs = '';
      for (let s = 0; s < SEG; s++) {
        segs += s < filled
          ? `<span class="on" style="background:${colors[s] || DB_STAGES[0].color};--d:${150 + i * 55 + s * 26}ms"></span>`
          : '<span></span>';
      }
      return `
        <button type="button" class="fin-bar${i === 0 ? ' sel' : ''}" onmouseenter="Dashboard.hoverWeek(${i})" onfocus="Dashboard.hoverWeek(${i})"
          onclick="Router.navigate('calendar')" aria-label="Semaine du ${w.label} : ${total} arrivées">
          <span class="fin-bar-col">${segs}</span>
          <span class="fin-bar-lbl">${w.label}</span>
        </button>`;
    }).join('');
  },

  hoverWeek(i) {
    const tot = document.querySelector('#db-arr-total .fin-count');
    const cap = document.getElementById('db-arr-cap');
    if (!tot || !cap) return;
    tot._stop = true;
    if (i === null) {
      tot.textContent = this._weeks.reduce((s, w) => s + w.list.length, 0);
      cap.textContent = 'clients attendus sur les 12 prochaines semaines';
      return;
    }
    const w = this._weeks[i];
    tot.textContent = w.list.length;
    const names = w.list.slice(0, 4).map(c => c.name).join(', ');
    cap.textContent = `semaine du ${w.label}${names ? ' · ' + names + (w.list.length > 4 ? ` +${w.list.length - 4}` : '') : ''}`;
  },

  // ── Render ────────────────────────────────────────────────────────────────
  render() {
    const now    = new Date();
    const ym     = this._ym(now);
    const prevYm = this._ym(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const sum    = list => list.reduce((s, tx) => s + this._toTHB(tx), 0);
    const month  = sum(this.finance.filter(tx => tx.date?.startsWith(ym)));
    const prev   = sum(this.finance.filter(tx => tx.date?.startsWith(prevYm)));
    const target = 170000;
    const spark  = Array.from({ length: 12 }, (_, i) => {
      const k = this._ym(new Date(now.getFullYear(), now.getMonth() - 11 + i, 1));
      return sum(this.finance.filter(tx => tx.date?.startsWith(k)));
    });

    const active    = this.clients.filter(c => ['en_closing', 'en_attente', 'recherche_lancee'].includes(c.suivi_status));
    const weekAgo   = new Date(now); weekAgo.setDate(now.getDate() - 7);
    const newWeek   = this.clients.filter(c => c.created_at && new Date(c.created_at) >= weekAgo).length;
    const open      = this.clients.filter(c => c.suivi_status !== 'signe' && c.move_in_date);
    const soon      = open.filter(c => { const d = this._daysTo(c.move_in_date); return d >= 0 && d <= 30; });
    const thisWeek  = soon.filter(c => this._daysTo(c.move_in_date) <= 7).length;
    const overdue   = open.filter(c => { const d = this._daysTo(c.move_in_date); return d < 0 && d >= -30; });
    const potential = active.reduce((s, c) => s + this._commission(c), 0);
    const closing   = this.clients.filter(c => c.suivi_status === 'en_closing').reduce((s, c) => s + this._commission(c), 0);

    this._weeks = this._weeksAhead(12);
    const arrivals = this._weeks.reduce((s, w) => s + w.list.length, 0);

    const upcoming = open
      .filter(c => { const d = this._daysTo(c.move_in_date); return d >= 0 && d <= 60; })
      .sort((a, b) => a.move_in_date.localeCompare(b.move_in_date));
    const late = [...overdue].sort((a, b) => b.move_in_date.localeCompare(a.move_in_date));
    const toCall = [...upcoming, ...late].slice(0, 6);

    const stageRows = DB_STAGES.map(st => {
      const list = this.clients.filter(c => c.suivi_status === st.key);
      return { ...st, count: list.length, comm: list.reduce((s, c) => s + this._commission(c), 0) };
    }).filter(s => s.count || s.key !== 'en_attente');
    const stageMax = Math.max(...stageRows.map(s => s.count), 1);

    const origins = {};
    this.clients.forEach(c => { const k = this._country(c.whatsapp); if (k) origins[k] = (origins[k] || 0) + 1; });
    const originRows  = Object.entries(origins).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const originTotal = Object.values(origins).reduce((s, v) => s + v, 0) || 1;

    const recent = [...this.finance].filter(tx => tx.date).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

    let since = '';
    if (this._lastSeen) {
      const ls = new Date(this._lastSeen);
      const newC = this.clients.filter(c => c.created_at && new Date(c.created_at) > ls).length;
      const newF = this.finance.filter(tx => tx.created_at && new Date(tx.created_at) > ls).length;
      const parts = [];
      if (newC) parts.push(`${newC} nouvelle${newC > 1 ? 's' : ''} demande${newC > 1 ? 's' : ''}`);
      if (newF) parts.push(`${newF} transaction${newF > 1 ? 's' : ''}`);
      if (parts.length) since = `<span class="db-since"><i class=ico-bell></i>Depuis ta dernière visite : ${parts.join(' · ')}</span>`;
    }
    localStorage.setItem('crm_last_seen', now.toISOString());

    const thb = v => `${Math.round(v).toLocaleString('fr-FR')} ฿`;
    const eur = v => `${Math.round(v).toLocaleString('fr-FR')} €`;
    const count = (v, unit = '') => `<span class="fin-count" data-v="${Math.round(v)}">${Math.round(v).toLocaleString('fr-FR')}</span>${unit ? `<span class="fin-cur">${unit}</span>` : ''}`;
    const kpi = (i, icon, label, tag, value, caption, extra = '') => `
      <article class="fin-kpi fin-in" style="--i:${i}">
        <div class="fin-kpi-top"><span class="fin-caption">${icon}${label}</span>${tag}</div>
        <div class="fin-kpi-row"><span class="fin-kpi-num">${value}</span>${extra}</div>
        <span class="fin-caption fin-subtle">${caption}</span>
      </article>`;
    const pct = Math.round(month / target * 100);

    document.getElementById('content').innerHTML = `
      <div class="db-head fin-in">
        <div>
          <p class="fin-eyebrow db-date">${now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h2 class="db-hello">${this.greeting()}, Timéo</h2>
        </div>
        <div class="db-head-right">${since}${Privacy.btn()}</div>
      </div>

      <div class="fin-kpis">
        ${kpi(1, FIN_ICONS.bars, 'Revenu du mois',
          Finance._tag(prev ? (month - prev) / prev * 100 : null),
          count(month, '฿'),
          `Objectif ${thb(target)} · ${pct} %`,
          Finance._spark(spark))}
        ${kpi(2, '<i class=ico-users></i>', 'Pipeline actif',
          newWeek ? `<span class="fin-tag fin-tag-up">+${newWeek} cette semaine</span>` : '',
          count(active.length),
          `${this.clients.filter(c => c.suivi_status === 'nouveau').length} nouveaux à traiter`)}
        ${kpi(3, '<i class=ico-calendar></i>', 'Arrivées sous 30 j',
          overdue.length ? `<span class="fin-tag fin-tag-down">${overdue.length} en retard</span>` : '',
          count(soon.length),
          `dont ${thisWeek} cette semaine`)}
        ${kpi(4, FIN_ICONS.commission, 'Commission potentielle',
          `<span class="fin-tag fin-tag-neutral">50 % co-agent</span>`,
          count(potential, '€'),
          `dont ${eur(closing)} en closing`)}
      </div>

      <div class="fin-grid-2">
        <section class="fin-panel fin-in" style="--i:5">
          <div class="fin-panel-head">
            <h3 class="fin-eyebrow">Arrivées à venir</h3>
            <button class="fin-ctl" onclick="Router.navigate('calendar')"><i class=ico-calendar></i>Calendrier</button>
          </div>
          <div class="fin-rev-head">
            <div>
              <div class="fin-big" id="db-arr-total">${count(arrivals)}</div>
              <div class="fin-caption fin-soft" id="db-arr-cap">clients attendus sur les 12 prochaines semaines</div>
            </div>
            <div class="fin-legend">${DB_STAGES.filter(s => s.key !== 'en_attente').map(s => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join('')}</div>
          </div>
          <div class="fin-bars db-arr-bars" onmouseleave="Dashboard.hoverWeek(null)">${this._arrivalBarsHTML()}</div>
        </section>

        <section class="fin-panel fin-in" style="--i:6">
          <div class="fin-panel-head">
            <h3 class="fin-eyebrow">Pipeline</h3>
            <button class="fin-ctl fin-ctl-ghost" onclick="Router.navigate('clients')">Voir tout →</button>
          </div>
          <div class="fin-goals">
            ${stageRows.map((s, i) => `
              <button class="db-stage" onclick="Router.navigate('clients')">
                <div class="fin-goal-top">
                  <span class="db-dot" style="background:${s.color}"></span>
                  <span class="fin-goal-name">${s.label}</span>
                  <span class="fin-goal-val">${s.count}</span>
                </div>
                ${Finance._segments(s.count / stageMax * 100, { n: 24, color: s.color, delay: 300 + i * 110 })}
                <div class="fin-goal-cap"><span>${Math.round(s.count / (this.clients.length || 1) * 100)} % des clients</span><span>${s.comm ? '≈ ' + eur(s.comm) : '—'}</span></div>
              </button>`).join('')}
          </div>
        </section>
      </div>

      <div class="fin-grid-2">
        <section class="fin-panel fin-in" style="--i:7">
          <div class="fin-panel-head">
            <h3 class="fin-eyebrow">À appeler</h3>
            <span class="fin-caption fin-subtle">arrivées les plus proches</span>
          </div>
          <div class="db-rows">
            ${toCall.length ? toCall.map((c, i) => {
              const d = this._daysTo(c.move_in_date);
              const st = this._stage(c);
              const urgency = d < 0 ? 100 : Math.max(8, 100 - d / 60 * 100);
              const tone = d < 0 ? 'var(--red)' : d <= 14 ? '#E5484D' : d <= 30 ? '#EA8A1A' : '#E5B312';
              const phone = String(c.whatsapp || '').replace(/\D/g, '');
              return `
                <div class="db-row">
                  <div class="db-row-main">
                    <span class="db-row-name">${dbEsc(c.name)}</span>
                    <span class="db-row-meta"><span class="db-pill" style="--c:${st.color}">${st.label}</span>${c.budget_max ? thb(c.budget_max) : ''}</span>
                  </div>
                  <div class="db-row-urg">
                    ${Finance._segments(urgency, { n: 12, color: tone, delay: 500 + i * 70 })}
                    <span style="color:${tone}">${d < 0 ? `J+${-d}` : d === 0 ? "aujourd'hui" : `${d} j`}</span>
                  </div>
                  <div class="db-row-actions">
                    ${phone ? `<a class="fin-icon-btn" href="https://wa.me/${phone}" target="_blank" rel="noopener" title="WhatsApp"><i class=ico-message></i></a>` : ''}
                    <button class="fin-icon-btn" onclick="Router.navigate('clients')" title="Ouvrir le pipeline">→</button>
                  </div>
                </div>`;
            }).join('') : '<p class="db-empty">Aucune arrivée dans les 60 prochains jours.</p>'}
          </div>
        </section>

        <section class="fin-panel fin-in" style="--i:8">
          <div class="fin-panel-head">
            <h3 class="fin-eyebrow">Sur le feu</h3>
          </div>
          <div id="dash-notes-block">${this._notesHTML()}</div>
        </section>
      </div>

      <div class="fin-grid-2">
        <section class="fin-panel fin-in" style="--i:9">
          <div class="fin-panel-head">
            <h3 class="fin-eyebrow">Transactions récentes</h3>
            <button class="fin-ctl fin-ctl-ghost" onclick="Router.navigate('finance')">Finance →</button>
          </div>
          <div class="db-rows">
            ${recent.length ? recent.map(tx => `
              <div class="db-row">
                <span class="fin-tx-logo">${bankLogo(tx.account || '')}</span>
                <div class="db-row-main">
                  <span class="db-row-name">${dbEsc(tx.notes || tx.account)}</span>
                  <span class="db-row-meta"><span class="fin-type"><i style="background:${FIN_CAT_COLORS[tx.type] || FIN_CAT_COLORS.autre}"></i>${dbEsc(tx.type)}</span>${new Date(tx.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                </div>
                <span class="db-amount">+${Number(tx.amount).toLocaleString('fr-FR')} ${tx.currency === 'EUR' ? '€' : '฿'}</span>
              </div>`).join('') : '<p class="db-empty">Aucune transaction.</p>'}
          </div>
        </section>

        <section class="fin-panel fin-in" style="--i:10">
          <div class="fin-panel-head">
            <h3 class="fin-eyebrow">Origine des clients</h3>
            <span class="fin-caption fin-subtle">d'après l'indicatif WhatsApp</span>
          </div>
          <div class="fin-goals">
            ${originRows.map(([k, n], i) => `
              <div class="fin-goal">
                <div class="fin-goal-top">
                  <span class="db-cc">${k === 'XX' ? '··' : k}</span>
                  <span class="fin-goal-name">${DB_COUNTRIES[k] || k}</span>
                  <span class="fin-goal-val">${n}</span>
                </div>
                ${Finance._segments(n / originTotal * 100, { n: 24, delay: 600 + i * 100 })}
              </div>`).join('')}
          </div>
        </section>
      </div>

      <div id="task-ctx-menu" class="db-ctx">
        <button onclick="Dashboard.carryForward()">→ Envoyer à aujourd'hui</button>
      </div>`;

    this._bindNotes();
    Finance.afterRender();

    if (!this._listenersBound) {
      document.addEventListener('click', () => this._hideCtx());
      document.addEventListener('keydown', e => { if (e.key === 'Escape') this._hideCtx(); });
      this._listenersBound = true;
    }
  },
};
