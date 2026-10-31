// Bereich Geburtstage mit Kuchi, dem Kuchen.
(() => {
  const { esc, today, parse } = App;
  const KEY = 'geburtstage.v1';
  let list = App.store.get(KEY, [], calc.validBirthdays);
  const save = () => App.store.set(KEY, list);
  const MN = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const dDay = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const COLORS = ['#FF6B8A', '#64D2FF', '#FFD60A', '#BF5AF2', '#F2307F', '#FF9F0A', '#5E5CE6'];
  const color = (name) => COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length];
  const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const rel = (d) => d === 0 ? 'Heute! 🎉' : d === 1 ? 'Morgen' : `in ${d} Tagen`;
  const turns = (n) => n.age !== null ? ` · wird ${n.age}` : '';

  // Kuchi: Torte mit Kerze und Gesicht. Laune = hello | ok | soon | party
  function kuchi(mood, size) {
    const ink = '#4a1020';
    const eyes = mood === 'party' || mood === 'soon'
      ? `<path d="M33 76 q6 -7 12 0 M55 76 q6 -7 12 0" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`
      : `<ellipse class="eye" cx="39" cy="75" rx="4.5" ry="5.5" fill="${ink}"/><ellipse class="eye" cx="61" cy="75" rx="4.5" ry="5.5" fill="${ink}"/>`;
    const mouth = mood === 'party' ? `<path d="M37 84 q13 16 26 0 z" fill="${ink}"/>`
      : `<path d="M41 86 q9 9 18 0" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    const sprinkles = mood === 'party'
      ? '<g><circle cx="10" cy="30" r="3" fill="#FFD60A"/><circle cx="90" cy="24" r="3" fill="#64D2FF"/><rect x="14" y="10" width="6" height="3" rx="1.5" fill="#F2307F" transform="rotate(30 17 11)"/><rect x="80" y="40" width="6" height="3" rx="1.5" fill="#FF6B8A" transform="rotate(-20 83 41)"/></g>'
      : '';
    return `<svg class="buddy ${mood === 'party' ? 'party' : ''}" width="${size}" height="${size * 1.1}" viewBox="0 0 100 110" aria-hidden="true">
      ${sprinkles}
      <ellipse cx="50" cy="104" rx="44" ry="6" fill="#F3C6D5"/>
      <rect x="44" y="26" width="12" height="30" rx="4" fill="#64D2FF"/>
      <path d="M44 34 l12 -5 M44 44 l12 -5" stroke="#fff" stroke-width="3" opacity=".7"/>
      <path class="flame" d="M50 6 q9 10 0 18 q-9 -8 0 -18z" fill="#FFD60A"/><path d="M50 13 q4 5 0 9 q-4 -4 0 -9z" fill="#FF9F0A"/>
      <rect x="12" y="54" width="76" height="48" rx="14" fill="#FF8FAB"/>
      <path d="M12 66 q0 -12 14 -12 h48 q14 0 14 12 q-6 8 -12 0 q-6 8 -12 0 q-6 8 -13 0 q-6 8 -13 0 q-6 8 -12 0 q-6 8 -14 0z" fill="#FFF4F6"/>
      ${eyes}${mouth}
      <circle cx="28" cy="84" r="5" fill="#ff4d73" opacity=".45"/><circle cx="72" cy="84" r="5" fill="#ff4d73" opacity=".45"/>
    </svg>`;
  }

  function render(main) {
    const t = today();
    const up = list.map(b => ({ b, n: calc.nextBirthday(b, t) })).sort((a, z) => a.n.days - z.n.days);
    const first = up[0];
    const mood = !first ? 'hello' : first.n.days === 0 ? 'party' : first.n.days <= 7 ? 'soon' : 'ok';
    const todays = up.filter(x => x.n.days === 0).map(x => esc(x.b.name));
    const say = !first ? 'Ich bin Kuchi! Trag Geburtstage ein, ich vergesse keinen. 🎂'
      : todays.length ? `Heute hat ${todays.join(' und ')} Geburtstag! 🎉`
        : first.n.days <= 7 ? `${esc(first.b.name)} hat ${rel(first.n.days)} Geburtstag. Schon ein Geschenk? 🎁`
          : `Als Nächstes: ${esc(first.b.name)} am ${dDay.format(parse(first.n.date))}.`;
    const plus = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v14M3 10h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';

    let h = `<div class="top"><div><div class="eyebrow">Nie mehr vergessen</div><h1>Geburtstage</h1></div>
        <button class="add" data-act="add" aria-label="Geburtstag hinzufügen">${plus}</button></div>
      <div class="cols"><div>${App.hero(kuchi(mood, 96), say)}`;
    if (!first) {
      h += `<button class="primary" data-act="add">🎂 Ersten Geburtstag eintragen</button>`;
    } else {
      const f = first;
      h += `<div class="next bday ${f.n.days === 0 ? 'today' : ''}">
          <span class="avatar big" style="background:${color(f.b.name)}" aria-hidden="true">${esc(initials(f.b.name))}</span>
          <div class="lbl">${f.n.days === 0 ? 'Heute' : 'Als Nächstes'}</div>
          <div class="nm">${esc(f.b.name)}</div>
          <div class="amt num">${f.n.days === 0 ? '🎉' : f.n.days === 1 ? 'Morgen' : `${f.n.days} Tage`}</div>
          <div class="when">${dDay.format(parse(f.n.date))}${turns(f.n)}</div>
          ${f.b.note ? `<div class="gift">🎁 ${esc(f.b.note)}</div>` : ''}
        </div></div><div>
        <div class="section-title"><span>Alle Geburtstage</span><span>${list.length}</span></div><div class="list">`;
      for (const { b, n } of up) {
        h += `<button class="row" data-edit="${b.id}">
          <span class="avatar" style="background:${color(b.name)}" aria-hidden="true">${esc(initials(b.name))}</span>
          <span class="main"><span class="title" style="display:block">${esc(b.name)}</span>
            <span class="meta ${n.days <= 7 ? 'soon' : ''}" style="display:block">${b.day}. ${MN[b.month - 1]}${turns(n)}${b.note ? ' · 🎁' : ''}</span></span>
          <span class="right num" style="${n.days === 0 ? 'color:var(--green)' : ''}">${rel(n.days)}</span></button>`;
      }
      h += `</div><div class="links"><button data-act="ics">📅 Alle in den Kalender</button></div>`;
    }
    main.innerHTML = h + '</div></div>';

    main.onclick = (e) => {
      const ed = e.target.closest('[data-edit]');
      if (ed) return openEdit(list.find(b => b.id === ed.dataset.edit));
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'add') openEdit(null);
      if (act === 'ics') App.share('geburtstage.ics', App.icsFile(list.map(b => ({
        uid: 'bday-' + b.id,
        start: calc.nextBirthday(b, today()).date,
        // 29.02.: Monatsletzter im Februar, also 28. oder 29.
        rrule: `FREQ=YEARLY;BYMONTH=${b.month};BYMONTHDAY=${b.month === 2 && b.day === 29 ? -1 : b.day}`,
        summary: `🎂 ${b.name} hat Geburtstag`,
        desc: b.note ? `Geschenkideen: ${b.note}` : 'Erinnerung aus deiner Haushalt-App',
        alarms: [['-PT15H', `🎁 Morgen hat ${b.name} Geburtstag!`], ['PT9H', `🎂 Heute hat ${b.name} Geburtstag!`]],
      }))), 'text/calendar');
    };
  }

  function openEdit(item) {
    const d = item ? { ...item } : { name: '', day: '', month: 0, year: null, note: '' };
    const s = App.sheet(`<form id="bdForm" novalidate>
      <div class="sheet-head"><button type="button" data-close>Abbrechen</button><h2>${item ? 'Geburtstag' : 'Neuer Geburtstag'}</h2><span style="min-width:70px"></span></div>
      <label class="field"><span>Name</span><input id="bdName" value="${esc(d.name)}" placeholder="z. B. Mama" maxlength="40" autocomplete="off"></label>
      <label class="field"><span>Tag</span><input id="bdDay" inputmode="numeric" value="${d.day}" placeholder="1–31" maxlength="2" autocomplete="off"></label>
      <div class="flabel">Monat</div>
      <div class="months" id="bdMonth">${MN.map((n, k) => `<button type="button" data-m="${k + 1}" aria-pressed="${d.month === k + 1}">${n}</button>`).join('')}</div>
      <label class="field"><span>Geburtsjahr (freiwillig, für das Alter)</span><input id="bdYear" inputmode="numeric" value="${d.year || ''}" placeholder="z. B. 1990" maxlength="4" autocomplete="off"></label>
      <label class="field"><span>Geschenkideen</span><input id="bdNote" value="${esc(d.note)}" placeholder="z. B. Buch, Konzertkarten" maxlength="200" autocomplete="off"></label>
      <div class="err" id="bdErr" role="alert"></div>
      <button class="primary" type="submit">Speichern</button>
      ${item ? '<button type="button" class="ghost danger" data-del>Löschen</button>' : ''}
    </form>`, 'Geburtstag');
    const q = (sel) => s.querySelector(sel);
    q('[data-close]').onclick = App.closeSheet;
    q('#bdMonth').onclick = (e) => {
      const btn = e.target.closest('[data-m]');
      if (!btn) return;
      d.month = Number(btn.dataset.m);
      q('#bdMonth').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === btn));
    };
    if (item) q('[data-del]').onclick = () => {
      if (!confirm(`Geburtstag von ${item.name} löschen?`)) return;
      list = list.filter(b => b.id !== item.id); save(); App.closeSheet(); App.render();
    };
    q('#bdForm').onsubmit = (e) => {
      e.preventDefault();
      const err = (m) => (q('#bdErr').textContent = m);
      const name = q('#bdName').value.trim();
      const day = Number(q('#bdDay').value);
      const yearRaw = q('#bdYear').value.trim();
      const year = yearRaw ? Number(yearRaw) : null;
      if (!name) return err('Bitte einen Namen eingeben.');
      if (!d.month) return err('Bitte einen Monat wählen.');
      // im Schaltjahr 2000 prüfen, damit der 29.02. erlaubt ist
      if (!Number.isInteger(day) || day < 1 || day > new Date(Date.UTC(2000, d.month, 0)).getUTCDate()) return err('Diesen Tag gibt es im gewählten Monat nicht.');
      if (yearRaw && (!Number.isInteger(year) || year < 1900 || year > Number(today().slice(0, 4)))) return err('Bitte ein gültiges Geburtsjahr eingeben.');
      const out = { id: item ? item.id : Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, day, month: d.month, year, note: q('#bdNote').value.trim() };
      list = item ? list.map(b => b.id === item.id ? out : b) : [...list, out];
      save(); App.closeSheet(); App.render();
      if (!item) App.toast(`🎂 ${name} gespeichert`);
    };
  }

  App.tab('geburtstage', { render, badge: () => list.filter(b => calc.nextBirthday(b, today()).days <= 7).length });
})();
