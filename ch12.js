/* 第 12 章：小模型调好的学习率怎么搬给大模型？—— 交互实验 */
(function () {
  const { COLORS: C, M } = LAB;
  LAB.page({ bookRef: '对应书中 §12.2–12.3 扔硬币与同号相加 · §12.3 SP、NTK 与 μP · §12.4 全模型 μP 配方 · §12.5 跨宽度迁移算例' });
  document.querySelectorAll('.formula').forEach((f) => { f.style.width = '0'; f.style.minWidth = '100%'; });
  const $ = (s) => document.querySelector(s);
  const FONT = getComputedStyle(document.body).getPropertyValue('--font');
  const NUMF = getComputedStyle(document.body).getPropertyValue('--font-num');
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = (e) => String(e).split('').map((c) => SUP[c] || c).join('');
  const sciParts = (x) => { let e = Math.floor(Math.log10(Math.abs(x))), m = +(x / Math.pow(10, e)).toPrecision(3); if (Math.abs(m) >= 10) { m /= 10; e++; } return [m, e]; };
  const fnum = (x, d) => { if (!isFinite(x)) return x > 0 ? '∞' : '–'; if (x === 0) return '0'; const a = Math.abs(x); if (a >= 1e5 || a < 1e-3) { const [m, e] = sciParts(x); return (m === 1 ? '' : m + '×') + '10' + sup(e); } return String(+x.toPrecision(d || 4)); };
  const isActive = (sec) => sec.classList.contains('active');
  const P2 = (k) => Math.pow(2, k);

  /* ================= 实验 1：扔硬币与同号相加 ================= */
  const CO = { d: 256, lr: 0.001, seed: 1 };
  const DBASE = 256;
  let WALK = null;
  function build1() {
    const R = LAB.rng(10 + CO.seed), d = CO.d, s = new Float64Array(d + 1);
    for (let k = 1; k <= d; k++) s[k] = s[k - 1] + (R() < 0.5 ? -1 : 1);
    WALK = s;
  }
  LAB.slider('#c-d', { label: '宽度 $d$（相加的项数）', min: 4, max: 14, step: 1, value: 8, fmt: (v) => P2(v).toLocaleString(), onInput: (v) => { CO.d = P2(v); build1(); upd1(); } });
  LAB.slider('#c-lr', { label: '小模型上调好的学习率 $\\eta_{\\text{小}}$', min: -4, max: -2, step: 0.05, value: -3, fmt: (v) => fnum(Math.pow(10, v), 3), onInput: (v) => { CO.lr = Math.pow(10, v); upd1(); } });
  $('#c-seed').onclick = () => { CO.seed++; build1(); upd1(); };
  const walkCv = LAB.canvas('#c-walk', (ctx, w, h) => {
    const d = CO.d, hi = d * 1.08, lo = -Math.max(3 * Math.sqrt(d), d * 0.12);
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: d, ymin: lo, ymax: hi, xlabel: '已经加了 k 项', ylabel: '部分和', pad: { l: 50, r: 12, t: 12, b: 36 } }).axes();
    const N = Math.min(d, 800), ks = M.range(N + 1).map((i) => Math.round((i * d) / N));
    P.area(ks, ks.map((k) => Math.sqrt(k)), '#cfd6de', 0.35, 0); P.area(ks, ks.map((k) => -Math.sqrt(k)), '#cfd6de', 0.35, 0);
    P.hline(0, C.slate, null, 0.8);
    P.line(ks, ks, C.c2, 2.6);
    P.line(ks, ks.map((k) => WALK[k]), C.c1, 1.8);
    P.points([d], [WALK[d]], C.c1, 4.5, '#fff'); P.points([d], [d], C.c2, 4.5, '#fff');
    P.text(d, d, `${d.toLocaleString()} `, C.c2, 'right', 'bottom', `600 12px ${NUMF}`);
    P.text(d, WALK[d], `${WALK[d] > 0 ? '+' : ''}${WALK[d]} `, C.c1, 'right', WALK[d] >= 0 ? 'bottom' : 'top', `600 12px ${NUMF}`);
  });
  // 宽度扫描：初始化输出（σ=1/√d）20 次的均方根
  const DS = M.range(11).map((k) => P2(k + 4));
  const R1 = LAB.rng(99);
  const Y0 = DS.map((d) => { let s2 = 0; for (let t = 0; t < 20; t++) { let s = 0; for (let i = 0; i < d; i++) s += (R1.normal() / Math.sqrt(d)) * (R1() < 0.5 ? -1 : 1); s2 += s * s; } return Math.sqrt(s2 / 20); });
  const scaleCv = LAB.canvas('#c-scale', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: 16, xmax: 16384, ymin: 0.01, ymax: 100, logx: true, logy: true, xtickValues: [16, 64, 256, 1024, 4096, 16384], ytickValues: [0.01, 0.1, 1, 10, 100], xlabel: '宽度 d', ylabel: '大小', pad: { l: 46, r: 12, t: 12, b: 36 } }).axes();
    P.fn(() => 1, C.c1, 1.6, [5, 4]); P.points(DS, Y0, C.c1, 4, '#fff');
    P.fn((d) => d * CO.lr, C.c4, 2.2); P.points(DS, DS.map((d) => d * CO.lr), C.c4, 3.5);
    P.fn(() => DBASE * CO.lr, C.c3, 2.2); P.points(DS, DS.map(() => DBASE * CO.lr), C.c3, 3.5);
    P.vline(CO.d, C.ink, [2, 3], 1); P.vline(DBASE, C.slate, [1, 4], 1);
    P.text(DBASE, 60, ' d_base', C.slate, 'left', 'middle', `11px ${NUMF}`);
  });
  const c1 = LAB.stat('#c-stats', '初始化：$d$ 个 $\\pm1$ 的和', '');
  const c2 = LAB.stat('#c-stats', '典型大小 $\\sqrt d$', 'plum');
  const c3 = LAB.stat('#c-stats', 'SP 照搬：$\\Delta y=d\\,\\eta_{\\text{小}}$', 'coral');
  const c4 = LAB.stat('#c-stats', '$\\mu$P：$\\Delta y=d_{\\text{base}}\\eta_{\\text{小}}$', 'leaf');
  function upd1() {
    c1.set(String(WALK[CO.d])); c2.set(fnum(Math.sqrt(CO.d), 3)); c3.set(fnum(CO.d * CO.lr, 4) + `<small> ×${fnum(CO.d / DBASE, 3)}</small>`); c4.set(fnum(DBASE * CO.lr, 4));
    walkCv.redraw(); scaleCv.redraw();
  }
  build1(); upd1();

  /* ================= 实验 2：最优学习率漂移（真的训练） ================= */
  const sec2 = $('#lrshift');
  const WIDTHS = [64, 128, 256, 512, 1024], N0 = 64, DIN = 8, B = 32;
  const LRS = M.range(12).map((i) => -14 + i); // log2
  const SW = { T: 40, res: { sp: {}, mup: {} }, jobs: [], done: 0, total: 0, started: false, timer: null };
  // 固定数据：随机“老师”函数
  const RD = LAB.rng(7), X = new Float64Array(B * DIN); for (let i = 0; i < X.length; i++) X[i] = RD.normal();
  const Y = new Float64Array(B);
  (() => { const K = 16, U = [], A = []; for (let k = 0; k < K; k++) { U.push(M.range(DIN).map(() => RD.normal() / Math.sqrt(DIN))); A.push(RD.normal()); } for (let i = 0; i < B; i++) { let s = 0; for (let k = 0; k < K; k++) { let z = 0; for (let d = 0; d < DIN; d++) z += U[k][d] * X[i * DIN + d]; s += A[k] * Math.tanh(2 * z); } Y[i] = s; } let m = 0, v = 0; for (const y of Y) m += y; m /= B; for (const y of Y) v += (y - m) ** 2; v = Math.sqrt(v / B); for (let i = 0; i < B; i++) Y[i] = (Y[i] - m) / v; })();
  function train(n, lr, mup, T) {
    const r = LAB.rng(100 + n), m = n / N0;
    const W1 = new Float64Array(n * DIN); for (let i = 0; i < W1.length; i++) W1[i] = r.normal() / Math.sqrt(DIN);
    const wo = new Float64Array(n), so = mup ? 1 / (Math.sqrt(N0) * m) : 1 / Math.sqrt(n); for (let i = 0; i < n; i++) wo[i] = r.normal() * so;
    const lr1 = lr, lro = mup ? lr / m : lr;
    const m1 = new Float64Array(n * DIN), v1 = new Float64Array(n * DIN), mo = new Float64Array(n), vo = new Float64Array(n), g1 = new Float64Array(n * DIN), go = new Float64Array(n), h = new Float64Array(n);
    let loss = 0;
    for (let t = 1; t <= T + 1; t++) {
      g1.fill(0); go.fill(0); loss = 0;
      for (let i = 0; i < B; i++) {
        const o = i * DIN; let y = 0;
        for (let j = 0; j < n; j++) { let s = 0; const q = j * DIN; for (let d = 0; d < DIN; d++) s += W1[q + d] * X[o + d]; h[j] = s > 0 ? s : 0; y += wo[j] * h[j]; }
        const e = y - Y[i]; loss += (0.5 * e * e) / B; const dy = e / B;
        for (let j = 0; j < n; j++) { if (h[j] <= 0) continue; go[j] += dy * h[j]; const gj = dy * wo[j], q = j * DIN; for (let d = 0; d < DIN; d++) g1[q + d] += gj * X[o + d]; }
      }
      if (!isFinite(loss) || loss > 1e4) return Infinity;
      if (t === T + 1) break;
      const c1 = 1 - 0.9 ** t, c2 = 1 - 0.99 ** t;
      for (let i = 0; i < W1.length; i++) { m1[i] = 0.9 * m1[i] + 0.1 * g1[i]; v1[i] = 0.99 * v1[i] + 0.01 * g1[i] * g1[i]; W1[i] -= (lr1 * (m1[i] / c1)) / (Math.sqrt(v1[i] / c2) + 1e-8); }
      for (let i = 0; i < n; i++) { mo[i] = 0.9 * mo[i] + 0.1 * go[i]; vo[i] = 0.99 * vo[i] + 0.01 * go[i] * go[i]; wo[i] -= (lro * (mo[i] / c1)) / (Math.sqrt(vo[i] / c2) + 1e-8); }
    }
    return loss;
  }
  function startSweep() {
    clearTimeout(SW.timer);
    SW.res = { sp: {}, mup: {} }; SW.jobs = []; SW.started = true;
    WIDTHS.forEach((n) => ['sp', 'mup'].forEach((p) => { SW.res[p][n] = new Array(LRS.length).fill(undefined); LRS.forEach((e, k) => SW.jobs.push([p, n, k])); }));
    SW.total = SW.jobs.length; SW.done = 0;
    const T = SW.T;
    const step = () => {
      const t0 = performance.now();
      while (SW.jobs.length && performance.now() - t0 < 28) { const [p, n, k] = SW.jobs.shift(); SW.res[p][n][k] = train(n, P2(LRS[k]), p === 'mup', T); SW.done++; }
      $('#w-prog').textContent = SW.jobs.length ? `正在训练：${SW.done} / ${SW.total} 次` : `完成：共训练 ${SW.total} 次（每次 ${T} 步）。`;
      updStats2(); spCv.redraw(); mupCv.redraw(); optCv.redraw();
      if (SW.jobs.length) SW.timer = setTimeout(step, 0);
    };
    step();
  }
  LAB.slider('#w-steps', { label: '每次训练的步数 $T$', min: 10, max: 100, step: 10, value: 40, onInput: (v) => { SW.T = v; } });
  $('#w-run').onclick = () => startSweep();
  const wcol = (i) => LAB.mix(C.c1l, C.navy, 0.15 + (0.85 * i) / (WIDTHS.length - 1));
  $('#w-legend').innerHTML = WIDTHS.map((n, i) => `<span><i style="background:${wcol(i)}"></i>宽度 ${n}</span>`).join('') + '<span>圆点：每条曲线的最低点</span>';
  const best = (arr) => { let b = -1, v = Infinity; arr.forEach((x, k) => { if (x !== undefined && x < v) { v = x; b = k; } }); return b; };
  function sweepPlot(id, p) {
    return LAB.canvas(id, (ctx, w, h) => {
      const P = new LAB.Plot(ctx, w, h, { xmin: LRS[0] - 0.3, xmax: LRS[LRS.length - 1] + 0.3, ymin: 1e-4, ymax: 3, logy: true, xtickValues: [-14, -12, -10, -8, -6, -4], xfmt: (v) => '2' + sup(v), ytickValues: [1e-4, 1e-3, 0.01, 0.1, 1], xlabel: '学习率 η（对数刻度）', ylabel: '训练后损失', pad: { l: 46, r: 10, t: 10, b: 36 } }).axes();
      if (!SW.started) return;
      P.clip();
      WIDTHS.forEach((n, i) => {
        const arr = SW.res[p][n]; if (!arr) return;
        const xs = [], ys = []; arr.forEach((v, k) => { if (v === undefined) return; xs.push(LRS[k]); ys.push(isFinite(v) ? Math.max(v, 1.1e-4) : 30); });
        if (xs.length) { P.line(xs, ys, wcol(i), 2.2); P.points(xs, ys, wcol(i), 2.2); }
        const b = best(arr); if (b >= 0 && arr.every((v) => v !== undefined)) P.points([LRS[b]], [Math.max(arr[b], 1.1e-4)], wcol(i), 5.5, '#fff');
      });
      P.unclip();
    });
  }
  const spCv = sweepPlot('#w-sp', 'sp'), mupCv = sweepPlot('#w-mup', 'mup');
  const optCv = LAB.canvas('#w-opt', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: 48, xmax: 1400, ymin: -12, ymax: -2, logx: true, xtickValues: WIDTHS, ytickValues: [-12, -10, -8, -6, -4, -2], yfmt: (v) => '2' + sup(v), xlabel: '宽度 d', ylabel: '最优学习率 η*', pad: { l: 46, r: 10, t: 10, b: 36 } }).axes();
    if (!SW.started) return;
    [['sp', C.c4], ['mup', C.c3]].forEach(([p, col]) => {
      const xs = [], ys = []; WIDTHS.forEach((n) => { const a = SW.res[p][n]; if (a && a.every((v) => v !== undefined)) { xs.push(n); ys.push(LRS[best(a)]); } });
      if (xs.length) { P.line(xs, ys, col, 2.4); P.points(xs, ys, col, 5, '#fff'); }
      if (p === 'sp' && xs.length) P.fn((d) => ys[0] - Math.log2(d / xs[0]), '#9aa5b1', 1.2, [5, 4]);
    });
  });
  const w1 = LAB.stat('#w-stats', 'SP：最优学习率 64 宽 → 1024 宽', 'coral');
  const w2 = LAB.stat('#w-stats', '$\\mu$P：最优学习率 64 宽 → 1024 宽', 'leaf');
  const w3 = LAB.stat('#w-stats', 'SP：拿 64 宽的最优学习率训 1024 宽', 'amber');
  function updStats2() {
    const f = (p) => { const a = SW.res[p][64], b = SW.res[p][1024]; if (!a || !b || a.some((v) => v === undefined) || b.some((v) => v === undefined)) return null; return [best(a), best(b)]; };
    const sp = f('sp'), mu = f('mup');
    w1.set(sp ? `2${sup(LRS[sp[0]])}<small> → </small>2${sup(LRS[sp[1]])}` : '…'); w2.set(mu ? `2${sup(LRS[mu[0]])}<small> → </small>2${sup(LRS[mu[1]])}` : '…');
    if (sp) { const b = SW.res.sp[1024], v = b[sp[0]], vb = b[sp[1]]; w3.set(isFinite(v) ? `${fnum(v / vb, 3)}<small> 倍于最优损失</small>` : '炸了'); } else w3.set('…');
  }
  updStats2();
  new MutationObserver(() => { if (isActive(sec2) && !SW.started) startSweep(); }).observe(sec2, { attributes: true, attributeFilter: ['class'] });
  if (isActive(sec2)) setTimeout(startSweep, 50);

  /* ================= 实验 3：μP 换算表 + 坐标检查 ================= */
  const TB = { base: 256, d: 4096, lr: 1.6e-3, sig: 0.02 };
  const sBase = LAB.slider('#t-base', { label: '小模型基准宽度 $d_{\\text{base}}$', min: 6, max: 10, step: 1, value: 8, fmt: (v) => P2(v).toLocaleString(), onInput: (v) => { TB.base = P2(v); upd3(); } });
  const sD = LAB.slider('#t-d', { label: '大模型宽度 $d$', min: 8, max: 14, step: 1, value: 12, fmt: (v) => P2(v).toLocaleString(), onInput: (v) => { TB.d = P2(v); upd3(); } });
  const sLr = LAB.slider('#t-lr', { label: '小模型最佳 Adam 学习率 $\\eta_{\\text{base}}$', min: -4, max: -2, step: 0.01, value: Math.log10(1.6e-3), fmt: () => fnum(TB.lr, 3), onInput: (v) => { TB.lr = +Math.pow(10, v).toPrecision(2); upd3(); } });
  const sSig = LAB.slider('#t-sig', { label: '基准初始化标准差 $\\sigma_0$', min: 0.005, max: 0.05, step: 0.001, value: 0.02, fmt: (v) => v.toFixed(3), onInput: (v) => { TB.sig = v; upd3(); } });
  const setBook = (b, d, lr) => { TB.base = b; TB.d = d; TB.lr = lr; TB.sig = 0.02; sBase.set(Math.log2(b)); sD.set(Math.log2(d)); sLr.set(Math.log10(lr)); sSig.set(0.02); upd3(); };
  $('#t-book1').onclick = () => setBook(256, 4096, 1.6e-3);
  $('#t-book2').onclick = () => setBook(256, 8192, 2e-3);
  // 坐标检查：真的搭网络、走一步 Adam、量激活变化
  const CK_W = [64, 128, 256, 512, 1024, 2048], CK_DIN = 16, CK_ETA = 0.01, CK_BASE = 64;
  let CK = null;
  function coordCheck() {
    const out = { sp: [], mup: [] };
    const Rx = LAB.rng(5), x = Float64Array.from({ length: CK_DIN }, () => (Rx() < 0.5 ? -1 : 1));
    CK_W.forEach((d) => {
      ['sp', 'mup'].forEach((p) => {
        const R = LAB.rng(1000 + d), m = d / CK_BASE, mup = p === 'mup';
        const W1 = new Float32Array(d * CK_DIN), W2 = new Float32Array(d * d), w3 = new Float32Array(d);
        for (let i = 0; i < W1.length; i++) W1[i] = R.normal() / Math.sqrt(CK_DIN);
        for (let i = 0; i < W2.length; i++) W2[i] = R.normal() / Math.sqrt(d);
        const s3 = mup ? 1 / (Math.sqrt(CK_BASE) * m) : 1 / Math.sqrt(d); for (let i = 0; i < d; i++) w3[i] = R.normal() * s3;
        const lr1 = CK_ETA, lr2 = mup ? CK_ETA / m : CK_ETA, lr3 = mup ? CK_ETA / m : CK_ETA;
        const fwd = () => { const z1 = new Float64Array(d), h1 = new Float64Array(d), z2 = new Float64Array(d), h2 = new Float64Array(d); for (let j = 0; j < d; j++) { let s = 0; for (let k = 0; k < CK_DIN; k++) s += W1[j * CK_DIN + k] * x[k]; z1[j] = s; h1[j] = s > 0 ? s : 0; } for (let j = 0; j < d; j++) { let s = 0; const o = j * d; for (let k = 0; k < d; k++) s += W2[o + k] * h1[k]; z2[j] = s; h2[j] = s > 0 ? s : 0; } let y = 0; for (let j = 0; j < d; j++) y += w3[j] * h2[j]; return { z1, h1, z2, h2, y }; };
        const a = fwd();
        // 损失 −y（让 y 变大）→ g_y = −1；Adam 第一步：Δw = −η·sign(g)
        const gz2 = new Float64Array(d); for (let j = 0; j < d; j++) gz2[j] = a.z2[j] > 0 ? -w3[j] : 0;
        const gh1 = new Float64Array(d); for (let j = 0; j < d; j++) { const g = gz2[j]; if (g === 0) continue; const o = j * d; for (let k = 0; k < d; k++) gh1[k] += g * W2[o + k]; }
        for (let j = 0; j < d; j++) { const g = -a.h2[j]; if (g !== 0) w3[j] -= lr3 * Math.sign(g); }
        for (let j = 0; j < d; j++) { const g = gz2[j]; if (g === 0) continue; const o = j * d, sg = Math.sign(g); for (let k = 0; k < d; k++) { const gg = sg * a.h1[k]; if (gg !== 0) W2[o + k] -= lr2 * Math.sign(gg); } }
        for (let j = 0; j < d; j++) { const g = a.z1[j] > 0 ? gh1[j] : 0; if (g === 0) continue; const sg = Math.sign(g); for (let k = 0; k < CK_DIN; k++) W1[j * CK_DIN + k] -= lr1 * sg * Math.sign(x[k]); }
        const b = fwd();
        const rms = (u, v) => { let s = 0; for (let j = 0; j < d; j++) s += (u[j] - v[j]) ** 2; return Math.sqrt(s / d); };
        out[p].push([rms(b.h1, a.h1), rms(b.h2, a.h2), Math.abs(b.y - a.y)]);
      });
    });
    CK = out;
  }
  const checkCv = LAB.canvas('#t-check', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: 50, xmax: 2600, ymin: 1e-3, ymax: 1e3, logx: true, logy: true, xtickValues: CK_W, ytickValues: [1e-3, 0.01, 0.1, 1, 10, 100, 1000], xlabel: '宽度 d', ylabel: '一步后的变化量', pad: { l: 48, r: 10, t: 10, b: 36 } }).axes();
    if (!CK) { P.text(Math.sqrt(50 * 2600), 1, '计算中…', C.slate, 'center'); return; }
    const cols = [C.c1, C.c5, C.c2];
    [0, 1, 2].forEach((q) => { P.line(CK_W, CK.sp.map((r) => r[q]), cols[q], 2, [6, 4]); P.points(CK_W, CK.sp.map((r) => r[q]), cols[q], 3); P.line(CK_W, CK.mup.map((r) => r[q]), cols[q], 2.4); P.points(CK_W, CK.mup.map((r) => r[q]), cols[q], 3.5, '#fff'); });
    if (TB.d <= 2600) P.vline(TB.d, C.ink, [2, 3], 1);
  });
  function upd3() {
    const md = TB.d / TB.base, s0 = TB.sig, e = TB.lr;
    $('#t-md').innerHTML = `宽度放大倍数 $m_d=d/d_{\\text{base}}=${TB.d}/${TB.base}=${fnum(md, 4)}$`;
    const row = (name, spS, spL, muS, muL, note) => `<tr><td><b>${name}</b>${note ? `<div class="small muted">${note}</div>` : ''}</td><td>${spS}</td><td>${spL}</td><td style="background:#f2faf5">${muS}</td><td style="background:#f2faf5">${muL}</td></tr>`;
    const f = (x) => fnum(x, 3);
    let html = '<tr><th>层</th><th>SP 初始化 σ</th><th>SP 学习率</th><th>μP 初始化 σ</th><th>μP 学习率</th></tr>';
    html += row('词表输入层', f(s0), f(e), f(s0), f(e), '每个输出只来自 1 项，不缩放');
    html += row('隐藏层（2D 矩阵）', f(s0 / Math.sqrt(md)), f(e), f(s0 / Math.sqrt(md)), f(e / md), `$d$ 项相加，学习率除以 $m_d$`);
    html += row('输出层（LM Head）', f(s0 / Math.sqrt(md)), f(e), `${f(s0 / md)}<span class="muted">（或 0）</span>`, f(e / md), '既要更新量 Θ(1)，又要回传斜率够小');
    html += row('注意力打分缩放', '$1/\\sqrt{d_{\\text{head}}}$', '–', '$1/d_{\\text{head}}$', '–', '$\\mathbf q,\\mathbf k$ 训练后同号相加');
    html += row('Muon 隐藏层（方阵）', '–', '–', '–', `${f(e)}<span class="muted"> × $\\sqrt{d_{\\text{out}}/d_{\\text{in}}}=1$</span>`, '谱 μP：方阵不用除以宽度');
    html += row('第一步隐藏层变化量', '', `<b style="color:var(--coral)">× ${fnum(md, 4)}</b>`, '', '<b style="color:var(--leaf)">× 1</b>', '相对小模型');
    $('#t-table').innerHTML = html; LAB.renderMath($('#t-table')); LAB.renderMath($('#t-md'));
    checkCv.redraw();
  }
  upd3();
  setTimeout(() => { coordCheck(); checkCv.redraw(); }, 60);
})();
