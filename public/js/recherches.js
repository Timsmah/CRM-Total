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
  _users: [],

  async init() {
    document.getElementById('content').innerHTML = '<p class="spinner">Loading…</p>';
    try {
      const [allClients, allProposals, allProps, users] = await Promise.all([
        api.get('/clients?archived=0'),
        api.get('/proposals'),
        api.get('/properties?archived=false'),
        api.get('/users').catch(() => []),
      ]);
      this._users = users || [];
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
        <div style="padding:18px 24px 14px;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:16px">
          <div>
            <h1 style="font-size:20px;font-weight:700;margin:0 0 2px">🔍 ${this._t('Recherches','Searches')}</h1>
            <div style="font-size:12px;color:var(--text-3);display:flex;gap:12px">
              <span>${this.clients.length} ${this._t('clients actifs','active clients')}</span>
              <span>·</span>
              <span>${total} ${this._t(total !== 1 ? 'biens proposés' : 'bien proposé', total !== 1 ? 'properties proposed' : 'property proposed')}</span>
              ${pending ? `<span>·</span><span style="color:#EA580C;font-weight:600">${pending} ${this._t('en attente','pending')}</span>` : ''}
            </div>
          </div>
          <button class="btn btn-primary" onclick="Recherches.openAddClientModal()" style="flex-shrink:0">
            + ${this._t('Ajouter un client','Add client')}
          </button>
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
        oncontextmenu="Recherches._ctxMenu(${c.id},event)"
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
    // Vrai avatar depuis cache global App ou cache local
    const user = (typeof App !== 'undefined' && App.getUserByName?.(name))
               || this._users.find(u => u.name === name);
    if (user && typeof avatarHTML === 'function') {
      return `<div title="${name}" style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;display:inline-flex;flex-shrink:0">${avatarHTML(user, size)}</div>`;
    }
    // Fallback initiale colorée
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
  _matchPropsForClient(c, props) {
    const ZONE_ALIASES = { 'thonglhor':'thonglor','thonglor':'thonglor','sathon':'sathorn','silom/sathon':'sathorn','silom':'silom','sathorn':'sathorn','onnut':'onnut','onut':'onnut','phrompong':'phromphong','phromphong':'phromphong','promphong':'phromphong','ekkamai':'ekkamai','asoke':'asoke','ploenchit':'ploenchit','ari':'ari','ratchada':'ratchada','sukhumvit':'sukhumvit' };
    const normZone = z => { const n = (z||'').toLowerCase().replace(/[\s\-_\.]/g,''); return ZONE_ALIASES[n]||n; };
    const NO_PREF  = ['nonprécisé','nonprecise','jesaispasencore','pasencoredécidé',''];
    const budget   = c.budget || c.budget_max;
    const hasZone  = c.zones && !NO_PREF.includes(normZone(c.zones));

    const matched = [], rest = [];
    for (const p of props) {
      const overBudget = budget && p.price && Number(p.price) > Number(budget) + 5000;
      const wrongZone  = hasZone && p.zone && !c.zones.split(/,\s*/).map(z=>normZone(z)).some(z=>z&&(normZone(p.zone).includes(z)||z.includes(normZone(p.zone))));
      if (!overBudget && !wrongZone) matched.push(p);
      else rest.push(p);
    }
    return { matched, rest };
  },

  openProposeModal(clientId) {
    const client = this.clients.find(c => c.id === clientId);
    this._pendingPhotos  = [];
    this._propPickerData = this.allProps;

    // Tri : matching en premier, reste ensuite
    const available = this.allProps.filter(p => (p.status||'').toLowerCase() === 'disponible');
    const others    = this.allProps.filter(p => (p.status||'').toLowerCase() !== 'disponible');
    const { matched, rest } = client ? this._matchPropsForClient(client, available) : { matched: available, rest: [] };

    const hasMatch = matched.length > 0;
    const chipSection = (label, list, accent) => {
      if (!list.length) return '';
      return `<div style="margin-bottom:${accent?'10':'4'}px">
        ${label ? `<div style="font-size:11px;font-weight:600;color:${accent?'var(--accent)':'var(--text-3)'};margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">${label}</div>` : ''}
        <div style="display:flex;flex-direction:column;gap:5px">
          ${list.slice(0,8).map(p => {
            const price = p.price ? Number(p.price).toLocaleString('fr-FR')+' ฿' : '';
            return `<div class="crm-prop-chip" onclick="Recherches._selectProp(${p.id})">
              <span class="crm-prop-chip-title">${p.title||'—'}</span>
              <span class="crm-prop-chip-meta">${[p.zone,price].filter(Boolean).join(' · ')}</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    };

    const chipsHTML = hasMatch
      ? chipSection('✓ Correspondent aux critères', matched, true) + chipSection('Autres biens', rest.slice(0,4), false)
      : chipSection('Tous les biens disponibles', available.slice(0,8), false);

    Modal.open(`📤 Proposer un bien — ${client?.name || ''}`, `
      <div class="form-row">
        <label style="font-weight:600">🏠 Depuis votre CRM</label>
        <div style="position:relative;margin-bottom:8px">
          <input id="p-crm-search" placeholder="Rechercher par titre ou zone…" oninput="Recherches._filterProps(this.value)" autocomplete="off">
          <div id="prop-results" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:50;background:var(--surface);border:1px solid var(--border);border-radius:8px;max-height:160px;overflow-y:auto;box-shadow:0 4px 16px #0006"></div>
        </div>
        <div id="crm-prop-chips">${chipsHTML}</div>
        <input type="hidden" id="prop-selected-id">
        <div id="prop-selected-label" style="font-size:11px;color:#22C55E;margin-top:4px;display:none"></div>
      </div>

      <div style="display:flex;align-items:center;gap:8px;margin:12px 0">
        <div style="flex:1;height:1px;background:var(--border)"></div>
        <span style="font-size:11px;color:var(--text-3)">ou saisir manuellement</span>
        <div style="flex:1;height:1px;background:var(--border)"></div>
      </div>

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
      <div onclick="Recherches._selectProp(${p.id})"
        style="padding:9px 14px;cursor:pointer;border-bottom:1px solid var(--border)"
        onmouseenter="this.style.background='var(--surface-2,#1a1a1a)'" onmouseleave="this.style.background=''">
        <div style="font-size:13px;font-weight:500">${p.title}</div>
        <div style="font-size:11px;color:var(--text-3)">${[p.zone, p.price ? Number(p.price).toLocaleString('fr-FR')+' ฿/mois':null].filter(Boolean).join(' · ')}</div>
      </div>`).join('');
    res.style.display = 'block';
  },

  _selectProp(id) {
    const prop = this._propPickerData.find(p => p.id === id);
    if (!prop) return;
    document.getElementById('prop-selected-id').value    = id;
    document.getElementById('p-crm-search').value        = prop.title || '';
    document.getElementById('prop-results').style.display = 'none';

    // Auto-remplir titre et URL
    const titleEl = document.getElementById('p-title');
    const urlEl   = document.getElementById('p-url');
    if (titleEl && !titleEl.value) titleEl.value = prop.title || '';
    if (urlEl   && !urlEl.value)   urlEl.value   = prop.external_url || '';

    // Highlight la chip sélectionnée
    document.querySelectorAll('.crm-prop-chip').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll(`.crm-prop-chip`).forEach(el => {
      if (el.querySelector('.crm-prop-chip-title')?.textContent === prop.title) el.classList.add('selected');
    });

    const lbl = document.getElementById('prop-selected-label');
    const price = prop.price ? ' · ' + Number(prop.price).toLocaleString('fr-FR') + ' ฿' : '';
    lbl.textContent = `✓ ${prop.title}${prop.zone ? ' · ' + prop.zone : ''}${price}`;
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

  // ── Clic droit sur un client dans la sidebar ────────────────────────────
  _ctxMenu(id, e) {
    e.preventDefault();
    e.stopPropagation();
    document.querySelectorAll('.rech-ctx-menu').forEach(m => m.remove());

    const c = this.clients.find(x => x.id === id);
    if (!c) return;
    const isEN = this._isEN();

    // Statuts suivi disponibles depuis Recherches
    const suiviStatuses = [
      { key: 'recherche_lancee', label: isEN ? '🔍 Search active' : '🔍 Recherche lancée', color: '#1D9E75' },
      { key: 'en_attente',       label: isEN ? '⏸ On hold'        : '⏸ En attente',        color: '#9B59B6' },
      { key: 'signe',            label: isEN ? '✅ Signed'         : '✅ Signé',             color: '#888780' },
      { key: 'a_contacter',      label: isEN ? '↩ Remove from searches' : '↩ Retirer des recherches', color: '#EF9F27' },
    ];

    const menu = document.createElement('div');
    menu.className = 'rech-ctx-menu';
    menu.style.cssText = `position:fixed;z-index:9999;background:var(--surface-2,#fff);border:0.5px solid var(--border);border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.12);padding:5px 0;min-width:190px;font-size:12.5px`;
    menu.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
    menu.style.top  = Math.min(e.clientY, window.innerHeight - 180) + 'px';

    // Titre client
    const title = document.createElement('div');
    title.style.cssText = 'padding:6px 14px 5px;font-weight:600;color:var(--text);border-bottom:0.5px solid var(--border);margin-bottom:3px';
    title.textContent = c.name;
    menu.appendChild(title);

    // Voir la fiche
    const detailBtn = document.createElement('div');
    detailBtn.className = 'rech-ctx-item';
    detailBtn.innerHTML = `👤 ${isEN ? 'View profile' : 'Voir la fiche'}`;
    detailBtn.onclick = () => { menu.remove(); this.openClientDetail(id); };
    menu.appendChild(detailBtn);

    // Séparateur statut
    const sep = document.createElement('div');
    sep.style.cssText = 'padding:4px 14px 3px;font-size:10px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-top:3px;border-top:0.5px solid var(--border)';
    sep.textContent = isEN ? 'Change status' : 'Changer le statut';
    menu.appendChild(sep);

    suiviStatuses.forEach(s => {
      const item = document.createElement('div');
      item.className = 'rech-ctx-item';
      const isCurrent = c.suivi_status === s.key;
      item.innerHTML = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${s.color};margin-right:7px;flex-shrink:0;vertical-align:middle"></span>${s.label}${isCurrent ? ' <span style="opacity:.45;font-size:10px">✓</span>' : ''}`;
      item.onclick = () => { menu.remove(); this._setSuiviStatus(id, s.key); };
      menu.appendChild(item);
    });

    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
  },

  async _setSuiviStatus(id, status) {
    try {
      await api.patch(`/clients/${id}/suivi`, { suivi_status: status });
      const c = this.clients.find(x => x.id === id);
      if (c) c.suivi_status = status;
      // Si on retire des recherches → on le retire de la liste
      if (status === 'a_contacter') {
        this.clients = this.clients.filter(x => x.id !== id);
        if (this.selectedId === id) this.selectedId = this.clients[0]?.id || null;
      }
      this.render();
      const isEN = this._isEN();
      Toast.show(status === 'a_contacter'
        ? (isEN ? 'Client removed from searches' : 'Client retiré des recherches')
        : (isEN ? 'Status updated' : 'Statut mis à jour'));
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  // ── Créer un client directement depuis Recherches ────────────────────────
  openAddClientModal() {
    const isEN = this._isEN();
    const sources = ['Formulaire', 'Instagram DM', 'WhatsApp', 'Référence', 'Autre'];
    Modal.open(isEN ? 'Add client' : 'Nouveau client', `
      <form onsubmit="Recherches._submitAddClient(event)">
        <div class="form-row">
          <label>${isEN ? 'Name' : 'Nom'} *</label>
          <input name="name" required placeholder="${isEN ? 'Full name' : 'Nom complet'}" autofocus>
        </div>
        <div class="form-row">
          <label>WhatsApp</label>
          <input name="whatsapp" placeholder="+66 XX XXX XXXX">
        </div>
        <div class="form-2">
          <div class="form-row">
            <label>${isEN ? 'Budget min' : 'Budget min'} (฿)</label>
            <input name="budget_min" type="number" placeholder="20000">
          </div>
          <div class="form-row">
            <label>${isEN ? 'Budget max' : 'Budget max'} (฿)</label>
            <input name="budget_max" type="number" placeholder="40000">
          </div>
        </div>
        <div class="form-row">
          <label>${isEN ? 'Criteria' : 'Critères'}</label>
          <textarea name="criteria" rows="2" placeholder="2BR, balcon, piscine…"></textarea>
        </div>
        <div class="form-row">
          <label>${isEN ? 'Source' : 'Source'}</label>
          <select name="source">
            ${sources.map(s => `<option>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">${isEN ? 'Cancel' : 'Annuler'}</button>
          <button type="submit" class="btn btn-primary">${isEN ? 'Create & add to searches' : 'Créer et ajouter aux recherches'}</button>
        </div>
      </form>
    `);
  },

  async _submitAddClient(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      name:       fd.get('name'),
      whatsapp:   fd.get('whatsapp') || '',
      budget_min: parseInt(fd.get('budget_min')) || null,
      budget_max: parseInt(fd.get('budget_max')) || null,
      criteria:   fd.get('criteria') || '',
      source:     fd.get('source') || 'Autre',
      status:     'Recherche active',
    };
    try {
      const client = await api.post('/clients', body);
      // Passe directement en recherche_lancee
      await api.patch(`/clients/${client.id}/suivi`, { suivi_status: 'recherche_lancee' });
      client.suivi_status = 'recherche_lancee';
      client.status = 'Recherche active';
      this.clients.push(client);
      this.proposals[client.id] = [];
      this.selectedId = client.id;
      Modal.close();
      this.render();
      Toast.show(this._isEN() ? '✓ Client created' : '✓ Client créé et ajouté aux recherches');
    } catch (err) { Toast.show(err.message, 'error'); }
  },
};
