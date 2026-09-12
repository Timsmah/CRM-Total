// ── Recherches — suivi des biens proposés par client ─────────────────────────
const Recherches = {
  clients:       [],
  proposals:     {},  // { [client_id]: [proposal, …] }
  allProps:      [],  // biens CRM pour le picker optionnel
  _pendingPhotos: [], // [{ uid, dataUrl }] pendant la saisie
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

  // ── Rendu principal ───────────────────────────────────────────────────────
  render() {
    const allP    = Object.values(this.proposals).flat();
    const total   = allP.length;
    const pending = allP.filter(p => p.status === 'Envoyé').length;

    document.getElementById('content').innerHTML = `
      <div style="padding:24px;max-width:860px">

        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <h1 style="font-size:22px;font-weight:700;margin:0">🔍 Recherches</h1>
        </div>
        <div style="font-size:13px;color:var(--text-3);margin-bottom:24px;display:flex;gap:14px;flex-wrap:wrap">
          <span>${this.clients.length} client${this.clients.length !== 1 ? 's' : ''} en recherche active</span>
          <span>·</span>
          <span>${total} bien${total !== 1 ? 's' : ''} proposé${total !== 1 ? 's' : ''}</span>
          ${pending ? `<span>·</span><span style="color:#EA580C;font-weight:600">${pending} en attente de retour</span>` : ''}
        </div>

        <div style="display:flex;flex-direction:column;gap:16px">
          ${this.clients.length
            ? this.clients.map(c => this.clientCardHTML(c)).join('')
            : `<p style="color:var(--text-3);font-size:14px;line-height:1.6">
                Aucun client en recherche active.<br>
                Passe le statut d'un client en <strong>Recherche active</strong> dans la section Clients.
               </p>`
          }
        </div>
      </div>`;
  },

  // ── Carte client ──────────────────────────────────────────────────────────
  clientCardHTML(c) {
    const props   = this.proposals[c.id] || [];
    const pending = props.filter(p => p.status === 'Envoyé').length;

    const meta = [
      c.budget_max
        ? `💰 ${Number(c.budget_max).toLocaleString('fr-FR')} ฿${c.budget_eur ? ' · ' + Number(c.budget_eur).toLocaleString('fr-FR') + ' €' : ''}/mois`
        : null,
      c.zones         ? `📍 ${c.zones}` : null,
      c.property_type ? `🏠 ${c.property_type}${c.bedrooms ? ' · ' + c.bedrooms + ' ch.' : ''}` : null,
      c.move_in_date  ? `📅 ${fmtDate(c.move_in_date)}` : null,
    ].filter(Boolean);

    return `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden">

        <!-- Header client -->
        <div onclick="Recherches.openClientDetail(${c.id})"
          style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:12px;cursor:pointer;transition:background .12s"
          onmouseenter="this.style.background='var(--surface-2,#1a1a1a)'"
          onmouseleave="this.style.background=''">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
              <span style="font-size:16px;font-weight:700">${c.name}</span>
              ${pending
                ? `<span style="font-size:11px;background:#EA580C22;color:#EA580C;padding:2px 7px;border-radius:99px">${pending} en attente</span>`
                : props.length
                  ? `<span style="font-size:11px;background:#22C55E22;color:#22C55E;padding:2px 7px;border-radius:99px">✓ Tous traités</span>`
                  : ''}
            </div>
            ${meta.length ? `<div style="display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:var(--text-2)">${meta.map(m => `<span>${m}</span>`).join('')}</div>` : ''}
            ${c.criteria ? `<div style="font-size:12px;color:var(--text-3);margin-top:6px;font-style:italic">"${c.criteria}"</div>` : ''}
          </div>
          <span style="font-size:12px;color:var(--text-3);flex-shrink:0">Voir fiche →</span>
        </div>

        <!-- Liste propositions -->
        <div style="padding:12px 20px">
          ${props.length
            ? props.map(p => this.proposalRowHTML(p)).join('')
            : `<p style="font-size:12px;color:var(--text-3);margin:4px 0 10px">Aucun bien proposé pour l'instant.</p>`}
          <button onclick="Recherches.openProposeModal(${c.id})"
            style="margin-top:10px;font-size:12px;color:var(--gold,#d4a853);background:none;border:1px dashed var(--gold,#d4a853);border-radius:8px;padding:7px 0;cursor:pointer;width:100%;opacity:.75;transition:opacity .15s"
            onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='.75'">
            + Proposer un bien
          </button>
        </div>
      </div>`;
  },

  // ── Ligne proposition ─────────────────────────────────────────────────────
  proposalRowHTML(p) {
    const s      = this.STATUSES.find(x => x.key === p.status) || this.STATUSES[0];
    const title  = p.property_title || p.properties?.title || '—';
    const sub    = [
      p.properties?.zone,
      p.properties?.price ? Number(p.properties.price).toLocaleString('fr-FR') + ' ฿/mois' : null,
    ].filter(Boolean).join(' · ');
    const photos = Array.isArray(p.photos) ? p.photos : [];

    return `
      <div style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:flex-start;gap:10px">

          <!-- Miniatures photos -->
          ${photos.length ? `
            <div style="display:flex;flex-direction:column;gap:3px;flex-shrink:0">
              ${photos.slice(0, 3).map((ph, i) => `
                <img src="${ph}"
                  onclick="Recherches.viewPhoto('${p.id}', ${i})"
                  style="width:52px;height:52px;object-fit:cover;border-radius:7px;cursor:pointer;border:1px solid var(--border)">
              `).join('')}
            </div>` : ''}

          <!-- Infos -->
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;margin-bottom:2px">${title}</div>
            ${sub ? `<div style="font-size:11px;color:var(--text-3)">${sub}</div>` : ''}
            ${p.property_url
              ? `<a href="${p.property_url}" target="_blank" rel="noopener"
                  style="font-size:11px;color:var(--gold,#d4a853);text-decoration:none;display:inline-block;margin-top:2px">🔗 Voir l'annonce</a>`
              : ''}
            ${p.notes ? `<div style="font-size:11px;color:var(--text-2);margin-top:4px">💬 ${p.notes}</div>` : ''}
          </div>

          <!-- Statut + supprimer -->
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;margin-top:1px">
            <select onchange="Recherches.updateStatus('${p.id}', this.value, this)"
              style="font-size:11px;padding:3px 7px;border:1px solid ${s.color};border-radius:6px;background:${s.color}18;color:${s.color};cursor:pointer;outline:none;max-width:150px">
              ${this.STATUSES.map(st =>
                `<option value="${st.key}" ${p.status === st.key ? 'selected' : ''}>${st.icon} ${st.key}</option>`
              ).join('')}
            </select>
            <button onclick="Recherches.deleteProposal('${p.id}')"
              title="Supprimer"
              style="background:none;border:none;cursor:pointer;color:var(--text-3);font-size:15px;padding:2px 4px">✕</button>
          </div>
        </div>
      </div>`;
  },

  // ── Visionneuse photo ─────────────────────────────────────────────────────
  viewPhoto(proposalId, index) {
    const p = Object.values(this.proposals).flat().find(x => String(x.id) === String(proposalId));
    if (!p) return;
    const photos = Array.isArray(p.photos) ? p.photos : [];
    const src = photos[index];
    if (!src) return;
    Modal.open('📷 Photo', `
      <div style="text-align:center">
        <img src="${src}" style="max-width:100%;max-height:65vh;border-radius:8px;object-fit:contain;display:block;margin:0 auto">
        ${photos.length > 1 ? `
          <div style="display:flex;justify-content:center;gap:8px;margin-top:14px">
            ${photos.map((ph, i) => `
              <img src="${ph}"
                onclick="Recherches.viewPhoto('${proposalId}', ${i})"
                style="width:52px;height:52px;object-fit:cover;border-radius:7px;cursor:pointer;border:2px solid ${i === index ? 'var(--gold,#d4a853)' : 'var(--border)'}">
            `).join('')}
          </div>` : ''}
      </div>`);
  },

  // ── Fiche client ──────────────────────────────────────────────────────────
  openClientDetail(id) {
    const c = this.clients.find(x => x.id === id);
    if (!c || typeof Clients === 'undefined') return;
    if (!Clients.data.find(x => x.id === id)) Clients.data.push(c);
    else Clients.data = Clients.data.map(x => x.id === id ? c : x);
    Clients.openDetailModal(id);
  },

  // ── Modal "Proposer un bien" ──────────────────────────────────────────────
  openProposeModal(clientId) {
    const client = this.clients.find(c => c.id === clientId);
    this._pendingPhotos  = [];
    this._propPickerData = this.allProps;

    Modal.open(`📤 Proposer un bien — ${client?.name || ''}`, `
      <div class="form-row">
        <label>Titre du bien <span style="color:#EF4444">*</span></label>
        <input id="p-title" placeholder="Ex : Studio Thong Lo 45m², Condo Asoke 2BR…">
      </div>

      <div class="form-row">
        <label>Lien de l'annonce <span style="font-size:11px;color:var(--text-3)">(Facebook, LINE, DDproperty…)</span></label>
        <input id="p-url" type="url" placeholder="https://…">
      </div>

      <div class="form-row">
        <label>Photos <span style="font-size:11px;color:var(--text-3)">max 3 — depuis WhatsApp, galerie, n'importe quoi</span></label>
        <label style="display:inline-flex;align-items:center;gap:7px;cursor:pointer;font-size:12px;color:var(--text-2);border:1px dashed var(--border);border-radius:8px;padding:6px 14px;margin-bottom:10px;transition:border-color .15s"
          onmouseenter="this.style.borderColor='var(--gold,#d4a853)'" onmouseleave="this.style.borderColor='var(--border)'">
          📷 Ajouter des photos
          <input type="file" accept="image/*" multiple style="display:none" onchange="Recherches._addPhotos(this)">
        </label>
        <div id="p-photos-preview" style="display:flex;gap:8px;flex-wrap:wrap;min-height:0"></div>
      </div>

      <div class="form-row">
        <label>Note</label>
        <textarea id="p-note" rows="2"
          placeholder="Correspond au budget, belle vue piscine, proche BTS…"
          style="resize:vertical"></textarea>
      </div>

      <div class="form-row">
        <label>Statut initial</label>
        <select id="p-status">
          ${this.STATUSES.filter(s => s.key !== 'Loué').map(s =>
            `<option value="${s.key}">${s.icon} ${s.key}</option>`
          ).join('')}
        </select>
      </div>

      <details style="margin-bottom:16px">
        <summary style="cursor:pointer;font-size:12px;color:var(--text-3);padding:4px 0;list-style:none">
          🏠 Lier à un bien déjà dans le CRM (optionnel)
        </summary>
        <div style="margin-top:8px;position:relative">
          <input id="p-crm-search" placeholder="Rechercher par titre ou zone…"
            oninput="Recherches._filterProps(this.value)" autocomplete="off">
          <div id="prop-results"
            style="display:none;position:absolute;top:100%;left:0;right:0;z-index:50;background:var(--surface);border:1px solid var(--border);border-radius:8px;max-height:160px;overflow-y:auto;box-shadow:0 4px 16px #0006"></div>
          <input type="hidden" id="prop-selected-id">
          <div id="prop-selected-label" style="font-size:11px;color:#22C55E;margin-top:4px;display:none"></div>
        </div>
      </details>

      <button class="btn btn-primary" onclick="Recherches._submitPropose(${clientId})" style="width:100%">
        Enregistrer
      </button>
    `);
  },

  // ── Gestion photos dans le modal ──────────────────────────────────────────
  _addPhotos(input) {
    const files     = [...input.files];
    const remaining = 3 - this._pendingPhotos.length;
    if (remaining <= 0) { Toast.show('Maximum 3 photos', 'error'); return; }
    files.slice(0, remaining).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max    = 900;
          const ratio  = Math.min(max / img.width, max / img.height, 1);
          canvas.width  = Math.round(img.width  * ratio);
          canvas.height = Math.round(img.height * ratio);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          this._pendingPhotos.push({ uid: Date.now() + Math.random(), dataUrl });
          this._renderPhotoPreviews();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
    input.value = '';
  },

  _renderPhotoPreviews() {
    const c = document.getElementById('p-photos-preview');
    if (!c) return;
    c.innerHTML = this._pendingPhotos.map(ph => `
      <div style="position:relative;display:inline-block">
        <img src="${ph.dataUrl}"
          style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--border);display:block">
        <button onclick="Recherches._removePhoto(${ph.uid})"
          style="position:absolute;top:-7px;right:-7px;background:#EF4444;border:none;border-radius:50%;width:20px;height:20px;color:#fff;font-size:12px;cursor:pointer;line-height:1;padding:0;display:flex;align-items:center;justify-content:center">
          ✕
        </button>
      </div>
    `).join('');
  },

  _removePhoto(uid) {
    this._pendingPhotos = this._pendingPhotos.filter(p => p.uid !== uid);
    this._renderPhotoPreviews();
  },

  // ── Picker bien CRM ───────────────────────────────────────────────────────
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
        onmouseenter="this.style.background='var(--surface-2,#1a1a1a)'"
        onmouseleave="this.style.background=''">
        <div style="font-size:13px;font-weight:500">${p.title}</div>
        <div style="font-size:11px;color:var(--text-3)">
          ${[p.zone, p.price ? Number(p.price).toLocaleString('fr-FR') + ' ฿/mois' : null].filter(Boolean).join(' · ')}
        </div>
      </div>`).join('');
    res.style.display = 'block';
  },

  _selectProp(id, title) {
    document.getElementById('prop-selected-id').value = id;
    document.getElementById('p-crm-search').value     = title;
    document.getElementById('prop-results').style.display = 'none';
    const lbl = document.getElementById('prop-selected-label');
    lbl.textContent  = `✓ ${title}`;
    lbl.style.display = 'block';
  },

  // ── Soumission ────────────────────────────────────────────────────────────
  async _submitPropose(clientId) {
    const title       = document.getElementById('p-title')?.value?.trim();
    const url         = document.getElementById('p-url')?.value?.trim()  || null;
    const notes       = document.getElementById('p-note')?.value?.trim() || null;
    const status      = document.getElementById('p-status')?.value       || 'Envoyé';
    const property_id = Number(document.getElementById('prop-selected-id')?.value) || null;
    const photos      = this._pendingPhotos.map(p => p.dataUrl);

    if (!title) return Toast.show('Donne un titre au bien', 'error');

    try {
      const p = await api.post('/proposals', {
        client_id: clientId,
        property_id,
        property_title: title,
        property_url:   url,
        photos,
        notes,
        status,
      });
      if (!this.proposals[clientId]) this.proposals[clientId] = [];
      this.proposals[clientId].unshift(p);
      this._pendingPhotos = [];
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
      Object.values(this.proposals).flat().forEach(p => {
        if (String(p.id) === String(id)) p.status = status;
      });
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
