/* 第 8 章：Warmup、余弦退火、WSD 与 Schedule-Free · 交互实验 */
(function () {
  const { COLORS: C, M } = LAB;
  LAB.page({ bookRef: '对应书中 §8.1 线性预热与余弦退火 · §8.2 WSD 预热—平飞—急降 · §8.3 Schedule-Free · §8.4 带抖动山谷 3 步手算 · 零算力实战' });
  document.querySelectorAll('.formula, [style*="overflow-x"]').forEach((f) => { f.style.width = '0'; f.style.minWidth = '100%'; });
  const $ = (s) => document.querySelector(s);
  const FONT = getComputedStyle(document.body).getPropertyValue('--font');
  const NUMF = getComputedStyle(document.body).getPropertyValue('--font-num');
  const fx = (x, d) => { if (!isFinite(x)) return '∞'; const a = Math.abs(x); if (a !== 0 && (a >= 1e5 || a < 1e-3)) return M.fmt(x, 2); return (+x.toFixed(d == null ? 3 : d)).toString(); };
  const sgn = (x, d) => (Math.abs(x) < 1e-12 ? '0' : (x < 0 ? '−' : '') + fx(Math.abs(x), d));
  const logTicks = (e0, e1) => { const s = Math.max(1, Math.ceil((e1 - e0) / 6)), t = []; for (let e = Math.ceil(e0 / s) * s; e <= e1; e += s) t.push(Math.pow(10, e)); return t; };

  /* ================= 实验 1：学习率调度设计台 ================= */
  const D = { T: 200, Tw: 0, dec: 0.1, emax: 0.015, emin: 0, beta: 0.9, single: false, seed: 2026 };
  const COORD = [{ h: 100, s: 20, th: 1 }, { h: 1, s: 0.5, th: 10 }];
  const SCH = [{ n: '定步长', col: C.slate, cls: '' }, { n: '预热 + 余弦', col: C.c1, cls: '' }, { n: 'WSD', col: C.c4, cls: 'coral' }, { n: 'Schedule-Free', col: C.c3, cls: 'leaf' }];
  const sT = LAB.slider('#d-T', { label: '总步数 $T_{\\max}$', min: 100, max: 1000, step: 20, value: 200, onInput: (v) => { D.T = v; sTw.setRange(0, Math.floor(v / 4), 1); updD(); } });
  const sTw = LAB.slider('#d-Tw', { label: '预热步数 $T_w$', min: 0, max: 50, step: 1, value: 0, onInput: (v) => { D.Tw = v; updD(); } });
  const sDec = LAB.slider('#d-dec', { label: 'WSD 末期急降占比', min: 0.05, max: 0.6, step: 0.05, value: 0.1, fmt: (v) => Math.round(v * 100) + '%', onInput: (v) => { D.dec = v; updD(); } });
  const sEm = LAB.slider('#d-emax', { label: '峰值步长 $\\eta_{\\max}$（陡壁生死线 $0.02$）', min: 0.002, max: 0.019, step: 0.001, value: 0.015, fmt: (v) => v.toFixed(3), onInput: (v) => { D.emax = v; updD(); } });
  const sEn = LAB.slider('#d-emin', { label: '末端步长 $\\eta_{\\min}$', min: 0, max: 0.005, step: 0.0005, value: 0, fmt: (v) => v.toFixed(4), onInput: (v) => { D.emin = v; updD(); } });
  const sB = LAB.slider('#d-sfb', { label: 'Schedule-Free 的 $\\beta$', min: 0, max: 0.98, step: 0.01, value: 0.9, fmt: (v) => v.toFixed(2), onInput: (v) => { D.beta = v; updD(); } });
  LAB.checkbox('#d-single', '显示一次随机运行（虚线）', false, (v) => { D.single = v; lossC.redraw(); });
  $('#d-book').onclick = () => { Object.assign(D, { T: 200, Tw: 0, dec: 0.1, emax: 0.015, emin: 0, beta: 0.9 }); sT.set(200); sTw.setRange(0, 50, 1); sTw.set(0); sDec.set(0.1); sEm.set(0.015); sEn.set(0); sB.set(0.9); updD(); };
  $('#d-seed').onclick = () => { D.seed++; D.single = true; document.querySelector('#d-single input').checked = true; updD(); };
  function lr(k, t) {
    const { T, Tw, emax, emin } = D;
    if (k === 0) return emax;
    if (Tw > 0 && t <= Tw) return emax * t / Tw;
    if (k === 1) return emin + 0.5 * (emax - emin) * (1 + Math.cos(Math.PI * (t - Tw) / (T - Tw)));
    if (k === 2) { const Ts = T - Math.max(1, Math.round(D.dec * T)); return t <= Ts ? emax : emin + (emax - emin) * (1 - (t - Ts) / (T - Ts)); }
    return emax; // Schedule-Free：固定 γ（预热段同样线性升）
  }
  let RD = null;
  function exactGD(k) { // 每个坐标的均值与方差逐步递推
    const L = [0]; const st = COORD.map((c) => ({ m: c.th, v: 0 }));
    L[0] = COORD.reduce((a, c, i) => a + 0.5 * c.h * (st[i].m ** 2 + st[i].v), 0);
    for (let t = 1; t <= D.T; t++) { const e = lr(k, t); let l = 0; COORD.forEach((c, i) => { const r = 1 - e * c.h; st[i].m *= r; st[i].v = r * r * st[i].v + e * e * c.s * c.s; l += 0.5 * c.h * (st[i].m ** 2 + st[i].v); }); L.push(l); }
    return L;
  }
  function exactSF() { // 状态 (z, x) 线性递推 + 2×2 协方差
    const b = D.beta, L = [];
    const st = COORD.map((c) => ({ mz: c.th, mx: c.th, Szz: 0, Szx: 0, Sxx: 0 }));
    L.push(COORD.reduce((a, c) => a + 0.5 * c.h * c.th * c.th, 0));
    for (let t = 1; t <= D.T; t++) {
      const g = lr(3, t), cc = 1 / t; let l = 0;
      COORD.forEach((c, i) => {
        const s = st[i], a = 1 - g * c.h * (1 - b), bb = -g * c.h * b;
        const A = [a, bb, cc * a, 1 - cc + cc * bb], n = [-g * c.s, -cc * g * c.s];
        const mz = A[0] * s.mz + A[1] * s.mx, mx = A[2] * s.mz + A[3] * s.mx;
        const Szz = A[0] * A[0] * s.Szz + 2 * A[0] * A[1] * s.Szx + A[1] * A[1] * s.Sxx + n[0] * n[0];
        const Szx = A[0] * A[2] * s.Szz + (A[0] * A[3] + A[1] * A[2]) * s.Szx + A[1] * A[3] * s.Sxx + n[0] * n[1];
        const Sxx = A[2] * A[2] * s.Szz + 2 * A[2] * A[3] * s.Szx + A[3] * A[3] * s.Sxx + n[1] * n[1];
        Object.assign(s, { mz, mx, Szz, Szx, Sxx });
        l += 0.5 * c.h * (mx * mx + Sxx);
      });
      L.push(l);
    }
    return L;
  }
  function single(k) { // 一次随机运行（与书中脚本同样的更新式）
    const R = LAB.rng(D.seed), L = [];
    let w = COORD.map((c) => c.th), z = w.slice(), x = w.slice();
    const f = (p) => COORD.reduce((a, c, i) => a + 0.5 * c.h * p[i] * p[i], 0);
    L.push(f(w));
    for (let t = 1; t <= D.T; t++) {
      const nz = COORD.map((c) => c.s * R.normal());
      if (k === 3) { const g = lr(3, t), y = z.map((zi, i) => (1 - D.beta) * zi + D.beta * x[i]); z = z.map((zi, i) => zi - g * (COORD[i].h * y[i] + nz[i])); x = x.map((xi, i) => (1 - 1 / t) * xi + (1 / t) * z[i]); L.push(f(x)); }
      else { const e = lr(k, t); w = w.map((wi, i) => wi - e * (COORD[i].h * wi + nz[i])); L.push(f(w)); }
    }
    return L;
  }
  const stD = SCH.map((s) => LAB.stat('#d-stats', `${s.n}：第 T−25 / T 步期望损失`, s.cls));
  function updD() {
    RD = { exact: [exactGD(0), exactGD(1), exactGD(2), exactSF()], single: [0, 1, 2, 3].map(single) };
    RD.exact.forEach((L, i) => stD[i].set(`${fx(L[D.T - 25], 3)}<small>→</small> ${fx(L[D.T], 4)}`));
    $('#d-sub').textContent = `T = ${D.T}，WSD 从第 ${D.T - Math.max(1, Math.round(D.dec * D.T))} 步开始急降`;
    schedC.redraw(); lossC.redraw();
  }
  const schedC = LAB.canvas('#d-sched', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: D.T, ymin: 0, ymax: Math.max(D.emax * 1.15, 0.022), xlabel: '步数 t', ylabel: 'η_t', yfmt: (v) => fx(v, 3), pad: { l: 56, r: 12, t: 10, b: 36 } }).axes();
    const ts = M.range(D.T).map((i) => i + 1);
    [0, 3, 1, 2].forEach((k) => P.line(ts, ts.map((t) => lr(k, t)), SCH[k].col, k === 2 ? 2.6 : 2.2, k === 3 ? [7, 4] : null));
    P.hline(0.02, C.coral, [2, 3], 1); P.text(D.T, 0.02, '陡壁生死线 2/100 ', C.coral, 'right', 'top', '11px ' + FONT);
  });
  const lossC = LAB.canvas('#d-loss', (ctx, w, h) => {
    if (!RD) return;
    const all = RD.exact.flat().concat(D.single ? RD.single.flat() : []).filter((v) => v > 0 && isFinite(v));
    const lo = Math.max(Math.floor(Math.log10(Math.min(...all))), -6), hi = Math.ceil(Math.log10(Math.max(...all)));
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: D.T, ymin: Math.pow(10, lo), ymax: Math.pow(10, hi), logy: true, ytickValues: logTicks(lo, hi), xlabel: '步数 t', ylabel: '损失', pad: { l: 52, r: 12, t: 10, b: 36 } }).axes();
    P.clip();
    const ts = M.range(D.T + 1);
    if (D.single) RD.single.forEach((L, k) => P.line(ts, L.map((v) => Math.max(v, Math.pow(10, lo))), LAB.mix(SCH[k].col, '#ffffff', 0.35), 1.1, [3, 3]));
    [0, 3, 1, 2].forEach((k) => P.line(ts, RD.exact[k], SCH[k].col, k === 2 ? 2.8 : 2.3));
    P.vline(D.T - 25, C.slate, [2, 4], 1);
    P.unclip();
  });
  updD();

  /* ================= 实验 2：预热：账本先攒够 ================= */
  const U = { b2: 0.999, Tw: 500, snr: 0.1, z: 50 };
  LAB.slider('#u-b2', { label: '$\\beta_2$', min: 0.99, max: 0.9999, step: 0.0001, value: 0.999, fmt: (v) => v.toFixed(4), onInput: (v) => { U.b2 = v; updU(); } });
  LAB.slider('#u-Tw', { label: '预热步数 $T_w$', min: 1, max: 3000, step: 1, value: 500, onInput: (v) => { U.Tw = v; updU(false); } });
  LAB.slider('#u-snr', { label: '信噪比 $\\mu$（斜率均值 / 抖动大小）', min: 0, max: 2, step: 0.05, value: 0.1, fmt: (v) => v.toFixed(2), onInput: (v) => { U.snr = v; updU(); } });
  LAB.slider('#u-z', { label: '注意力打分 $z_1$', min: 0, max: 60, step: 0.5, value: 50, fmt: (v) => v.toFixed(1), onInput: (v) => { U.z = v; softC.redraw(); softStat(); } });
  const TU = 5000, NP = 2000;
  let RU = null;
  function simU() {
    const R = LAB.rng(17), m = new Float64Array(NP), v = new Float64Array(NP), ts = [], us = [];
    for (let t = 1; t <= TU; t++) {
      const c1 = 1 - Math.pow(0.9, t), c2 = 1 - Math.pow(U.b2, t); let s = 0;
      for (let i = 0; i < NP; i++) { const g = U.snr + R.normal(); m[i] = 0.9 * m[i] + 0.1 * g; v[i] = U.b2 * v[i] + (1 - U.b2) * g * g; s += Math.abs(m[i] / c1) / Math.sqrt(v[i] / c2); }
      if (t <= 30 || t % Math.max(1, Math.floor(t / 80)) === 0) { ts.push(t); us.push(s / NP); }
    }
    return { ts, us, ss: M.mean(us.slice(-10)) };
  }
  const stU = [LAB.stat('#u-stats', '账本记性 $1/(1-\\beta_2)$', 'amber'), LAB.stat('#u-stats', '第 1 步平均步子', 'coral'), LAB.stat('#u-stats', '稳态平均步子', 'leaf'), LAB.stat('#u-stats', '前 $T_w$ 步总位移：不预热 / 预热', ''), LAB.stat('#u-stats', '$p_1(1-p_1)$', 'plum')];
  function updU(resim) {
    if (resim !== false || !RU) RU = simU();
    stU[0].set(fx(1 / (1 - U.b2), 0) + '<small>步</small>'); stU[1].set(fx(RU.us[0], 3)); stU[2].set(fx(RU.ss, 3));
    // 前 Tw 步累计位移（以 η_max 为单位）：用插值的平均步子
    const uAt = (t) => { let k = RU.ts.findIndex((x) => x >= t); if (k < 0) k = RU.ts.length - 1; return RU.us[k]; };
    let a = 0, b = 0; for (let t = 1; t <= U.Tw; t++) { const u = uAt(t); a += u; b += u * t / U.Tw; }
    stU[3].set(`${fx(a, 0)}<small>/</small> ${fx(b, 0)}<small>× η_max</small>`);
    neffC.redraw(); uC.redraw(); stepC.redraw();
  }
  function softStat() { const p = 1 / (1 + Math.exp(-U.z)), d = Math.exp(-U.z) / Math.pow(1 + Math.exp(-U.z), 2); stU[4].set(`${fx(d, 4)}<small>p₁ = ${p > 0.9999995 ? '1.000000' : p.toFixed(6)}</small>`); }
  const neffC = LAB.canvas('#u-neff', (ctx, w, h) => {
    const cap = 1 / (1 - U.b2), P = new LAB.Plot(ctx, w, h, { xmin: 1, xmax: TU, logx: true, logy: true, ymin: 1, ymax: cap * 1.6, xtickValues: [1, 10, 100, 1000], xfmt: (v) => v, ytickValues: logTicks(0, Math.ceil(Math.log10(cap))), xlabel: '步数 t', ylabel: 'N_eff', pad: { l: 50, r: 12, t: 10, b: 36 } }).axes();
    P.clip(); P.hline(cap, C.amber, [5, 4], 1.4); P.fn((t) => (1 - Math.pow(U.b2, t)) / (1 - U.b2), C.c1, 2.4); P.vline(U.Tw, C.c3, [3, 3], 1.4); P.unclip();
  });
  const uC = LAB.canvas('#u-u', (ctx, w, h) => {
    if (!RU) return;
    const P = new LAB.Plot(ctx, w, h, { xmin: 1, xmax: TU, logx: true, ymin: 0, ymax: 1.1, xtickValues: [1, 10, 100, 1000], xfmt: (v) => v, xlabel: '步数 t', ylabel: '平均 |m̂|/√v̂', pad: { l: 50, r: 12, t: 10, b: 36 } }).axes();
    P.clip(); P.hline(RU.ss, C.slate, [5, 4], 1.2); P.line(RU.ts, RU.us, C.c2, 2.4); P.points([1], [RU.us[0]], C.c4, 5, '#fff'); P.unclip();
  });
  const stepC = LAB.canvas('#u-step', (ctx, w, h) => {
    if (!RU) return;
    const P = new LAB.Plot(ctx, w, h, { xmin: 1, xmax: TU, logx: true, ymin: 0, ymax: 1.1, xtickValues: [1, 10, 100, 1000], xfmt: (v) => v, xlabel: '步数 t', ylabel: '步长 / η_max', pad: { l: 50, r: 12, t: 10, b: 36 } }).axes();
    P.clip(); P.hline(RU.ss, C.slate, [5, 4], 1.2);
    P.line(RU.ts, RU.us, C.c4, 2.2); P.line(RU.ts, RU.us.map((u, i) => u * Math.min(1, RU.ts[i] / U.Tw)), C.c3, 2.6);
    P.vline(U.Tw, C.c3, [3, 3], 1.2); P.unclip();
  });
  const softC = LAB.canvas('#u-soft', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: 60, ymin: 1e-26, ymax: 1, logy: true, ytickValues: [1e-25, 1e-20, 1e-15, 1e-10, 1e-5, 1], xlabel: 'z₁（z₂ = 0）', ylabel: 'p₁(1−p₁)', pad: { l: 56, r: 12, t: 10, b: 36 } }).axes();
    const f = (z) => { const p = 1 / (1 + Math.exp(-z)); return Math.max(p * (1 - p), Math.exp(-z) / Math.pow(1 + Math.exp(-z), 2)); };
    P.fn(f, C.c5, 2.4); P.points([0, U.z], [0.25, f(U.z)], C.c4, 5.5, '#fff');
    P.text(0, 0.25, '  z=0：0.25', C.c4, 'left', 'top', '600 12px ' + NUMF);
  });
  (function bookU() {
    const b2 = 0.999, g1 = 0.01, g2 = 1, v1 = (1 - b2) * g1 * g1, v2 = b2 * v1 + (1 - b2) * g2 * g2, vh1 = v1 / (1 - b2), vh2 = v2 / (1 - b2 * b2);
    const m2 = 0.9 * 0.1 * g1 + 0.1 * g2, mh2 = m2 / (1 - 0.81);
    $('#u-book').innerHTML = `<table class="data"><tbody>
      <tr><td>第 1 步 ${LAB.tex('g_1=0.01')}</td><td>${LAB.tex('\\sqrt{\\hat v_1}')} = <b>${fx(Math.sqrt(vh1), 4)}</b></td><td>放大器 ${LAB.tex('1/\\sqrt{\\hat v_1}')} = <b>${fx(1 / Math.sqrt(vh1), 0)}</b> 倍</td></tr>
      <tr><td>第 2 步 ${LAB.tex('g_2=1')}</td><td>${LAB.tex('\\hat v_2')} = <b>${fx(vh2, 4)}</b>，${LAB.tex('\\sqrt{\\hat v_2}')} = <b>${fx(Math.sqrt(vh2), 3)}</b></td><td>无动量一步 <b>${fx(g2 / Math.sqrt(vh2), 3)}η</b>；带 ${LAB.tex('\\beta_1=0.9')}：${LAB.tex('\\hat m_2')} = ${fx(mh2, 4)}，一步 <b>${fx(mh2 / Math.sqrt(vh2), 3)}η</b></td></tr></tbody></table>`;
  })();
  updU(); softStat(); softC.redraw();

  /* ================= 实验 3：免调度三人行 ================= */
  const F = { noise: 0, gamma: 1, beta: 0, T: 12, dec: 0.34, seed: 5 };
  const fN = LAB.segmented('#f-noise', ['交替 ±1（书中）', '随机 ±1', '正态抖动'], 0, (i) => { F.noise = i; updF(); });
  const fG = LAB.slider('#f-gamma', { label: '固定步长 $\\gamma$（定步长 SGD 也用它）', min: 0.1, max: 1.5, step: 0.05, value: 1, fmt: (v) => v.toFixed(2), onInput: (v) => { F.gamma = v; updF(); } });
  const fB = LAB.slider('#f-beta', { label: '$\\beta$（探路员靠近答题员的程度）', min: 0, max: 0.98, step: 0.01, value: 0, fmt: (v) => v.toFixed(2), onInput: (v) => { F.beta = v; updF(); } });
  const fT = LAB.slider('#f-T', { label: '总步数 $T$', min: 3, max: 200, step: 1, value: 12, onInput: (v) => { F.T = v; updF(); } });
  const fD = LAB.slider('#f-dec', { label: 'WSD 末期急降占比', min: 0.05, max: 0.5, step: 0.01, value: 0.34, fmt: (v) => Math.round(v * 100) + '%', onInput: (v) => { F.dec = v; updF(); } });
  $('#f-book').onclick = () => { F.noise = 0; fN.set(0); F.gamma = 1; fG.set(1); F.beta = 0; fB.set(0); F.T = 3; fT.set(3); F.dec = 0.34; fD.set(0.34); updF(); };
  let RF = null;
  function updF() {
    const R = LAB.rng(F.seed), T = F.T, xi = [0];
    for (let t = 1; t <= T; t++) xi.push(F.noise === 0 ? (t % 2 ? 1 : -1) : F.noise === 1 ? (R() < 0.5 ? -1 : 1) : R.normal());
    const Ts = T - Math.max(1, Math.round(F.dec * T)), wsdLr = (t) => (t <= Ts ? F.gamma : F.gamma * (T - t + 1) / (T - Ts + 1));
    const c = [2], wsd = [2], wl = [null], z = [2], x = [2], y = [2];
    for (let t = 1; t <= T; t++) {
      c.push(c[t - 1] - F.gamma * (c[t - 1] + xi[t]));
      wl.push(wsdLr(t)); wsd.push(wsd[t - 1] - wl[t] * (wsd[t - 1] + xi[t]));
      const yy = (1 - F.beta) * z[t - 1] + F.beta * x[t - 1]; y.push(yy);
      z.push(z[t - 1] - F.gamma * (yy + xi[t]));
      x.push((1 - 1 / t) * x[t - 1] + (1 / t) * z[t]);
    }
    RF = { xi, c, wsd, wl, z, x, y, Ts };
    const half = Math.floor(T / 2), rms = (a) => Math.sqrt(M.mean(a.slice(half + 1).map((v) => v * v)));
    stF[0].set(fx(Math.abs(c[T]), 3)); stF[1].set(fx(Math.abs(wsd[T]), 3)); stF[2].set(fx(Math.abs(x[T]), 3));
    stF[3].set(`${fx(rms(z), 3)}<small>vs 答题员 ${fx(rms(x), 3)}</small>`);
    $('#f-sub').textContent = `γ = ${F.gamma}，β = ${F.beta}，WSD 从第 ${Ts + 1} 步开始降`;
    const rows = []; for (let t = 1; t <= Math.min(T, 6); t++) rows.push(`<tr><td class="num">${t}</td><td class="num">${sgn(xi[t], 2)}</td><td class="num" style="color:${C.c5}">${sgn(c[t], 3)}</td><td class="num">${fx(wl[t], 3)}</td><td class="num" style="color:${C.c4}">${sgn(wsd[t], 3)}</td><td class="num" style="color:#7b8794">${sgn(z[t], 3)}</td><td class="num" style="color:${C.c3}"><b>${sgn(x[t], 3)}</b></td></tr>`);
    $('#f-table').innerHTML = `<thead><tr><th>t</th><th>抖动 ${LAB.tex('\\xi_t')}</th><th>定步长 ${LAB.tex('w_t')}</th><th>WSD 步长</th><th>WSD ${LAB.tex('w_t')}</th><th>探底员 ${LAB.tex('z_t')}</th><th>答题员 ${LAB.tex('x_t')}</th></tr></thead><tbody>${rows.join('')}</tbody>`;
    posC.redraw();
  }
  const stF = [LAB.stat('#f-stats', '定步长 SGD 最终 $|w_T|$', 'plum'), LAB.stat('#f-stats', 'WSD 最终 $|w_T|$', 'coral'), LAB.stat('#f-stats', '答题员最终 $|x_T|$', 'leaf'), LAB.stat('#f-stats', '后半程均方根：探底员', '')];
  const posC = LAB.canvas('#f-pos', (ctx, w, h) => {
    if (!RF) return;
    const T = F.T, all = [].concat(RF.c, RF.wsd, RF.z, RF.x).filter(isFinite), m = M.clamp(Math.max(...all.map(Math.abs)) * 1.1, 1, 20);
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: T, ymin: -m, ymax: m, xlabel: '步数 t', ylabel: '位置', xtickValues: T <= 12 ? M.range(T + 1) : null, pad: { l: 44, r: 12, t: 10, b: 36 } }).axes();
    P.clip(); P.hline(0, C.navy, null, 1);
    if (RF.Ts < T) { ctx.save(); ctx.fillStyle = 'rgba(209,73,91,.06)'; ctx.fillRect(P.tx(RF.Ts + 0.5), P.y1, P.tx(T) - P.tx(RF.Ts + 0.5), P.y0 - P.y1); ctx.restore(); }
    const ts = M.range(T + 1), dot = T <= 40;
    const ser = [[RF.z, '#9aa5b1', 1.6], [RF.y.slice(0, T + 1), C.c2, 1.2], [RF.c, C.c5, 1.8], [RF.wsd, C.c4, 2], [RF.x, C.c3, 3]];
    ser.forEach(([a, col, lw], k) => { const ys = a.map((v) => M.clamp(v, -1.5 * m, 1.5 * m)); const tt = k === 1 ? M.range(T).map((i) => i + 1) : ts; const yy = k === 1 ? a.slice(1, T + 1) : ys; P.line(tt, yy, col, lw, k === 1 ? [4, 3] : null); if (dot) P.points(tt, yy, col, k === 4 ? 3.8 : 2.6); });
    P.unclip();
  });
  updF();
})();
