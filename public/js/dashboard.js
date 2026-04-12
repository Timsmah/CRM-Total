const Dashboard = {
  clients: [], properties: [], finance: [], charts: {},

  async init() {
    document.getElementById('content').innerHTML = '<p class="spinner">Loading…</p>';
    try {
      [this.clients, this.properties, this.finance] = await Promise.all([
        api.get('/clients?archived=0'),
        api.get('/properties?archived=0'),
        api.get('/finance')
      ]);
    } catch (err) { Toast.show('Error loading dashboard', 'error'); return; }
    this.render();
  },

  greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  },

  kpis() {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const activeClients  = this.clients.filter(c => ['Onboarding','Recherche active'].includes(c.status)).length;
    const availableProps = this.properties.filter(p => p.status === 'Disponible').length;
    const revenueMonth   = this.finance.filter(t => t.date?.startsWith(thisMonth)).reduce((s,t) => s + Number(t.amount), 0);
    const urgentMoveIns  = this.clients.filter(c => {
      if (!c.move_in_date) return false;
      const d = Math.ceil((new Date(c.move_in_date) - now) / 86400000);
      return d >= 0 && d <= 30;
    }).length;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastKey   = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth()+1).padStart(2,'0')}`;
    const revLast   = this.finance.filter(t => t.date?.startsWith(lastKey)).reduce((s,t) => s + Number(t.amount), 0);
    const eurRate   = parseFloat(localStorage.getItem('eur_rate') || '37');
    return { activeClients, availableProps, revenueMonth, urgentMoveIns, revLast, eurRate };
  },

  pipelineData() {
    const cols = [
      { key: 'À contacter',      label: '🆕 Prospect',      color: '#D97706' },
      { key: 'Contacté',         label: '🎯 To Close',       color: '#2563EB' },
      { key: 'Property to Find', label: '🔍 Active Search',  color: '#16A34A' },
      { key: 'Urgent Sending',   label: '📤 Proposal Sent',  color: '#7C3AED' },
      { key: 'Rappeler',         label: '📅 Visit Planned',  color: '#DC2626' },
    ];
    return cols.map(col => ({
      ...col,
      count: this.clients.filter(c => {
        const eff = (c.research_fees_paid && c.status === 'Recherche active')
          ? 'Property to Find' : (c.contact_status || 'À contacter');
        return eff === col.key;
      }).length
    }));
  },

  revenueByMonth() {
    const now = new Date();
    const months = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`] = 0;
    }
    this.finance.forEach(t => { const k = (t.date||'').slice(0,7); if (k in months) months[k] += Number(t.amount); });
    return {
      labels: Object.keys(months).map(k => { const [y,m] = k.split('-'); return new Date(y,m-1,1).toLocaleDateString('en-US',{month:'short'}); }),
      values: Object.values(months)
    };
  },

  zoneData() {
    const SKIP = /non\s*pr[eé]cis[eé]|je ne sais|pas encore|autre|unknown|n\/a|^-+$/i;
    const zones = {};
    this.clients.forEach(c => {
      if (!c.zones) return;
      c.zones.split(/[,/]/).forEach(z => {
        const zone = z.trim();
        if (zone && !SKIP.test(zone)) zones[zone] = (zones[zone]||0) + 1;
      });
    });
    const sorted = Object.entries(zones).sort((a,b) => b[1]-a[1]).slice(0,8);
    return { labels: sorted.map(([z])=>z), values: sorted.map(([,v])=>v) };
  },

  urgentClients() {
    const now = new Date();
    return this.clients.filter(c => {
      if (!c.move_in_date) return false;
      const d = Math.ceil((new Date(c.move_in_date) - now) / 86400000);
      return d >= 0 && d <= 60;
    }).sort((a,b) => new Date(a.move_in_date) - new Date(b.move_in_date)).slice(0,8);
  },

  // ── Pipeline as HTML bars ────────────────────────────────────────────────
  pipelineHTML(data) {
    const max = Math.max(...data.map(d => d.count), 1);
    return `<div class="pipeline-stages">
      ${data.map(d => `
        <div class="pipeline-row">
          <span class="pipeline-lbl">${d.label}</span>
          <div class="pipeline-track">
            <div class="pipeline-fill" style="width:${d.count ? Math.max(d.count/max*100, 4) : 0}%;background:#FF6B00"></div>
          </div>
          <span class="pipeline-num">${d.count}</span>
        </div>`).join('')}
    </div>`;
  },

  // ── Render ────────────────────────────────────────────────────────────────
  render() {
    const kpis     = this.kpis();
    const pipeline = this.pipelineData();
    const revenue  = this.revenueByMonth();
    const zones    = this.zoneData();
    const urgent   = this.urgentClients();
    const now      = new Date();

    const revFmt    = Number(kpis.revenueMonth).toLocaleString('fr-FR');
    const revEUR    = Math.round(kpis.revenueMonth / kpis.eurRate).toLocaleString('fr-FR');
    const trendPct  = kpis.revLast > 0 ? Math.round((kpis.revenueMonth - kpis.revLast) / kpis.revLast * 100) : null;
    const trendUp   = trendPct !== null && trendPct >= 0;

    document.getElementById('content').innerHTML = `

      <!-- ── Top greeting ── -->
      <div class="dash-top">
        <div>
          <p class="dash-tagline">${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</p>
          <h2 class="dash-hello">${this.greeting()}, Timéo 👋</h2>
        </div>
        <div class="dash-top-stats">
          <div class="dash-top-stat">
            <span class="dash-top-val">${this.clients.length}</span>
            <span class="dash-top-label">Total Clients</span>
          </div>
          <div class="dash-top-divider"></div>
          <div class="dash-top-stat">
            <span class="dash-top-val">${this.properties.length}</span>
            <span class="dash-top-label">Properties</span>
          </div>
          <div class="dash-top-divider"></div>
          <div class="dash-top-stat">
            <span class="dash-top-val" style="color:#FF6B00">${Math.round(kpis.revenueMonth/1000)}k ฿</span>
            <span class="dash-top-label">This month</span>
          </div>
        </div>
      </div>

      <!-- ── KPI cards ── -->
      <div class="dash-kpis">

        <!-- Revenue hero -->
        <div class="kpi-card kpi-hero">
          <div class="kpi-hero-eyebrow">💰 Revenue this month</div>
          <div class="kpi-hero-val" data-target="${kpis.revenueMonth}" data-format="thb">0</div>
          <div class="kpi-hero-eur">≈ ${revEUR} €</div>
          ${trendPct !== null ? `
            <div class="kpi-hero-trend ${trendUp ? 'trend-up' : 'trend-down'}">
              ${trendUp ? '▲' : '▼'} ${Math.abs(trendPct)}% vs last month
            </div>` : ''}
        </div>

        <!-- Active clients -->
        <div class="kpi-card kpi-sm kpi-blue">
          <div class="kpi-sm-icon">🧑‍💼</div>
          <div class="kpi-sm-val" data-target="${kpis.activeClients}">0</div>
          <div class="kpi-sm-label">Active Clients</div>
        </div>

        <!-- Properties -->
        <div class="kpi-card kpi-sm kpi-green">
          <div class="kpi-sm-icon">🏠</div>
          <div class="kpi-sm-val" data-target="${kpis.availableProps}">0</div>
          <div class="kpi-sm-label">Available Props</div>
        </div>

        <!-- Urgent -->
        <div class="kpi-card kpi-sm ${kpis.urgentMoveIns > 0 ? 'kpi-red' : 'kpi-neutral'}">
          <div class="kpi-sm-icon">📅</div>
          <div class="kpi-sm-val" data-target="${kpis.urgentMoveIns}">0</div>
          <div class="kpi-sm-label">Move-ins &lt; 30d</div>
        </div>
      </div>

      <!-- ── Row 2: Pipeline + Revenue ── -->
      <div class="dash-charts">
        <div class="dash-card">
          <div class="dash-card-title">Pipeline</div>
          ${this.pipelineHTML(pipeline)}
        </div>
        <div class="dash-card">
          <div class="dash-card-title">Revenue <span class="dash-card-sub">last 6 months</span></div>
          <div style="height:200px;position:relative">
            <canvas id="chart-revenue"></canvas>
          </div>
        </div>
      </div>

      <!-- ── Row 3: Zones + Move-ins ── -->
      <div class="dash-charts">
        <div class="dash-card">
          <div class="dash-card-title">Most Requested Zones</div>
          ${zones.labels.length
            ? `<div style="height:240px;position:relative"><canvas id="chart-zones"></canvas></div>`
            : '<p class="empty" style="padding:60px 0;text-align:center;color:var(--text-3)">No client data yet</p>'}
        </div>
        <div class="dash-card">
          <div class="dash-card-title">Upcoming Move-ins <span class="dash-card-sub">next 60 days</span></div>
          ${urgent.length ? `<div class="move-in-list">${urgent.map(c => {
            const days = Math.ceil((new Date(c.move_in_date) - now) / 86400000);
            const color = days <= 14 ? '#DC2626' : days <= 30 ? '#D97706' : '#16A34A';
            const bg    = days <= 14 ? '#FEF2F2' : days <= 30 ? '#FEF3C7' : '#F0FDF4';
            const ini   = c.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
            const dateLbl = new Date(c.move_in_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
            return `<div class="dash-move-in">
              <div class="move-in-avatar">${ini}</div>
              <div style="flex:1;min-width:0">
                <div class="move-in-name">${c.name}</div>
                <div class="move-in-zone">${c.zones||'—'}</div>
              </div>
              <div class="move-in-pill" style="background:${bg};color:${color}">
                <span style="font-size:16px;font-weight:900;line-height:1">${days}</span>
                <span style="font-size:10px;font-weight:700">days · ${dateLbl}</span>
              </div>
            </div>`;
          }).join('')}</div>`
          : '<p class="empty" style="padding:60px 0;text-align:center;color:var(--text-3)">No upcoming move-ins</p>'}
        </div>
      </div>`;

    // Animated counters
    document.querySelectorAll('[data-target]').forEach(el => {
      const target = parseInt(el.dataset.target) || 0;
      const fmt    = el.dataset.format;
      let start = null;
      const step = ts => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 900, 1);
        const ease = 1 - Math.pow(1-p, 3);
        const val  = Math.floor(ease * target);
        el.textContent = fmt === 'thb' ? Number(val).toLocaleString('fr-FR') + ' ฿' : val;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });

    // Pipeline bars animate in
    setTimeout(() => {
      document.querySelectorAll('.pipeline-fill').forEach(el => {
        const w = el.style.width; el.style.width = '0';
        requestAnimationFrame(() => { el.style.transition = 'width .8s cubic-bezier(.4,0,.2,1)'; el.style.width = w; });
      });
    }, 50);

    setTimeout(() => {
      this.drawRevenue(revenue);
      if (zones.labels.length) this.drawZones(zones);
    }, 60);
  },

  // ── Charts ────────────────────────────────────────────────────────────────
  drawRevenue(data) {
    if (this.charts.revenue) this.charts.revenue.destroy();
    const ctx = document.getElementById('chart-revenue');
    if (!ctx) return;
    this.charts.revenue = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          borderColor: '#FF6B00',
          borderWidth: 3,
          pointBackgroundColor: '#FF6B00',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.4,
          fill: true,
          backgroundColor: ctx2 => {
            const c = ctx2.chart, { ctx: c2, chartArea } = c;
            if (!chartArea) return 'transparent';
            const g = c2.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            g.addColorStop(0, 'rgba(255,107,0,.30)');
            g.addColorStop(1, 'rgba(255,107,0,0)');
            return g;
          }
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: {
          backgroundColor: '#1A1A1A', padding: 10, cornerRadius: 8,
          callbacks: { label: c => '  ' + Number(c.raw).toLocaleString('fr-FR') + ' ฿' }
        }},
        scales: {
          y: { beginAtZero: true, grid: { color: '#F0EDE8' },
               ticks: { color: '#9A9490', callback: v => v ? (v>=1000 ? (v/1000).toFixed(0)+'k' : v) + ' ฿' : '0' }},
          x: { ticks: { color: '#9A9490', font: { weight: '600' } }, grid: { display: false } }
        },
        animation: { duration: 1000, easing: 'easeOutQuart' }
      }
    });
  },

  drawZones(data) {
    if (this.charts.zones) this.charts.zones.destroy();
    const ctx = document.getElementById('chart-zones');
    if (!ctx) return;
    // 2-color family: orange spectrum + béton spectrum
    const colors = ['#FF6B00','#3D3D3D','#FF8C33','#5A5A5A','#FFAD66','#787878','#CC5500','#A0A0A0'];
    this.charts.zones = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          backgroundColor: colors.slice(0, data.labels.length),
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: { family: 'Inter', size: 12, weight: '600' },
              color: '#3A3630', padding: 14, boxWidth: 12, borderRadius: 3,
              generateLabels(chart) {
                const ds = chart.data.datasets[0];
                return chart.data.labels.map((lbl, i) => ({
                  text: `${lbl}  ·  ${ds.data[i]}`,
                  fillStyle: colors[i],
                  strokeStyle: colors[i],
                  lineWidth: 0, index: i, hidden: false,
                }));
              }
            }
          },
          tooltip: {
            backgroundColor: '#1A1A1A', padding: 10, cornerRadius: 8,
            callbacks: { label: c => `  ${c.label}: ${c.raw} client${c.raw !== 1 ? 's' : ''}` }
          }
        },
        animation: { duration: 1000, easing: 'easeOutQuart' }
      }
    });
  }
};
