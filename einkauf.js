// Bereich Einkaufsliste mit Tüti, der Papiertüte.
(() => {
  const { esc } = App;
  const KEY = 'einkauf.items.v1';
  let list = App.store.get(KEY, [], calc.validShopping);
  let just = null; // zuletzt abgehakt, bekommt den Hüpfer
  const save = () => App.store.set(KEY, list);

  // Wörter -> Emoji (Teilwort genügt, z. B. "Vollmilch")
  const EMOJI = [
    ['milch', '🥛'], ['ei', '🥚'], ['brot', '🍞'], ['brötchen', '🥐'], ['butter', '🧈'], ['käse', '🧀'],
    ['apfel', '🍎'], ['äpfel', '🍎'], ['banane', '🍌'], ['tomate', '🍅'], ['gurke', '🥒'], ['salat', '🥗'],
    ['kartoffel', '🥔'], ['zwiebel', '🧅'], ['möhre', '🥕'], ['karotte', '🥕'], ['knoblauch', '🧄'], ['zitrone', '🍋'],
    ['nudel', '🍝'], ['pasta', '🍝'], ['reis', '🍚'], ['pizza', '🍕'], ['fleisch', '🥩'], ['hack', '🥩'],
    ['hähnchen', '🍗'], ['huhn', '🍗'], ['wurst', '🌭'], ['fisch', '🐟'], ['kaffee', '☕️'], ['tee', '🍵'],
    ['wasser', '💧'], ['saft', '🧃'], ['bier', '🍺'], ['wein', '🍷'], ['schoko', '🍫'], ['chips', '🥔'],
    ['joghurt', '🥣'], ['müsli', '🥣'], ['honig', '🍯'], ['klopapier', '🧻'], ['toilettenpapier', '🧻'],
    ['seife', '🧼'], ['zahnpasta', '🪥'], ['spül', '🫧'], ['waschmittel', '🫧'], ['katze', '🐱'], ['hund', '🐶'],
  ];
  const emojiFor = (text) => {
    const t = text.toLowerCase();
    // längster Treffer gewinnt, sonst wäre "Brötchen" ein Brot und "Eis" ein Ei
    const hit = EMOJI.filter(([w]) => t.includes(w)).sort((a, b) => b[0].length - a[0].length)[0];
    return hit ? hit[1] : '🛒';
  };
  const QUICK = ['Milch', 'Eier', 'Brot', 'Butter', 'Käse', 'Bananen', 'Kaffee', 'Nudeln', 'Klopapier'];

  // Tüti: Papiertüte mit Gesicht. Laune = hungry | happy | party
  function tueti(mood, size) {
    const ink = '#3b2412';
    const eyes = mood === 'party'
      ? `<path d="M33 62 q6 -7 12 0 M55 62 q6 -7 12 0" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`
      : `<ellipse class="eye" cx="39" cy="${mood === 'hungry' ? 58 : 60}" rx="4.5" ry="5.5" fill="${ink}"/><ellipse class="eye" cx="61" cy="${mood === 'hungry' ? 58 : 60}" rx="4.5" ry="5.5" fill="${ink}"/>`;
    const mouth = {
      hungry: `<ellipse cx="50" cy="78" rx="5" ry="6" fill="${ink}"/>`,
      happy: `<path d="M40 74 q10 10 20 0" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      party: `<path d="M37 72 q13 16 26 0 z" fill="${ink}"/>`,
    }[mood];
    // Inhalt guckt oben raus, wenn etwas auf der Liste steht
    const goods = mood === 'hungry' ? '' : `
      <rect x="56" y="2" width="11" height="40" rx="5.5" fill="#E9B872" transform="rotate(14 61 22)"/>
      <path d="M58 6 l3 4 M60 14 l3 4 M62 22 l3 4" stroke="#c48a3c" stroke-width="2" stroke-linecap="round" transform="rotate(14 61 22)"/>
      <circle cx="40" cy="26" r="11" fill="#FF453A"/><path d="M40 15 q3 -6 8 -5" stroke="#F2307F" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M26 30 q-4 -14 4 -20 q2 10 -4 20z M30 30 q2 -16 10 -18 q-2 10 -10 18z" fill="#F2307F"/>`;
    return `<svg class="buddy ${mood === 'party' ? 'party' : ''}" width="${size}" height="${size * 1.15}" viewBox="0 0 100 115" aria-hidden="true">
      ${goods}
      <path d="M36 34 q0 -16 14 -16 q14 0 14 16" stroke="#8a5a32" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M18 34 H82 L88 104 Q88 110 82 110 H18 Q12 110 12 104 Z" fill="#D4A373"/>
      <path d="M18 34 H82 L83 44 H17 Z" fill="#C08A5A"/>
      ${eyes}${mouth}
      <circle cx="30" cy="70" r="5" fill="#ff6b8a" opacity=".45"/><circle cx="70" cy="70" r="5" fill="#ff6b8a" opacity=".45"/>
    </svg>`;
  }

  function render(main) {
    const open = list.filter(i => !i.done), done = list.filter(i => i.done);
    const mood = !list.length ? 'hungry' : !open.length ? 'party' : 'happy';
    const say = !list.length ? 'Ich bin Tüti und hab Hunger! Was soll rein? 🥕'
      : !open.length ? 'Alles im Wagen! Ab zur Kasse! 🎉'
        : `Noch ${open.length} ${open.length === 1 ? 'Sache' : 'Sachen'}, dann bin ich voll.`;

    const row = (i) => `<div class="row shop ${i.done ? 'done' : ''} ${i.id === just ? 'just' : ''}">
        <button class="tick" data-toggle="${i.id}" aria-pressed="${i.done}" aria-label="${esc(i.text)} ${i.done ? 'wieder offen' : 'abhaken'}"><svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <span class="ico" aria-hidden="true">${emojiFor(i.text)}</span>
        <button class="main" data-toggle="${i.id}" tabindex="-1" style="text-align:left;padding:0"><span class="title">${esc(i.text)}</span></button>
        <button class="del" data-del="${i.id}" aria-label="${esc(i.text)} löschen">×</button>
      </div>`;

    let h = `<div class="top"><div><div class="eyebrow">Einkaufen</div><h1>Einkaufsliste</h1></div></div>
      <div class="cols"><div>${App.hero(tueti(mood, 96), say)}
      <form class="addbar" id="shopForm">
        <input id="shopInput" placeholder="Was brauchst du?" autocomplete="off" enterkeyhint="done" aria-label="Neuer Eintrag, mehrere mit Komma trennen" maxlength="200">
        <button class="add" type="submit" aria-label="Hinzufügen"><svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v14M3 10h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button>
      </form>
      <div class="presets">${QUICK.filter(q => !open.some(i => i.text.toLowerCase() === q.toLowerCase()))
        .map(q => `<button type="button" data-quick="${q}">${emojiFor(q)} ${q}</button>`).join('')}</div>`;
    if (list.length) h += '</div><div>'; // rechte Spalte nur mit Einträgen, sonst bleibt alles mittig
    if (open.length) h += `<div class="section-title">Auf der Liste · ${open.length}</div><div class="list">${open.map(row).join('')}</div>`;
    if (done.length) h += `<div class="section-title"><span>Im Wagen · ${done.length}</span><button class="link" data-act="clear">Leeren</button></div><div class="list">${done.map(row).join('')}</div>`;
    main.innerHTML = h + '</div></div>';
    just = null;

    main.querySelector('#shopForm').onsubmit = (e) => {
      e.preventDefault();
      const inp = main.querySelector('#shopInput');
      add(inp.value.split(','));
      main.querySelector('#shopInput').focus();
    };
    main.onclick = (e) => {
      const t = e.target.closest('[data-toggle]');
      if (t) return toggle(t.dataset.toggle);
      const d = e.target.closest('[data-del]');
      if (d) { list = list.filter(i => i.id !== d.dataset.del); save(); return App.render(); }
      const q = e.target.closest('[data-quick]');
      if (q) return add([q.dataset.quick]);
      if (e.target.closest('[data-act="clear"]')) {
        const removed = list.filter(i => i.done);
        list = list.filter(i => !i.done); save(); App.render();
        App.toast(`${removed.length} erledigt entfernt`, () => { list = list.concat(removed); save(); App.render(); });
      }
    };
  }

  function add(texts) {
    const fresh = texts.map(t => t.trim()).filter(Boolean)
      .map(text => ({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text, done: false }));
    if (!fresh.length) return;
    list = fresh.concat(list);
    save();
    App.render();
  }

  function toggle(id) {
    const i = list.find(x => x.id === id);
    i.done = !i.done;
    just = id;
    save();
    App.render();
    if (i.done && list.every(x => x.done)) { App.confetti(); App.toast('Alles im Wagen! 🛒'); }
  }

  App.tab('einkauf', { render });
})();
