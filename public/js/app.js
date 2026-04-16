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

// ── Router ────────────────────────────────────────────────────────────────────
const Router = {
  current: null,
  async navigate(section) {
    const sections = { dashboard: Dashboard, clients: Clients, properties: Properties, deals: Deals, finance: Finance };
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
    Router.navigate(hash || 'clients');

    window.addEventListener('hashchange', () => {
      const s = window.location.hash.slice(1);
      if (Router.current !== s) Router.navigate(s);
    });
  }
};

window.addEventListener('DOMContentLoaded', () => App.init());
