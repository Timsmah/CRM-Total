const Dashboard = {
  clients: [],
  properties: [],
  finance: [],
  charts: {},

  async init() {
    document.getElementById('content').innerHTML = '<p class="spinner">Loading…</p>';
    try {
      [this.clients, this.properties, this.finance] = await Promise.all([
        api.get('/clients?archived=0'),
        api.get('/properties?archived=0'),
        api.get('/finance')
      ]);
    } catch (err) {
      Toast.show('Error loading dashboard', 'error'); return;
    }
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
    const activeClients = this.clients.filter(c =>
      ['Onboarding','Recherche active'].includes(c.status)
    ).length;
    const availableProps = this.properties.filter(p => p.status === 'Disponible').length;
    const revenueMonth = this.finance
      .filter(t => t.date && t.date.startsWith(thisMonth))
      .reduce((s, t) => s + Number(t.amount), 0);
    const urgentMoveIns = this.clients.filter(c => {
      if (!c.move_in_date) return false;
      const d = Math.ceil((new Date(c.move_in_date) - now) / 86400000);
      return d >= 0 && d <= 30;
    }).length;
    const eurRate = parseFloat(localStorage.getItem('eur_rate') || '37');
    return { activeClients, availableProps, revenueMonth, urgentMoveIns, eurRate };
  },

  pipelineData() {
    const cols = [
      { key: 'À contacter',      label: 'Prospect' },
      { key: 'Contacté',         label: 'To Close' },
      { key: 'Property to Find', label: 'Active Search' },
      { key: 'Urgent Sending',   label: 'Proposal Sent' },
      { key: 'Rappeler',         label: 'Visit Planned' },
    ];
    return cols.map(col => ({
      label: col.label,
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
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      months[key] = 0;
    }
    this.finance.forEach(t => {
      const k = (t.date || '').substring(0, 7);
      if (k in months) months[k] += Number(t.amount);
    });
    return {
      labels: Object.keys(months).map(k => {
        const [y, m] = k.split('-');
        return new Date(y, m-1, 1).toLocaleDateString('en-US', { month: 'short' });
      }),
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
        if (zone && !SKIP.test(zone)) zones[zone] = (zones[zone] || 0) + 1;
      });
    });
    const sorted = Object.entries(zones).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { labels: sorted.map(([z]) => z), values: sorted.map(([, v]) => v) };
  },

  urgentClients() {
    const now = new Date();
    return this.clients
      .filter(c => {
        if (!c.move_in_date) return false;
        const d = Math.ceil((new Date(c.move_in_date) - now) / 86400000);
        return d >= 0 && d <= 60;
      })
      .sort((a, b) => new Date(a.move_in_date) - new Date(b.move_in_date))
      .slice(0, 8);
  },

  // ── Render ────────────────────────────────────────────────────────────────
  render() {
    const kpis     = this.kpis();
    const pipeline = this.pipelineData();
    const revenue  = this.revenueByMonth();
    const zones    = this.zoneData();
    const urgent   = this.urgentClients();
    const now      = new Date();

    const revenueEUR = kpis.revenueMonth
      ? Math.round(kpis.revenueMonth / kpis.eurRate).toLocaleString('fr-FR')
      : '0';

    // last month revenue for trend
    const revValues = revenue.values;
    const lastRev   = revValues[revValues.length - 2] || 0;
    const trend     = lastRev > 0
      ? (kpis.revenueMonth >= lastRev ? '▲' : '▼')
      : '';
    const trendCls  = kpis.revenueMonth >= lastRev ? 'trend-up' : 'trend-down';

    const dateStr = now.toLocaleDateString('en-GB', {
      weekday:'long', day:'numeric', month:'long', year:'numeric'
    });

    document.getElementById('content').innerHTML = `
      <!-- Greeting -->
      <div class="dash-greeting">
        <div>
          <h2 class="dash-hello">${this.greeting()}, Timéo 👋</h2>
          <p class="dash-date">${dateStr}</p>
        </div>
        <div class="dash-greeting-stats">
          <span>${this.clients.length} total clients</span>
          <span>·</span>
          <span>${this.properties.length} properties</span>
        </div>
      </div>

      <!-- KPI row -->
      <div class="dash-kpis">
        <!-- Hero card: Revenue -->
        <div class="kpi-card kpi-hero">
          <div class="kpi-hero-top">
            <span class="kpi-hero-icon">💰</span>
            ${trend ? `<span class="kpi-trend ${trendCls}">${trend} vs last month</span>` : ''}
          </div>
          <div class="kpi-hero-val" data-target="${kpis.revenueMonth}" data-format="thb">0</div>
          <div class="kpi-hero-eur">≈ ${revenueEUR} €</div>
          <div class="kpi-hero-label">Revenue this month</div>
        </div>

        <!-- Active clients -->
        <div class="kpi-card kpi-sm">
          <div class="kpi-icon">🧑‍💼</div>
          <div class="kpi-val kpi-val-lg" data-target="${kpis.activeClients}">0</div>
          <div class="kpi-label">Active Clients</div>
        </div>

        <!-- Properties -->
        <div class="kpi-card kpi-sm">
          <div class="kpi-icon">🏠</div>
          <div class="kpi-val kpi-val-lg" data-target="${kpis.availableProps}">0</div>
          <div class="kpi-label">Available Props</div>
        </div>

        <!-- Urgent move-ins -->
        <div class="kpi-card kpi-sm ${kpis.urgentMoveIns > 0 ? 'kpi-sm-urgent' : ''}">
          <div class="kpi-icon">📅</div>
          <div class="kpi-val kpi-val-lg ${kpis.urgentMoveIns > 0 ? 'urgent-red' : ''}"
               data-target="${kpis.urgentMoveIns}">0</div>
          <div class="kpi-label">Move-ins &lt; 30d</div>
        </div>
      </div>

      <!-- Row 2: Pipeline + Revenue chart -->
      <div class="dash-charts">
        <div class="dash-card">
          <div class="dash-card-title">Pipeline</div>
          <div style="height:180px;position:relative">
            <canvas id="chart-pipeline"></canvas>
          </div>
        </div>
        <div class="dash-card">
          <div class="dash-card-title">Revenue <span style="font-weight:400;color:var(--text-2)">— last 6 months</span></div>
          <div style="height:180px;position:relative">
            <canvas id="chart-revenue"></canvas>
          </div>
        </div>
      </div>

      <!-- Row 3: Zones + Move-ins -->
      <div class="dash-charts">
        <div class="dash-card">
          <div class="dash-card-title">Most Requested Zones</div>
          ${zones.labels.length
            ? `<div style="height:220px;position:relative"><canvas id="chart-zones"></canvas></div>`
            : '<p class="empty" style="padding:40px 0;text-align:center">No client data yet</p>'}
        </div>
        <div class="dash-card">
          <div class="dash-card-title">
            Upcoming Move-ins
            <span class="dash-card-sub">next 60 days</span>
          </div>
          <div class="move-in-list">
            ${urgent.length ? urgent.map(c => {
              const days = Math.ceil((new Date(c.move_in_date) - now) / 86400000);
              const cls  = days <= 14 ? 'urgent-red' : days <= 30 ? 'urgent-amber' : 'urgent-yellow';
              const initials = c.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
              const dateLabel = new Date(c.move_in_date).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
              return `
                <div class="dash-move-in">
                  <div class="move-in-avatar">${initials}</div>
                  <div style="flex:1;min-width:0">
                    <div class="move-in-name">${c.name}</div>
                    <div class="move-in-zone">${c.zones || '—'}</div>
                  </div>
                  <div style="text-align:right;flex-shrink:0">
                    <div class="move-in-days ${cls}">${days}d</div>
                    <div class="move-in-date-lbl">${dateLabel}</div>
                  </div>
                </div>`;
            }).join('') : '<p class="empty" style="padding:40px 0;text-align:center">No upcoming move-ins</p>'}
          </div>
        </div>
      </div>`;

    // Animated counters
    document.querySelectorAll('[data-target]').forEach(el => {
      const target = parseInt(el.dataset.target) || 0;
      const fmt    = el.dataset.format;
      let start = null;
      const step = (ts) => {
        if (!start) start = ts;
        const p    = Math.min((ts - start) / 900, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        const val  = Math.floor(ease * target);
        el.textContent = fmt === 'thb' ? Number(val).toLocaleString('fr-FR') + ' ฿' : val;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });

    setTimeout(() => {
      this.drawPipeline(pipeline);
      this.drawRevenue(revenue);
      if (zones.labels.length) this.drawZones(zones);
    }, 50);
  },

  // ── Charts ────────────────────────────────────────────────────────────────
  drawPipeline(data) {
    if (this.charts.pipeline) this.charts.pipeline.destroy();
    const ctx = document.getElementById('chart-pipeline');
    if (!ctx) return;
    const colors   = ['#D97706','#2563EB','#2A9D5C','#7C3AED','#DC2626'];
    const bgColors = [
      'rgba(217,119,6,.18)','rgba(37,99,235,.18)','rgba(42,157,92,.18)',
      'rgba(124,58,237,.18)','rgba(220,38,38,.18)'
    ];
    this.charts.pipeline = new Chart(ctx, {
      type: 'bar',
      indexAxis: 'y',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: bgColors,
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: c => `  ${c.raw} client${c.raw !== 1 ? 's' : ''}` }
        }},
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 1, color: '#9A9490' }, grid: { color: '#F0EDE8' } },
          y: { ticks: { color: '#3A3630', font: { weight: '600', size: 12 } }, grid: { display: false } }
        },
        animation: { duration: 900, easing: 'easeOutQuart' }
      }
    });
  },

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
          borderColor: '#C9922A',
          borderWidth: 2.5,
          pointBackgroundColor: '#C9922A',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true,
          backgroundColor: (ctx) => {
            const chart = ctx.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return 'transparent';
            const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(201,146,42,.25)');
            gradient.addColorStop(1, 'rgba(201,146,42,0)');
            return gradient;
          }
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: c => '  ' + Number(c.raw).toLocaleString('fr-FR') + ' ฿' }
        }},
        scales: {
          y: { beginAtZero: true, grid: { color: '#F0EDE8' },
               ticks: { color: '#9A9490', callback: v => v ? (v/1000).toFixed(0)+'k ฿' : '0' } },
          x: { ticks: { color: '#9A9490' }, grid: { display: false } }
        },
        animation: { duration: 1000, easing: 'easeOutQuart' }
      }
    });
  },

  drawZones(data) {
    if (this.charts.zones) this.charts.zones.destroy();
    const ctx = document.getElementById('chart-zones');
    if (!ctx) return;
    const colors = ['#C9922A','#2563EB','#2A9D5C','#7C3AED','#DC2626','#0891B2','#D97706','#059669'];
    const bg     = colors.map(c => c + '38');
    this.charts.zones = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          backgroundColor: bg,
          borderColor: colors,
          borderWidth: 2.5,
          hoverOffset: 10,
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
                  fillStyle: bg[i],
                  strokeStyle: colors[i],
                  lineWidth: 2, index: i, hidden: false,
                }));
              }
            }
          },
          tooltip: {
            callbacks: { label: c => `  ${c.label}: ${c.raw} client${c.raw !== 1 ? 's' : ''}` }
          }
        },
        animation: { duration: 1000, easing: 'easeOutQuart' }
      }
    });
  }
};
