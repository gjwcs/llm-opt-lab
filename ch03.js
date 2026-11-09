/* 第 3 章：鞍点、逃逸与稳定边缘 · 交互实验 */
(function () {
  const { COLORS: C, M } = LAB;
  LAB.page({ bookRef: '对应书中 §3.1 高维空间几乎没有假死坑 · §3.2 马鞍面负负得正逃逸 · §3.3 稳定边缘 · §3.4 喇叭口山谷 6 步手算 · 零算力实战' });
  document.querySelectorAll('.formula, [style*="overflow-x"]').forEach((f) => { f.style.width = '0'; f.style.minWidth = '100%'; });
  const $ = (s) => document.querySelector(s);
  const FONT = getComputedStyle(document.body).getPropertyValue('--font');
  const NUMF = getComputedStyle(document.body).getPropertyValue('--font-num');
  const fx = (x, d) => { if (!isFinite(x)) return '∞'; const a = Math.abs(x); if (a !== 0 && (a >= 1e5 || a < 1e-3)) return M.fmt(x, 2); return (+x.toFixed(d == null ? 3 : d)).toString(); };
  const sgn = (x, d) => (x < 0 ? '−' : '') + fx(Math.abs(x), d);
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = (e) => String(e).split('').map((c) => SUP[c] || c).join('');
  const pow10 = (lg) => { if (lg > -3) return fx(Math.pow(10, lg) * 100, 3) + '%'; const e = Math.floor(lg), m = Math.pow(10, lg - e); return (m >= 9.995 ? '' : m.toFixed(m < 1.0005 ? 0 : 2) + '×') + '10' + sup(m >= 9.995 ? e + 1 : e); };
  const logTicks = (e0, e1) => { const s = Math.max(1, Math.ceil((e1 - e0) / 6)), t = []; for (let e = Math.ceil(e0 / s) * s; e <= e1; e += s) t.push(Math.pow(10, e)); return t; };

  /* ================= 实验 1：抛硬币数假死坑 ================= */
  const K = { lgd: 4, p: 0.5, n: 4, mu: 0, seed: 1, hist: null };
  const dOf = () => Math.round(Math.pow(10, K.lgd));
  LAB.slider('#k-d', { label: '旋钮个数 $d$（对数刻度）', min: 0, max: 11, step: 0.05, value: 4, fmt: (v) => { const d = Math.round(Math.pow(10, v)); return d >= 1e5 ? '10' + sup(Math.round(v * 100) / 100 === Math.round(v) ? Math.round(v) : v.toFixed(1)) : d.toLocaleString(); }, onInput: (v) => { K.lgd = v; updK(); } });
  LAB.slider('#k-p', { label: '单个方向往上翘的概率 $p$', min: 0.05, max: 0.99, step: 0.01, value: 0.5, fmt: (v) => v.toFixed(2), onInput: (v) => { K.p = v; updK(); } });
  LAB.slider('#k-n', { label: '随机矩阵维度 $n$', min: 1, max: 12, step: 1, value: 4, onInput: (v) => { K.n = v; drawMC(); } });
  LAB.slider('#k-mu', { label: '海拔参数 $\\mu$（越大越接近谷底）', min: -1, max: 3, step: 0.05, value: 0, fmt: (v) => v.toFixed(2), onInput: (v) => { K.mu = v; drawMC(); } });
  $('#k-draw').onclick = () => { K.seed++; drawMC(); };
  const stK = [LAB.stat('#k-stats', '抛硬币模型 $p^d$', 'coral'), LAB.stat('#k-stats', '期望的滑梯条数 $(1-p)d$', 'leaf'), LAB.stat('#k-stats', '实测：假死坑占比', 'amber'), LAB.stat('#k-stats', '实测：平均滑梯条数', 'plum')];
  function updK() {
    const d = Math.pow(10, K.lgd), lg = d * Math.log10(K.p);
    stK[0].set(`${pow10(lg)}${lg < -3 ? `<small>即 10 的 ${lg.toFixed(1).replace("-", "−")} 次方</small>` : ''}`);
    stK[1].set(fx((1 - K.p) * d, d < 100 ? 2 : 0).replace(/\B(?=(\d{3})+(?!\d))/g, ','));
    curve.redraw();
  }
  // 惯性：LDLᵀ 消元数负主元 = 负特征值个数
  function negCount(A, n) {
    let neg = 0;
    for (let k = 0; k < n; k++) {
      let d = A[k * n + k]; if (Math.abs(d) < 1e-14) d = 1e-14;
      if (d < 0) neg++;
      for (let i = k + 1; i < n; i++) { const f = A[i * n + k] / d; if (f === 0) continue; for (let j = k + 1; j < n; j++) A[i * n + j] -= f * A[k * n + j]; }
    }
    return neg;
  }
  function drawMC() {
    const R = LAB.rng(K.seed * 977 + K.n * 31), n = K.n, N = 4000, cnt = new Array(n + 1).fill(0), A = new Float64Array(n * n), s = 1 / Math.sqrt(n);
    for (let m = 0; m < N; m++) {
      for (let i = 0; i < n; i++) { A[i * n + i] = K.mu + R.normal() * Math.SQRT2 * s; for (let j = i + 1; j < n; j++) { const v = R.normal() * s; A[i * n + j] = v; A[j * n + i] = v; } }
      cnt[negCount(A, n)]++;
    }
    K.hist = cnt.map((c) => c / N);
    stK[2].set(`${(K.hist[0] * 100).toFixed(2)}%<small>抛硬币估计 ${fx(Math.pow(pPos(), n) * 100, 2)}%</small>`);
    stK[3].set(`${fx(K.hist.reduce((a, v, i) => a + v * i, 0), 2)}<small>/ ${n} 个方向</small>`);
    $('#k-sub').textContent = `n = ${n}，μ = ${K.mu.toFixed(2)}`;
    hist.redraw();
  }
  const pPos = () => (K.hist ? 1 - K.hist.reduce((a, v, i) => a + v * i, 0) / K.n : 0.5);
  const curve = LAB.canvas('#k-curve', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: 1, xmax: 1e11, logx: true, ymin: -12, ymax: 0.5, xtickValues: [1, 1e2, 1e4, 1e6, 1e8, 1e10], xfmt: (v) => (v < 1000 ? v : '10' + sup(Math.round(Math.log10(v)))), ytickValues: [-12, -9, -6, -3, 0], yfmt: (v) => (v === 0 ? '1' : '10' + sup(v)), xlabel: '旋钮个数 d', ylabel: '概率', pad: { l: 50, r: 14, t: 10, b: 36 } }).axes();
    P.clip();
    [[0.99, C.c2], [0.9, C.c3], [K.p, C.c1]].forEach(([p, col], i) => P.fn((d) => d * Math.log10(p), col, i === 2 ? 2.8 : 1.8, i === 2 ? null : [5, 4], 400));
    const d = Math.pow(10, K.lgd), lg = d * Math.log10(K.p);
    P.vline(d, C.slate, [3, 3]);
    P.points([d], [Math.max(lg, -11.8)], C.c4, 6, '#fff');
    P.unclip();
    P.text(d, Math.max(lg, -11.8), lg < -11.8 ? `  ↓ 真实值 ${pow10(lg)}` : `  ${pow10(lg)}`, C.c4, d > 1e8 ? 'right' : 'left', 'bottom', '600 12.5px ' + NUMF);
  });
  const hist = LAB.canvas('#k-hist', (ctx, w, h) => {
    if (!K.hist) return;
    const n = K.n, pp = pPos();
    const coin = M.range(n + 1).map((k) => { let c = 1; for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1); return c * Math.pow(1 - pp, k) * Math.pow(pp, n - k); });
    const top = Math.max(...K.hist, ...coin) * 1.18;
    const P = new LAB.Plot(ctx, w, h, { xmin: -0.7, xmax: n + 0.7, ymin: 0, ymax: top, xtickValues: M.range(n + 1), xfmt: (v) => v, yfmt: (v) => Math.round(v * 100) + '%', xlabel: '负特征值个数（逃生方向条数）', pad: { l: 50, r: 12, t: 12, b: 36 } }).axes();
    const bw = Math.min(46, (P.tx(1) - P.tx(0)) * 0.62);
    P.bars(M.range(n + 1), K.hist, M.range(n + 1).map((k) => (k === 0 ? C.c4 : C.c1)), bw);
    P.line(M.range(n + 1), coin, C.c2, 1.8, [5, 3]); P.points(M.range(n + 1), coin, C.c2, 3.2);
    P.text(0, K.hist[0], `${(K.hist[0] * 100).toFixed(1)}%`, C.c4, 'center', 'bottom', '600 12px ' + NUMF);
    P.text(n + 0.6, top * 0.94, `橙色虚线：抛硬币（独立）模型，p = ${pp.toFixed(2)}`, C.c2, 'right', 'middle', '12px ' + FONT);
  });
  updK(); drawMC();

  /* ================= 实验 2：马鞍面上弹射逃生 ================= */
  const S = { eta: 0.25, lgy: -3, T: 25, noise: false };
  const y0 = () => (S.lgy <= -9 ? 0 : Math.pow(10, S.lgy));
  const sEta = LAB.slider('#s-eta', { label: '步长 $\\eta$', min: 0.02, max: 0.45, step: 0.01, value: 0.25, fmt: (v) => v.toFixed(2), onInput: (v) => { S.eta = v; updS(); } });
  const sY0 = LAB.slider('#s-y0', { label: '逃生方向的初始偏离 $y_0$', min: -9, max: -0.5, step: 0.05, value: -3, fmt: (v) => (v <= -9 ? '0（山脊上）' : fx(Math.pow(10, v), 6)), onInput: (v) => { S.lgy = v; updS(); } });
  const sT = LAB.slider('#s-T', { label: '最多走几步', min: 5, max: 120, step: 1, value: 25, onInput: (v) => { S.T = v; updS(); } });
  LAB.checkbox('#s-noise', '每步加一点随机扰动（大小 $10^{-4}$）', false, (v) => { S.noise = v; updS(); });
  $('#s-book').onclick = () => { S.eta = 0.25; S.lgy = -3; S.T = 25; sEta.set(0.25); sY0.set(-3); sT.set(25); updS(); };
  let RS = null;
  const fS = (x, y) => x * x - y * y;
  function runS() {
    const R = LAB.rng(7), path = [[1, y0()]];
    let x = 1, y = y0(), esc = -1;
    for (let t = 0; t < S.T; t++) {
      x = x - S.eta * 2 * x; y = y + S.eta * 2 * y;
      if (S.noise) { x += 1e-4 * R.normal(); y += 1e-4 * R.normal(); }
      path.push([x, y]);
      if (esc < 0 && Math.hypot(x, y) > 1 && Math.abs(y) > Math.abs(x)) esc = t + 1;
    }
    RS = { path, esc };
  }
  const stS = [LAB.stat('#s-stats', '每步放大倍数 $1+2\\eta$', 'coral'), LAB.stat('#s-stats', '理论逃逸步数 $T_{\\text{escape}}$', 'amber'), LAB.stat('#s-stats', '实测：第几步冲出 $R=1$', 'leaf'), LAB.stat('#s-stats', '最后一步的海拔', 'plum')];
  function updS() {
    runS();
    const g = 1 + 2 * S.eta, yy = y0();
    stS[0].set(g.toFixed(2));
    stS[1].set(yy > 0 ? `${fx(Math.log(1 / yy) / Math.log(g), 1)}<small>≈ ${fx(Math.log(1 / yy) / (2 * S.eta), 1)}</small>` : '∞');
    stS[2].set(RS.esc > 0 ? `${RS.esc}<small>步</small>` : `<small>${S.T} 步内没逃出</small>`);
    const last = RS.path[RS.path.length - 1]; stS[3].set(fx(fS(last[0], last[1]), 3));
    const show = [0, 1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 60, 80, 100, 120].filter((t) => t <= S.T);
    $('#s-table').innerHTML = `<thead><tr><th>步数 t</th><th>${LAB.tex('x_t')}</th><th>${LAB.tex('y_t')}</th><th>海拔 ${LAB.tex('f=x_t^2-y_t^2')}</th></tr></thead><tbody>${show.map((t) => { const p = RS.path[t]; return `<tr><td class="num">${t}</td><td class="num">${sgn(p[0], 6)}</td><td class="num">${sgn(p[1], 6)}</td><td class="num">${sgn(fS(p[0], p[1]), 4)}</td></tr>`; }).join('')}</tbody>`;
    mapS.redraw(); logS.redraw();
  }
  let field = null;
  function makeField(nx, ny, dom) {
    const off = document.createElement('canvas'); off.width = nx; off.height = ny;
    const oc = off.getContext('2d'), img = oc.createImageData(nx, ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = dom[0] + (dom[1] - dom[0]) * i / (nx - 1), y = dom[3] - (dom[3] - dom[2]) * j / (ny - 1), v = fS(x, y) / 2.25;
      const band = Math.round(v * 8) / 8, col = LAB.diverge(band * 0.8).match(/\d+/g).map(Number), k = 4 * (j * nx + i);
      img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 255;
    }
    oc.putImageData(img, 0, 0); return off;
  }
  const mapS = LAB.canvas('#s-map', (ctx, w, h) => {
    if (!RS) return;
    const dom = [-1.5, 1.5, -1.5, 1.5], side = Math.min(w, h);
    const P = new LAB.Plot(ctx, w, h, { xmin: dom[0], xmax: dom[1], ymin: dom[2], ymax: dom[3], xlabel: 'x（往上翘）', ylabel: 'y（往下塌）', xticks: 6, yticks: 6, grid: false, pad: { l: 40 + (w - side) / 2, r: 10 + (w - side) / 2, t: 10, b: 36 } });
    if (!field) field = makeField(150, 150, dom);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(field, P.x0, P.y1, P.x1 - P.x0, P.y0 - P.y1); ctx.restore();
    P.axes(); P.clip();
    ctx.save(); ctx.strokeStyle = C.navy; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(P.tx(0), P.ty(0), P.tx(1) - P.tx(0), P.ty(0) - P.ty(1), 0, 0, 7); ctx.stroke(); ctx.restore();
    const pts = []; for (const p of RS.path) { pts.push(p); if (Math.abs(p[1]) > 1.5) break; }
    P.line(pts.map((p) => p[0]), pts.map((p) => M.clamp(p[1], -1.6, 1.6)), C.ink, 2);
    P.points(pts.map((p) => p[0]), pts.map((p) => M.clamp(p[1], -1.6, 1.6)), C.ink, 2.6);
    P.points([1], [y0()], C.navy, 6, '#fff'); P.points([0], [0], C.amber, 5, '#fff');
    P.unclip();
  });
  const logS = LAB.canvas('#s-log', (ctx, w, h) => {
    if (!RS) return;
    const yy = y0(), lo = Math.min(-10, Math.floor(Math.log10(Math.max(yy, 1e-12))) - 1);
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: S.T, ymin: Math.pow(10, lo), ymax: 100, logy: true, ytickValues: logTicks(lo, 2), xlabel: '步数 t', ylabel: '|y_t|', pad: { l: 52, r: 12, t: 10, b: 36 } }).axes();
    P.clip();
    P.hline(1, C.navy, [5, 4], 1.2); P.text(S.T, 1, 'R = 1 ', C.navy, 'right', 'bottom', '12px ' + NUMF);
    if (yy > 0) P.fn((t) => yy * Math.pow(1 + 2 * S.eta, t), C.c4, 1.4, [6, 4]);
    P.line(M.range(RS.path.length), RS.path.map((p) => Math.max(Math.abs(p[1]), Math.pow(10, lo))), C.c1, 2.4);
    P.line(M.range(RS.path.length), RS.path.map((p) => Math.max(Math.abs(p[0]), Math.pow(10, lo))), C.slate, 1.4, [2, 3]);
    if (RS.esc > 0) P.vline(RS.esc, C.leaf, [3, 3]);
    P.unclip();
    P.text(S.T * 0.98, Math.pow(10, lo + 0.6), '灰色点线：|x_t|（往鞍点中心收拢）', C.slate, 'right', 'middle', '11.5px ' + FONT);
  });
  updS();

  /* ================= 实验 3：稳定边缘自动压平 ================= */
  const E = { eta: 0.2, k: 0.01, ys: 15, lge: -2.5, T: 400, freeze: false, x0: 0.01, y0: 6 };
  const PRE_E = [{ eta: 0.2, k: 0.01, ys: 15, lge: -2.5, T: 400, x0: 0.01, y0: 6 }, { eta: 0.2, k: 0.02, ys: 15, lge: -7, T: 40, x0: 0.3, y0: 9.8 }];
  LAB.segmented('#e-preset', ['实验室默认', '书中 30 行脚本'], 0, (i) => { Object.assign(E, PRE_E[i]); eS.set(E.eta); eK.set(E.k); eY.set(E.ys); eEps.set(E.lge); eT.set(E.T); updE(); });
  const eS = LAB.slider('#e-eta', { label: '步长 $\\eta$（生死线 $2/\\eta$）', min: 0.08, max: 0.4, step: 0.01, value: 0.2, fmt: (v) => `${v.toFixed(2)}（${fx(2 / v, 2)}）`, onInput: (v) => { E.eta = v; updE(); } });
  const eK = LAB.slider('#e-c', { label: '渐进锐化系数 $k$（书中脚本取 $0.02$）', min: 0.0025, max: 0.1, step: 0.0025, value: 0.01, fmt: (v) => v.toFixed(4), onInput: (v) => { E.k = v; updE(); } });
  const eY = LAB.slider('#e-ys', { label: '锐化目标 $y^\\star$', min: 6, max: 30, step: 0.5, value: 15, fmt: (v) => v.toFixed(1), onInput: (v) => { E.ys = v; updE(); } });
  const eEps = LAB.slider('#e-eps', { label: '随机抖动 $\\varepsilon$（最左端 = 0）', min: -7, max: -1, step: 0.1, value: -2.5, fmt: (v) => (v <= -6.95 ? '0' : fx(Math.pow(10, v), 5)), onInput: (v) => { E.lge = v; updE(); } });
  const eT = LAB.slider('#e-T', { label: '总步数', min: 20, max: 1500, step: 10, value: 400, onInput: (v) => { E.T = v; updE(); } });
  LAB.checkbox('#e-freeze', '关掉震荡反馈（经典二次理论）', false, (v) => { E.freeze = v; updE(); });
  let RE = null;
  const CHECK = [1, 5, 10, 15, 20, 30, 40];
  function runE() {
    const R = LAB.rng(2026), eps = E.lge <= -6.95 ? 0 : Math.pow(10, E.lge), xs = [E.x0], ys = [E.y0], fs = [];
    let x = E.x0, y = E.y0, dead = -1;
    const f = (x, y) => 0.5 * y * x * x + E.k * (y - E.ys) * (y - E.ys);
    fs.push(f(x, y));
    for (let t = 0; t < E.T; t++) {
      const gx = y * x, gy = (E.freeze ? 0 : 0.5 * x * x) + 2 * E.k * (y - E.ys);
      x = x - E.eta * gx + eps * R.normal(); y = y - E.eta * gy;
      if (!isFinite(x) || Math.abs(x) > 1e6 || Math.abs(y) > 1e6) { dead = t + 1; break; }
      xs.push(x); ys.push(y); fs.push(f(x, y));
    }
    RE = { xs, ys, fs, dead };
  }
  const stE = [LAB.stat('#e-stats', '生死线 $2/\\eta$', 'coral'), LAB.stat('#e-stats', '最后 100 步陡峭度均值', ''), LAB.stat('#e-stats', '陡峭度最高冲到', 'amber'), LAB.stat('#e-stats', '最终状态', 'leaf')];
  function updE() {
    runE();
    const tail = RE.ys.slice(-100);
    stE[0].set(fx(2 / E.eta, 2));
    stE[1].set(RE.dead > 0 ? '–' : fx(M.mean(tail), 3));
    stE[2].set(fx(Math.max(...RE.ys), 2));
    stE[3].set(RE.dead > 0 ? `第 ${RE.dead} 步炸飞` : Math.abs(M.mean(tail) - 2 / E.eta) < 0.08 * 2 / E.eta ? '贴着 2/η 巡航' : M.mean(tail) < 2 / E.eta ? '在线内安稳' : '越线');
    stE[3].el.querySelector('.value').style.color = RE.dead > 0 ? C.coral : C.leaf;
    $('#e-sub').textContent = `η = ${E.eta.toFixed(2)}，2/η = ${fx(2 / E.eta, 2)}，y* = ${E.ys}，从 (${E.x0}, ${E.y0}) 出发`;
    // 检查点（书中脚本打印第 1、5、10、15、20、30、40 步）
    $('#e-check').innerHTML = `<thead><tr><th>步数</th>${CHECK.map((t) => `<th class="num">${t}</th>`).join('')}</tr></thead><tbody>
      <tr><td>横向震荡 ${LAB.tex('x_t')}</td>${CHECK.map((t) => `<td class="num">${t < RE.xs.length ? sgn(RE.xs[t], 4) : '–'}</td>`).join('')}</tr>
      <tr><td>陡峭度 ${LAB.tex('y_t')}</td>${CHECK.map((t) => `<td class="num"><b style="color:${t < RE.ys.length && RE.ys[t] > 2 / E.eta ? C.coral : C.leaf}">${t < RE.ys.length ? RE.ys[t].toFixed(3) : '–'}</b></td>`).join('')}</tr></tbody>`;
    // 书中 6 步算例：f = ½ y x²，从 (1, 11) 出发
    let x = 1, y = 11; const rows = [`<tr><td class="num">0</td><td class="num">${sgn(x, 3)}</td><td class="num">${y.toFixed(3)}</td><td class="num">${fx(Math.abs(1 - E.eta * y), 4)}</td><td>${y > 2 / E.eta ? '越线' : '线内'}</td></tr>`];
    for (let t = 1; t <= 200; t++) {
      const nx = (1 - E.eta * y) * x, ny = y - 0.5 * E.eta * x * x; x = nx; y = ny;
      if (t <= 6 || t === 200) rows.push(`<tr><td class="num">${t === 200 ? '… 200' : t}</td><td class="num">${sgn(x, 3)}</td><td class="num"><b style="color:${y > 2 / E.eta ? C.coral : C.leaf}">${y.toFixed(3)}</b></td><td class="num">${fx(Math.abs(1 - E.eta * y), 4)}</td><td>${t === 200 ? '震荡消失，陡峭度停在线内' : y > 2 / E.eta ? '越线，震荡放大' : '压回线内，震荡收敛'}</td></tr>`);
    }
    $('#e-table').innerHTML = `<thead><tr><th>步数</th><th>横向震荡 ${LAB.tex('x_t')}</th><th>陡峭度 ${LAB.tex('y_t')}</th><th>${LAB.tex('|1-\\eta y_t|')}</th><th>状态</th></tr></thead><tbody>${rows.join('')}</tbody>`;
    sharp.redraw(); xc.redraw(); lossE.redraw();
  }
  const sharp = LAB.canvas('#e-sharp', (ctx, w, h) => {
    if (!RE) return;
    const top = Math.max(E.ys, 2 / E.eta, ...RE.ys.slice(0, 2000)) * 1.08;
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: E.T, ymin: Math.min(0, ...RE.ys), ymax: top, xlabel: '步数 t', ylabel: '陡峭度 y_t', pad: { l: 46, r: 12, t: 10, b: 36 } }).axes();
    P.clip();
    P.hline(2 / E.eta, C.c4, [6, 4], 1.8); P.hline(E.ys, C.c3, [2, 3], 1.4);
    P.line(M.range(RE.ys.length), RE.ys, C.c1, 2);
    if (RE.dead > 0) P.vline(RE.dead, C.coral, [3, 3]);
    P.unclip();
    P.text(E.T, 2 / E.eta, `2/η = ${fx(2 / E.eta, 2)} `, C.c4, 'right', 'bottom', '600 12px ' + NUMF);
    P.text(E.T, E.ys, `y* = ${E.ys} `, C.c3, 'right', 'bottom', '600 12px ' + NUMF);
  });
  const xc = LAB.canvas('#e-x', (ctx, w, h) => {
    if (!RE) return;
    const m = Math.min(1e3, Math.max(0.1, ...RE.xs.map(Math.abs))) * 1.1;
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: E.T, ymin: -m, ymax: m, xlabel: '步数 t', ylabel: 'x_t', pad: { l: 46, r: 10, t: 10, b: 36 } }).axes();
    P.clip(); P.line(M.range(RE.xs.length), RE.xs, C.c2, 1.2); P.unclip();
  });
  const lossE = LAB.canvas('#e-loss', (ctx, w, h) => {
    if (!RE) return;
    const v = RE.fs.filter((a) => a > 0 && isFinite(a)), lo = Math.floor(Math.log10(Math.min(...v))), hi = Math.ceil(Math.log10(Math.max(...v)));
    const e0 = Math.max(lo, hi - 8), e1 = Math.max(hi, e0 + 1);
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: E.T, ymin: Math.pow(10, e0), ymax: Math.pow(10, e1), logy: true, ytickValues: logTicks(e0, e1), xlabel: '步数 t', pad: { l: 52, r: 10, t: 10, b: 36 } }).axes();
    P.clip(); P.line(M.range(RE.fs.length), RE.fs.map((a) => Math.max(a, Math.pow(10, e0))), C.c5, 1.4); P.unclip();
  });
  updE();
})();
