/* 第 16 章 强化学习对齐：PPO、DPO 与 GRPO（交互实验） */
(function () {
  const { COLORS: C, M } = LAB;
  LAB.page({ bookRef: '对应书中 §16.1 策略梯度 · §16.2 PPO 限幅夹子 · §16.3 DPO 与 DeepSeek-R1 的 GRPO' });
  document.querySelectorAll('.formula').forEach((f) => { f.style.width = '0'; f.style.minWidth = '100%'; });
  const $ = (s) => document.querySelector(s);
  const FONT = getComputedStyle(document.body).getPropertyValue('--font');
  const NUMF = getComputedStyle(document.body).getPropertyValue('--font-num');
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = (e) => String(e).split('').map((c) => SUP[c] || c).join('');
  const sciParts = (x) => { let e = Math.floor(Math.log10(Math.abs(x))), m = +(x / Math.pow(10, e)).toPrecision(3); if (Math.abs(m) >= 10) { m /= 10; e++; } return [m, e]; };
  const fnum = (x, d) => { if (!isFinite(x)) return x > 0 ? '∞' : '–'; if (x === 0) return '0'; const a = Math.abs(x); if (a >= 1e5 || a < 1e-3) { const [m, e] = sciParts(x); return (m === 1 ? '' : m + '×') + '10' + sup(e); } return String(+x.toPrecision(d || 4)); };
  const sig = (u) => 1 / (1 + Math.exp(-u));
  const softmax = (t) => { const m = Math.max(...t), e = t.map((v) => Math.exp(v - m)), s = M.sum(e); return e.map((v) => v / s); };
  function label(ctx, txt, x, y, col, font, align, base) { ctx.fillStyle = col || C.ink; ctx.font = font || `12px ${FONT}`; ctx.textAlign = align || 'center'; ctx.textBaseline = base || 'middle'; ctx.fillText(txt, x, y); }

  /* ================= 实验 1：PPO 涨跌停夹子 ================= */
  const PP = { eps: 0.2, A: 10, rho: 1.5, K: 20, lr: 0.01 };
  const clip = (r) => M.clamp(r, 1 - PP.eps, 1 + PP.eps);
  const J = (r) => Math.min(r * PP.A, clip(r) * PP.A);
  const frozen = (r) => (PP.A > 0 && r > 1 + PP.eps) || (PP.A < 0 && r < 1 - PP.eps);
  const sA = LAB.slider('#p-A', { label: '相对得分 $\\hat A$', min: -10, max: 10, step: 0.5, value: 10, onInput: (v) => { PP.A = v; upd1(); } });
  LAB.slider('#p-eps', { label: '限幅比例 $\\epsilon$', min: 0.05, max: 0.5, step: 0.01, value: 0.2, fmt: (v) => `${v.toFixed(2)}（[${(1 - v).toFixed(2)}, ${(1 + v).toFixed(2)}]）`, onInput: (v) => { PP.eps = v; upd1(); } });
  const sR = LAB.slider('#p-rho', { label: '新旧概率比 $\\rho$', min: 0.1, max: 2.2, step: 0.01, value: 1.5, fmt: (v) => v.toFixed(2), onInput: (v) => { PP.rho = v; upd1(); } });
  $('#p-case1').onclick = () => { PP.A = 10; PP.rho = 1.5; sA.set(10); sR.set(1.5); upd1(); };
  $('#p-case2').onclick = () => { PP.A = -10; PP.rho = 0.5; sA.set(-10); sR.set(0.5); upd1(); };
  LAB.slider('#p-K', { label: '同一批数据训练的轮数 $K$', min: 1, max: 60, step: 1, value: PP.K, onInput: (v) => { PP.K = v; upd1(); } });
  LAB.slider('#p-lr', { label: '学习率', min: 0.002, max: 0.05, step: 0.001, value: PP.lr, fmt: (v) => v.toFixed(3), onInput: (v) => { PP.lr = v; upd1(); } });
  const objCv = LAB.canvas('#p-obj', (ctx, w, h) => {
    const A = PP.A, ys = [0, 2.2 * A, (1 + PP.eps) * A, (1 - PP.eps) * A], lo = Math.min(...ys), hi = Math.max(...ys), pad = (hi - lo) * 0.1 + 0.5;
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: 2.2, ymin: lo - pad, ymax: hi + pad, xtickValues: [0, 0.5, 1 - PP.eps, 1, 1 + PP.eps, 1.5, 2], xfmt: (v) => String(+v.toFixed(2)), xlabel: '新旧概率比 ρ', ylabel: '目标', pad: { l: 46, r: 10, t: 12, b: 36 } }).axes();
    if (A !== 0) { const [a, b] = A > 0 ? [1 + PP.eps, 2.2] : [0, 1 - PP.eps]; ctx.fillStyle = 'rgba(209,73,91,.1)'; ctx.fillRect(P.tx(a), P.y1, P.tx(b) - P.tx(a), P.y0 - P.y1); P.text((a + b) / 2, hi + pad * 0.5, '斜率 = 0（熔断）', C.c4, 'center', 'middle', `600 11.5px ${FONT}`); }
    P.hline(0, C.slate, null, 0.8);
    P.fn((r) => r * A, '#9aa5b1', 1.6, [6, 4]); P.fn(J, C.c1, 2.8, null, 600);
    P.vline(PP.rho, C.ink, [2, 3], 1);
    P.points([PP.rho], [PP.rho * A], '#9aa5b1', 4.5, '#fff'); P.points([PP.rho], [J(PP.rho)], C.c1, 5.5, '#fff');
    P.text(PP.rho, J(PP.rho), `  J = ${+J(PP.rho).toFixed(3)}`, C.c1, 'left', A >= 0 ? 'top' : 'bottom', `600 12px ${NUMF}`);
  });
  const VOC = ['首先', '我们', '设', '因为', '所以', '答案'], POLD = [0.05, 0.35, 0.2, 0.15, 0.15, 0.1];
  let SIM = null;
  function sim() {
    const run = (useClip) => { const th = POLD.map(Math.log), tr = [0.05]; let p = POLD.slice(); for (let k = 0; k < PP.K; k++) { const rho = p[0] / POLD[0], act = !useClip || !frozen(rho); if (act) for (let j = 0; j < 6; j++) th[j] += PP.lr * PP.A * rho * ((j === 0 ? 1 : 0) - p[j]); p = softmax(th); tr.push(p[0]); } return { tr, p }; };
    SIM = { off: run(false), on: run(true) };
  }
  const trajCv = LAB.canvas('#p-traj', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: PP.K, ymin: 1e-3, ymax: 1, logy: true, ytickValues: [1e-3, 0.01, 0.05, 0.1, 0.5, 1], xlabel: '训练轮数', ylabel: 'p(首先)', pad: { l: 44, r: 8, t: 10, b: 36 } }).axes();
    P.hline(0.05, '#9aa5b1', [4, 3], 1); P.hline(0.05 * (1 + PP.eps), C.c3, [2, 3], 1); P.hline(0.05 * (1 - PP.eps), C.c3, [2, 3], 1);
    const xs = M.range(PP.K + 1); P.line(xs, SIM.off.tr.map((v) => Math.max(v, 1e-3)), C.c4, 2.4); P.line(xs, SIM.on.tr.map((v) => Math.max(v, 1e-3)), C.c3, 2.6);
  });
  const distCv = LAB.canvas('#p-dist', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: 0.4, xmax: 6.6, ymin: 0, ymax: 1, xtickValues: [1, 2, 3, 4, 5, 6], xfmt: (v) => VOC[v - 1], yfmt: (v) => Math.round(v * 100) + '%', ylabel: '概率', pad: { l: 44, r: 8, t: 10, b: 30 } }).axes();
    const bw = Math.min(14, (P.tx(2) - P.tx(1)) * 0.26);
    [[POLD, '#9aa5b1'], [SIM.off.p, C.c4], [SIM.on.p, C.c3]].forEach(([p, col], q) => P.bars([1, 2, 3, 4, 5, 6].map((x) => x + ((q - 1) * bw * 1.15) / (P.tx(2) - P.tx(1))), p, col, bw));
  });
  const ps = [LAB.stat('#p-stats', '不带夹子 $\\rho A$', ''), LAB.stat('#p-stats', '夹住后 $\\operatorname{clip}(\\rho)A$', 'amber'), LAB.stat('#p-stats', 'PPO 取较小者 $J$', 'teal'), LAB.stat('#p-stats', '对 $\\rho$ 的斜率 $\\partial J/\\partial\\rho$', 'coral')];
  function upd1() {
    const r = PP.rho; ps[0].set(fnum(r * PP.A, 4)); ps[1].set(fnum(clip(r) * PP.A, 4)); ps[2].set(fnum(J(r), 4)); ps[3].set(frozen(r) ? '0<small>（熔断）</small>' : fnum(PP.A, 3));
    sim(); objCv.redraw(); trajCv.redraw(); distCv.redraw();
  }
  upd1();

  /* ================= 实验 2：DPO 隐式奖励 ================= */
  const DP = { beta: 0.1, lw: 0, ll: 0, T: 300 };
  const PREF = [0.3, 0.25, 0.18, 0.12, 0.09, 0.06], RW = [0, 0.15, -0.1, 0.3, 0.05, -0.2], NA = 6;
  LAB.slider('#d-beta', { label: '弹簧强度 $\\beta$', min: 0.05, max: 1, step: 0.01, value: 0.1, fmt: (v) => v.toFixed(2), onInput: (v) => { DP.beta = v; upd2(); } });
  LAB.slider('#d-lw', { label: '好答案 $\\ln\\frac{\\pi_{\\mathbf w}(y_w)}{\\pi_{\\text{ref}}(y_w)}$', min: -3, max: 3, step: 0.05, value: 0, fmt: (v) => v.toFixed(2), onInput: (v) => { DP.lw = v; upd2a(); } });
  LAB.slider('#d-ll', { label: '差答案 $\\ln\\frac{\\pi_{\\mathbf w}(y_l)}{\\pi_{\\text{ref}}(y_l)}$', min: -3, max: 3, step: 0.05, value: 0, fmt: (v) => v.toFixed(2), onInput: (v) => { DP.ll = v; upd2a(); } });
  LAB.slider('#d-T', { label: '训练步数', min: 0, max: 1000, step: 10, value: DP.T, onInput: (v) => { DP.T = v; upd2(); } });
  LAB.slider('#d-lr', { label: '学习率 ×$1/\\beta^2$', min: 0.1, max: 2, step: 0.1, value: 0.5, fmt: (v) => v.toFixed(1), onInput: (v) => { DP.lr0 = v; upd2(); } });
  DP.lr0 = 0.5;
  const lossCv = LAB.canvas('#d-loss', (ctx, w, h) => {
    const u = DP.beta * (DP.lw - DP.ll);
    const P = new LAB.Plot(ctx, w, h, { xmin: -6, xmax: 6, ymin: 0, ymax: 4, xlabel: 'u = r̂_w − r̂_l', pad: { l: 40, r: 10, t: 10, b: 36 } }).axes();
    P.fn((x) => Math.log(1 + Math.exp(-x)), C.c1, 2.4); P.fn((x) => sig(-x), C.c2, 2.2);
    P.vline(u, C.ink, [2, 3], 1); P.points([u, u], [Math.log(1 + Math.exp(-u)), sig(-u)], C.ink, 4.5, '#fff');
  });
  let TR = null;
  function train() {
    const b = DP.beta, lr = DP.lr0 / (b * b), th = PREF.map(Math.log), np = (NA * (NA - 1)) / 2, lossH = [];
    const lossOf = (l) => { let L = 0; for (let i = 0; i < NA; i++) for (let j = i + 1; j < NA; j++) { const u = b * (l[i] - l[j]), P = sig(RW[i] - RW[j]); L += -(P * Math.log(sig(u)) + (1 - P) * Math.log(sig(-u))); } return L / np; };
    for (let t = 0; t <= DP.T; t++) {
      const p = softmax(th), l = p.map((v, i) => Math.log(v / PREF[i]));
      if (t % 10 === 0) lossH.push(lossOf(l));
      if (t === DP.T) { TR = { p, l, loss: lossOf(l), lossH }; break; }
      const g = new Array(NA).fill(0);
      for (let i = 0; i < NA; i++) for (let j = 0; j < NA; j++) if (i !== j) g[i] += (b * (sig(b * (l[i] - l[j])) - sig(RW[i] - RW[j]))) / np;
      for (let i = 0; i < NA; i++) th[i] -= lr * g[i];
    }
    const s = PREF.map((p, i) => p * Math.exp(RW[i] / b)), Z = M.sum(s); TR.star = s.map((v) => v / Z);
    TR.kl = M.kl(TR.p, TR.star);
  }
  const barsCv = LAB.canvas('#d-bars', (ctx, w, h) => {
    const top = Math.max(...TR.star, ...TR.p, ...PREF) * 1.15;
    const P = new LAB.Plot(ctx, w, h, { xmin: 0.4, xmax: 6.6, ymin: 0, ymax: top, xtickValues: [1, 2, 3, 4, 5, 6], xfmt: (v) => `答案${v}`, yfmt: (v) => Math.round(v * 100) + '%', ylabel: '概率', pad: { l: 44, r: 8, t: 10, b: 30 } }).axes();
    const unit = P.tx(2) - P.tx(1), bw = Math.min(16, unit * 0.32);
    P.bars([1, 2, 3, 4, 5, 6].map((x) => x - (bw * 0.6) / unit), PREF, '#9aa5b1', bw); P.bars([1, 2, 3, 4, 5, 6].map((x) => x + (bw * 0.6) / unit), TR.p, C.c3, bw);
    TR.star.forEach((v, i) => { const X = P.tx(i + 1); ctx.strokeStyle = C.c4; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(X - bw * 1.3, P.ty(v)); ctx.lineTo(X + bw * 1.3, P.ty(v)); ctx.stroke(); });
    RW.forEach((r, i) => label(ctx, `r=${r}`, P.tx(i + 1), P.y1 + 8, C.slate, `10.5px ${NUMF}`));
  });
  const scatCv = LAB.canvas('#d-scatter', (ctx, w, h) => {
    const imp = TR.l.map((v) => DP.beta * v), mi = M.mean(imp), mr = M.mean(RW), xs = RW.map((r) => r - mr), ys = imp.map((v) => v - mi), lim = Math.max(0.35, ...xs.map(Math.abs), ...ys.map(Math.abs)) * 1.15;
    const P = new LAB.Plot(ctx, w, h, { xmin: -lim, xmax: lim, ymin: -lim, ymax: lim, xlabel: '真实奖励 r（减去平均）', ylabel: '隐式奖励（减去平均）', pad: { l: 50, r: 10, t: 10, b: 36 }, xticks: 4, yticks: 4 }).axes();
    P.fn((x) => x, '#9aa5b1', 1.2, [5, 4]); P.points(xs, ys, C.c3, 5.5, '#fff');
  });
  const ds = [LAB.stat('#d-stats', '隐式奖励 $\\hat r_w$ / $\\hat r_l$', ''), LAB.stat('#d-stats', '损失 $-\\ln\\sigma(u)$', 'teal'), LAB.stat('#d-stats', '斜率力度 $\\sigma(\\hat r_l-\\hat r_w)$', 'amber'), LAB.stat('#d-stats', '训练后 $D_{\\text{KL}}(\\pi_{\\mathbf w}\\|\\pi^*)$', 'leaf')];
  function upd2a() { const rw = DP.beta * DP.lw, rl = DP.beta * DP.ll, u = rw - rl; ds[0].set(`${rw.toFixed(3)}<small> / ${rl.toFixed(3)}</small>`); ds[1].set(Math.log(1 + Math.exp(-u)).toFixed(4)); ds[2].set(sig(-u).toFixed(4)); lossCv.redraw(); }
  function upd2() { train(); ds[3].set(fnum(TR.kl, 3)); upd2a(); barsCv.redraw(); scatCv.redraw(); }
  upd2();

  /* ================= 实验 3：GRPO 八份草稿 ================= */
  const GP = { G: 8, eps: 0.2, bkl: 0.04, shift: 0.5, n: 1000, seed: 1 };
  const BOOK = [1, 0, 1, 0, 0, 0, 1, 1], CPU = [1, 0, 1, 0.2, 0, 0, 1, 1], RHO = [1.15, 0.85, 1.3, 0.9, 0.7, 0.95, 1.05, 1.1];
  let RWD = BOOK.concat(BOOK);
  LAB.slider('#g-G', { label: '草稿份数 $G$', min: 2, max: 16, step: 1, value: 8, onInput: (v) => { GP.G = v; upd3(); } });
  LAB.slider('#g-eps', { label: 'PPO 限幅 $\\epsilon$', min: 0.05, max: 0.4, step: 0.01, value: 0.2, fmt: (v) => v.toFixed(2), onInput: (v) => { GP.eps = v; upd3(); } });
  LAB.slider('#g-bkl', { label: 'KL 拉回系数 $\\beta$', min: 0, max: 0.2, step: 0.01, value: 0.04, fmt: (v) => v.toFixed(2), onInput: (v) => { GP.bkl = v; upd3(); } });
  $('#g-book').onclick = () => { RWD = BOOK.concat(BOOK); upd3(); };
  $('#g-cpu').onclick = () => { RWD = CPU.concat(CPU); upd3(); };
  let GR = null;
  function grpo() {
    const R = RWD.slice(0, GP.G), mu = M.mean(R), sd = M.std(R), A = R.map((r) => (r - mu) / (sd + 1e-8));
    const rho = M.range(GP.G).map((i) => RHO[i % 8]), surr = rho.map((p, i) => Math.min(p * A[i], M.clamp(p, 1 - GP.eps, 1 + GP.eps) * A[i])), k3 = rho.map((p) => { const r = 1 / p; return r - 1 - Math.log(r); });
    const obj = surr.map((s, i) => s - GP.bkl * k3[i]);
    GR = { R, mu, sd, A, rho, surr, k3, obj };
  }
  const draftsEl = $('#g-drafts');
  function renderDrafts() {
    draftsEl.innerHTML = GR.R.map((r, i) => `<div class="draft ${r === 1 ? 'ok' : r === 0.2 ? 'fmt' : 'bad'}" data-i="${i}"><div>草稿 ${i + 1}</div><div class="r">${r === 1 ? '1' : r === 0.2 ? '0.2' : '0'}</div><div class="a">Â = ${GR.A[i] >= 0 ? '+' : ''}${GR.A[i].toFixed(2)}</div></div>`).join('');
  }
  draftsEl.addEventListener('click', (e) => { const d = e.target.closest('.draft'); if (!d) return; const i = +d.dataset.i, r = RWD[i]; RWD[i] = r === 1 ? 0.2 : r === 0.2 ? 0 : 1; upd3(); });
  const barsCv3 = LAB.canvas('#g-bars', (ctx, w, h) => {
    const G = GP.G, all = GR.A.concat(GR.surr, GR.obj), lim = Math.max(1.2, ...all.map(Math.abs)) * 1.12;
    const P = new LAB.Plot(ctx, w, h, { xmin: 0.4, xmax: G + 0.6, ymin: -lim, ymax: lim, xtickValues: M.range(G).map((i) => i + 1), xlabel: '草稿编号', pad: { l: 40, r: 8, t: 10, b: 36 } }).axes();
    P.hline(0, C.slate, null, 1);
    const unit = P.tx(2) - P.tx(1), bw = Math.min(12, unit * 0.24);
    [[GR.A, C.c6], [GR.surr, C.c1], [GR.k3.map((k) => -GP.bkl * k), C.c4]].forEach(([arr, col], q) => P.bars(M.range(G).map((i) => i + 1 + ((q - 1) * bw * 1.15) / unit), arr, col, bw));
  });
  const k3Cv = LAB.canvas('#g-k3', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: 0.2, xmax: 3, ymin: -1.2, ymax: 1.6, xlabel: '比值 r = π_ref / π_w', pad: { l: 40, r: 10, t: 10, b: 36 } }).axes();
    P.hline(0, C.slate, null, 1);
    P.fn((r) => -Math.log(r), '#9aa5b1', 2); P.fn((r) => 0.5 * (r - 1) ** 2, C.c2, 1.6, [5, 4]); P.fn((r) => r - 1 - Math.log(r), C.c4, 2.6);
    [0.5, 1.5].forEach((r) => { const k = r - 1 - Math.log(r); P.points([r], [k], C.c4, 4.5, '#fff'); P.text(r, k, `  k₃(${r}) = ${k.toFixed(3)}`, C.c4, 'left', 'bottom', `600 11px ${NUMF}`); });
  });
  // 抽样估计 KL
  const V = 10, BASE = M.range(V).map((i) => 1 / (i + 1.5)), Rz = LAB.rng(17), ZV = M.range(V).map(() => Rz.normal());
  let EST = null;
  function estimate() {
    const lref = BASE.map(Math.log), pref = softmax(lref), pw = softmax(lref.map((v, i) => v + GP.shift * ZV[i]));
    const kl = M.kl(pw, pref), R = LAB.rng(500 + GP.seed), k1 = [], k3 = [];
    for (let s = 0; s < GP.n; s++) { const y = R.choice(pw), r = pref[y] / pw[y]; k1.push(-Math.log(r)); k3.push(r - 1 - Math.log(r)); }
    EST = { kl, k1, k3 };
  }
  LAB.slider('#g-shift', { label: '新模型偏离参考模型的程度', min: 0, max: 1.5, step: 0.05, value: 0.5, fmt: (v) => v.toFixed(2), onInput: (v) => { GP.shift = v; updEst(); } });
  LAB.slider('#g-n', { label: '抽样个数', min: 10, max: 3000, step: 10, value: 1000, onInput: (v) => { GP.n = v; updEst(); } });
  $('#g-resample').onclick = () => { GP.seed++; updEst(); };
  const estCv = LAB.canvas('#g-est', (ctx, w, h) => {
    const all = EST.k1.concat(EST.k3), lo = Math.min(0, ...all), hi = Math.max(...all, EST.kl * 2, 0.05), nb = 30, bwv = (hi - lo) / nb;
    const hist = (arr) => { const c = new Array(nb).fill(0); arr.forEach((v) => { c[Math.min(nb - 1, Math.floor((v - lo) / bwv))]++; }); return c.map((x) => x / arr.length); };
    const h1 = hist(EST.k1), h3 = hist(EST.k3), top = Math.max(...h1, ...h3) * 1.1;
    const P = new LAB.Plot(ctx, w, h, { xmin: lo, xmax: hi, ymin: 0, ymax: top, xticks: 5, yfmt: (v) => Math.round(v * 100) + '%', xlabel: '单个样本的估计值', pad: { l: 40, r: 10, t: 10, b: 36 } }).axes();
    const bp = P.tx(lo + bwv) - P.tx(lo);
    ctx.globalAlpha = 0.55; h1.forEach((v, i) => { ctx.fillStyle = '#9aa5b1'; ctx.fillRect(P.tx(lo + i * bwv) + 1, P.ty(v), bp - 2, P.ty(0) - P.ty(v)); }); ctx.globalAlpha = 0.7; h3.forEach((v, i) => { ctx.fillStyle = C.c4; ctx.fillRect(P.tx(lo + i * bwv) + bp * 0.25, P.ty(v), bp * 0.5, P.ty(0) - P.ty(v)); }); ctx.globalAlpha = 1;
    P.vline(EST.kl, C.ink, null, 2); P.vline(M.mean(EST.k1), '#6b7785', [5, 3], 1.6); P.vline(M.mean(EST.k3), C.c4, [5, 3], 1.6);
    if (lo < 0) P.vline(0, C.slate, null, 0.8);
  });
  const gs = [LAB.stat('#g-stats', '小组平均分 $\\mu_R$', ''), LAB.stat('#g-stats', '小组标准差 $\\sigma_R$', 'plum'), LAB.stat('#g-stats', '相对加分之和 $\\sum\\hat A_i$', 'teal'), LAB.stat('#g-stats', '平均目标 $\\frac1G\\sum(\\text{PPO}-\\beta k_3)$', 'leaf')];
  const es = [LAB.stat('#g-stats2', '真实 $D_{\\text{KL}}(\\pi_{\\mathbf w}\\|\\pi_{\\text{ref}})$', ''), LAB.stat('#g-stats2', '旧式 $-\\ln r$：平均 ± 标准差', ''), LAB.stat('#g-stats2', '$k_3$：平均 ± 标准差', 'coral'), LAB.stat('#g-stats2', '$-\\ln r$ 为负的样本占比', 'amber')];
  function updEst() {
    estimate();
    es[0].set(EST.kl.toFixed(4)); es[1].set(`${M.mean(EST.k1).toFixed(4)}<small> ± ${M.std(EST.k1).toFixed(3)}</small>`); es[2].set(`${M.mean(EST.k3).toFixed(4)}<small> ± ${M.std(EST.k3).toFixed(3)}</small>`);
    es[3].set((100 * EST.k1.filter((v) => v < 0).length / EST.k1.length).toFixed(1) + '<small>%</small>');
    $('#g-est-sub').textContent = `从新模型抽 ${GP.n} 个词`;
    estCv.redraw();
  }
  function upd3() {
    grpo(); renderDrafts();
    gs[0].set(GR.mu.toFixed(3)); gs[1].set(GR.sd.toFixed(3)); gs[2].set(fnum(Math.abs(M.sum(GR.A)) < 1e-9 ? 0 : M.sum(GR.A), 3)); gs[3].set(M.mean(GR.obj).toFixed(4));
    barsCv3.redraw(); k3Cv.redraw();
  }
  upd3(); updEst();
})();
