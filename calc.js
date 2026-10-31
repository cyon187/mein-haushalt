// Reine Rechenlogik – wird von der App und von test.js genutzt.
(function (root) {
  const DAY = 86400000;
  const MONTH_DAYS = 30.44;
  const FACTOR = 1.3;     // > 30 % über dem Schnitt gilt als extrem
  const MIN_HISTORY = 3;  // Schnitt erst ab 3 Zeiträumen

  // Verbrauch je Zeitraum zwischen zwei Ablesungen, pro Tag normiert,
  // damit unregelmäßige Ablesetage (z. B. 28 vs. 45 Tage) vergleichbar bleiben.
  function periods(readings) {
    const r = [...readings].sort((a, b) => a.date.localeCompare(b.date));
    const out = [];
    for (let i = 1; i < r.length; i++) {
      const days = Math.max(1, Math.round((Date.parse(r[i].date) - Date.parse(r[i - 1].date)) / DAY));
      const kwh = r[i].value - r[i - 1].value;
      const avgBefore = out.length >= MIN_HISTORY ? perDay(out) : null;
      const rate = kwh / days;
      out.push({ from: r[i - 1].date, to: r[i].date, days, kwh, perDay: rate, avgBefore, high: avgBefore !== null && rate > avgBefore * FACTOR });
    }
    return out;
  }

  // Tagesschnitt gewichtet nach Tagen
  function perDay(ps) {
    const days = ps.reduce((s, p) => s + p.days, 0);
    return ps.reduce((s, p) => s + p.kwh, 0) / days;
  }

  function stats(ps) {
    if (ps.length < MIN_HISTORY) return null;
    const d = perDay(ps);
    return { perDay: d, perMonth: d * MONTH_DAYS };
  }

  // Laune des Maskottchens für einen Zeitraum
  function mood(p) {
    if (!p) return 'hello';
    if (p.avgBefore === null) return 'neutral';
    const ratio = p.perDay / p.avgBefore;
    return ratio > FACTOR ? 'high' : ratio < 0.9 ? 'good' : 'ok';
  }

  // Monate in Folge mit Ablesung; der laufende Monat zählt erst, wenn abgelesen
  function streak(readings, todayIso) {
    const months = new Set(readings.map(r => r.date.slice(0, 7)));
    let [y, m] = todayIso.split('-').map(Number);
    const key = () => `${y}-${String(m).padStart(2, '0')}`;
    const back = () => { if (--m === 0) { m = 12; y--; } };
    if (!months.has(key())) back();
    let n = 0;
    while (months.has(key())) { n++; back(); }
    return n;
  }

  // Import-Daten prüfen (Vertrauensgrenze)
  function validReadings(x) {
    return Array.isArray(x) && x.every(r => r && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && Number.isFinite(r.value) && r.value >= 0);
  }

  // --- Zahlungen (Kosten + Termine) ---
  // Eine Zahlung: { id, name, emoji, cat, amount, interval, months:[1..12], day, since:'YYYY-MM-DD', once?:'YYYY-MM-DD', remind, paid:{'YYYY-MM':true} }
  const INTERVALS = { monatlich: 1, vierteljaehrlich: 3, halbjaehrlich: 6, jaehrlich: 12 };
  const pad = (n) => String(n).padStart(2, '0');

  function monthsFor(interval, startMonth) {
    const out = [];
    for (let i = 0; i < 12; i += INTERVALS[interval]) out.push((startMonth - 1 + i) % 12 + 1);
    return out.sort((a, b) => a - b);
  }

  // Fälligkeitstag im Monat; der 31. wird im Februar zum 28./29.
  function dueDate(day, ym) {
    const [y, m] = ym.split('-').map(Number);
    return `${ym}-${pad(Math.min(day, new Date(Date.UTC(y, m, 0)).getUTCDate()))}`;
  }

  // Termin der Zahlung im Monat ym, sonst null
  function dueIn(item, ym) {
    if (item.once) return item.once.slice(0, 7) === ym ? item.once : null;
    if (!item.months.includes(Number(ym.slice(5)))) return null;
    const d = dueDate(item.day, ym);
    return d >= item.since ? d : null;
  }

  // Ältester noch nicht bezahlter Termin
  function nextDue(item) {
    if (item.once) return item.paid[item.once.slice(0, 7)] ? null : item.once;
    let [y, m] = item.since.split('-').map(Number);
    for (let i = 0; i < 600; i++) {
      const ym = `${y}-${pad(m)}`;
      const d = dueIn(item, ym);
      if (d && !item.paid[ym]) return d;
      if (++m > 12) { m = 1; y++; }
    }
    return null;
  }

  const perMonth = (item) => item.once ? 0 : item.amount * item.months.length / 12;

  function validItems(x) {
    const date = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
    return Array.isArray(x) && x.every(i => i && typeof i.id === 'string' && typeof i.name === 'string'
      && Number.isFinite(i.amount) && i.amount >= 0 && i.paid && typeof i.paid === 'object'
      && (i.once ? date(i.once) : date(i.since) && Number.isInteger(i.day) && i.day >= 1 && i.day <= 31
        && Array.isArray(i.months) && i.months.length > 0 && i.months.every(m => Number.isInteger(m) && m >= 1 && m <= 12)));
  }

  // --- Einkaufsliste ---
  const validShopping = (x) => Array.isArray(x)
    && x.every(i => i && typeof i.id === 'string' && typeof i.text === 'string' && typeof i.done === 'boolean');

  // --- Sparglas ---
  const STEPS = [10, 50, 100];
  const validSaving = (x) => !!x && typeof x === 'object' && typeof x.name === 'string' && STEPS.includes(x.step)
    && [x.balance, x.goal].every(n => Number.isFinite(n) && n >= 0);

  // Betrag in Scheine stückeln, große zuerst (liegen unten im Glas)
  function notes(balance, max = 400) {
    const out = [];
    let rest = Math.round(balance);
    for (const d of [100, 50, 20, 10, 5]) { // 200er/500er hat kaum jemand im Sparglas
      while (rest >= d && out.length < max) { out.push(d); rest -= d; }
    }
    return out;
  }

  // --- Monatsbilanz ---
  const validBilanz = (x) => !!x && typeof x === 'object' && Number.isFinite(x.saving) && x.saving >= 0
    && Array.isArray(x.incomes) && x.incomes.every(i => i && typeof i.id === 'string' && typeof i.name === 'string'
      && Number.isFinite(i.amount) && i.amount >= 0);

  // Einnahmen minus laufende Kosten (aus Rechnungen) minus Sparrate
  function balance(incomes, items, saving) {
    const income = incomes.reduce((s, i) => s + i.amount, 0);
    const fixed = items.reduce((s, i) => s + perMonth(i), 0);
    const free = income - fixed - saving;
    return { income, fixed, saving, free, perDay: free * 12 / 365 };
  }

  // --- Geburtstage ---
  const validBirthdays = (x) => Array.isArray(x) && x.every(b => b && typeof b.id === 'string' && typeof b.name === 'string'
    && typeof b.note === 'string' && Number.isInteger(b.month) && b.month >= 1 && b.month <= 12
    && Number.isInteger(b.day) && b.day >= 1 && b.day <= 31
    && (b.year === null || (Number.isInteger(b.year) && b.year >= 1900 && b.year <= 2100)));

  // Nächster Geburtstag ab heute; wer am 29.02. geboren ist, feiert in Nicht-Schaltjahren am 28.02.
  function nextBirthday(b, todayIso) {
    let y = Number(todayIso.slice(0, 4));
    const at = (yy) => `${yy}-${pad(b.month)}-${pad(Math.min(b.day, new Date(Date.UTC(yy, b.month, 0)).getUTCDate()))}`;
    let date = at(y);
    if (date < todayIso) date = at(++y);
    return { date, days: Math.round((Date.parse(date) - Date.parse(todayIso)) / DAY), age: b.year ? y - b.year : null };
  }

  root.calc = {
    periods, stats, mood, streak, validReadings, MONTH_DAYS, FACTOR, MIN_HISTORY,
    monthsFor, dueDate, dueIn, nextDue, perMonth, validItems,
    validShopping, validSaving, notes, STEPS,
    validBilanz, balance, validBirthdays, nextBirthday,
  };
})(typeof window !== 'undefined' ? window : globalThis);
