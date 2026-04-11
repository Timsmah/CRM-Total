const Finance = {
  data: [],
  selectedMonth: '',

  async init() {
    if (sessionStorage.getItem('finance_unlocked') !== '1') {
      this.showLock(); return;
    }
    await this.load();
    this.render();
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
      sessionStorage.setItem('finance_unlocked', '1');
      await this.load();
      this.render();
    } catch {
      errEl.classList.remove('hidden');
    }
  },

  async load() {
    this.data = await api.get('/finance');
    if (!this.selectedMonth) {
      // Default to current month
      const now = new Date();
      this.selectedMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    }
  },

  // All months present in data + current month
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

  // Summary by account for selected month
  summary() {
    const accounts = ['KBank', 'Crypto', 'Revolut'];
    const txMonth = this.data.filter(t => t.date.startsWith(this.selectedMonth));
    return accounts.map(acct => ({
      acct,
      total: txMonth.filter(t => t.account === acct).reduce((s, t) => s + t.amount, 0),
      count: txMonth.filter(t => t.account === acct).length
    }));
  },

  // Summary by category/type for selected month
  summaryByType() {
    const types = [
      { key: 'commission', label: 'Commission', icon: '🤝', color: '#2563EB' },
      { key: 'onboarding', label: 'Onboarding', icon: '🚀', color: '#2A9D5C' },
      { key: 'visa',       label: 'Visa',        icon: '🛂', color: '#7C3AED' },
      { key: 'autre',      label: 'Other',        icon: '💼', color: '#D97706' },
    ];
    const txMonth = this.data.filter(t => t.date.startsWith(this.selectedMonth));
    return types.map(t => ({
      ...t,
      total: txMonth.filter(x => x.type === t.key).reduce((s, x) => s + Number(x.amount), 0),
      count: txMonth.filter(x => x.type === t.key).length
    }));
  },

  render() {
    const months = this.months();
    const summary = this.summary();
    const byType = this.summaryByType();
    const grandTotal = summary.reduce((s, r) => s + r.total, 0);
    const txMonth = this.data.filter(t => t.date.startsWith(this.selectedMonth));
    const types = ['commission', 'onboarding', 'visa', 'autre'];
    const accounts = ['KBank', 'Crypto', 'Revolut'];

    document.getElementById('content').innerHTML = `
      <div class="section-header">
        <h2>Finance</h2>
        <div class="header-actions">
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
        </span>
      </div>

      <!-- By account -->
      <div class="fin-section-label">By account</div>
      <div class="summary-row">
        ${summary.map(r => `
          <div class="summary-card">
            <div class="acct">${r.acct}</div>
            <div class="total">${Number(r.total).toLocaleString('fr-FR')} ฿</div>
            <div class="sub">${r.count} transaction${r.count !== 1 ? 's' : ''}</div>
          </div>`).join('')}
        <div class="summary-card" style="border-color:rgba(212,168,83,.3)">
          <div class="acct">Total</div>
          <div class="total" style="color:var(--accent)">${Number(grandTotal).toLocaleString('fr-FR')} ฿</div>
          <div class="sub">${txMonth.length} transaction${txMonth.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <!-- By category -->
      <div class="fin-section-label">By category</div>
      <div class="summary-row">
        ${byType.map(r => `
          <div class="summary-card type-card" style="--type-color:${r.color}">
            <div class="acct">${r.icon} ${r.label}</div>
            <div class="total" style="color:${r.color}">${r.total ? Number(r.total).toLocaleString('fr-FR') + ' ฿' : '—'}</div>
            <div class="sub">${r.count} transaction${r.count !== 1 ? 's' : ''}</div>
            ${grandTotal > 0 && r.total > 0 ? `
              <div class="type-bar-track">
                <div class="type-bar-fill" style="width:${Math.round(r.total/grandTotal*100)}%;background:${r.color}"></div>
              </div>
              <div class="type-pct" style="color:${r.color}">${Math.round(r.total/grandTotal*100)}%</div>
            ` : ''}
          </div>`).join('')}
      </div>

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
              <td><span style="text-transform:capitalize">${t.type}</span></td>
              <td>${t.account}</td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.notes || '—'}</td>
              <td class="tx-amount">${Number(t.amount).toLocaleString('fr-FR')} ฿</td>
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

  changeMonth(m) {
    this.selectedMonth = m;
    this.render();
  },

  openAddModal() { Modal.open('Add transaction', this.formHTML(null)); },
  openEditModal(id) {
    const t = this.data.find(x => x.id === id);
    Modal.open('Edit transaction', this.formHTML(t));
  },

  formHTML(t) {
    const today = new Date().toISOString().split('T')[0];
    return `
      <form onsubmit="Finance.submit(event, ${t ? t.id : 'null'})">
        <div class="form-2">
          <div class="form-row">
            <label>Amount (THB) *</label>
            <input name="amount" type="number" step="0.01" required value="${t?.amount || ''}">
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
            <label>Compte *</label>
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

  async submit(e, id) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
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
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  async remove(id) {
    if (!confirm('Delete this transaction?')) return;
    await api.del(`/finance/${id}`);
    this.data = this.data.filter(t => t.id !== id);
    this.render();
    Toast.show('Transaction deleted');
  }
};
