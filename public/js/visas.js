// ── Visas — kanban 3 colonnes ──────────────────────────────────────────────
const Visas = {
  data: [],

  COLS: [
    { key: 'À contacter',              label: 'À contacter',                 icon: 'phone',  color: '#4F6BED', hint: 'Premier contact à passer' },
    { key: 'Envoyé à Manass',          label: 'Envoyé à Manass',             icon: 'send',   color: '#C9922A', hint: 'Dossier transmis, en cours' },
    { key: 'Payé (en attente de com)', label: 'Payé, commission en attente', icon: 'wallet', color: '#00A35A', hint: 'Le client a payé, commission à recevoir' },
  ],

  async init() {
    document.getElementById('content').innerHTML = '<p class="spinner">Chargement…</p>';
    this._animNext = true;
    await this.load();
    this.render();
  },

  async load() {
    this.data = await api.get('/visas');
  },

  _colOf(v) { return this.COLS.find(c => c.key === v.status) || this.COLS[0]; },
  _segs(pct, n, color, delay) { return typeof Clients !== 'undefined' ? Clients._segs(pct, n, color, delay) : ''; },
  _ago(v) {
    if (!v.created_at) return '';
    const n = Math.floor((Date.now() - new Date(v.created_at)) / 86400000);
    if (isNaN(n)) return '';
    if (n <= 0) return "aujourd'hui";
    if (n < 60) return `il y a ${n} j`;
    return `il y a ${Math.round(n / 30)} mois`;
  },

  render() {
    const anim = this._animNext; this._animNext = false;
    const byCol = {};
    this.COLS.forEach(c => { byCol[c.key] = []; });
    this.data.forEach(v => { byCol[this._colOf(v).key].push(v); });
    const total = this.data.length;
    const count = v => `<span class="fin-count" data-v="${v}">${v}</span>`;
    const kpi = (i, icon, label, tag, value, caption, extra = '') => `
      <article class="fin-kpi fin-in" style="--i:${i}">
        <div class="fin-kpi-top"><span class="fin-caption"><i class=ico-${icon}></i>${label}</span>${tag}</div>
        <div class="fin-kpi-row"><span class="fin-kpi-num">${value}</span>${extra}</div>
        <span class="fin-caption fin-subtle">${caption}</span>
      </article>`;

    document.getElementById('content').innerHTML = `
      <div class="vs-root${anim ? '' : ' cl-static'}">
        <div class="db-head fin-in">
          <div>
            <div class="fin-caption db-date">Finance &amp; Admin</div>
            <h2 class="db-hello">Visas</h2>
          </div>
          <div class="header-actions fin-actions">
            <button class="fin-ctl fin-ctl-primary" onclick="Visas.openAdd()">${typeof FIN_ICONS !== 'undefined' ? FIN_ICONS.plus : '+ '}Nouveau visa</button>
          </div>
        </div>

        <div class="fin-kpis">
          ${kpi(1, 'passport', 'Dossiers visa', '', count(total), total ? 'tous statuts confondus' : 'aucun dossier pour le moment')}
          ${this.COLS.map((c, i) => {
            const n = byCol[c.key].length;
            return kpi(i + 2, c.icon, c.label,
              total ? `<span class="fin-tag fin-tag-neutral">${Math.round(n / total * 100)} %</span>` : '',
              count(n), c.hint,
              `<span class="cl-kpi-bar">${this._segs(total ? n / total * 100 : 0, 10, c.color, 300 + i * 80)}</span>`);
          }).join('')}
        </div>

        <div class="vs-board fin-in" style="--i:6">
          ${this.COLS.map(col => `
            <div class="vs-col" data-status="${col.key}"
              ondragover="Visas.onDragOver(event)" ondragleave="Visas.onDragLeave(event)" ondrop="Visas.onDrop(event)">
              <div class="vs-col-head">
                <span class="cl-col-title"><span class="db-dot" style="background:${col.color}"></span>${col.label}</span>
                <span class="cl-col-count">${byCol[col.key].length}</span>
              </div>
              <div class="vs-col-body">
                ${byCol[col.key].length
                  ? byCol[col.key].map(v => this.cardHTML(v)).join('')
                  : `<div class="vs-empty">Aucun dossier ici</div>`}
              </div>
            </div>`).join('')}
        </div>
      </div>`;
    if (anim && typeof Finance !== 'undefined') Finance.afterRender();
  },

  cardHTML(v) {
    const col   = this._colOf(v);
    const phone = (v.phone || '').replace(/\D/g, '');
    const ago   = this._ago(v);
    return `
      <article class="vs-card" draggable="true" data-id="${v.id}"
        ondragstart="Visas.onDragStart(event, ${v.id})" ondragend="Visas.onDragEnd(event)">
        <div class="vs-card-top">
          <span class="vs-card-name">${v.name}</span>
          ${ago ? `<span class="vs-card-ago">${ago}</span>` : ''}
        </div>
        ${v.phone ? `<div class="vs-card-phone"><i class=ico-smartphone></i>${v.phone}</div>` : ''}
        ${v.notes ? `<p class="vs-card-notes">${v.notes}</p>` : ''}
        <div class="vs-card-foot">
          <select class="rc-status" style="--c:${col.color}" onchange="Visas.moveCard(${v.id}, this.value)" aria-label="Statut">
            ${this.COLS.map(c => `<option value="${c.key}" ${c.key === col.key ? 'selected' : ''}>${c.label}</option>`).join('')}
          </select>
          <span class="vs-card-actions">
            ${phone ? `<a class="fin-icon-btn" href="https://wa.me/${phone}" target="_blank" rel="noopener" title="WhatsApp"><i class=ico-message></i></a>` : ''}
            <button class="fin-icon-btn" onclick="Visas.openEdit(${v.id})" title="Modifier"><i class=ico-pencil></i></button>
            <button class="fin-icon-btn fin-icon-btn-danger" onclick="Visas.remove(${v.id})" title="Supprimer"><i class=ico-trash></i></button>
          </span>
        </div>
      </article>`;
  },

  // ── Glisser-déposer entre colonnes ────────────────────────────────────────
  onDragStart(e, id) { e.dataTransfer.setData('visaId', id); e.currentTarget.classList.add('dragging'); },
  onDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.vs-col').forEach(c => c.classList.remove('drag-over'));
  },
  onDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); },
  onDragLeave(e) { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('drag-over'); },
  async onDrop(e) {
    e.preventDefault();
    const col = e.currentTarget;
    col.classList.remove('drag-over');
    const id = Number(e.dataTransfer.getData('visaId'));
    const v = this.data.find(x => x.id === id);
    if (!v || this._colOf(v).key === col.dataset.status) return;
    try { await this.moveCard(id, col.dataset.status); }
    catch { Toast.show('Erreur lors du déplacement', 'error'); }
  },

  async moveCard(id, status) {
    await api.patch(`/visas/${id}/status`, { status });
    const v = this.data.find(x => x.id === id);
    if (v) v.status = status;
    this.render();
  },

  openAdd()    { Modal.open('Nouveau visa',   this.formHTML(null)); },
  openEdit(id) {
    const v = this.data.find(x => x.id === id);
    if (v) Modal.open('Modifier le visa', this.formHTML(v));
  },
  closeModal() { Modal.close(); },

  formHTML(v) {
    const isEdit = !!v;
    return `
      <div class="form-row">
        <label>Nom *</label>
        <input id="vf-name" type="text" value="${v?.name || ''}" placeholder="Prénom Nom">
      </div>
      <div class="form-row">
        <label>Téléphone</label>
        <input id="vf-phone" type="text" value="${v?.phone || ''}" placeholder="+66…">
      </div>
      <div class="form-row">
        <label>Statut</label>
        <select id="vf-status">
          ${this.COLS.map(c => `<option value="${c.key}" ${v?.status === c.key ? 'selected' : ''}>${c.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <label>Notes</label>
        <textarea id="vf-notes" rows="3" placeholder="Remarques, documents…">${v?.notes || ''}</textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" onclick="Modal.close()">Annuler</button>
        <button class="btn btn-primary" onclick="Visas.save(${v?.id || 'null'})">${isEdit ? 'Enregistrer' : 'Créer'}</button>
      </div>`;
  },

  async save(id) {
    const name   = document.getElementById('vf-name')?.value.trim();
    const phone  = document.getElementById('vf-phone')?.value.trim();
    const status = document.getElementById('vf-status')?.value;
    const notes  = document.getElementById('vf-notes')?.value.trim();
    if (!name) { Toast.show('Le nom est obligatoire', 'error'); return; }
    try {
      if (id) {
        const updated = await api.put(`/visas/${id}`, { name, phone, notes, status });
        const i = this.data.findIndex(x => x.id === id);
        if (i !== -1) this.data[i] = updated;
      } else {
        const created = await api.post('/visas', { name, phone, notes, status });
        this.data.unshift(created);
      }
      this.closeModal();
      this.render();
    } catch { Toast.show('Erreur lors de la sauvegarde', 'error'); }
  },

  async remove(id) {
    if (!confirm('Supprimer ce visa ?')) return;
    await api.del(`/visas/${id}`);
    this.data = this.data.filter(x => x.id !== id);
    this.render();
  },
};
