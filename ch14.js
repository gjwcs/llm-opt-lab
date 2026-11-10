/* 第 14 章 数值稳定：损失尖峰、Z-Loss、QK-Norm 与 FP8（交互实验） */
(function () {
  const { COLORS: C, M } = LAB;
  LAB.page({ bookRef: '对应书中 §14.1 打分爆炸、梯度裁剪、Z-Loss 与 QK-Norm · §14.2 FP8 随机舍入' });
  document.querySelectorAll('.formula').forEach((f) => { f.style.width = '0'; f.style.minWidth = '100%'; });
  const $ = (s) => document.querySelector(s);
  const FONT = getComputedStyle(document.body).getPropertyValue('--font');
  const NUMF = getComputedStyle(document.body).getPropertyValue('--font-num');
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = (e) => String(e).split('').map((c) => SUP[c] || c).join('');
  const sciParts = (x) => { let e = Math.floor(Math.log10(Math.abs(x))), m = +(x / Math.pow(10, e)).toPrecision(3); if (Math.abs(m) >= 10) { m /= 10; e++; } return [m, e]; };
  const fnum = (x, d) => { if (Number.isNaN(x)) return 'NaN'; if (!isFinite(x)) return x > 0 ? 'Inf' : '−Inf'; if (x === 0) return '0'; const a = Math.abs(x); if (a >= 1e6 || a < 1e-3) { const [m, e] = sciParts(x); return (m === 1 ? '' : m + '×') + '10' + sup(e); } if (a >= 1000) return String(Math.round(x)); return String(+x.toPrecision(d || 4)); };
  function label(ctx, txt, x, y, col, font, align, base) { ctx.fillStyle = col || C.ink; ctx.font = font || `12px ${FONT}`; ctx.textAlign = align || 'center'; ctx.textBaseline = base || 'middle'; ctx.fillText(txt, x, y); }
  const bad = (s) => `<b style="color:var(--coral)">${s}</b>`;

  /* ================= 实验 1：打分漂移与 Z-Loss ================= */
  const Z = { c: 0, drift: 0.004, alpha: 0.01, seed: 1, clip: 1, cseed: 3 };
  const FMTS = [['FP16', 65504], ['BF16', 3.3895e38], ['FP32', 3.4028e38], ['FP64', Number.MAX_VALUE]];
  const sC = LAB.slider('#z-c', { label: '两个打分一起涨了 $c$：$(10+c,\\ 12+c)$', min: 0, max: 1000, step: 1, value: 0, onInput: (v) => { Z.c = v; updTable(); } });
  $('#z-day1').onclick = () => { Z.c = 0; sC.set(0); updTable(); };
  $('#z-day60').onclick = () => { Z.c = 990; sC.set(990); updTable(); };
  const zs1 = LAB.stat('#z-stats', '对数总分 $\\ln Z$', 'coral');
  const zs2 = LAB.stat('#z-stats', '打分差 $z_2-z_1$', '');
  const zs3 = LAB.stat('#z-stats', '真实概率 $(p_1,p_2)$', 'leaf');
  const zs4 = LAB.stat('#z-stats', 'Z-Loss 拉力总和 $2\\alpha\\ln Z$（$\\alpha=10^{-4}$）', 'teal');
  function updTable() {
    const z1 = 10 + Z.c, z2 = 12 + Z.c, lnZ = z2 + Math.log(1 + Math.exp(z1 - z2));
    const st = [1 / (1 + Math.exp(z2 - z1)), 1 / (1 + Math.exp(z1 - z2))];
    let html = '<tr><th>格式</th><th>能存的最大数</th><th>$e^{z_1}$</th><th>$e^{z_2}$</th><th>直接算 $(p_1,p_2)$</th><th>先减最大值 $(p_1,p_2)$</th></tr>';
    FMTS.forEach(([n, mx]) => {
      const ex = (z) => (z > Math.log(mx) ? Infinity : Math.exp(z));
      const e1 = ex(z1), e2 = ex(z2), p1 = e1 / (e1 + e2), p2 = e2 / (e1 + e2);
      const show = (v) => (isFinite(v) ? fnum(v, 4) : Number.isNaN(v) ? bad('NaN') : bad('Inf'));
      html += `<tr><td><b>${n}</b></td><td>${fnum(mx, 3)}</td><td>${show(e1)}</td><td>${show(e2)}</td><td>(${show(p1)}, ${show(p2)})</td><td style="color:var(--leaf)">(${st[0].toFixed(3)}, ${st[1].toFixed(3)})</td></tr>`;
    });
    $('#z-table').innerHTML = html; LAB.renderMath($('#z-table'));
    zs1.set(lnZ.toFixed(2)); zs2.set('2'); zs3.set(`(${st[0].toFixed(3)}, ${st[1].toFixed(3)})`); zs4.set((2e-4 * lnZ).toFixed(4));
  }
  updTable();
  // 三千步漂移模拟
  const Q = [0.6, 0.25, 0.1, 0.05], TZ = 3000, ETA = 1;
  let SIM = null;
  function simZ() {
    const run = (alpha) => {
      const R = LAB.rng(200 + Z.seed), th = [0, 0, 0, 0], out = [];
      for (let t = 0; t <= TZ; t++) {
        const lz = M.logsumexp(th), p = th.map((v) => Math.exp(v - lz)); out.push(lz);
        if (t === TZ) return { lz: out, p };
        for (let i = 0; i < 4; i++) th[i] -= ETA * (p[i] - Q[i] + 2 * alpha * lz * p[i]);
        const d = Z.drift + 0.05 * R.normal(); for (let i = 0; i < 4; i++) th[i] += d;
      }
    };
    SIM = { off: run(0), on: run(Z.alpha) };
  }
  LAB.slider('#z-drift', { label: '漂移速度 $d$（每步集体涨分的平均值）', min: 0, max: 0.01, step: 0.0005, value: Z.drift, fmt: (v) => v.toFixed(4), onInput: (v) => { Z.drift = v; updSim(); } });
  LAB.slider('#z-alpha', { label: 'Z-Loss 系数 $\\alpha$', min: -4, max: -1, step: 0.05, value: -2, fmt: (v) => fnum(Math.pow(10, v), 2), onInput: (v) => { Z.alpha = Math.pow(10, v); updSim(); } });
  $('#z-seed').onclick = () => { Z.seed++; updSim(); };
  const simCv = LAB.canvas('#z-sim', (ctx, w, h) => {
    const all = SIM.off.lz.concat(SIM.on.lz), hi = Math.max(14, ...all) * 1.08, lo = Math.min(-1, ...all);
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: TZ, ymin: lo, ymax: hi, xlabel: '训练步数', ylabel: 'ln Z', pad: { l: 44, r: 10, t: 10, b: 36 } }).axes();
    P.hline(11.09, C.c4, [6, 4], 1.4); P.text(TZ, 11.09, 'FP16 溢出 11.09 ', C.c4, 'right', 'bottom', `600 11px ${NUMF}`);
    P.hline(0, C.slate, null, 0.8);
    const xs = M.range(TZ + 1);
    P.line(xs, SIM.off.lz, '#9aa5b1', 2); P.line(xs, SIM.on.lz, C.c3, 2.4);
    const k = SIM.off.lz.findIndex((v) => v > 11.09);
    if (k >= 0) { P.points([k], [SIM.off.lz[k]], C.c4, 6, '#fff'); P.text(k, SIM.off.lz[k] + (hi - lo) * 0.04, `第 ${k} 步起直接算会出 NaN `, C.c4, 'right', 'bottom', `600 11.5px ${FONT}`); }
    const eq = (4 * Z.drift) / (2 * ETA * Z.alpha); if (eq < hi) { P.hline(eq, C.c3, [2, 3], 1); P.text(30, eq, ` 预测平衡点 Vd/(2ηα) = ${fnum(eq, 3)}`, C.c3, 'left', 'bottom', `11px ${NUMF}`); }
  });
  function updSim() {
    simZ();
    const f = (p) => '(' + p.map((v) => v.toFixed(3)).join(', ') + ')';
    simCv.canvas.title = `不加：${f(SIM.off.p)}；加：${f(SIM.on.p)}`;
    $('#z-sim').nextElementSibling.innerHTML = `<span><i style="background:#9aa5b1"></i>不加 Z-Loss：最终 $\\ln Z=${SIM.off.lz[TZ].toFixed(2)}$，概率 ${f(SIM.off.p)}</span><span><i style="background:var(--c3)"></i>加 Z-Loss：最终 $\\ln Z=${SIM.on.lz[TZ].toFixed(2)}$，概率 ${f(SIM.on.p)}</span><span><i style="background:var(--c4);height:2px"></i>FP16 下 $e^{z}$ 溢出线</span>`;
    LAB.renderMath($('#z-sim').nextElementSibling);
    simCv.redraw();
  }
  updSim();
  // 梯度裁剪与损失尖峰
  const TS = 300;
  let SP = null;
  function simSpike() {
    const R = LAB.rng(50 + Z.cseed), cliffs = new Set(); for (let t = 0; t < TS; t++) if (R() < 0.025) cliffs.add(t);
    const noise = M.range(TS).map(() => R.normal());
    const run = (clip) => { let w = 2; const L = []; for (let t = 0; t < TS; t++) { L.push(0.5 * w * w); let g = w + 0.3 * noise[t]; if (cliffs.has(t)) g *= 100; if (clip && Math.abs(g) > Z.clip) g = Z.clip * Math.sign(g); w -= 0.1 * g; } L.push(0.5 * w * w); return L; };
    SP = { off: run(false), on: run(true), cliffs };
  }
  LAB.slider('#z-clip', { label: '裁剪阈值 $c$（限速牌）', min: -1, max: 1.5, step: 0.05, value: 0, fmt: (v) => fnum(Math.pow(10, v), 2), onInput: (v) => { Z.clip = Math.pow(10, v); updSpike(); } });
  $('#z-cliff').onclick = () => { Z.cseed++; updSpike(); };
  const spikeCv = LAB.canvas('#z-spike', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: TS, ymin: 1e-4, ymax: 1e4, logy: true, ytickValues: [1e-4, 0.01, 1, 100, 1e4], xlabel: '步数', ylabel: '损失', pad: { l: 44, r: 8, t: 10, b: 36 } }).axes();
    SP.cliffs.forEach((t) => P.vline(t, 'rgba(209,73,91,.25)', null, 3));
    P.clip(); const xs = M.range(TS + 1);
    P.line(xs, SP.off.map((v) => Math.max(v, 1e-4)), '#9aa5b1', 1.8); P.line(xs, SP.on.map((v) => Math.max(v, 1e-4)), C.c2, 2.2);
    P.unclip();
    P.text(TS, 3000, '灰：不裁剪 · 橙：裁剪 ', C.slate, 'right', 'middle', `11px ${FONT}`);
  });
  const sp1 = LAB.stat('#z-stats2', '不裁剪：最高损失', 'coral');
  const sp2 = LAB.stat('#z-stats2', '裁剪后：最高损失', 'amber');
  function updSpike() { simSpike(); const mx = (a) => Math.max(...a.slice(100)); sp1.set(fnum(mx(SP.off), 3)); sp2.set(fnum(mx(SP.on), 3)); spikeCv.redraw(); }
  updSpike();

  /* ================= 实验 2：QK-Norm 驯服注意力 ================= */
  const QK = { s: 1, dk: 64, gamma: 1, seed: 1, book: false };
  const NT = 8;
  let QV = null;
  function buildQK() {
    const R = LAB.rng(300 + QK.seed), d = QK.dk;
    const mk = () => M.range(NT).map(() => Float64Array.from({ length: d }, () => (QK.book ? 1 : R.normal())));
    QV = { q: mk(), k: mk() };
  }
  function scores(norm) {
    const d = QK.dk, S = [];
    const rmsn = (v) => { const r = Math.sqrt(v.reduce((a, x) => a + x * x, 0) / d + 1e-12); return v.map((x) => (QK.gamma * x) / r); };
    for (let i = 0; i < NT; i++) { const qi = norm ? rmsn(QV.q[i]) : QV.q[i].map((x) => x * QK.s); const row = []; for (let j = 0; j < NT; j++) { const kj = norm ? rmsn(QV.k[j]) : QV.k[j].map((x) => x * QK.s); let s = 0; for (let t = 0; t < d; t++) s += qi[t] * kj[t]; row.push(s / Math.sqrt(d)); } S.push(row); }
    return S;
  }
  const sS = LAB.slider('#q-s', { label: '权重刻度放大倍数 $s$', min: 0, max: 2, step: 0.01, value: 0, fmt: (v) => fnum(Math.pow(10, v), 3), onInput: (v) => { QK.s = Math.pow(10, v); QK.book = false; buildQK(); updQ(); } });
  const sDk = LAB.slider('#q-dk', { label: '每个头的维度 $d_k$', min: 2, max: 7, step: 1, value: 6, fmt: (v) => String(Math.pow(2, v)), onInput: (v) => { QK.dk = Math.pow(2, v); QK.book = false; buildQK(); updQ(); } });
  LAB.slider('#q-gamma', { label: 'QK-Norm 的缩放旋钮 $\\gamma$', min: 0.5, max: 2, step: 0.05, value: 1, fmt: (v) => v.toFixed(2), onInput: (v) => { QK.gamma = v; updQ(); } });
  $('#q-book').onclick = () => { QK.book = true; QK.s = 20; QK.dk = 4; sS.set(Math.log10(20)); sDk.set(2); buildQK(); updQ(); };
  $('#q-seed').onclick = () => { QK.seed++; QK.book = false; buildQK(); updQ(); };
  const softRow = (r) => { const m = Math.max(...r), e = r.map((v) => Math.exp(v - m)), s = M.sum(e); return e.map((v) => v / s); };
  const ent = (p) => -p.reduce((a, v) => a + (v > 0 ? v * Math.log(v) : 0), 0);
  let SR = null, SN = null;
  const heatCv = LAB.canvas('#q-heat', (ctx, w, h) => {
    const gap = 26, side = Math.min((w - gap - 8) / 2, h - 46), x0 = (w - 2 * side - gap) / 2, y0 = 22, c = side / NT;
    [[SR, '不加 QK-Norm'], [SN, 'QK-Norm']].forEach(([S, name], q) => {
      const xb = x0 + q * (side + gap);
      S.forEach((row, i) => { const p = softRow(row); p.forEach((v, j) => { ctx.fillStyle = LAB.heat(v); ctx.fillRect(xb + j * c, y0 + i * c, c - 1, c - 1); }); });
      ctx.strokeStyle = '#9aa5b1'; ctx.strokeRect(xb - 0.5, y0 - 0.5, side, side);
      label(ctx, name, xb + side / 2, 10, q ? C.c3 : C.c4, `600 12.5px ${FONT}`);
      const mx = Math.max(...S.flat().map(Math.abs));
      if (q === 0 && mx > 88.7) { ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(xb, y0 + side / 2 - 24, side, 48); label(ctx, '直接算 e^s 已在 FP32 溢出', xb + side / 2, y0 + side / 2 - 8, C.c4, `600 12.5px ${FONT}`); label(ctx, `（最大打分 ${fnum(mx, 4)}）`, xb + side / 2, y0 + side / 2 + 12, C.c4, `12px ${NUMF}`); }
    });
    label(ctx, '颜色越深 = 注意力权重越大（图中用“先减最大值”的稳定算法）', w / 2, y0 + side + 14, C.slate, `11.5px ${FONT}`);
  });
  const curveCv = LAB.canvas('#q-curve', (ctx, w, h) => {
    const base = Math.max(...QV.q.map((qi) => Math.max(...QV.k.map((kj) => { let s = 0; for (let t = 0; t < QK.dk; t++) s += qi[t] * kj[t]; return Math.abs(s) / Math.sqrt(QK.dk); })))), nmax = Math.max(...SN.flat().map(Math.abs));
    const P = new LAB.Plot(ctx, w, h, { xmin: 1, xmax: 100, ymin: 0.1, ymax: 1e6, logx: true, logy: true, xtickValues: [1, 2, 5, 10, 20, 50, 100], ytickValues: [0.1, 1, 10, 100, 1e3, 1e4, 1e5, 1e6], xlabel: '权重刻度 s', ylabel: '最大打分', pad: { l: 48, r: 10, t: 10, b: 36 } }).axes();
    P.hline(11.09, C.c2, [6, 4], 1.3); P.hline(88.7, C.plum, [6, 4], 1.3);
    P.fn((s) => base * s * s, C.c4, 2.4); P.fn(() => nmax, C.c3, 2.4);
    P.points([QK.s], [base * QK.s * QK.s], C.c4, 5, '#fff'); P.points([QK.s], [nmax], C.c3, 5, '#fff');
  });
  const q1 = LAB.stat('#q-stats', '最大打分：不加 / QK-Norm', 'coral');
  const q2 = LAB.stat('#q-stats', '平均每行的熵（上限 ln 8 = 2.08）：不加 / QK-Norm', 'plum');
  const q3 = LAB.stat('#q-stats', '直接算 $e^{s}$：FP16 / FP32', '');
  function updQ() {
    SR = scores(false); SN = scores(true);
    const mr = Math.max(...SR.flat().map(Math.abs)), mn = Math.max(...SN.flat().map(Math.abs));
    q1.set(`${fnum(mr, 4)}<small> / ${fnum(mn, 3)}</small>`);
    q2.set(`${M.mean(SR.map((r) => ent(softRow(r)))).toFixed(2)}<small> / ${M.mean(SN.map((r) => ent(softRow(r)))).toFixed(2)}</small>`);
    const ok = (lim) => (mr > lim ? '<span style="color:var(--coral)">溢出</span>' : '<span style="color:var(--leaf)">正常</span>');
    q3.set(`<span style="font-size:17px">${ok(11.09)} / ${ok(88.72)}</span>`);
    heatCv.redraw(); curveCv.redraw();
  }
  buildQK(); updQ();

  /* ================= 实验 3：随机舍入抽签 ================= */
  const FMT = [{ name: '书中刻度尺 Δ=0.1', grid: 0.1, delta: 0.01, T: 100 }, { name: 'BF16', mant: 7, delta: 0.001, T: 1000 }, { name: 'FP8 E4M3', mant: 3, delta: 0.01, T: 100 }];
  const SRs = { fmt: 0, delta: 0.01, T: 100, trials: 200, seed: 1 };
  const ulpOf = (x) => { const f = FMT[SRs.fmt]; if (f.grid) return f.grid; return Math.pow(2, Math.floor(Math.log2(Math.abs(x))) - f.mant); };
  const rn = (x) => { const u = ulpOf(x); return Math.round(x / u + 1e-12) * u; };
  const srd = (x, r) => { const u = ulpOf(x), k = Math.floor(x / u + 1e-12), lo = k * u, p = (x - lo) / u; return r() < p ? lo + u : lo; };
  const TMAX = 10000, CK = []; for (let e = 0; e <= 4; e += 0.125) CK.push(Math.round(Math.pow(10, e))); const CKS = [...new Set(CK)];
  let SRR = null;
  function runSR() {
    const R = LAB.rng(700 + SRs.seed), d = SRs.delta, T = SRs.T, N = SRs.trials;
    let w = 1; const rnPath = [1]; for (let t = 1; t <= TMAX; t++) { w = rn(w + d); if (t <= T) rnPath.push(w); else if (CKS.includes(t)) rnPath[t] = w; }
    const mean = new Float64Array(T + 1), samples = [], ckErr = {}; CKS.forEach((t) => { ckErr[t] = 0; });
    const finals = [];
    for (let n = 0; n < N; n++) {
      let x = 1; mean[0] += 1; const path = n < 6 ? [1] : null;
      for (let t = 1; t <= TMAX; t++) { x = srd(x + d, R); if (t <= T) { mean[t] += x; if (path) path.push(x); if (t === T) finals.push(x); } if (ckErr[t] !== undefined) ckErr[t] += (x - (1 + t * d)) ** 2; }
      if (path) samples.push(path);
    }
    for (let t = 0; t <= T; t++) mean[t] /= N;
    SRR = { rnPath, mean, samples, finals, ckErr: CKS.map((t) => [t, Math.sqrt(ckErr[t] / N), Math.abs(rnPath[t] - (1 + t * d))]) };
  }
  const sDelta = LAB.slider('#r-delta', { label: '每一步想改动 $\\delta$', min: -4, max: -1, step: 0.01, value: -2, fmt: (v) => fnum(Math.pow(10, v), 3), onInput: (v) => { SRs.delta = +Math.pow(10, v).toPrecision(3); updSR(); } });
  const sTT = LAB.slider('#r-T', { label: '走多少步 $T$', min: 1, max: 4, step: 0.05, value: 2, fmt: (v) => Math.round(Math.pow(10, v)).toLocaleString(), onInput: (v) => { SRs.T = Math.round(Math.pow(10, v)); updSR(); } });
  LAB.slider('#r-trials', { label: '随机舍入重复抽签次数', min: 20, max: 500, step: 20, value: 200, onInput: (v) => { SRs.trials = v; updSR(); } });
  LAB.segmented('#r-fmt', FMT.map((f) => f.name), 0, (i) => { SRs.fmt = i; SRs.delta = FMT[i].delta; SRs.T = FMT[i].T; sDelta.set(Math.log10(SRs.delta)); sTT.set(Math.log10(SRs.T)); updSR(); });
  $('#r-seed').onclick = () => { SRs.seed++; updSR(); };
  const trajCv = LAB.canvas('#r-traj', (ctx, w, h) => {
    const T = SRs.T, d = SRs.delta, ex = 1 + T * d, all = SRR.samples.flat().concat([ex, 1, ...SRR.rnPath.slice(0, T + 1)]), hi = Math.max(...all), lo = Math.min(...all), pad = (hi - lo) * 0.08 || 0.1;
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: T, ymin: lo - pad, ymax: hi + pad, xlabel: '步数 t', ylabel: '旋钮 w', pad: { l: 52, r: 10, t: 10, b: 36 } }).axes();
    // 刻度格线
    const u0 = ulpOf(Math.max(1, lo)); if ((hi - lo) / u0 < 60) { ctx.save(); ctx.strokeStyle = 'rgba(224,154,45,.18)'; for (let v = Math.ceil((lo - pad) / u0) * u0; v <= hi + pad; v += ulpOf(Math.max(v, 1e-9))) { ctx.beginPath(); ctx.moveTo(P.x0, P.ty(v)); ctx.lineTo(P.x1, P.ty(v)); ctx.stroke(); } ctx.restore(); }
    const step = Math.max(1, Math.floor(T / 600)), xs = []; for (let t = 0; t <= T; t += step) xs.push(t);
    SRR.samples.forEach((p) => P.line(xs, xs.map((t) => p[t]), '#b9dcc6', 1.2));
    P.line([0, T], [1, ex], C.ink, 1.6, [5, 4]);
    P.line(xs, xs.map((t) => SRR.rnPath[t]), C.c4, 2.6);
    P.line(xs, xs.map((t) => SRR.mean[t]), C.c3, 2.6);
  });
  const errCv = LAB.canvas('#r-err', (ctx, w, h) => {
    const d = SRs.delta, u = ulpOf(1);
    const P = new LAB.Plot(ctx, w, h, { xmin: 1, xmax: TMAX, ymin: 1e-4, ymax: 1e3, logx: true, logy: true, xtickValues: [1, 10, 100, 1000, 10000], ytickValues: [1e-4, 0.01, 1, 100], xlabel: '步数 T', ylabel: '误差', pad: { l: 46, r: 10, t: 10, b: 36 } }).axes();
    const ts = SRR.ckErr.map((r) => r[0]);
    P.line(ts, SRR.ckErr.map((r) => Math.max(r[2], 1e-4)), C.c4, 2.4); P.points(ts, SRR.ckErr.map((r) => Math.max(r[2], 1e-4)), C.c4, 2.5);
    P.line(ts, SRR.ckErr.map((r) => Math.max(r[1], 1e-4)), C.c3, 2.4); P.points(ts, SRR.ckErr.map((r) => Math.max(r[1], 1e-4)), C.c3, 2.5);
    if (FMT[SRs.fmt].grid) { const p = (d / u) % 1; P.fn((T) => Math.max(1e-4, u * Math.sqrt(T * p * (1 - p))), C.c3, 1.2, [4, 3]); }
    P.vline(SRs.T, C.ink, [2, 3], 1);
  });
  const r1 = LAB.stat('#r-stats', '理想终点 $1+T\\delta$', '');
  const r2 = LAB.stat('#r-stats', '四舍五入终点', 'coral');
  const r3 = LAB.stat('#r-stats', '随机舍入：平均 ± 标准差', 'leaf');
  const r4 = LAB.stat('#r-stats', '随机舍入：单次抽签', 'teal');
  function updSR() {
    runSR();
    const T = SRs.T, f = SRR.finals, mu = M.mean(f), sd = M.std(f), u = ulpOf(1);
    r1.set(fnum(1 + T * SRs.delta, 5)); r2.set(fnum(SRR.rnPath[T], 5)); r3.set(`${fnum(mu, 4)}<small> ± ${fnum(sd, 2)}</small>`); r4.set(fnum(f[0], 4));
    $('#r-cap').innerHTML = `当前格式在 1.0 附近相邻两个刻度相差 $\\Delta=${+u.toPrecision(4)}$，每步改动 $\\delta$ 是刻度的 ${fnum(SRs.delta / u, 3)} 倍${SRs.delta < u / 2 ? '，不到半格，四舍五入会把它整个吞掉' : ''}。`;
    LAB.renderMath($('#r-cap'));
    trajCv.redraw(); errCv.redraw();
  }
  updSR();
})();
