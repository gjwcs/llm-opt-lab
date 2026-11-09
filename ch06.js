/* 第 6 章：为什么 Transformer 上 SGD 败给了 Adam · 交互实验 */
(function () {
  const { COLORS: C, M } = LAB;
  LAB.page({ bookRef: '对应书中 §6.1 重尾斜率与词频长尾 · §6.2 注意力指数悬崖与 (L₀, L₁) 光滑 · §6.3 分块海森异质性 · §6.4 组合题手算 · 零算力实战' });
  document.querySelectorAll('.formula, [style*="overflow-x"]').forEach((f) => { f.style.width = '0'; f.style.minWidth = '100%'; });
  const $ = (s) => document.querySelector(s);
  const FONT = getComputedStyle(document.body).getPropertyValue('--font');
  const NUMF = getComputedStyle(document.body).getPropertyValue('--font-num');
  const fx = (x, d) => { if (!isFinite(x)) return '∞'; const a = Math.abs(x); if (a !== 0 && (a >= 1e5 || a < 1e-3)) return M.fmt(x, 2); return (+x.toFixed(d == null ? 3 : d)).toString(); };
  const sgn = (x, d) => (x < 0 ? '−' : '') + fx(Math.abs(x), d);
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = (e) => String(e).split('').map((c) => SUP[c] || c).join('');
  const logTicks = (e0, e1) => { const s = Math.max(1, Math.ceil((e1 - e0) / 6)), t = []; for (let e = Math.ceil(e0 / s) * s; e <= e1; e += s) t.push(Math.pow(10, e)); return t; };
  const pfmt = (v) => (v >= 1000 ? '10' + sup(Math.round(Math.log10(v))) : v);

  /* ================= 实验 1：怪兽斜率与生僻词 ================= */
  const T1 = { dist: 1, alpha: 1.3, spike: 1000, eta: 0.01, seed: 1, lgV: 5, T: 1000 };
  LAB.segmented('#t-dist', ['身高型（正态）', '词频型（重尾）'], 1, (i) => { T1.dist = i; $('#t-alpha').style.display = i ? '' : 'none'; updT(); });
  LAB.slider('#t-alpha', { label: '重尾指数 $\\alpha$（越小尾巴越重）', min: 1.05, max: 3, step: 0.05, value: 1.3, fmt: (v) => v.toFixed(2), onInput: (v) => { T1.alpha = v; updT(); } });
  LAB.slider('#t-spike', { label: '第 150 步的怪兽斜率', min: 1, max: 10000, step: 1, value: 1000, onInput: (v) => { T1.spike = v; updT(); } });
  LAB.slider('#t-eta', { label: '步长 $\\eta$', min: 0.001, max: 0.1, step: 0.001, value: 0.01, fmt: (v) => v.toFixed(3), onInput: (v) => { T1.eta = v; updT(); updBook(); } });
  $('#t-resample').onclick = () => { T1.seed++; updT(); };
  LAB.slider('#t-V', { label: '词表大小 $V$', min: 2, max: 5, step: 0.25, value: 5, fmt: (v) => Math.round(Math.pow(10, v)).toLocaleString(), onInput: (v) => { T1.lgV = v; updZ(); } });
  LAB.slider('#t-T', { label: '训练步数 $T$', min: 100, max: 3000, step: 100, value: 1000, onInput: (v) => { T1.T = v; updZ(); } });
  let RT = null;
  function updT() {
    const R = LAB.rng(T1.seed * 71), N = 300, g = [];
    for (let t = 1; t <= N; t++) {
      let x = T1.dist === 0 ? 1 + 0.1 * R.normal() : Math.pow(1 - R(), -1 / T1.alpha) / (T1.alpha / (T1.alpha - 1));
      if (t === 150) x = T1.spike;
      g.push(x);
    }
    let m = 0, v = 0; const sS = [], sA = [];
    g.forEach((x, i) => { const t = i + 1; m = 0.9 * m + 0.1 * x; v = 0.99 * v + 0.01 * x * x; sS.push(T1.eta * Math.abs(x)); sA.push(T1.eta * Math.abs(m / (1 - Math.pow(0.9, t))) / Math.sqrt(v / (1 - Math.pow(0.99, t)))); });
    RT = { g, sS, sA };
    stT[0].set(fx(Math.max(...g) / M.mean(g.slice().sort((a, b) => a - b).slice(100, 200)), 0) + '<small>倍中位数</small>');
    stT[1].set(`${fx(sS[149], 3)}<small>vs 平时 ${fx(T1.eta, 3)}</small>`); stT[2].set(fx(sA[149], 4));
    stT[3].set(`${fx(Math.max(...sS) / Math.min(...sS), 0)}<small>vs Adam ${fx(Math.max(...sA.slice(5)) / Math.min(...sA.slice(5)), 1)}</small>`);
    $('#t-sub').textContent = T1.dist ? `帕累托分布，α = ${T1.alpha.toFixed(2)}` : '正态分布 1 ± 0.1';
    trace.redraw(); stepsC.redraw();
  }
  const stT = [LAB.stat('#t-stats', '最大斜率', 'coral'), LAB.stat('#t-stats', '第 150 步 SGD 迈出', 'plum'), LAB.stat('#t-stats', '第 150 步 Adam 迈出', 'leaf'), LAB.stat('#t-stats', '步长最大/最小之比：SGD', 'amber')];
  const tracePlot = (ctx, w, h, series, cols, ylabel) => {
    const all = series.flat().filter((v) => v > 0), lo = Math.floor(Math.log10(Math.min(...all))), hi = Math.ceil(Math.log10(Math.max(...all)) + 0.1);
    const P = new LAB.Plot(ctx, w, h, { xmin: 1, xmax: 300, ymin: Math.pow(10, lo), ymax: Math.pow(10, hi), logy: true, ytickValues: logTicks(lo, hi), xlabel: '步数 t', ylabel, pad: { l: 52, r: 12, t: 10, b: 36 } }).axes();
    P.clip(); series.forEach((s, i) => P.line(M.range(s.length).map((k) => k + 1), s, cols[i], 1.6)); P.vline(150, C.slate, [3, 3], 1); P.unclip();
    return P;
  };
  const trace = LAB.canvas('#t-trace', (ctx, w, h) => { if (RT) tracePlot(ctx, w, h, [RT.g], [C.c4], '|g_t|'); });
  const stepsC = LAB.canvas('#t-steps', (ctx, w, h) => { if (RT) { const P = tracePlot(ctx, w, h, [RT.sS, RT.sA], [C.c5, C.c3], '|Δw_t|'); P.hline(T1.eta, C.slate, [5, 4], 1); } });
  // 词表长尾
  let RZ = null;
  function updZ() {
    const V = Math.round(Math.pow(10, T1.lgV)); let H = 0; for (let k = 1; k <= V; k++) H += 1 / k;
    const p = (k) => 1 / (k * H), etaS = 1 / p(1), etaA = 0.01;
    const ks = []; for (let i = 0; i <= 120; i++) { const k = Math.round(Math.pow(V, i / 120)); if (!ks.length || k !== ks[ks.length - 1]) ks.push(k); }
    const sgd = ks.map((k) => Math.pow(1 - etaS * p(k), T1.T));
    const adam = ks.map((k) => { let w = 1, m = 0, v = 0; const pk = p(k); for (let t = 1; t <= T1.T; t++) { const g = pk * w; m = 0.9 * m + 0.1 * g; v = 0.999 * v + 0.001 * g * g; w -= etaA * (m / (1 - Math.pow(0.9, t))) / (Math.sqrt(v / (1 - Math.pow(0.999, t))) + 1e-30); } return Math.abs(w); });
    RZ = { V, ks, sgd, adam, step: ks.map((k) => etaS * p(k)) };
    const learned = ks.filter((k, i) => sgd[i] < 0.5); const kmax = learned.length ? learned[learned.length - 1] : 0;
    $('#t-sub2').textContent = `V = ${V.toLocaleString()}，T = ${T1.T}：SGD 只把前约 ${kmax.toLocaleString()} 名词推过半程`;
    zipf.redraw();
  }
  const zipf = LAB.canvas('#t-zipf', (ctx, w, h) => {
    if (!RZ) return;
    const P = new LAB.Plot(ctx, w, h, { xmin: 1, xmax: RZ.V, logx: true, ymin: 0, ymax: 1.08, xtickValues: logTicks(0, Math.round(Math.log10(RZ.V))), xfmt: pfmt, yfmt: (v) => Math.round(v * 100) + '%', xlabel: '词的排名 k（越右越生僻）', ylabel: '学会的程度 1−|w_k|', pad: { l: 50, r: 12, t: 10, b: 36 } }).axes();
    P.clip();
    P.line(RZ.ks, RZ.step.map((v) => M.clamp(v, 0, 1.1)), C.slate, 1.3, [5, 4]);
    P.line(RZ.ks, RZ.sgd.map((v) => M.clamp(1 - v, 0, 1.1)), C.c5, 2.6);
    P.line(RZ.ks, RZ.adam.map((v) => M.clamp(1 - v, 0, 1.1)), C.c3, 2.6);
    P.unclip();
  });
  function updBook() {
    const e = T1.eta, E6 = 403.4, g3 = 3 * E6, m3 = 0.9 * 1 + 0.1 * 500, v3 = Math.sqrt(0.99 * 1 + 0.01 * 500 * 500);
    const rows = [['旋钮 1：第 10000 名生僻词', 1e-4, e * 1e-4, e * 1e-4 / 1e-4, '分子分母都是 0.0001'],
      ['旋钮 2：注意力指数层 e^{3w}，w = 2', g3, e * g3, e, `按书中取 e⁶ ≈ 403.4：斜率 3e⁶ ≈ ${fx(g3, 1)}，弯曲度 9e⁶ ≈ ${fx(9 * E6, 1)}`],
      ['旋钮 3：突发大斜率', 500, e * 500, e * m3 / v3, `m = 0.9×1 + 0.1×500 = ${fx(m3, 1)}，√v = ${fx(v3, 2)}`]];
    $('#t-book').innerHTML = `<thead><tr><th>旋钮</th><th>斜率 g</th><th>SGD 一步 ${LAB.tex('-\\eta g')}</th><th>Adam 一步</th><th>说明</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td class="num">${fx(r[1], 4)}</td><td class="num" style="color:${C.plum}"><b>−${fx(r[2], 4)}</b></td><td class="num" style="color:${C.leaf}"><b>−${fx(r[3], 4)}</b></td><td class="small muted">${r[4]}</td></tr>`).join('')}</tbody>`;
  }
  updT(); updZ(); updBook();

  /* ================= 实验 2：注意力指数悬崖 ================= */
  const Cf = { a: 2, w0: 2.5, gd: 0.02, adam: 0.1, T: 150 };
  LAB.slider('#c-a', { label: '悬崖陡度 $a$', min: 1, max: 3, step: 0.1, value: 2, fmt: (v) => v.toFixed(1), onInput: (v) => { Cf.a = v; updC(); } });
  LAB.slider('#c-w0', { label: '出发点 $w_0$', min: 0.5, max: 3, step: 0.05, value: 2.5, fmt: (v) => v.toFixed(2), onInput: (v) => { Cf.w0 = v; updC(); } });
  LAB.slider('#c-gd', { label: '固定步长 GD 的 $\\eta$', min: 0.001, max: 0.05, step: 0.001, value: 0.02, fmt: (v) => v.toFixed(3), onInput: (v) => { Cf.gd = v; updC(); } });
  LAB.slider('#c-adam', { label: 'Adam 的 $\\eta$', min: 0.01, max: 0.5, step: 0.01, value: 0.1, fmt: (v) => v.toFixed(2), onInput: (v) => { Cf.adam = v; updC(); } });
  LAB.slider('#c-T', { label: '总步数', min: 20, max: 400, step: 10, value: 150, onInput: (v) => { Cf.T = v; updC(); } });
  const fC = (w) => Math.exp(Cf.a * w) + Math.exp(-Cf.a * w), gC = (w) => Cf.a * (Math.exp(Cf.a * w) - Math.exp(-Cf.a * w)), hC = (w) => Cf.a * Cf.a * fC(w);
  const RUN = [{ n: '固定步长 GD', col: C.c5, cls: 'plum' }, { n: '安全步长 GD', col: C.c2, cls: 'amber' }, { n: 'Adam', col: C.c3, cls: 'leaf' }];
  let RC = null;
  function updC() {
    const L0 = 2 * Cf.a * Cf.a, L1 = Cf.a, out = [[Cf.w0], [Cf.w0], [Cf.w0]];
    let w = Cf.w0; for (let t = 0; t < Cf.T; t++) { w = w - Cf.gd * gC(w); if (!isFinite(w) || Math.abs(w) > 50) w = NaN; out[0].push(w); }
    w = Cf.w0; for (let t = 0; t < Cf.T; t++) { const g = gC(w); w = w - g / (L0 + L1 * Math.abs(g)); out[1].push(w); }
    w = Cf.w0; let m = 0, v = 0; for (let t = 1; t <= Cf.T; t++) { const g = gC(w); m = 0.9 * m + 0.1 * g; v = 0.99 * v + 0.01 * g * g; w = w - Cf.adam * (m / (1 - Math.pow(0.9, t))) / (Math.sqrt(v / (1 - Math.pow(0.99, t))) + 1e-12); out[2].push(w); }
    RC = out;
    out.forEach((r, i) => { const x = r[r.length - 1]; const dead = r.findIndex((y) => !isFinite(y)); stC[i].set(dead >= 0 ? `第 ${dead} 步炸飞` : fx(Math.abs(x), 4)); });
    stC[3].set(`${fx(2 / hC(Cf.w0), 4)}<small>谷底处 ${fx(2 / hC(0), 3)}</small>`);
    land.redraw(); dist.redraw(); l0l1.redraw();
  }
  const stC = [LAB.stat('#c-stats', '固定步长 GD：最终 $|w|$', 'plum'), LAB.stat('#c-stats', '安全步长 GD：最终 $|w|$', 'amber'), LAB.stat('#c-stats', 'Adam：最终 $|w|$', 'leaf'), LAB.stat('#c-stats', '出发点的生死线 $2/f\'\'(w_0)$', 'coral')];
  const land = LAB.canvas('#c-land', (ctx, w, h) => {
    if (!RC) return;
    const R = 3.2, top = fC(R), side = Math.min(w, h);
    const P = new LAB.Plot(ctx, w, h, { xmin: -R, xmax: R, ymin: 1, ymax: top, logy: true, ytickValues: logTicks(0, Math.floor(Math.log10(top))), xlabel: 'w', ylabel: 'f(w)', pad: { l: 50 + (w - side) / 4, r: 10 + (w - side) / 4, t: 10, b: 36 } }).axes();
    P.clip(); P.fn(fC, C.navy, 2.4, null, 400);
    RC.forEach((r, i) => {
      const pts = r.slice(0, 13);
      pts.forEach((x, k) => {
        if (!isFinite(x)) return;
        const out = Math.abs(x) > R * 0.98, xc = M.clamp(x, -R * 0.98, R * 0.98), y = Math.min(fC(xc), top * 0.9);
        ctx.save(); ctx.globalAlpha = 0.35 + 0.65 * (1 - k / 13); ctx.fillStyle = RUN[i].col; ctx.beginPath(); ctx.arc(P.tx(xc), P.ty(y), k === 0 ? 6 : 4, 0, 7); ctx.fill(); ctx.restore();
        if (out) P.text(xc, y, ` w=${sgn(x, 1)}`, RUN[i].col, xc > 0 ? 'right' : 'left', 'top', '600 11px ' + NUMF);
      });
    });
    P.unclip();
  });
  const dist = LAB.canvas('#c-dist', (ctx, w, h) => {
    if (!RC) return;
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: Cf.T, ymin: 1e-6, ymax: 100, logy: true, ytickValues: logTicks(-6, 2), xlabel: '步数 t', ylabel: '|w_t|', pad: { l: 50, r: 10, t: 10, b: 36 } }).axes();
    P.clip();
    RC.forEach((r, i) => { const n = r.findIndex((x) => !isFinite(x)); const rr = n >= 0 ? r.slice(0, n) : r; P.line(M.range(rr.length), rr.map((x) => M.clamp(Math.abs(x), 1e-6, 1e3)), RUN[i].col, 2.2); if (n >= 0) P.text(n - 1, 50, ' ✕ 炸飞', RUN[i].col, 'left', 'middle', '600 12px ' + FONT); });
    P.unclip();
  });
  const l0l1 = LAB.canvas('#c-l0l1', (ctx, w, h) => {
    const L0 = 2 * Cf.a * Cf.a, L1 = Cf.a, ws = M.linspace(-3, 3, 121), gs = ws.map((x) => Math.max(Math.abs(gC(x)), 1e-3)), hs = ws.map(hC);
    const gmax = Math.max(...gs), e1 = Math.ceil(Math.log10(gmax)), e2 = Math.ceil(Math.log10(Math.max(...hs) * 1.3));
    const P = new LAB.Plot(ctx, w, h, { xmin: 1e-2, xmax: Math.pow(10, e1), logx: true, logy: true, ymin: 1, ymax: Math.pow(10, e2), xtickValues: logTicks(-2, e1), ytickValues: logTicks(0, e2), xlabel: '|f′(w)|（坡度）', ylabel: 'f″(w)（弯曲度）', pad: { l: 52, r: 14, t: 10, b: 38 } }).axes();
    P.fn((g) => L0 + L1 * g, C.c2, 2.2);
    P.points(gs, hs, C.c1, 3);
    P.points([Math.abs(gC(Cf.w0))], [hC(Cf.w0)], C.c4, 6.5, '#fff');
    P.text(Math.pow(10, e1) * 0.9, (L0 + L1 * Math.pow(10, e1) * 0.9) * 0.6, `f″ ≤ ${fx(L0, 1)} + ${fx(L1, 1)}·|f′|`, C.c2, 'right', 'top', '600 12.5px ' + NUMF);
  });
  $('#c-book').innerHTML = (() => {
    const E6 = 403.4, g = 3 * E6, h = 9 * E6; // 与书中一致，取 e⁶ ≈ 403.4
    return `<table class="data"><tbody>
      <tr><td>斜率 ${LAB.tex("f'(2)=3e^6\\approx3\\times403.4")}</td><td class="num"><b>${fx(g, 1)}</b></td><td>弯曲度 ${LAB.tex("f''(2)=9e^6")}</td><td class="num"><b>${fx(h, 1)}</b>（恰好 ${LAB.tex('=3\\times|f\'|')}）</td></tr>
      <tr><td>SGD（${LAB.tex('\\eta=0.01')}）一步</td><td class="num" style="color:${C.plum}"><b>−${fx(0.01 * g, 3)}</b></td><td>安全步长 ${LAB.tex("1/f''")}</td><td class="num">${fx(1 / h, 6)}</td></tr>
      <tr><td>Adam（${LAB.tex('\\eta=0.01')}）一步</td><td class="num" style="color:${C.leaf}"><b>−0.01</b></td><td>步子缩小了</td><td class="num">${fx(g, 0)} 倍</td></tr></tbody></table>`;
  })();
  updC();

  /* ================= 实验 3：分块海森 SGD 必败 ================= */
  const BLK = ['词嵌入', 'QK', 'VO', 'MLP', 'LayerNorm'], BCOL = [C.c1, C.c2, C.c3, C.c4, C.c5];
  const Hh = { s: 5, c: 1, eta: 0.01, T: 1000 };
  const hS = LAB.slider('#h-spread', { label: '块间悬殊 $10^{s}$ 倍', min: 0, max: 6, step: 0.25, value: 5, fmt: (v) => 's = ' + v, onInput: (v) => { Hh.s = v; updH(); } });
  LAB.segmented('#h-preset', ['CNN 式（10 倍）', 'Transformer 式（10⁵ 倍）'], 1, (i) => { Hh.s = i ? 5 : 1; hS.set(Hh.s); updH(); });
  LAB.slider('#h-sgd', { label: 'SGD 步长系数 $c$（$\\eta=c/h_{\\max}$）', min: 0.1, max: 1.9, step: 0.05, value: 1, fmt: (v) => v.toFixed(2), onInput: (v) => { Hh.c = v; updH(); } });
  LAB.slider('#h-adam', { label: 'Adam 步长 $\\eta$', min: 0.001, max: 0.05, step: 0.001, value: 0.01, fmt: (v) => v.toFixed(3), onInput: (v) => { Hh.eta = v; updH(); } });
  LAB.slider('#h-T', { label: '总步数 $T$', min: 100, max: 3000, step: 100, value: 1000, onInput: (v) => { Hh.T = v; updH(); } });
  let RH = null;
  function setupH() { const h = [], blk = []; for (let b = 0; b < 5; b++) for (let j = 0; j < 6; j++) { h.push(Math.pow(10, Hh.s * b / 4) * Math.pow(3, j / 5)); blk.push(b); } return { h, blk }; }
  function updH() {
    const { h, blk } = setupH(), n = h.length, hmax = Math.max(...h), L0 = 0.5 * M.sum(h);
    const runs = [0, 1, 2].map((kind) => {
      const th = new Float64Array(n).fill(1), m = new Float64Array(n), v = new Float64Array(n), loss = [1];
      for (let t = 1; t <= Hh.T; t++) {
        let L = 0;
        for (let i = 0; i < n; i++) {
          const g = h[i] * th[i];
          if (kind === 0) th[i] -= Hh.c / hmax * g;
          else if (kind === 2) th[i] -= g / (Math.pow(10, Hh.s * blk[i] / 4) * 3);
          else { m[i] = 0.9 * m[i] + 0.1 * g; v[i] = 0.999 * v[i] + 0.001 * g * g; th[i] -= Hh.eta * (m[i] / (1 - Math.pow(0.9, t))) / (Math.sqrt(v[i] / (1 - Math.pow(0.999, t))) + 1e-300); }
          L += 0.5 * h[i] * th[i] * th[i];
        }
        loss.push(L / L0);
      }
      const per = [0, 1, 2, 3, 4].map((b) => { let s = 0; for (let i = 0; i < n; i++) if (blk[i] === b) s += th[i] * th[i]; return Math.sqrt(s / 6); });
      return { loss, per };
    });
    let a = 0, b2 = 0; for (let i = 0; i < n; i++) { a += h[i] ** 3; b2 += h[i] ** 2; }
    RH = { h, blk, runs, Ssgd: a / b2, Sadam: M.mean(h), hmax };
    stH[0].set(Math.round(hmax / Math.min(...h)).toLocaleString());
    const nb = (x) => (x >= 1000 ? Math.round(x).toLocaleString() : fx(x, 1));
    stH[1].set(`${nb(RH.Ssgd)}<small>h_max = ${nb(hmax)}</small>`); stH[2].set(`${nb(RH.Sadam)}<small>= 平均弯曲度</small>`);
    stH[3].set(`${fx(runs[0].per[0], 4)}<small>Adam ${fx(runs[1].per[0], 4)}</small>`);
    spec.redraw(); lossH.redraw(); bars.redraw();
  }
  const stH = [LAB.stat('#h-stats', '全局条件数 $h_{\\max}/h_{\\min}$', 'coral'), LAB.stat('#h-stats', 'SGD 方向的弯曲度 $\\mathcal S(\\mathbf d_{\\text{SGD}})$', 'plum'), LAB.stat('#h-stats', 'Adam 方向的弯曲度 $\\mathcal S(\\mathbf d_{\\text{Adam}})$', 'leaf'), LAB.stat('#h-stats', '$T$ 步后词嵌入块的 $|\\theta|$：SGD', 'amber')];
  const spec = LAB.canvas('#h-spec', (ctx, w, h) => {
    if (!RH) return;
    const e1 = Math.ceil(Math.log10(RH.hmax) + 0.3);
    const P = new LAB.Plot(ctx, w, h, { xmin: -0.6, xmax: 4.6, ymin: 0.5, ymax: Math.pow(10, Math.max(e1, 1)), logy: true, xtickValues: [], ytickValues: logTicks(0, Math.max(e1, 1)), ylabel: '弯曲度 h', pad: { l: 52, r: 12, t: 10, b: 30 } }).axes();
    RH.h.forEach((x, i) => { const b = RH.blk[i], j = i % 6; P.points([b - 0.25 + 0.1 * j], [x], BCOL[b], 4.5, '#fff'); });
    BLK.forEach((s, b) => { ctx.save(); ctx.fillStyle = BCOL[b]; ctx.font = '600 12.5px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(s, P.tx(b), P.y0 + 7); ctx.restore(); });
  });
  const lossH = LAB.canvas('#h-loss', (ctx, w, h) => {
    if (!RH) return;
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: Hh.T, ymin: 1e-12, ymax: 2, logy: true, ytickValues: [1e-12, 1e-9, 1e-6, 1e-3, 1], xlabel: '步数 t', pad: { l: 52, r: 12, t: 10, b: 36 } }).axes();
    P.clip(); const cols = [C.c5, C.c3, C.c2];
    RH.runs.forEach((r, i) => P.line(M.range(r.loss.length), r.loss.map((v) => M.clamp(v, 1e-12, 10)), cols[i], 2.2));
    P.unclip();
  });
  const bars = LAB.canvas('#h-bars', (ctx, w, h) => {
    if (!RH) return;
    const P = new LAB.Plot(ctx, w, h, { xmin: -0.6, xmax: 4.6, ymin: 1e-12, ymax: 3, logy: true, xtickValues: [], ytickValues: [1e-12, 1e-9, 1e-6, 1e-3, 1], pad: { l: 52, r: 12, t: 10, b: 30 } }).axes();
    const bw = (P.tx(1) - P.tx(0)) * 0.22, cols = [C.c5, C.c3, C.c2];
    [0, 1, 2].forEach((k) => {
      const xs = [0, 1, 2, 3, 4].map((b) => b + (k - 1) * 0.25), ys = RH.runs[k].per.map((v) => M.clamp(v, 1e-12, 3));
      ctx.save(); ctx.fillStyle = cols[k]; xs.forEach((x, i) => { const X = P.tx(x), Y = P.ty(ys[i]); LAB.roundRect(ctx, X - bw / 2, Y, bw, P.y0 - Y, 2); ctx.fill(); }); ctx.restore();
      P.points(xs, ys, cols[k], 3.2, '#fff');
    });
    BLK.forEach((s, b) => { ctx.save(); ctx.fillStyle = BCOL[b]; ctx.font = '600 12px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(s, P.tx(b), P.y0 + 7); ctx.restore(); });
  });
  updH();
})();
