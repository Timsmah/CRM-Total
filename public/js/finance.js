const Finance = {
  data: [],
  selectedMonth: '',

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
    return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  },

  // Summary by account for selected month
  summary() {
    const accounts = ['KBank', 'Wise', 'Revolut'];
    const txMonth = this.data.filter(t => t.date.startsWith(this.selectedMonth));
    return accounts.map(acct => ({
      acct,
      total: txMonth.filter(t => t.account === acct).reduce((s, t) => s + t.amount, 0),
      count: txMonth.filter(t => t.account === acct).length
    }));
  },

  render() {
    const months = this.months();
    const summary = this.summary();
    const grandTotal = summary.reduce((s, r) => s + r.total, 0);
    const txMonth = this.data.filter(t => t.date.startsWith(this.selectedMonth));
    const types = ['commission', 'onboarding', 'autre'];
    const accounts = ['KBank', 'Wise', 'Revolut'];

    document.getElementById('content').innerHTML = `
      <div class="section-header">
        <h2>Finance</h2>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="Finance.openAddModal()">+ Transaction</button>
        </div>
      </div>

      <div class="month-selector">
        <label style="color:var(--text-2);font-size:13px">Mois :</label>
        <select onchange="Finance.changeMonth(this.value)">
          ${months.map(m =>
            `<option value="${m}" ${m === this.selectedMonth ? 'selected' : ''}>${this.monthLabel(m)}</option>`
          ).join('')}
        </select>
        <span style="color:var(--text-2);font-size:13px">
          Total : <strong style="color:var(--accent)">${Number(grandTotal).toLocaleString('fr-FR')} ฿</strong>
        </span>
      </div>

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

      <table class="tx-table">
        <thead>
          <tr>
            <th>Date</th><th>Type</th><th>Compte</th><th>Notes</th><th>Montant</th><th></th>
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
            : `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-2)">Aucune transaction ce mois</td></tr>`}
        </tbody>
      </table>`;
  },

  changeMonth(m) {
    this.selectedMonth = m;
    this.render();
  },

  openAddModal() { Modal.open('Ajouter une transaction', this.formHTML(null)); },
  openEditModal(id) {
    const t = this.data.find(x => x.id === id);
    Modal.open('Modifier la transaction', this.formHTML(t));
  },

  formHTML(t) {
    const today = new Date().toISOString().split('T')[0];
    return `
      <form onsubmit="Finance.submit(event, ${t ? t.id : 'null'})">
        <div class="form-2">
          <div class="form-row">
            <label>Montant (THB) *</label>
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
              ${['commission','onboarding','autre'].map(s =>
                `<option ${t?.type === s ? 'selected' : ''}>${s}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-row">
            <label>Compte *</label>
            <select name="account" required>
              ${['KBank','Wise','Revolut'].map(s =>
                `<option ${t?.account === s ? 'selected' : ''}>${s}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <label>Notes</label>
          <input name="notes" placeholder="Client, deal, référence…" value="${t?.notes || ''}">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Annuler</button>
          <button type="submit" class="btn btn-primary">${t ? 'Enregistrer' : 'Ajouter'}</button>
        </div>
      </form>`;
  },

  async submit(e, id) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      if (id) {
        await api.put(`/finance/${id}`, data);
        Toast.show('Transaction modifiée');
      } else {
        await api.post('/finance', data);
        Toast.show('Transaction ajoutée');
      }
      Modal.close();
      await this.load();
      this.render();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  async remove(id) {
    if (!confirm('Supprimer cette transaction ?')) return;
    await api.del(`/finance/${id}`);
    this.data = this.data.filter(t => t.id !== id);
    this.render();
    Toast.show('Transaction supprimée');
  }
};
