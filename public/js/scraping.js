const Scraping = {
  data: [],
  filter: 'new',

  async init() {},

  async load() {
    const q = this.filter === 'all' ? '/scraping' : `/scraping?status=${this.filter}`;
    this.data = await api.get(q);
  },

  render() {
    const el = document.getElementById('content');
    const total = { new: 0, seen: 0, archived: 0 };
    this.data.forEach(d => { if (total[d.status] !== undefined) total[d.status]++; });

    el.innerHTML = `
      <div class="page-header">
        <h1>🕵️ Scraping Facebook</h1>
        <span style="color:var(--text-3);font-size:13px">${this.data.length} annonce${this.data.length > 1 ? 's' : ''}</span>
      </div>
      <div class="scraping-filters">
        <button class="btn ${this.filter === 'new'      ? 'btn-primary' : 'btn-ghost'}" onclick="Scraping._setFilter('new')">🆕 Nouveaux <span class="scraping-badge">${total.new}</span></button>
        <button class="btn ${this.filter === 'seen'     ? 'btn-primary' : 'btn-ghost'}" onclick="Scraping._setFilter('seen')">👁 Vus <span class="scraping-badge">${total.seen}</span></button>
        <button class="btn ${this.filter === 'archived' ? 'btn-primary' : 'btn-ghost'}" onclick="Scraping._setFilter('archived')">🗑 Archivés <span class="scraping-badge">${total.archived}</span></button>
        <button class="btn btn-ghost" onclick="Scraping._setFilter('all')">Tous</button>
      </div>
      <div class="scraping-grid">
        ${this.data.length === 0
          ? `<p style="color:var(--text-3);padding:24px">Aucune annonce.</p>`
          : this.data.map(d => this._cardHTML(d)).join('')}
      </div>`;
  },

  _cardHTML(d) {
    const photos = (() => { try { return JSON.parse(d.photos || '[]'); } catch { return []; } })();
    const photo  = photos[0] || '';
    const price  = d.price ? `${Number(d.price).toLocaleString('fr-FR')} ฿` : '—';
    const date   = d.scraped_at ? new Date(d.scraped_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '';
    const chips  = [
      d.bedrooms     ? `🛏 ${d.bedrooms}`      : '',
      d.sqm          ? `📐 ${d.sqm} m²`        : '',
      d.floor        ? `🏢 Ét. ${d.floor}`      : '',
      d.transport    ? `🚇 ${d.transport}`      : '',
      d.min_lease    ? `⏱ ${d.min_lease}`       : '',
      d.transaction  ? (d.transaction === 'vente' ? '🏷 Vente' : '🔑 Location') : '',
      d.poster_status === 'owner' ? '👤 Proprio' : d.poster_status === 'agent' ? '🏢 Agent' : '',
    ].filter(Boolean);

    return `
      <div class="scraping-card status-${d.status}${d.active === false ? ' inactive' : ''}">
        ${photo
          ? `<img class="scraping-photo" src="${photo}" loading="lazy" onerror="this.style.display='none'">`
          : '<div class="scraping-photo-empty">📷</div>'}
        <div class="scraping-body">
          <div class="scraping-title">${d.title || 'Sans titre'}</div>
          <div class="scraping-price">${price}${d.zone ? ` · 📍 ${d.zone}` : ''}</div>
          ${chips.length ? `<div class="scraping-chips">${chips.map(c => `<span class="scraping-chip">${c}</span>`).join('')}</div>` : ''}
          ${d.description ? `<div class="scraping-desc">${d.description.substring(0, 130)}${d.description.length > 130 ? '…' : ''}</div>` : ''}
          ${d.contact ? `<div class="scraping-contact">📞 ${d.contact}</div>` : ''}
          <div class="scraping-footer">
            <span class="scraping-date">${date}${d.active === false ? ' · <span style="color:#EF4444">Hors ligne</span>' : ''}</span>
            <div class="scraping-actions">
              ${d.url ? `<a href="${d.url}" target="_blank" class="btn btn-ghost btn-sm">🔗</a>` : ''}
              ${d.status !== 'seen'     ? `<button class="btn btn-ghost btn-sm" onclick="Scraping._setStatus('${d.id}','seen')" title="Marquer vu">👁</button>` : ''}
              ${d.status !== 'archived' ? `<button class="btn btn-ghost btn-sm" onclick="Scraping._setStatus('${d.id}','archived')" title="Archiver">🗑</button>` : ''}
            </div>
          </div>
        </div>
      </div>`;
  },

  async _setStatus(id, status) {
    await api.patch(`/scraping/${id}/status`, { status });
    await this.load();
    this.render();
  },

  async _setFilter(f) {
    this.filter = f;
    await this.load();
    this.render();
  },
};
