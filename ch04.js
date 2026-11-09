/* 第 4 章：小批量噪声、宽盆地与临界批量 · 交互实验 */
(function () {
  const { COLORS: C, M } = LAB;
  LAB.page({ bookRef: '对应书中 §4.1 抽 B 道题方差除以 B · §4.2 摇晃温度 τ = η/B · §4.3 宽盆地与窄深井 · §4.4 临界批量 B_crit · §4.5 全流程手算 · 零算力实战' });
  document.querySelectorAll('.formula, [style*="overflow-x"]').forEach((f) => { f.style.width = '0'; f.style.minWidth = '100%'; });
  const $ = (s) => document.querySelector(s);
  const FONT = getComputedStyle(document.body).getPropertyValue('--font');
  const NUMF = getComputedStyle(document.body).getPropertyValue('--font-num');
  const fx = (x, d) => { if (!isFinite(x)) return '∞'; const a = Math.abs(x); if (a !== 0 && (a >= 1e5 || a < 1e-3)) return M.fmt(x, 2); return (+x.toFixed(d == null ? 3 : d)).toString(); };
  const big = (x) => (x >= 1e4 ? M.big(x) : String(Math.round(x)));
  const logTicks = (e0, e1) => { const s = Math.max(1, Math.ceil((e1 - e0) / 6)), t = []; for (let e = Math.ceil(e0 / s) * s; e <= e1; e += s) t.push(Math.pow(10, e)); return t; };

  /* ================= 实验 1：抽题越多抖得越小 ================= */
  const BOOK = [2, 4, 6, 8];
  const A = { data: 0, B: 1, eta: 0.05, k: 4, seed: 1 };
  const big1 = (() => { const R = LAB.rng(99), a = []; for (let i = 0; i < 20000; i++) a.push(5 + Math.sqrt(5) * R.normal()); const m = M.mean(a), s = M.std(a); return a.map((v) => 5 + (v - m) * Math.sqrt(5) / s); })();
  const pool = () => (A.data === 0 ? BOOK : big1);
  LAB.segmented('#b-data', ['书中题库 {2, 4, 6, 8}', '2 万道题（正态）'], 0, (i) => { A.data = i; updA(); });
  LAB.slider('#b-B', { label: '每次抽几道题 $B$（有放回）', min: 1, max: 64, step: 1, value: 1, onInput: (v) => { A.B = v; updA(); } });
  $('#b-redraw').onclick = () => { A.seed++; updA(); };
  LAB.slider('#b-eta', { label: '基准步长 $\\eta$（批量 $B$ 用上方的值）', min: 0.01, max: 0.45, step: 0.01, value: 0.05, fmt: (v) => v.toFixed(2), onInput: (v) => { A.eta = v; runA(); } });
  LAB.slider('#b-k', { label: '放大倍数 $k$', min: 1, max: 8, step: 1, value: 4, onInput: (v) => { A.k = v; runA(); } });
  let HA = null;
  const sampleMean = (R, B) => { const p = pool(); let s = 0; for (let i = 0; i < B; i++) s += p[R.int(p.length)]; return s / B; };
  const stA = [LAB.stat('#b-stats', '真实斜率 $g$（题库均值）', ''), LAB.stat('#b-stats', '单题方差 $\\sigma^2$', 'amber'), LAB.stat('#b-stats', '实测抖动方差', 'coral'), LAB.stat('#b-stats', '理论 $\\sigma^2/B$', 'leaf')];
  function updA() {
    const R = LAB.rng(A.seed * 131 + A.B), s = [];
    for (let n = 0; n < 4000; n++) s.push(sampleMean(R, A.B));
    const p = pool(), g = M.mean(p), v = M.mean(p.map((x) => (x - g) * (x - g)));
    const vB = [1, 2, 4, 8, 16, 32, 64].map((B) => { const r = LAB.rng(A.seed * 17 + B), a = []; for (let n = 0; n < 2000; n++) a.push(sampleMean(r, B)); return [B, Math.pow(M.std(a), 2)]; });
    HA = { s, g, v, vB };
    stA[0].set(fx(g, 3)); stA[1].set(fx(v, 3)); stA[2].set(fx(Math.pow(M.std(s), 2), 3)); stA[3].set(fx(v / A.B, 3));
    hist.redraw(); varC.redraw(); runA();
  }
  const hist = LAB.canvas('#b-hist', (ctx, w, h) => {
    if (!HA) return;
    const lo = 1, hi = 9, nb = 64, bw = (hi - lo) / nb, cnt = new Array(nb).fill(0);
    HA.s.forEach((x) => { const k = Math.floor((x - lo) / bw); if (k >= 0 && k < nb) cnt[k]++; });
    const dens = cnt.map((c) => c / (HA.s.length * bw)), sd = Math.sqrt(HA.v / A.B), pk = 1 / (sd * Math.sqrt(2 * Math.PI));
    const top = Math.min(Math.max(...dens, pk) * 1.12, 3.5);
    const P = new LAB.Plot(ctx, w, h, { xmin: lo, xmax: hi, ymin: 0, ymax: top, xlabel: '平均斜率 ĝ', ylabel: '密度', pad: { l: 44, r: 10, t: 10, b: 36 } }).axes();
    P.clip();
    ctx.save(); ctx.fillStyle = C.c1; ctx.globalAlpha = 0.55;
    dens.forEach((d, k) => { if (!d) return; const X0 = P.tx(lo + k * bw), X1 = P.tx(lo + (k + 1) * bw), Y = P.ty(Math.min(d, top)); ctx.fillRect(X0 + 0.3, Y, X1 - X0 - 0.6, P.y0 - Y); });
    ctx.restore();
    P.fn((x) => pk * Math.exp(-(x - HA.g) * (x - HA.g) / (2 * sd * sd)), C.navy, 1.6, [6, 4]);
    P.vline(HA.g, C.c4, [3, 3]);
    P.unclip();
  });
  const varC = LAB.canvas('#b-var', (ctx, w, h) => {
    if (!HA) return;
    const P = new LAB.Plot(ctx, w, h, { xmin: 1, xmax: 64, logx: true, logy: true, ymin: 0.03, ymax: 10, xtickValues: [1, 2, 4, 8, 16, 32, 64], xfmt: (v) => v, xlabel: '批量 B', ylabel: '方差', pad: { l: 46, r: 12, t: 10, b: 36 } }).axes();
    P.fn((B) => HA.v / B, C.c2, 2.2);
    P.points(HA.vB.map((r) => r[0]), HA.vB.map((r) => r[1]), C.c1, 4.5, '#fff');
    P.points([A.B], [HA.v / A.B], C.c4, 6.5, '#fff');
  });
  let RA = null;
  function runA() {
    if (!HA) return;
    const p = pool(), g = M.mean(p), dev = p.map((x) => x - g), sig2 = M.mean(dev.map((d) => d * d));
    const N = 200, steps1 = Math.max(80, Math.ceil(5 / A.eta)), E = steps1 * A.B, cfg = [[A.eta, A.B], [A.eta * A.k, A.B * A.k]];
    const R = LAB.rng(7);
    RA = cfg.map(([eta, B]) => {
      const steps = Math.ceil(E / B), xs = new Float64Array(N).fill(3), curve = [[0, 4.5]];
      for (let t = 1; t <= steps; t++) {
        let L = 0;
        for (let n = 0; n < N; n++) { let e = 0; for (let i = 0; i < B; i++) e += dev[R.int(dev.length)]; xs[n] = M.clamp(xs[n] - eta * (xs[n] + e / B), -1e6, 1e6); L += 0.5 * xs[n] * xs[n]; }
        curve.push([t * B, L / N]);
      }
      return { curve, plateau: eta < 2 ? 0.5 * eta * sig2 / (B * (2 - eta)) : Infinity, eta, B };
    });
    $('#b-sub').textContent = `(${fx(A.eta, 2)}, ${A.B}) vs (${fx(A.eta * A.k, 2)}, ${A.B * A.k})${A.eta * A.k >= 2 ? ' · kη ≥ 2，红线发散！' : ''}`;
    runC.redraw();
  }
  const runC = LAB.canvas('#b-run', (ctx, w, h) => {
    if (!RA) return;
    const xmax = Math.max(...RA.map((r) => r.curve[r.curve.length - 1][0]));
    const lo = Math.min(...RA.map((r) => r.plateau)) / 3, e0 = Math.floor(Math.log10(lo)), e1 = 2;
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax, ymin: Math.pow(10, e0), ymax: 100, logy: true, ytickValues: logTicks(e0, e1), xlabel: '处理过的题数（= 步数 × B）', ylabel: '平均损失', pad: { l: 52, r: 12, t: 10, b: 36 } }).axes();
    P.clip();
    const cols = [C.c1, C.c4];
    RA.forEach((r, i) => { P.line(r.curve.map((c) => c[0]), r.curve.map((c) => M.clamp(c[1], Math.pow(10, e0), 1e4)), cols[i], 2.2); if (isFinite(r.plateau)) P.hline(r.plateau, cols[i], [5, 4], 1.2); });
    P.unclip();
  });
  updA();

  /* ================= 实验 2：噪声帮你挑宽盆地 ================= */
  const Wa = 0.15, Wb = 1.3, K0 = 0.02, LN = 1 / (Wa * Wa), LW = 1 / (Wb * Wb) - 0 + 2 * K0, H0 = 0.3;
  const fW = (x) => -Math.exp(-(x + 2) * (x + 2) / (2 * Wa * Wa)) - Math.exp(-(x - 2) * (x - 2) / (2 * Wb * Wb)) + K0 * x * x;
  const gW = (x) => { const u = x + 2, v = x - 2; return u / (Wa * Wa) * Math.exp(-u * u / (2 * Wa * Wa)) + v / (Wb * Wb) * Math.exp(-v * v / (2 * Wb * Wb)) + 2 * K0 * x; };
  const hW = (x) => { const u = x + 2, v = x - 2; return LN * Math.exp(-u * u / (2 * Wa * Wa)) + (1 / (Wb * Wb)) * Math.exp(-v * v / (2 * Wb * Wb)) + H0; };
  // 书中 30 行脚本的地形：g = 25(x+2)e^{−35(x+2)²} + 0.3(x−2)，对应 f = −(25/70)e^{−35(x+2)²} + 0.15(x−2)²，抽题抖动为加性噪声 σ/√B
  const fBk = (x) => -(25 / 70) * Math.exp(-35 * (x + 2) * (x + 2)) + 0.15 * (x - 2) * (x - 2);
  const gBk = (x) => 25 * (x + 2) * Math.exp(-35 * (x + 2) * (x + 2)) + 0.3 * (x - 2);
  const LANDS = [
    { f: fW, g: gW, nz: (x) => Math.sqrt(hW(x)), yr: [-1.25, 0.65], eta: [0.005, 0.042, 0.001], def: { eta: 0.03, B: 1, s: 1, T: 1500 }, x0: -2 },
    { f: fBk, g: gBk, nz: () => 1, yr: [-0.5, 3.4], eta: [0.01, 0.3, 0.01], def: { eta: 0.15, B: 4, s: 1.2, T: 80 }, x0: -1.98 },
  ];
  const W = { land: 0, eta: 0.03, B: 1, s: 1, start: 0, T: 1500, t: 0, xs: null, frac: [], running: false, sweep: null };
  const Ld = () => LANDS[W.land];
  const NP = 300;
  LAB.segmented('#w-land-sel', ['实验室双坑（噪声随陡峭度放大）', '书中 30 行脚本'], 0, (i) => {
    W.land = i; const L = Ld(); Object.assign(W, L.def); W.sweep = null;
    wEta.setRange(L.eta[0], L.eta[1], L.eta[2]); wEta.set(W.eta); wB.set(W.B); wS.set(W.s); setRun(false); resetW(); sweepC.redraw();
  });
  const wEta = LAB.slider('#w-eta', { label: '步长 $\\eta$', min: 0.005, max: 0.042, step: 0.001, value: 0.03, fmt: (v) => v.toFixed(3), onInput: (v) => { W.eta = v; resetW(); } });
  const wB = LAB.slider('#w-B', { label: '批量 $B$', min: 1, max: 64, step: 1, value: 1, onInput: (v) => { W.B = v; resetW(); } });
  const wS = LAB.slider('#w-s', { label: '题目之间的差异 $\\sigma_0$（书中脚本 $\\sigma=1.2$）', min: 0.2, max: 2, step: 0.05, value: 1, fmt: (v) => v.toFixed(2), onInput: (v) => { W.s = v; resetW(); } });
  LAB.segmented('#w-start', ['从窄深井出发', '从宽盆地出发', '均匀撒在两坑之间'], 0, (i) => { W.start = i; resetW(); });
  const runBtn = $('#w-run');
  let RW = LAB.rng(5);
  function resetW() {
    RW = LAB.rng(5); W.t = 0; W.frac = [];
    W.xs = new Float64Array(NP).map((_, i) => (W.start === 0 ? Ld().x0 : W.start === 1 ? 2 : -3 + 6 * (i + 0.5) / NP));
    recordW(); land.redraw(); fracC.redraw(); statsW();
  }
  const fracOf = () => { let wi = 0, na = 0; W.xs.forEach((x) => { if (x > 0) wi++; if (Math.abs(x + 2) < 0.5) na++; }); return [wi / NP, na / NP]; };
  function recordW() { W.frac.push([W.t, ...fracOf()]); }
  const sgdStep = (x, R, sq) => { const L = Ld(); return x - W.eta * (L.g(x) + W.s * L.nz(x) * R.normal() / sq); };
  function stepW(n) {
    const sq = Math.sqrt(W.B);
    for (let k = 0; k < n && W.t < W.T; k++) {
      for (let p = 0; p < NP; p++) W.xs[p] = sgdStep(W.xs[p], RW, sq);
      W.t++; if (W.t % Math.max(1, Math.round(W.T / 300)) === 0) recordW();
    }
  }
  function setRun(on) { W.running = on; runBtn.textContent = on ? '⏸ 暂停' : (W.t >= W.T ? '↻ 重新开始' : '▶ 开始'); if (on) requestAnimationFrame(loopW); }
  function loopW() { if (!W.running) return; stepW(W.land ? 1 : 15); land.redraw(); fracC.redraw(); statsW(); if (W.t >= W.T) { setRun(false); return; } requestAnimationFrame(loopW); }
  runBtn.onclick = () => { if (W.running) setRun(false); else { if (W.t >= W.T) resetW(); setRun(true); } };
  const stW = [LAB.stat('#w-stats', '摇晃温度 $\\tau=\\eta/B$', ''), LAB.stat('#w-stats', '落在宽盆地', 'leaf'), LAB.stat('#w-stats', '困在窄深井', 'coral'), LAB.stat('#w-stats', '坑底晃动幅度（理论）', 'amber')];
  function statsW() {
    const [wi, na] = fracOf();
    stW[0].set(fx(W.eta / W.B, 4)); stW[1].set((wi * 100).toFixed(0) + '%'); stW[2].set((na * 100).toFixed(0) + '%');
    if (W.land === 0) {
      stW[3].el.querySelector('.label').textContent = '坑底晃动幅度（理论）';
      stW[3].set(`${fx(Math.sqrt(W.eta * W.s * W.s / (W.B * (2 - W.eta * LN))), 3)}<small>井口半宽 ${Wa}</small>`);
    } else { // 无噪声 GD 走同样的步数
      let x = Ld().x0; for (let t = 0; t < W.T; t++) x -= W.eta * gBk(x);
      stW[3].el.querySelector('.label').textContent = `无噪声 GD 走 ${W.T} 步的落点`;
      stW[3].set(`${x >= 0 ? '+' : '−'}${fx(Math.abs(x), 3)}<small>${Math.abs(x + 2) < 0.5 ? '困在窄深井' : '离开了窄井'}</small>`);
    }
    $('#w-step').textContent = `第 ${W.t} / ${W.T} 步`;
  }
  const land = LAB.canvas('#w-land', (ctx, w, h) => {
    if (!W.xs) return;
    const L = Ld(), [y0, y1] = L.yr, span = y1 - y0;
    const P = new LAB.Plot(ctx, w, h, { xmin: -3.5, xmax: 4.5, ymin: y0, ymax: y1, xlabel: 'x', ylabel: 'f(x)', pad: { l: 46, r: 12, t: 10, b: 36 } }).axes();
    P.clip();
    const nb = 80, bw = 8 / nb, cnt = new Array(nb).fill(0);
    W.xs.forEach((x) => { const k = Math.floor((x + 3.5) / bw); if (k >= 0 && k < nb) cnt[k]++; });
    const mx = Math.max(...cnt, 1);
    ctx.save();
    cnt.forEach((c, k) => { if (!c) return; const X0 = P.tx(-3.5 + k * bw), X1 = P.tx(-3.5 + (k + 1) * bw), top = P.ty(y0 + 0.4 * span * c / mx); ctx.fillStyle = -3.5 + (k + 0.5) * bw > 0 ? 'rgba(47,143,91,.55)' : 'rgba(209,73,91,.5)'; ctx.fillRect(X0 + 0.5, top, X1 - X0 - 1, P.y0 - top); });
    ctx.restore();
    P.fn(L.f, C.navy, 2.4, null, 800);
    P.unclip();
    P.text(-2, y1 - 0.1 * span, '窄深井', C.c4, 'center', 'middle', '600 13px ' + FONT);
    P.text(2, y1 - 0.1 * span, '宽盆地', C.c3, 'center', 'middle', '600 13px ' + FONT);
  });
  const fracC = LAB.canvas('#w-frac', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: W.T, ymin: 0, ymax: 1.02, yfmt: (v) => Math.round(v * 100) + '%', xlabel: '步数 t', pad: { l: 46, r: 12, t: 10, b: 36 } }).axes();
    if (!W.frac.length) return;
    P.line(W.frac.map((r) => r[0]), W.frac.map((r) => r[1]), C.c3, 2.4);
    P.line(W.frac.map((r) => r[0]), W.frac.map((r) => r[2]), C.c4, 2.4);
  });
  $('#w-sweep').onclick = () => {
    const Bs = [1, 2, 3, 4, 6, 8, 16], R = LAB.rng(11), out = [];
    Bs.forEach((B) => {
      const xs = new Float64Array(150).fill(Ld().x0), sq = Math.sqrt(B);
      for (let t = 0; t < W.T; t++) for (let p = 0; p < 150; p++) xs[p] = sgdStep(xs[p], R, sq);
      out.push([W.eta / B, xs.filter((x) => x > 0).length / 150, B]);
    });
    W.sweep = out; sweepC.redraw();
  };
  const sweepC = LAB.canvas('#w-sweep-plot', (ctx, w, h) => {
    const lo = W.sweep ? Math.min(...W.sweep.map((r) => r[0])) / 1.6 : 0.001, hi = W.sweep ? Math.max(...W.sweep.map((r) => r[0])) * 1.6 : 0.05;
    const P = new LAB.Plot(ctx, w, h, { xmin: lo, xmax: hi, logx: true, ymin: 0, ymax: 1.08, yfmt: (v) => Math.round(v * 100) + '%', xfmt: (v) => +v.toPrecision(2), xlabel: '摇晃温度 τ = η/B', pad: { l: 46, r: 12, t: 12, b: 36 } }).axes();
    if (!W.sweep) { P.text(Math.sqrt(lo * hi), 0.55, '点左侧“扫描批量 B”开始计算', C.slate, 'center', 'middle', '13px ' + FONT); return; }
    const s = W.sweep;
    P.line(s.map((r) => r[0]), s.map((r) => r[1]), C.c2, 2.2); P.points(s.map((r) => r[0]), s.map((r) => r[1]), C.c2, 4.5, '#fff');
    s.forEach((r) => P.text(r[0], r[1], `B=${r[2]}`, C.ink, 'center', 'bottom', '11px ' + NUMF));
  });
  // 考场偏移：书中数字 + 本实验地形
  LAB.slider('#w-shift', { label: '考场上山谷偏移 $\\Delta x$', min: 0.005, max: 0.2, step: 0.005, value: 0.02, fmt: (v) => v.toFixed(3), onInput: (v) => shiftOut(v) });
  function shiftOut(d) {
    const row = (name, L, wd, col) => `<tr><td><b style="color:${col}">${name}</b></td><td class="num">${fx(L, 4)}</td><td class="num">${wd}</td><td class="num"><b>${fx(0.5 * L * d * d, 6)}</b></td></tr>`;
    $('#w-shift-out').innerHTML = `<table class="data"><thead><tr><th>坑</th><th>陡峭度 ${LAB.tex('L')}</th><th>半宽</th><th>海拔上涨 ${LAB.tex('\\tfrac12L(\\Delta x)^2')}</th></tr></thead><tbody>
      ${row('书中 1 号宽盆地', 0.08, '5 米', C.c3)}${row('书中 2 号窄深井', 20000, '0.01 米', C.c4)}${row('本实验宽盆地', LW, fx(Wb, 2), C.c3)}${row('本实验窄深井', LN, fx(Wa, 2), C.c4)}</tbody></table>
      <div class="caption">只看谷底的二次近似。$\\Delta x=0.02$ 时，书中宽盆地只涨 $0.000016$，窄深井暴涨 $4.0$。</div>`;
    LAB.renderMath($('#w-shift-out'));
  }
  shiftOut(0.02); resetW();
  sweepC.redraw();

  /* ================= 实验 3：临界批量算力账本 ================= */
  const Cc = { x: 5, sig: 5, B: 1, lgs: 0, k: 2 };
  LAB.slider('#c-x', { label: '当前位置 $x$（真实斜率 $g=x$）', min: 0.1, max: 6, step: 0.05, value: 5, fmt: (v) => v.toFixed(2), onInput: (v) => { Cc.x = v; updC1(); } });
  LAB.slider('#c-sig', { label: '单题方差 $\\sigma^2$', min: 0.5, max: 20, step: 0.5, value: 5, fmt: (v) => v.toFixed(1), onInput: (v) => { Cc.sig = v; updC1(); } });
  LAB.slider('#c-B', { label: '批量 $B$（对数刻度）', min: 0, max: 10, step: 0.1, value: 0, fmt: (v) => fx(Math.round(Math.pow(2, v)), 0), onInput: (v) => { Cc.B = Math.round(Math.pow(2, v)); updC1(); } });
  LAB.slider('#c-noise', { label: '噪声强度 $s$（$\\boldsymbol\\Sigma=s\\,\\mathbf H$）', min: -2, max: 1, step: 0.05, value: 0, fmt: (v) => fx(Math.pow(10, v), 3), onInput: (v) => { Cc.lgs = v; updC2(); } });
  LAB.slider('#c-target', { label: '目标：损失降到原来的 $10^{-k}$', min: 1, max: 3, step: 0.5, value: 2, fmt: (v) => 'k = ' + v, onInput: (v) => { Cc.k = v; updC2(); } });
  const bc = () => Cc.sig / (Cc.x * Cc.x);
  const etaS = (B) => 1 / (1 + bc() / B), dropS = (B) => Cc.x * Cc.x / (2 * (1 + bc() / B));
  const stC = [LAB.stat('#c-stats', '临界批量 $B_{\\text{crit}}=\\sigma^2/g^2$', 'coral'), LAB.stat('#c-stats', '当前 $B$ 的最优步长 $\\eta^*$', ''), LAB.stat('#c-stats', '这一步能降多少', 'leaf'), LAB.stat('#c-stats', '全程：$B_{\\text{crit}}\\approx E_{\\min}/S_{\\min}$', 'amber')];
  function updC1() {
    stC[0].set(fx(bc(), 3)); stC[1].set(`${fx(etaS(Cc.B), 4)}<small>B = ${Cc.B}</small>`);
    stC[2].set(`${fx(dropS(Cc.B), 4)}<small>每道题 ${fx(dropS(Cc.B) / Cc.B, 4)}</small>`);
    stepC.redraw(); etaC.redraw();
  }
  const stepC = LAB.canvas('#c-step', (ctx, w, h) => {
    const top = Cc.x * Cc.x / 2, lo = Math.min(dropS(1) / 1024, top) / 3, e0 = Math.floor(Math.log10(lo)), e1 = Math.ceil(Math.log10(top * 1.5));
    const P = new LAB.Plot(ctx, w, h, { xmin: 1, xmax: 1024, logx: true, logy: true, ymin: Math.pow(10, e0), ymax: Math.pow(10, e1), xtickValues: [1, 4, 16, 64, 256, 1024], xfmt: (v) => v, ytickValues: logTicks(e0, e1), xlabel: '批量 B', pad: { l: 52, r: 12, t: 10, b: 36 } }).axes();
    P.clip();
    P.fn(dropS, C.c1, 2.4); P.fn((B) => dropS(B) / B, C.c2, 2, [6, 4]);
    if (bc() >= 1 && bc() <= 1024) P.vline(bc(), C.c4, [3, 3], 1.4);
    P.points([Cc.B, Cc.B], [dropS(Cc.B), dropS(Cc.B) / Cc.B], C.navy, 5, '#fff');
    P.unclip();
  });
  const etaC = LAB.canvas('#c-eta', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: 1, xmax: 1024, logx: true, ymin: 0, ymax: 1.08, xtickValues: [1, 4, 16, 64, 256, 1024], xfmt: (v) => v, xlabel: '批量 B', ylabel: 'η*', pad: { l: 46, r: 12, t: 10, b: 36 } }).axes();
    P.clip();
    P.hline(1, C.slate, [4, 4], 1); P.fn(etaS, C.c2, 2.4);
    if (bc() >= 1 && bc() <= 1024) { P.vline(bc(), C.c4, [3, 3], 1.4); P.text(bc(), 0.1, ' B_crit', C.c4, 'left', 'middle', '600 12px ' + NUMF); }
    P.points([Cc.B], [etaS(Cc.B)], C.navy, 5, '#fff');
    P.unclip();
  });
  // 全程：d=40 维对角二次山谷，λ 铺满 [0.01,1]，Σ = s·H；每步取使期望损失最小的 η
  let RC = null;
  function runFull(B, s, k) {
    const d = 40, lam = M.range(d).map((i) => Math.pow(10, -2 + 2 * i / (d - 1))), m = new Float64Array(d).fill(1);
    let L0 = 0; for (let i = 0; i < d; i++) L0 += 0.5 * lam[i]; const tgt = L0 * Math.pow(10, -k);
    let L = L0, S = 0;
    while (L > tgt && S < 400000) {
      let a = 0, b = 0; for (let i = 0; i < d; i++) { const l2 = lam[i] * lam[i]; a += l2 * m[i]; b += l2 * lam[i] * m[i] + l2 * s / B; }
      const eta = a / b; L = 0; for (let i = 0; i < d; i++) { const r = 1 - eta * lam[i]; m[i] = r * r * m[i] + eta * eta * s * lam[i] / B; L += 0.5 * lam[i] * m[i]; }
      S++;
    }
    return S;
  }
  function updC2() {
    const s = Math.pow(10, Cc.lgs), rows = M.range(15).map((e) => { const B = Math.pow(2, e), S = runFull(B, s, Cc.k); return { B, S, E: B * S }; });
    const Smin = Math.min(...rows.map((r) => r.S)), Emin = Math.min(...rows.map((r) => r.E));
    RC = { rows, Smin, Emin, Bc: Emin / Smin };
    stC[3].set(`${fx(RC.Bc, 1)}<small>S_min = ${Smin}，E_min = ${big(Emin)}</small>`);
    $('#c-sub').textContent = `s = ${fx(s, 3)}，目标 10⁻${Cc.k}`;
    tradeC.redraw();
  }
  const tradeC = LAB.canvas('#c-tradeoff', (ctx, w, h) => {
    if (!RC) return;
    const { rows, Smin, Emin } = RC;
    const ex0 = Math.floor(Math.log10(Emin)) - 0.2, ex1 = Math.ceil(Math.log10(Math.max(...rows.map((r) => r.E)))) + 0.1;
    const ey0 = Math.floor(Math.log10(Smin)) - 0.2, ey1 = Math.ceil(Math.log10(Math.max(...rows.map((r) => r.S)))) + 0.1;
    const P = new LAB.Plot(ctx, w, h, { xmin: Math.pow(10, ex0), xmax: Math.pow(10, ex1), ymin: Math.pow(10, ey0), ymax: Math.pow(10, ey1), logx: true, logy: true, xtickValues: logTicks(Math.ceil(ex0), Math.floor(ex1)), ytickValues: logTicks(Math.ceil(ey0), Math.floor(ey1)), xlabel: '总题量 E = B·S（算力）', ylabel: '步数 S（时间）', pad: { l: 56, r: 16, t: 12, b: 38 } }).axes();
    P.clip();
    const xs = [], ys = []; for (let i = 1; i <= 300; i++) { const u = Math.pow(10, -3 + 6 * i / 300); xs.push(Emin * (1 + u)); ys.push(Smin * (1 + 1 / u)); }
    P.line(xs, ys, C.c4, 1.8, [6, 4]);
    P.line(rows.map((r) => r.E), rows.map((r) => r.S), C.c1, 2.2); P.points(rows.map((r) => r.E), rows.map((r) => r.S), C.c1, 4, '#fff');
    rows.forEach((r, i) => { if (i % 2 === 0) P.text(r.E, r.S, ` B=${r.B}`, C.ink, 'left', 'bottom', '11px ' + NUMF); });
    const star = rows.reduce((best, r) => (Math.abs(Math.log(r.B / RC.Bc)) < Math.abs(Math.log(best.B / RC.Bc)) ? r : best), rows[0]);
    P.text(star.E, star.S, '★', C.amber, 'center', 'middle', '20px ' + FONT);
    P.unclip();
  });
  updC1(); updC2();
})();
