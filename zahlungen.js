// Bereiche Kosten und Termine: beide arbeiten auf derselben Liste von Zahlungen.
(() => {
  const { eur, esc, parse, today, DAY, dNice, dMonShort, daysUntil } = App;
  const KEY = 'app.items.v1';
  let items = App.store.get(KEY, [], calc.validItems);
  const save = () => App.store.set(KEY, items);
  const eur0 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  const CATS = [
    { id: 'wohnen', e: '🏠', n: 'Wohnen', c: '#64D2FF' },
    { id: 'abo', e: '📺', n: 'Abos', c: '#BF5AF2' },
    { id: 'vertrag', e: '📄', n: 'Verträge', c: '#FFD60A' },
    { id: 'versicherung', e: '🛡️', n: 'Versicherung', c: '#B48CF0' },
    { id: 'energie', e: '⚡', n: 'Energie', c: '#F2307F' },
    { id: 'rundfunk', e: '📻', n: 'Rundfunk', c: '#FF9F0A' },
    { id: 'sonstiges', e: '📦', n: 'Sonstiges', c: '#8E8E93' },
  ];
  const cat = (id) => CATS.find(c => c.id === id) || CATS[CATS.length - 1];
  const INTERVALS = [
    ['monatlich', 'Monatlich'], ['vierteljaehrlich', 'Vierteljährlich'], ['halbjaehrlich', 'Halbjährlich'],
    ['jaehrlich', 'Jährlich'], ['einmalig', 'Einmalig'],
  ];
  const M = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const MN = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  // nächster Termin ab heute für feste Monate/Tag (für Vorlagen wie Rundfunk)
  function nextFixed(months, day) {
    let [y, m] = today().split('-').map(Number);
    for (let i = 0; i < 24; i++) {
      const ym = `${y}-${String(m).padStart(2, '0')}`;
      if (months.includes(m) && calc.dueDate(day, ym) >= today()) return calc.dueDate(day, ym);
      if (++m > 12) { m = 1; y++; }
    }
  }
  // Betrag 0 = bitte selbst eintragen; Rundfunk: 18,36 € × 3 Monate, fällig Mitte Feb/Mai/Aug/Nov
  const PRESETS = [
    { name: 'Rundfunkbeitrag', emoji: '📻', cat: 'rundfunk', amount: 55.08, interval: 'vierteljaehrlich', months: [2, 5, 8, 11], day: 15, remind: true },
    { name: 'Miete', emoji: '🏠', cat: 'wohnen', interval: 'monatlich', day: 1, remind: true },
    { name: 'Netflix', emoji: '🍿', cat: 'abo', interval: 'monatlich', remind: false },
    { name: 'Spotify', emoji: '🎵', cat: 'abo', interval: 'monatlich', remind: false },
    { name: 'Handyvertrag', emoji: '📱', cat: 'vertrag', interval: 'monatlich', remind: false },
    { name: 'Stromabschlag', emoji: '⚡', cat: 'energie', interval: 'monatlich', remind: false },
    { name: 'Haftpflicht', emoji: '🛡️', cat: 'versicherung', interval: 'jaehrlich', remind: true },
    { name: 'Fitnessstudio', emoji: '🏋️', cat: 'vertrag', interval: 'monatlich', remind: false },
  ];

  const rel = (d) => {
    const n = daysUntil(d);
    return n === 0 ? 'heute' : n === 1 ? 'morgen' : n === -1 ? 'gestern' : n > 1 ? `in ${n} Tagen` : `seit ${-n} Tagen`;
  };
  const intervalLabel = (i) => i.once ? 'einmalig'
    : (INTERVALS.find(x => x[0] === i.interval) || [0, i.months.map(m => MN[m - 1]).join(', ')])[1];
  const strip = (i) => `<div class="mstrip" aria-label="Fällig in ${i.months.map(m => MN[m - 1]).join(', ')}">${M.map((l, k) =>
    `<i class="${i.months.includes(k + 1) ? 'on' : ''} ${k + 1 === Number(today().slice(5, 7)) ? 'now' : ''}" aria-hidden="true">${l}</i>`).join('')}</div>`;
  const plus = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v14M3 10h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  const tick = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // Zetti: Kassenzettel mit Gesicht (Rechnungen). Laune = hello | ok
  function zetti(mood, size) {
    const ink = '#1C1C1E';
    let zig = '';
    for (let x = 82; x > 18; x -= 8) zig += ` L${x - 4} 112 L${x - 8} 106`;
    const mouth = mood === 'hello'
      ? `<path d="M40 52 q10 10 20 0" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`
      : `<path d="M38 50 q12 14 24 0 z" fill="${ink}"/>`;
    return `<svg class="buddy" width="${size}" height="${size * 1.2}" viewBox="0 0 100 120" aria-hidden="true">
      <path d="M18 14 Q18 8 24 8 H76 Q82 8 82 14 L82 106${zig} Z" fill="#F2F2F7"/>
      <g stroke="#C7C7CC" stroke-width="3" stroke-linecap="round"><path d="M30 72 H70"/><path d="M30 82 H62"/><path d="M30 94 H48"/></g>
      <path d="M58 94 H70" stroke="#F2307F" stroke-width="4" stroke-linecap="round"/>
      <circle cx="74" cy="20" r="10" fill="#F2307F"/><text x="74" y="25" text-anchor="middle" font-size="14" font-weight="800" fill="#000">€</text>
      <ellipse class="eye" cx="38" cy="38" rx="4.5" ry="5.5" fill="${ink}"/><ellipse class="eye" cx="62" cy="38" rx="4.5" ry="5.5" fill="${ink}"/>
      <circle cx="29" cy="48" r="5" fill="#ff6b8a" opacity=".45"/><circle cx="71" cy="48" r="5" fill="#ff6b8a" opacity=".45"/>
      ${mouth}
    </svg>`;
  }

  // Ticki: Wecker mit Gesicht (Erinnerungen). Laune = sleep | ok | ring
  function ticki(mood, size) {
    const ink = '#1C1C1E';
    const body = mood === 'ring' ? '#FF9F0A' : '#B48CF0';
    const eyes = mood === 'sleep'
      ? `<path d="M33 58 q6 5 12 0 M55 58 q6 5 12 0" stroke="${ink}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
      : `<ellipse class="eye" cx="39" cy="57" rx="4.5" ry="5.5" fill="${ink}"/><ellipse class="eye" cx="61" cy="57" rx="4.5" ry="5.5" fill="${ink}"/>`;
    const mouth = {
      sleep: `<ellipse cx="50" cy="74" rx="3" ry="3.5" fill="${ink}"/>`,
      ok: `<path d="M41 71 q9 9 18 0" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      ring: `<ellipse cx="50" cy="74" rx="8" ry="9" fill="${ink}"/>`,
    }[mood];
    const extra = mood === 'sleep'
      ? '<text x="78" y="22" font-size="16" font-weight="800" fill="#8E8E93">z</text><text x="88" y="10" font-size="11" font-weight="800" fill="#8E8E93">z</text>'
      : mood === 'ring'
        ? '<g stroke="#FF9F0A" stroke-width="3.5" stroke-linecap="round"><path d="M8 12 l-5-5"/><path d="M5 28 h-5"/><path d="M92 12 l5-5"/><path d="M95 28 h5"/></g>'
        : '';
    return `<svg class="buddy ${mood}" width="${size}" height="${size * 1.2}" viewBox="0 0 100 120" aria-hidden="true">
      <circle cx="24" cy="24" r="13" fill="#AEAEB2"/><circle cx="76" cy="24" r="13" fill="#AEAEB2"/>
      <rect x="47" y="8" width="6" height="14" rx="3" fill="#8E8E93"/>
      <path d="M30 100 l-8 13 M70 100 l8 13" stroke="#8E8E93" stroke-width="6" stroke-linecap="round"/>
      <circle cx="50" cy="64" r="40" fill="${body}"/><circle cx="50" cy="64" r="31" fill="#F2F2F7"/>
      <g fill="#C7C7CC"><rect x="48" y="36" width="4" height="6" rx="2"/><rect x="48" y="86" width="4" height="6" rx="2"/><rect x="22" y="62" width="6" height="4" rx="2"/><rect x="72" y="62" width="6" height="4" rx="2"/></g>
      ${eyes}${mouth}${extra}
    </svg>`;
  }

  const presetChips = () => `<div class="presets">${PRESETS.map((p, k) => `<button type="button" data-preset="${k}">${p.emoji} ${p.name}</button>`).join('')}</div>`;

  // ---------- Kosten ----------
  function renderKosten(main) {
    const rec = items.filter(i => !i.once);
    const total = rec.reduce((s, i) => s + calc.perMonth(i), 0);
    const top = [...rec].sort((a, b) => calc.perMonth(b) - calc.perMonth(a))[0];
    const say = !rec.length ? 'Hi, ich bin Zetti! Gib mir deine Rechnungen, ich rechne alles hoch.'
      : [`Ich hab alles im Blick: ${eur(total)} im Monat.`, `Das sind ${eur(total * 12 / 365)} pro Tag. ☕️`,
        `Größter Brocken: ${top.emoji} ${esc(top.name)}.`][Number(today().slice(8, 10)) % 3];
    let h = `<div class="top"><div><div class="eyebrow">Laufende Kosten</div><h1>Rechnungen</h1></div><button class="add" data-act="add" aria-label="Rechnung hinzufügen">${plus}</button></div>
      <div class="cols"><div>${App.hero(zetti(rec.length ? 'ok' : 'hello', 90), say)}`;
    if (!rec.length) {
      h += `<div class="card empty"><b>Noch nichts eingetragen</b>Trag Miete, Abos und Verträge ein. Ich rechne hoch, was dich das im Monat und im Jahr kostet.</div>
        <div class="section-title">Schnell hinzufügen</div>${presetChips()}`;
    } else {
      const byCat = CATS.map(c => ({ ...c, list: rec.filter(i => cat(i.cat).id === c.id) }))
        .map(c => ({ ...c, sum: c.list.reduce((s, i) => s + calc.perMonth(i), 0) })).filter(c => c.list.length);
      h += `<div class="card" style="text-align:center">
        <div class="caption" style="margin:0">Jeden Monat</div>
        <div class="big display num" style="font-size:52px;margin-top:6px">${eur(total)}</div>
        <div class="caption">${eur(total * 12)} im Jahr · ${rec.length} Posten</div>
        <div class="stack">${byCat.map(c => `<i style="flex:${c.sum || 0.0001};background:${c.c}" title="${c.n}"></i>`).join('')}</div>
        <div class="legend">${byCat.map(c => `<span style="--c:${c.c}">${c.n} ${eur(c.sum)}</span>`).join('')}</div>
      </div>`;
      h += '</div><div>';
      for (const c of byCat) {
        h += `<div class="section-title"><span>${c.e} ${c.n}</span><span>${eur(c.sum)} / Monat</span></div><div class="list">`;
        for (const i of c.list) {
          h += `<button class="row" data-edit="${i.id}"><span class="ico" aria-hidden="true">${i.emoji}</span>
            <span class="main"><span class="title">${esc(i.name)}</span><span class="meta" style="display:block">${intervalLabel(i)} · ${eur(i.amount)}</span></span>
            <span class="right num">${eur(calc.perMonth(i))}<small>/ Monat</small></span></button>`;
        }
        h += `</div>`;
      }
      h += `<div class="footnote">Antippen zum Bearbeiten. Beträge pro Monat sind hochgerechnet.</div>`;
    }
    main.innerHTML = h + '</div></div>';
    main.onclick = onClick;
  }

  // ---------- Termine ----------
  function upcoming() {
    return items.filter(i => i.remind).map(i => ({ i, d: calc.nextDue(i) })).filter(x => x.d).sort((a, b) => a.d.localeCompare(b.d));
  }

  function renderTermine(main) {
    const up = upcoming();
    const t = today();
    const f = up[0];
    const n = f ? daysUntil(f.d) : null;
    const mood = !f ? 'sleep' : n <= 3 ? 'ring' : 'ok';
    const say = !f ? 'Nichts offen. Ich mach ein Nickerchen. 😴'
      : n < 0 ? `RIIING! ${esc(f.i.name)} ist überfällig! ⏰`
        : n <= 3 ? `Psst! ${esc(f.i.name)} ist ${rel(f.d)} fällig.`
          : `Alles entspannt. Als Nächstes: ${esc(f.i.name)} ${rel(f.d)}.`;
    let h = `<div class="top"><div><div class="eyebrow">Zahlungen</div><h1>Erinnerungen</h1></div><button class="add" data-act="add" aria-label="Erinnerung hinzufügen">${plus}</button></div>
      <div class="cols"><div>${App.hero(ticki(mood, 90), say)}`;
    if (!up.length) {
      h += `<div class="card empty"><b>Keine offenen Termine</b>Lass dich an Rundfunk, Miete, Versicherungen oder alles andere erinnern.</div>
        <button class="primary" data-preset="0">📻 Rundfunk-Erinnerung anlegen</button>
        <div class="section-title">Oder</div>${presetChips()}`;
    } else {
      const [first, ...rest] = up;
      const late = first.d < t;
      h += `<div class="next ${late ? 'late' : ''}">
        <span class="em" aria-hidden="true">${first.i.emoji}</span>
        <div class="lbl">${late ? 'Überfällig' : 'Als Nächstes'}</div>
        <div class="nm">${esc(first.i.name)}</div>
        <div class="amt num">${eur(first.i.amount)}</div>
        <div class="when">${dNice.format(parse(first.d))} · ${rel(first.d)}</div>
        <button class="primary" data-paid="${first.i.id}">${tick} Bezahlt</button>
      </div>`;
      h += '</div><div>';
      const groups = [
        ['Überfällig', rest.filter(x => x.d < t)],
        ['Diesen Monat', rest.filter(x => x.d >= t && x.d.slice(0, 7) === t.slice(0, 7))],
        ['Demnächst', rest.filter(x => x.d.slice(0, 7) > t.slice(0, 7))],
      ];
      for (const [title, list] of groups) {
        if (!list.length) continue;
        h += `<div class="section-title">${title}</div><div class="list">`;
        for (const { i, d } of list) {
          const n = daysUntil(d);
          h += `<div class="row"><button class="ico" data-edit="${i.id}" aria-label="${esc(i.name)} bearbeiten">${i.emoji}</button>
            <button class="main" data-edit="${i.id}" style="text-align:left;padding:0"><span class="title" style="display:block">${esc(i.name)} · ${eur(i.amount)}</span>
              <span class="meta ${n < 0 ? 'late' : n <= 3 ? 'soon' : ''}" style="display:block">${dNice.format(parse(d))} · ${rel(d)}</span>
              ${i.once ? '' : strip(i)}</button>
            <button class="check" data-paid="${i.id}" aria-label="${esc(i.name)} als bezahlt markieren">${tick}</button></div>`;
        }
        h += `</div>`;
      }
      h += yearPlan();
      h += `<div class="links"><button data-act="ics-all">📅 Alle in den Kalender</button></div>`;
    }
    main.innerHTML = h + '</div></div>';
    main.onclick = onClick;
  }

  // Jahresplan: was ist in den nächsten 12 Monaten wann fällig
  function yearPlan() {
    let [y, m] = today().split('-').map(Number);
    const y0 = y;
    let h = `<div class="section-title">Die nächsten 12 Monate</div><div class="year">`;
    for (let k = 0; k < 12; k++, m = m % 12 + 1, y += m === 1 ? 1 : 0) {
      const ym = `${y}-${String(m).padStart(2, '0')}`;
      const due = items.filter(i => calc.dueIn(i, ym));
      const sum = due.reduce((s, i) => s + i.amount, 0);
      const special = due.filter(i => i.once || i.months.length < 12).map(i => i.emoji).join('');
      h += `<div class="${k === 0 ? 'now' : ''}"><b>${MN[m - 1]}${y !== y0 ? ` ’${String(y).slice(2)}` : ''}</b><div class="sum num">${sum ? eur0.format(sum) : '–'}</div><div class="ems">${special}</div></div>`;
    }
    return h + '</div><div class="footnote">Emojis = Zahlungen, die nicht jeden Monat anfallen.</div>';
  }

  function onClick(e) {
    const el = (sel) => e.target.closest(sel);
    if (el('[data-paid]')) return markPaid(el('[data-paid]').dataset.paid);
    if (el('[data-edit]')) return openEdit(items.find(i => i.id === el('[data-edit]').dataset.edit));
    if (el('[data-preset]')) return openEdit(null, PRESETS[el('[data-preset]').dataset.preset]);
    const act = el('[data-act]')?.dataset.act;
    if (act === 'add') openEdit(null);
    if (act === 'ics-all') App.share('termine.ics', ics(items.filter(i => i.remind)), 'text/calendar');
  }

  function markPaid(id) {
    const i = items.find(x => x.id === id);
    const d = calc.nextDue(i);
    if (!d) return;
    const ym = d.slice(0, 7);
    i.paid[ym] = true;
    save();
    App.render();
    App.confetti(30);
    App.toast(`${i.emoji} ${i.name} bezahlt!`, () => { delete i.paid[ym]; save(); App.render(); });
  }

  // ---------- Bearbeiten ----------
  function openEdit(item, preset) {
    const isNew = !item;
    const d = item ? { ...item, months: [...(item.months || [])] } : (() => {
      const p = preset || {};
      const interval = p.interval || 'monatlich';
      const day = p.day || Number(today().slice(8, 10));
      const date = p.months ? nextFixed(p.months, day) : p.day ? nextFixed([...Array(12).keys()].map(k => k + 1), day) : today();
      return {
        name: p.name || '', emoji: p.emoji || '📦', cat: p.cat || 'sonstiges', amount: p.amount || 0,
        interval, months: p.months || calc.monthsFor(interval === 'einmalig' ? 'jaehrlich' : interval, Number(date.slice(5, 7))),
        day: Number(date.slice(8, 10)), since: date, remind: p.remind !== false, paid: {},
      };
    })();
    if (d.once) d.interval = 'einmalig';
    let date = d.once || d.since;

    const s = App.sheet(`<form id="iForm" novalidate>
      <div class="sheet-head"><button type="button" data-close>Abbrechen</button><h2>${isNew ? 'Neue Zahlung' : 'Bearbeiten'}</h2><span style="min-width:70px"></span></div>
      ${isNew && !preset ? `<div class="flabel">Vorlage</div>${presetChips()}` : ''}
      <label class="field"><span>Name</span><input id="iName" value="${esc(d.name)}" placeholder="z. B. Netflix" autocomplete="off" maxlength="60"></label>
      <label class="field"><span>Betrag pro Zahlung (€)</span><input id="iAmount" inputmode="decimal" value="${d.amount ? String(d.amount).replace('.', ',') : ''}" placeholder="0,00" autocomplete="off"></label>
      <div class="flabel">Kategorie</div><div class="seg" id="iCat">${CATS.map(c => `<button type="button" data-v="${c.id}">${c.e} ${c.n}</button>`).join('')}</div>
      <div class="flabel">Wie oft?</div><div class="seg" id="iInt">${INTERVALS.map(([v, n]) => `<button type="button" data-v="${v}">${n}</button>`).join('')}</div>
      <div class="flabel" id="dateLabel"></div>
      <button type="button" class="datebtn" id="iDate"><span class="mini"><b id="miniM"></b><span id="miniD"></span></span><span id="dateText"></span></button>
      <div id="monthsBox"><div class="flabel">Diese Monate sind dran</div><div class="months" id="iMonths">${MN.map((n, k) => `<button type="button" data-m="${k + 1}">${n}</button>`).join('')}</div></div>
      <div class="switchrow"><div><div>Erinnern</div><div class="meta" style="font-size:13px;color:var(--text-2)">Erscheint unter Termine</div></div>
        <label class="switch"><input type="checkbox" id="iRemind" ${d.remind ? 'checked' : ''} aria-label="Erinnern"><span></span></label></div>
      <p class="hint" id="iSum" style="margin:14px 0 0"></p>
      <div class="err" id="iErr" role="alert"></div>
      <button class="primary" type="submit">${isNew ? 'Hinzufügen' : 'Speichern'}</button>
      ${isNew ? '' : '<button type="button" class="ghost" data-act="ics">📅 In den Kalender eintragen</button><button type="button" class="ghost danger" data-act="del">Löschen</button>'}
    </form>`, isNew ? 'Neue Zahlung' : 'Zahlung bearbeiten');

    const q = (sel) => s.querySelector(sel);
    function sync() {
      const once = d.interval === 'einmalig';
      q('#iCat').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === d.cat));
      q('#iInt').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === d.interval));
      q('#iMonths').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', d.months.includes(Number(b.dataset.m))));
      q('#monthsBox').hidden = once;
      q('#dateLabel').textContent = once ? 'Fällig am' : 'Nächste Zahlung';
      q('#miniM').textContent = MN[Number(date.slice(5, 7)) - 1];
      q('#miniD').textContent = Number(date.slice(8, 10));
      q('#dateText').textContent = App.dLong.format(parse(date));
      const amount = App.parseAmount(q('#iAmount').value);
      const pm = once ? 0 : (amount || 0) * d.months.length / 12;
      q('#iSum').textContent = once ? 'Einmalige Zahlung, zählt nicht zu den laufenden Kosten.'
        : `= ${eur(pm)} im Monat · ${eur(pm * 12)} im Jahr`;
    }
    function setMonthsFromInterval() {
      if (d.interval !== 'einmalig' && d.interval !== 'eigene') d.months = calc.monthsFor(d.interval, Number(date.slice(5, 7)));
    }

    q('[data-close]').onclick = App.closeSheet;
    q('#iAmount').oninput = sync;
    q('#iCat').onclick = (e) => {
      const b = e.target.closest('[data-v]'); if (!b) return;
      const was = cat(d.cat).e;
      d.cat = b.dataset.v;
      if (d.emoji === was || d.emoji === '📦') d.emoji = cat(d.cat).e; // eigenes Vorlagen-Emoji behalten
      sync();
    };
    q('#iInt').onclick = (e) => {
      const b = e.target.closest('[data-v]'); if (!b) return;
      d.interval = b.dataset.v; setMonthsFromInterval(); sync();
    };
    q('#iMonths').onclick = (e) => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      const m = Number(b.dataset.m);
      const next = d.months.includes(m) ? d.months.filter(x => x !== m) : [...d.months, m].sort((a, b) => a - b);
      if (!next.length) return;
      d.months = next; d.interval = 'eigene'; sync();
    };
    q('#iDate').onclick = async () => {
      const r = await App.pickDate(date, d.interval === 'einmalig' ? 'Fällig am' : 'Nächste Zahlung');
      if (r) { date = r; setMonthsFromInterval(); sync(); }
    };
    s.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => openEdit(null, PRESETS[b.dataset.preset]));
    if (!isNew) {
      q('[data-act="del"]').onclick = () => {
        if (!confirm(`„${item.name}“ löschen?`)) return;
        items = items.filter(i => i.id !== item.id); save(); App.closeSheet(); App.render();
      };
      q('[data-act="ics"]').onclick = () => App.share(`${item.name.replace(/[^\wäöüÄÖÜß-]+/g, '-')}.ics`, ics([item]), 'text/calendar');
    }
    q('#iForm').onsubmit = (e) => {
      e.preventDefault();
      const name = q('#iName').value.trim();
      const amount = App.parseAmount(q('#iAmount').value);
      if (!name) return (q('#iErr').textContent = 'Bitte einen Namen eingeben.');
      if (amount === null) return (q('#iErr').textContent = 'Bitte einen gültigen Betrag eingeben.');
      const once = d.interval === 'einmalig';
      const out = {
        id: item ? item.id : Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name, emoji: d.emoji, cat: d.cat, amount, interval: d.interval, remind: q('#iRemind').checked, paid: d.paid || {},
        ...(once ? { once: date } : { months: d.months, day: Number(date.slice(8, 10)), since: date }),
      };
      items = item ? items.map(i => i.id === item.id ? out : i) : [...items, out];
      save();
      App.closeSheet();
      App.render();
      if (isNew) { App.confetti(25); App.toast(`${out.emoji} ${out.name} hinzugefügt`); }
    };
    sync();
  }

  // ---------- Kalender-Export ----------
  const ics = (list) => App.icsFile(list.map(i => ({
    uid: i.id,
    start: calc.nextDue(i) || i.once || i.since,
    // Tag 29–31 wird im Kalender zum Monatsletzten, sonst fiele der Termin in kurzen Monaten aus
    rrule: i.once ? null : `FREQ=YEARLY;BYMONTH=${i.months.join(',')};BYMONTHDAY=${i.day > 28 ? -1 : i.day}`,
    summary: `${i.emoji} ${i.name}: ${eur(i.amount)} zahlen`,
    desc: 'Erinnerung aus deiner Haushalt-App 💸',
    alarms: [['-PT15H', `Morgen fällig: ${i.emoji} ${i.name} (${eur(i.amount)})`], ['PT9H', `Heute fällig: ${i.emoji} ${i.name} (${eur(i.amount)})`]],
  })));

  App.CATS = CATS; // die Bilanz zeigt die Kosten nach denselben Kategorien
  App.tab('kosten', { render: renderKosten });
  App.tab('termine', {
    render: renderTermine,
    badge: () => upcoming().filter(x => daysUntil(x.d) <= 3).length,
  });
})();
