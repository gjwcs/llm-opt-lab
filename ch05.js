/* 第 5 章：AdaGrad、RMSProp 与 Adam · 交互实验 */
(function () {
  const { COLORS: C, M } = LAB;
  LAB.page({ bookRef: '对应书中 §5.1 两个词算一笔账 · §5.2 AdaGrad 的南墙 · §5.3 RMSProp 旧账打折 · §5.4 冷启动与 Adam · §5.5 万倍峡谷手算 · 零算力实战' });
  document.querySelectorAll('.formula, [style*="overflow-x"]').forEach((f) => { f.style.width = '0'; f.style.minWidth = '100%'; });
  const $ = (s) => document.querySelector(s);
  const FONT = getComputedStyle(document.body).getPropertyValue('--font');
  const NUMF = getComputedStyle(document.body).getPropertyValue('--font-num');
  const fx = (x, d) => { if (!isFinite(x)) return '∞'; const a = Math.abs(x); if (a !== 0 && (a >= 1e5 || a < 1e-3)) return M.fmt(x, 2); return (+x.toFixed(d == null ? 3 : d)).toString(); };
  const sgn = (x, d) => (x < 0 ? '−' : '') + fx(Math.abs(x), d);
  const logTicks = (e0, e1) => { const s = Math.max(1, Math.ceil((e1 - e0) / 6)), t = []; for (let e = Math.ceil(e0 / s) * s; e <= e1; e += s) t.push(Math.pow(10, e)); return t; };
  const EPS = 1e-8;

  /* ================= 实验 1：万倍峡谷四方对决 ================= */
  const D = { eta: 0.5, sgd: 0.01, b1: 0.9, b2: 0.999, hist: 0, T: 200, on: [true, true, true, true] };
  const OPT = [{ n: 'SGD', col: C.c5, cls: 'plum' }, { n: 'AdaGrad', col: C.c4, cls: 'coral' }, { n: '无还原 RMSProp', col: C.c2, cls: 'amber' }, { n: 'Adam', col: C.c3, cls: 'leaf' }];
  OPT.forEach((o, i) => LAB.checkbox('#d-on', `<span style="color:${o.col};font-weight:650">${o.n}</span>`, true, (v) => { D.on[i] = v; mapD.redraw(); w2D.redraw(); }));
  const dEta = LAB.slider('#d-eta', { label: '自适应算法步长 $\\eta$', min: 0.05, max: 1, step: 0.05, value: 0.5, fmt: (v) => v.toFixed(2), onInput: (v) => { D.eta = v; updD(); } });
  const dSgd = LAB.slider('#d-sgd', { label: 'SGD 步长 $\\eta_{\\text{SGD}}$', min: 0.001, max: 0.025, step: 0.001, value: 0.01, fmt: (v) => v.toFixed(3), onInput: (v) => { D.sgd = v; updD(); } });
  const dB1 = LAB.slider('#d-b1', { label: 'Adam 动量 $\\beta_1$', min: 0, max: 0.99, step: 0.01, value: 0.9, fmt: (v) => v.toFixed(2), onInput: (v) => { D.b1 = v; updD(); } });
  const dB2 = LAB.slider('#d-b2', { label: '分母打折系数 $\\beta_2$（RMSProp 与 Adam）', min: 0.9, max: 0.9999, step: 0.0001, value: 0.999, fmt: (v) => v.toFixed(4), onInput: (v) => { D.b2 = v; updD(); } });
  const dH = LAB.slider('#d-hist', { label: 'AdaGrad 的前期高原步数（陈年老账）', min: 0, max: 10000, step: 100, value: 0, onInput: (v) => { D.hist = v; updD(); } });
  const dT = LAB.slider('#d-T', { label: '总步数 $T$', min: 2, max: 400, step: 1, value: 200, onInput: (v) => { D.T = v; updD(); } });
  const presetD = (hist) => { Object.assign(D, { eta: 0.5, sgd: 0.01, b1: 0.9, b2: 0.999, hist, T: 200 }); dEta.set(0.5); dSgd.set(0.01); dB1.set(0.9); dB2.set(0.999); dH.set(hist); dT.set(200); updD(); };
  $('#d-book').onclick = () => presetD(0);
  $('#d-script').onclick = () => presetD(5000);
  const grad = (w) => [100 * w[0], 0.01 * w[1]];
  function runD() {
    const runs = OPT.map(() => [[1, 1]]);
    let w = [1, 1]; for (let t = 1; t <= D.T; t++) { const g = grad(w); w = w.map((x, i) => x - D.sgd * g[i]); runs[0].push(w); }
    w = [1, 1]; let G = [D.hist * 1e4, D.hist * 1e-4];
    for (let t = 1; t <= D.T; t++) { const g = grad(w); G = G.map((v, i) => v + g[i] * g[i]); w = w.map((x, i) => x - D.eta * g[i] / (Math.sqrt(G[i]) + EPS)); runs[1].push(w); }
    w = [1, 1]; let v = [0, 0];
    for (let t = 1; t <= D.T; t++) { const g = grad(w); v = v.map((a, i) => D.b2 * a + (1 - D.b2) * g[i] * g[i]); w = w.map((x, i) => x - D.eta * g[i] / (Math.sqrt(v[i]) + EPS)); if (!w.every(isFinite)) w = w.map(() => NaN); runs[2].push(w); }
    w = [1, 1]; let m = [0, 0]; v = [0, 0];
    for (let t = 1; t <= D.T; t++) { const g = grad(w); m = m.map((a, i) => D.b1 * a + (1 - D.b1) * g[i]); v = v.map((a, i) => D.b2 * a + (1 - D.b2) * g[i] * g[i]); const c1 = 1 - Math.pow(D.b1, t), c2 = 1 - Math.pow(D.b2, t); w = w.map((x, i) => x - D.eta * (m[i] / c1) / (Math.sqrt(v[i] / c2) + EPS)); runs[3].push(w); }
    return runs;
  }
  let RD = null;
  const stD = OPT.map((o) => LAB.stat('#d-stats', `${o.n}：最终 $|w_2|$`, o.cls));
  function updD() {
    RD = runD();
    RD.forEach((r, i) => { const x = r[D.T]; stD[i].set(isFinite(x[1]) ? fx(Math.abs(x[1]), 4) : '炸飞'); });
    const cell = (r, t, i) => { const x = r[t]; return `<td class="num" style="color:${OPT[i].col}">(${sgn(x[0], 4)}, ${sgn(x[1], 4)})</td>`; };
    const f = (x) => 50 * x[0] * x[0] + 0.005 * x[1] * x[1];
    $('#d-table').innerHTML = `<thead><tr><th>步数</th>${OPT.map((o) => `<th>${o.n}</th>`).join('')}</tr></thead><tbody>
      ${[1, 2].map((t) => `<tr><td class="num">第 ${t} 步</td>${RD.map((r, i) => cell(r, t, i)).join('')}</tr>`).join('')}
      <tr><td class="muted">第 2 步误差 f</td>${RD.map((r, i) => `<td class="num" style="color:${OPT[i].col}">${fx(f(r[2]), 4)}</td>`).join('')}</tr></tbody>`;
    mapD.redraw(); w2D.redraw();
  }
  const mapD = LAB.canvas('#d-map', (ctx, w, h) => {
    if (!RD) return;
    const S = 1.25, side = Math.min(w, h);
    const P = new LAB.Plot(ctx, w, h, { xmin: -S, xmax: S, ymin: -S, ymax: S, xlabel: 'w₁（常用字）', ylabel: 'w₂（生僻字）', xticks: 5, yticks: 5, pad: { l: 42 + (w - side) / 2, r: 10 + (w - side) / 2, t: 10, b: 36 } });
    ctx.save(); P.clip();
    [0.002, 0.005, 0.02, 0.1, 0.5, 2, 8, 30, 70].forEach((c) => { const rx = Math.sqrt(c / 50), ry = Math.sqrt(c / 0.005); ctx.strokeStyle = 'rgba(44,79,124,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(P.tx(0), P.ty(0), P.tx(rx) - P.tx(0), P.ty(0) - P.ty(ry), 0, 0, 7); ctx.stroke(); });
    P.unclip(); ctx.restore();
    P.axes(); P.clip();
    P.points([0], [0], C.ink, 4);
    const n = Math.min(D.T, 8);
    RD.forEach((r, i) => {
      if (!D.on[i]) return;
      const pts = r.slice(0, n + 1).filter((p) => isFinite(p[0]));
      const cl = pts.map((p) => [M.clamp(p[0], -S * 0.97, S * 0.97), M.clamp(p[1], -S * 0.97, S * 0.97)]);
      P.line(cl.map((p) => p[0]), cl.map((p) => p[1]), OPT[i].col, 2.2, i === 2 ? [5, 3] : null);
      P.points(cl.map((p) => p[0]), cl.map((p) => p[1]), OPT[i].col, 3.6, '#fff');
      pts.forEach((p, k) => { if (Math.abs(p[0]) > S || Math.abs(p[1]) > S) { P.text(cl[k][0], cl[k][1], ` 第${k}步 (${sgn(p[0], 2)}, ${sgn(p[1], 2)})`, OPT[i].col, cl[k][0] > 0 ? 'right' : 'left', 'bottom', '600 11.5px ' + NUMF); } });
    });
    P.unclip();
    P.points([1], [1], C.navy, 6, '#fff');
  });
  const w2D = LAB.canvas('#d-w2', (ctx, w, h) => {
    if (!RD) return;
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: D.T, ymin: 1e-6, ymax: 100, logy: true, ytickValues: logTicks(-6, 2), xlabel: '步数 t', ylabel: '|w₂|', pad: { l: 50, r: 10, t: 10, b: 36 } }).axes();
    P.clip();
    RD.forEach((r, i) => { if (D.on[i]) P.line(M.range(r.length), r.map((p) => (isFinite(p[1]) ? M.clamp(Math.abs(p[1]), 1e-6, 1e3) : 1e3)), OPT[i].col, 2.2, i === 2 ? [5, 3] : null); });
    P.unclip();
  });
  updD();

  /* ================= 实验 2：开张账本的还原术 ================= */
  const Bc = { b1: 0.9, b2: 0.999, g: 100, noise: false, eta: 0.5 };
  LAB.slider('#b-b1', { label: '$\\beta_1$', min: 0, max: 0.99, step: 0.01, value: 0.9, fmt: (v) => v.toFixed(2), onInput: (v) => { Bc.b1 = v; updB(); } });
  LAB.slider('#b-b2', { label: '$\\beta_2$', min: 0.9, max: 0.9999, step: 0.0001, value: 0.999, fmt: (v) => v.toFixed(4), onInput: (v) => { Bc.b2 = v; updB(); } });
  LAB.slider('#b-g', { label: '斜率大小 $g$', min: 0.01, max: 100, step: 0.01, value: 100, fmt: (v) => fx(v, 2), onInput: (v) => { Bc.g = v; updB(); } });
  LAB.checkbox('#b-noise', '斜率带抖动：$g_t=g\\,(1+\\xi_t)$，$\\xi_t\\sim\\mathcal N(0,1)$', false, (v) => { Bc.noise = v; updB(); });
  LAB.slider('#b-eta', { label: '步长 $\\eta$', min: 0.05, max: 1, step: 0.05, value: 0.5, fmt: (v) => v.toFixed(2), onInput: (v) => { Bc.eta = v; updB(); } });
  const TB = 10000;
  let RB = null;
  function runB() {
    const R = LAB.rng(3), out = { t: [], m: [], mh: [], v: [], vh: [], s: [[], [], [], []] };
    let m = 0, v = 0, vp = 0;
    for (let t = 1; t <= TB; t++) {
      const g = Bc.g * (Bc.noise ? 1 + R.normal() : 1);
      m = Bc.b1 * m + (1 - Bc.b1) * g; v = Bc.b2 * v + (1 - Bc.b2) * g * g; vp = v;
      const c1 = 1 - Math.pow(Bc.b1, t), c2 = 1 - Math.pow(Bc.b2, t);
      if (t <= 20 || t % Math.max(1, Math.floor(t / 60)) === 0) {
        out.t.push(t); out.m.push(m); out.mh.push(m / c1); out.v.push(Math.sqrt(v)); out.vh.push(Math.sqrt(v / c2));
        out.s[0].push(Math.abs(g) / (Math.sqrt(vp) + EPS)); out.s[1].push(Math.abs(m) / (Math.sqrt(v) + EPS)); out.s[2].push(Math.abs(m) / (Math.sqrt(v / c2) + EPS)); out.s[3].push(Math.abs(m / c1) / (Math.sqrt(v / c2) + EPS));
      }
    }
    return out;
  }
  const stB = [LAB.stat('#b-stats', '无还原第 1 步 $\\eta/\\sqrt{1-\\beta_2}$', 'coral'), LAB.stat('#b-stats', 'Adam 第 1 步', 'leaf'), LAB.stat('#b-stats', '分母低估倍数 $1/\\sqrt{1-\\beta_2}$', 'amber'), LAB.stat('#b-stats', '账本攒满 95% 需要', '')];
  function updB() {
    RB = runB();
    stB[0].set(fx(Bc.eta / Math.sqrt(1 - Bc.b2), 2)); stB[1].set(fx(Bc.eta, 2));
    stB[2].set(fx(1 / Math.sqrt(1 - Bc.b2), 1) + '<small>倍</small>');
    stB[3].set(`${Math.ceil(Math.log(0.05) / Math.log(Bc.b2))}<small>步</small>`);
    const g = Bc.g, b1 = Bc.b1, b2 = Bc.b2, m1 = (1 - b1) * g, v1 = (1 - b2) * g * g;
    $('#b-first').innerHTML = `<table class="data"><thead><tr><th>账本</th><th>未还原</th><th>除以 ${LAB.tex('1-\\beta^1')}</th></tr></thead><tbody>
      <tr><td>分子 ${LAB.tex('m_1=(1-\\beta_1)g')}</td><td class="num">${fx(m1, 4)}</td><td class="num">${LAB.tex('\\hat m_1=')} <b>${fx(m1 / (1 - b1), 4)}</b></td></tr>
      <tr><td>分母 ${LAB.tex('v_1=(1-\\beta_2)g^2')}</td><td class="num">${fx(v1, 4)}</td><td class="num">${LAB.tex('\\hat v_1=')} <b>${fx(v1 / (1 - b2), 4)}</b></td></tr>
      <tr><td>${LAB.tex('\\sqrt{v_1}')}</td><td class="num">${fx(Math.sqrt(v1), 4)}</td><td class="num"><b>${fx(Math.sqrt(v1 / (1 - b2)), 4)}</b></td></tr>
      <tr><td>第 1 步迈出（无动量：${LAB.tex('\\eta g/\\sqrt{v_1}')}）</td><td class="num" style="color:${C.coral}"><b>${fx(Bc.eta * g / Math.sqrt(v1), 3)}</b></td><td class="num" style="color:${C.leaf}"><b>${fx(Bc.eta, 3)}</b></td></tr>
      <tr><td>第 1 步迈出（有动量：${LAB.tex('\\eta m_1/\\sqrt{v_1}')}）</td><td class="num">${fx(Bc.eta * m1 / Math.sqrt(v1), 3)}</td><td class="num" style="color:${C.leaf}"><b>${fx(Bc.eta * (m1 / (1 - b1)) / Math.sqrt(v1 / (1 - b2)), 3)}</b></td></tr></tbody></table>`;
    vC.redraw(); mC.redraw(); sC.redraw();
  }
  const ledgerPlot = (ctx, w, h, raw, hat, truth, ylabel) => {
    const all = raw.concat(hat).filter((v) => v > 0), lo = Math.floor(Math.log10(Math.min(...all, truth))) , hi = Math.ceil(Math.log10(Math.max(...all, truth) * 1.2));
    const P = new LAB.Plot(ctx, w, h, { xmin: 1, xmax: TB, logx: true, logy: true, ymin: Math.pow(10, lo), ymax: Math.pow(10, hi), xtickValues: [1, 10, 100, 1000, 10000], xfmt: (v) => v, ytickValues: logTicks(lo, hi), xlabel: '步数 t', ylabel, pad: { l: 50, r: 10, t: 10, b: 36 } }).axes();
    P.clip(); P.hline(truth, C.slate, [5, 4], 1.2);
    P.line(RB.t, raw.map((v) => Math.max(v, Math.pow(10, lo))), C.c4, 2.2); P.line(RB.t, hat.map((v) => Math.max(v, Math.pow(10, lo))), C.c3, 2.2);
    P.vline(1 / (1 - Bc.b2), C.amber, [2, 3]); P.unclip();
  };
  const vC = LAB.canvas('#b-v', (ctx, w, h) => { if (RB) ledgerPlot(ctx, w, h, RB.v, RB.vh, Bc.g, '√v'); });
  const mC = LAB.canvas('#b-m', (ctx, w, h) => { if (RB) ledgerPlot(ctx, w, h, RB.m.map(Math.abs), RB.mh.map(Math.abs), Bc.g, '|m|'); });
  const sC = LAB.canvas('#b-step', (ctx, w, h) => {
    if (!RB) return;
    const cols = [C.c4, C.c2, C.c5, C.c3], all = RB.s.flat().filter((v) => v > 0), hi = Math.ceil(Math.log10(Math.max(...all) * 1.3)), lo = Math.min(-2, Math.floor(Math.log10(Math.min(...all))));
    const P = new LAB.Plot(ctx, w, h, { xmin: 1, xmax: TB, logx: true, logy: true, ymin: Math.pow(10, lo), ymax: Math.pow(10, hi), xtickValues: [1, 10, 100, 1000, 10000], xfmt: (v) => v, ytickValues: logTicks(lo, hi), xlabel: '步数 t', ylabel: '|Δθ| / η', pad: { l: 50, r: 10, t: 10, b: 36 } }).axes();
    P.clip(); P.hline(1, C.slate, [5, 4], 1.2);
    RB.s.forEach((s, i) => P.line(RB.t, s.map((v) => Math.max(v, Math.pow(10, lo))), cols[i], i === 3 ? 2.8 : 2));
    P.unclip();
  });
  updB();

  /* ================= 实验 3：滑动账本记性多长 ================= */
  const Mm = { beta: 0.99, T1: 1000, g1: 10, g2: 0.1, eta: 0.1, T: 3000 };
  LAB.slider('#m-beta', { label: '打折系数 $\\beta$', min: 0.5, max: 0.999, step: 0.001, value: 0.99, fmt: (v) => v.toFixed(3), onInput: (v) => { Mm.beta = v; updM(); } });
  LAB.slider('#m-T1', { label: '高原持续步数 $T_1$', min: 100, max: 2500, step: 50, value: 1000, onInput: (v) => { Mm.T1 = v; updM(); } });
  LAB.slider('#m-g1', { label: '高原斜率 $g_{\\text{前}}$', min: 0.1, max: 100, step: 0.1, value: 10, fmt: (v) => fx(v, 1), onInput: (v) => { Mm.g1 = v; updM(); } });
  LAB.slider('#m-g2', { label: '盆地斜率 $g_{\\text{后}}$', min: 0.01, max: 10, step: 0.01, value: 0.1, fmt: (v) => fx(v, 2), onInput: (v) => { Mm.g2 = v; updM(); } });
  LAB.slider('#m-eta', { label: '步长 $\\eta$', min: 0.01, max: 1, step: 0.01, value: 0.1, fmt: (v) => v.toFixed(2), onInput: (v) => { Mm.eta = v; updM(); } });
  let RM = null;
  const stM = [LAB.stat('#m-stats', '有效记忆步数 $1/(1-\\beta)$', 'coral'), LAB.stat('#m-stats', '半衰期 $\\ln2/\\ln(1/\\beta)$', 'amber'), LAB.stat('#m-stats', '切换后 AdaGrad 的步子', ''), LAB.stat('#m-stats', 'RMSProp 恢复到 90% 用了', 'leaf')];
  function updM() {
    const ts = [], sa = [], sr = []; let G = 0, v = 0, rec = -1;
    const full = Mm.eta * Mm.g2 / Mm.g2;
    for (let t = 1; t <= Mm.T; t++) {
      const g = t <= Mm.T1 ? Mm.g1 : Mm.g2; G += g * g; v = Mm.beta * v + (1 - Mm.beta) * g * g;
      const a = Mm.eta * g / Math.sqrt(G), r = Mm.eta * g / Math.sqrt(v / (1 - Math.pow(Mm.beta, t)));
      if (rec < 0 && t > Mm.T1 && r >= 0.9 * full) rec = t - Mm.T1;
      ts.push(t); sa.push(a); sr.push(r);
    }
    RM = { ts, sa, sr, rec };
    stM[0].set(fx(1 / (1 - Mm.beta), 1) + '<small>步</small>'); stM[1].set(fx(Math.log(2) / Math.log(1 / Mm.beta), 1) + '<small>步</small>');
    stM[2].set(fx(sa[Mm.T1], 6)); stM[3].set(rec > 0 ? `${rec}<small>步</small>` : `<small>${Mm.T - Mm.T1} 步内没恢复</small>`);
    const rows = [1, 10, 100, 1000, 10000, 1000000].map((t) => `<tr><td class="num">${t.toLocaleString()}</td><td class="num">${fx(t * Mm.g1 * Mm.g1, 0)}</td><td class="num">${fx(Mm.g1 * Math.sqrt(t), 2)}</td><td class="num" style="color:${C.coral}"><b>${fx(Mm.eta / Math.sqrt(t), 5)}</b></td><td class="num" style="color:${C.leaf}"><b>${fx(Mm.eta, 3)}</b></td></tr>`);
    $('#m-table').innerHTML = `<thead><tr><th>步数 t</th><th>AdaGrad 账本 ${LAB.tex('G_t=tg^2')}</th><th>分母 ${LAB.tex('\\sqrt{G_t}')}</th><th>AdaGrad 一步 ${LAB.tex('\\eta/\\sqrt t')}</th><th>RMSProp 一步（还原后）</th></tr></thead><tbody>${rows.join('')}</tbody>`;
    wC.redraw(); stepM.redraw();
  }
  const wC = LAB.canvas('#m-w', (ctx, w, h) => {
    const b = Mm.beta, Tm = 1 / (1 - b), K = Math.min(5000, Math.ceil(Tm * 4)), hl = Math.log(2) / Math.log(1 / b);
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: K, ymin: 0, ymax: (1 - b) * 1.12, xlabel: '过去了几步 k', ylabel: '权重', yfmt: (v) => fx(v, 4), pad: { l: 58, r: 12, t: 10, b: 36 } }).axes();
    const xs = M.range(201).map((i) => K * i / 200), ys = xs.map((k) => (1 - b) * Math.pow(b, k));
    const xsh = xs.filter((k) => k <= Tm);
    P.area(xsh, xsh.map((k) => (1 - b) * Math.pow(b, k)), C.c1, 0.18, 0);
    P.line(xs, ys, C.c1, 2.4);
    P.vline(hl, C.amber, [4, 3], 1.6); P.vline(Tm, C.coral, [4, 3], 1.6);
    P.text(hl, (1 - b) * 1.02, ` 半衰期 ${fx(hl, 1)}`, C.amber, 'left', 'middle', '600 12px ' + NUMF);
    P.text(Tm, (1 - b) * 0.85, ` 1/(1−β) = ${fx(Tm, 0)}`, C.coral, 'left', 'middle', '600 12px ' + NUMF);
  });
  const stepM = LAB.canvas('#m-step', (ctx, w, h) => {
    if (!RM) return;
    const all = RM.sa.concat(RM.sr), lo = Math.floor(Math.log10(Math.min(...all))), hi = Math.ceil(Math.log10(Math.max(...all) * 1.5));
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: Mm.T, ymin: Math.pow(10, lo), ymax: Math.pow(10, hi), logy: true, ytickValues: logTicks(lo, hi), xlabel: '步数 t', ylabel: '|Δw|', pad: { l: 52, r: 12, t: 10, b: 36 } }).axes();
    P.clip();
    P.vline(Mm.T1, C.slate, [4, 4], 1.2);
    P.line(RM.ts, RM.sa, C.c4, 2.4); P.line(RM.ts, RM.sr, C.c3, 2.4);
    P.unclip();
    P.text(Mm.T1, Math.pow(10, hi - 0.15), ' ← 高原 | 盆地 →', C.slate, 'center', 'middle', '12px ' + FONT);
  });
  updM();
})();
