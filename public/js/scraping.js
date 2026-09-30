const Scraping = {
  data: [],
  filter: 'new',

  async init() {},

  async load() {
    const url = this.filter === 'all' ? '/scraping' : `/scraping?status=${this.filter}`;
    this.data = await api.get(url);
  },

  render() {
    const el = document.getElementById('content');
    const counts = { new: 0, seen: 0, archived: 0 };
    this.data.forEach(d => { if (counts[d.status] !== undefined) counts[d.status]++; });

    el.innerHTML = `
      <div class="page-header">
        <h1>🕵️ Scraping Facebook</h1>
      </div>
      <div class="scraping-filters">
        <button class="btn ${this.filter === 'new'      ? 'btn-primary' : 'btn-ghost'}" onclick="Scraping._setFilter('new')">🆕 Nouveaux (${counts.new})</button>
        <button class="btn ${this.filter === 'seen'     ? 'btn-primary' : 'btn-ghost'}" onclick="Scraping._setFilter('seen')">👁 Vus (${counts.seen})</button>
        <button class="btn ${this.filter === 'archived' ? 'btn-primary' : 'btn-ghost'}" onclick="Scraping._setFilter('archived')">🗑 Archivés (${counts.archived})</button>
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
    return `
      <div class="scraping-card status-${d.status}">
        ${photo ? `<img class="scraping-photo" src="${photo}" onerror="this.style.display='none'">` : '<div class="scraping-photo-empty">📷</div>'}
        <div class="scraping-body">
          <div class="scraping-title">${d.title || 'Sans titre'}</div>
          <div class="scraping-meta">
            ${d.zone ? `📍 ${d.zone}` : ''} ${d.zone && price !== '—' ? '·' : ''} ${price !== '—' ? `💰 ${price}` : ''}
          </div>
          ${d.description ? `<div class="scraping-desc">${d.description.substring(0, 120)}${d.description.length > 120 ? '…' : ''}</div>` : ''}
          <div class="scraping-footer">
            <span class="scraping-date">${date}</span>
            <div class="scraping-actions">
              ${d.url ? `<a href="${d.url}" target="_blank" class="btn btn-ghost btn-sm">🔗 Voir</a>` : ''}
              ${d.status !== 'seen'     ? `<button class="btn btn-ghost btn-sm" onclick="Scraping._setStatus('${d.id}','seen')">👁</button>` : ''}
              ${d.status !== 'archived' ? `<button class="btn btn-ghost btn-sm" onclick="Scraping._setStatus('${d.id}','archived')">🗑</button>` : ''}
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
