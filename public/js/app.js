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
  const locale = (typeof getLang === 'function' && getLang() === 'en') ? 'en-GB' : 'fr-FR';
  return new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
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
    const sections = { dashboard: Dashboard, clients: Clients, properties: Properties, contracts: Contracts, deals: Deals, finance: Finance, recherches: Recherches, visas: Visas };
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

// ── Avatars prédéfinis (10 options) ──────────────────────────────────────────
const AVATARS = [
  { id: '1',  emoji: '🏙️', bg: '#0f2027', label: 'City'      },
  { id: '2',  emoji: '🌸', bg: '#3d0c3e', label: 'Sakura'    },
  { id: '3',  emoji: '⚡', bg: '#1a1a00', label: 'Lightning' },
  { id: '4',  emoji: '🌊', bg: '#001a33', label: 'Wave'      },
  { id: '5',  emoji: '🔥', bg: '#2a0a00', label: 'Fire'      },
  { id: '6',  emoji: '🎯', bg: '#0a1a0a', label: 'Target'    },
  { id: '7',  emoji: '💎', bg: '#0a0020', label: 'Diamond'   },
  { id: '8',  emoji: '🌙', bg: '#0d0d2b', label: 'Moon'      },
  { id: '9',  emoji: '🦁', bg: '#1a1000', label: 'Lion'      },
  { id: '10', emoji: '🐉', bg: '#0a1a0a', label: 'Dragon'    },
];

function avatarHTML(user, size = 36) {
  if (!user) return `<div class="user-avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size*0.5)}px;background:#222;border-radius:50%;display:flex;align-items:center;justify-content:center">?</div>`;
  if (user.avatar_type === 'upload' && user.avatar_value?.startsWith('data:')) {
    return `<img src="${user.avatar_value}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0">`;
  }
  const preset = AVATARS.find(a => a.id === (user.avatar_value || '1')) || AVATARS[0];
  return `<div class="user-avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size*0.48)}px;background:${preset.bg};border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;line-height:1">${preset.emoji}</div>`;
}

