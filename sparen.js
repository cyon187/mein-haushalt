// Bereich Sparkonto: Glasi, das Sparglas voller Scheine, mit senkrechtem Regler.
(() => {
  const { eur, esc } = App;
  const KEY = 'sparen.v1';
  let s = App.store.get(KEY, { name: 'Mein Sparziel', goal: 1000, balance: 0, step: 50 }, calc.validSaving);
  let shownN = 0; // so viele Scheine liegen schon im Glas; nur neue fallen hinein
  let uid = 0;
  const save = () => App.store.set(KEY, s);

  // Farben grob wie echte Euro-Scheine
  const COLORS = { 500: '#B07CC6', 200: '#E3C04D', 100: '#7CC49A', 50: '#F2A541', 20: '#5B8DEF', 10: '#E26D5A', 5: '#9AA3AD' };
  const MAXN = 39; // 13 Reihen à 3 Scheine füllen das Glas
  const fillOf = (x) => Math.min(1, x.balance / (x.goal || 1000));
  const moodOf = (x) => x.balance <= 0 ? 'sad' : x.goal && x.balance >= x.goal ? 'star' : fillOf(x) < .5 ? 'ok' : 'happy';
  const rnd = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

  function jar(x, size) {
    const id = 'jarClip' + ++uid;
    let n = Math.round(fillOf(x) * MAXN);
    if (x.balance > 0 && !n) n = 1;
    const ns = calc.notes(x.balance);
    let notes = '';
    for (let i = 0; i < n; i++) {
      const d = ns.length ? ns[Math.floor(i * ns.length / n)] : 5;
      const px = 34 + (i % 3) * 46 + (rnd(i, 1) - .5) * 14;
      const py = 188 - Math.floor(i / 3) * 10.5 + (rnd(i, 2) - .5) * 4;
      notes += `<g class="note ${i >= shownN ? 'drop' : ''}" style="animation-delay:${Math.max(0, i - shownN) * 35}ms">
        <g transform="translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${((rnd(i, 3) - .5) * 50).toFixed(0)})">
          <rect x="-22" y="-11" width="44" height="22" rx="3" fill="${COLORS[d]}"/>
          <rect x="-18" y="-7" width="36" height="14" rx="2" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="1.5"/>
          <text x="0" y="4.5" text-anchor="middle" font-size="12" font-weight="800" fill="rgba(0,0,0,.55)">${d}</text>
        </g></g>`;
    }
    const mood = moodOf(x);
    const ink = '#1C1C1E';
    const eyes = mood === 'star'
      ? `<text x="62" y="114" text-anchor="middle" font-size="22" fill="#FFD60A">★</text><text x="98" y="114" text-anchor="middle" font-size="22" fill="#FFD60A">★</text>`
      : `<circle cx="62" cy="106" r="9" fill="#fff"/><circle cx="98" cy="106" r="9" fill="#fff"/>
         <ellipse class="eye" cx="63" cy="${mood === 'sad' ? 109 : 107}" rx="4.5" ry="5.5" fill="${ink}"/><ellipse class="eye" cx="97" cy="${mood === 'sad' ? 109 : 107}" rx="4.5" ry="5.5" fill="${ink}"/>`;
    const mouthPath = { sad: 'M70 134 q10 -8 20 0', ok: 'M70 128 q10 8 20 0', happy: 'M66 126 q14 16 28 0 z', star: 'M64 124 q16 22 32 0 z' }[mood];
    const filled = mood === 'happy' || mood === 'star';
    const body = 'M28 52 Q28 42 44 42 L116 42 Q132 42 132 52 L140 184 Q140 204 120 204 L40 204 Q20 204 20 184 Z';
    const goalLine = x.goal ? `<path d="M30 66 H130" stroke="rgba(170,90,125,.45)" stroke-width="1.5" stroke-dasharray="4 4"/><text x="146" y="70" font-size="11" font-weight="700" fill="#8E8E93">Ziel</text>` : '';
    shownN = n;
    return `<svg class="jar ${mood === 'star' ? 'full' : ''}" width="${size}" height="${size * 1.3}" viewBox="0 0 160 208" role="img" aria-label="Sparglas, ${Math.round(fillOf(x) * 100)} Prozent voll">
      <defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs>
      <path d="${body}" fill="rgba(242,48,127,.05)"/>
      <g clip-path="url(#${id})">${notes}</g>
      ${goalLine}
      <path d="${body}" fill="none" stroke="rgba(170,90,125,.45)" stroke-width="3"/>
      <path d="M33 72 Q31 125 37 172" stroke="rgba(255,255,255,.3)" stroke-width="6" fill="none" stroke-linecap="round"/>
      <rect x="40" y="32" width="80" height="12" rx="4" fill="rgba(242,48,127,.08)" stroke="rgba(170,90,125,.45)" stroke-width="3"/>
      <rect x="34" y="12" width="92" height="22" rx="8" fill="#F2307F"/><rect x="34" y="27" width="92" height="5" fill="#C2185B"/>
      <rect x="64" y="17" width="32" height="5" rx="2.5" fill="#5A1430"/>
      ${eyes}
      <circle cx="50" cy="122" r="6" fill="#ff6b8a" opacity=".5"/><circle cx="110" cy="122" r="6" fill="#ff6b8a" opacity=".5"/>
      <path d="${mouthPath}" stroke="#fff" stroke-width="9" fill="${filled ? '#fff' : 'none'}" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>
      <path d="${mouthPath}" stroke="${ink}" stroke-width="4" fill="${filled ? ink : 'none'}" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function say(x) {
    const rest = Math.max(0, x.goal - x.balance);
    if (x.balance <= 0) return 'Ich bin Glasi. Füll mich mit Scheinen! 💶 Zieh den Regler hoch.';
    if (!x.goal) return `Schon ${eur(x.balance)} drin! Setz dir ein Ziel, dann feuere ich dich an.`;
    if (!rest) return 'Ziel erreicht! Ich platze vor Stolz! ✨';
    if (fillOf(x) >= .8) return `Fast geschafft! Nur noch ${eur(rest)}. 🔥`;
    if (fillOf(x) >= .5) return 'Halbzeit! Ich werde langsam schwer. 💪';
    return `Jeder Schein zählt. Noch ${eur(rest)} bis „${esc(x.name)}“.`;
  }
  const caption = (x) => x.goal ? `von ${eur(x.goal)} · ${Math.floor(x.balance / x.goal * 100)} %` : 'Kein Ziel gesetzt';

  let max = 1000;
  function render(main) {
    const ceilStep = (v) => Math.ceil(v / s.step) * s.step;
    max = Math.max(s.goal || 1000, ceilStep(s.balance), s.step);
    main.innerHTML = `<div class="top"><div><div class="eyebrow">Sparkonto</div><h1>${esc(s.name)}</h1></div>
        <button class="add" data-act="edit" aria-label="Sparziel bearbeiten"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zm17.7-10.2a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button></div>
      <div class="cols center"><div><section class="hero"><div class="bubble" id="svSay">${say(s)}</div>
        <div class="jarzone"><div id="svJar"></div>
          <div class="vslider" id="svSlider" role="slider" tabindex="0" aria-label="Gespart" aria-valuemin="0" aria-valuemax="${max}">
            <span class="vs-max">${eur(max).replace(/,00/, '')}</span><div class="vs-fill" id="svFill"></div><div class="vs-thumb" id="svThumb">€</div>
          </div></div>
      </section></div><div>
      <div class="save-amt"><button class="num" data-act="edit" id="svAmt" aria-label="Betrag genau eingeben"></button><div class="caption" id="svCap"></div></div>
      <div class="progress" aria-hidden="true"><i id="svBar"></i></div>
      <div class="steps">
        <button class="pm" data-pm="-1" aria-label="${s.step} Euro weniger">−</button>
        <div class="seg">${calc.STEPS.map(v => `<button type="button" data-step="${v}" aria-pressed="${v === s.step}">${v} €</button>`).join('')}</div>
        <button class="pm" data-pm="1" aria-label="${s.step} Euro mehr">+</button>
      </div>
      <div class="footnote" style="text-align:center">Regler hochziehen oder Betrag antippen. Stufen = Schrittweite.</div></div></div>`;
    show(s.balance);

    const slider = main.querySelector('#svSlider');
    let live = null;
    const fromY = (y) => {
      const r = slider.getBoundingClientRect();
      return Math.round(Math.min(1, Math.max(0, (r.bottom - y) / r.height)) * max / s.step) * s.step;
    };
    slider.onpointerdown = (e) => { slider.setPointerCapture(e.pointerId); live = fromY(e.clientY); show(live, true); };
    slider.onpointermove = (e) => {
      if (live === null) return;
      const v = fromY(e.clientY);
      if (v !== live) { live = v; show(v, true); }
    };
    slider.onpointerup = slider.onpointercancel = () => { if (live !== null) { const v = live; live = null; set(v); } };
    slider.onkeydown = (e) => {
      const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 5, PageDown: -5 }[e.key];
      if (d) { e.preventDefault(); set(Math.min(max, Math.max(0, s.balance + d * s.step))); }
      if (e.key === 'Home') { e.preventDefault(); set(0); }
    };

    main.onclick = (e) => {
      const st = e.target.closest('[data-step]');
      if (st) { s.step = Number(st.dataset.step); save(); return App.render(); }
      const pm = e.target.closest('[data-pm]');
      if (pm) return set(Math.max(0, s.balance + Number(pm.dataset.pm) * s.step));
      if (e.target.closest('[data-act="edit"]')) openEdit();
    };
  }

  // Anzeige aktualisieren ohne neu zu speichern (beim Ziehen)
  function show(v, dragging) {
    const x = { ...s, balance: v };
    const p = Math.min(1, v / max) * 100;
    const $ = (id) => document.getElementById(id);
    $('svFill').style.height = `calc(${p}% + ${66 * (1 - p / 100)}px)`; // reicht bis über die Daumenmitte
    $('svThumb').style.bottom = `calc(${p}% + ${33 - 66 * p / 100}px)`;
    const slider = $('svSlider');
    slider.setAttribute('aria-valuenow', v);
    slider.setAttribute('aria-valuetext', eur(v));
    $('svAmt').textContent = eur(v);
    $('svAmt').style.color = x.goal && v >= x.goal ? 'var(--green)' : '';
    $('svCap').textContent = caption(x);
    $('svBar').style.width = (x.goal ? Math.min(100, v / x.goal * 100) : 0) + '%';
    $('svSay').innerHTML = say(x);
    const n = Math.max(v > 0 ? 1 : 0, Math.round(fillOf(x) * MAXN));
    if (!dragging || n !== shownN) $('svJar').innerHTML = jar(x, 170);
  }

  function set(v) {
    const before = s.balance;
    s.balance = Math.round(v * 100) / 100;
    save();
    App.render();
    if (s.goal && before < s.goal && s.balance >= s.goal) celebrate();
  }

  function celebrate() {
    shownN = 0; // im Feier-Glas alle Scheine einfallen lassen
    App.party(`<div class="pop">${jar(s, 150)}</div><h2>Ziel erreicht! 🎉</h2>
      <p class="fact">${eur(s.goal)} für „${esc(s.name)}“. Glasi platzt vor Stolz!</p>`);
    App.confetti(80);
  }

  function openEdit() {
    const sh = App.sheet(`<form id="svForm" novalidate>
      <div class="sheet-head"><button type="button" data-close>Abbrechen</button><h2>Sparziel</h2><span style="min-width:70px"></span></div>
      <label class="field"><span>Wofür sparst du?</span><input id="svName" value="${esc(s.name)}" placeholder="z. B. Urlaub 🏝️" maxlength="40" autocomplete="off"></label>
      <label class="field"><span>Ziel (€), leer = ohne Ziel</span><input id="svGoal" inputmode="decimal" value="${s.goal ? String(s.goal).replace('.', ',') : ''}" placeholder="1.000" autocomplete="off"></label>
      <label class="field"><span>Schon gespart / Kontostand (€)</span><input id="svBal" inputmode="decimal" value="${String(s.balance).replace('.', ',')}" autocomplete="off"></label>
      <div class="err" id="svErr" role="alert"></div>
      <button class="primary" type="submit">Speichern</button>
    </form>`, 'Sparziel bearbeiten');
    sh.querySelector('[data-close]').onclick = App.closeSheet;
    sh.querySelector('#svForm').onsubmit = (e) => {
      e.preventDefault();
      const goal = App.parseAmount(sh.querySelector('#svGoal').value);
      const bal = App.parseAmount(sh.querySelector('#svBal').value);
      if (goal === null || bal === null) return (sh.querySelector('#svErr').textContent = 'Bitte gültige Beträge eingeben.');
      s.name = sh.querySelector('#svName').value.trim() || 'Mein Sparziel';
      s.goal = goal;
      App.closeSheet();
      set(bal);
    };
  }

  App.tab('sparen', { render });
})();
