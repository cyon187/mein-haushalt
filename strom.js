// Bereich Strom: Zählerstände, Verbrauch, Maskottchen Volti.
(() => {
  const { fmt0, fmt1, dShort, dMon, parse, today, DAY } = App;
  const KEY = 'strom.readings.v1';
  const WHEEL = 56;
  let readings = App.store.get(KEY, [], calc.validReadings);

  function save() {
    readings.sort((a, b) => a.date.localeCompare(b.date));
    App.store.set(KEY, readings);
  }

  // Volti: Glühbirne mit Gesicht, Laune = good | ok | neutral | hello | high
  function volti(mood, size) {
    const c = mood === 'high' ? '#FF9F0A' : '#F2307F';
    const ink = mood === 'high' ? '#3a1f00' : '#5A1430';
    const mouth = {
      good: `<path d="M36 60 q14 16 28 0 z" fill="${ink}"/>`,
      hello: `<path d="M37 60 q13 13 26 0" stroke="${ink}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
      ok: `<path d="M40 62 q10 8 20 0" stroke="${ink}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
      neutral: `<path d="M41 63 h18" stroke="${ink}" stroke-width="4.5" stroke-linecap="round"/>`,
      high: `<ellipse cx="50" cy="65" rx="7" ry="8" fill="${ink}"/>`,
    }[mood];
    const extra = mood === 'high'
      ? `<path d="M30 33 l12 4 M70 33 l-12 4" stroke="${ink}" stroke-width="4" stroke-linecap="round"/><path d="M82 30 q6 10 0 14 q-6-4 0-14z" fill="#64D2FF"/>`
      : mood === 'good' || mood === 'hello'
        ? `<circle cx="29" cy="56" r="6" fill="#ff6b8a" opacity=".55"/><circle cx="71" cy="56" r="6" fill="#ff6b8a" opacity=".55"/><g stroke="${c}" stroke-width="4" stroke-linecap="round" opacity=".7"><path d="M8 20 l6 5"/><path d="M92 20 l-6 5"/><path d="M2 50 h6"/><path d="M98 50 h-6"/></g>`
        : '';
    return `<svg class="volti ${mood}" width="${size}" height="${size * 1.2}" viewBox="0 0 100 120" aria-hidden="true">
      <circle cx="50" cy="48" r="36" fill="${c}"/>
      <ellipse cx="36" cy="28" rx="9" ry="6" fill="#fff" opacity=".35" transform="rotate(-30 36 28)"/>
      <rect x="35" y="78" width="30" height="10" rx="3" fill="${c}"/>
      <rect x="34" y="88" width="32" height="8" rx="4" fill="#8E8E93"/>
      <rect x="36" y="97" width="28" height="8" rx="4" fill="#636366"/>
      <rect x="43" y="106" width="14" height="7" rx="3.5" fill="#48484A"/>
      <ellipse class="eye" cx="38" cy="45" rx="5" ry="6" fill="${ink}"/>
      <ellipse class="eye" cx="62" cy="45" rx="5" ry="6" fill="${ink}"/>
      ${mouth}${extra}
    </svg>`;
  }

  const pick = (arr, seed) => arr[[...String(seed)].reduce((s, ch) => s + ch.charCodeAt(0), 0) % arr.length];
  const LINES = {
    good: ['Sparfuchs! Weniger als sonst. 🦊', 'Läuft! Dein Zähler hat sich ausgeruht.', 'Grüner wird’s nicht. Stark!'],
    ok: ['Alles im grünen Bereich.', 'Ganz normaler Monat. Entspannt.', 'Wie immer. Ich mag Routine.'],
    high: ['Uff! Da glühen die Drähte. 🔥', 'Huch! Wer hat die Sauna angelassen?', 'Mein Kopf wird ganz heiß!'],
  };
  // grobe Vergleichswerte in kWh pro Einheit
  const FACTS = [
    [0.015, (n) => `So viel Strom reicht, um dein Handy ${n}-mal zu laden. 📱`],
    [0.04, (n) => `Damit könntest du ${n} Tassen Kaffee kochen. ☕️`],
    [0.18, (n) => `Ein E-Auto käme damit ${n} km weit. 🚗`],
    [1, (n) => `Das reicht, um ${n} Pizzen im Ofen zu backen. 🍕`],
    [0.8, (n) => `Damit laufen ${n} Ladungen Wäsche. 🧺`],
  ];

  function render(main) {
    const ps = calc.periods(readings);
    const st = calc.stats(ps);
    const last = ps[ps.length - 1];
    const lastReading = readings[readings.length - 1];
    const t = today();
    const due = !lastReading || lastReading.date.slice(0, 7) < t.slice(0, 7);
    const mood = calc.mood(last);
    const streak = calc.streak(readings, t);

    let say;
    if (!readings.length) say = 'Hi, ich bin Volti! Lies deinen Zähler ab, ich rechne mit.';
    else if (due) say = 'Neuer Monat! Zeit zum Ablesen. 👀';
    else if (!last) say = 'Startstand notiert! Nächsten Monat sehen wir, was du verbraucht hast.';
    else if (mood === 'neutral') say = st
      ? `Jetzt kenne ich deinen Schnitt: Ø ${fmt0.format(st.perMonth)} kWh! 🎉`
      : `Notiert! Noch ${calc.MIN_HISTORY - ps.length} Monat(e), dann kenne ich deinen Schnitt.`;
    else say = pick(LINES[mood], last.to);

    let h = `<div class="top"><div><div class="eyebrow">Stromzähler</div><h1>Strom</h1></div></div>
      <div class="cols"><div><section class="hero"><div class="bubble">${say}</div>${volti(last ? mood : 'hello', 120)}`;
    if (last) {
      h += `<div class="big display num" style="color:${mood === 'high' ? 'var(--orange)' : 'var(--text)'}">${fmt0.format(last.kwh)}<small>kWh</small></div>
        <div class="caption">verbraucht seit ${dShort.format(parse(last.from))} · abgelesen im ${dMon.format(parse(last.to))}</div><div class="chips">`;
      if (mood === 'high') h += `<span class="chip warn">+${Math.round((last.perDay / last.avgBefore - 1) * 100)} % über Schnitt</span>`;
      if (st) h += `<span class="chip">Ø ${fmt0.format(st.perMonth)} kWh</span>`;
      if (streak > 1) h += `<span class="chip fire">🔥 ${streak} Monate</span>`;
      h += `</div>`;
    } else if (lastReading) {
      h += `<div class="big display num">${fmt0.format(lastReading.value)}<small>kWh</small></div><div class="caption">Startstand</div>`;
    }
    h += `</section><button class="primary" data-act="add">Zähler ablesen</button>`;

    // Jeder eingetragene Monat: Zählerstand und Verbrauch seit der Ablesung davor
    if (readings.length) {
      h += '</div><div>'; // rechte Spalte nur mit Einträgen, sonst bleibt alles mittig
      const max = Math.max(1, ...ps.map(p => p.kwh));
      const byTo = Object.fromEntries(ps.map(p => [p.to, p]));
      const year = t.slice(0, 4);
      h += `<div class="section-title"><span>Alle Monate</span><span>${readings.length} ${readings.length === 1 ? 'Ablesung' : 'Ablesungen'}</span></div><div class="list">`;
      for (const r of [...readings].reverse()) {
        const p = byTo[r.date];
        const month = dMon.format(parse(r.date)) + (r.date.slice(0, 4) !== year ? ' ' + r.date.slice(0, 4) : '');
        h += `<button class="srow ${p && calc.mood(p) === 'high' ? 'high' : ''}" data-del="${r.date}"
            aria-label="${month}: ${p ? fmt0.format(p.kwh) + ' kWh verbraucht' : 'Startstand'}, Zählerstand ${fmt1.format(r.value)} kWh. Antippen zum Löschen">
          <span class="sm"><b>${month}</b><small class="num">${r.date.slice(8, 10)}.${r.date.slice(5, 7)}. · Stand ${fmt0.format(r.value)}</small></span>
          <span class="bar">${p ? `<i style="width:${Math.max(4, p.kwh / max * 100)}%"></i>` : ''}</span>
          <span class="kwh num">${p ? `+${fmt0.format(p.kwh)}<small>kWh</small>` : '<small>Start</small>'}</span></button>`;
      }
      h += `</div><div class="footnote">Plus-Wert = verbraucht seit der Ablesung davor. Antippen zum Löschen.</div>`;
    }
    h += `<div class="links"><a href="erinnerung.ics">🔔 Erinnerung</a><button data-act="export">Backup sichern</button><button data-act="import">Laden</button></div></div></div>`;
    main.innerHTML = h;

    main.onclick = (e) => {
      const del = e.target.closest('[data-del]');
      if (del) {
        const d = del.dataset.del;
        if (confirm(`Ablesung vom ${dShort.format(parse(d))} löschen?`)) { readings = readings.filter(r => r.date !== d); save(); App.render(); }
        return;
      }
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'add') openSheet();
      if (act === 'export') App.exportAll();
      if (act === 'import') App.importAll();
    };
  }

  // --- Ablese-Sheet mit Drehrädchen ---
  let wheels = [], date, s;

  function openSheet() {
    date = today();
    s = App.sheet(`<form id="sForm" novalidate>
      <div class="sheet-head"><button type="button" data-close>Abbrechen</button><h2>Zähler ablesen</h2><span style="min-width:70px"></span></div>
      <p class="hint">Dreh die Rädchen, bis sie wie dein Zähler aussehen.</p>
      <div class="meter" id="meter"></div>
      <div class="when">
        <button type="button" class="cal" id="cal" aria-label="Ablesedatum ändern">
          <span class="cal-top" id="calMonth"></span><span class="cal-day num" id="calDay"></span><span class="cal-wd" id="calWd"></span>
        </button>
        <div><div class="delta num" id="delta" aria-live="polite"></div><div class="when-sub" id="whenSub"></div></div>
      </div>
      <div class="err" id="err" role="alert"></div>
      <button class="primary" type="submit">Eintragen ⚡</button>
    </form>`, 'Zähler ablesen');
    s.querySelector('[data-close]').onclick = App.closeSheet;
    s.querySelector('#cal').onclick = async () => {
      const d = await App.pickDate(date, 'Ablesedatum');
      if (d && d !== date) { date = d; updateCal(true); updateDelta(); }
    };
    s.querySelector('#sForm').onsubmit = submit;
    updateCal(false);
    const last = readings[readings.length - 1];
    const st = calc.stats(calc.periods(readings));
    // Vorschlag: letzter Stand + erwarteter Verbrauch, so muss man meist nur die hinteren Rädchen drehen
    buildMeter(last ? last.value + (st ? st.perDay * Math.max(0, (parse(date) - parse(last.date)) / DAY) : 0) : 0);
  }

  const dCalMon = new Intl.DateTimeFormat('de-DE', { month: 'short', timeZone: 'UTC' });
  const dCalWd = new Intl.DateTimeFormat('de-DE', { weekday: 'long', timeZone: 'UTC' });
  function updateCal(animate) {
    const d = parse(date);
    s.querySelector('#calMonth').textContent = dCalMon.format(d).replace('.', '');
    s.querySelector('#calDay').textContent = d.getUTCDate();
    s.querySelector('#calWd').textContent = dCalWd.format(d);
    const ago = -App.daysUntil(date);
    const rel = ago === 0 ? 'heute' : ago === 1 ? 'gestern' : ago > 1 ? `vor ${ago} Tagen` : 'in der Zukunft?';
    s.querySelector('#whenSub').textContent = `Abgelesen ${rel} · Kalender antippen zum Ändern`;
    const cal = s.querySelector('#cal');
    if (animate) { cal.classList.remove('flip'); void cal.offsetWidth; cal.classList.add('flip'); }
  }

  function buildMeter(value) {
    const meter = s.querySelector('#meter');
    const tenths = Math.round(value * 10);
    const intDigits = Math.max(6, String(Math.floor(tenths / 10)).length);
    const digits = String(tenths).padStart(intDigits + 1, '0').split('').map(Number);
    meter.innerHTML = '';
    wheels = digits.map((d, i) => {
      const dec = i === digits.length - 1;
      if (dec) meter.insertAdjacentHTML('beforeend', '<span class="comma">,</span>');
      const w = document.createElement('div');
      w.className = 'wheel num' + (dec ? ' dec' : '');
      w.tabIndex = 0;
      w.setAttribute('role', 'spinbutton');
      w.setAttribute('aria-label', dec ? 'Nachkommastelle' : `Stelle ${i + 1}`);
      w.setAttribute('aria-valuemin', 0);
      w.setAttribute('aria-valuemax', 9);
      w.innerHTML = '<div></div>' + [...Array(10).keys()].map(n => `<div>${n}</div>`).join('') + '<div></div>';
      w.addEventListener('scroll', onWheel, { passive: true });
      w.addEventListener('keydown', (e) => {
        const step = { ArrowUp: 1, ArrowDown: -1 }[e.key];
        if (step) { e.preventDefault(); w.scrollTop = Math.min(9, Math.max(0, digitOf(w) + step)) * WHEEL; }
      });
      meter.appendChild(w);
      w.scrollTop = d * WHEEL;
      return w;
    });
    meter.insertAdjacentHTML('beforeend', '<span class="unit">kWh</span>');
    updateDelta();
  }
  const digitOf = (w) => Math.min(9, Math.max(0, Math.round(w.scrollTop / WHEEL)));
  const meterValue = () => Number(wheels.map(digitOf).join('')) / 10;

  let raf = 0;
  function onWheel() { cancelAnimationFrame(raf); raf = requestAnimationFrame(updateDelta); }
  function updateDelta() {
    const el = s.querySelector('#delta');
    wheels.forEach(w => w.setAttribute('aria-valuenow', digitOf(w)));
    const before = readings.filter(r => r.date < date).pop();
    if (!before) { el.className = 'delta ok'; el.textContent = readings.length ? 'Früher als alles bisher' : 'Dein Startstand'; return; }
    const kwh = meterValue() - before.value;
    const st = calc.stats(calc.periods(readings));
    const days = Math.max(1, (parse(date) - parse(before.date)) / DAY);
    el.className = 'delta num ' + (kwh < 0 ? '' : st && kwh / days > st.perDay * calc.FACTOR ? 'high' : 'ok');
    el.textContent = kwh < 0 ? 'Weniger als letztes Mal?' : `+${fmt0.format(kwh)} kWh seit ${dShort.format(parse(before.date))}`;
  }

  function submit(e) {
    e.preventDefault();
    const err = s.querySelector('#err');
    const value = meterValue();
    const before = readings.filter(r => r.date < date).pop();
    const after = readings.find(r => r.date > date);
    if (before && value < before.value) return (err.textContent = `Mindestens ${fmt1.format(before.value)} kWh (Stand vom ${dShort.format(parse(before.date))}).`);
    if (after && value > after.value) return (err.textContent = `Höchstens ${fmt1.format(after.value)} kWh (Stand vom ${dShort.format(parse(after.date))}).`);
    // Tippfehler-Schutz: >100 kWh/Tag ist für einen Haushalt unrealistisch
    if (before && (value - before.value) / Math.max(1, (parse(date) - parse(before.date)) / DAY) > 100
        && !confirm(`Das wären ${fmt0.format(value - before.value)} kWh seit der letzten Ablesung. Stimmt der Wert?`)) return;
    if (readings.some(r => r.date === date) && !confirm(`Für den ${dShort.format(parse(date))} gibt es schon einen Stand. Ersetzen?`)) return;
    readings = readings.filter(r => r.date !== date).concat({ date, value });
    save();
    App.closeSheet();
    App.render();
    celebrate(date);
  }

  function celebrate(d) {
    const p = calc.periods(readings).find(x => x.to === d);
    const mood = calc.mood(p);
    const streak = calc.streak(readings, today());
    let title, body = '';
    if (!p) title = readings.length === 1 ? 'Startstand gespeichert!' : 'Gespeichert!';
    else {
      title = mood === 'neutral' ? 'Eingetragen! Gut gemacht.' : pick(LINES[mood], d);
      const [unit, text] = pick(FACTS, d + p.kwh);
      body = `<div class="big display num" style="color:${mood === 'high' ? 'var(--orange)' : 'var(--green)'}">+${fmt0.format(p.kwh)}<small>kWh</small></div>
        <p class="fact">${text(fmt0.format(Math.round(p.kwh / unit)))}</p>`;
    }
    App.party(`<div class="pop">${volti(p ? mood : 'hello', 150)}</div><h2>${title}</h2>${body}
      ${streak > 1 ? `<div class="chips"><span class="chip fire">🔥 ${streak} Monate in Folge abgelesen</span></div>` : ''}`);
    if (mood !== 'high') App.confetti();
  }

  App.tab('strom', { render });
})();
