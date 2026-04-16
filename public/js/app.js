// ── API helper ────────────────────────────────────────────────────────────────
const api = {
  async request(method, path, data) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (data !== undefined) opts.body = JSON.stringify(data);
    const res = await fetch('/api' + path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erreur réseau' }));
      throw new Error(err.error || 'Erreur');
    }
    return res.json();
  },
  get:    (p)    => api.request('GET',    p),
  post:   (p, d) => api.request('POST',   p, d),
  put:    (p, d) => api.request('PUT',    p, d),
  patch:  (p, d) => api.request('PATCH',  p, d ?? {}),
  del:    (p)    => api.request('DELETE', p),
};

// ── Modal ─────────────────────────────────────────────────────────────────────
const Modal = {
  open(title, html) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },
  close() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }
};

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = {
  show(msg, type = 'success') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity .25s';
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 260);
    }, 2600);
  }
};

// ── Badge helper ──────────────────────────────────────────────────────────────
const STATUS_CLASS = {
  'Prospect': 'prospect', 'Onboarding': 'onboarding',
  'Recherche active': 'active', 'Signé': 'signed', 'Perdu': 'lost',
  'Disponible': 'available', 'Proposé': 'proposed', 'Loué': 'rented',
  'En cours': 'ongoing', 'Envoyé au client': 'sent',
  'Visite planifiée': 'visit', 'Annulé': 'cancelled'
};

const STATUS_LABEL = {
  'Prospect': 'Prospect', 'Onboarding': 'Onboarding',
  'Recherche active': 'Active Search', 'Signé': 'Signed', 'Perdu': 'Lost',
  'Disponible': 'Available', 'Proposé': 'Proposed', 'Loué': 'Rented',
  'En cours': 'In Progress', 'Envoyé au client': 'Sent',
  'Visite planifiée': 'Visit Scheduled', 'Annulé': 'Cancelled'
};

const STATUS_LABEL_FR = {
  'Prospect': 'Prospect', 'Onboarding': 'Onboarding',
  'Recherche active': 'Recherche active', 'Signé': 'Signé', 'Perdu': 'Perdu',
  'Disponible': 'Disponible', 'Proposé': 'Proposé', 'Loué': 'Loué',
  'En cours': 'En cours', 'Envoyé au client': 'Envoyé',
  'Visite planifiée': 'Visite planifiée', 'Annulé': 'Annulé'
};

function badge(status) {
  const cls    = STATUS_CLASS[status] || 'ongoing';
  const labels = (typeof getLang === 'function' && getLang() === 'fr') ? STATUS_LABEL_FR : STATUS_LABEL;
  const label  = labels[status] || status;
  return `<span class="badge b-${cls}">${label}</span>`;
}

