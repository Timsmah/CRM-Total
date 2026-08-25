const Dashboard = {
  clients: [], properties: [], finance: [], charts: {},
  _notes: { tasks: [], notes: '' },

  async init() {
    document.getElementById('content').innerHTML = '<p class="spinner">Loading…</p>';
    try {
      const [clients, properties, finance, notes] = await Promise.all([
        api.get('/clients?archived=0'),
        api.get('/properties?archived=0'),
        api.get('/finance'),
        api.get('/notes').catch(() => ({ tasks: [], notes: '' })),
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
    try { await api.put('/notes', { tasks: this._notes.tasks, notes: this._notes.notes }); }
    catch { Toast.show('Erreur sauvegarde notes', 'error'); }
  },
  async addTask() {
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
    this._notes.tasks = this._notes.tasks.filter(t => !t.done);
    await this._syncNotes();
    this._renderNotes();
  },
  _renderNotes() {
    const tasks  = this._notes.tasks;
    const done   = tasks.filter(t => t.done).length;
    const pct    = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    const el     = document.getElementById('dash-notes-block');
    if (!el) return;
    el.innerHTML = this._notesHTML();
    // Re-bind textarea autosave
    const ta = document.getElementById('dash-notes-text');
    if (ta) { ta.addEventListener('blur', () => this.saveNoteText()); }
    // Re-bind enter on input
    const inp = document.getElementById('dash-task-input');
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') this.addTask(); });
  },
  _notesHTML() {
    const tasks = this._notes.tasks;
    const done  = tasks.filter(t => t.done).length;
    const pct   = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    const progressBar = tasks.length ? `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="flex:1;background:var(--bg-2);border-radius:4px;height:5px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:#0F766E;border-radius:4px;transition:width .3s"></div>
        </div>
        <span style="font-size:11px;color:var(--text-2);flex-shrink:0">${done}/${tasks.length}</span>
        ${done > 0 ? `<button onclick="Dashboard.clearDone()" style="font-size:10px;color:var(--text-3);background:none;border:none;cursor:pointer;padding:0;text-decoration:underline">Effacer terminées</button>` : ''}
      </div>` : '';
    const taskList = tasks.length ? `<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px">
      ${tasks.map((t,i) => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg-2);border-radius:7px;group">
          <input type="checkbox" ${t.done ? 'checked' : ''} onchange="Dashboard.toggleTask(${i})"
            style="width:15px;height:15px;cursor:pointer;accent-color:#0F766E;flex-shrink:0">
          <span style="flex:1;font-size:13px;color:${t.done ? 'var(--text-3)' : 'var(--text)'};text-decoration:${t.done ? 'line-through' : 'none'}">${t.text}</span>
          <button onclick="Dashboard.deleteTask(${i})" style="background:none;border:none;cursor:pointer;color:var(--text-3);font-size:13px;padding:0;opacity:.5;hover:opacity:1">✕</button>
        </div>`).join('')}
    </div>` : `<p style="font-size:12px;color:var(--text-3);text-align:center;padding:8px 0 12px">Aucune tâche — ajoute-en une ci-dessous 👇</p>`;
    return `
      ${progressBar}
      ${taskList}
      <div style="display:flex;gap:6px;margin-bottom:12px">
        <input id="dash-task-input" type="text" placeholder="Ajouter une tâche…"
          style="flex:1;padding:7px 10px;font-size:13px;border:0.5px solid var(--border);border-radius:7px;background:var(--bg);color:var(--text)">
        <button onclick="Dashboard.addTask()" style="padding:7px 12px;background:#0F766E;color:#fff;border:none;border-radius:7px;font-size:13px;cursor:pointer;font-weight:500">+</button>
      </div>
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
    const kpis     = this.kpis();
    const pipeline = this.pipelineData();
    const urgent   = this.urgentClients();
    const now      = new Date();
    const eurRate  = kpis.eurRate;

    // Revenus mois en cours
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const toTHB = tr => tr.currency === 'EUR' ? Math.round(Number(tr.amount) * eurRate) : Number(tr.amount);
    const txMonth   = this.finance.filter(tr => tr.date?.startsWith(currentMonth));
    const monthTHB  = txMonth.reduce((s,tr) => s + toTHB(tr), 0);
    const monthEUR  = Math.round(monthTHB / eurRate);
    const weekEUR   = Math.round(kpis.revenueWeek / eurRate);
    const onbCount  = txMonth.filter(tr => tr.type === 'onboarding').length;
    const visaCount = txMonth.filter(tr => tr.type === 'visa').length;

    // Trend vs mois précédent
    const prevMonth = (() => { const d = new Date(now.getFullYear(), now.getMonth()-1, 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; })();
    const prevTHB   = this.finance.filter(tr => tr.date?.startsWith(prevMonth)).reduce((s,tr) => s + toTHB(tr), 0);
    const trendPct  = prevTHB > 0 ? Math.round((monthTHB - prevTHB) / prevTHB * 100) : null;
    const trendUp   = trendPct !== null && trendPct >= 0;

    const monthName = now.toLocaleDateString('fr-FR', { month:'long', year:'numeric' });
    const dateStr   = now.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
    const activeClients = this.clients.filter(c => ['Onboarding','Recherche active'].includes(c.status)).length;

    document.getElementById('content').innerHTML = `

      <!-- ── Greeting ── -->
      <div class="dash-top" style="margin-bottom:16px">
        <div>
          <p class="dash-tagline" style="text-transform:capitalize">${dateStr}</p>
          <h2 class="dash-hello">${this.greeting()}, Timéo 👋</h2>
        </div>
      </div>

      <!-- ── Hero sombre — revenus du mois ── -->
      <div style="background:#1C2B3A;border-radius:14px;padding:18px 22px;margin-bottom:14px;color:#fff;display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <div style="font-size:10px;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px">Revenus — ${monthName}</div>
          <div style="font-size:28px;font-weight:700;letter-spacing:-.6px;line-height:1">${monthEUR.toLocaleString('fr-FR')} €</div>
          <div style="font-size:12px;color:rgba(255,255,255,.45);margin-top:4px">≈ ${monthTHB.toLocaleString('fr-FR')} ฿</div>
        </div>
        <div style="text-align:right">
          ${trendPct !== null ? `<div style="font-size:13px;font-weight:600;color:${trendUp ? '#4ADE80' : '#F87171'}">${trendUp ? '▲' : '▼'} ${Math.abs(trendPct)}%</div><div style="font-size:10px;color:rgba(255,255,255,.35);margin-top:2px">vs mois précédent</div>` : ''}
          <div style="margin-top:8px;font-size:11px;color:rgba(255,255,255,.5)">Cette semaine : <strong style="color:#fff">${weekEUR.toLocaleString('fr-FR')} €</strong></div>
        </div>
      </div>

      <!-- ── 4 KPI cards ── -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:14px">
        <div class="dash-card" style="padding:12px 14px">
          <div style="font-size:20px;margin-bottom:4px">🚀</div>
          <div style="font-size:18px;font-weight:700;color:#0F766E">${onbCount}<span style="font-size:12px;font-weight:400;color:var(--text-2)"> / 10</span></div>
          <div style="font-size:11px;color:var(--text-2);margin-top:2px">Onboardings</div>
        </div>
        <div class="dash-card" style="padding:12px 14px">
          <div style="font-size:20px;margin-bottom:4px">🛂</div>
          <div style="font-size:18px;font-weight:700;color:#B45309">${visaCount}<span style="font-size:12px;font-weight:400;color:var(--text-2)"> / 4</span></div>
          <div style="font-size:11px;color:var(--text-2);margin-top:2px">Visas</div>
        </div>
        <div class="dash-card" style="padding:12px 14px">
          <div style="font-size:20px;margin-bottom:4px">👥</div>
          <div style="font-size:18px;font-weight:700;color:var(--text)">${activeClients}</div>
          <div style="font-size:11px;color:var(--text-2);margin-top:2px">Clients actifs</div>
        </div>
        <div class="dash-card" style="padding:12px 14px">
          <div style="font-size:20px;margin-bottom:4px">📅</div>
          <div style="font-size:18px;font-weight:700;color:${kpis.urgentMoveIns > 0 ? '#DC2626' : 'var(--text)'}">${kpis.urgentMoveIns}</div>
          <div style="font-size:11px;color:var(--text-2);margin-top:2px">Move-ins 7 jours</div>
        </div>
      </div>

      <!-- ── Pipeline ── -->
      <div class="dash-card" style="margin-bottom:14px">
        <div class="dash-card-title">Pipeline</div>
        ${this.pipelineHTML(pipeline)}
      </div>

      <!-- ── Move-ins ── -->
      <div class="dash-card" style="margin-bottom:14px">
        <div class="dash-card-title">Arrivées à venir <span class="dash-card-sub">60 prochains jours</span></div>
        ${urgent.length ? `<div class="movein-grid">${urgent.map(c => {
          const days  = Math.ceil((new Date(c.move_in_date) - now) / 86400000);
          const color  = days <= 7 ? '#DC2626' : days <= 14 ? '#EA580C' : days <= 30 ? '#D97706' : '#16A34A';
          const bg     = days <= 7 ? '#FEF2F2' : days <= 14 ? '#FFF7ED' : days <= 30 ? '#FFFBEB' : '#F0FDF4';
          const border = days <= 7 ? '#FECACA' : days <= 14 ? '#FED7AA' : days <= 30 ? '#FDE68A' : '#BBF7D0';
          return `<div class="movein-tile" style="background:${bg};border-color:${border}">
            <div class="movein-tile-days" style="color:${color}">${days}</div>
            <div class="movein-tile-unit" style="color:${color}">jours</div>
            <div class="movein-tile-name">${c.name.split(' ')[0]}</div>
            <div class="movein-tile-date">${new Date(c.move_in_date).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</div>
          </div>`;
        }).join('')}</div>`
        : '<p style="padding:20px 0;text-align:center;color:var(--text-3);font-size:13px">Aucune arrivée dans les 60 prochains jours</p>'}
      </div>

      <!-- ── Sur le feu ── -->
      <div class="dash-card" style="margin-bottom:24px">
        <div class="dash-card-title" style="margin-bottom:12px">🔥 Sur le feu</div>
        <div id="dash-notes-block">${this._notesHTML()}</div>
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
