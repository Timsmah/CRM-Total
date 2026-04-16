const Today = {
  async init() {
    document.getElementById('content').innerHTML = '<p class="spinner">Loading…</p>';
    try {
      const clients = await api.get('/clients?archived=false');
      this.render(clients);
    } catch (err) {
      document.getElementById('content').innerHTML = `<p style="color:var(--red)">${err.message}</p>`;
    }
  },

  render(clients) {
    const todayStr = new Date().toISOString().split('T')[0];

    // Reminders for today or past-due
    const reminders = clients.filter(c => c.reminder_date && c.reminder_date <= todayStr)
      .sort((a, b) => a.reminder_date.localeCompare(b.reminder_date));

    // Urgent move-ins ≤ 14 days
    const urgent = clients.filter(c => {
      if (!c.move_in_date) return false;
      const days = Math.ceil((new Date(c.move_in_date) - new Date()) / 86400000);
      return days >= 0 && days <= 14;
    }).sort((a, b) => new Date(a.move_in_date) - new Date(b.move_in_date));

    // Approaching move-ins 15-30 days
    const soon = clients.filter(c => {
      if (!c.move_in_date) return false;
      const days = Math.ceil((new Date(c.move_in_date) - new Date()) / 86400000);
      return days > 14 && days <= 30;
    }).sort((a, b) => new Date(a.move_in_date) - new Date(b.move_in_date));

    const greeting = this.greeting();

    document.getElementById('content').innerHTML = `
      <div class="section-header">
        <h2>${greeting} · ${t('today_title')}</h2>
        <span style="font-size:13px;color:var(--text-2)">${this.fmtTodayDate()}</span>
      </div>

      <div class="today-grid">

        <!-- REMINDERS -->
        <div class="today-section">
          <div class="today-section-title">${t('today_reminders')} <span class="kanban-count">${reminders.length}</span></div>
          ${reminders.length ? reminders.map(c => this.reminderCard(c, todayStr)).join('') : `<p class="sub-empty">${t('today_no_reminders')}</p>`}
        </div>

        <!-- URGENT MOVE-INS -->
        <div class="today-section">
          <div class="today-section-title">${t('today_urgent')} <span class="kanban-count">${urgent.length}</span></div>
          ${urgent.length ? urgent.map(c => this.urgentCard(c)).join('') : `<p class="sub-empty">${t('today_no_urgent')}</p>`}
          ${soon.length ? `
            <div class="today-section-subtitle">🟡 ${getLang() === 'fr' ? 'Dans 15–30 jours' : 'In 15–30 days'} (${soon.length})</div>
            ${soon.map(c => this.urgentCard(c)).join('')}
          ` : ''}
        </div>

      </div>`;
  },

  reminderCard(c, todayStr) {
    const isPast = c.reminder_date < todayStr;
    const isToday = c.reminder_date === todayStr;
    const urgencyClass = isPast ? 'urgent-red' : 'urgent-amber';
    const label = isPast ? (getLang() === 'fr' ? '⚠ En retard' : '⚠ Overdue') : (getLang() === 'fr' ? '📅 Aujourd\'hui' : '📅 Today');
    return `
      <div class="today-card" onclick="Today.openClient(${c.id})">
        <div class="today-card-top">
          <span class="today-client-name">${c.name}</span>
          <span class="action-tag ${isPast ? 'tag-hot' : 'tag-payer'} reminder-chip">${label}</span>
        </div>
        ${c.reminder_note ? `<p class="today-note">💬 ${c.reminder_note}</p>` : ''}
        ${c.whatsapp ? `<a class="btn btn-wa btn-sm" href="https://wa.me/${c.whatsapp.replace(/\D/g,'')}" target="_blank" onclick="event.stopPropagation()">WhatsApp</a>` : ''}
      </div>`;
  },

  urgentCard(c) {
    const days = Math.ceil((new Date(c.move_in_date) - new Date()) / 86400000);
    const urgency = days <= 14 ? 'urgent-red' : 'urgent-amber';
    const label = days === 0 ? (getLang() === 'fr' ? 'Aujourd\'hui' : 'Today')
                : days === 1 ? (getLang() === 'fr' ? 'Demain' : 'Tomorrow')
                : `J-${days}`;
    return `
      <div class="today-card" onclick="Today.openClient(${c.id})">
        <div class="today-card-top">
          <span class="today-client-name">${c.name}</span>
          <span class="${urgency}" style="font-size:12px;font-weight:700">${label}</span>
        </div>
        <p class="today-note">📅 ${fmtDate(c.move_in_date)}${c.zones ? ' · ' + c.zones : ''}</p>
        ${c.whatsapp ? `<a class="btn btn-wa btn-sm" href="https://wa.me/${c.whatsapp.replace(/\D/g,'')}" target="_blank" onclick="event.stopPropagation()">WhatsApp</a>` : ''}
      </div>`;
  },

  async openClient(id) {
    await Router.navigate('clients');
    // Wait for clients to load, then open detail modal
    const tryOpen = (tries = 0) => {
      const c = Clients.data.find(x => x.id === id);
      if (c) { Clients.openDetailModal(id); return; }
      if (tries < 10) setTimeout(() => tryOpen(tries + 1), 150);
    };
    setTimeout(() => tryOpen(), 200);
  },

  greeting() {
    const h = new Date().getHours();
    if (h < 12) return t('dash_morning');
    if (h < 18) return t('dash_afternoon');
    return t('dash_evening');
  },

  fmtTodayDate() {
    return new Date().toLocaleDateString(getLang() === 'fr' ? 'fr-FR' : 'en-GB', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  }
};
