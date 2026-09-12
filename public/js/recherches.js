// ── Recherches — suivi des biens proposés par client ─────────────────────────
const Recherches = {
  clients:   [],   // clients en Recherche active
  proposals: {},   // { [client_id]: [proposal, …] }
  allProps:  [],   // biens DB pour le picker
  _propPickerData: [],

  STATUSES: [
    { key: 'Envoyé',        icon: '📤', color: '#3B82F6' },
    { key: 'Intéressé',     icon: '👍', color: '#22C55E' },
    { key: 'Pas intéressé', icon: '👎', color: '#6B7280' },
    { key: 'Visite',        icon: '🏠', color: '#8B5CF6' },
    { key: 'Loué',          icon: '✅', color: '#16A34A' },
  ],

  async init() {
    document.getElementById('content').innerHTML = '<p class="spinner">Loading…</p>';
    try {
      const [allClients, allProposals, allProps] = await Promise.all([
        api.get('/clients?archived=0'),
        api.get('/proposals'),
        api.get('/properties?archived=false'),
      ]);
      this.clients  = allClients.filter(c => c.status === 'Recherche active');
      this.allProps = allProps;
      this.proposals = {};
      allProposals.forEach(p => {
        if (!this.proposals[p.client_id]) this.proposals[p.client_id] = [];
        this.proposals[p.client_id].push(p);
      });
    } catch {
      Toast.show('Erreur de chargement', 'error');
      return;
    }
    this.render();
  },

  render() {
    const allP   = Object.values(this.proposals).flat();
    const total  = allP.length;
    const pending = allP.filter(p => p.status === 'Envoyé').length;

    document.getElementById('content').innerHTML = `
      <div style="padding:24px;max-width:860px">

        <!-- Header -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px">
          <h1 style="font-size:22px;font-weight:700;margin:0">🔍 Recherches</h1>
        </div>
        <div style="font-size:13px;color:var(--text-3);margin-bottom:24px;display:flex;gap:16px;flex-wrap:wrap">
          <span>${this.clients.length} client${this.clients.length !== 1 ? 's' : ''} en recherche active</span>
          <span>·</span>
          <span>${total} bien${total !== 1 ? 's' : ''} proposé${total !== 1 ? 's' : ''}</span>
          ${pending ? `<span>·</span><span style="color:#EA580C;font-weight:600">${pending} en attente de retour</span>` : ''}
        </div>

        <!-- Cartes clients -->
        <div style="display:flex;flex-direction:column;gap:14px">
          ${this.clients.length
            ? this.clients.map(c => this.clientCardHTML(c)).join('')
            : '<p style="color:var(--text-3);font-size:14px">Aucun client en recherche active.<br>Change le statut d\'un client en "Recherche active" dans la section Clients.</p>'
          }
        </div>
      </div>`;
  },

  clientCardHTML(c) {
    const props = this.proposals[c.id] || [];
    const pending = props.filter(p => p.status === 'Envoyé').length;

    const meta = [
      c.budget_max ? `💰 ${Number(c.budget_max).toLocaleString('fr-FR')} ฿${c.budget_eur ? ' · ' + Number(c.budget_eur).toLocaleString('fr-FR') + ' €' : ''}/mois` : null,
      c.zones        ? `📍 ${c.zones}` : null,
      c.property_type ? `🏠 ${c.property_type}${c.bedrooms ? ' · ' + c.bedrooms + ' ch.' : ''}` : null,
      c.move_in_date  ? `📅 ${fmtDate(c.move_in_date)}` : null,
    ].filter(Boolean);

    return `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden">

        <!-- En-tête client (cliquable → fiche client) -->
        <div onclick="Recherches.openClientDetail(${c.id})"
          style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:12px;cursor:pointer;transition:background .12s"
          onmouseenter="this.style.background='var(--surface-2,#1a1a1a)'"
          onmouseleave="this.style.background=''">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
              <span style="font-size:16px;font-weight:700">${c.name}</span>
              ${pending ? `<span style="font-size:11px;background:#EA580C22;color:#EA580C;padding:2px 7px;border-radius:99px">${pending} en attente</span>` : ''}
              ${props.length && !pending ? `<span style="font-size:11px;background:#22C55E22;color:#22C55E;padding:2px 7px;border-radius:99px">✓ Tous traités</span>` : ''}
            </div>
            ${meta.length ? `<div style="display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:var(--text-2)">${meta.map(m => `<span>${m}</span>`).join('')}</div>` : ''}
            ${c.criteria ? `<div style="font-size:12px;color:var(--text-3);margin-top:6px;font-style:italic">"${c.criteria}"</div>` : ''}
          </div>
          <span style="font-size:12px;color:var(--text-3);flex-shrink:0">Voir fiche →</span>
        </div>

        <!-- Liste des propositions -->
        <div style="padding:12px 20px">
          ${props.length
            ? props.map(p => this.proposalRowHTML(p)).join('')
            : '<p style="font-size:12px;color:var(--text-3);margin:4px 0 10px">Aucun bien proposé pour l\'instant.</p>'
          }
          <button onclick="Recherches.openProposeModal(${c.id})"
            style="margin-top:10px;font-size:12px;color:var(--gold,#d4a853);background:none;border:1px dashed var(--gold,#d4a853);border-radius:8px;padding:6px 0;cursor:pointer;width:100%;opacity:.75;transition:opacity .15s"
            onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='.75'">
            + Proposer un bien
          </button>
        </div>
      </div>`;
  },

  proposalRowHTML(p) {
    const s = this.STATUSES.find(x => x.key === p.status) || this.STATUSES[0];
    const title = p.properties?.title || '—';
    const sub   = [
      p.properties?.zone,
      p.properties?.price ? Number(p.properties.price).toLocaleString('fr-FR') + ' ฿/mois' : null,
    ].filter(Boolean).join(' · ');

    // Options de statut colorées
    const opts = this.STATUSES.map(st =>
      `<option value="${st.key}" ${p.status === st.key ? 'selected' : ''}>${st.icon} ${st.key}</option>`
    ).join('');

    return `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500">${title}</div>
          ${sub ? `<div style="font-size:11px;color:var(--text-3)">${sub}</div>` : ''}
          ${p.notes ? `<div style="font-size:11px;color:var(--text-2);margin-top:3px">💬 ${p.notes}</div>` : ''}
        </div>
        <select
          onchange="Recherches.updateStatus('${p.id}', this.value, this)"
          style="font-size:11px;padding:3px 7px;border:1px solid ${s.color};border-radius:6px;background:${s.color}18;color:${s.color};cursor:pointer;outline:none;flex-shrink:0;max-width:140px">
          ${opts}
        </select>
        <button onclick="Recherches.deleteProposal('${p.id}')"
          style="background:none;border:none;cursor:pointer;color:var(--text-3);font-size:15px;padding:1px 4px;flex-shrink:0" title="Supprimer">✕</button>
      </div>`;
  },

  // ── Fiche client (modal partagée avec Clients) ────────────────────────────
  openClientDetail(id) {
    const c = this.clients.find(x => x.id === id);
    if (!c) return;
    if (typeof Clients !== 'undefined') {
      if (!Clients.data.find(x => x.id === id)) Clients.data.push(c);
      else Clients.data = Clients.data.map(x => x.id === id ? c : x);
      Clients.openDetailModal(id);
    }
  },

  // ── Modal "Proposer un bien" ──────────────────────────────────────────────
  openProposeModal(clientId) {
    const client = this.clients.find(c => c.id === clientId);
    this._propPickerData = this.allProps;

    Modal.open(`📤 Proposer un bien — ${client?.name || ''}`, `
      <div class="form-row" style="position:relative">
        <label>Bien immobilier</label>
        <input id="prop-search" placeholder="Rechercher par titre ou zone…"
          oninput="Recherches._filterProps(this.value)" autocomplete="off"
          style="width:100%">
        <div id="prop-results" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:50;background:var(--surface);border:1px solid var(--border);border-radius:8px;max-height:200px;overflow-y:auto;box-shadow:0 4px 16px #0006"></div>
        <input type="hidden" id="prop-selected-id">
        <div id="prop-selected-label" style="font-size:12px;color:#22C55E;margin-top:5px;display:none"></div>
      </div>
      <div class="form-row">
        <label>Note (optionnel)</label>
        <input id="prop-note" placeholder="Ex : correspond au budget, belle vue piscine…">
      </div>
      <div class="form-row">
        <label>Statut initial</label>
        <select id="prop-status">
          ${this.STATUSES.filter(s => s.key !== 'Loué').map(s =>
            `<option value="${s.key}">${s.icon} ${s.key}</option>`
          ).join('')}
        </select>
      </div>
      <button class="btn btn-primary" onclick="Recherches._submitPropose(${clientId})" style="width:100%;margin-top:4px">Enregistrer</button>
    `);
  },

  _filterProps(q) {
    const res = document.getElementById('prop-results');
    if (!q || q.length < 1) { res.style.display = 'none'; return; }
    const lq = q.toLowerCase();
    const matches = this._propPickerData
      .filter(p => (p.title || '').toLowerCase().includes(lq) || (p.zone || '').toLowerCase().includes(lq))
      .slice(0, 8);
    if (!matches.length) { res.style.display = 'none'; return; }
    res.innerHTML = matches.map(p => `
      <div onclick="Recherches._selectProp(${p.id}, \`${(p.title || '').replace(/`/g, '\\`')}\`)"
        style="padding:9px 14px;cursor:pointer;border-bottom:1px solid var(--border)"
        onmouseenter="this.style.background='var(--surface-2,#1a1a1a)'" onmouseleave="this.style.background=''">
        <div style="font-size:13px;font-weight:500">${p.title}</div>
        <div style="font-size:11px;color:var(--text-3)">${[p.zone, p.price ? Number(p.price).toLocaleString('fr-FR') + ' ฿/mois' : null].filter(Boolean).join(' · ')}</div>
      </div>`).join('');
    res.style.display = 'block';
  },

  _selectProp(id, title) {
    document.getElementById('prop-selected-id').value = id;
    document.getElementById('prop-search').value = title;
    document.getElementById('prop-results').style.display = 'none';
    const lbl = document.getElementById('prop-selected-label');
    lbl.textContent = `✓ ${title}`;
    lbl.style.display = 'block';
  },

  async _submitPropose(clientId) {
    const property_id = Number(document.getElementById('prop-selected-id')?.value);
    const notes  = document.getElementById('prop-note')?.value?.trim() || null;
    const status = document.getElementById('prop-status')?.value || 'Envoyé';
    if (!property_id) return Toast.show('Sélectionne un bien dans la liste', 'error');
    try {
      const p = await api.post('/proposals', { client_id: clientId, property_id, notes, status });
      if (!this.proposals[clientId]) this.proposals[clientId] = [];
      this.proposals[clientId].unshift(p);
      Modal.close();
      Toast.show('✓ Bien proposé');
      this.render();
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  // ── Mise à jour statut ────────────────────────────────────────────────────
  async updateStatus(id, status, selectEl) {
    const s = this.STATUSES.find(x => x.key === status) || this.STATUSES[0];
    if (selectEl) {
      selectEl.style.borderColor = s.color;
      selectEl.style.background  = s.color + '18';
      selectEl.style.color       = s.color;
    }
    try {
      await api.patch(`/proposals/${id}/status`, { status });
      Object.values(this.proposals).flat().forEach(p => { if (String(p.id) === String(id)) p.status = status; });
      // Re-render header stats only (avoids flickering the whole page)
      this.render();
    } catch { Toast.show('Erreur mise à jour', 'error'); }
  },

  // ── Suppression ───────────────────────────────────────────────────────────
  async deleteProposal(id) {
    if (!confirm('Supprimer cette proposition ?')) return;
    try {
      await api.del(`/proposals/${id}`);
      Object.keys(this.proposals).forEach(cid => {
        this.proposals[cid] = this.proposals[cid].filter(p => String(p.id) !== String(id));
      });
      Toast.show('Proposition supprimée');
      this.render();
    } catch (err) { Toast.show(err.message, 'error'); }
  },
};
