// ── Recherches — split view : clients à gauche, propositions à droite ─────────
const Recherches = {
  clients:        [],
  proposals:      {},  // { [client_id]: [proposal, …] }
  allProps:       [],  // biens CRM pour le picker optionnel
  selectedId:     null,
  _pendingPhotos: [],
  _propPickerData: [],

  STATUSES: [
    { key: 'Envoyé',        labelFR: 'Envoyé',        labelEN: 'Sent',           icon: '<i class=ico-send></i>', color: '#4F6BED' },
    { key: 'Intéressé',     labelFR: 'Intéressé',     labelEN: 'Interested',     icon: '<i class=ico-thumbs-up></i>', color: '#0F9F8A' },
    { key: 'Pas intéressé', labelFR: 'Pas intéressé', labelEN: 'Not interested', icon: '<i class=ico-thumbs-down></i>', color: '#9A9490' },
    { key: 'Visite',        labelFR: 'Visite',        labelEN: 'Viewing',        icon: '<i class=ico-home></i>', color: '#9B59B6' },
    { key: 'Loué',          labelFR: 'Loué',          labelEN: 'Rented',         icon: '<i class=ico-check-circle></i>', color: '#00A35A' },
  ],

  _t(fr, en) { return (typeof getLang === 'function' && getLang() === 'en') ? en : fr; },
  _isEN()    { return typeof getLang === 'function' && getLang() === 'en'; },
  _users: [],

  async init() {
    document.getElementById('content').innerHTML = '<p class="spinner">Loading…</p>';
    this._animNext = true;
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
  FUNNEL: ['Envoyé', 'Intéressé', 'Visite', 'Loué'],
  _st(key) { return this.STATUSES.find(x => x.key === key) || this.STATUSES[0]; },
  _stLabel(s) { return this._isEN() ? s.labelEN : s.labelFR; },
  _segs(pct, n, color, delay) {
    return typeof Clients !== 'undefined' ? Clients._segs(pct, n, color, delay) : '';
  },
  // Étape la plus avancée atteinte par un client (0 = rien proposé … 4 = loué)
  _progress(props) {
    let best = 0;
    props.forEach(p => { const i = this.FUNNEL.indexOf(p.status) + 1; if (i > best) best = i; });
    return best;
  },

  render() {
    const anim = this._animNext; this._animNext = false;
    const allP     = this.clients.flatMap(c => this.proposals[c.id] || []);
    const total    = allP.length;
    const pending  = allP.filter(p => p.status === 'Envoyé').length;
    const positive = allP.filter(p => ['Intéressé', 'Visite', 'Loué'].includes(p.status)).length;
    const visits   = allP.filter(p => p.status === 'Visite').length;
    const noProp   = this.clients.filter(c => !(this.proposals[c.id] || []).length).length;
    const rate     = total ? Math.round(positive / total * 100) : 0;
    const ic = n => `<i class=ico-${n}></i>`;
    const count = v => `<span class="fin-count" data-v="${v}">${v}</span>`;
    const kpi = (i, icon, label, tag, value, caption, extra = '') => `
      <article class="fin-kpi fin-in" style="--i:${i}">
        <div class="fin-kpi-top"><span class="fin-caption">${icon}${label}</span>${tag}</div>
        <div class="fin-kpi-row"><span class="fin-kpi-num">${value}</span>${extra}</div>
        <span class="fin-caption fin-subtle">${caption}</span>
      </article>`;

    document.getElementById('content').innerHTML = `
      <div class="rc-root${anim ? '' : ' cl-static'}">
        <div class="db-head fin-in">
          <div>
            <div class="fin-caption db-date">Pipeline</div>
            <h2 class="db-hello">${this._t('Recherches', 'Searches')}</h2>
          </div>
          <div class="header-actions fin-actions">
            <button class="fin-ctl fin-ctl-primary" onclick="Recherches.openAddClientModal()">${typeof FIN_ICONS !== 'undefined' ? FIN_ICONS.plus : '+ '}${this._t('Ajouter un client', 'Add client')}</button>
          </div>
        </div>

        <div class="fin-kpis">
          ${kpi(1, ic('user-search'), this._t('Clients en recherche', 'Active searches'),
            noProp ? `<span class="fin-tag fin-tag-down">${noProp} ${this._t('sans proposition', 'without proposal')}</span>` : '',
            count(this.clients.length), this._t('recherche active en ce moment', 'currently searching'))}
          ${kpi(2, ic('home'), this._t('Biens proposés', 'Properties proposed'), '',
            count(total), this.clients.length ? `${(total / this.clients.length).toFixed(1).replace('.', ',')} ${this._t('par client en moyenne', 'per client on average')}` : '—')}
          ${kpi(3, ic('hourglass'), this._t('En attente de réponse', 'Awaiting reply'),
            visits ? `<span class="fin-tag fin-tag-up">${visits} ${this._t(visits > 1 ? 'visites' : 'visite', visits > 1 ? 'viewings' : 'viewing')}</span>` : '',
            count(pending), this._t('biens envoyés sans retour du client', 'sent, no client feedback yet'))}
          ${kpi(4, ic('thumbs-up'), this._t('Retours positifs', 'Positive feedback'),
            `<span class="fin-tag fin-tag-neutral">${positive} / ${total}</span>`,
            `${count(rate)}<span class="fin-cur">%</span>`, this._t('intéressé, visite ou loué', 'interested, viewing or rented'),
            `<span class="cl-kpi-bar">${this._segs(rate, 10, 'var(--fin-trend)', 300)}</span>`)}
        </div>

        <div class="rc-split">
          <aside class="fin-panel rc-list fin-in" style="--i:5">
            <div class="fin-panel-head"><h3 class="fin-eyebrow">${this._t('Clients', 'Clients')}</h3><span class="fin-caption fin-subtle">${this.clients.length}</span></div>
            <div class="rc-rows">
              ${this.clients.length
                ? this.clients.map(c => this.clientRowHTML(c)).join('')
                : `<p class="db-empty">${this._t('Aucun client en recherche active.', 'No active search clients.')}</p>`}
            </div>
          </aside>
          <section class="rc-detail fin-in" style="--i:6">
            ${this.selectedId && this.clients.find(c => c.id === this.selectedId)
              ? this.detailPanelHTML()
              : `<div class="fin-panel"><p class="db-empty">${this._t('Sélectionne un client.', 'Select a client.')}</p></div>`}
          </section>
        </div>
      </div>`;
    if (anim && typeof Finance !== 'undefined') Finance.afterRender();
  },

  // ── Ligne client (liste de gauche) ────────────────────────────────────────
  clientRowHTML(c) {
    const props   = this.proposals[c.id] || [];
    const pending = props.filter(p => p.status === 'Envoyé').length;
    const step    = this._progress(props);
    const st      = step ? this._st(this.FUNNEL[step - 1]) : null;
    const budget  = c.budget_max ? Number(c.budget_max).toLocaleString('fr-FR') + ' ฿' : null;
    const zone    = c.zones ? (typeof trZone === 'function' ? trZone(c.zones) : c.zones) : null;
    const urg     = typeof Clients !== 'undefined' ? Clients._urg(c) : null;

    return `
      <button type="button" class="rc-row${c.id === this.selectedId ? ' on' : ''}"
        onclick="Recherches.selectClient(${c.id})" oncontextmenu="Recherches._ctxMenu(${c.id},event)">
        <span class="rc-row-top">
          <span class="rc-row-name">${c.name}</span>
          ${urg ? `<span class="rc-row-urg" style="color:${urg.color}">${urg.label}</span>` : ''}
        </span>
        <span class="rc-row-meta">${[budget, zone].filter(Boolean).join(' · ') || '—'}</span>
        <span class="rc-row-prog">
          ${this._segs(step / 4 * 100, 4, st ? st.color : 'var(--fin-track)')}
          <span>${props.length
            ? `${props.length} ${this._t(props.length > 1 ? 'biens' : 'bien', props.length > 1 ? 'properties' : 'property')} · ${pending ? `${pending} ${this._t('en attente', 'pending')}` : this._stLabel(st || this._st('Pas intéressé'))}`
            : this._t('Rien proposé', 'Nothing proposed')}</span>
        </span>
      </button>`;
  },

  selectClient(id) {
    this.selectedId = id;
    this.render();
  },

  // ── Fiche de recherche (droite) ───────────────────────────────────────────
  detailPanelHTML() {
    const c = this.clients.find(x => x.id === this.selectedId);
    if (!c) return '';
    const props = this.proposals[c.id] || [];
    const isEN  = this._isEN();
    const T     = v => (typeof tr === 'function' ? tr(v) : v);
    const urg   = typeof Clients !== 'undefined' ? Clients._urg(c) : null;
    const pot   = typeof Clients !== 'undefined' ? Clients._potential(c) : null;
    const zone  = c.zones ? (typeof trZone === 'function' ? trZone(c.zones) : c.zones) : null;
    const phone = (c.whatsapp || '').replace(/\D/g, '');

    const cell = (label, value, sub = '') => `
      <div class="rc-crit">
        <span class="fin-caption fin-subtle">${label}</span>
        <span class="rc-crit-val">${value}</span>
        ${sub ? `<span class="rc-crit-sub">${sub}</span>` : ''}
      </div>`;
    const dash = '<span class="fin-subtle">—</span>';

    const counts = this.STATUSES.map(s => ({ ...s, n: props.filter(p => p.status === s.key).length }));

    return `
      <div class="fin-panel rc-fiche">
        <div class="rc-fiche-head">
          <div class="rc-fiche-id">
            <h3 class="rc-fiche-name">${c.name}</h3>
            <div class="rc-fiche-sub">${zone ? `<i class=ico-pin></i> ${zone}` : this._t('Zone non précisée', 'No area specified')}</div>
          </div>
          <div class="rc-fiche-actions">
            ${phone ? `<a class="fin-ctl" href="https://wa.me/${phone}" target="_blank" rel="noopener"><i class=ico-message></i>WhatsApp</a>` : ''}
            <button class="fin-ctl" onclick="Recherches.openClientDetail(${c.id})">${isEN ? 'Profile' : 'Fiche client'}</button>
            <button class="fin-ctl fin-ctl-primary" onclick="Recherches.openProposeModal(${c.id})">${typeof FIN_ICONS !== 'undefined' ? FIN_ICONS.plus : '+ '}${this._t('Proposer un bien', 'Propose a property')}</button>
          </div>
        </div>

        <div class="rc-crits">
          ${cell('Budget', c.budget_max ? `${Number(c.budget_max).toLocaleString('fr-FR')} ฿` : dash,
            c.budget_eur ? `${Number(c.budget_eur).toLocaleString('fr-FR')} € ${this._t('par mois', 'per month')}` : '')}
          ${cell('Type', c.property_type ? T(c.property_type) : dash, c.bedrooms ? `${c.bedrooms} ${isEN ? 'bedroom(s)' : 'chambre(s)'}` : '')}
          ${cell(isEN ? 'Move-in' : 'Arrivée', urg ? urg.date : dash, urg ? `<span style="color:${urg.color};font-weight:600">${urg.label}</span>` : '')}
          ${cell(isEN ? 'Duration' : 'Durée', c.duration ? T(c.duration) : dash,
            pot && pot.total ? `<span class="cl-pot" title="${Clients._potTitle(c)}">+${Math.round(pot.total).toLocaleString('fr-FR')} € ${this._t('potentiel', 'potential')}</span>` : '')}
        </div>

        ${c.criteria ? `<p class="rc-quote">${c.criteria}</p>` : ''}
      </div>

      <div class="fin-panel rc-props">
        <div class="fin-panel-head">
          <h3 class="fin-eyebrow">${this._t('Biens proposés', 'Properties proposed')}</h3>
          <span class="fin-caption fin-subtle">${props.length}</span>
        </div>
        ${props.length ? `
          <div class="rc-funnel">
            ${counts.map((s, i) => `
              <div class="rc-funnel-step${s.n ? '' : ' off'}">
                <span class="rc-funnel-top"><span class="db-dot" style="background:${s.color}"></span>${this._stLabel(s)}<b>${s.n}</b></span>
                ${this._segs(s.n / props.length * 100, 10, s.color, 250 + i * 80)}
              </div>`).join('')}
          </div>
          <div class="rc-cards">${props.map(p => this.proposalCardHTML(p)).join('')}</div>`
        : `<div class="rc-empty">
             <i class=ico-home></i>
             <strong>${this._t('Aucun bien proposé pour l\'instant', 'No property proposed yet')}</strong>
             <span>${this._t('Envoie une première sélection à ce client.', 'Send this client a first selection.')}</span>
             <button class="fin-ctl" onclick="Recherches.openProposeModal(${c.id})">${this._t('Proposer un bien', 'Propose a property')}</button>
           </div>`}
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
    const s      = this._st(p.status);
    const title  = p.property_title || p.properties?.title || '—';
    const sub    = [
      p.properties?.zone,
      p.properties?.price ? Number(p.properties.price).toLocaleString('fr-FR') + ' ฿/mois' : null,
    ].filter(Boolean).join(' · ');
    const photos = Array.isArray(p.photos) ? p.photos : [];
    const createdAv = this._userAv(p.created_by, 20);
    const updatedAv = (p.status_updated_by && p.status_updated_by !== p.created_by) ? this._userAv(p.status_updated_by, 20) : '';
    const when = p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '') : '';

    return `
      <article class="rc-card">
        ${photos.length
          ? `<div class="rc-card-photo">
               <img src="${photos[0]}" alt="" onclick="Recherches.viewPhoto('${p.id}',0)">
               ${photos.length > 1 ? `<span class="rc-card-more">+${photos.length - 1}</span>` : ''}
             </div>`
          : `<div class="rc-card-photo rc-card-nophoto"><i class=ico-home></i></div>`}
        <div class="rc-card-body">
          <div class="rc-card-top">
            <div class="rc-card-id">
              <span class="rc-card-title">${title}</span>
              ${sub ? `<span class="rc-card-sub">${sub}</span>` : ''}
            </div>
            <select class="rc-status" style="--c:${s.color}" onchange="Recherches.updateStatus('${p.id}', this.value, this)" aria-label="Statut">
              ${this.STATUSES.map(st =>
                `<option value="${st.key}" ${p.status === st.key ? 'selected' : ''}>${this._stLabel(st)}</option>`
              ).join('')}
            </select>
          </div>
          ${p.notes ? `<p class="rc-card-note">${p.notes}</p>` : ''}
          <div class="rc-card-foot">
            <span class="rc-card-by">${updatedAv || createdAv}${p.created_by ? `${this._t('Envoyé par', 'Sent by')} ${p.created_by}` : ''}${when ? ` · ${when}` : ''}</span>
            <span class="rc-card-actions">
              ${p.property_url ? `<a class="fin-ctl fin-ctl-ghost" href="${p.property_url}" target="_blank" rel="noopener"><i class=ico-link></i>${this._t("Annonce", 'Listing')}</a>` : ''}
              <button class="fin-icon-btn fin-icon-btn-danger" onclick="Recherches.deleteProposal('${p.id}')" title="${this._t('Supprimer', 'Delete')}">${typeof FIN_ICONS !== 'undefined' ? FIN_ICONS.trash : '✕'}</button>
            </span>
          </div>
        </div>
      </article>`;
  },

  // ── Visionneuse photos ────────────────────────────────────────────────────
  viewPhoto(proposalId, index) {
    const p = Object.values(this.proposals).flat().find(x => String(x.id) === String(proposalId));
    if (!p) return;
    const photos = Array.isArray(p.photos) ? p.photos : [];
    if (!photos[index]) return;
    Modal.open('Photo', `
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

    Modal.open(`Proposer un bien — ${client?.name || ''}`, `
      <div class="form-row">
        <label style="font-weight:600"><i class=ico-home></i> Depuis votre CRM</label>
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
          <i class=ico-camera></i> Ajouter des photos
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
            `<option value="${s.key}">${s.key}</option>`
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
    if (selectEl) selectEl.style.setProperty('--c', s.color);
    try {
      const updatedBy = (typeof App !== 'undefined' && App.user?.name) || null;
      await api.patch(`/proposals/${id}/status`, { status });
      Object.values(this.proposals).flat().forEach(p => {
        if (String(p.id) === String(id)) {
          p.status = status;
          if (updatedBy) p.status_updated_by = updatedBy;
        }
      });
      this.render();   // met à jour les chiffres clés, la liste et l'entonnoir
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
      { key: 'recherche_lancee', label: isEN ? '<i class=ico-search></i> Search active' : '<i class=ico-search></i> Recherche lancée', color: '#1D9E75' },
      { key: 'en_attente',       label: isEN ? '<i class=ico-pause></i> On hold'        : '<i class=ico-pause></i> En attente',        color: '#9B59B6' },
      { key: 'signe',            label: isEN ? '<i class=ico-check-circle></i> Signed'         : '<i class=ico-check-circle></i> Signé',             color: '#888780' },
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
    detailBtn.innerHTML = `<i class=ico-user></i> ${isEN ? 'View profile' : 'Voir la fiche'}`;
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
