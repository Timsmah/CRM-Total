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
    return { activeClients, availableProps, revenueMonth, urgentMoveIns };
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
    // Skip non-geographic / vague answers
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
      .slice(0, 7);
  },

  render() {
    const kpis     = this.kpis();
    const pipeline = this.pipelineData();
    const revenue  = this.revenueByMonth();
    const zones    = this.zoneData();
    const urgent   = this.urgentClients();
    const now      = new Date();

    document.getElementById('content').innerHTML = `
      <div class="section-header">
        <h2>Dashboard</h2>
        <span style="color:var(--text-2);font-size:13px">
          ${now.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </span>
      </div>

      <div class="dash-kpis">
        <div class="kpi-card">
          <div class="kpi-icon">🧑‍💼</div>
          <div class="kpi-val" data-target="${kpis.activeClients}">0</div>
          <div class="kpi-label">Active Clients</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">🏠</div>
          <div class="kpi-val" data-target="${kpis.availableProps}">0</div>
          <div class="kpi-label">Properties Available</div>
        </div>
        <div class="kpi-card kpi-accent">
          <div class="kpi-icon">💰</div>
          <div class="kpi-val" data-target="${kpis.revenueMonth}" data-format="thb">0</div>
          <div class="kpi-label">Revenue This Month</div>
        </div>
        <div class="kpi-card ${kpis.urgentMoveIns > 0 ? 'kpi-urgent' : ''}">
          <div class="kpi-icon">⚠️</div>
          <div class="kpi-val" data-target="${kpis.urgentMoveIns}">0</div>
          <div class="kpi-label">Move-ins &lt; 30 days</div>
        </div>
      </div>

      <div class="dash-charts">
        <div class="dash-card">
          <div class="dash-card-title">Pipeline</div>
          <canvas id="chart-pipeline"></canvas>
        </div>
        <div class="dash-card">
          <div class="dash-card-title">Revenue — Last 6 months</div>
          <canvas id="chart-revenue"></canvas>
        </div>
      </div>

      <div class="dash-charts">
        <div class="dash-card">
          <div class="dash-card-title">Most Requested Zones</div>
          ${zones.labels.length
            ? `<canvas id="chart-zones"></canvas>`
            : '<p class="empty" style="padding:32px 0">No client data yet</p>'}
        </div>
        <div class="dash-card">
          <div class="dash-card-title">
            Upcoming Move-ins
            <span style="font-size:11px;color:var(--text-3);font-weight:400;margin-left:4px">next 60 days</span>
          </div>
          ${urgent.length ? urgent.map(c => {
            const days = Math.ceil((new Date(c.move_in_date) - now) / 86400000);
            const cls  = days <= 14 ? 'urgent-red' : days <= 30 ? 'urgent-amber' : 'urgent-yellow';
            return `<div class="dash-move-in">
              <div style="min-width:0;flex:1">
                <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name}</div>
                <div style="color:var(--text-2);font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.zones || '—'}</div>
              </div>
              <div class="move-in-badge ${cls}">
                <span style="font-size:15px;font-weight:800;line-height:1">${days}</span>
                <span style="font-size:10px;font-weight:600;opacity:.8">days</span>
              </div>
            </div>`;
          }).join('') : '<p class="empty" style="padding:32px 0">No upcoming move-ins</p>'}
        </div>
      </div>`;

    // Animated counters
    document.querySelectorAll('.kpi-val').forEach(el => {
      const target = parseInt(el.dataset.target) || 0;
      const fmt    = el.dataset.format;
      let start = null;
      const step = (ts) => {
        if (!start) start = ts;
        const p   = Math.min((ts - start) / 900, 1);
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

  drawPipeline(data) {
    if (this.charts.pipeline) this.charts.pipeline.destroy();
    const ctx = document.getElementById('chart-pipeline');
    if (!ctx) return;
    const colors   = ['#D97706','#2563EB','#2A9D5C','#7C3AED','#DC2626'];
    const bgColors = ['rgba(217,119,6,.15)','rgba(37,99,235,.15)','rgba(42,157,92,.15)','rgba(124,58,237,.15)','rgba(220,38,38,.15)'];
    this.charts.pipeline = new Chart(ctx, {
      type: 'bar',
      indexAxis: 'y',   // ← horizontal bars
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
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: ctx => `  ${ctx.raw} client${ctx.raw !== 1 ? 's' : ''}` }
        }},
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 1, color: '#7A7670' }, grid: { color: '#F0EDE8' } },
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
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          backgroundColor: 'rgba(201,146,42,.15)',
          borderColor: '#C9922A',
          borderWidth: 2,
          borderRadius: 8,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: ctx => ' ' + Number(ctx.raw).toLocaleString('fr-FR') + ' ฿' }
        }},
        scales: {
          y: { beginAtZero: true, grid: { color: '#F0EDE8' }, ticks: { color: '#7A7670', callback: v => v.toLocaleString('fr-FR') + ' ฿' } },
          x: { ticks: { color: '#7A7670' }, grid: { display: false } }
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
    const bg     = ['rgba(201,146,42,.25)','rgba(37,99,235,.2)','rgba(42,157,92,.2)','rgba(124,58,237,.2)','rgba(220,38,38,.2)','rgba(8,145,178,.2)','rgba(217,119,6,.2)','rgba(5,150,105,.2)'];
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
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: { family: 'Inter', size: 12, weight: '600' },
              color: '#3A3630', padding: 16, boxWidth: 13, borderRadius: 4,
              generateLabels(chart) {
                const ds = chart.data.datasets[0];
                const total = ds.data.reduce((s, v) => s + v, 0);
                return chart.data.labels.map((lbl, i) => ({
                  text: `${lbl}  ·  ${ds.data[i]}`,
                  fillStyle: bg[i],
                  strokeStyle: colors[i],
                  lineWidth: 2,
                  index: i,
                  hidden: false,
                }));
              }
            }
          },
          tooltip: {
            callbacks: {
              label: ctx => `  ${ctx.label}: ${ctx.raw} client${ctx.raw !== 1 ? 's' : ''}`
            }
          }
        },
        animation: { duration: 1000, easing: 'easeOutQuart' }
      }
    });
  }
};
