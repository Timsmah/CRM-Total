const Contracts = {
  data: [], clients: [], properties: [],
  filterStatus: 'active', // 'active' | 'expiring' | 'expired' | 'all'

  async init() {
    document.getElementById('content').innerHTML = '<p class="spinner">Loading…</p>';
    try {
      [this.data, this.clients, this.properties] = await Promise.all([
        api.get('/deals'),
        api.get('/clients?archived=false'),
        api.get('/properties?archived=false'),
      ]);
      this.render();
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  daysLeft(lease_end) {
    if (!lease_end) return null;
    return Math.ceil((new Date(lease_end) - new Date()) / 86400000);
  },

  urgencyColor(days) {
    if (days === null) return { bg: '#F3F4F6', text: '#6B7280', label: '—' };
    if (days < 0)  return { bg: '#FEF2F2', text: '#DC2626', label: 'Expiré' };
    if (days <= 30) return { bg: '#FEF2F2', text: '#DC2626', label: `${days}j` };
    if (days <= 90) return { bg: '#FEF3C7', text: '#D97706', label: `${days}j` };
    return { bg: '#F0FDF4', text: '#16A34A', label: `${days}j` };
  },

  filtered() {
    const today = new Date(); today.setHours(0,0,0,0);
    return this.data.filter(d => {
      const days = this.daysLeft(d.lease_end);
      if (this.filterStatus === 'active')   return days !== null && days >= 0;
      if (this.filterStatus === 'expiring') return days !== null && days >= 0 && days <= 60;
      if (this.filterStatus === 'expired')  return days !== null && days < 0;
      return true;
    }).sort((a, b) => {
      const da = this.daysLeft(a.lease_end) ?? 9999;
      const db_ = this.daysLeft(b.lease_end) ?? 9999;
      return da - db_;
    });
  },

  render() {
    const list = this.filtered();
    const counts = {
      active:   this.data.filter(d => { const d2 = this.daysLeft(d.lease_end); return d2 !== null && d2 >= 0; }).length,
      expiring: this.data.filter(d => { const d2 = this.daysLeft(d.lease_end); return d2 !== null && d2 >= 0 && d2 <= 60; }).length,
      expired:  this.data.filter(d => { const d2 = this.daysLeft(d.lease_end); return d2 !== null && d2 < 0; }).length,
    };

    document.getElementById('content').innerHTML = `
      <div class="section-header">
        <h2>📋 Contracts</h2>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="Contracts.openAddModal()">+ New contract</button>
        </div>
      </div>

      <div class="filter-bar" style="margin-bottom:20px">
        <button class="pill ${this.filterStatus==='active'?'active':''}" onclick="Contracts.setFilter('active')">
          Active <span class="kanban-count">${counts.active}</span>
        </button>
        <button class="pill ${this.filterStatus==='expiring'?'active':''}" onclick="Contracts.setFilter('expiring')">
          ⚠️ Expiring &lt;60d <span class="kanban-count">${counts.expiring}</span>
        </button>
        <button class="pill ${this.filterStatus==='expired'?'active':''}" onclick="Contracts.setFilter('expired')">
          Expired <span class="kanban-count">${counts.expired}</span>
        </button>
        <button class="pill ${this.filterStatus==='all'?'active':''}" onclick="Contracts.setFilter('all')">
          All <span class="kanban-count">${this.data.length}</span>
        </button>
      </div>

      <div class="contracts-list">
        ${list.length ? list.map(d => this.cardHTML(d)).join('') : '<p class="empty" style="padding:40px;text-align:center;color:var(--text-3)">No contracts found</p>'}
      </div>`;
  },

  cardHTML(d) {
    const days = this.daysLeft(d.lease_end);
    const { bg, text, label } = this.urgencyColor(days);
    const propName = d.property_title || d.property_custom || '—';
    const rent = d.monthly_rent || d.property_price;
    const commFmt = d.commission_amount ? Number(d.commission_amount).toLocaleString('fr-FR') + ' ฿' : '—';

    return `
      <div class="contract-card">
        <div class="contract-days" style="background:${bg};color:${text}">
          <span class="contract-days-num">${label}</span>
          <span class="contract-days-label">${days !== null && days >= 0 ? 'remaining' : days < 0 ? '' : ''}</span>
        </div>
        <div class="contract-body">
          <div class="contract-title">
            <span class="contract-client">${d.client_name || '—'}</span>
            <span style="color:var(--text-3);margin:0 6px">→</span>
            <span class="contract-property">${propName}</span>
            ${d.property_zone ? `<span class="contract-zone">· ${d.property_zone}</span>` : ''}
          </div>
          <div class="contract-meta">
            ${d.lease_start ? `📅 ${fmtDate(d.lease_start)} → ${fmtDate(d.lease_end)}` : '<span style="color:var(--text-3);font-style:italic">No dates set</span>'}
            ${rent ? ` · <strong>${Number(rent).toLocaleString('fr-FR')} ฿/mo</strong>` : ''}
          </div>
          <div class="contract-commission">
            <span>💰 Commission: ${commFmt}</span>
            <button class="comm-badge ${d.commission_paid ? 'paid' : 'unpaid'}"
              onclick="Contracts.toggleCommission(${d.id}, ${d.commission_paid})">
              ${d.commission_paid ? '✅ Paid' : '❌ Unpaid'}
            </button>
          </div>
          ${d.notes ? `<p class="contract-notes">${d.notes}</p>` : ''}
        </div>
        <div class="contract-actions">
          ${badge(d.status)}
          <button class="btn btn-sm btn-secondary" onclick="Contracts.openEditModal(${d.id})">Edit</button>
          <button class="btn btn-sm btn-ghost" onclick="Contracts.renew(${d.id})" title="Renew contract">🔄 Renew</button>
          <button class="btn btn-sm btn-ghost" onclick="Contracts.remove(${d.id})" title="Delete">✕</button>
        </div>
      </div>`;
  },

  // Match typed client name against known clients → populate hidden id
  _matchClient(val) {
    const idInput = document.getElementById('client-id-hidden');
    if (!idInput) return;
    const v = val.toLowerCase().trim();
    const match = this.clients.find(c => c.name.toLowerCase() === v);
    idInput.value = match ? match.id : '';
  },

  // Match typed property name against known properties → populate hidden id
  _matchProp(val) {
    const idInput = document.getElementById('prop-id-hidden');
    if (!idInput) return;
    const v = val.toLowerCase().trim();
    const match = this.properties.find(p => {
      const label = (p.title + (p.zone ? ' — ' + p.zone : '')).toLowerCase();
      return label === v || p.title.toLowerCase() === v;
    });
    idInput.value = match ? match.id : '';
  },

  setFilter(f) { this.filterStatus = f; this.render(); },

  openAddModal()  { Modal.open('New contract', this.formHTML(null)); },
  openEditModal(id) {
    const d = this.data.find(x => x.id === id);
    Modal.open('Edit contract', this.formHTML(d));
  },

  formHTML(d) {
    const statuses = ['En cours','Signé','Annulé','Terminé'];
    return `
      <form onsubmit="Contracts.submit(event, ${d ? d.id : 'null'})">
        <div class="form-row">
          <label>Client</label>
          <input type="text" id="client-name-input" name="client_name" list="client-datalist"
            placeholder="Type or select a client…"
            value="${d?.client_name || ''}"
            autocomplete="off"
            oninput="Contracts._matchClient(this.value)">
          <datalist id="client-datalist">
            ${this.clients.map(c => `<option value="${c.name}"></option>`).join('')}
          </datalist>
          <input type="hidden" name="client_id" id="client-id-hidden" value="${d?.client_id || ''}">
        </div>
        <div class="form-row">
          <label>Property</label>
          <input type="text" id="prop-name-input" name="property_name" list="prop-datalist"
            placeholder="Type or select a property…"
            value="${d?.property_title || d?.property_custom || ''}"
            autocomplete="off"
            oninput="Contracts._matchProp(this.value)">
          <datalist id="prop-datalist">
            ${this.properties.map(p => `<option value="${p.title}${p.zone ? ' — ' + p.zone : ''}"></option>`).join('')}
          </datalist>
          <input type="hidden" name="property_id" id="prop-id-hidden" value="${d?.property_id || ''}">
        </div>
        <div class="form-row">
          <label>Status</label>
          <select name="status">
            ${statuses.map(s => `<option ${d?.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-2">
          <div class="form-row">
            <label>📅 Lease start</label>
            <input type="date" name="lease_start" value="${d?.lease_start||''}">
          </div>
          <div class="form-row">
            <label>📅 Lease end</label>
            <input type="date" name="lease_end" value="${d?.lease_end||''}">
          </div>
        </div>
        <div class="form-2">
          <div class="form-row">
            <label>💰 Monthly rent (฿)</label>
            <input type="number" name="monthly_rent" placeholder="53000" value="${d?.monthly_rent||d?.property_price||''}">
          </div>
          <div class="form-row">
            <label>🏆 Commission (฿)</label>
            <input type="number" name="commission_amount" placeholder="53000" value="${d?.commission_amount||''}">
          </div>
        </div>
        <div class="form-row" style="display:flex;align-items:center;gap:10px">
          <input type="checkbox" name="commission_paid" id="comm-paid" ${d?.commission_paid?'checked':''} style="width:auto">
          <label for="comm-paid" style="margin:0">Commission paid ✅</label>
        </div>
        <div class="form-row">
          <label>Notes</label>
          <textarea name="notes" rows="2">${d?.notes||''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn btn-primary">${d ? 'Save' : 'Create'}</button>
        </div>
      </form>`;
  },

  async submit(e, id) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    fd.commission_paid = !!fd.commission_paid;
    // Client: use matched id if any, otherwise store typed name as client_custom
    if (!fd.client_id) {
      fd.client_custom = fd.client_name || null;
      fd.client_id = null;
    }
    delete fd.client_name;
    // If no matched property_id, store the typed name as custom
    if (!fd.property_id) {
      fd.property_custom = fd.property_name || null;
      fd.property_id = null;
    }
    delete fd.property_name;
    try {
      if (id) { await api.put(`/deals/${id}`, fd); Toast.show('Contract updated'); }
      else     { await api.post('/deals', fd);      Toast.show('Contract created'); }
      Modal.close();
      await this.init();
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  async toggleCommission(id, current) {
    const newVal = !current;
    await api.patch(`/deals/${id}/commission`, { commission_paid: newVal });
    const d = this.data.find(x => x.id === id);
    if (d) d.commission_paid = newVal;
    this.render();
    Toast.show(newVal ? '✅ Commission marked as paid' : '❌ Commission marked as unpaid');
  },

  async renew(id) {
    const d = this.data.find(x => x.id === id);
    if (!d) return;
    // Pre-fill form with same data but new dates (lease_end + 1 year)
    const newStart = d.lease_end || '';
    const newEnd = d.lease_end
      ? new Date(new Date(d.lease_end).setFullYear(new Date(d.lease_end).getFullYear() + 1)).toISOString().split('T')[0]
      : '';
    const clone = { ...d, id: null, lease_start: newStart, lease_end: newEnd, commission_paid: false };
    Modal.open('Renew contract', this.formHTML(clone));
  },

  async remove(id) {
    if (!confirm('Delete this contract?')) return;
    await api.del(`/deals/${id}`);
    this.data = this.data.filter(d => d.id !== id);
    this.render();
    Toast.show('Contract deleted');
  }
};
