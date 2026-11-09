/* 第 2 章：窄峡谷、重球与 Nesterov · 交互实验 */
(function () {
  const { COLORS: C, M } = LAB;
  LAB.page({ bookRef: '对应书中 §2.1 条件数 κ · §2.2 重球动量与韦达定理 · §2.3 Nesterov 超前探路 · §2.4 前 2 步手算 · §2.5 对比表 · 零算力实战' });
  document.querySelectorAll('.formula, [style*="overflow-x"]').forEach((f) => { f.style.width = '0'; f.style.minWidth = '100%'; });
  const $ = (s) => document.querySelector(s);
  const FONT = getComputedStyle(document.body).getPropertyValue('--font');
  const NUMF = getComputedStyle(document.body).getPropertyValue('--font-num');
  const fx = (x, d) => { if (!isFinite(x)) return '∞'; const a = Math.abs(x); if (a !== 0 && (a >= 1e5 || a < 1e-3)) return M.fmt(x, 2); return (+x.toFixed(d == null ? 3 : d)).toString(); };
  const sgn = (x, d) => (x < 0 ? '−' : '') + fx(Math.abs(x), d);
  function pointer(el, h) {
    const pos = (e) => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    let on = false;
    el.addEventListener('pointerdown', (e) => { on = true; try { el.setPointerCapture(e.pointerId); } catch (_) {} h.down && h.down(...pos(e)); e.preventDefault(); });
    el.addEventListener('pointermove', (e) => { if (on && h.move) h.move(...pos(e)); });
    const end = () => { if (on) { on = false; h.up && h.up(); } };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
  const logTicks = (e0, e1) => { const s = Math.max(1, Math.ceil((e1 - e0) / 6)), t = []; for (let e = Math.ceil(e0 / s) * s; e <= e1; e += s) t.push(Math.pow(10, e)); return t; };
  // 二次峡谷上的三种方法（逐坐标，曲率 h = [1, κ]）
  function runMethod(kind, h, eta, beta, p0, T) {
    let p = p0.slice(), v = [0, 0];
    const path = [p.slice()], look = [p.slice()];
    for (let t = 0; t < T; t++) {
      if (kind === 0) { p = p.map((x, i) => x - eta * h[i] * x); look.push(p.slice()); }
      else if (kind === 1) { v = v.map((vi, i) => beta * vi - eta * h[i] * p[i]); p = p.map((x, i) => x + v[i]); look.push(p.slice()); }
      else { const q = p.map((x, i) => x + beta * v[i]); look.push(q.slice()); v = v.map((vi, i) => beta * vi - eta * h[i] * q[i]); p = p.map((x, i) => x + v[i]); }
      path.push(p.slice());
    }
    return { path, look };
  }
  const NAMES = ['GD', '重球 HB', 'Nesterov'], COLS = [C.c4, C.c2, C.c3], CLS = ['coral', 'amber', 'leaf'];
  // 特征根：返回该方向的谱半径
  function roots(kind, eta, beta, lam) {
    if (kind === 0) return [[1 - eta * lam, 0]];
    const b = kind === 1 ? 1 + beta - eta * lam : (1 + beta) * (1 - eta * lam), c = kind === 1 ? beta : beta * (1 - eta * lam);
    const D = b * b - 4 * c;
    if (D >= 0) { const s = Math.sqrt(D); return [[(b + s) / 2, 0], [(b - s) / 2, 0]]; }
    const s = Math.sqrt(-D); return [[b / 2, s / 2], [b / 2, -s / 2]];
  }
  const rad = (kind, eta, beta, lam) => Math.max(...roots(kind, eta, beta, lam).map((r) => Math.hypot(r[0], r[1])));
  function rhoBand(kind, eta, beta, kappa) { let m = 0; for (let i = 0; i <= 160; i++) { const lam = Math.pow(kappa, i / 160); m = Math.max(m, rad(kind, eta, beta, lam)); } return m; }
  const optHB = (k) => ({ eta: 4 / Math.pow(Math.sqrt(k) + 1, 2), beta: Math.pow((Math.sqrt(k) - 1) / (Math.sqrt(k) + 1), 2) });

  /* ================= 实验 1：三颗小球赛峡谷 ================= */
  const A = { kappa: 50, eta: 0.035, beta: 0.5, T: 15, p0: [10, 1], on: [true, true, true], shown: 15, playing: false };
  const sK = LAB.slider('#a-kappa', { label: '条件数 $\\kappa=\\lambda_{\\max}/\\lambda_{\\min}$', min: 2, max: 100, step: 1, value: 50, onInput: (v) => { A.kappa = v; sE.setRange(0.0005, +(4 / v).toFixed(4), 0.0001); updA(); } });
  const sE = LAB.slider('#a-eta', { label: '步长 $\\eta$', min: 0.0005, max: 0.08, step: 0.0001, value: 0.035, fmt: (v) => v.toFixed(4), onInput: (v) => { A.eta = v; updA(); } });
  const sB = LAB.slider('#a-beta', { label: '惯性系数 $\\beta$', min: 0, max: 0.95, step: 0.01, value: 0.5, fmt: (v) => v.toFixed(2), onInput: (v) => { A.beta = v; updA(); } });
  const sT = LAB.slider('#a-T', { label: '走几步 $T$', min: 1, max: 80, step: 1, value: 15, onInput: (v) => { A.T = v; A.shown = v; updA(); } });
  const onBox = $('#a-on'); onBox.style.display = 'flex'; onBox.style.flexWrap = 'wrap'; onBox.style.gap = '0 14px';
  NAMES.forEach((n, i) => LAB.checkbox('#a-on', `<span style="color:${COLS[i]};font-weight:650">${n}</span>`, true, (v) => { A.on[i] = v; map.redraw(); loss.redraw(); }));
  function setA(o) { Object.assign(A, o); sK.set(A.kappa); sE.setRange(0.0005, +(4 / A.kappa).toFixed(4), 0.0001); sE.set(A.eta); sB.set(A.beta); sT.set(A.T); A.shown = A.T; updA(); }
  LAB.segmented('#a-preset', ['书中 §2.4 手算', '书中 30 行脚本', '最优重球参数'], 0, (i) => {
    if (i === 0) setA({ kappa: 50, eta: 0.035, beta: 0.5, T: 15 });
    else if (i === 1) setA({ kappa: 50, eta: 0.026, beta: 0.8, T: 15 });
    else { const o = optHB(A.kappa); setA({ eta: +o.eta.toFixed(4), beta: +o.beta.toFixed(2) }); }
  });
  let RA = null;
  const fA = (p) => 0.5 * p[0] * p[0] + 0.5 * A.kappa * p[1] * p[1];
  function compA() { const h = [1, A.kappa]; RA = [0, 1, 2].map((k) => runMethod(k, h, A.eta, A.beta, A.p0, A.T)); }
  const stA = NAMES.map((n, i) => LAB.stat('#a-stats', `${n}：第 T 步海拔`, CLS[i]));
  function updA() {
    compA();
    RA.forEach((r, i) => { const v = fA(r.path[A.T]); stA[i].set(isFinite(v) && v < 1e12 ? fx(v, 4) : '发散'); stA[i].el.querySelector('.label').innerHTML = `${NAMES[i]}：第 ${A.T} 步海拔`; });
    renderTable(); map.redraw(); loss.redraw(); stab.redraw();
  }
  function renderTable() {
    const rows = [];
    for (let t = 1; t <= Math.min(3, A.T); t++) {
      const cells = RA.map((r, i) => `<td class="num" style="color:${COLS[i]}">(${sgn(r.path[t][0], 3)}, ${sgn(r.path[t][1], 4)})</td>`).join('');
      const lk = RA[2].look[t];
      rows.push(`<tr><td class="num">${t}</td>${cells}<td class="num muted">(${sgn(lk[0], 3)}, ${sgn(lk[1], 4)})</td></tr>`);
    }
    $('#a-table').innerHTML = `<thead><tr><th>t</th><th>GD 位置</th><th>重球 HB 位置</th><th>Nesterov 位置</th><th>Nesterov 本步探路点</th></tr></thead><tbody>${rows.join('')}</tbody>`;
  }
  let mapP = null;
  const map = LAB.canvas('#a-map', (ctx, w, h) => {
    if (!RA) return;
    const xr = [-3.5, 11.5], yr = [-1.9, 1.9];
    const P = new LAB.Plot(ctx, w, h, { xmin: xr[0], xmax: xr[1], ymin: yr[0], ymax: yr[1], xlabel: 'x（平缓方向）', ylabel: 'y（陡峭方向）', pad: { l: 46, r: 12, t: 10, b: 36 } });
    mapP = P;
    // 等高线：½x² + κ/2 y² = c
    ctx.save(); P.clip();
    const levels = [0.05, 0.2, 0.5, 1.2, 2.5, 5, 10, 20, 35, 55, 80];
    ctx.fillStyle = C.c1l; ctx.fillRect(P.x0, P.y1, P.x1 - P.x0, P.y0 - P.y1);
    levels.slice().reverse().forEach((c, k) => {
      const rx = Math.sqrt(2 * c), ry = Math.sqrt(2 * c / A.kappa);
      ctx.fillStyle = LAB.mix(C.c1l, '#ffffff', (k + 1) / levels.length);
      ctx.beginPath(); ctx.ellipse(P.tx(0), P.ty(0), P.tx(rx) - P.tx(0), P.ty(0) - P.ty(ry), 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(44,79,124,.25)'; ctx.lineWidth = 0.9; ctx.stroke();
    });
    P.unclip(); ctx.restore();
    P.axes(); P.clip();
    P.points([0], [0], C.ink, 4);
    const n = Math.min(A.shown, A.T);
    RA.forEach((r, i) => {
      if (!A.on[i]) return;
      // 飞出地图（发散）就截断，在边上画 ×
      const inside = (p) => p[0] > xr[0] - 2 && p[0] < xr[1] + 2 && Math.abs(p[1]) < 2.6;
      let cut = r.path.slice(0, n + 1).findIndex((p) => !inside(p));
      const pts = r.path.slice(0, cut < 0 ? n + 1 : cut + 1).map((p) => [M.clamp(p[0], xr[0] - 2, xr[1] + 2), M.clamp(p[1], -2.6, 2.6)]);
      P.line(pts.map((p) => p[0]), pts.map((p) => p[1]), COLS[i], 2);
      P.points(pts.map((p) => p[0]), pts.map((p) => p[1]), COLS[i], 2.8);
      if (i === 2) { ctx.save(); ctx.strokeStyle = COLS[2]; ctx.lineWidth = 1.2; r.look.slice(1, pts.length).forEach((q) => { if (!inside(q)) return; ctx.beginPath(); ctx.arc(P.tx(q[0]), P.ty(q[1]), 3.6, 0, 7); ctx.stroke(); }); ctx.restore(); }
      const last = pts[pts.length - 1];
      if (cut >= 0) {
        const X = P.tx(M.clamp(last[0], xr[0], xr[1])), Y = P.ty(M.clamp(last[1], yr[0] + 0.08, yr[1] - 0.08));
        ctx.save(); ctx.strokeStyle = COLS[i]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X - 6, Y - 6); ctx.lineTo(X + 6, Y + 6); ctx.moveTo(X + 6, Y - 6); ctx.lineTo(X - 6, Y + 6); ctx.stroke();
        ctx.fillStyle = COLS[i]; ctx.font = '600 12px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = Y < h / 2 ? 'top' : 'bottom'; ctx.fillText(`第 ${cut} 步飞出`, X, Y + (Y < h / 2 ? 9 : -9)); ctx.restore();
      } else P.points([last[0]], [last[1]], COLS[i], 5.5, '#fff');
    });
    P.unclip();
    ctx.save(); ctx.fillStyle = C.navy; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P.tx(A.p0[0]), P.ty(A.p0[1]), 6, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
    $('#a-step').textContent = `显示前 ${n} 步 · 起点 (${fx(A.p0[0], 2)}, ${fx(A.p0[1], 2)})`;
  });
  pointer(map.canvas, { down: (x, y) => setStart(x, y), move: (x, y) => setStart(x, y) });
  map.canvas.style.touchAction = 'none'; map.canvas.style.cursor = 'crosshair';
  function setStart(px, py) { if (!mapP) return; A.p0 = [+M.clamp(mapP.ix(px), -3.4, 11.4).toFixed(2), +M.clamp(mapP.iy(py), -1.85, 1.85).toFixed(2)]; updA(); }
  $('#a-reset').onclick = () => { A.p0 = [10, 1]; updA(); };
  $('#a-play').onclick = () => {
    if (A.playing) return; A.playing = true; A.shown = 0; let last = 0;
    const tick = (ts) => { if (ts - last > 110) { last = ts; A.shown++; map.redraw(); loss.redraw(); } if (A.shown < A.T) requestAnimationFrame(tick); else A.playing = false; };
    requestAnimationFrame(tick);
  };
  const loss = LAB.canvas('#a-loss', (ctx, w, h) => {
    if (!RA) return;
    const n = Math.min(A.shown, A.T), L = RA.map((r) => r.path.map(fA));
    let lo = Infinity, hi = -Infinity; L.forEach((l, i) => { if (A.on[i]) l.forEach((v) => { if (isFinite(v) && v > 0) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }); });
    if (!isFinite(lo)) { lo = 1e-6; hi = 1; }
    const e1 = Math.min(Math.ceil(Math.log10(hi) + 0.01), 8), e0 = Math.max(Math.floor(Math.log10(lo)), e1 - 14, -14);
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: A.T, ymin: Math.pow(10, e0), ymax: Math.pow(10, Math.max(e1, e0 + 1)), logy: true, ytickValues: logTicks(e0, Math.max(e1, e0 + 1)), xlabel: '步数 t', pad: { l: 52, r: 12, t: 10, b: 36 } }).axes();
    P.clip();
    L.forEach((l, i) => { if (A.on[i]) P.line(M.range(n + 1), l.slice(0, n + 1).map((v) => M.clamp(v, Math.pow(10, e0), 1e30)), COLS[i], 2.2); });
    P.unclip();
  });
  const stab = LAB.canvas('#a-stab', (ctx, w, h) => {
    const x = A.eta * A.kappa, lim = [2, 2 * (1 + A.beta), 2 * (1 + A.beta) / (1 + 2 * A.beta)], top = Math.max(4.2, x * 1.15);
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: top, ymin: -0.5, ymax: 2.5, ytickValues: [], xlabel: 'ηλ_max', pad: { l: 70, r: 14, t: 10, b: 36 } }).axes();
    lim.forEach((L, i) => {
      const y = 2 - i;
      ctx.save(); ctx.fillStyle = LAB.mix('#ffffff', COLS[i], 0.25); LAB.roundRect(ctx, P.tx(0), P.ty(y + 0.28), P.tx(L) - P.tx(0), P.ty(y - 0.28) - P.ty(y + 0.28), 4); ctx.fill();
      ctx.fillStyle = COLS[i]; ctx.font = '600 12.5px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(NAMES[i], P.x0 - 6, P.ty(y)); ctx.restore();
      P.text(L, y, ` ${L.toFixed(3)}`, COLS[i], 'left', 'middle', '600 11.5px ' + NUMF);
    });
    P.vline(x, C.navy, [5, 3], 1.8);
    P.text(x, 2.42, ` 当前 ${x.toFixed(3)}`, C.navy, 'left', 'middle', '600 12px ' + NUMF);
  });
  updA();

  /* ================= 实验 2：条件数决定速度 ================= */
  const B = { kappa: 50, beta: 0.5, eta: 0.035 };
  const bK = LAB.slider('#b-kappa', { label: '条件数 $\\kappa$（对数刻度）', min: 0, max: 4, step: 0.01, value: Math.log10(50), fmt: (v) => fx(Math.pow(10, v), Math.pow(10, v) < 10 ? 2 : 0), onInput: (v) => { B.kappa = Math.pow(10, v); bE.setRange(0.0001, +(4.2 / B.kappa).toPrecision(3), +(4.2 / B.kappa / 400).toPrecision(2)); updB(); } });
  const bB = LAB.slider('#b-beta', { label: '惯性系数 $\\beta$（用于下方两图）', min: 0, max: 0.99, step: 0.01, value: 0.5, fmt: (v) => v.toFixed(2), onInput: (v) => { B.beta = v; updB(); } });
  const bE = LAB.slider('#b-eta', { label: '步长 $\\eta$（用于下方两图）', min: 0.0001, max: 0.084, step: 0.0002, value: 0.035, fmt: (v) => v.toPrecision(3), onInput: (v) => { B.eta = v; updB(); } });
  $('#b-opt').onclick = () => { const o = optHB(B.kappa); B.eta = o.eta; B.beta = o.beta; bB.set(+o.beta.toFixed(2)); B.beta = +o.beta.toFixed(2); bE.set(o.eta); updB(); };
  const N1000 = (r) => (r >= 1 ? Infinity : r <= 0 ? 1 : Math.log(1000) / -Math.log(r));
  // Nesterov 的常用参数 η=1/L、β=(√κ−1)/(√κ+1)：谱半径恰为 1−1/√κ（逐方向数值计算）
  const rhoNag = (k) => rhoBand(2, 1 / k, (Math.sqrt(k) - 1) / (Math.sqrt(k) + 1), k);
  const stB = [LAB.stat('#b-stats', 'GD 最优缩短率', 'coral'), LAB.stat('#b-stats', '重球最优缩短率', 'amber'), LAB.stat('#b-stats', 'Nesterov（常用参数）缩短率', 'leaf'), LAB.stat('#b-stats', '缩小 1000 倍：GD / 重球 / Nesterov', '')];
  function updB() {
    const k = B.kappa, rg = (k - 1) / (k + 1), rh = (Math.sqrt(k) - 1) / (Math.sqrt(k) + 1), rn = rhoNag(k);
    stB[0].set(rg.toFixed(4)); stB[1].set(rh.toFixed(4)); stB[2].set(`${rn.toFixed(4)}<small>= 1−1/√κ</small>`);
    const n1 = (r) => { const n = N1000(r); return n < 1000 ? n.toFixed(1) : Math.round(n); };
    stB[3].set(`${n1(rg)}<small>/</small> ${n1(rh)}<small>/</small> ${n1(rn)}<small>步</small>`);
    $('#b-sub').textContent = `κ = ${fx(k, k < 10 ? 2 : 0)}，β = ${B.beta.toFixed(2)}，η* (GD) = ${fx(2 / (k + 1), 4)}`;
    rhoC.redraw(); stepC.redraw(); etaC.redraw(); verC.redraw();
  }
  const rhoC = LAB.canvas('#b-rho', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: 1, xmax: 1e4, logx: true, ymin: 0, ymax: 1.02, xlabel: '条件数 κ', ylabel: '缩短率 ρ', xtickValues: [1, 10, 100, 1000, 10000], xfmt: (v) => (v >= 1000 ? M.fmt(v, 0).replace('1.00×', '') : v), pad: { l: 46, r: 12, t: 10, b: 36 } }).axes();
    P.fn((k) => (k - 1) / (k + 1), C.c4, 2.4); P.fn((k) => 1 - 1 / Math.sqrt(k), C.c3, 2.4, [6, 3]); P.fn((k) => (Math.sqrt(k) - 1) / (Math.sqrt(k) + 1), C.c2, 2.4);
    const k = B.kappa; P.vline(k, C.slate, [3, 3]);
    P.points([k, k, k], [(k - 1) / (k + 1), rhoNag(k), (Math.sqrt(k) - 1) / (Math.sqrt(k) + 1)], C.navy, 5, '#fff');
  });
  const stepC = LAB.canvas('#b-steps', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: 1.5, xmax: 1e4, logx: true, logy: true, ymin: 1, ymax: 1e5, xlabel: '条件数 κ', ylabel: '步数', xtickValues: [10, 100, 1000, 10000], ytickValues: [1, 10, 100, 1000, 10000, 100000], xfmt: (v) => (v >= 1000 ? M.fmt(v, 0).replace('1.00×', '') : v), pad: { l: 52, r: 12, t: 10, b: 36 } }).axes();
    P.fn((k) => N1000((k - 1) / (k + 1)), C.c4, 2.4); P.fn((k) => N1000(1 - 1 / Math.sqrt(k)), C.c3, 2.4, [6, 3]); P.fn((k) => N1000((Math.sqrt(k) - 1) / (Math.sqrt(k) + 1)), C.c2, 2.4);
    const k = Math.max(B.kappa, 1.5), a = N1000((k - 1) / (k + 1)), b = N1000((Math.sqrt(k) - 1) / (Math.sqrt(k) + 1)), c = N1000(rhoNag(k));
    P.vline(k, C.slate, [3, 3]); P.points([k, k, k], [a, b, c], C.navy, 5, '#fff');
    const f1 = (n) => (n < 1000 ? n.toFixed(1) : Math.round(n));
    P.text(k, a, `  ${f1(a)}`, C.c4, 'left', 'bottom', '600 12px ' + NUMF); P.text(k, c, `  ${f1(c)}`, C.c3, 'left', 'bottom', '600 12px ' + NUMF); P.text(k, b, `  ${f1(b)}`, C.c2, 'left', 'top', '600 12px ' + NUMF);
  });
  const etaC = LAB.canvas('#b-eta-plot', (ctx, w, h) => {
    const k = B.kappa, emax = 4.2 / k, N = 260, es = M.range(N + 1).map((i) => emax * i / N);
    const ys = [0, 1, 2].map((kind) => es.map((e) => rhoBand(kind, e, B.beta, k)));
    const lo = Math.min(...ys.flat()), ymin = Math.max(0, Math.floor((lo - 0.04) * 20) / 20);
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: emax, ymin, ymax: 1 + (1 - ymin) * 0.25, xlabel: '步长 η', ylabel: 'ρ', pad: { l: 46, r: 12, t: 10, b: 36 } }).axes();
    P.clip();
    P.hline(1, C.coral, [5, 4], 1.2);
    ys.forEach((y, kind) => P.line(es, y, COLS[kind], 2.3));
    P.vline(B.eta, C.navy, [3, 3], 1.4);
    P.vline(2 / (k + 1), C.c4, [1, 3], 1);
    P.unclip();
  });
  const verC = LAB.canvas('#b-verify', (ctx, w, h) => {
    const k = B.kappa, T = 150, hh = [1, k];
    const runs = [runMethod(0, hh, 2 / (k + 1), 0, [10, 1], T), runMethod(1, hh, B.eta, B.beta, [10, 1], T), runMethod(2, hh, B.eta, B.beta, [10, 1], T)];
    const rho = [(k - 1) / (k + 1), rhoBand(1, B.eta, B.beta, k), rhoBand(2, B.eta, B.beta, k)];
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: T, ymin: 1e-8, ymax: 1e3, logy: true, ytickValues: [1e-8, 1e-6, 1e-4, 1e-2, 1, 100], xlabel: '步数 t', ylabel: '‖θ_t‖', pad: { l: 52, r: 12, t: 10, b: 36 } }).axes();
    P.clip();
    const e0 = Math.hypot(10, 1);
    runs.forEach((r, i) => {
      P.line(M.range(T + 1), r.path.map((p) => M.clamp(Math.hypot(p[0], p[1]), 1e-12, 1e12)), COLS[i], 2.2);
      if (rho[i] < 1) P.fn((t) => e0 * Math.pow(rho[i], t), COLS[i], 1.2, [5, 4]);
    });
    P.unclip();
  });
  updB();

  /* ================= 实验 3：韦达定理看穿惯性 ================= */
  const Cc = { kind: 1, kappa: 50, eta: 0.035, beta: 0.5, lamF: 1 };
  LAB.segmented('#c-method', ['GD', '重球 HB', 'Nesterov'], 1, (i) => { Cc.kind = i; updC(); });
  const cK = LAB.slider('#c-kappa', { label: '条件数 $\\kappa$', min: 2, max: 200, step: 1, value: 50, onInput: (v) => { Cc.kappa = v; cE.setRange(0.0005, +(4.2 / v).toFixed(4), 0.0005); updC(); } });
  const cE = LAB.slider('#c-eta', { label: '步长 $\\eta$', min: 0.0005, max: 0.084, step: 0.0005, value: 0.035, fmt: (v) => v.toFixed(4), onInput: (v) => { Cc.eta = v; updC(); } });
  const cB = LAB.slider('#c-beta', { label: '惯性系数 $\\beta$', min: 0, max: 0.99, step: 0.01, value: 0.5, fmt: (v) => v.toFixed(2), onInput: (v) => { Cc.beta = v; updC(); } });
  const cL = LAB.slider('#c-lam', { label: '选中的方向 $\\lambda$（$\\lambda_{\\min}\\to\\lambda_{\\max}$）', min: 0, max: 1, step: 0.005, value: 1, fmt: (v) => fx(Math.pow(Cc.kappa, v), 2), onInput: (v) => { Cc.lamF = v; updC(); } });
  $('#c-book').onclick = () => { Object.assign(Cc, { kappa: 50, eta: 0.035, beta: 0.5 }); cK.set(50); cE.setRange(0.0005, 0.084, 0.0005); cE.set(0.035); cB.set(0.5); updC(); };
  $('#c-opt').onclick = () => { const o = optHB(Cc.kappa); Cc.eta = o.eta; Cc.beta = o.beta; cE.set(o.eta); cB.set(+o.beta.toFixed(2)); Cc.beta = +o.beta.toFixed(2); updC(); };
  const stC = [LAB.stat('#c-stats', '选中方向的 $|r|$', ''), LAB.stat('#c-stats', '判别式 $\\Delta$', 'plum'), LAB.stat('#c-stats', '所有方向最慢的 $|r|$（谱半径）', 'coral'), LAB.stat('#c-stats', '$\\sqrt\\beta$', 'leaf')];
  const lamSel = () => Math.pow(Cc.kappa, Cc.lamF);
  function updC() {
    cL.set(Cc.lamF);
    const lam = lamSel(), rs = roots(Cc.kind, Cc.eta, Cc.beta, lam), r = Math.max(...rs.map((z) => Math.hypot(z[0], z[1])));
    const b = Cc.kind === 1 ? 1 + Cc.beta - Cc.eta * lam : (1 + Cc.beta) * (1 - Cc.eta * lam), c = Cc.kind === 1 ? Cc.beta : Cc.beta * (1 - Cc.eta * lam);
    stC[0].set(`${r.toFixed(4)}<small>${r > 1 ? '发散' : ''}</small>`);
    stC[1].set(Cc.kind === 0 ? '–' : `${fx(b * b - 4 * c, 4)}<small>${b * b - 4 * c < 0 ? '欠阻尼' : '过阻尼'}</small>`);
    const sr = rhoBand(Cc.kind, Cc.eta, Cc.beta, Cc.kappa); stC[2].set(`${sr.toFixed(4)}<small>${sr > 1 ? '发散' : ''}</small>`);
    stC[3].set(Math.sqrt(Cc.beta).toFixed(4));
    plane.redraw(); timeC.redraw();
  }
  const plane = LAB.canvas('#c-plane', (ctx, w, h) => {
    const S = 1.6, side = Math.min(w, h);
    const P = new LAB.Plot(ctx, w, h, { xmin: -S, xmax: S, ymin: -S, ymax: S, xlabel: 'Re r', ylabel: 'Im r', xticks: 6, yticks: 6, pad: { l: 40 + (w - side) / 2, r: 10 + (w - side) / 2, t: 10, b: 34 } }).axes();
    P.clip();
    const circ = (rr, col, dash, lw) => { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.ellipse(P.tx(0), P.ty(0), P.tx(rr) - P.tx(0), P.ty(0) - P.ty(rr), 0, 0, 7); ctx.stroke(); ctx.restore(); };
    ctx.save(); ctx.fillStyle = 'rgba(209,73,91,.05)'; ctx.fillRect(P.x0, P.y1, P.x1 - P.x0, P.y0 - P.y1); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(P.tx(0), P.ty(0), P.tx(1) - P.tx(0), P.ty(0) - P.ty(1), 0, 0, 7); ctx.fill(); ctx.restore();
    P.hline(0, '#c9d1da', null, 1); P.vline(0, '#c9d1da', null, 1);
    circ(1, C.navy, null, 1.6);
    if (Cc.kind > 0) circ(Math.sqrt(Cc.beta), C.plum, [5, 4], 1.4);
    for (let i = 0; i <= 200; i++) {
      const f = i / 200, lam = Math.pow(Cc.kappa, f), col = LAB.mix(C.c1, C.c4, f);
      roots(Cc.kind, Cc.eta, Cc.beta, lam).forEach((z) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(P.tx(M.clamp(z[0], -1.58, 1.58)), P.ty(z[1]), 2, 0, 7); ctx.fill(); });
    }
    roots(Cc.kind, Cc.eta, Cc.beta, lamSel()).forEach((z) => P.points([M.clamp(z[0], -1.58, 1.58)], [z[1]], LAB.mix(C.c1, C.c4, Cc.lamF), 7, '#fff'));
    P.unclip();
  });
  const timeC = LAB.canvas('#c-time', (ctx, w, h) => {
    const lam = lamSel(), T = 40, xs = [1];
    let x = 1, v = 0;
    for (let t = 0; t < T; t++) {
      if (Cc.kind === 0) x = x - Cc.eta * lam * x;
      else if (Cc.kind === 1) { v = Cc.beta * v - Cc.eta * lam * x; x += v; }
      else { const q = x + Cc.beta * v; v = Cc.beta * v - Cc.eta * lam * q; x += v; }
      xs.push(x);
    }
    const r = Math.max(...roots(Cc.kind, Cc.eta, Cc.beta, lam).map((z) => Math.hypot(z[0], z[1])));
    const top = M.clamp(Math.max(1.1, ...xs.map(Math.abs).filter(isFinite)) * 1.05, 1.1, 6);
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: T, ymin: -top, ymax: top, xlabel: '步数 t', ylabel: '该方向坐标', pad: { l: 44, r: 10, t: 10, b: 34 } }).axes();
    P.clip();
    const env = M.range(T + 1).map((t) => Math.pow(r, t) * Math.max(1, Math.abs(xs[1]) / Math.max(r, 1e-9)));
    P.area(M.range(T + 1), env, '#9aa5b1', 0.12, 0); P.area(M.range(T + 1), env.map((v) => -v), '#9aa5b1', 0.12, 0);
    P.hline(0, '#c9d1da', null, 1);
    P.line(M.range(T + 1), xs.map((v) => M.clamp(v, -1e3, 1e3)), LAB.mix(C.c1, C.c4, Cc.lamF), 2.2);
    P.points(M.range(T + 1), xs.map((v) => M.clamp(v, -1e3, 1e3)), LAB.mix(C.c1, C.c4, Cc.lamF), 2.6);
    P.unclip();
    P.text(T, top * 0.9, `λ = ${fx(lam, 2)}，ηλ = ${fx(Cc.eta * lam, 3)}  `, C.ink, 'right', 'middle', '600 12px ' + NUMF);
  });
  updC();
})();
