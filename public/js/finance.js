const Finance = {
  data: [],
  selectedMonth: '',
  _unlocked: false,   // in-memory only — resets on every page refresh
  _chart: null,
  _chart2: null,
  displayCur: localStorage.getItem('fin_display_cur') || 'THB',

  // ── Exchange rate (auto-refreshed daily, editable override) ───────────────
  get eurRate() {
    return parseFloat(localStorage.getItem('eur_rate') || '37');
  },
  set eurRate(v) {
    localStorage.setItem('eur_rate', String(v));
    localStorage.setItem('eur_rate_ts', Date.now());
  },

  async fetchRate() {
    try {
      const r = await fetch('https://api.frankfurter.app/latest?from=EUR&to=THB');
      const j = await r.json();
      const rate = j?.rates?.THB;
      if (rate) {
        localStorage.setItem('eur_rate', String(Math.round(rate * 100) / 100));
      }
    } catch { /* silent — keep last known rate */ }
  },

  // ── Monthly goals ──────────────────────────────────────────────────────────
  // type 'amount': progress by THB total | type 'count': progress by nb of transactions
  GOALS: {
    commission: { type: 'amount', amount: 50000, currency: 'THB' },
    onboarding: { type: 'count',  count: 10, label: 'recherches' },
    visa:       { type: 'count',  count: 4,  label: 'visas' },
    autre:      null,
  },

  goalInTHB(key) {
    const g = this.GOALS[key];
    if (!g || g.type !== 'amount') return null;
    return g.currency === 'EUR' ? Math.round(g.amount * this.eurRate) : g.amount;
  },

  goalLabel(key) {
    const g = this.GOALS[key];
    if (!g) return '';
    if (g.type === 'count') return `Objectif : ${g.count} ${g.label}`;
    if (g.currency === 'EUR') return `Objectif : ${g.amount.toLocaleString('fr-FR')} €`;
    return `Objectif : ${g.amount.toLocaleString('fr-FR')} ฿`;
  },

  // ── Conversion helpers ─────────────────────────────────────────────────────
  toTHB(t) {
    return t.currency === 'EUR'
      ? Math.round(Number(t.amount) * this.eurRate)
      : Number(t.amount);
  },

  fmtEUR(thb) {
    if (!thb) return '';
    return `≈ ${Math.round(thb / this.eurRate).toLocaleString('fr-FR')} €`;
  },

  fmtTHB(eur) {
    if (!eur) return '';
    return `≈ ${Math.round(eur * this.eurRate).toLocaleString('fr-FR')} ฿`;
  },

  // ── Display currency toggle ────────────────────────────────────────────────
  toggleDisplay() {
    this.displayCur = this.displayCur === 'THB' ? 'EUR' : 'THB';
    localStorage.setItem('fin_display_cur', this.displayCur);
    this.render();
    setTimeout(() => this.drawRevenueChart(), 60);
  },

  // Amount of a transaction in the current display currency
  inDisplay(t) {
    const amt = Number(t.amount);
    if (this.displayCur === 'EUR') {
      return t.currency === 'EUR' ? amt : amt / this.eurRate;
    }
    return t.currency === 'EUR' ? Math.round(amt * this.eurRate) : amt;
  },

  // Formate `amount` (dans `fromCur`) dans la devise d'affichage courante
  fmtAs(amount, fromCur) {
    const v = Math.round(amount);
    if (!amount) return this.displayCur === 'EUR' ? '0 €' : '0 ฿';
    if (fromCur === this.displayCur) return `${v.toLocaleString('fr-FR')} ${fromCur === 'EUR' ? '€' : '฿'}`;
    if (this.displayCur === 'EUR') return `≈ ${Math.round(amount / this.eurRate).toLocaleString('fr-FR')} €`;
    return `≈ ${Math.round(amount * this.eurRate).toLocaleString('fr-FR')} ฿`;
  },

  // Sous-ligne (devise opposée)
  fmtAsSub(amount, fromCur) {
    if (!amount) return '';
    if (fromCur === this.displayCur) {
      return this.displayCur === 'EUR'
        ? `≈ ${Math.round(amount * this.eurRate).toLocaleString('fr-FR')} ฿`
        : `≈ ${Math.round(amount / this.eurRate).toLocaleString('fr-FR')} €`;
    }
    return `${Math.round(amount).toLocaleString('fr-FR')} ${fromCur === 'EUR' ? '€' : '฿'}`;
  },

  // Pour une transaction individuelle
  fmtSub(t) {
    const amt = Number(t.amount);
    const cur = t.currency || 'THB';
    return this.fmtAsSub(amt, cur);
  },

  // ── Lock / unlock ──────────────────────────────────────────────────────────
  async init() {
    if (!this._unlocked) {
      this.showLock(); return;
    }
    await Promise.all([this.load(), this.fetchRate()]);
    this.render();
    setTimeout(() => this.drawRevenueChart(), 60);
  },

  showLock() {
    document.getElementById('content').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:65vh">
        <div style="text-align:center;max-width:300px">
          <div style="font-size:52px;margin-bottom:16px">🔒</div>
          <h3 style="font-size:19px;font-weight:800;margin-bottom:6px;letter-spacing:-.3px">Finance</h3>
          <p style="color:var(--text-2);font-size:13px;margin-bottom:24px">Enter your Finance password to access this section</p>
          <form onsubmit="Finance.unlock(event)">
            <input type="password" id="finance-pw" placeholder="Password" autofocus
              style="width:100%;padding:11px 14px;border:1px solid var(--border);border-radius:9px;font-family:inherit;font-size:14px;outline:none;text-align:center;background:var(--bg);color:var(--text);margin-bottom:10px">
            <button type="submit" class="btn btn-primary" style="width:100%;padding:11px">Unlock</button>
            <p id="finance-err" class="error hidden" style="margin-top:8px">Incorrect password</p>
          </form>
        </div>
      </div>`;
  },

  async unlock(e) {
    e.preventDefault();
    const pw = document.getElementById('finance-pw').value;
    const errEl = document.getElementById('finance-err');
    errEl.classList.add('hidden');
    try {
      await api.post('/auth/finance-unlock', { password: pw });
    } catch {
      errEl.classList.remove('hidden');
      return;
    }
    this._unlocked = true;
    try {
      await Promise.all([this.load(), this.fetchRate()]);
    } catch (err) {
      Toast.show('Erreur chargement finance : ' + (err?.message || err), 'error');
      return;
    }
    this.render();
    setTimeout(() => this.drawRevenueChart(), 60);
  },

  // ── Data ───────────────────────────────────────────────────────────────────
  async load() {
    this.data = await api.get('/finance');
    if (!this.selectedMonth) {
      const now = new Date();
      this.selectedMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    }
  },

  months() {
    const set = new Set(this.data.map(t => t.date.substring(0, 7)));
    const now = new Date();
    set.add(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
    return [...set].sort().reverse();
  },

  monthLabel(ym) {
    const [y, m] = ym.split('-');
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  },

  // ── Summaries ──────────────────────────────────────────────────────────────
  summary() {
    const accounts = ['KBank', 'Crypto', 'Revolut'];
    const txMonth = this.data.filter(t => t.date.startsWith(this.selectedMonth));
    return accounts.map(acct => ({
      acct,
      total: txMonth.filter(t => t.account === acct).reduce((s, t) => s + this.toTHB(t), 0),
      count: txMonth.filter(t => t.account === acct).length
    }));
  },

  summaryByType() {
    const types = [
      { key: 'commission', label: 'Commission', icon: '🤝', color: '#334155' },
      { key: 'onboarding', label: 'Onboarding', icon: '🚀', color: '#0F766E' },
      { key: 'visa',       label: 'Visa',        icon: '🛂', color: '#B45309' },
      { key: 'autre',      label: 'Autre',        icon: '💼', color: '#9CA3AF' },
    ];
    const txMonth = this.data.filter(t => t.date.startsWith(this.selectedMonth));
    return types.map(t => {
      const txs  = txMonth.filter(x => x.type === t.key);
      const goal = this.GOALS[t.key];
      const count = txs.length;
      // Sum in goal currency to keep EUR goals fixed
      const total = txs.reduce((s, x) => {
        if (goal?.currency === 'EUR') {
          return s + (x.currency === 'EUR' ? Number(x.amount) : Number(x.amount) / this.eurRate);
        }
        return s + this.toTHB(x);
      }, 0);
      let pct = null;
      if (goal?.type === 'count')  pct = Math.min(Math.round(count / goal.count * 100), 100);
      if (goal?.type === 'amount') pct = Math.min(Math.round(total / goal.amount * 100), 100);
      const goalCur = goal?.currency || 'THB';
      return { ...t, total, count, goal, goalCur, pct };
    });
  },

  // ── Render ─────────────────────────────────────────────────────────────────
  render() {
    const months     = this.months();
    const summary    = this.summary();
    const byType     = this.summaryByType();
    const txMonth    = this.data.filter(t => t.date.startsWith(this.selectedMonth));
    const grandTotal = txMonth.reduce((s, t) => s + this.toTHB(t), 0);

    document.getElementById('content').innerHTML = `
      <div class="section-header">
        <h2>Finance</h2>
        <div class="header-actions">
          <button class="btn btn-ghost" onclick="Finance.editRate()" title="Exchange rate — updated daily">
            1€ = ${this.eurRate} ฿ ✏️
          </button>
          <button class="btn btn-ghost" onclick="Finance.toggleDisplay()" title="Changer la devise d'affichage">
            ${this.displayCur === 'THB' ? '฿ → €' : '€ → ฿'}
          </button>
          <button class="btn btn-primary" onclick="Finance.openAddModal()">+ Transaction</button>
        </div>
      </div>

      <div class="month-selector">
        <label style="color:var(--text-2);font-size:13px">Month:</label>
        <select onchange="Finance.changeMonth(this.value)">
          ${months.map(m =>
            `<option value="${m}" ${m === this.selectedMonth ? 'selected' : ''}>${this.monthLabel(m)}</option>`
          ).join('')}
        </select>
        <span style="color:var(--text-2);font-size:13px">
          Total: <strong style="color:var(--accent)">${this.fmtAs(grandTotal, 'THB')}</strong>
          <span class="eur-inline">${this.fmtAsSub(grandTotal, 'THB')}</span>
        </span>

      </div>

      <!-- By account -->
      <div class="fin-section-label">By account</div>
      <div class="summary-row">
        ${summary.map(r => `
          <div class="summary-card">
            <div class="acct">${r.acct}</div>
            <div class="total">${this.fmtAs(r.total, 'THB')}</div>
            ${r.total ? `<div class="eur-sub">${this.fmtAsSub(r.total, 'THB')}</div>` : ''}
            <div class="sub">${r.count} transaction${r.count !== 1 ? 's' : ''}</div>
          </div>`).join('')}
        <div class="summary-card" style="border-color:rgba(212,168,83,.3)">
          <div class="acct">Total</div>
          <div class="total" style="color:var(--accent)">${this.fmtAs(grandTotal, 'THB')}</div>
          ${grandTotal ? `<div class="eur-sub" style="color:var(--accent);opacity:.7">${this.fmtAsSub(grandTotal, 'THB')}</div>` : ''}
          <div class="sub">${txMonth.length} transaction${txMonth.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <!-- By category + goals -->
      <div class="fin-section-label">By category</div>
      <div class="summary-row">
        ${byType.map(r => {
          const isCount      = r.goal?.type === 'count';
          const displayTotal = isCount
            ? `<span style="font-size:22px;font-weight:700">${r.count}</span><span style="font-size:13px;color:var(--text-2);margin-left:4px">/ ${r.goal.count} ${r.goal.label}</span>`
            : (r.total ? this.fmtAs(r.total, r.goalCur) : '—');
          const displaySub   = isCount
            ? (r.total ? `≈ ${this.fmtAs(r.total, r.goalCur)}` : '')
            : (r.total ? this.fmtAsSub(r.total, r.goalCur) : '');
          return `
          <div class="summary-card">
            <div class="acct">${r.icon} ${r.label}</div>
            <div class="total" style="color:${r.color}">${displayTotal}</div>
            ${displaySub ? `<div class="eur-sub" style="color:${r.color};opacity:.7">${displaySub}</div>` : ''}
            ${!isCount ? `<div class="sub">${r.count} transaction${r.count !== 1 ? 's' : ''}</div>` : ''}
            ${r.goal ? `
              <div class="type-bar-track">
                <div class="type-bar-fill" style="width:${r.pct}%;background:${r.color}20;border:none">
                  <div style="height:100%;width:100%;background:${r.color};border-radius:4px"></div>
                </div>
              </div>
              <div class="goal-row">
                <span class="type-pct" style="color:${r.color}">${r.pct}%</span>
                <span class="goal-label">${this.goalLabel(r.key)}</span>
              </div>` : ''}
          </div>`;
        }).join('')}
      </div>

      <!-- Insights -->
      ${this.insightsHTML()}

      <!-- Charts: donut mois + tendance 6 mois -->
      <div class="fin-section-label">Répartition & tendance</div>
      <div class="dash-card" style="margin-bottom:24px;padding:18px 22px">
        <div style="display:flex;gap:28px;align-items:center;height:220px">
          <div style="position:relative;width:220px;flex-shrink:0;height:100%">
            <canvas id="chart-fin-donut"></canvas>
          </div>
          <div style="flex:1;height:100%;position:relative">
            <canvas id="chart-fin-trend"></canvas>
          </div>
        </div>
      </div>

      <!-- Transactions table -->
      <table class="tx-table">
        <thead>
          <tr>
            <th>Date</th><th>Type</th><th>Account</th><th>Notes</th><th>Amount</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${txMonth.length ? txMonth.map(t => `
            <tr>
              <td>${fmtDate(t.date)}</td>
              <td><span class="tx-type-badge tx-type-${t.type}">${t.type}</span></td>
              <td>${t.account}</td>
              <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.notes || '—'}</td>
              <td>
                <div class="tx-amount">${this.fmtAs(Number(t.amount), t.currency || 'THB')}</div>
                <div class="eur-sub">${this.fmtSub(t)}</div>
              </td>
              <td>
                <div class="tx-actions">
                  <button class="btn btn-ghost btn-sm" onclick="Finance.openEditModal(${t.id})">✏️</button>
                  <button class="btn btn-ghost btn-sm" onclick="Finance.remove(${t.id})" style="color:var(--red)">✕</button>
                </div>
              </td>
            </tr>`).join('')
            : `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-2)">No transactions this month</td></tr>`}
        </tbody>
      </table>`;
  },

  // ── Analytics helpers ─────────────────────────────────────────────────────
  _last6Months() {
    const now = new Date();
    const keys = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    }
    return keys;
  },

  revenueByMonthDetailed() {
    const cats = ['commission','onboarding','visa','autre'];
    const months = {};
    this._last6Months().forEach(k => { months[k] = { commission:0, onboarding:0, visa:0, autre:0 }; });
    this.data.forEach(t => {
      const k = (t.date||'').slice(0,7);
      if (!(k in months)) return;
      const cat = cats.includes(t.type) ? t.type : 'autre';
      months[k][cat] += this.toTHB(t);
    });
    return months;
  },

  revenueLastYear() {
    const now = new Date();
    const months = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear() - 1, now.getMonth() - i, 1);
      months[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`] = 0;
    }
    this.data.forEach(t => { const k = (t.date||'').slice(0,7); if (k in months) months[k] += this.toTHB(t); });
    return Object.values(months);
  },

  bestMonth() {
    const byMonth = {};
    this.data.forEach(t => {
      const k = (t.date||'').slice(0,7);
      byMonth[k] = (byMonth[k] || 0) + this.toTHB(t);
    });
    const entries = Object.entries(byMonth).sort((a,b) => b[1]-a[1]);
    if (!entries.length) return null;
    const [ym, total] = entries[0];
    const [y,m] = ym.split('-');
    return { label: new Date(y, m-1, 1).toLocaleDateString('fr-FR', { month:'long', year:'numeric' }), total };
  },

  projection() {
    const now = new Date();
    const [y, m] = this.selectedMonth.split('-').map(Number);
    if (y !== now.getFullYear() || m !== now.getMonth() + 1) return null;
    const txMonth = this.data.filter(t => t.date?.startsWith(this.selectedMonth));
    const total = txMonth.reduce((s,t) => s + this.toTHB(t), 0);
    if (!total) return null;
    const daysInMonth = new Date(y, m, 0).getDate();
    const dayElapsed  = now.getDate();
    return { projected: Math.round(total / dayElapsed * daysInMonth), dayElapsed, daysInMonth };
  },

  insightsHTML() {
    const best = this.bestMonth();
    const proj = this.projection();
    if (!best && !proj) return '';
    const cards = [];
    if (best) cards.push(`
      <div class="insight-card">
        <div class="insight-icon">🏆</div>
        <div class="insight-label">Meilleur mois</div>
        <div class="insight-value">${this.fmtAs(best.total,'THB')}</div>
        <div class="insight-sub">${best.label}</div>
      </div>`);
    if (proj) cards.push(`
      <div class="insight-card">
        <div class="insight-icon">📈</div>
        <div class="insight-label">Projection fin de mois</div>
        <div class="insight-value">${this.fmtAs(proj.projected,'THB')}</div>
        <div class="insight-sub">J${proj.dayElapsed} / ${proj.daysInMonth} — extrapolé</div>
      </div>`);
    return `
      <div class="fin-section-label">Insights</div>
      <div class="summary-row" style="margin-bottom:8px">${cards.join('')}</div>`;
  },

  // ── Charts: donut mois en cours + courbe tendance 6 mois ────────────────
  drawRevenueChart() {
    if (this._chart)  { this._chart.destroy();  this._chart  = null; }
    if (this._chart2) { this._chart2.destroy(); this._chart2 = null; }

    const CATS = [
      { key:'commission', label:'Commission', color:'#334155' },
      { key:'onboarding', label:'Onboarding', color:'#0F766E' },
      { key:'visa',       label:'Visa',       color:'#B45309' },
      { key:'autre',      label:'Autre',      color:'#9CA3AF' },
    ];
    const fmt = thb => `${Number(thb).toLocaleString('fr-FR')} ฿  ≈ ${Math.round(thb/this.eurRate).toLocaleString('fr-FR')} €`;

    // ── Donut — répartition du mois sélectionné ──────────────────────────
    const ctxD = document.getElementById('chart-fin-donut');
    if (ctxD) {
      const txMonth  = this.data.filter(t => t.date.startsWith(this.selectedMonth));
      const catKeys  = ['commission','onboarding','visa','autre'];
      const totals   = catKeys.map(k =>
        txMonth.filter(t => catKeys.includes(t.type) ? t.type === k : k === 'autre')
               .reduce((s,t) => s + this.toTHB(t), 0)
      );
      const grandTotal = totals.reduce((s,v) => s + v, 0);
      const totalStr   = this.displayCur === 'EUR'
        ? `≈ ${Math.round(grandTotal/this.eurRate).toLocaleString('fr-FR')} €`
        : `${grandTotal.toLocaleString('fr-FR')} ฿`;
      const monthStr = new Date(this.selectedMonth + '-01')
        .toLocaleDateString('fr-FR', { month:'long', year:'numeric' });

      const centerPlugin = {
        id: 'centerText',
        beforeDraw(chart) {
          const { ctx: c, chartArea: a } = chart;
          const cx = (a.left + a.right) / 2, cy = (a.top + a.bottom) / 2;
          c.save();
          c.textAlign = 'center';
          c.font = '500 14px sans-serif';
          c.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text') || '#1A1A1A';
          c.fillText(totalStr, cx, cy + 2);
          c.font = '11px sans-serif';
          c.fillStyle = '#9A9490';
          c.fillText(monthStr, cx, cy + 17);
          c.restore();
        }
      };

      this._chart = new Chart(ctxD, {
        type: 'doughnut',
        data: {
          labels: CATS.map(c => c.label),
          datasets: [{
            data: totals,
            backgroundColor: CATS.map(c => c.color),
            borderWidth: 3,
            borderColor: 'transparent',
            hoverOffset: 6,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          cutout: '66%',
          plugins: {
            legend: { display: true, position: 'right',
              labels: { boxWidth:10, padding:10, font:{ size:11 }, color:'#9A9490' } },
            tooltip: {
              backgroundColor:'#1A1A1A', cornerRadius:8, padding:10,
              callbacks: { label: c => `  ${c.label} : ${fmt(c.raw)}` }
            }
          },
          animation: { duration:600 }
        },
        plugins: [centerPlugin]
      });
    }

    // ── Courbe — total mensuel 6 derniers mois + N-1 ─────────────────────
    const ctxT = document.getElementById('chart-fin-trend');
    if (ctxT) {
      const detailed  = this.revenueByMonthDetailed();
      const lastYear  = this.revenueLastYear();
      const labels    = this._last6Months().map(k => {
        const [y,m] = k.split('-');
        return new Date(y,m-1,1).toLocaleDateString('fr-FR', { month:'short' });
      });
      const totals = Object.values(detailed).map(m => m.commission + m.onboarding + m.visa + m.autre);

      this._chart2 = new Chart(ctxT, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Cette année',
              data: totals,
              borderColor: '#334155',
              backgroundColor: 'rgba(51,65,85,0.07)',
              borderWidth: 2,
              pointRadius: 4,
              pointBackgroundColor: '#334155',
              tension: 0.35,
              fill: true,
            },
            {
              label: 'N−1',
              data: lastYear,
              borderColor: 'rgba(150,150,150,0.4)',
              backgroundColor: 'transparent',
              borderWidth: 1.5,
              borderDash: [4,3],
              pointRadius: 2.5,
              pointBackgroundColor: 'rgba(150,150,150,0.5)',
              tension: 0.35,
            }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'top',
              labels: { boxWidth:10, padding:12, font:{ size:11 }, color:'#9A9490' } },
            tooltip: {
              backgroundColor:'#1A1A1A', cornerRadius:8, padding:10,
              callbacks: { label: c => `  ${c.dataset.label} : ${fmt(c.raw)}` }
            }
          },
          scales: {
            y: { beginAtZero:true, grid:{ color:'rgba(150,150,150,0.1)' },
                 ticks:{ color:'#9A9490', callback: v => v ? (v/1000).toFixed(0)+'k' : '0' } },
            x: { ticks:{ color:'#9A9490', font:{ weight:'600' } }, grid:{ display:false } }
          },
          animation: { duration:800, easing:'easeOutQuart' }
        }
      });
    }
  },

  // ── Actions ────────────────────────────────────────────────────────────────
  changeMonth(m) { this.selectedMonth = m; this.render(); setTimeout(() => this.drawRevenueChart(), 60); },

  editRate() {
    const r = prompt(`Exchange rate (THB per €)\nCurrent: 1€ = ${this.eurRate} ฿`, this.eurRate);
    if (!r) return;
    const val = parseFloat(r.replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      this.eurRate = val;
      this.render();
      setTimeout(() => this.drawRevenueChart(), 60);
    }
  },

  openAddModal()  { Modal.open('Add transaction',  this.formHTML(null)); },
  openEditModal(id) {
    const t = this.data.find(x => x.id === id);
    Modal.open('Edit transaction', this.formHTML(t));
  },

  // ── Form ───────────────────────────────────────────────────────────────────
  formHTML(t) {
    const today  = new Date().toISOString().split('T')[0];
    const isEUR  = t?.currency === 'EUR';
    return `
      <form onsubmit="Finance.submit(event, ${t ? t.id : 'null'})">

        <!-- Currency toggle -->
        <div class="form-row">
          <label>Currency</label>
          <div class="currency-toggle">
            <label class="cur-opt">
              <input type="radio" name="currency" value="THB" ${!isEUR ? 'checked' : ''} onchange="Finance.onCurrencyChange()">
              <span>฿ THB</span>
            </label>
            <label class="cur-opt">
              <input type="radio" name="currency" value="EUR" ${isEUR ? 'checked' : ''} onchange="Finance.onCurrencyChange()">
              <span>€ EUR</span>
            </label>
          </div>
        </div>

        <div class="form-2">
          <div class="form-row">
            <label id="amount-label">Amount (${isEUR ? '€' : '฿'}) *</label>
            <input id="fin-amount" name="amount_raw" type="number" step="0.01" min="0" required
              value="${t?.amount || ''}" oninput="Finance.onAmountInput()">
            <div id="amount-preview" class="amount-preview"></div>
          </div>
          <div class="form-row">
            <label>Date *</label>
            <input name="date" type="date" required value="${t?.date || today}">
          </div>
        </div>

        <div class="form-2">
          <div class="form-row">
            <label>Type *</label>
            <select name="type" required>
              ${['commission','onboarding','visa','autre'].map(s =>
                `<option ${t?.type === s ? 'selected' : ''}>${s}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-row">
            <label>Account *</label>
            <select name="account" required>
              ${['KBank','Crypto','Revolut'].map(s =>
                `<option ${t?.account === s ? 'selected' : ''}>${s}</option>`
              ).join('')}
            </select>
          </div>
        </div>

        <div class="form-row">
          <label>Notes</label>
          <input name="notes" placeholder="Client, deal, reference…" value="${t?.notes || ''}">
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn btn-primary">${t ? 'Save' : 'Add'}</button>
        </div>
      </form>`;
  },

  onCurrencyChange() {
    const cur = document.querySelector('[name="currency"]:checked')?.value;
    const lbl = document.getElementById('amount-label');
    if (lbl) lbl.textContent = `Amount (${cur === 'EUR' ? '€' : '฿'}) *`;
    this.onAmountInput();
  },

  onAmountInput() {
    const cur = document.querySelector('[name="currency"]:checked')?.value || 'THB';
    const raw = parseFloat(document.getElementById('fin-amount')?.value) || 0;
    const preview = document.getElementById('amount-preview');
    if (!preview) return;
    if (!raw) { preview.textContent = ''; return; }
    if (cur === 'EUR') {
      preview.textContent = `≈ ${Math.round(raw * Finance.eurRate).toLocaleString('fr-FR')} ฿`;
    } else {
      preview.textContent = `≈ ${Math.round(raw / Finance.eurRate).toLocaleString('fr-FR')} €`;
    }
  },

  async submit(e, id) {
    e.preventDefault();
    const fd   = new FormData(e.target);
    const data = Object.fromEntries(fd);
    const cur  = data.currency || 'THB';
    const raw  = parseFloat(data.amount_raw) || 0;

    // Store original amount + currency — no conversion
    data.amount   = raw;
    data.currency = cur;
    delete data.amount_raw;

    try {
      if (id) {
        await api.put(`/finance/${id}`, data);
        Toast.show('Transaction updated');
      } else {
        await api.post('/finance', data);
        Toast.show('Transaction added');
      }
      Modal.close();
      await this.load();
      this.render();
      setTimeout(() => this.drawRevenueChart(), 60);
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  async remove(id) {
    if (!confirm('Delete this transaction?')) return;
    await api.del(`/finance/${id}`);
    this.data = this.data.filter(t => t.id !== id);
    this.render();
    setTimeout(() => this.drawRevenueChart(), 60);
    Toast.show('Transaction deleted');
  }
};
