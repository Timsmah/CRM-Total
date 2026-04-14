const Finance = {
  data: [],
  selectedMonth: '',
  _unlocked: false,   // in-memory only — resets on every page refresh
  _chart: null,

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
  // currency: 'THB' or 'EUR'
  GOALS: {
    commission: { amount: 60000, currency: 'THB' },
    onboarding: { amount: 2500,  currency: 'EUR' },
    visa:       { amount: 23000, currency: 'THB' }, // 2 × 11 500 ฿
    autre:      null,
  },

  goalInTHB(key) {
    const g = this.GOALS[key];
    if (!g) return null;
    return g.currency === 'EUR' ? Math.round(g.amount * this.eurRate) : g.amount;
  },

  goalLabel(key) {
    const g = this.GOALS[key];
    if (!g) return '';
    if (g.currency === 'EUR') return `Goal: ${g.amount.toLocaleString('fr-FR')} €`;
    return `Goal: ${g.amount.toLocaleString('fr-FR')} ฿`;
  },

  // ── EUR formatting ─────────────────────────────────────────────────────────
  fmtEUR(thb) {
    if (!thb) return '';
    return `≈ ${Math.round(thb / this.eurRate).toLocaleString('fr-FR')} €`;
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
      this._unlocked = true;
      await Promise.all([this.load(), this.fetchRate()]);
      this.render();
      setTimeout(() => this.drawRevenueChart(), 60);
    } catch {
      errEl.classList.remove('hidden');
    }
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
      total: txMonth.filter(t => t.account === acct).reduce((s, t) => s + Number(t.amount), 0),
      count: txMonth.filter(t => t.account === acct).length
    }));
  },

  summaryByType() {
    const types = [
      { key: 'commission', label: 'Commission', icon: '🤝', color: '#2563EB' },
      { key: 'onboarding', label: 'Onboarding', icon: '🚀', color: '#2A9D5C' },
      { key: 'visa',       label: 'Visa',        icon: '🛂', color: '#7C3AED' },
      { key: 'autre',      label: 'Other',        icon: '💼', color: '#D97706' },
    ];
    const txMonth = this.data.filter(t => t.date.startsWith(this.selectedMonth));
    return types.map(t => {
      const total = txMonth.filter(x => x.type === t.key).reduce((s, x) => s + Number(x.amount), 0);
      const count = txMonth.filter(x => x.type === t.key).length;
      const goal  = this.goalInTHB(t.key);
      const pct   = goal ? Math.min(Math.round(total / goal * 100), 100) : null;
      return { ...t, total, count, goal, pct };
    });
  },

  // ── Render ─────────────────────────────────────────────────────────────────
  render() {
    const months     = this.months();
    const summary    = this.summary();
    const byType     = this.summaryByType();
    const grandTotal = summary.reduce((s, r) => s + r.total, 0);
    const txMonth    = this.data.filter(t => t.date.startsWith(this.selectedMonth));

    document.getElementById('content').innerHTML = `
      <div class="section-header">
        <h2>Finance</h2>
        <div class="header-actions">
          <button class="btn btn-ghost" onclick="Finance.editRate()" title="Exchange rate — updated daily">
            1€ = ${this.eurRate} ฿ ✏️
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
          Total: <strong style="color:var(--accent)">${Number(grandTotal).toLocaleString('fr-FR')} ฿</strong>
          <span class="eur-inline">${this.fmtEUR(grandTotal)}</span>
        </span>
      </div>

      <!-- By account -->
      <div class="fin-section-label">By account</div>
      <div class="summary-row">
        ${summary.map(r => `
          <div class="summary-card">
            <div class="acct">${r.acct}</div>
            <div class="total">${Number(r.total).toLocaleString('fr-FR')} ฿</div>
            ${r.total ? `<div class="eur-sub">${this.fmtEUR(r.total)}</div>` : ''}
            <div class="sub">${r.count} transaction${r.count !== 1 ? 's' : ''}</div>
          </div>`).join('')}
        <div class="summary-card" style="border-color:rgba(212,168,83,.3)">
          <div class="acct">Total</div>
          <div class="total" style="color:var(--accent)">${Number(grandTotal).toLocaleString('fr-FR')} ฿</div>
          ${grandTotal ? `<div class="eur-sub" style="color:var(--accent);opacity:.7">${this.fmtEUR(grandTotal)}</div>` : ''}
          <div class="sub">${txMonth.length} transaction${txMonth.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <!-- By category + goals -->
      <div class="fin-section-label">By category</div>
      <div class="summary-row">
        ${byType.map(r => `
          <div class="summary-card">
            <div class="acct">${r.icon} ${r.label}</div>
            <div class="total" style="color:${r.color}">${r.total ? Number(r.total).toLocaleString('fr-FR') + ' ฿' : '—'}</div>
            ${r.total ? `<div class="eur-sub" style="color:${r.color};opacity:.7">${this.fmtEUR(r.total)}</div>` : ''}
            <div class="sub">${r.count} transaction${r.count !== 1 ? 's' : ''}</div>
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
          </div>`).join('')}
      </div>

      <!-- 6-month revenue trend -->
      <div class="fin-section-label">Revenue trend — last 6 months</div>
      <div class="dash-card" style="margin-bottom:24px;padding:18px 22px">
        <div style="height:160px;position:relative"><canvas id="chart-fin-revenue"></canvas></div>
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
                <div class="tx-amount">${Number(t.amount).toLocaleString('fr-FR')} ฿</div>
                <div class="eur-sub">${this.fmtEUR(Number(t.amount))}</div>
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

  // ── 6-month revenue chart ─────────────────────────────────────────────────
  revenueByMonth() {
    const now = new Date();
    const months = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`] = 0;
    }
    this.data.forEach(t => { const k = (t.date||'').slice(0,7); if (k in months) months[k] += Number(t.amount); });
    return {
      labels: Object.keys(months).map(k => { const [y,m] = k.split('-'); return new Date(y,m-1,1).toLocaleDateString('en-US',{month:'short'}); }),
      values: Object.values(months)
    };
  },

  drawRevenueChart() {
    if (this._chart) { this._chart.destroy(); this._chart = null; }
    const ctx = document.getElementById('chart-fin-revenue');
    if (!ctx) return;
    const data = this.revenueByMonth();
    this._chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          backgroundColor: data.values.map((v, i) => i === data.values.length - 1 ? '#FF6B00' : 'rgba(255,107,0,.25)'),
          borderColor:     data.values.map((v, i) => i === data.values.length - 1 ? '#FF6B00' : '#FF6B00'),
          borderWidth: 2,
          borderRadius: 8,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: {
          backgroundColor: '#1A1A1A', cornerRadius: 8, padding: 10,
          callbacks: { label: c => '  ' + Number(c.raw).toLocaleString('fr-FR') + ' ฿  ≈ ' + Math.round(c.raw / this.eurRate).toLocaleString('fr-FR') + ' €' }
        }},
        scales: {
          y: { beginAtZero: true, grid: { color: '#F0EDE8' },
               ticks: { color: '#9A9490', callback: v => v ? (v/1000).toFixed(0)+'k ฿' : '0' }},
          x: { ticks: { color: '#9A9490', font: { weight: '600' } }, grid: { display: false } }
        },
        animation: { duration: 800, easing: 'easeOutQuart' }
      }
    });
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
    const today   = new Date().toISOString().split('T')[0];
    const hasTHB  = t && !t._eur;  // existing tx stored in THB
    return `
      <form onsubmit="Finance.submit(event, ${t ? t.id : 'null'})">

        <!-- Currency toggle -->
        <div class="form-row">
          <label>Currency</label>
          <div class="currency-toggle">
            <label class="cur-opt">
              <input type="radio" name="currency" value="THB" ${!t || t._eur !== true ? 'checked' : ''} onchange="Finance.onCurrencyChange()">
              <span>฿ THB</span>
            </label>
            <label class="cur-opt">
              <input type="radio" name="currency" value="EUR" ${t?._eur === true ? 'checked' : ''} onchange="Finance.onCurrencyChange()">
              <span>€ EUR</span>
            </label>
          </div>
        </div>

        <div class="form-2">
          <div class="form-row">
            <label id="amount-label">Amount *</label>
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

    // Always store in THB
    data.amount = cur === 'EUR' ? Math.round(raw * this.eurRate) : raw;
    delete data.amount_raw;
    delete data.currency;

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
