// Bereich Monatsbilanz mit Börsi, dem Portemonnaie: Einnahmen − laufende Kosten − Sparen = frei.
(() => {
  const { eur, esc } = App;
  const KEY = 'bilanz.v1';
  let b = App.store.get(KEY, { incomes: [], saving: 0 }, calc.validBilanz);
  const save = () => App.store.set(KEY, b);
  const PRESETS = ['Gehalt', 'Nebenjob', 'Kindergeld', 'Rente', 'Unterhalt'];

  // Börsi: Portemonnaie mit Gesicht. Laune = hello | rich | ok | tight | broke
  function boersi(mood, size) {
    const ink = '#5A1430';
    const body = mood === 'broke' ? '#FF9F0A' : '#D81B6F';
    const flap = mood === 'broke' ? '#FFB340' : '#F2307F';
    const eyes = mood === 'rich'
      ? `<path d="M31 66 q6 -7 12 0 M57 66 q6 -7 12 0" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`
      : `<ellipse class="eye" cx="37" cy="66" rx="4.5" ry="5.5" fill="${ink}"/><ellipse class="eye" cx="63" cy="66" rx="4.5" ry="5.5" fill="${ink}"/>`;
    const mouth = {
      hello: `<path d="M41 79 q9 9 18 0" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      rich: `<path d="M37 77 q13 16 26 0 z" fill="${ink}"/>`,
      ok: `<path d="M41 79 q9 8 18 0" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      tight: `<path d="M41 82 q9 -5 18 0" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      broke: `<ellipse cx="50" cy="82" rx="6" ry="7" fill="${ink}"/>`,
    }[mood];
    // Schein guckt raus, wenn Geld übrig ist; pleite: eine Motte fliegt heraus
    const top = mood === 'rich' || mood === 'ok' || mood === 'hello'
      ? `<g transform="rotate(-10 50 30)"><rect x="26" y="16" width="48" height="26" rx="3" fill="#7CC49A"/><rect x="30" y="20" width="40" height="18" rx="2" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.5"/><text x="50" y="34" text-anchor="middle" font-size="13" font-weight="900" fill="rgba(0,0,0,.5)">€</text></g>
         ${mood === 'rich' ? '<rect x="58" y="12" width="40" height="22" rx="3" fill="#F2A541" transform="rotate(14 78 23)"/>' : ''}`
      : mood === 'broke'
        ? '<g fill="#AEAEB2"><ellipse cx="74" cy="16" rx="9" ry="6" transform="rotate(-30 74 16)"/><ellipse cx="86" cy="18" rx="9" ry="6" transform="rotate(30 86 18)"/><rect x="78" y="14" width="4" height="10" rx="2" fill="#636366"/></g>'
        : '';
    const sweat = mood === 'tight' ? '<path d="M84 50 q6 10 0 14 q-6-4 0-14z" fill="#64D2FF"/>' : '';
    return `<svg class="buddy ${mood === 'broke' ? 'ring' : ''}" width="${size}" height="${size * 1.05}" viewBox="0 0 100 105" aria-hidden="true">
      ${top}
      <rect x="8" y="36" width="84" height="62" rx="16" fill="${body}"/>
      <path d="M8 52 q0 -16 16 -16 h52 q16 0 16 16 v4 H8 z" fill="${flap}"/>
      <rect x="74" y="46" width="22" height="18" rx="9" fill="${flap}"/><circle cx="85" cy="55" r="5" fill="#FFD60A"/>
      ${eyes}${mouth}${sweat}
      <circle cx="26" cy="77" r="5" fill="#ff6b8a" opacity=".5"/><circle cx="74" cy="77" r="5" fill="#ff6b8a" opacity=".5"/>
    </svg>`;
  }

  function render(main) {
    const items = App.store.get('app.items.v1', [], calc.validItems).filter(i => !i.once);
    const r = calc.balance(b.incomes, items, b.saving);
    const ratio = r.income ? r.free / r.income : 0;
    const mood = !r.income ? 'hello' : r.free < 0 ? 'broke' : ratio < .1 ? 'tight' : ratio >= .25 ? 'rich' : 'ok';
    const say = {
      hello: 'Ich bin Börsi! Sag mir, was reinkommt, dann zeig ich dir, was übrig bleibt. 💶',
      rich: `Läuft bei dir! ${eur(r.free)} frei, das sind ${eur(r.perDay)} pro Tag. 🤑`,
      ok: `Passt! Dir bleiben ${eur(r.free)} im Monat.`,
      tight: `Wird knapp: nur ${eur(r.free)} frei, ${eur(r.perDay)} am Tag. 😅`,
      broke: `Oh oh! Dir fehlen ${eur(-r.free)} im Monat. Zeit, die Kosten zu checken.`,
    }[mood];

    let h = `<div class="top"><div><div class="eyebrow">Monatsbilanz</div><h1>Bilanz</h1></div></div>
      <div class="cols"><div>${App.hero(boersi(mood, 100), say)}`;
    if (!r.income) {
      h += `<button class="primary" data-act="income">💶 Gehalt eintragen</button>
        <div class="footnote" style="text-align:center">Deine laufenden Kosten holt Börsi automatisch aus „Rechnungen“.</div>`;
    } else {
      const total = Math.max(r.income, r.fixed + r.saving);
      const seg = (v, c, t) => v > 0 ? `<i style="flex:${v / total};background:${c}" title="${t}"></i>` : '';
      h += `<div class="card" style="text-align:center">
          <div class="caption" style="margin:0">Frei pro Monat</div>
          <div class="big display num" style="font-size:52px;margin-top:6px;color:${r.free < 0 ? 'var(--red)' : 'var(--green)'}">${eur(r.free)}</div>
          <div class="caption">${r.free >= 0 ? `≈ ${eur(r.perDay)} pro Tag · ${eur(r.free * 12 / 52)} pro Woche` : 'Mehr Ausgaben als Einnahmen'}</div>
          <div class="stack">${seg(r.fixed, '#FF9F0A', 'Laufende Kosten')}${seg(r.saving, '#FFD60A', 'Sparen')}${seg(r.free, 'var(--green)', 'Frei')}</div>
          <div class="calc num">
            <div><span><i style="--c:#C9A7F5"></i>Einnahmen</span><span>+ ${eur(r.income)}</span></div>
            <div><span><i style="--c:#FF9F0A"></i>Laufende Kosten</span><span>− ${eur(r.fixed)}</span></div>
            <div><span><i style="--c:#FFD60A"></i>Sparen</span><span>− ${eur(r.saving)}</span></div>
            <div class="sum"><span><i style="--c:var(--green)"></i>Bleibt frei</span><span>${eur(r.free)}</span></div>
          </div>
        </div></div><div>`;

      h += `<div class="section-title"><span>💶 Einnahmen</span><span>${eur(r.income)} / Monat</span></div><div class="list">`;
      for (const i of b.incomes) {
        h += `<button class="row" data-income="${i.id}"><span class="ico" aria-hidden="true">💶</span>
          <span class="main"><span class="title" style="display:block">${esc(i.name)}</span></span>
          <span class="right num">${eur(i.amount)}</span></button>`;
      }
      h += `<button class="row" data-act="income"><span class="ico" aria-hidden="true" style="color:var(--green)">＋</span>
        <span class="main"><span class="title" style="display:block;color:var(--green)">Einnahme hinzufügen</span></span></button></div>`;

      // Kosten nach Kategorien, wie in Rechnungen
      h += `<div class="section-title"><span>🧾 Laufende Kosten</span><span>${eur(r.fixed)} / Monat</span></div><div class="list">`;
      const cats = (App.CATS || []).map(c => ({ ...c, list: items.filter(i => i.cat === c.id) })).filter(c => c.list.length);
      for (const c of cats) {
        const sum = c.list.reduce((s, i) => s + calc.perMonth(i), 0);
        h += `<button class="row" data-act="kosten"><span class="ico" aria-hidden="true">${c.e}</span>
          <span class="main"><span class="title" style="display:block">${c.n}</span><span class="meta" style="display:block">${c.list.map(i => esc(i.name)).join(', ')}</span></span>
          <span class="right num">${eur(sum)}</span></button>`;
      }
      h += `<button class="row" data-act="kosten"><span class="ico" aria-hidden="true" style="color:var(--green)">→</span>
        <span class="main"><span class="title" style="display:block;color:var(--green)">${cats.length ? 'In Rechnungen bearbeiten' : 'Rechnungen eintragen'}</span></span></button></div>`;

      h += `<div class="section-title"><span>🫙 Sparen</span><span>${eur(r.saving)} / Monat</span></div><div class="list">
        <button class="row" data-act="saving"><span class="ico" aria-hidden="true">🫙</span>
          <span class="main"><span class="title" style="display:block">Jeden Monat zurücklegen</span><span class="meta" style="display:block">Antippen zum Ändern</span></span>
          <span class="right num">${eur(r.saving)}</span></button></div>
        <div class="footnote">Kosten, die nicht monatlich anfallen (z. B. Rundfunk), sind auf den Monat umgerechnet.</div>`;
    }
    main.innerHTML = h + '</div></div>';

    main.onclick = (e) => {
      const inc = e.target.closest('[data-income]');
      if (inc) return editIncome(b.incomes.find(i => i.id === inc.dataset.income));
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'income') editIncome(null);
      if (act === 'saving') editSaving();
      if (act === 'kosten') App.go('kosten');
    };
  }

  function editIncome(item) {
    const s = App.sheet(`<form id="biForm" novalidate>
      <div class="sheet-head"><button type="button" data-close>Abbrechen</button><h2>${item ? 'Einnahme' : 'Neue Einnahme'}</h2><span style="min-width:70px"></span></div>
      ${item ? '' : `<div class="presets" style="margin-top:8px">${PRESETS.map(p => `<button type="button" data-name="${p}">${p}</button>`).join('')}</div>`}
      <label class="field"><span>Was?</span><input id="biName" value="${esc(item ? item.name : 'Gehalt')}" maxlength="40" autocomplete="off"></label>
      <label class="field"><span>Betrag pro Monat (€, netto)</span><input id="biAmount" inputmode="decimal" value="${item ? String(item.amount).replace('.', ',') : ''}" placeholder="z. B. 2.150,00" autocomplete="off"></label>
      <div class="err" id="biErr" role="alert"></div>
      <button class="primary" type="submit">Speichern</button>
      ${item ? '<button type="button" class="ghost danger" data-del>Löschen</button>' : ''}
    </form>`, 'Einnahme');
    const q = (sel) => s.querySelector(sel);
    q('[data-close]').onclick = App.closeSheet;
    s.querySelectorAll('[data-name]').forEach(btn => btn.onclick = () => { q('#biName').value = btn.dataset.name; q('#biAmount').focus(); });
    if (item) q('[data-del]').onclick = () => {
      if (!confirm(`„${item.name}“ löschen?`)) return;
      b.incomes = b.incomes.filter(i => i.id !== item.id); save(); App.closeSheet(); App.render();
    };
    q('#biForm').onsubmit = (e) => {
      e.preventDefault();
      const name = q('#biName').value.trim();
      const amount = App.parseAmount(q('#biAmount').value);
      if (!name) return (q('#biErr').textContent = 'Bitte einen Namen eingeben.');
      if (!amount) return (q('#biErr').textContent = 'Bitte einen Betrag eingeben.');
      const out = { id: item ? item.id : Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, amount };
      b.incomes = item ? b.incomes.map(i => i.id === item.id ? out : i) : [...b.incomes, out];
      save(); App.closeSheet(); App.render();
    };
  }

  function editSaving() {
    const s = App.sheet(`<form id="bsForm" novalidate>
      <div class="sheet-head"><button type="button" data-close>Abbrechen</button><h2>Sparen pro Monat</h2><span style="min-width:70px"></span></div>
      <label class="field"><span>So viel legst du jeden Monat zurück (€)</span><input id="bsAmount" inputmode="decimal" value="${String(b.saving).replace('.', ',')}" autocomplete="off"></label>
      <div class="err" id="bsErr" role="alert"></div>
      <button class="primary" type="submit">Speichern</button>
    </form>`, 'Sparen pro Monat');
    s.querySelector('[data-close]').onclick = App.closeSheet;
    s.querySelector('#bsForm').onsubmit = (e) => {
      e.preventDefault();
      const v = App.parseAmount(s.querySelector('#bsAmount').value);
      if (v === null) return (s.querySelector('#bsErr').textContent = 'Bitte einen gültigen Betrag eingeben.');
      b.saving = v; save(); App.closeSheet(); App.render();
    };
  }

  App.tab('bilanz', { render });
})();
