/* MITHQAL — 2027 finance-bill gain page. Maths: engine/payroll.js (window.MQSalary), same file as the app.
   Builds the result, a curve with the visitor's point, and a share card drawn on the device (nothing is sent). */
(function () {
  'use strict';
  const S = window.MQSalary, L = window.MQ_Y27, root = document.getElementById('y27');
  if (!S || !L || !root) return;
  const $ = s => root.querySelector(s);
  const rtl = document.documentElement.dir === 'rtl';
  const fmt = new Intl.NumberFormat(L.numLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const int = new Intl.NumberFormat(L.numLocale, { maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(L.numLocale, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 });
  const money = x => `${fmt.format(x)} ${L.currency}`;
  const signed = x => `${x > 0 ? '+' : ''}${money(x)}`;
  // numbers keep left-to-right order inside Arabic text (otherwise the + sign jumps to the end)
  const iso = t => rtl ? `\u2066${t}\u2069` : t;
  // card amounts: only the number is isolated, the currency word stays in Arabic order
  const amt = (x, sign) => `${iso(`${sign && x > 0 ? '+' : ''}${fmt.format(x)}`)} ${L.currency}`;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const set = (sel, txt) => { const e = $(sel); if (e) e.textContent = txt; };

  const q = new URLSearchParams(location.search);
  if (+q.get('b') > 0) $('#y-amount').value = +q.get('b');
  if (q.get('d') !== null && +q.get('d') >= 0) $('#y-dep').value = Math.min(6, +q.get('d') | 0);

  let curveFor = null, curve = [], state = null, tracked = false;
  const calc = (g, d) => {
    const a = S.calculate({ grossMonthly: g, year: 2026, dependants: d }), b = S.calculate({ grossMonthly: g, year: 2027, dependants: d });
    if (!a.ok || !b.ok) return null;
    const ir = r => r.deductions.find(x => x.key === 'incomeTax').monthly;
    // CNSS and AMO are identical in both years, so the gain is exactly the annual income-tax difference / 12 (one rounding, not two)
    const gain = S.round2((a.tax.incomeTaxAnnual - b.tax.incomeTaxAnnual) / 12);
    return { g, n26: a.net.monthly, n27: S.round2(a.net.monthly + gain), gain, ir26: ir(a), ir27: ir(b) };
  };

  function drawChart(d, me) {
    const svg = $('#y-chart'); if (!svg) return;
    if (curveFor !== d) { curve = []; for (let g = 3000; g <= 20000; g += 100) curve.push(calc(g, d)); curveFor = d; }
    const W = svg.clientWidth || 600, H = svg.clientHeight || 260, m = { l: 44, r: 16, t: 18, b: 34 };
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.replaceChildren();
    const x = g => { const t = (g - 3000) / 17000; return m.l + (rtl ? 1 - t : t) * (W - m.l - m.r); };
    const y = v => H - m.b - v / 550 * (H - m.t - m.b);
    const defs = el('defs', {}, svg), gr = el('linearGradient', { id: 'yg', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#D4AA55', 'stop-opacity': .55 }, gr); el('stop', { offset: 1, 'stop-color': '#D4AA55', 'stop-opacity': 0 }, gr);
    [0, 100, 200, 300, 400, 500].forEach(v => { el('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: 'grid' }, svg); const t = el('text', { x: rtl ? W - m.r + 2 : m.l - 8, y: y(v) + 4, class: 'tick', 'text-anchor': rtl ? 'start' : 'end' }, svg); t.textContent = int.format(v); });
    [4000, 8000, 12000, 16000, 20000].forEach(g => { const t = el('text', { x: x(g), y: H - 10, class: 'tick', 'text-anchor': 'middle' }, svg); t.textContent = int.format(g); });
    const pts = curve.filter(Boolean).map(p => `${x(p.g).toFixed(1)},${y(p.gain).toFixed(1)}`);
    el('path', { d: `M${x(3000)},${y(0)} L${pts.join(' L')} L${x(20000)},${y(0)} Z`, fill: 'url(#yg)' }, svg);
    el('path', { d: `M${pts.join(' L')}`, fill: 'none', stroke: '#D4AA55', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, svg);
    if (me && me.g >= 3000) {
      const gx = x(Math.min(me.g, 20000)), gy = y(me.gain);
      el('line', { x1: gx, x2: gx, y1: gy, y2: H - m.b, class: 'mark' }, svg);
      el('circle', { cx: gx, cy: gy, r: 7, fill: '#fff', stroke: '#D4AA55', 'stroke-width': 3 }, svg);
      const lbl = el('text', { x: gx, y: gy - 14, class: 'you', 'text-anchor': gx > W * .8 ? 'end' : gx < W * .2 ? 'start' : 'middle' }, svg);
      lbl.textContent = `${L.you} · ${signed(me.gain)}`;
    }
  }

  function run() {
    const g = parseFloat(String($('#y-amount').value).replace(',', '.')), d = +$('#y-dep').value || 0;
    if (!(g > 0) || g > 10000000) { root.classList.add('empty'); return; }
    root.classList.remove('empty');
    const r = calc(g, d); if (!r) return;
    state = { g, d, r };
    set('#y-gain', signed(r.gain));
    set('#y-year', `${signed(S.round2(r.gain * 12))} ${L.perYear}`);
    set('#y-pct', r.gain > 0 ? `+${pct.format(r.gain / r.n26)} ${L.pctNet}` : '');
    set('#y-n26', money(r.n26)); set('#y-n27', money(r.n27));
    const st = r.gain <= 0 ? 'none' : r.gain >= 499.995 ? 'capped' : r.ir27 === 0 ? 'zero' : 'partial';
    set('#y-state', L.states[st]);
    root.dataset.state = st;
    drawChart(d, r);
    drawCard();
    if (!tracked) { tracked = true; window.mqTrack && window.mqTrack('calc_used', { tool: 'gain2027' }); }
  }

  // ---------- share card (1080 × 1350), drawn locally ----------
  async function drawCard() {
    const c = $('#y-card'); if (!c || !state) return;
    try { await document.fonts.load('700 80px "Readex Pro"'); } catch (e) {}
    const ctx = c.getContext('2d'), W = 1080, H = 1350, r = state.r, showSal = $('#y-showsal').checked;
    const grad = ctx.createLinearGradient(0, 0, W, H); grad.addColorStop(0, '#0F3B3F'); grad.addColorStop(.55, '#072427'); grad.addColorStop(1, '#04191B');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    // faint khatam pattern
    ctx.save(); ctx.globalAlpha = .07; ctx.strokeStyle = '#EBCB8B'; ctx.lineWidth = 2;
    for (let yy = 40; yy < H; yy += 120) for (let xx = 40; xx < W; xx += 120) {
      ctx.strokeRect(xx - 26, yy - 26, 52, 52);
      ctx.save(); ctx.translate(xx, yy); ctx.rotate(Math.PI / 4); ctx.strokeRect(-26, -26, 52, 52); ctx.restore();
    }
    ctx.restore();
    const glow = ctx.createRadialGradient(W * .8, 120, 10, W * .8, 120, 700); glow.addColorStop(0, 'rgba(212,170,85,.35)'); glow.addColorStop(1, 'rgba(212,170,85,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    const F = w => `${w} {s}px "Readex Pro", system-ui, sans-serif`;
    const font = (w, s) => F(w).replace('{s}', s);
    ctx.direction = rtl ? 'rtl' : 'ltr'; ctx.textAlign = rtl ? 'right' : 'left';
    const X = rtl ? W - 90 : 90;
    ctx.fillStyle = '#D4AA55'; ctx.font = font(600, 40); ctx.fillText(L.cardTop, X, 170);
    ctx.fillStyle = '#ffffff'; ctx.font = font(700, r.gain > 0 ? 150 : 96);
    const big = r.gain > 0 ? amt(r.gain, true) : iso('0');
    let size = r.gain > 0 ? 150 : 96; while (ctx.measureText(big).width > W - 180 && size > 60) { size -= 6; ctx.font = font(700, size); }
    ctx.fillText(big, X, 470);
    ctx.fillStyle = '#EBCB8B'; ctx.font = font(500, 52); ctx.fillText(r.gain > 0 ? L.cardLine : L.cardNone, X, 560);
    if (r.gain > 0) { ctx.fillStyle = '#A3C0BD'; ctx.font = font(500, 46); ctx.fillText(`${amt(S.round2(r.gain * 12), true)} ${L.perYear}`, X, 650); }
    if (showSal) { ctx.fillStyle = '#A3C0BD'; ctx.font = font(400, 40); ctx.fillText(`${L.cardSalary} ${amt(state.g)}`, X, 730); }
    // gain against the 500 DH maximum: a gold bar
    const bx = 90, bw = W - 180, by = 860, frac = Math.max(0, Math.min(1, r.gain / 500));
    ctx.fillStyle = 'rgba(234,243,242,.12)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, 26, 13); ctx.fill();
    if (frac > 0) { const bg = ctx.createLinearGradient(bx, 0, bx + bw, 0); bg.addColorStop(0, '#EBCB8B'); bg.addColorStop(1, '#D4AA55'); ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(rtl ? bx + bw * (1 - frac) : bx, by, Math.max(26, bw * frac), 26, 13); ctx.fill(); }
    ctx.fillStyle = '#A3C0BD'; ctx.font = font(500, 34);
    ctx.textAlign = rtl ? 'right' : 'left'; ctx.fillText(iso('0'), rtl ? bx + bw : bx, by + 80);
    ctx.textAlign = rtl ? 'left' : 'right'; ctx.fillText(`${L.cardMax} ${amt(500)}`, rtl ? bx : bx + bw, by + 80);
    ctx.textAlign = rtl ? 'right' : 'left';
    // footer band
    ctx.fillStyle = 'rgba(234,243,242,.08)'; ctx.fillRect(0, H - 330, W, 330);
    ctx.fillStyle = '#D4AA55'; ctx.font = font(700, 58); ctx.fillText(rtl ? `${L.cardCta} ←` : `${L.cardCta} →`, X, H - 210);
    ctx.fillStyle = '#EAF3F2'; ctx.font = font(500, 40); ctx.fillText(L.host, X, H - 140);
    ctx.fillStyle = '#A3C0BD'; ctx.font = font(400, 30); ctx.fillText(L.cardFoot, X, H - 80);
    // brand mark: eight-point star
    ctx.save(); ctx.translate(rtl ? 130 : W - 130, H - 175); ctx.fillStyle = '#D4AA55';
    ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 - Math.PI / 2, rr = i % 2 ? 34 : 56; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#04191B'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  const shareUrl = src => { const u = new URL(L.pageUrl || location.href); u.search = ''; u.hash = ''; u.searchParams.set('utm_source', src); u.searchParams.set('utm_medium', 'share'); u.searchParams.set('utm_campaign', 'lf2027'); return u.toString(); };
  const text = () => L.shareText(state && state.r.gain > 0 ? money(state.r.gain) : '');
  const flash = (btn, msg) => { const o = btn.textContent; btn.textContent = msg; setTimeout(() => { btn.textContent = o; }, 1800); };

  root.querySelectorAll('[data-share]').forEach(btn => btn.addEventListener('click', async () => {
    const how = btn.dataset.share; if (!state) return;
    window.mqTrack && window.mqTrack('share_click', { how, tool: 'gain2027' });
    if (how === 'wa') { window.open(`https://wa.me/?text=${encodeURIComponent(text() + ' ' + shareUrl('whatsapp'))}`, '_blank', 'noopener'); return; }
    if (how === 'copy') { try { await navigator.clipboard.writeText(text() + ' ' + shareUrl('copy')); flash(btn, L.copied); } catch (e) {} return; }
    const blob = await new Promise(res => $('#y-card').toBlob(res, 'image/png'));
    const file = blob ? new File([blob], 'mithqal-2027.png', { type: 'image/png' }) : null;
    if (how === 'native') {
      try {
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text: text(), url: shareUrl('native') });
        else if (navigator.share) await navigator.share({ text: text(), url: shareUrl('native') });
        else window.open(`https://wa.me/?text=${encodeURIComponent(text() + ' ' + shareUrl('whatsapp'))}`, '_blank', 'noopener');
      } catch (e) { /* user closed the sheet */ }
      return;
    }
    if (how === 'download' && blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mithqal-2027.png'; document.body.appendChild(a); a.click(); a.remove(); }
  }));

  root.addEventListener('input', e => { if (e.target.id === 'y-showsal') drawCard(); else run(); });
  root.addEventListener('change', e => { if (e.target.id === 'y-showsal') drawCard(); else run(); });
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => state && drawChart(state.d, state.r), 150); });
  run();
})();