// ── App ───────────────────────────────────────────────────────────────────────
const App = {
  user: { id: null, name: 'Tim', role: 'admin', lang: 'fr', avatar_type: 'preset', avatar_value: '1' },
  get role() { return this.user?.role || 'admin'; }, // rétro-compat
  _usersCache: [], // cache global des users pour avatars (chargé au démarrage)

  // Retourne l'objet user par nom depuis le cache
  getUserByName(name) {
    return this._usersCache.find(u => u.name === name) || null;
  },

  async init() {
    try {
      const data = await api.get('/auth/check');
      if (data.authenticated) {
        this.user = data;
        // Précharge les users en arrière-plan (admins seulement, ignoré si erreur)
        api.get('/users').then(users => { this._usersCache = users || []; }).catch(() => {});
        this.showApp();
      } else this.showLogin();
    } catch { this.showLogin(); }
  },

  showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
    fetch('/api/auth/warmup').catch(() => {});

    document.getElementById('login-form').onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('email-input')?.value || '';
      const pw    = document.getElementById('password-input').value;
      const errEl = document.getElementById('login-error');
      errEl.classList.add('hidden');
      try {
        const data = await api.post('/auth/login', { email: email.trim(), password: pw });
        this.user = data;
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

    // Appliquer la langue du compte utilisateur
    if (this.user?.lang && typeof setLang === 'function') {
      setLang(this.user.lang);
    }

    // Masquer les sections interdites (guest = ancien compte Nono)
    // Sections par défaut pour les membres (si pas de sections custom sur le compte)
    const DEFAULT_MEMBER_SECTIONS = ['clients', 'properties', 'recherches', 'visas'];
    const memberOnly = this.user.sections || DEFAULT_MEMBER_SECTIONS;
    const isMember = this.user.role !== 'admin';
    if (isMember) {
      document.querySelectorAll('.nav-item').forEach(el => {
        if (!memberOnly.includes(el.dataset.section)) el.style.display = 'none';
      });
    }

    // Nav clicks
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        if (isMember && !memberOnly.includes(el.dataset.section)) return;
        Router.navigate(el.dataset.section);
      });
    });

    // Avatar + nom en bas de sidebar
    this._renderSidebarUser();

    // Bouton admin visible seulement pour les admins
    const adminBtn = document.getElementById('admin-users-btn');
    if (adminBtn && this.user.role === 'admin') adminBtn.style.display = 'block';

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

    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) langBtn.textContent = getLang() === 'en' ? '🇫🇷 Français' : '🇬🇧 English';
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });

    const hash = window.location.hash.slice(1);
    const startSection = (this.user.role === 'guest') ? 'clients' : (hash || 'dashboard');
    Router.navigate(startSection);

    window.addEventListener('hashchange', () => {
      const s = window.location.hash.slice(1);
      if (Router.current !== s) Router.navigate(s);
    });
  },

  _renderSidebarUser() {
    const existing = document.getElementById('sidebar-user');
    if (existing) existing.remove();
    const sidebar = document.getElementById('sidebar');
    const logoutBtn = document.getElementById('logout-btn');
    const div = document.createElement('div');
    div.id = 'sidebar-user';
    div.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:4px;border-radius:10px;cursor:pointer;transition:background .15s';
    div.onmouseenter = () => div.style.background = 'var(--surface-2,#1e1e1e)';
    div.onmouseleave = () => div.style.background = '';
    div.onclick = () => this.openProfileModal();
    div.innerHTML = `
      ${avatarHTML(this.user, 34)}
      <div style="min-width:0;flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this.user.name}</div>
        <div style="font-size:11px;color:var(--text-3)">${this.user.role === 'admin' ? '⚙️ Admin' : '👤 Membre'}</div>
      </div>
    `;
    sidebar.insertBefore(div, logoutBtn);
  },

  openProfileModal() {
    const isNewUser = !!this.user.id;
    const presetsHTML = AVATARS.map(a => `
      <button type="button" onclick="App._selectPreset('${a.id}')"
        id="av-${a.id}"
        style="width:46px;height:46px;border-radius:50%;border:2px solid ${this.user.avatar_value === a.id && this.user.avatar_type === 'preset' ? '#d4a853' : 'transparent'};cursor:pointer;background:${a.bg};font-size:22px;display:flex;align-items:center;justify-content:center;transition:border-color .15s"
        title="${a.label}">${a.emoji}</button>
    `).join('');

    Modal.open('Mon profil', `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--border)">
        <div id="profile-avatar-preview">${avatarHTML(this.user, 60)}</div>
        <div>
          <div style="font-size:16px;font-weight:600">${this.user.name}</div>
          <div style="font-size:12px;color:var(--text-3);margin-top:2px">${this.user.role === 'admin' ? '⚙️ Admin' : '👤 Membre'}</div>
        </div>
      </div>

      <div class="form-row" style="margin-bottom:14px">
        <label>Nom affiché</label>
        <input id="prof-name" value="${this.user.name}" ${!isNewUser ? 'disabled style="opacity:.5"' : ''}>
      </div>

      <div style="margin-bottom:16px">
        <label style="font-size:12px;color:var(--text-2);display:block;margin-bottom:10px">Avatar</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">${presetsHTML}</div>
        ${isNewUser ? `
        <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--text-2);border:1px dashed var(--border);border-radius:8px;padding:6px 12px">
          📷 Importer une photo
          <input type="file" accept="image/*" style="display:none" onchange="App._uploadAvatar(this)">
        </label>` : ''}
      </div>

      ${isNewUser ? `
      <details style="margin-bottom:16px">
        <summary style="cursor:pointer;font-size:13px;color:var(--text-2);list-style:none;padding:8px 0">🔒 Changer mon mot de passe</summary>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px">
          <div class="form-row"><label>Mot de passe actuel</label><input type="password" id="prof-pw-cur"></div>
          <div class="form-row"><label>Nouveau mot de passe</label><input type="password" id="prof-pw-new"></div>
          <button class="btn btn-sm btn-ghost" onclick="App._changePassword()" style="align-self:flex-start">Changer</button>
        </div>
      </details>` : '<p style="font-size:12px;color:var(--text-3);margin-bottom:16px">Compte legacy — pour modifier, créez un vrai compte.</p>'}

      ${isNewUser ? `<button class="btn btn-primary" onclick="App._saveProfile()" style="width:100%">Enregistrer</button>` : ''}
    `);
  },

  _selectPreset(id) {
    AVATARS.forEach(a => {
      const btn = document.getElementById(`av-${a.id}`);
      if (btn) btn.style.borderColor = a.id === id ? '#d4a853' : 'transparent';
    });
    // preview
    this._pendingAvatar = { type: 'preset', value: id };
    const prev = document.getElementById('profile-avatar-preview');
    if (prev) {
      const preset = AVATARS.find(a => a.id === id) || AVATARS[0];
      prev.innerHTML = `<div style="width:60px;height:60px;font-size:30px;background:${preset.bg};border-radius:50%;display:flex;align-items:center;justify-content:center">${preset.emoji}</div>`;
    }
  },

  _uploadAvatar(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      // Compression via canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 200;
        const ratio = Math.min(max / img.width, max / img.height, 1);
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        this._pendingAvatar = { type: 'upload', value: dataUrl };
        const prev = document.getElementById('profile-avatar-preview');
        if (prev) prev.innerHTML = `<img src="${dataUrl}" style="width:60px;height:60px;border-radius:50%;object-fit:cover">`;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  async _saveProfile() {
    if (!this.user.id) return;
    try {
      const name = document.getElementById('prof-name')?.value?.trim();
      const updates = {};
      if (name && name !== this.user.name) updates.name = name;
      if (this._pendingAvatar) {
        updates.avatar_type  = this._pendingAvatar.type;
        updates.avatar_value = this._pendingAvatar.value;
      }
      if (!Object.keys(updates).length && !this._pendingAvatar) { Modal.close(); return; }

      let data;
      if (this._pendingAvatar?.type === 'upload') {
        data = await api.post('/users/me/avatar', { data_url: this._pendingAvatar.value });
      } else {
        data = await api.patch('/users/me', updates);
      }
      this.user = { ...this.user, ...data };
      this._pendingAvatar = null;
      Modal.close();
      this._renderSidebarUser();
      Toast.show('✓ Profil mis à jour');
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  async _changePassword() {
    const cur = document.getElementById('prof-pw-cur')?.value;
    const nw  = document.getElementById('prof-pw-new')?.value;
    if (!cur || !nw) return Toast.show('Remplis les deux champs', 'error');
    try {
      await api.post('/users/me/password', { current_password: cur, new_password: nw });
      Toast.show('✓ Mot de passe changé');
      document.getElementById('prof-pw-cur').value = '';
      document.getElementById('prof-pw-new').value = '';
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  // ── Panel admin : gestion des utilisateurs ────────────────────────────────
  // Rôles prédéfinis — pré-remplissent les sections
  ROLE_PRESETS: {
    admin:       null, // admin voit tout, pas de restrictions
    agent:       ['clients', 'recherches', 'properties', 'visas'],
    coordinator: ['clients', 'recherches', 'properties', 'visas', 'dashboard'],
    member:      ['clients', 'properties', 'recherches', 'visas'],
  },

  _sectionsPickerHTML(selectedSections, pickerId = 'nu') {
    const ALL_SECTIONS = [
      { key: 'dashboard',  label: '📊 Dashboard'  },
      { key: 'clients',    label: '👥 Clients'     },
      { key: 'recherches', label: '🔍 Recherches'  },
      { key: 'properties', label: '🏠 Biens'       },
      { key: 'contracts',  label: '📋 Contracts'   },
      { key: 'visas',      label: '🛂 Visas'       },
    ];
    const selected = selectedSections || ['clients', 'properties', 'recherches', 'visas'];
    return `
      <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">
        ${Object.entries({agent:'Agent',coordinator:'Coordinateur',member:'Membre basique'}).map(([k,l]) =>
          `<button type="button" onclick="App._applyRolePreset('${k}','${pickerId}')" style="font-size:11px;padding:3px 8px;border:1px solid var(--border);border-radius:5px;cursor:pointer;background:none;color:var(--text-2)">${l}</button>`
        ).join('')}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${ALL_SECTIONS.map(s => `
          <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;padding:4px 8px;border:1px solid var(--border);border-radius:6px;user-select:none">
            <input type="checkbox" class="${pickerId}-section" value="${s.key}" ${selected.includes(s.key) ? 'checked' : ''} style="accent-color:var(--gold,#d4a853)">
            ${s.label}
          </label>`).join('')}
      </div>`;
  },

  _applyRolePreset(role, pickerId) {
    const sections = this.ROLE_PRESETS[role] || ['clients', 'properties', 'recherches', 'visas'];
    document.querySelectorAll(`.${pickerId}-section`).forEach(cb => {
      cb.checked = sections.includes(cb.value);
    });
  },

  _readSections(pickerId) {
    return [...document.querySelectorAll(`.${pickerId}-section:checked`)].map(cb => cb.value);
  },

  async openAdminUsers() {
    let users = [];
    try { users = await api.get('/users'); } catch {}
    Modal.open('👥 Utilisateurs', `
      <div id="users-list" style="margin-bottom:16px">${this._usersListHTML(users)}</div>
      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
      <h4 style="font-size:13px;font-weight:600;margin-bottom:12px">+ Nouveau compte</h4>
      <div class="form-row"><label>Nom</label><input id="nu-name" placeholder="Chompoo"></div>
      <div class="form-row"><label>Email</label><input id="nu-email" type="email" placeholder="chompoo@…"></div>
      <div class="form-row"><label>Mot de passe</label><input id="nu-pw" type="password"></div>
      <div style="display:flex;gap:10px;margin-top:4px">
        <div class="form-row" style="flex:1"><label>Rôle</label>
          <select id="nu-role"><option value="member">Membre</option><option value="admin">Admin</option></select>
        </div>
        <div class="form-row" style="flex:1"><label>Langue</label>
          <select id="nu-lang"><option value="fr">🇫🇷 Français</option><option value="en">🇬🇧 English</option></select>
        </div>
      </div>
      <div class="form-row"><label>Sections accessibles</label>${this._sectionsPickerHTML(null, 'nu')}</div>
      <button class="btn btn-primary" onclick="App._createUser()" style="width:100%;margin-top:8px">Créer le compte</button>
    `);
  },

  _usersListHTML(users) {
    if (!users.length) return '<p style="font-size:13px;color:var(--text-3)">Aucun compte encore — utilise le formulaire ci-dessous.</p>';
    return users.map(u => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        ${avatarHTML(u, 32)}
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500">${u.name}</div>
          <div style="font-size:11px;color:var(--text-3)">${u.email} · ${u.role} · ${u.lang}</div>
        </div>
        <button onclick="App._editUser('${u.id}')" style="background:none;border:1px solid var(--border);border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;color:var(--text-2)">✏️ Modifier</button>
        <button onclick="App._resetPw('${u.id}','${u.name}')" style="background:none;border:1px solid var(--border);border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;color:var(--text-2)">Reset mdp</button>
        ${u.id !== this.user.id ? `<button onclick="App._deleteUser('${u.id}','${u.name}')" style="background:none;border:none;cursor:pointer;font-size:16px;color:#DC2626;padding:2px 6px">✕</button>` : ''}
      </div>
    `).join('');
  },

  async _editUser(id) {
    let users = [];
    try { users = await api.get('/users'); } catch {}
    const u = users.find(x => x.id === id);
    if (!u) return Toast.show('Utilisateur introuvable', 'error');

    const currentSections = u.sections || ['clients', 'properties', 'recherches', 'visas'];
    Modal.open(`✏️ Modifier — ${u.name}`, `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border)">
        ${avatarHTML(u, 40)}
        <div>
          <div style="font-weight:600">${u.name}</div>
          <div style="font-size:11px;color:var(--text-3)">${u.email}</div>
        </div>
      </div>
      <div class="form-row"><label>Nom</label><input id="eu-name" value="${u.name}"></div>
      <div style="display:flex;gap:10px">
        <div class="form-row" style="flex:1"><label>Rôle</label>
          <select id="eu-role">
            <option value="member" ${u.role==='member'?'selected':''}>Membre</option>
            <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
          </select>
        </div>
        <div class="form-row" style="flex:1"><label>Langue</label>
          <select id="eu-lang">
            <option value="fr" ${u.lang==='fr'?'selected':''}>🇫🇷 Français</option>
            <option value="en" ${u.lang==='en'?'selected':''}>🇬🇧 English</option>
          </select>
        </div>
      </div>
      <div class="form-row"><label>Sections accessibles</label>
        <p style="font-size:11px;color:var(--text-3);margin:0 0 8px">Ignoré si le rôle est Admin (voit tout).</p>
        ${this._sectionsPickerHTML(currentSections, 'eu')}
      </div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn-primary" onclick="App._saveUserEdit('${u.id}')" style="flex:1">Enregistrer</button>
        <button class="btn btn-ghost" onclick="App.openAdminUsers()" style="flex:1">← Retour</button>
      </div>
    `);
  },

  async _saveUserEdit(id) {
    const name     = document.getElementById('eu-name')?.value?.trim();
    const role     = document.getElementById('eu-role')?.value || 'member';
    const lang     = document.getElementById('eu-lang')?.value || 'fr';
    const sections = this._readSections('eu');
    if (!name) return Toast.show('Le nom est requis', 'error');
    try {
      await api.patch(`/users/${id}`, { name, role, lang, sections: role === 'admin' ? null : sections });
      Toast.show('✓ Compte mis à jour');
      this.openAdminUsers();
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  async _createUser() {
    const name     = document.getElementById('nu-name')?.value?.trim();
    const email    = document.getElementById('nu-email')?.value?.trim();
    const pw       = document.getElementById('nu-pw')?.value;
    const role     = document.getElementById('nu-role')?.value || 'member';
    const lang     = document.getElementById('nu-lang')?.value || 'fr';
    const sections = this._readSections('nu');
    if (!name || !email || !pw) return Toast.show('Tous les champs sont requis', 'error');
    try {
      await api.post('/users', { name, email, password: pw, role, lang, sections });
      Toast.show(`✓ Compte créé pour ${name}`);
      this.openAdminUsers();
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  async _deleteUser(id, name) {
    if (!confirm(`Supprimer le compte de ${name} ?`)) return;
    try {
      await api.del(`/users/${id}`);
      Toast.show(`✓ ${name} supprimé`);
      this.openAdminUsers();
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  async _resetPw(id, name) {
    const nw = prompt(`Nouveau mot de passe pour ${name} :`);
    if (!nw) return;
    try {
      await api.post(`/users/${id}/reset-password`, { new_password: nw });
      Toast.show(`✓ Mot de passe de ${name} réinitialisé`);
    } catch (err) { Toast.show(err.message, 'error'); }
  },
};

window.addEventListener('DOMContentLoaded', () => App.init());
