// App-Gerüst: Tabs, Speicher, Sheet, Datums-Picker, Konfetti, Toast.
// Neue Bereiche melden sich mit App.tab(name, { render(main), badge() }) an.
const App = (() => {
  const $ = (s) => document.querySelector(s);
  // Rosé-Variante: eigene Speicherschlüssel, damit sie sich nie mit der grünen App mischt (auch nicht auf demselben Gerät)
  const localStorage = {
    getItem: (k) => window.localStorage.getItem('rose:' + k),
    setItem: (k, v) => window.localStorage.setItem('rose:' + k, v),
    removeItem: (k) => window.localStorage.removeItem('rose:' + k),
  };
  const tabs = {};

  const store = {
    get(key, fallback, valid) {
      try {
        const x = JSON.parse(localStorage.getItem(key));
        return x !== null && (!valid || valid(x)) ? x : fallback;
      } catch { return fallback; }
    },
    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
      if (!(key in BACKUP)) return;
      localStorage.setItem('app.savedAt', Date.now());
      if (SERVER) { dirty = true; clearTimeout(pushTimer); pushTimer = setTimeout(push, 300); }
    },
  };

  // Formate
  const nf = (d) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: d, minimumFractionDigits: d });
  const fmt0 = nf(0), fmt1 = nf(1);
  const eurF = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
  const eur = (n) => eurF.format(n);
  const df = (o) => new Intl.DateTimeFormat('de-DE', { ...o, timeZone: 'UTC' });
  const dShort = df({ day: '2-digit', month: '2-digit', year: 'numeric' });
  const dNice = df({ weekday: 'short', day: 'numeric', month: 'short' });
  const dLong = df({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const dMon = df({ month: 'long' });
  const dMonShort = df({ month: 'short' });
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const today = () => iso(new Date());
  const parse = (s) => new Date(s + 'T00:00:00Z');
  const DAY = 864e5;
  const daysUntil = (s) => Math.round((parse(s) - parse(today())) / DAY);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // --- Tabs ---
  let current = store.get('app.tab', 'strom');
  function tab(name, def) { tabs[name] = def; }
  function render() {
    if (!tabs[current]) current = 'strom';
    document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === current));
    document.querySelector(`[data-tab="${current}"]`)?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    tabs[current].render($('#view'));
    for (const [name, t] of Object.entries(tabs)) {
      const b = document.querySelector(`[data-badge="${name}"]`);
      if (!b) continue;
      const n = t.badge ? t.badge() : 0;
      b.textContent = n;
      b.hidden = !n;
    }
  }
  function go(name) { current = name; store.set('app.tab', name); window.scrollTo(0, 0); render(); }

  // --- Sheet ---
  const wrap = $('#sheetWrap');
  function sheet(html, label) {
    const s = $('#sheet');
    s.innerHTML = '<div class="grabber"></div>' + html;
    s.setAttribute('aria-label', label || '');
    s.scrollTop = 0;
    wrap.classList.add('open');
    return s;
  }
  function closeSheet() { wrap.classList.remove('open'); document.activeElement && document.activeElement.blur(); }
  $('#backdrop').onclick = closeSheet;

  // --- Verspielter Datums-Picker: pickDate('YYYY-MM-DD') -> Promise<'YYYY-MM-DD' | null>
  const MONTH_EMOJI = ['⛄️', '💘', '🌷', '🐣', '🌼', '🍓', '🍦', '🏖️', '🍎', '🎃', '🍂', '🎄'];
  const pickerEl = $('#picker');
  let closePicker = null;
  function pickDate(value, title) {
    return new Promise((resolve) => {
      let sel = value || today();
      let view = sel.slice(0, 7);
      const done = (result) => {
        pickerEl.classList.remove('show');
        pickerEl.onclick = null;
        closePicker = null;
        resolve(result);
      };
      closePicker = () => done(null);

      function draw(dir) {
        const [y, m] = view.split('-').map(Number);
        const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
        const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
        const t = today();
        let cells = '<span></span>'.repeat(offset);
        for (let d = 1; d <= days; d++) {
          const ds = `${view}-${String(d).padStart(2, '0')}`;
          const cls = ['day', (offset + d - 1) % 7 >= 5 && 'we', ds === t && 'today', ds === sel && 'sel'].filter(Boolean).join(' ');
          cells += `<button type="button" class="${cls}" data-d="${ds}" aria-label="${dLong.format(parse(ds))}" aria-pressed="${ds === sel}">${d}</button>`;
        }
        pickerEl.innerHTML = `<div class="picker" role="dialog" aria-modal="true" aria-label="${esc(title || 'Datum wählen')}">
          <div class="p-head">
            <button type="button" class="p-nav" data-nav="-1" aria-label="Voriger Monat">‹</button>
            <div class="p-title"><span class="p-emoji" aria-hidden="true">${MONTH_EMOJI[m - 1]}</span>${dMon.format(parse(view + '-01'))} <span class="p-year">${y}</span></div>
            <button type="button" class="p-nav" data-nav="1" aria-label="Nächster Monat">›</button>
          </div>
          <div class="p-wd" aria-hidden="true"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span class="we">Sa</span><span class="we">So</span></div>
          <div class="p-grid ${dir > 0 ? 'from-right' : dir < 0 ? 'from-left' : ''}">${cells}</div>
          <div class="p-foot"><button type="button" data-q="0">Heute</button><button type="button" data-q="-1">Gestern</button><button type="button" class="p-cancel" data-q="x">Abbrechen</button></div>
        </div>`;
      }
      function nav(dir) {
        const [y, m] = view.split('-').map(Number);
        const d = new Date(Date.UTC(y, m - 1 + dir, 1));
        view = d.toISOString().slice(0, 7);
        draw(dir);
      }

      pickerEl.onclick = (e) => {
        if (e.target === pickerEl) return done(null);
        const day = e.target.closest('[data-d]');
        if (day) {
          sel = day.dataset.d;
          pickerEl.querySelectorAll('.day.sel').forEach(b => b.classList.remove('sel'));
          day.classList.add('sel');
          setTimeout(() => done(sel), 320); // Hüpfer erst zu Ende sehen
          return;
        }
        const n = e.target.closest('[data-nav]');
        if (n) return nav(Number(n.dataset.nav));
        const q = e.target.closest('[data-q]')?.dataset.q;
        if (q === 'x') return done(null);
        if (q) return done(iso(new Date(Date.now() + Number(q) * DAY)));
      };
      // Wischen wechselt den Monat
      let x0 = null;
      pickerEl.ontouchstart = (e) => { x0 = e.touches[0].clientX; };
      pickerEl.ontouchend = (e) => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0;
        x0 = null;
        if (Math.abs(dx) > 50) nav(dx < 0 ? 1 : -1);
      };

      draw(0);
      requestAnimationFrame(() => pickerEl.classList.add('show'));
      pickerEl.querySelector('.day.sel, .day.today, .day')?.focus();
    });
  }

  // Eurobetrag aus Eingabe: "1.234,56" (deutsch) oder "1234.56"; leer = 0, ungültig = null
  function parseAmount(raw) {
    raw = raw.trim();
    if (!raw) return 0;
    const n = Number(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
  }

  // Figur mit Sprechblase oben in jedem Bereich
  const hero = (svg, say) => `<section class="hero"><div class="bubble">${say}</div>${svg}</section>`;

  // --- Konfetti, Feier, Toast ---
  function confetti(n = 60) {
    const colors = ['#F2307F', '#C9A7F5', '#FFC8A2', '#FF6B8A', '#F7A8C4'];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
      c.style.animationDelay = Math.random() * .4 + 's';
      document.body.appendChild(c);
      c.addEventListener('animationend', () => c.remove());
    }
  }
  const partyEl = $('#party');
  function party(html) {
    partyEl.innerHTML = html + '<button class="primary" id="partyClose">Weiter</button>';
    requestAnimationFrame(() => partyEl.classList.add('show'));
    $('#partyClose').onclick = closeParty;
    $('#partyClose').focus();
  }
  function closeParty() { partyEl.classList.remove('show'); }

  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg, undo) {
    clearTimeout(toastTimer);
    toastEl.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button">Rückgängig</button>' : ''}`;
    if (undo) toastEl.querySelector('button').onclick = () => { toastEl.classList.remove('show'); undo(); };
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 4000);
  }

  // Datei herunterladen/teilen (Backup, Kalender)
  async function share(name, text, type) {
    const file = new File([text], name, { type });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); } catch {}
      return;
    }
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(file), download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // Kalenderdatei (.ics) mit ganztägigen Terminen und Erinnerungen
  // events: [{ uid, start: 'YYYY-MM-DD', rrule|null, summary, desc, alarms: [[trigger, text]] }]
  function icsFile(events) {
    const e = (s) => String(s).replace(/[\\;,]/g, (m) => '\\' + m);
    const enc = new TextEncoder();
    const fold = (line) => { // RFC 5545: max. 75 Oktette pro Zeile
      const out = []; let cur = '', n = 0;
      for (const ch of line) {
        const b = enc.encode(ch).length;
        if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; n = 0; }
        cur += ch; n += b;
      }
      return [...out, cur].join('\r\n ');
    };
    const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Haushalt App//DE', 'CALSCALE:GREGORIAN'];
    for (const ev of events) {
      const end = new Date(parse(ev.start).getTime() + DAY).toISOString().slice(0, 10);
      L.push('BEGIN:VEVENT', `UID:${ev.uid}@haushalt-app`, `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${ev.start.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${end.replace(/-/g, '')}`);
      if (ev.rrule) L.push('RRULE:' + ev.rrule);
      L.push(`SUMMARY:${e(ev.summary)}`, `DESCRIPTION:${e(ev.desc)}`);
      for (const [trigger, text] of ev.alarms) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${e(text)}`, `TRIGGER:${trigger}`, 'END:VALARM');
      L.push('END:VEVENT');
    }
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }

  // Backup über alle Bereiche
  const BACKUP = {
    'strom.readings.v1': calc.validReadings,
    'app.items.v1': calc.validItems,
    'einkauf.items.v1': calc.validShopping,
    'sparen.v1': calc.validSaving,
    'bilanz.v1': calc.validBilanz,
    'geburtstage.v1': calc.validBirthdays,
  };
  const BACKUP_KEYS = Object.keys(BACKUP);

  // --- Haushalt.exe: alles automatisch in Dokumente\Haushalt\haushalt-daten.json ---
  const SERVER = location.host === 'localhost:47812';
  const post = (url, body) => fetch(url, { method: 'POST', headers: { 'X-Haushalt': '1', 'Content-Type': 'application/json' }, body, keepalive: true });
  let pushTimer, dirty = false;
  function push() {
    clearTimeout(pushTimer);
    dirty = false;
    const data = Object.fromEntries(BACKUP_KEYS.map(k => [k, store.get(k, null)]).filter(([, v]) => v !== null));
    return post('/api/data', JSON.stringify({ savedAt: Number(localStorage.getItem('app.savedAt')) || 0, data }, null, 1))
      .catch(() => {}); // Server weg (z. B. nach Standby): Browser-Speicher hat alles, nächster Start gleicht ab
  }
  if (SERVER) {
    try {
      const x = new XMLHttpRequest();
      x.open('GET', '/api/data', false); // synchron, weil die Bereiche ihre Daten direkt beim Laden lesen
      x.send();
      const file = x.status === 200 ? JSON.parse(x.responseText) : null;
      const local = Number(localStorage.getItem('app.savedAt')) || 0;
      // Datei gewinnt, außer im Fenster wurde danach noch etwas gespeichert
      if (file && file.data && (Number(file.savedAt) || 0) >= local) {
        for (const k of BACKUP_KEYS) {
          if (!(k in file.data)) localStorage.removeItem(k);
          else if (BACKUP[k](file.data[k])) localStorage.setItem(k, JSON.stringify(file.data[k]));
        }
        localStorage.setItem('app.savedAt', Number(file.savedAt) || 0);
      } else setTimeout(push, 0);
    } catch { /* Datei nicht lesbar: mit Browser-Speicher weiterarbeiten */ }
    // Fenstergröße/-position für den nächsten Start merken. Abfragen statt beim Schließen speichern:
    // beim Schließen meldet Edge falsche Maße, und Verschieben löst kein Ereignis aus.
    const win = () => [outerWidth, outerHeight, screenX, screenY,
      outerWidth >= screen.availWidth - 8 && outerHeight >= screen.availHeight - 8 ? 1 : 0].join(',');
    let lastWin = win();
    setInterval(() => {
      if (document.hidden || win() === lastWin) return;
      lastWin = win();
      post('/api/window', lastWin).catch(() => {});
    }, 2000);
    const ping = () => post('/api/ping', '').catch(() => {});
    ping();
    setInterval(ping, 20000);
    document.addEventListener('visibilitychange', async () => {
      if (document.hidden) { if (dirty) push(); return; }
      // zurück im Fenster: hat ein anderes Fenster inzwischen Neueres gespeichert, neu laden
      try {
        const f = await (await fetch('/api/data')).json();
        if ((Number(f.savedAt) || 0) > (Number(localStorage.getItem('app.savedAt')) || 0)) location.reload();
      } catch {}
    });
  }
  function exportAll() {
    const data = Object.fromEntries(BACKUP_KEYS.map(k => [k, store.get(k, null)]).filter(([, v]) => v !== null));
    share(`haushalt-backup-${today()}.json`, JSON.stringify(data, null, 2), 'application/json');
  }
  function importAll() {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json,.json' });
    inp.onchange = async () => {
      try {
        let x = JSON.parse(await inp.files[0].text());
        if (Array.isArray(x)) x = { 'strom.readings.v1': x }; // altes Strom-Backup
        const ok = BACKUP_KEYS.every(k => !x[k] || BACKUP[k](x[k])) && BACKUP_KEYS.some(k => x[k]);
        if (!ok) throw new Error();
        if (!confirm('Backup laden? Die aktuellen Daten werden ersetzt.')) return;
        BACKUP_KEYS.forEach(k => x[k] && store.set(k, x[k]));
        if (SERVER) await push();
        location.reload();
      } catch { alert('Die Datei ist kein gültiges Backup.'); }
    };
    inp.click();
  }

  function start() {
    document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => go(b.dataset.tab));
    const fs = $('#fsBtn');
    fs.onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {});
    document.addEventListener('fullscreenchange', () => { fs.querySelector('span').textContent = document.fullscreenElement ? 'Vollbild beenden' : 'Vollbild'; });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (closePicker) closePicker(); else { closeSheet(); closeParty(); }
    });
    render();
    // exe-Version speichert in eine Datei und braucht keinen Offline-Cache
    if ('serviceWorker' in navigator && location.protocol !== 'file:' && !SERVER) navigator.serviceWorker.register('sw.js');
    // iPhone/Browser: Speicher als dauerhaft markieren, damit er nicht automatisch geleert wird
    if (!SERVER) navigator.storage?.persist?.();
  }

  return {
    tab, render, go, start, store, sheet, closeSheet, pickDate, hero, parseAmount, icsFile, confetti, party, toast, share, exportAll, importAll,
    fmt0, fmt1, eur, dShort, dNice, dLong, dMon, dMonShort, iso, today, parse, DAY, daysUntil, esc,
  };
})();
