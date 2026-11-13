// Bank logo SVGs — keyed by account name fragment (lowercase)
const BANK_LOGOS = {
  mercury:  `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#1A1A2E"/><text x="16" y="21" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="#6C8EFF">M</text></svg>`,
  revolut:  `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#191C1F"/><path d="M11 8h7c2.5 0 4 1.5 4 3.5 0 1.6-.9 2.8-2.3 3.3L23 24h-3.5l-2.8-8.5H14V24H11V8zm3 5.5h3.5c1 0 1.5-.5 1.5-1.5S18.5 11 17.5 11H14v2.5z" fill="white"/></svg>`,
  wise:     `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#9FE870"/><path d="M9 12l4 8 3-6 3 6 4-8" stroke="#163300" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  kbank:    `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#138F2E"/><text x="16" y="21" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" font-weight="800" fill="white">K</text></svg>`,
  crypto:   `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#F7931A"/><path d="M20.5 14.3c.3-1.8-1.1-2.8-3-3.4l.6-2.5-1.5-.4-.6 2.4-1.2-.3.6-2.4-1.5-.4-.6 2.5-2.4-.6-.4 1.6s1.1.3 1.1.3c.6.2.7.6.7.9l-1.7 6.8c-.1.3-.4.6-.9.5l-1.1-.3-.8 1.7 2.3.6-.6 2.5 1.5.4.6-2.5 1.2.3-.6 2.4 1.5.4.6-2.5c3 .6 5.2-.2 6.1-2.5.7-2-.1-3.2-1.5-3.9 1-.2 1.8-1 2-2.4zm-3.6 5c-.5 2-3.9 1-5 .7l.9-3.5c1.1.3 4.6.9 4.1 2.8zm.5-5c-.5 1.8-3.3 1-4.3.7l.8-3.1c1 .3 3.9.7 3.5 2.4z" fill="white"/></svg>`,
  total:    `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#1a1a1a"/><path d="M9 16h14M16 9l7 7-7 7" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

const FIN_ICON = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
const FIN_ICONS = {
  commission: FIN_ICON('<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/>'),
  onboarding: FIN_ICON('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>'),
  visa:       FIN_ICON('<rect width="18" height="20" x="3" y="2" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8 17h8"/>'),
  call:       FIN_ICON('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>'),
  autre:      FIN_ICON('<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'),
  trophy:     FIN_ICON('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>'),
  trend:      FIN_ICON('<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>'),
  lock:       FIN_ICON('<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
  edit:       FIN_ICON('<path d="M12 20h9"/><path d="M16.38 3.62a1 1 0 0 1 3 3L7.37 18.64a2 2 0 0 1-.86.5l-2.87.84a.5.5 0 0 1-.62-.62l.84-2.87a2 2 0 0 1 .5-.86z"/>'),
  plus:       FIN_ICON('<path d="M12 5v14"/><path d="M5 12h14"/>'),
  bars:       FIN_ICON('<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>'),
  target:     FIN_ICON('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
  calendar:   FIN_ICON('<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>'),
  trash:      FIN_ICON('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>'),
};

function bankLogo(name) {
  const key = Object.keys(BANK_LOGOS).find(k => name.toLowerCase().includes(k));
  if (!key) {
    // Generic: first letter in a circle
    const letter = (name[0] || '?').toUpperCase();
    return `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="var(--surface-3)"/><text x="16" y="21" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="var(--text-2)">${letter}</text></svg>`;
  }
  return BANK_LOGOS[key];
}

const FIN_CAT_COLORS = {
  commission: '#C9922A',
  onboarding: '#0F9F8A',
  visa:       '#4F6BED',
  call:       '#D6457A',
  autre:      '#9A9490',
};

const Finance = {
  data: [],
  selectedMonth: '',
  _unlocked: false,   // in-memory only — resets on every page refresh
  displayCur: localStorage.getItem('fin_display_cur') || 'THB',

  // ── Exchange rate (auto-refreshed daily, editable override) ───────────────
  get eurRate() {
    return parseFloat(localStorage.getItem('eur_rate') || '37');
  },
  set eurRate(v) {
    localStorage.setItem('eur_rate', String(v));
    localStorage.setItem('eur_rate_ts', Date.now());
  },

  async fetchRate() {
    try {
      const r = await fetch('https://api.frankfurter.app/latest?from=EUR&to=THB');
      const j = await r.json();
      const rate = j?.rates?.THB;
      if (rate) {
        localStorage.setItem('eur_rate', String(Math.round(rate * 100) / 100));
      }
    } catch { /* silent — keep last known rate */ }
  },

  // ── Monthly goals ──────────────────────────────────────────────────────────
  // type 'amount': progress by THB total | type 'count': progress by nb of transactions
  GOALS: {
    commission: { type: 'amount', amount: 50000, currency: 'THB' },
    onboarding: { type: 'count',  count: 10, label: 'recherches' },
    visa:       { type: 'count',  count: 4,  label: 'visas' },
    call:       null,
    autre:      null,
  },

  goalInTHB(key) {
    const g = this.GOALS[key];
    if (!g || g.type !== 'amount') return null;
    return g.currency === 'EUR' ? Math.round(g.amount * this.eurRate) : g.amount;
  },

  goalLabel(key) {
    const g = this.GOALS[key];
    if (!g) return '';
    if (g.type === 'count') return `Objectif : ${g.count} ${g.label}`;
    if (g.currency === 'EUR') return `Objectif : ${g.amount.toLocaleString('fr-FR')} €`;
    return `Objectif : ${g.amount.toLocaleString('fr-FR')} ฿`;
  },

  // ── Conversion helpers ─────────────────────────────────────────────────────
  toTHB(t) {
    return t.currency === 'EUR'
      ? Math.round(Number(t.amount) * this.eurRate)
      : Number(t.amount);
  },

  fmtEUR(thb) {
    if (!thb) return '';
    return `≈ ${Math.round(thb / this.eurRate).toLocaleString('fr-FR')} €`;
  },

  fmtTHB(eur) {
    if (!eur) return '';
    return `≈ ${Math.round(eur * this.eurRate).toLocaleString('fr-FR')} ฿`;
  },

  // ── Display currency toggle ────────────────────────────────────────────────
  toggleDisplay() {
    this.displayCur = this.displayCur === 'THB' ? 'EUR' : 'THB';
    localStorage.setItem('fin_display_cur', this.displayCur);
    this.render();
  },

  // Amount of a transaction in the current display currency
  inDisplay(t) {
    const amt = Number(t.amount);
    if (this.displayCur === 'EUR') {
      return t.currency === 'EUR' ? amt : amt / this.eurRate;
    }
    return t.currency === 'EUR' ? Math.round(amt * this.eurRate) : amt;
  },

  // Formate `amount` (dans `fromCur`) dans la devise d'affichage courante
  fmtAs(amount, fromCur) {
    const v = Math.round(amount);
    if (!amount) return this.displayCur === 'EUR' ? '0 €' : '0 ฿';
    if (fromCur === this.displayCur) return `${v.toLocaleString('fr-FR')} ${fromCur === 'EUR' ? '€' : '฿'}`;
    if (this.displayCur === 'EUR') return `≈ ${Math.round(amount / this.eurRate).toLocaleString('fr-FR')} €`;
    return `≈ ${Math.round(amount * this.eurRate).toLocaleString('fr-FR')} ฿`;
  },

  // Sous-ligne (devise opposée)
  fmtAsSub(amount, fromCur) {
    if (!amount) return '';
    if (fromCur === this.displayCur) {
      return this.displayCur === 'EUR'
        ? `≈ ${Math.round(amount * this.eurRate).toLocaleString('fr-FR')} ฿`
        : `≈ ${Math.round(amount / this.eurRate).toLocaleString('fr-FR')} €`;
    }
    return `${Math.round(amount).toLocaleString('fr-FR')} ${fromCur === 'EUR' ? '€' : '฿'}`;
  },

  // Pour une transaction individuelle
  fmtSub(t) {
    const amt = Number(t.amount);
    const cur = t.currency || 'THB';
    return this.fmtAsSub(amt, cur);
  },

  // ── Lock / unlock ──────────────────────────────────────────────────────────
  async init() {
    if (!this._unlocked) {
      this.showLock(); return;
    }
    await Promise.all([this.load(), this.fetchRate()]);
    this.render();
  },

  showLock() {
    document.getElementById('content').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:65vh">
        <div style="text-align:center;max-width:300px">
          <div class="fin-lock-icon">${FIN_ICONS.lock}</div>
          <h3 style="font-size:19px;font-weight:800;margin-bottom:6px;letter-spacing:-.3px">Finance</h3>
          <p style="color:var(--text-2);font-size:13px;margin-bottom:24px">Enter your Finance password to access this section</p>
          <form onsubmit="Finance.unlock(event)">
            <input type="password" id="finance-pw" placeholder="Password" autofocus
              style="width:100%;padding:11px 14px;border:1px solid var(--border);border-radius:9px;font-family:inherit;font-size:14px;outline:none;text-align:center;background:var(--bg);color:var(--text);margin-bottom:10px">
            <button type="submit" class="btn btn-primary" style="width:100%;padding:11px">Unlock</button>
            <p id="finance-err" class="error hidden" style="margin-top:8px">Incorrect password</p>
          </form>
        </div>
      </div>`;
  },

  async unlock(e) {
    e.preventDefault();
    const pw = document.getElementById('finance-pw').value;
    const errEl = document.getElementById('finance-err');
    errEl.classList.add('hidden');
    try {
      await api.post('/auth/finance-unlock', { password: pw });
    } catch {
      errEl.classList.remove('hidden');
      return;
    }
    this._unlocked = true;
    try {
      await Promise.all([this.load(), this.fetchRate()]);
    } catch (err) {
      Toast.show('Erreur chargement finance : ' + (err?.message || err), 'error');
      return;
    }
    this.render();
  },

  // ── Data ───────────────────────────────────────────────────────────────────
  async load() {
    this.data = await api.get('/finance');
    if (!this.selectedMonth) {
      const now = new Date();
      this.selectedMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    }
  },

  months() {
    const set = new Set(this.data.map(t => t.date.substring(0, 7)));
    const now = new Date();
    set.add(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
    return [...set].sort().reverse();
  },

  monthLabel(ym) {
    const [y, m] = ym.split('-');
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  },

  // ── Summaries ──────────────────────────────────────────────────────────────
  summary() {
    const accounts = ['KBank', 'KBank HSC', 'Mercury', 'Wise', 'Crypto', 'Revolut'];
    const txMonth = this.data.filter(t => t.date.startsWith(this.selectedMonth));
    return accounts.map(acct => ({
      acct,
      total: txMonth.filter(t => t.account === acct).reduce((s, t) => s + this.toTHB(t), 0),
      count: txMonth.filter(t => t.account === acct).length
    }));
  },

  summaryByType() {
    const types = [
      { key: 'commission', label: 'Commission', icon: FIN_ICONS.commission, color: FIN_CAT_COLORS.commission },
      { key: 'onboarding', label: 'Onboarding', icon: FIN_ICONS.onboarding, color: FIN_CAT_COLORS.onboarding },
      { key: 'visa',       label: 'Visa',       icon: FIN_ICONS.visa,       color: FIN_CAT_COLORS.visa },
      { key: 'call',       label: 'Call',       icon: FIN_ICONS.call,       color: FIN_CAT_COLORS.call },
      { key: 'autre',      label: 'Autre',      icon: FIN_ICONS.autre,      color: FIN_CAT_COLORS.autre },
    ];
    const txMonth = this.data.filter(t => t.date.startsWith(this.selectedMonth));
    return types.map(t => {
      const txs  = txMonth.filter(x => x.type === t.key);
      const goal = this.GOALS[t.key];
      const count = txs.length;
      // Sum in goal currency to keep EUR goals fixed
      const total = txs.reduce((s, x) => {
        if (goal?.currency === 'EUR') {
          return s + (x.currency === 'EUR' ? Number(x.amount) : Number(x.amount) / this.eurRate);
        }
        return s + this.toTHB(x);
      }, 0);
      let pct = null;
      if (goal?.type === 'count')  pct = Math.min(Math.round(count / goal.count * 100), 100);
      if (goal?.type === 'amount') pct = Math.min(Math.round(total / goal.amount * 100), 100);
      const goalCur = goal?.currency || 'THB';
      return { ...t, total, count, goal, goalCur, pct };
    });
  },

  // ── Render ─────────────────────────────────────────────────────────────────
  CATS: [
    { key: 'commission', label: 'Commission' },
    { key: 'onboarding', label: 'Onboarding' },
    { key: 'visa',       label: 'Visa' },
    { key: 'call',       label: 'Call' },
    { key: 'autre',      label: 'Autre' },
  ],
  period: 'month',   // 12 | 6 | 'month' (mois sélectionné, par jour) | 'week' (semaine en cours, par jour)
  _series: [],

  _ymShift(ym, delta) {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  },
  _monthFr(ym) {
    const [y, m] = ym.split('-');
    return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  },
  _txIn(ym)      { return this.data.filter(t => t.date?.startsWith(ym)); },
  _sumTHB(txs)   { return txs.reduce((s, t) => s + this.toTHB(t), 0); },
  _disp(thb)     { return this.displayCur === 'EUR' ? thb / this.eurRate : thb; },
  _sym()         { return this.displayCur === 'EUR' ? '€' : '฿'; },

  _count(thb) {
    const v = Math.round(this._disp(thb));
    return `<span class="fin-count" data-v="${v}">${v.toLocaleString('fr-FR')}</span><span class="fin-cur">${this._sym()}</span>`;
  },
  _sub(thb) {
    if (!thb) return '';
    return this.displayCur === 'EUR'
      ? `${Math.round(thb).toLocaleString('fr-FR')} ฿`
      : `≈ ${Math.round(thb / this.eurRate).toLocaleString('fr-FR')} €`;
  },
  _tag(pct, suffix = '') {
    if (pct === null || !isFinite(pct)) return '';
    const up = pct >= 0;
    return `<span class="fin-tag ${up ? 'fin-tag-up' : 'fin-tag-down'}">${up ? '+' : ''}${Math.round(pct)} %${suffix}</span>`;
  },
  _segments(pct, { n = 17, color = 'var(--fin-trend)', delay = 0, step = 16 } = {}) {
    const filled = Math.round(Math.min(100, Math.max(0, pct || 0)) / 100 * n);
    let html = '';
    for (let i = 0; i < n; i++) {
      html += i < filled
        ? `<span class="fin-seg on" style="background:${color};--d:${delay + i * step}ms"></span>`
        : `<span class="fin-seg"></span>`;
    }
    return `<span class="fin-segbar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct || 0)}">${html}</span>`;
  },
  _spark(values, delay = 250) {
    const max = Math.max(...values, 1);
    return `<span class="fin-spark" aria-hidden="true">${values.map((v, i) =>
      `<span class="${i === values.length - 1 ? 'hi' : ''}" style="height:${Math.max(2, Math.round(v / max * 18))}px;--d:${delay + i * 30}ms"></span>`
    ).join('')}</span>`;
  },
  _seriesOf(n) {
    return Array.from({ length: n }, (_, i) => {
      const ym = this._ymShift(this.selectedMonth, i - n + 1);
      const byCat = { commission: 0, onboarding: 0, visa: 0, call: 0, autre: 0 };
      this._txIn(ym).forEach(t => { byCat[t.type in byCat ? t.type : 'autre'] += this.toTHB(t); });
      const total = byCat.commission + byCat.onboarding + byCat.visa + byCat.call + byCat.autre;
      const [y, m] = ym.split('-');
      const label = new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
      return { ym, total, byCat, label };
    });
  },

  // Série par jour : mois sélectionné ou semaine en cours (lundi → dimanche)
  _daySeries(period) {
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const today = iso(new Date());
    let days = [];
    if (period === 'week') {
      const d = new Date(); d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      days = Array.from({ length: 7 }, (_, i) => { const x = new Date(d); x.setDate(d.getDate() + i); return x; });
    } else {
      const [y, m] = this.selectedMonth.split('-').map(Number);
      const n = new Date(y, m, 0).getDate();
      days = Array.from({ length: n }, (_, i) => new Date(y, m - 1, i + 1, 12));
    }
    return days.map(d => {
      const key = iso(d);
      const byCat = { commission: 0, onboarding: 0, visa: 0, call: 0, autre: 0 };
      this._txIn(key).forEach(t => { byCat[t.type in byCat ? t.type : 'autre'] += this.toTHB(t); });
      const total = byCat.commission + byCat.onboarding + byCat.visa + byCat.call + byCat.autre;
      const dn = d.getDate();
      const label = period === 'week'
        ? d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '') + ' ' + dn
        : (dn === 1 || dn % 5 === 0 ? String(dn) : '');
      return { day: key, total, byCat, label, sel: key === today,
        title: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) };
    });
  },
  _seriesFor(period) {
    return typeof period === 'number' ? this._seriesOf(period) : this._daySeries(period);
  },
  _periodCaption() {
    if (this.period === 'week') return 'cette semaine';
    if (this.period === 'month') return 'en ' + this._monthFr(this.selectedMonth).toLowerCase();
    return `sur les ${this.period} derniers mois`;
  },

  _barsHTML() {
    const SEG = 22;
    const pts = this._series;
    const max = Math.max(...pts.map(p => p.total), 1);
    return pts.map((p, i) => {
      const filled = p.total > 0 ? Math.max(1, Math.round(p.total / max * SEG)) : 0;
      const colors = [];
      let cum = 0;
      this.CATS.forEach(c => {
        cum += p.byCat[c.key];
        const end = p.total ? Math.round(cum / p.total * filled) : 0;
        while (colors.length < end) colors.push(FIN_CAT_COLORS[c.key]);
      });
      let segs = '';
      for (let s = 0; s < SEG; s++) {
        segs += s < filled
          ? `<span class="on" style="background:${colors[s] || FIN_CAT_COLORS.autre};--d:${150 + i * 55 + s * 22}ms"></span>`
          : '<span></span>';
      }
      return `
        <button type="button" class="fin-bar${(p.ym ? p.ym === this.selectedMonth : p.sel) ? ' sel' : ''}"
          onmouseenter="Finance.hoverBar(${i})" onfocus="Finance.hoverBar(${i})"
          ${p.ym ? `onclick="Finance.changeMonth('${p.ym}')"` : ''} aria-label="${p.ym ? this._monthFr(p.ym) : p.title}">
          <span class="fin-bar-col">${segs}</span>
          <span class="fin-bar-lbl">${p.label}</span>
        </button>`;
    }).join('');
  },

  render() {
    const months   = this.months();
    const ym       = this.selectedMonth;
    const txMonth  = this._txIn(ym);
    const total    = this._sumTHB(txMonth);
    const prev     = this._sumTHB(this._txIn(this._ymShift(ym, -1)));
    const comm     = txMonth.filter(t => t.type === 'commission');
    const commTot  = this._sumTHB(comm);
    const commGoal = this.goalInTHB('commission');
    const proj     = this.projection();
    const year     = ym.slice(0, 4);
    const ytd      = this._sumTHB(this.data.filter(t => t.date?.startsWith(year) && t.date.slice(0, 7) <= ym));
    const ytdPrev  = this._sumTHB(this.data.filter(t => {
      const d = t.date || '';
      return d.startsWith(String(year - 1)) && d.slice(5, 7) <= ym.slice(5, 7);
    }));
    const best     = this.bestMonth();
    const spark    = this._seriesOf(12).map(p => p.total);
    this._series   = this._seriesFor(this.period);
    const periodTot = this._series.reduce((s, p) => s + p.total, 0);
    const byType   = this.summaryByType();
    const accts    = this.summary();

    const kpi = (i, icon, label, tag, value, caption, extra = '') => `
      <article class="fin-kpi fin-in" style="--i:${i}">
        <div class="fin-kpi-top">
          <span class="fin-caption">${icon}${label}</span>${tag}
        </div>
        <div class="fin-kpi-row">
          <span class="fin-kpi-num">${value}</span>${extra}
        </div>
        <span class="fin-caption fin-subtle">${caption}</span>
      </article>`;

    const commPct = commGoal ? Math.round(commTot / commGoal * 100) : null;

    document.getElementById('content').innerHTML = `
      <div class="section-header fin-in">
        <h2>Finance</h2>
        <div class="header-actions fin-actions">
          ${Privacy.btn()}
          <button class="fin-ctl fin-ctl-ghost" onclick="Finance.editRate()" title="Modifier le taux de change">1 € = ${this.eurRate} ฿</button>
          <div class="fin-seg-toggle">
            <button class="${this.displayCur === 'THB' ? 'on' : ''}" onclick="Finance.displayCur !== 'THB' && Finance.toggleDisplay()">฿ THB</button>
            <button class="${this.displayCur === 'EUR' ? 'on' : ''}" onclick="Finance.displayCur !== 'EUR' && Finance.toggleDisplay()">€ EUR</button>
          </div>
          <select class="fin-ctl fin-select" onchange="Finance.changeMonth(this.value)">
            ${months.map(m => `<option value="${m}" ${m === ym ? 'selected' : ''}>${this._monthFr(m)}</option>`).join('')}
          </select>
          <button class="fin-ctl fin-ctl-primary" onclick="Finance.openAddModal()">${FIN_ICONS.plus}Transaction</button>
        </div>
      </div>

      <div class="fin-kpis">
        ${kpi(1, FIN_ICONS.bars, 'Revenu du mois',
          this._tag(prev ? (total - prev) / prev * 100 : null),
          this._count(total),
          `${this._sub(total) || '—'} · ${txMonth.length} transaction${txMonth.length > 1 ? 's' : ''}`,
          this._spark(spark))}
        ${kpi(2, FIN_ICONS.commission, 'Commissions',
          commPct !== null ? `<span class="fin-tag fin-tag-neutral">${commPct} % objectif</span>` : '',
          this._count(commTot),
          `${comm.length} deal${comm.length > 1 ? 's' : ''} · ${this.goalLabel('commission')}`)}
        ${kpi(3, FIN_ICONS.target, 'Projection fin de mois',
          proj && prev ? this._tag((proj.projected - prev) / prev * 100, ' vs M-1') : '',
          this._count(proj ? proj.projected : total),
          proj ? `J${proj.dayElapsed} / ${proj.daysInMonth} · extrapolé` : 'Mois clôturé')}
        ${kpi(4, FIN_ICONS.calendar, `Cumul ${year}`,
          this._tag(ytdPrev ? (ytd - ytdPrev) / ytdPrev * 100 : null, ' vs N-1'),
          this._count(ytd),
          best ? `Meilleur mois : ${best.label}` : '—')}
      </div>

      <div class="fin-grid-2">
        <section class="fin-panel fin-in" style="--i:5">
          <div class="fin-panel-head">
            <h3 class="fin-eyebrow">Revenus</h3>
            <div class="fin-seg-toggle">
              <button class="${this.period === 'week' ? 'on' : ''}" onclick="Finance.setPeriod('week')">Cette semaine</button>
              <button class="${this.period === 'month' ? 'on' : ''}" onclick="Finance.setPeriod('month')">${this.selectedMonth === new Date().toISOString().slice(0, 7) ? 'Ce mois' : '1 mois'}</button>
              <button class="${this.period === 6 ? 'on' : ''}" onclick="Finance.setPeriod(6)">6 mois</button>
              <button class="${this.period === 12 ? 'on' : ''}" onclick="Finance.setPeriod(12)">12 mois</button>
            </div>
          </div>
          <div class="fin-rev-head">
            <div>
              <div class="fin-big" id="fin-rev-total">${this._count(periodTot)}</div>
              <div class="fin-caption fin-soft" id="fin-rev-cap">${this._periodCaption()}</div>
            </div>
            <div class="fin-legend">
              ${this.CATS.map(c => `<span><i style="background:${FIN_CAT_COLORS[c.key]}"></i>${c.label}</span>`).join('')}
            </div>
          </div>
          <div class="fin-bars" onmouseleave="Finance.hoverBar(null)">${this._barsHTML()}</div>
        </section>

        <section class="fin-panel fin-in" style="--i:6">
          <div class="fin-panel-head">
            <h3 class="fin-eyebrow">Objectifs du mois</h3>
          </div>
          <div class="fin-goals">
            ${byType.map((r, idx) => {
              const isCount = r.goal?.type === 'count';
              const share = total ? this.toTHBFromGoal(r) / total * 100 : 0;
              const pct = r.pct ?? share;
              const value = isCount
                ? `${r.count}<span class="fin-goal-den"> / ${r.goal.count}</span>`
                : (r.total ? this.fmtAs(r.total, r.goalCur) : '—');
              return `
                <div class="fin-goal">
                  <div class="fin-goal-top">
                    <span class="fin-cat-icon" style="color:${r.color};background:${r.color}1A">${r.icon}</span>
                    <span class="fin-goal-name">${r.label}</span>
                    <span class="fin-goal-val">${value}</span>
                  </div>
                  ${this._segments(pct, { n: 24, color: r.color, delay: 300 + idx * 120 })}
                  <div class="fin-goal-cap">
                    <span>${r.goal ? this.goalLabel(r.key) : `${r.count} transaction${r.count !== 1 ? 's' : ''}`}</span>
                    <span>${r.goal ? `${r.pct} %` : `${Math.round(share)} % du mois`}</span>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </section>
      </div>

      <div class="fin-section-label fin-in" style="--i:7">Comptes</div>
      <div class="fin-acct-grid fin-in" style="--i:7">
        ${accts.map((r, idx) => `
          <div class="fin-acct-tile">
            <div class="fin-acct-logo">${bankLogo(r.acct)}</div>
            <div class="fin-acct-name">${r.acct}</div>
            <div class="fin-acct-total">${this.fmtAs(r.total, 'THB')}</div>
            <div class="fin-acct-sub">${r.total ? this.fmtAsSub(r.total, 'THB') : '&nbsp;'}</div>
            <div class="fin-acct-count">${r.count} paiement${r.count > 1 ? 's' : ''}</div>
          </div>`).join('')}
        <div class="fin-acct-tile fin-acct-tile-total">
          <div class="fin-acct-logo">${bankLogo('total')}</div>
          <div class="fin-acct-name">Total</div>
          <div class="fin-acct-total">${this.fmtAs(total, 'THB')}</div>
          <div class="fin-acct-sub">${total ? this.fmtAsSub(total, 'THB') : '&nbsp;'}</div>
          <div class="fin-acct-count">${txMonth.length} paiement${txMonth.length > 1 ? 's' : ''}</div>
        </div>
      </div>

      <div class="fin-section-label fin-in" style="--i:8">Transactions — ${this._monthFr(ym)}</div>
      <div class="fin-tx-wrap fin-in" style="--i:8">
        <table class="tx-table">
          <thead>
            <tr>
              <th>Date</th><th>Type</th><th>Compte</th><th>Notes</th><th style="text-align:right">Montant</th><th></th>
            </tr>
          </thead>
          <tbody>
            ${txMonth.length ? txMonth.map(t => `
              <tr>
                <td style="white-space:nowrap;color:var(--text-3)">${fmtDate(t.date)}</td>
                <td><span class="fin-type"><i style="background:${FIN_CAT_COLORS[t.type] || FIN_CAT_COLORS.autre}"></i>${t.type}</span></td>
                <td><span class="fin-tx-acct"><span class="fin-tx-logo">${bankLogo(t.account)}</span>${t.account}</span></td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.notes || '—'}</td>
                <td style="text-align:right">
                  <div class="tx-amount">${this.fmtAs(Number(t.amount), t.currency || 'THB')}</div>
                  <div class="eur-sub">${this.fmtSub(t)}</div>
                </td>
                <td>
                  <div class="tx-actions">
                    <button class="fin-icon-btn" onclick="Finance.openEditModal(${t.id})" title="Modifier">${FIN_ICONS.edit}</button>
                    <button class="fin-icon-btn fin-icon-btn-danger" onclick="Finance.remove(${t.id})" title="Supprimer">${FIN_ICONS.trash}</button>
                  </div>
                </td>
              </tr>`).join('')
              : `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-2)">Aucune transaction ce mois</td></tr>`}
          </tbody>
        </table>
      </div>`;

    this.afterRender();
  },

  // Category total converted to THB (summaryByType keeps EUR goals in EUR)
  toTHBFromGoal(r) {
    return r.goalCur === 'EUR' ? r.total * this.eurRate : r.total;
  },

  afterRender() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const els = [...document.querySelectorAll('#content .fin-count')];
    els.forEach(el => { el.textContent = '0'; });
    const t0 = performance.now(), dur = 900;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      els.forEach(el => {
        if (!el._stop) el.textContent = Math.round(Number(el.dataset.v) * e).toLocaleString('fr-FR');
      });
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },

  hoverBar(i) {
    const tot = document.querySelector('#fin-rev-total .fin-count');
    const cap = document.getElementById('fin-rev-cap');
    if (!tot || !cap) return;
    const p = i === null ? null : this._series[i];
    const thb = p ? p.total : this._series.reduce((s, x) => s + x.total, 0);
    tot._stop = true;
    tot.textContent = Math.round(this._disp(thb)).toLocaleString('fr-FR');
    cap.textContent = p
      ? `${p.ym ? this._monthFr(p.ym) : p.title}${p.total ? ' · ' + this._sub(p.total) : ''}`
      : this._periodCaption();
  },

  setPeriod(n) { this.period = n; this.render(); },

  bestMonth() {
    const byMonth = {};
    this.data.forEach(t => {
      const k = (t.date||'').slice(0,7);
      byMonth[k] = (byMonth[k] || 0) + this.toTHB(t);
    });
    const entries = Object.entries(byMonth).sort((a,b) => b[1]-a[1]);
    if (!entries.length) return null;
    const [ym, total] = entries[0];
    return { label: this._monthFr(ym), total };
  },

  projection() {
    const now = new Date();
    const [y, m] = this.selectedMonth.split('-').map(Number);
    if (y !== now.getFullYear() || m !== now.getMonth() + 1) return null;
    const total = this._sumTHB(this._txIn(this.selectedMonth));
    if (!total) return null;
    const daysInMonth = new Date(y, m, 0).getDate();
    const dayElapsed  = now.getDate();
    return { projected: Math.round(total / dayElapsed * daysInMonth), dayElapsed, daysInMonth };
  },
  // ── Actions ────────────────────────────────────────────────────────────────
  changeMonth(m) { this.selectedMonth = m; this.render(); },

  editRate() {
    const r = prompt(`Exchange rate (THB per €)\nCurrent: 1€ = ${this.eurRate} ฿`, this.eurRate);
    if (!r) return;
    const val = parseFloat(r.replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      this.eurRate = val;
      this.render();
    }
  },

  openAddModal()  { Modal.open('Add transaction',  this.formHTML(null)); },
  openEditModal(id) {
    const t = this.data.find(x => x.id === id);
    Modal.open('Edit transaction', this.formHTML(t));
  },

  // ── Form ───────────────────────────────────────────────────────────────────
  formHTML(t) {
    const today  = new Date().toISOString().split('T')[0];
    const isEUR  = t?.currency === 'EUR';
    return `
      <form onsubmit="Finance.submit(event, ${t ? t.id : 'null'})">

        <!-- Currency toggle -->
        <div class="form-row">
          <label>Currency</label>
          <div class="currency-toggle">
            <label class="cur-opt">
              <input type="radio" name="currency" value="THB" ${!isEUR ? 'checked' : ''} onchange="Finance.onCurrencyChange()">
              <span>฿ THB</span>
            </label>
            <label class="cur-opt">
              <input type="radio" name="currency" value="EUR" ${isEUR ? 'checked' : ''} onchange="Finance.onCurrencyChange()">
              <span>€ EUR</span>
            </label>
          </div>
        </div>

        <div class="form-2">
          <div class="form-row">
            <label id="amount-label">Amount (${isEUR ? '€' : '฿'}) *</label>
            <input id="fin-amount" name="amount_raw" type="number" step="0.01" min="0" required
              value="${t?.amount || ''}" oninput="Finance.onAmountInput()">
            <div id="amount-preview" class="amount-preview"></div>
          </div>
          <div class="form-row">
            <label>Date *</label>
            <input name="date" type="date" required value="${t?.date || today}">
          </div>
        </div>

        <div class="form-2">
          <div class="form-row">
            <label>Type *</label>
            <select name="type" required>
              ${['commission','onboarding','visa','call','autre'].map(s =>
                `<option ${t?.type === s ? 'selected' : ''}>${s}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-row">
            <label>Account *</label>
            <select name="account" required>
              ${['KBank','KBank HSC','Mercury','Wise','Crypto','Revolut'].map(s =>
                `<option ${t?.account === s ? 'selected' : ''}>${s}</option>`
              ).join('')}
            </select>
          </div>
        </div>

        <div class="form-row">
          <label>Notes</label>
          <input name="notes" placeholder="Client, deal, reference…" value="${t?.notes || ''}">
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn btn-primary">${t ? 'Save' : 'Add'}</button>
        </div>
      </form>`;
  },

  onCurrencyChange() {
    const cur = document.querySelector('[name="currency"]:checked')?.value;
    const lbl = document.getElementById('amount-label');
    if (lbl) lbl.textContent = `Amount (${cur === 'EUR' ? '€' : '฿'}) *`;
    this.onAmountInput();
  },

  onAmountInput() {
    const cur = document.querySelector('[name="currency"]:checked')?.value || 'THB';
    const raw = parseFloat(document.getElementById('fin-amount')?.value) || 0;
    const preview = document.getElementById('amount-preview');
    if (!preview) return;
    if (!raw) { preview.textContent = ''; return; }
    if (cur === 'EUR') {
      preview.textContent = `≈ ${Math.round(raw * Finance.eurRate).toLocaleString('fr-FR')} ฿`;
    } else {
      preview.textContent = `≈ ${Math.round(raw / Finance.eurRate).toLocaleString('fr-FR')} €`;
    }
  },

  async submit(e, id) {
    e.preventDefault();
    const fd   = new FormData(e.target);
    const data = Object.fromEntries(fd);
    const cur  = data.currency || 'THB';
    const raw  = parseFloat(data.amount_raw) || 0;

    // Store original amount + currency — no conversion
    data.amount   = raw;
    data.currency = cur;
    delete data.amount_raw;

    try {
      if (id) {
        await api.put(`/finance/${id}`, data);
        Toast.show('Transaction updated');
      } else {
        await api.post('/finance', data);
        Toast.show('Transaction added');
      }
      Modal.close();
      await this.load();
      this.render();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  async remove(id) {
    if (!confirm('Delete this transaction?')) return;
    await api.del(`/finance/${id}`);
    this.data = this.data.filter(t => t.id !== id);
    this.render();
    Toast.show('Transaction deleted');
  }
};