function fmtTHB(n) {
  return n ? Number(n).toLocaleString('fr-FR') + ' ฿' : '—';
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Global Search ─────────────────────────────────────────────────────────────
const Search = {
  _cache: null,
  _debounce: null,

  async query(q) {
    const panel = document.getElementById('search-panel');
    if (!q || q.length < 2) { panel.classList.add('hidden'); return; }
    clearTimeout(this._debounce);
    this._debounce = setTimeout(async () => {
      if (!this._cache) {
        try {
          const [cl, pr] = await Promise.all([
            api.get('/clients?archived=false'),
            api.get('/properties?archived=false')
          ]);
          this._cache = { clients: cl, properties: pr };
        } catch { this._cache = { clients: [], properties: [] }; }
      }
      const lq = q.toLowerCase();
      const clients = this._cache.clients.filter(c =>
        (c.name||'').toLowerCase().includes(lq) ||
        (c.zones||'').toLowerCase().includes(lq) ||
        (c.criteria||'').toLowerCase().includes(lq)
      ).slice(0, 5);
      const props = this._cache.properties.filter(p =>
        (p.title||'').toLowerCase().includes(lq) ||
        (p.zone||'').toLowerCase().includes(lq)
      ).slice(0, 5);
      this.renderPanel(panel, clients, props);
    }, 180);
  },

  renderPanel(panel, clients, props) {
    if (!clients.length && !props.length) {
      panel.innerHTML = '<p class="search-empty">No results</p>';
    } else {
      panel.innerHTML =
        (clients.length ? `<div class="search-group">${getLang()==='fr'?'Clients':'Clients'}</div>` +
          clients.map(c => `<div class="search-item" onclick="Search.goClient(${c.id})">
            <span class="search-name">${c.name}</span>
            ${c.zones?`<span class="search-sub">${c.zones}</span>`:''}
          </div>`).join('') : '') +
        (props.length ? `<div class="search-group">${getLang()==='fr'?'Biens':'Properties'}</div>` +
          props.map(p => `<div class="search-item" onclick="Search.goProp(${p.id})">
            <span class="search-name">${p.title}</span>
            ${p.zone?`<span class="search-sub">${p.zone}${p.price?' · '+Number(p.price).toLocaleString('fr-FR')+' ฿':''}</span>`:''}
          </div>`).join('') : '');
    }
    panel.classList.remove('hidden');
    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function h(e) {
        if (!e.target.closest('.search-wrap')) { panel.classList.add('hidden'); document.removeEventListener('click', h); }
      });
    }, 50);
  },

  hide() { document.getElementById('search-panel')?.classList.add('hidden'); },

  async goClient(id) {
    this.hide(); document.getElementById('search-input').value = '';
    this._cache = null; // invalidate so next search re-fetches
    await Router.navigate('clients');
    const try_ = (n=0) => { const c = Clients.data.find(x=>x.id===id); if(c) Clients.openDetailModal(id); else if(n<12) setTimeout(()=>try_(n+1),120); };
    setTimeout(()=>try_(), 250);
  },

  async goProp(id) {
    this.hide(); document.getElementById('search-input').value = '';
    this._cache = null;
    await Router.navigate('properties');
    setTimeout(() => { Properties.openDetailModal(id); }, 300);
  },

  invalidate() { this._cache = null; }
};

// ── Router ────────────────────────────────────────────────────────────────────
const Router = {
  current: null,
  async navigate(section) {
    const sections = { today: Today, dashboard: Dashboard, clients: Clients, properties: Properties, deals: Deals, finance: Finance };
    if (!sections[section]) section = 'dashboard';

    document.querySelectorAll('.nav-item').forEach(el =>
      el.classList.toggle('active', el.dataset.section === section)
    );

    document.getElementById('content').innerHTML = '<p class="spinner">Loading…</p>';

    try {
      if (sections[section].init) {
        await sections[section].init();
      } else {
        await sections[section].load();
        sections[section].render();
      }
    } catch (err) {
      console.error(err);
      Toast.show('Loading error', 'error');
    }

    this.current = section;
    if (window.location.hash.slice(1) !== section)
      history.replaceState(null, '', '#' + section);
  }
};

// ── App ───────────────────────────────────────────────────────────────────────
const App = {
  async init() {
    try {
      const { authenticated } = await api.get('/auth/check');
      authenticated ? this.showApp() : this.showLogin();
    } catch {
      this.showLogin();
    }
  },

  showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');

    // Pre-warm Apps Script while the user types their password
    fetch('/api/auth/warmup').catch(() => {});

    document.getElementById('login-form').onsubmit = async (e) => {
      e.preventDefault();
      const pw = document.getElementById('password-input').value;
      const errEl = document.getElementById('login-error');
      errEl.classList.add('hidden');
      try {
        await api.post('/auth/login', { password: pw });
        document.getElementById('login-screen').classList.add('hidden');
        this.showApp();
      } catch {
        errEl.classList.remove('hidden');
      }
    };
  },

  showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    // Nav clicks
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        Router.navigate(el.dataset.section);
      });
    });

    // Logout
    document.getElementById('logout-btn').onclick = async () => {
      await api.post('/auth/logout', {});
      location.reload();
    };

    // Modal dismiss
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') Modal.close();
    });
    document.getElementById('modal-close').onclick = Modal.close;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') Modal.close();
    });

    // Init lang toggle button label
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) langBtn.textContent = getLang() === 'en' ? '🇫🇷 Français' : '🇬🇧 English';
    // Apply saved lang to static nav labels
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });

    // Route
    const hash = window.location.hash.slice(1);
    Router.navigate(hash || 'today');

    window.addEventListener('hashchange', () => {
      const s = window.location.hash.slice(1);
      if (Router.current !== s) Router.navigate(s);
    });
  }
};

window.addEventListener('DOMContentLoaded', () => App.init());
