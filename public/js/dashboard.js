const Dashboard = {
  clients: [], properties: [], finance: [], charts: {},
  _notes: { tasks: [], notes: '' },
  _viewDate: new Date().toISOString().slice(0, 10),
  _ctxIdx: null,
  _lastSeen: null,

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
      this.clients    = clients;
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
    const yest = d1.toISOString().slice(0, 10);
    const avt  = d2.toISOString().slice(0, 10);
    if (this._viewDate === today) return "Aujourd'hui";
    if (this._viewDate === yest)  return 'Hier';
    if (this._viewDate === avt)   return 'Avant-hier';
    return new Date(this._viewDate + 'T12:00:00')
      .toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
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
    const ta = document.getElementById('dash-notes-text');
    if (ta) ta.addEventListener('blur', () => this.saveNoteText());
    const inp = document.getElementById('dash-task-input');
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') this.addTask(); });
  },

  _notesHTML() {
    const tasks   = this._notes.tasks;
    const done    = tasks.filter(t => t.done).length;
    const pct     = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    const past    = !this.isToday();
    const label   = this._dateLabelFR();
    const atToday = this.isToday();

    // Navigation header
    const nav = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <button onclick="Dashboard.prevDay()" style="background:none;border:0.5px solid var(--border);border-radius:6px;padding:3px 9px;font-size:14px;cursor:pointer;color:var(--text-2)" title="Jour précédent">‹</button>
        <span style="font-size:12px;font-weight:600;color:${atToday ? '#0F766E' : 'var(--text-2)'};text-align:center">
          ${atToday ? '🔥 ' : '📅 '}${label}
        </span>
        <button onclick="Dashboard.nextDay()" ${atToday ? 'disabled' : ''} style="background:none;border:0.5px solid var(--border);border-radius:6px;padding:3px 9px;font-size:14px;cursor:${atToday ? 'default' : 'pointer'};color:${atToday ? 'var(--border)' : 'var(--text-2)'};" title="Jour suivant">›</button>
      </div>`;

    const progressBar = tasks.length ? `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="flex:1;background:var(--bg-2);border-radius:4px;height:5px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:#0F766E;border-radius:4px;transition:width .3s"></div>
        </div>
        <span style="font-size:11px;color:var(--text-2);flex-shrink:0">${done}/${tasks.length}</span>
        ${done > 0 && atToday ? `<button onclick="Dashboard.clearDone()" style="font-size:10px;color:var(--text-3);background:none;border:none;cursor:pointer;padding:0;text-decoration:underline">Effacer terminées</button>` : ''}
      </div>` : '';

    const taskList = tasks.length
      ? `<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px">
          ${tasks.map((t, i) => `
            <div oncontextmenu="${past ? `Dashboard._showCtx(event,${i})` : 'false'}"
              style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg-2);border-radius:7px;cursor:${past ? 'context-menu' : 'default'}">
              <input type="checkbox" ${t.done ? 'checked' : ''} onchange="Dashboard.toggleTask(${i})"
                style="width:15px;height:15px;cursor:pointer;accent-color:#0F766E;flex-shrink:0">
              <span style="flex:1;font-size:13px;color:${t.done ? 'var(--text-3)' : 'var(--text)'};text-decoration:${t.done ? 'line-through' : 'none'}">${t.text}</span>
              ${atToday ? `<button onclick="Dashboard.deleteTask(${i})" style="background:none;border:none;cursor:pointer;color:var(--text-3);font-size:13px;padding:0;opacity:.5">✕</button>` : ''}
            </div>`).join('')}
        </div>`
      : `<p style="font-size:12px;color:var(--text-3);text-align:center;padding:8px 0 12px">${past ? 'Aucune tâche ce jour-là' : 'Aucune tâche — ajoute-en une ci-dessous 👇'}</p>`;

    const addRow = atToday ? `
      <div style="display:flex;gap:6px;margin-bottom:12px">
        <input id="dash-task-input" type="text" placeholder="Ajouter une tâche…"
          style="flex:1;padding:7px 10px;font-size:13px;border:0.5px solid var(--border);border-radius:7px;background:var(--bg);color:var(--text)">
        <button onclick="Dashboard.addTask()" style="padding:7px 12px;background:#0F766E;color:#fff;border:none;border-radius:7px;font-size:13px;cursor:pointer;font-weight:500">+</button>
      </div>` : `
      <div style="margin-bottom:12px;padding:6px 10px;background:var(--bg-2);border-radius:7px;font-size:11px;color:var(--text-3);text-align:center">
        Clic droit sur une tâche pour l'envoyer à aujourd'hui
      </div>`;

    return `
      ${nav}
      ${progressBar}
      ${taskList}
      ${addRow}
      <div style="border-top:0.5px solid var(--border);padding-top:10px">
        <div style="font-size:10px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">📝 Notes libres</div>
        <textarea id="dash-notes-text" placeholder="Notes, idées, rappels…"
          style="width:100%;min-height:72px;padding:8px 10px;font-size:13px;border:0.5px solid var(--border);border-radius:7px;background:var(--bg);color:var(--text);resize:vertical;line-height:1.5">${this._notes.notes}</textarea>
        <div style="font-size:10px;color:var(--text-3);margin-top:3px">Sauvegardé automatiquement</div>
      </div>`;
  },

  greeting() {
    const h = new Date().getHours();
    if (h < 12) return t('dash_morning');
    if (h < 18) return t('dash_afternoon');
    return t('dash_evening');
  },

  kpis() {
    const now = new Date();
    const eurRate = parseFloat(localStorage.getItem('eur_rate') || '37');

    // Week: Monday → today
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const lastMonday = new Date(monday); lastMonday.setDate(monday.getDate() - 7);
    const lastSunday = new Date(monday); lastSunday.setDate(monday.getDate() - 1);

    const inRange  = (t, from, to) => { const d = new Date(t.date); return d >= from && d <= to; };
    const toTHB    = t => t.currency === 'EUR' ? Math.round(Number(t.amount) * eurRate) : Number(t.amount);
    const revenueWeek     = this.finance.filter(t => t.date && inRange(t, monday, now)).reduce((s,t) => s + toTHB(t), 0);
    const revenueLastWeek = this.finance.filter(t => t.date && inRange(t, lastMonday, lastSunday)).reduce((s,t) => s + toTHB(t), 0);

    const activeClients  = this.clients.filter(c => ['Onboarding','Recherche active'].includes(c.status)).length;
    const availableProps = this.properties.filter(p => p.status === 'Disponible').length;
    const urgentMoveIns  = this.clients.filter(c => {
      if (!c.move_in_date) return false;
      const d = Math.ceil((new Date(c.move_in_date) - now) / 86400000);
      return d >= 0 && d <= 30;
    }).length;

    return { activeClients, availableProps, revenueWeek, revenueLastWeek, urgentMoveIns, eurRate };
  },

  pipelineData() {
    const cols = [
      { key: 'À contacter',      label: t('col_prospect'), color: '#D97706' },
      { key: 'Contacté',         label: t('col_toclose'),  color: '#2563EB' },
      { key: 'Property to Find', label: t('col_search'),   color: '#16A34A' },
      { key: 'Urgent Sending',   label: t('col_proposal'), color: '#7C3AED' },
      { key: 'Rappeler',         label: t('col_visit'),    color: '#DC2626' },
    ];
    return cols.map(col => ({
      ...col,
      count: this.clients.filter(c => {
        const eff = (c.research_fees_paid && c.status === 'Recherche active')
          ? 'Property to Find' : (c.contact_status || 'À contacter');
        return eff === col.key;
      }).length
    }));
  },

  // Daily revenue for current month (used in dashboard chart)
  revenueByDay() {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const pad = n => String(n).padStart(2, '0');
    const prefix = `${year}-${pad(month + 1)}`;

    const eurRate = parseFloat(localStorage.getItem('eur_rate') || '37');
    const toTHB   = t => t.currency === 'EUR' ? Math.round(Number(t.amount) * eurRate) : Number(t.amount);
    const days = {};
    for (let d = 1; d <= daysInMonth; d++) days[`${prefix}-${pad(d)}`] = 0;
    this.finance.forEach(t => { if (t.date in days) days[t.date] += toTHB(t); });

    return {
      labels: Object.keys(days).map(k => parseInt(k.split('-')[2])), // day number 1–31
      values: Object.values(days),
      monthName: now.toLocaleDateString('en-US', { month: 'long' })
    };
  },

  zoneData() {
    const SKIP = /non\s*pr[eé]cis[eé]|je ne sais|pas encore|autre|unknown|n\/a|^-+$/i;
    const zones = {};
    this.clients.forEach(c => {
      if (!c.zones) return;
      c.zones.split(/[,/]/).forEach(z => {
        const zone = z.trim();
        if (zone && !SKIP.test(zone)) zones[zone] = (zones[zone]||0) + 1;
      });
    });
    const sorted = Object.entries(zones).sort((a,b) => b[1]-a[1]).slice(0,8);
    return { labels: sorted.map(([z])=>z), values: sorted.map(([,v])=>v) };
  },

  urgentClients() {
    const now = new Date();
    return this.clients.filter(c => {
      if (!c.move_in_date) return false;
      const d = Math.ceil((new Date(c.move_in_date) - now) / 86400000);
      return d >= 0 && d <= 60;
    }).sort((a,b) => new Date(a.move_in_date) - new Date(b.move_in_date));
  },

  // ── Pipeline as HTML bars ────────────────────────────────────────────────
  pipelineHTML(data) {
    const max = Math.max(...data.map(d => d.count), 1);
    return `<div class="pipeline-stages">
      ${data.map(d => `
        <div class="pipeline-row">
          <span class="pipeline-lbl">${d.label}</span>
          <div class="pipeline-track">
            <div class="pipeline-fill" style="width:${d.count ? Math.max(d.count/max*100, 4) : 0}%;background:#FF6B00"></div>
          </div>
          <span class="pipeline-num">${d.count}</span>
        </div>`).join('')}
    </div>`;
  },

  // ── Render ────────────────────────────────────────────────────────────────
  render() {
    const kpis    = this.kpis();
    const urgent  = this.urgentClients();
    const now     = new Date();
    const eurRate = kpis.eurRate;

    const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const txMonth  = this.finance.filter(tr => tr.date?.startsWith(currentMonth));
    const monthTHB = txMonth.filter(tr => tr.currency !== 'EUR').reduce((s,tr) => s + Number(tr.amount), 0);
    const monthEUR = txMonth.filter(tr => tr.currency === 'EUR').reduce((s,tr) => s + Number(tr.amount), 0);
    const onbCount = txMonth.filter(tr => tr.type === 'onboarding').length;
    const visaCount= txMonth.filter(tr => tr.type === 'visa').length;
    const totalTHB = monthTHB + monthEUR * eurRate;
    const target   = 170000;
    const pct      = Math.min(Math.round(totalTHB / target * 100), 100);

    const prevMonth = (() => { const d = new Date(now.getFullYear(), now.getMonth()-1, 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; })();
    const prevTotal = this.finance.filter(tr => tr.date?.startsWith(prevMonth)).reduce((s,tr) => s + (tr.currency === 'EUR' ? Number(tr.amount)*eurRate : Number(tr.amount)), 0);
    const trendPct  = prevTotal > 0 ? Math.round((totalTHB - prevTotal) / prevTotal * 100) : null;
    const trendUp   = trendPct !== null && trendPct >= 0;

    const monthName = now.toLocaleDateString('fr-FR', { month:'long', year:'numeric' });
    const dateStr   = now.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });

    // Diff since last login
    let diffBanner = '';
    if (this._lastSeen) {
      const ls = new Date(this._lastSeen);
      const newC = this.clients.filter(c => c.created_at && new Date(c.created_at) > ls);
      const newF = this.finance.filter(t => t.created_at && new Date(t.created_at) > ls);
      const parts = [];
      if (newC.length) parts.push(`<strong>${newC.length}</strong> nouvelle${newC.length>1?'s':''} demande${newC.length>1?'s':''}`);
      if (newF.length) parts.push(`<strong>${newF.length}</strong> transaction${newF.length>1?'s':''}`);
      if (parts.length) {
        const sinceLabel = ls.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' });
        diffBanner = `<div style="background:#FEF3C7;border:0.5px solid var(--accent);border-radius:8px;padding:10px 14px;margin-bottom:16px;display:flex;align-items:center;gap:10px"><span>🔔</span><div style="font-size:13px">Depuis ta dernière connexion : ${parts.join(' et ')}. <span style="color:var(--text-2)">${sinceLabel}</span></div></div>`;
      }
    }
    localStorage.setItem('crm_last_seen', new Date().toISOString());

    // Urgent clients (move-in within 60 days)
    const urgColors = ['#ef4444','#ef4444','#f97316','#f97316','#eab308'];
    const urgentList = [...urgent].slice(0, 5);

    // Recent transactions
    const recent = [...this.finance].filter(tr => tr.date).sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5);
    const typePill = { commission:'#dcfce7|#166534', onboarding:'#dbeafe|#1e40af', visa:'#f3e8ff|#6b21a8', autre:'#f1f0eb|#7a7670' };

    document.getElementById('content').innerHTML = `
      <!-- Greeting -->
      <div style="margin-bottom:20px">
        <p style="font-size:12px;color:var(--text-2);text-transform:capitalize">${dateStr}</p>
        <h2 style="font-size:22px;font-weight:700;letter-spacing:-.4px;margin-top:2px">${this.greeting()}, Timéo 👋</h2>
      </div>

      ${diffBanner}

      <!-- 2×2 grid -->
      <div class="db-grid">

        <!-- Panel 1 — Revenu mensuel -->
        <div class="db-panel">
          <div class="db-panel-title">Revenu ${monthName}</div>
          <div class="db-rev-main">${monthEUR > 0 ? monthEUR.toLocaleString('fr-FR') + ' €' : monthTHB.toLocaleString('fr-FR') + ' ฿'}</div>
          ${monthEUR > 0 && monthTHB > 0 ? `<div style="font-size:13px;color:var(--text-2);margin-top:2px">${monthTHB.toLocaleString('fr-FR')} ฿</div>` : ''}
          <div class="db-rev-target">Objectif : ${target.toLocaleString('fr-FR')} ฿ · ${pct}%${trendPct !== null ? ` <span style="color:${trendUp?'#2a9d5c':'#dc2626'};font-weight:600">${trendUp?'▲':'▼'} ${Math.abs(trendPct)}% vs mois préc.</span>` : ''}</div>
          <div class="db-rev-bar-track"><div class="db-rev-bar-fill" style="width:${pct}%"></div></div>
          <div class="db-kpi-row">
            <div class="db-kpi"><div class="db-kpi-lbl">Clients</div><div class="db-kpi-val">${this.clients.length}</div></div>
            <div class="db-kpi"><div class="db-kpi-lbl">Move-in 30j</div><div class="db-kpi-val" style="color:${kpis.urgentMoveIns>0?'#dc2626':'inherit'}">${kpis.urgentMoveIns}</div></div>
            <div class="db-kpi"><div class="db-kpi-lbl">Onboardings</div><div class="db-kpi-val">${onbCount}</div></div>
            <div class="db-kpi"><div class="db-kpi-lbl">Visas</div><div class="db-kpi-val">${visaCount}</div></div>
          </div>
        </div>

        <!-- Panel 2 — À appeler -->
        <div class="db-panel">
          <div class="db-panel-title">⚡ À appeler</div>
          ${urgentList.length ? urgentList.map((c,i) => {
            const daysLeft = Math.ceil((new Date(c.move_in_date) - now) / 86400000);
            const color = urgColors[i] || '#888';
            return `<div class="db-call-item">
              <div class="db-call-urg" style="background:${color}"></div>
              <div style="flex:1;min-width:0">
                <div class="db-call-name">${c.name}</div>
                <div class="db-call-meta">${c.suivi_status||'nouveau'} · arrive dans <span style="color:${color};font-weight:600">${daysLeft}j</span></div>
              </div>
              <button class="db-call-action" onclick="Router.navigate('clients')">→</button>
            </div>`;
          }).join('') : '<p style="font-size:13px;color:var(--text-3);padding:8px 0">Aucun move-in imminent</p>'}
        </div>

        <!-- Panel 3 — Transactions récentes -->
        <div class="db-panel">
          <div class="db-panel-title">Transactions récentes</div>
          ${recent.length ? recent.map(tr => {
            const [bg,fg] = (typePill[tr.type]||'#f1f0eb|#7a7670').split('|');
            const amt = tr.currency==='EUR'
              ? `+${Number(tr.amount).toLocaleString('fr-FR')} €`
              : `+${Number(tr.amount).toLocaleString('fr-FR')} ฿`;
            return `<div class="db-tx-item">
              <span class="db-tx-pill" style="background:${bg};color:${fg}">${(tr.type||'TXN').toUpperCase().slice(0,3)}</span>
              <span class="db-tx-name">${tr.notes||tr.account}</span>
              <span class="db-tx-amt">${amt}</span>
            </div>`;
          }).join('') : '<p style="font-size:13px;color:var(--text-3);padding:8px 0">Aucune transaction</p>'}
        </div>

        <!-- Panel 4 — Sur le feu (notes/tasks) -->
        <div class="db-panel">
          <div class="db-panel-title">🔥 Sur le feu</div>
          <div id="dash-notes-block">${this._notesHTML()}</div>
        </div>

      </div>

      <!-- Context menu -->
      <div id="task-ctx-menu" style="position:fixed;display:none;background:var(--surface);border:0.5px solid var(--border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:9999;min-width:200px;padding:4px">
        <button onclick="Dashboard.carryForward()" style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 14px;font-size:13px;color:var(--text);background:none;border:none;cursor:pointer;border-radius:7px;text-align:left" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='none'">
          <span>→</span> Envoyer à aujourd'hui
        </button>
      </div>`;

    // Pipeline bars animate
    setTimeout(() => {
      document.querySelectorAll('.pipeline-fill').forEach(el => {
        const w = el.style.width; el.style.width = '0';
        requestAnimationFrame(() => { el.style.transition = 'width .7s cubic-bezier(.4,0,.2,1)'; el.style.width = w; });
      });
    }, 50);

    // Bind notes interactions
    const ta = document.getElementById('dash-notes-text');
    if (ta) ta.addEventListener('blur', () => this.saveNoteText());
    const inp = document.getElementById('dash-task-input');
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') this.addTask(); });

    // Fermer le menu contextuel sur clic extérieur
    document.addEventListener('click', () => this._hideCtx(), { once: false });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this._hideCtx(); });
  },

  // ── Charts ────────────────────────────────────────────────────────────────
  drawRevenue(data) {
    if (this.charts.revenue) this.charts.revenue.destroy();
    const ctx = document.getElementById('chart-revenue');
    if (!ctx) return;
    this.charts.revenue = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          borderColor: '#FF6B00',
          borderWidth: 3,
          pointBackgroundColor: '#FF6B00',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.4,
          fill: true,
          backgroundColor: ctx2 => {
            const c = ctx2.chart, { ctx: c2, chartArea } = c;
            if (!chartArea) return 'transparent';
            const g = c2.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            g.addColorStop(0, 'rgba(255,107,0,.30)');
            g.addColorStop(1, 'rgba(255,107,0,0)');
            return g;
          }
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: {
          backgroundColor: '#1A1A1A', padding: 10, cornerRadius: 8,
          callbacks: { label: c => '  ' + Number(c.raw).toLocaleString('fr-FR') + ' ฿' }
        }},
        scales: {
          y: { beginAtZero: true, grid: { color: '#F0EDE8' },
               ticks: { color: '#9A9490', callback: v => v ? (v>=1000 ? (v/1000).toFixed(0)+'k' : v) + ' ฿' : '0' }},
          x: { ticks: { color: '#9A9490', font: { weight: '600' } }, grid: { display: false } }
        },
        animation: { duration: 1000, easing: 'easeOutQuart' }
      }
    });
  },

  drawZones(data) {
    if (this.charts.zones) this.charts.zones.destroy();
    const ctx = document.getElementById('chart-zones');
    if (!ctx) return;
    // 2-color family: orange spectrum + béton spectrum
    const colors = ['#FF6B00','#3D3D3D','#FF8C33','#5A5A5A','#FFAD66','#787878','#CC5500','#A0A0A0'];
    this.charts.zones = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          backgroundColor: colors.slice(0, data.labels.length),
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: { family: 'Inter', size: 12, weight: '600' },
              color: '#3A3630', padding: 14, boxWidth: 12, borderRadius: 3,
              generateLabels(chart) {
                const ds = chart.data.datasets[0];
                return chart.data.labels.map((lbl, i) => ({
                  text: `${lbl}  ·  ${ds.data[i]}`,
                  fillStyle: colors[i],
                  strokeStyle: colors[i],
                  lineWidth: 0, index: i, hidden: false,
                }));
              }
            }
          },
          tooltip: {
            backgroundColor: '#1A1A1A', padding: 10, cornerRadius: 8,
            callbacks: { label: c => `  ${c.label}: ${c.raw} client${c.raw !== 1 ? 's' : ''}` }
          }
        },
        animation: { duration: 1000, easing: 'easeOutQuart' }
      }
    });
  }
};
