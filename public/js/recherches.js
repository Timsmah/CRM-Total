// ── Recherches — split view : clients à gauche, propositions à droite ─────────
const Recherches = {
  clients:        [],
  proposals:      {},  // { [client_id]: [proposal, …] }
  allProps:       [],  // biens CRM pour le picker optionnel
  selectedId:     null,
  _pendingPhotos: [],
  _propPickerData: [],

  STATUSES: [
    { key: 'Envoyé',        labelFR: 'Envoyé',        labelEN: 'Sent',           icon: '📤', color: '#3B82F6' },
    { key: 'Intéressé',     labelFR: 'Intéressé',     labelEN: 'Interested',     icon: '👍', color: '#22C55E' },
    { key: 'Pas intéressé', labelFR: 'Pas intéressé', labelEN: 'Not interested', icon: '👎', color: '#6B7280' },
    { key: 'Visite',        labelFR: 'Visite',        labelEN: 'Viewing',        icon: '🏠', color: '#8B5CF6' },
    { key: 'Loué',          labelFR: 'Loué',          labelEN: 'Rented',         icon: '✅', color: '#16A34A' },
  ],

  _t(fr, en) { return (typeof getLang === 'function' && getLang() === 'en') ? en : fr; },
  _isEN()    { return typeof getLang === 'function' && getLang() === 'en'; },

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
      if (!this.selectedId && this.clients.length) this.selectedId = this.clients[0].id;
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
      <div style="display:flex;flex-direction:column;height:calc(100vh - 0px);overflow:hidden">

        <!-- Barre du haut -->
        <div style="padding:18px 24px 14px;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;gap:16px">
          <div>
            <h1 style="font-size:20px;font-weight:700;margin:0 0 2px">🔍 ${this._t('Recherches','Searches')}</h1>
            <div style="font-size:12px;color:var(--text-3);display:flex;gap:12px">
              <span>${this.clients.length} ${this._t('clients actifs','active clients')}</span>
              <span>·</span>
              <span>${total} ${this._t(total !== 1 ? 'biens proposés' : 'bien proposé', total !== 1 ? 'properties proposed' : 'property proposed')}</span>
              ${pending ? `<span>·</span><span style="color:#EA580C;font-weight:600">${pending} ${this._t('en attente','pending')}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Split -->
        <div style="display:flex;flex:1;overflow:hidden">

          <!-- Gauche : liste clients -->
          <div style="width:240px;flex-shrink:0;border-right:1.5px solid var(--border);overflow-y:auto;background:var(--surface-2,#fff)">
            ${this.clients.length
              ? this.clients.map(c => this.clientRowHTML(c)).join('')
              : `<p style="padding:16px;font-size:13px;color:var(--text-3)">${this._t('Aucun client en recherche active.','No active search clients.')}</p>`
            }
          </div>

          <!-- Droite : détail -->
          <div style="flex:1;overflow-y:auto;background:var(--surface-1)">
            ${this.selectedId ? this.detailPanelHTML() : `<p style="padding:24px;font-size:13px;color:var(--text-3)">${this._t('Sélectionne un client.','Select a client.')}</p>`}
          </div>

        </div>
      </div>`;
  },

  // ── Ligne client (sidebar gauche) ─────────────────────────────────────────
  clientRowHTML(c) {
    const props    = this.proposals[c.id] || [];
    const pending  = props.filter(p => p.status === 'Envoyé').length;
    const isActive = c.id === this.selectedId;
    const budget   = c.budget_max ? Number(c.budget_max).toLocaleString('fr-FR') + ' ฿' : null;
    const zone     = c.zones ? (typeof trZone === 'function' ? trZone(c.zones) : c.zones) : null;

    return `
      <div onclick="Recherches.selectClient(${c.id})"
        style="padding:9px 12px 9px 10px;cursor:pointer;border-bottom:0.5px solid var(--border);
               background:${isActive ? 'var(--surface-1)' : 'transparent'};
               border-left:3px solid ${isActive ? '#d4a853' : 'transparent'};
               transition:background .12s">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:2px">
          <span style="font-size:12.5px;font-weight:${isActive ? '600' : '500'};color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name}</span>
          ${pending
            ? `<span style="flex-shrink:0;font-size:10px;font-weight:600;background:#EA580C18;color:#EA580C;padding:1px 7px;border-radius:99px">${pending} att.</span>`
            : props.length
              ? `<span style="flex-shrink:0;font-size:10px;background:#22C55E18;color:#16a34a;padding:1px 6px;border-radius:99px">✓ ${props.length}</span>`
              : ''}
        </div>
        <div style="font-size:10.5px;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.75">
          ${[budget, zone].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>`;
  },

  selectClient(id) {
    this.selectedId = id;
    this.render();
  },

  // ── Panneau droit ─────────────────────────────────────────────────────────
  detailPanelHTML() {
    const c = this.clients.find(x => x.id === this.selectedId);
    if (!c) return '';
    const props = this.proposals[c.id] || [];

    const isEN = typeof getLang === 'function' && getLang() === 'en';
    const bdSuffix  = isEN ? ' bd.' : ' ch.';
    const seeFiche  = isEN ? 'View profile →' : 'Voir fiche →';

    const meta = [
      c.budget_max
        ? `💰 ${Number(c.budget_max).toLocaleString('fr-FR')} ฿${c.budget_eur ? ' · ' + Number(c.budget_eur).toLocaleString('fr-FR') + ' €' : ''}/mois`
        : null,
      c.zones         ? `📍 ${typeof trZone === 'function' ? trZone(c.zones) : c.zones}` : null,
      c.property_type ? `🏠 ${typeof tr === 'function' ? tr(c.property_type) : c.property_type}${c.bedrooms ? ' · ' + c.bedrooms + bdSuffix : ''}` : null,
      c.move_in_date  ? `📅 ${fmtDate(c.move_in_date)}` : null,
    ].filter(Boolean);

    // Mini-cards critères
    const cards = [
      c.budget_max ? { label: 'Budget', val: `${Number(c.budget_max).toLocaleString('fr-FR')} ฿/mois` } : null,
      (c.property_type || c.bedrooms) ? { label: 'Type', val: `${c.property_type ? (typeof tr === 'function' ? tr(c.property_type) : c.property_type) : ''}${c.bedrooms ? ' · ' + c.bedrooms + bdSuffix : ''}` } : null,
      c.move_in_date  ? { label: isEN ? 'Move-in' : 'Arrivée', val: fmtDate(c.move_in_date) } : null,
      c.duration      ? { label: isEN ? 'Duration' : 'Durée',  val: typeof tr === 'function' ? tr(c.duration) : c.duration } : null,
    ].filter(Boolean);

    return `
      <div style="max-width:720px;padding:20px 24px">

        <!-- Header client -->
        <div style="background:var(--surface-2,#fff);border:0.5px solid var(--border);border-radius:12px;padding:16px 18px;margin-bottom:16px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:${cards.length || c.criteria ? '12px' : '0'}">
            <div>
              <h2 style="font-size:17px;font-weight:700;margin:0 0 4px">${c.name}</h2>
              ${c.zones ? `<div style="font-size:12px;color:var(--text-2)">📍 ${typeof trZone === 'function' ? trZone(c.zones) : c.zones}</div>` : ''}
              ${c.criteria ? `<div style="font-size:12px;color:var(--text-3);margin-top:5px;font-style:italic">"${c.criteria}"</div>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
              ${c.budget_max ? `<span style="font-size:12px;font-weight:700;background:#FFF7ED;color:#C2410C;border:1px solid #FED7AA;border-radius:7px;padding:4px 10px">${Number(c.budget_max).toLocaleString('fr-FR')} ฿/mois</span>` : ''}
              <button onclick="Recherches.openClientDetail(${c.id})"
                style="font-size:11px;color:var(--text-3);background:none;border:1px solid var(--border);border-radius:7px;padding:4px 10px;cursor:pointer;white-space:nowrap">
                ${seeFiche}
              </button>
            </div>
          </div>
          ${cards.length > 1 ? `
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${cards.filter((_,i) => i > 0).map(card => `
              <div style="background:var(--surface-1);border:0.5px solid var(--border);border-radius:8px;padding:6px 12px;min-width:80px">
                <div style="font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--text-3);margin-bottom:2px">${card.label}</div>
                <div style="font-size:12px;font-weight:600;color:var(--text)">${card.val}</div>
              </div>`).join('')}
          </div>` : ''}
        </div>

        <!-- Propositions -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <span style="font-size:13px;font-weight:600;color:var(--text)">
            ${props.length} ${this._t(props.length !== 1 ? 'biens proposés' : 'bien proposé', props.length !== 1 ? 'properties proposed' : 'property proposed')}
          </span>
          <button onclick="Recherches.openProposeModal(${c.id})"
            style="font-size:12px;color:var(--gold,#d4a853);background:none;border:1px solid var(--gold,#d4a853);border-radius:8px;padding:5px 14px;cursor:pointer;transition:opacity .15s"
            onmouseenter="this.style.opacity='.7'" onmouseleave="this.style.opacity='1'">
            + ${this._t('Proposer un bien','Propose a property')}
          </button>
        </div>

        ${props.length
          ? props.map(p => this.proposalCardHTML(p)).join('')
          : `<div style="padding:32px;text-align:center;color:var(--text-3);font-size:13px;border:1px dashed var(--border);border-radius:12px;background:var(--surface-2,#fff)">
               ${this._t('Aucun bien proposé encore.','No property proposed yet.')}<br>
               <span style="font-size:12px">${this._t('Clique sur "+ Proposer un bien" pour commencer.','Click on "+ Propose a property" to get started.')}</span>
             </div>`
        }
      </div>`;
  },

  // ── Helper avatar mini par nom d'utilisateur ─────────────────────────────
  _userAv(name, size = 22) {
    if (!name) return '';
    const palette = {
      Tim:     { bg: '#EEEDFE', color: '#3C3489' },
      Nono:    { bg: '#E1F5EE', color: '#085041' },
      Chompoo: { bg: '#FAEEDA', color: '#633806' },
    };
    const col = palette[name] || { bg: '#E6F1FB', color: '#0C447C' };
    return `<div title="${name}" style="width:${size}px;height:${size}px;border-radius:50%;background:${col.bg};color:${col.color};font-size:${Math.round(size*0.42)}px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">${name[0]?.toUpperCase()||'?'}</div>`;
  },

  // ── Carte proposition ─────────────────────────────────────────────────────
  proposalCardHTML(p) {
    const s      = this.STATUSES.find(x => x.key === p.status) || this.STATUSES[0];
    const title  = p.property_title || p.properties?.title || '—';
    const sub    = [
      p.properties?.zone,
      p.properties?.price ? Number(p.properties.price).toLocaleString('fr-FR') + ' ฿/mois' : null,
    ].filter(Boolean).join(' · ');
    const photos = Array.isArray(p.photos) ? p.photos : [];

    // Avatar de qui a envoyé et qui a changé le statut (si différent)
    const createdAv = this._userAv(p.created_by);
    const updatedAv = (p.status_updated_by && p.status_updated_by !== p.created_by) ? this._userAv(p.status_updated_by) : '';

    return `
      <div style="background:var(--surface-2,#fff);border:0.5px solid var(--border);border-radius:12px;margin-bottom:10px;overflow:hidden">
        <div style="display:flex;align-items:flex-start;gap:12px;padding:14px">

          <!-- Photos -->
          ${photos.length ? `
            <div style="display:flex;gap:5px;flex-shrink:0">
              ${photos.slice(0, 3).map((ph, i) => `
                <img src="${ph}" onclick="Recherches.viewPhoto('${p.id}',${i})"
                  style="width:${photos.length === 1 ? '80' : '56'}px;height:${photos.length === 1 ? '80' : '56'}px;object-fit:cover;border-radius:8px;cursor:pointer;border:0.5px solid var(--border)">
              `).join('')}
            </div>` : `
            <div style="width:48px;height:48px;border-radius:8px;background:var(--surface-1);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">🏠</div>`
          }

          <!-- Infos -->
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
              <div>
                <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:3px">${title}</div>
                ${sub ? `<div style="font-size:12px;color:var(--text-3)">${sub}</div>` : ''}
              </div>
              <!-- Statut + avatar dernière action -->
              <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
                ${updatedAv || createdAv}
                <select onchange="Recherches.updateStatus('${p.id}', this.value, this)"
                  style="font-size:11px;padding:4px 8px;border:1px solid ${s.color};border-radius:7px;background:${s.color}18;color:${s.color};cursor:pointer;outline:none">
                  ${this.STATUSES.map(st =>
                    `<option value="${st.key}" ${p.status === st.key ? 'selected' : ''}>${st.icon} ${this._isEN() ? st.labelEN : st.labelFR}</option>`
                  ).join('')}
                </select>
              </div>
            </div>

            <div style="display:flex;align-items:center;gap:12px;margin-top:8px;flex-wrap:wrap">
              ${p.property_url
                ? `<a href="${p.property_url}" target="_blank" rel="noopener"
                    style="font-size:12px;color:var(--gold,#d4a853);text-decoration:none">🔗 ${this._t("Voir l'annonce",'View listing')}</a>`
                : ''}
              ${p.notes ? `<span style="font-size:12px;color:var(--text-2)">💬 ${p.notes}</span>` : ''}
              ${p.created_by ? `<span style="font-size:11px;color:var(--text-3)">${this._t('Envoyé par','Sent by')} <strong>${p.created_by}</strong></span>` : ''}
              <button onclick="Recherches.deleteProposal('${p.id}')"
                style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--text-3);font-size:13px;padding:2px 4px" title="Supprimer">✕</button>
            </div>
          </div>
        </div>
      </div>`;
  },

  // ── Visionneuse photos ────────────────────────────────────────────────────
  viewPhoto(proposalId, index) {
    const p = Object.values(this.proposals).flat().find(x => String(x.id) === String(proposalId));
    if (!p) return;
    const photos = Array.isArray(p.photos) ? p.photos : [];
    if (!photos[index]) return;
    Modal.open('📷 Photo', `
      <div style="text-align:center">
        <img src="${photos[index]}" style="max-width:100%;max-height:65vh;border-radius:8px;object-fit:contain;display:block;margin:0 auto">
        ${photos.length > 1 ? `
          <div style="display:flex;justify-content:center;gap:8px;margin-top:14px">
            ${photos.map((ph, i) => `
              <img src="${ph}" onclick="Recherches.viewPhoto('${proposalId}',${i})"
                style="width:52px;height:52px;object-fit:cover;border-radius:7px;cursor:pointer;border:2px solid ${i === index ? '#d4a853' : 'var(--border)'}">
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
        <input id="p-title" placeholder="Ex : Studio Thong Lo 45m², appt FB Asoke…">
      </div>
      <div class="form-row">
        <label>Lien <span style="font-size:11px;color:var(--text-3)">(Facebook, LINE, DDproperty…)</span></label>
        <input id="p-url" type="url" placeholder="https://…">
      </div>
      <div class="form-row">
        <label>Photos <span style="font-size:11px;color:var(--text-3)">max 3</span></label>
        <label style="display:inline-flex;align-items:center;gap:7px;cursor:pointer;font-size:12px;color:var(--text-2);border:1px dashed var(--border);border-radius:8px;padding:6px 14px;margin-bottom:10px">
          📷 Ajouter des photos
          <input type="file" accept="image/*" multiple style="display:none" onchange="Recherches._addPhotos(this)">
        </label>
        <div id="p-photos-preview" style="display:flex;gap:8px;flex-wrap:wrap"></div>
      </div>
      <div class="form-row">
        <label>Note</label>
        <textarea id="p-note" rows="2" placeholder="Correspond au budget, belle vue piscine…" style="resize:vertical"></textarea>
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
        <summary style="cursor:pointer;font-size:12px;color:var(--text-3);padding:4px 0;list-style:none">🏠 Lier à un bien du CRM (optionnel)</summary>
        <div style="margin-top:8px;position:relative">
          <input id="p-crm-search" placeholder="Rechercher par titre ou zone…" oninput="Recherches._filterProps(this.value)" autocomplete="off">
          <div id="prop-results" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:50;background:var(--surface);border:1px solid var(--border);border-radius:8px;max-height:160px;overflow-y:auto;box-shadow:0 4px 16px #0006"></div>
          <input type="hidden" id="prop-selected-id">
          <div id="prop-selected-label" style="font-size:11px;color:#22C55E;margin-top:4px;display:none"></div>
        </div>
      </details>
      <button class="btn btn-primary" onclick="Recherches._submitPropose(${clientId})" style="width:100%">Enregistrer</button>
    `);
  },

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
        <img src="${ph.dataUrl}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--border);display:block">
        <button onclick="Recherches._removePhoto(${ph.uid})"
          style="position:absolute;top:-7px;right:-7px;background:#EF4444;border:none;border-radius:50%;width:20px;height:20px;color:#fff;font-size:12px;cursor:pointer;line-height:1;padding:0;display:flex;align-items:center;justify-content:center">✕</button>
      </div>`).join('');
  },

  _removePhoto(uid) {
    this._pendingPhotos = this._pendingPhotos.filter(p => p.uid !== uid);
    this._renderPhotoPreviews();
  },

  _filterProps(q) {
    const res = document.getElementById('prop-results');
    if (!q) { res.style.display = 'none'; return; }
    const lq = q.toLowerCase();
    const matches = this._propPickerData
      .filter(p => (p.title||'').toLowerCase().includes(lq) || (p.zone||'').toLowerCase().includes(lq))
      .slice(0, 8);
    if (!matches.length) { res.style.display = 'none'; return; }
    res.innerHTML = matches.map(p => `
      <div onclick="Recherches._selectProp(${p.id}, \`${(p.title||'').replace(/`/g,'\\`')}\`)"
        style="padding:9px 14px;cursor:pointer;border-bottom:1px solid var(--border)"
        onmouseenter="this.style.background='var(--surface-2,#1a1a1a)'" onmouseleave="this.style.background=''">
        <div style="font-size:13px;font-weight:500">${p.title}</div>
        <div style="font-size:11px;color:var(--text-3)">${[p.zone, p.price ? Number(p.price).toLocaleString('fr-FR')+' ฿/mois':null].filter(Boolean).join(' · ')}</div>
      </div>`).join('');
    res.style.display = 'block';
  },

  _selectProp(id, title) {
    document.getElementById('prop-selected-id').value = id;
    document.getElementById('p-crm-search').value     = title;
    document.getElementById('prop-results').style.display = 'none';
    const lbl = document.getElementById('prop-selected-label');
    lbl.textContent = `✓ ${title}`;
    lbl.style.display = 'block';
  },

  async _submitPropose(clientId) {
    const title       = document.getElementById('p-title')?.value?.trim();
    const url         = document.getElementById('p-url')?.value?.trim()  || null;
    const notes       = document.getElementById('p-note')?.value?.trim() || null;
    const status      = document.getElementById('p-status')?.value       || 'Envoyé';
    const property_id = Number(document.getElementById('prop-selected-id')?.value) || null;
    const photos      = this._pendingPhotos.map(p => p.dataUrl);
    if (!title) return Toast.show('Donne un titre au bien', 'error');
    try {
      const p = await api.post('/proposals', { client_id: clientId, property_id, property_title: title, property_url: url, photos, notes, status });
      if (!this.proposals[clientId]) this.proposals[clientId] = [];
      this.proposals[clientId].unshift(p);
      this._pendingPhotos = [];
      Modal.close();
      Toast.show('✓ Bien proposé');
      this.render();
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  async updateStatus(id, status, selectEl) {
    const s = this.STATUSES.find(x => x.key === status) || this.STATUSES[0];
    if (selectEl) {
      selectEl.style.borderColor = s.color;
      selectEl.style.background  = s.color + '18';
      selectEl.style.color       = s.color;
    }
    try {
      const updatedBy = (typeof App !== 'undefined' && App.user?.name) || null;
      await api.patch(`/proposals/${id}/status`, { status });
      Object.values(this.proposals).flat().forEach(p => {
        if (String(p.id) === String(id)) {
          p.status = status;
          if (updatedBy) p.status_updated_by = updatedBy;
        }
      });
      // Rafraîchir sidebar (badges en attente)
      document.querySelectorAll('#content [onclick^="Recherches.selectClient"]').forEach(el => {
        const cid = parseInt(el.getAttribute('onclick').match(/\d+/)[0]);
        const c = this.clients.find(x => x.id === cid);
        if (c) el.outerHTML = this.clientRowHTML(c);
      });
    } catch { Toast.show('Erreur mise à jour', 'error'); }
  },

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
