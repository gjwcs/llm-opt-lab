/* 第 11 章：一张游戏显卡怎么训大模型？—— 交互实验 */
(function () {
  const { COLORS: C, M } = LAB;
  LAB.page({ bookRef: '对应书中 §11.1 7B 模型的显存小票 · §11.2 LoRA 与 GaLore 换走廊 · §11.3 LOMO 与 BAdam · §11.4 五大方案对比' });
  document.querySelectorAll('.formula').forEach((f) => { f.style.width = '0'; f.style.minWidth = '100%'; });
  const $ = (s) => document.querySelector(s);
  const FONT = getComputedStyle(document.body).getPropertyValue('--font');
  const NUMF = getComputedStyle(document.body).getPropertyValue('--font-num');
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = (e) => String(e).split('').map((c) => SUP[c] || c).join('');
  const sciParts = (x) => { let e = Math.floor(Math.log10(Math.abs(x))), m = +(x / Math.pow(10, e)).toPrecision(3); if (Math.abs(m) >= 10) { m /= 10; e++; } return [m, e]; };
  const fnum = (x, d) => { if (!isFinite(x)) return x > 0 ? '∞' : '–'; if (x === 0) return '0'; const a = Math.abs(x); if (a >= 1e5 || a < 1e-3) { const [m, e] = sciParts(x); return (m === 1 ? '' : m + '×') + '10' + sup(e); } return String(+x.toPrecision(d || 4)); };
  const gb = (b) => { const v = b / 1e9; return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + ' GB'; };
  const isActive = (sec) => sec.classList.contains('active');
  function label(ctx, txt, x, y, col, font, align, base) { ctx.fillStyle = col || C.ink; ctx.font = font || `12px ${FONT}`; ctx.textAlign = align || 'center'; ctx.textBaseline = base || 'middle'; ctx.fillText(txt, x, y); }
  // 单边 Jacobi SVD：输入行优先 n×n，返回 {s, U(列向量数组)}，降序
  function svd(A, n) {
    const Cc = []; for (let j = 0; j < n; j++) { const c = new Float64Array(n); for (let i = 0; i < n; i++) c[i] = A[i * n + j]; Cc.push(c); }
    for (let sweep = 0; sweep < 60; sweep++) {
      let off = 0;
      for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
        const up = Cc[p], uq = Cc[q]; let a = 0, b = 0, g = 0;
        for (let i = 0; i < n; i++) { a += up[i] * up[i]; b += uq[i] * uq[i]; g += up[i] * uq[i]; }
        if (a * b === 0 || Math.abs(g) <= 1e-15 * Math.sqrt(a * b)) continue;
        off = Math.max(off, Math.abs(g) / Math.sqrt(a * b));
        const z = (b - a) / (2 * g), t = Math.sign(z || 1) / (Math.abs(z) + Math.sqrt(1 + z * z)), c = 1 / Math.sqrt(1 + t * t), s = c * t;
        for (let i = 0; i < n; i++) { const x = up[i], y = uq[i]; up[i] = c * x - s * y; uq[i] = s * x + c * y; }
      }
      if (off < 1e-13) break;
    }
    const sig = Cc.map((u) => Math.hypot(...u)), ord = M.range(n).sort((i, j) => sig[j] - sig[i]);
    return { s: ord.map((i) => sig[i]), U: ord.map((i) => Cc[i].map((v) => v / (sig[i] || 1))) };
  }
  function orthRows(R, n) { const Q = []; for (let j = 0; j < n; j++) { const v = Float64Array.from({ length: n }, () => R.normal()); for (const q of Q) { let p = 0; for (let i = 0; i < n; i++) p += v[i] * q[i]; for (let i = 0; i < n; i++) v[i] -= p * q[i]; } const s = Math.hypot(...v); for (let i = 0; i < n; i++) v[i] /= s; Q.push(v); } return Q; }
  function heatImg(ctx, arr, n, mcols, x0, y0, side, sideH, mx) {
    const off = document.createElement('canvas'); off.width = mcols; off.height = n;
    const oc = off.getContext('2d'), img = oc.createImageData(mcols, n);
    for (let k = 0; k < n * mcols; k++) { const c = LAB.diverge(arr[k] / mx).match(/\d+/g).map(Number); img.data[4 * k] = c[0]; img.data[4 * k + 1] = c[1]; img.data[4 * k + 2] = c[2]; img.data[4 * k + 3] = 255; }
    oc.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(off, x0, y0, side, sideH);
    ctx.strokeStyle = '#9aa5b1'; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, side - 1, sideH - 1);
  }

  /* ================= 实验 1：斜率天生是扁的 ================= */
  const sec1 = $('#lowrank');
  const L1 = { u: Math.log10(201), r: 3, slow: 3, seed: 3 };
  const N1 = 32, ETA = 0.5, TU = M.linspace(0, 4, 61);
  let B1 = null, CUR = null;
  const tOf = (u) => Math.round(Math.pow(10, u) - 1);
  function build1() {
    const R = LAB.rng(100 + L1.seed), E0 = Float64Array.from({ length: N1 * N1 }, () => R.normal()), Q = orthRows(R, N1);
    // 少数几条“慢走廊”（曲率 0.001–0.01）+ 一大片“快方向”（曲率 0.1–1）
    const ks = L1.slow, lam = M.range(N1).map((j) => (j < N1 - ks ? Math.pow(10, -j / Math.max(1, N1 - ks - 1)) : Math.pow(10, -2 - (j - (N1 - ks)) / Math.max(1, ks - 1 || 1))));
    const Gat = (t) => { const c = lam.map((l) => l * Math.pow(1 - ETA * l, t)), G = new Float64Array(N1 * N1); for (let i = 0; i < N1; i++) for (let k = 0; k < N1; k++) { const e = E0[i * N1 + k] * c[k]; if (e === 0) continue; const q = Q[k]; for (let j = 0; j < N1; j++) G[i * N1 + j] += e * q[j]; } return G; };
    const curve = TU.map((u) => svd(Gat(tOf(u)), N1).s);
    B1 = { Gat, curve, lam };
  }
  function cur1() { const G = B1.Gat(tOf(L1.u)), r = svd(G, N1); CUR = { G, s: r.s, U: r.U }; }
  const energy = (s, r) => { const t = s.reduce((a, v) => a + v * v, 0); return s.slice(0, r).reduce((a, v) => a + v * v, 0) / t; };
  const sT = LAB.slider('#l-t', { label: '训练步数 $t$', min: 0, max: 4, step: 0.01, value: L1.u, fmt: (v) => tOf(v).toLocaleString(), onInput: (v) => { L1.u = v; cur1(); upd1(); } });
  LAB.slider('#l-r', { label: '走廊宽度（保留的秩）$r$', min: 1, max: 16, step: 1, value: L1.r, onInput: (v) => { L1.r = v; upd1(); } });
  LAB.slider('#l-kappa', { label: '慢走廊（小曲率方向）的条数', min: 1, max: 12, step: 1, value: L1.slow, onInput: (v) => { L1.slow = v; build1(); cur1(); upd1(); } });
  $('#l-seed').onclick = () => { L1.seed++; build1(); cur1(); upd1(); };
  let playing = false;
  $('#l-play').onclick = () => {
    if (playing) return; playing = true; let u = 0;
    const tick = () => { u = Math.min(4, u + 0.035); L1.u = u; sT.set(u); cur1(); upd1(); if (u < 4 && isActive(sec1)) requestAnimationFrame(tick); else playing = false; };
    requestAnimationFrame(tick);
  };
  const barsCv = LAB.canvas('#l-bars', (ctx, w, h) => {
    const s = CUR.s, lo = 1e-6;
    const P = new LAB.Plot(ctx, w, h, { xmin: 0.3, xmax: N1 + 0.7, ymin: lo, ymax: 2, logy: true, xtickValues: [1, 4, 8, 12, 16, 20, 24, 28, 32], ytickValues: [1e-6, 1e-4, 0.01, 1], xlabel: '奇异值序号 i', ylabel: 'σᵢ / σ₁', pad: { l: 46, r: 10, t: 10, b: 36 } }).axes();
    const xs = M.range(N1).map((i) => i + 1), bw = (P.tx(2) - P.tx(1)) * 0.72;
    P.bars(xs, s.map((v) => Math.max(lo, v / s[0])), xs.map((i) => (i <= L1.r ? C.c6 : '#cfd6de')), bw, lo);
    P.vline(L1.r + 0.5, C.c4, [4, 3], 1.4);
    P.text(L1.r + 0.8, 1.2, `r = ${L1.r}`, C.c4, 'left', 'top', `600 12px ${NUMF}`);
    P.text(N1 + 0.5, 1.2, `第 ${tOf(L1.u).toLocaleString()} 步`, C.ink, 'right', 'top', `600 12px ${FONT}`);
  });
  const enCv = LAB.canvas('#l-energy', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: 4, ymin: 0, ymax: 1, xtickValues: [0, 10, 100, 1000, 10000].map((t) => Math.log10(t + 1)), xfmt: (u) => tOf(u).toLocaleString(), yfmt: (v) => Math.round(v * 100) + '%', xlabel: '训练步数 t', pad: { l: 44, r: 10, t: 10, b: 36 } }).axes();
    [1, 4, 8].forEach((rr, q) => { if (rr === L1.r) return; P.line(TU, B1.curve.map((s) => energy(s, rr)), ['#cfd6de', '#b9c3ce', '#a3afbc'][q], 1.4, [4, 3]); P.text(4, energy(B1.curve[B1.curve.length - 1], rr), `r=${rr} `, '#9aa5b1', 'right', 'bottom', `10.5px ${NUMF}`); });
    P.line(TU, B1.curve.map((s) => energy(s, L1.r)), C.c6, 2.6);
    P.vline(L1.u, C.ink, [2, 3], 1);
    P.points([L1.u], [energy(CUR.s, L1.r)], C.c6, 4.5, '#fff');
  });
  const heatCv = LAB.canvas('#l-heat', (ctx, w, h) => {
    const G = CUR.G, r = L1.r, n = N1, gap = 14, side = Math.min((w - gap) / 2, h - 26);
    const Pg = new Float64Array(n * n);
    for (let q = 0; q < r; q++) { const u = CUR.U[q]; for (let j = 0; j < n; j++) { let c = 0; for (let i = 0; i < n; i++) c += u[i] * G[i * n + j]; for (let i = 0; i < n; i++) Pg[i * n + j] += u[i] * c; } }
    let mx = 0; for (const v of G) mx = Math.max(mx, Math.abs(v));
    const x0 = (w - 2 * side - gap) / 2;
    heatImg(ctx, G, n, n, x0, 4, side, side, mx || 1); heatImg(ctx, Pg, n, n, x0 + side + gap, 4, side, side, mx || 1);
    label(ctx, '完整斜率 G', x0 + side / 2, side + 16, C.ink); label(ctx, `只留前 ${r} 条走廊`, x0 + side * 1.5 + gap, side + 16, C.ink);
  });
  const l1 = LAB.stat('#l-stats', '前 $r$ 条走廊的能量占比', 'teal');
  const l2 = LAB.stat('#l-stats', '$\\sigma_{r+1}/\\sigma_1$', 'coral');
  const l3 = LAB.stat('#l-stats', '有效秩 $e^{H(\\sigma^2)}$', 'plum');
  const l4 = LAB.stat('#l-stats', 'Adam 账本只需原来的 $r/m$', 'leaf');
  function upd1() {
    const s = CUR.s, e = energy(s, L1.r), tot = s.reduce((a, v) => a + v * v, 0), p = s.map((v) => (v * v) / tot), H = -p.reduce((a, v) => a + (v > 0 ? v * Math.log(v) : 0), 0);
    l1.set((e * 100).toFixed(e > 0.999 ? 2 : 1) + '<small>%</small>'); l2.set(fnum(s[L1.r] / s[0], 3)); l3.set(Math.exp(H).toFixed(2)); l4.set(`${L1.r}/${N1}<small> = ${((100 * L1.r) / N1).toFixed(1)}%</small>`);
    barsCv.redraw(); enCv.redraw(); heatCv.redraw();
  }
  build1(); cur1(); upd1();

  /* ================= 实验 2：GaLore 换走廊 ================= */
  const G2 = { target: 0, r: 2, T: 15, lr: 0.25, steps: 60, at: 60 };
  const N2 = 8, SV = [8, 7, 6, 5, 4, 3, 2, 1], NEVER = 61;
  let RUN2 = null;
  function targetMat() {
    const Wt = new Float64Array(N2 * N2);
    if (G2.target === 0) { SV.forEach((v, i) => { Wt[i * N2 + i] = v; }); return Wt; }
    const R = LAB.rng(77), U = orthRows(R, N2), V = orthRows(R, N2);
    for (let i = 0; i < N2; i++) for (let j = 0; j < N2; j++) { let v = 0; for (let k = 0; k < N2; k++) v += U[k][i] * SV[k] * V[k][j]; Wt[i * N2 + j] = v; }
    return Wt;
  }
  function run2() {
    const Wt = targetMat(), r = G2.r, T = G2.T, steps = G2.steps;
    const sim = (mode) => {
      const W = new Float64Array(N2 * N2), hist = [W.slice()], loss = [], Ps = [], sw = [];
      let P = null;
      const lossOf = () => { let l = 0; for (let i = 0; i < N2 * N2; i++) l += (W[i] - Wt[i]) ** 2; return 0.5 * l; };
      loss.push(lossOf());
      for (let t = 0; t < steps; t++) {
        const G = W.map((v, i) => v - Wt[i]);
        if (mode === 'full') { for (let i = 0; i < N2 * N2; i++) W[i] -= G2.lr * G[i]; }
        else {
          const need = P === null || (mode === 'switch' && T < NEVER && t % T === 0);
          if (need) { P = svd(G, N2).U.slice(0, r); sw.push(t); }
          for (let j = 0; j < N2; j++) for (let q = 0; q < r; q++) { const p = P[q]; let c = 0; for (let i = 0; i < N2; i++) c += p[i] * G[i * N2 + j]; for (let i = 0; i < N2; i++) W[i * N2 + j] -= G2.lr * p[i] * c; }
        }
        Ps.push(P); hist.push(W.slice()); loss.push(lossOf());
      }
      return { loss, hist, Ps, sw };
    };
    RUN2 = { Wt, sw: sim('switch'), fixed: sim('fixed'), full: sim('full'), floor: 0.5 * SV.slice(r).reduce((a, v) => a + v * v, 0) };
  }
  LAB.segmented('#g-target', ['书中 $\\operatorname{diag}(8,\\dots,1)$', '随机满秩矩阵'], 0, (i) => { G2.target = i; upd2(); });
  LAB.slider('#g-r', { label: '走廊宽度 $r$', min: 1, max: 8, step: 1, value: 2, onInput: (v) => { G2.r = v; upd2(); } });
  LAB.slider('#g-T', { label: '每隔 $T$ 步换一次走廊', min: 1, max: NEVER, step: 1, value: 15, fmt: (v) => (v >= NEVER ? '从不换' : String(v)), onInput: (v) => { G2.T = v; upd2(); } });
  LAB.slider('#g-lr', { label: '学习率 $\\eta$', min: 0.05, max: 1, step: 0.05, value: 0.25, fmt: (v) => v.toFixed(2), onInput: (v) => { G2.lr = v; upd2(); } });
  LAB.slider('#g-steps', { label: '总步数', min: 20, max: 200, step: 5, value: 60, onInput: (v) => { G2.steps = v; G2.at = Math.min(G2.at, v); sAt.setRange(0, v, 1); sAt.set(G2.at); upd2(); } });
  const sAt = LAB.slider('#g-at', { label: '看第几步', min: 0, max: 60, step: 1, value: 60, onInput: (v) => { G2.at = v; $('#g-at-lab').textContent = v; lossCv.redraw(); heat2.redraw(); } });
  const lossCv = LAB.canvas('#g-loss', (ctx, w, h) => {
    const S = G2.steps, all = [RUN2.sw.loss, RUN2.fixed.loss].flat().filter((v) => v > 0), lo = Math.max(1e-6, Math.pow(10, Math.floor(Math.log10(Math.min(...all))) - 1)), hi = 1000;
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: S, ymin: lo, ymax: hi, logy: true, xlabel: '步数', ylabel: '损失', pad: { l: 50, r: 10, t: 10, b: 36 } }).axes();
    RUN2.sw.sw.forEach((t) => P.vline(t, 'rgba(47,143,91,.35)', [2, 3], 1));
    P.clip();
    if (RUN2.floor > 0) P.hline(RUN2.floor, C.c4, [6, 4], 1.6);
    const xs = M.range(S + 1), cl = (a) => a.map((v) => Math.max(v, lo));
    P.line(xs, cl(RUN2.full.loss), C.slate, 1.8); P.line(xs, cl(RUN2.fixed.loss), C.c2, 2.2); P.line(xs, cl(RUN2.sw.loss), C.c3, 2.6);
    P.unclip(); P.vline(G2.at, C.ink, [2, 3], 1);
    if (RUN2.floor > 0) P.text(S, RUN2.floor * 1.4, `LoRA 极限 ${fnum(RUN2.floor, 3)}`, C.c4, 'right', 'bottom', `600 11.5px ${NUMF}`);
  });
  const heat2 = LAB.canvas('#g-heat', (ctx, w, h) => {
    const t = G2.at, W = RUN2.sw.hist[t], P = RUN2.sw.Ps[Math.max(0, Math.min(t, RUN2.sw.Ps.length - 1))], r = G2.r, narrow = w < 520;
    const side = Math.min(narrow ? (w - 40) * 0.5 : h - 40, 200), x0 = 8, y0 = 22;
    let mx = 0; for (const v of RUN2.Wt) mx = Math.max(mx, Math.abs(v));
    heatImg(ctx, W, N2, N2, x0, y0, side, side, mx); label(ctx, `W（第 ${t} 步）`, x0 + side / 2, 11, C.ink, `600 12px ${FONT}`);
    // 当前走廊 P（8×r）
    const px = x0 + side + 18, pw = Math.max(14, (side / N2) * r);
    if (P) { const arr = new Float64Array(N2 * r); for (let i = 0; i < N2; i++) for (let q = 0; q < r; q++) arr[i * r + q] = P[q][i]; heatImg(ctx, arr, N2, r, px, y0, pw, side, 1); }
    label(ctx, `P（${N2}×${r}）`, px + pw / 2, 11, C.c3, `600 12px ${FONT}`);
    // 奇异值
    const bx = px + pw + 26, bwid = w - bx - 8;
    if (bwid > 80) {
      const s = svd(W, N2).s, base = y0 + side, sc = side / 9;
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(bx, base); ctx.lineTo(bx + bwid, base); ctx.stroke();
      const bw = bwid / N2;
      SV.forEach((v, i) => { const X = bx + i * bw; ctx.strokeStyle = C.c4; ctx.lineWidth = 1.5; ctx.strokeRect(X + bw * 0.15, base - v * sc, bw * 0.7, v * sc); ctx.fillStyle = C.c3; ctx.fillRect(X + bw * 0.15, base - s[i] * sc, bw * 0.7, s[i] * sc); });
      label(ctx, 'W 的奇异值（绿） vs 目标（红框）', bx + bwid / 2, 11, C.ink, `600 12px ${FONT}`);
    }
  });
  const gs1 = LAB.stat('#g-stats', '换走廊的 GaLore：最终损失', 'leaf');
  const gs2 = LAB.stat('#g-stats', 'LoRA 秩 $r$ 极限', 'coral');
  const gs3 = LAB.stat('#g-stats', '换走廊次数', 'teal');
  const gs4 = LAB.stat('#g-stats', '小账本 $r\\times n$ / 大表 $m\\times n$', 'amber');
  function upd2() {
    run2();
    const L = RUN2.sw.loss; gs1.set(fnum(L[L.length - 1], 3)); gs2.set(fnum(RUN2.floor, 3)); gs3.set(String(RUN2.sw.sw.length)); gs4.set(`${G2.r * N2}<small> / ${N2 * N2}</small>`);
    $('#g-at-lab').textContent = G2.at;
    lossCv.redraw(); heat2.redraw();
  }
  upd2();

  /* ================= 实验 3：单卡显存账单 ================= */
  const MODELS = [{ name: '1B', P: 1.1e9, d: 2048, ff: 5632, L: 22 }, { name: '7B', P: 7e9, d: 4096, ff: 11008, L: 32 }, { name: '13B', P: 13e9, d: 5120, ff: 13824, L: 40 }, { name: '70B', P: 70e9, d: 8192, ff: 28672, L: 80 }];
  const GPUS = [24, 48, 80];
  const M3 = { model: 1, gpu: 0, r: 128, lora: 8 };
  LAB.segmented('#m-model', MODELS.map((m) => m.name), 1, (i) => { M3.model = i; sR.setRange(0, Math.log2(MODELS[i].d) - 4, 1); M3.r = 16 * Math.pow(2, sR.get()); upd3(); });
  LAB.segmented('#m-gpu', GPUS.map((g) => `${g} GB`), 0, (i) => { M3.gpu = i; upd3(); });
  const sR = LAB.slider('#m-r', { label: 'GaLore 走廊宽度 $r$', min: 0, max: 8, step: 1, value: 3, fmt: (v) => String(16 * Math.pow(2, v)), onInput: (v) => { M3.r = 16 * Math.pow(2, v); upd3(); } });
  LAB.slider('#m-lora', { label: 'LoRA 的秩', min: 0, max: 7, step: 1, value: 3, fmt: (v) => String(Math.pow(2, v)), onInput: (v) => { M3.lora = Math.pow(2, v); upd3(); } });
  function methods() {
    const m = MODELS[M3.model], P = m.P, L = m.L, rm = Math.min(1, M3.r / m.d), PL = L * M3.lora * (11 * m.d + 3 * m.ff);
    return [
      ['全量 AdamW（标准 16 字节）', [2 * P, 2 * P, 4 * P, 8 * P]],
      ['全量 AdamW（紧凑 8 字节）', [2 * P, 2 * P, 0, 4 * P]],
      ['8-bit Adam', [2 * P, 2 * P, 4 * P, 2 * P]],
      [`LoRA（秩 ${M3.lora}）`, [2 * P + 2 * PL, 2 * PL, 4 * PL, 8 * PL]],
      [`GaLore（r=${M3.r}）`, [2 * P, 2 * P, 0, 8 * rm * P]],
      ['GaLore + 逐层更新', [2 * P, (2 * P) / L, 0, 8 * rm * P]],
      ['LOMO', [2 * P, (2 * P) / L, 0, 0]],
      ['BAdam（每次 1 层）', [2 * P, (2 * P) / L, (4 * P) / L, (8 * P) / L]],
    ];
  }
  const SEGC = [C.slate, C.c2, C.c5, C.c4];
  const barsCv3 = LAB.canvas('#m-bars', (ctx, w, h) => {
    const rows = methods(), cap = GPUS[M3.gpu] * 1e9, tot = rows.map((r) => M.sum(r[1])), mx = Math.max(...tot, cap) * 1.08;
    const narrow = w < 560, l = narrow ? 8 : 178, rp = 66, rowH = (h - 24) / rows.length;
    const X = (b) => l + (b / mx) * (w - l - rp);
    rows.forEach(([name, segs], i) => {
      const y = 6 + i * rowH, bh = narrow ? rowH * 0.38 : Math.min(26, rowH * 0.56), by = narrow ? y + rowH * 0.5 : y + (rowH - bh) / 2;
      const fit = tot[i] <= cap;
      if (narrow) label(ctx, name, l, y + rowH * 0.26, C.ink, `12px ${FONT}`, 'left'); else label(ctx, name, l - 10, by + bh / 2, C.ink, `12.5px ${FONT}`, 'right');
      let x = l; segs.forEach((v, k) => { const ww = X(v) - l; if (ww <= 0) return; ctx.fillStyle = SEGC[k]; ctx.fillRect(x, by, Math.max(ww, 1), bh); x += ww; });
      label(ctx, gb(tot[i]), x + 6, by + bh / 2, fit ? C.leaf : C.coral, `600 12.5px ${NUMF}`, 'left');
    });
    const cx = X(cap); ctx.strokeStyle = C.c4; ctx.lineWidth = 1.6; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(cx, 2); ctx.lineTo(cx, h - 18); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, `${GPUS[M3.gpu]} GB 显卡`, cx, h - 8, C.c4, `600 11.5px ${FONT}`);
  });
  const timeCv = LAB.canvas('#m-time', (ctx, w, h) => {
    const m = MODELS[M3.model], P = m.P, L = m.L, Lshow = Math.min(L, 32), per = P / Lshow, act = Math.ceil(Lshow / 2), floor = 0.01;
    // 纵轴：BF16 权重之外的额外显存（GB，对数刻度）；横轴：0..L 为反向传播（第 L 层 → 第 1 层），L..L+2 为 step() 及之后
    const std = [[0, 12 * P]], lomo = [[0, floor * 1e9]], badam = [[0, 12 * per]];
    for (let k = 0; k < Lshow; k++) {
      std.push([k, 12 * P + 2 * per * (k + 1)], [k + 1, 12 * P + 2 * per * (k + 1)]);
      lomo.push([k, 2 * per], [k + 0.75, 2 * per], [k + 0.75, floor * 1e9], [k + 1, floor * 1e9]);
      const layer = Lshow - k; badam.push([k, 12 * per + (layer <= act ? 2 * per : 0)], [k + 1, 12 * per + (layer <= act ? 2 * per : 0)]);
    }
    std.push([Lshow + 1, 14 * P], [Lshow + 1, 12 * P], [Lshow + 2, 12 * P]);
    lomo.push([Lshow + 2, floor * 1e9]);
    badam.push([Lshow + 1, 14 * per], [Lshow + 1, 12 * per], [Lshow + 2, 12 * per]);
    const Pl = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: Lshow + 2, ymin: floor, ymax: 300, logy: true, ytickValues: [0.01, 0.1, 1, 10, 100], xtickValues: [0, Lshow / 2, Lshow], xfmt: (v) => (v === 0 ? `第 ${Lshow} 层` : v === Lshow ? '第 1 层' : `第 ${Lshow / 2} 层`), ylabel: '权重外的显存 / GB', pad: { l: 52, r: 14, t: 12, b: 34 } }).axes();
    ctx.fillStyle = 'rgba(224,154,45,.1)'; ctx.fillRect(Pl.tx(Lshow), Pl.y1, Pl.tx(Lshow + 2) - Pl.tx(Lshow), Pl.y0 - Pl.y1);
    Pl.text(Lshow + 1, 250, 'step()', C.c2, 'center', 'top', `600 11px ${NUMF}`);
    const draw = (pts, col) => Pl.line(pts.map((p) => p[0]), pts.map((p) => Math.max(floor, p[1] / 1e9)), col, 2.2);
    draw(std, C.c4); draw(badam, C.c1); draw(lomo, C.c3);
    Pl.text(0.4, (12 * P) / 1e9 * 1.15, `m、v、主权重常驻 ${gb(12 * P)}，斜率逐层堆到 ${gb(2 * P)}`, C.c4, 'left', 'bottom', `11px ${FONT}`);
    Pl.text(0.4, (12 * per) / 1e9 * 1.15, `BAdam：只有坐庄层的账本 ${gb(12 * per)}`, C.c1, 'left', 'bottom', `11px ${FONT}`);
    Pl.text(0.4, (2 * per) / 1e9 * 1.15, `LOMO：一层斜率 ${gb(2 * per)}，用完即扔`, C.c3, 'left', 'bottom', `11px ${FONT}`);
    if (L > Lshow) Pl.text(Lshow, 0.013, `为看清只画 ${Lshow} 段（每段 Ψ/${Lshow}） `, C.slate, 'right', 'bottom', `10.5px ${FONT}`);
  });
  const ms = [['标准 AdamW', 0, ''], ['GaLore', 4, 'amber'], ['GaLore + 逐层更新', 5, 'leaf'], ['BAdam', 7, 'teal']].map(([n, i, cls]) => [LAB.stat('#m-stats', n, cls), i]);
  function upd3() {
    const rows = methods(), cap = GPUS[M3.gpu] * 1e9;
    ms.forEach(([st, i]) => { const t = M.sum(rows[i][1]); st.set(gb(t).replace(' GB', '<small> GB ' + (t <= cap ? '✓' : '✗') + '</small>')); });
    barsCv3.redraw(); timeCv.redraw();
  }
  upd3();
})();
