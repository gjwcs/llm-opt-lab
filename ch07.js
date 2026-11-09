/* 第 7 章：AdamW、Lion 与 Adafactor · 交互实验 */
(function () {
  const { COLORS: C, M } = LAB;
  LAB.page({ bookRef: '对应书中 §7.1 L2 与解耦权重衰减 · §7.2 归一化层与勾股平衡半径 · §7.3 Adafactor 与 Lion · §7.4 四大算法手算大比拼 · 零算力实战' });
  document.querySelectorAll('.formula, [style*="overflow-x"]').forEach((f) => { f.style.width = '0'; f.style.minWidth = '100%'; });
  const $ = (s) => document.querySelector(s);
  const FONT = getComputedStyle(document.body).getPropertyValue('--font');
  const NUMF = getComputedStyle(document.body).getPropertyValue('--font-num');
  const fx = (x, d) => { if (!isFinite(x)) return '∞'; const a = Math.abs(x); if (a !== 0 && (a >= 1e5 || a < 1e-3)) return M.fmt(x, 2); return (+x.toFixed(d == null ? 3 : d)).toString(); };
  const sgn = (x, d) => (x < 0 ? '−' : '') + fx(Math.abs(x), d);
  const last = (a) => a[a.length - 1];
  const logTicks = (e0, e1) => { const s = Math.max(1, Math.ceil((e1 - e0) / 6)), t = []; for (let e = Math.ceil(e0 / s) * s; e <= e1; e += s) t.push(Math.pow(10, e)); return t; };

  /* ================= 实验 1：权重衰减的世纪乌龙 ================= */
  const W = { eta: 0.01, lam: 0.1, lgs2: Math.log10(0.02), T: 3000, seed: 1 };
  LAB.slider('#w-eta', { label: '步长 $\\eta$', min: 0.001, max: 0.05, step: 0.001, value: 0.01, fmt: (v) => v.toFixed(3), onInput: (v) => { W.eta = v; updW(); } });
  LAB.slider('#w-lam', { label: '权重衰减系数 $\\lambda$', min: 0.01, max: 1, step: 0.01, value: 0.1, fmt: (v) => v.toFixed(2), onInput: (v) => { W.lam = v; updW(); } });
  LAB.slider('#w-s2', { label: '生僻字旋钮的斜率噪声 $s_2$', min: -3, max: Math.log10(20), step: 0.05, value: Math.log10(0.02), fmt: (v) => fx(Math.pow(10, v), 3), onInput: (v) => { W.lgs2 = v; updW(); } });
  LAB.slider('#w-T', { label: '总步数', min: 500, max: 8000, step: 100, value: 3000, onInput: (v) => { W.T = v; updW(); } });
  $('#w-reseed').onclick = () => { W.seed++; updW(); };
  const MET = [{ n: 'Adam-L2', col: C.c4 }, { n: 'AdamW', col: C.c3 }, { n: 'Lion', col: C.c5 }];
  let RW = null;
  function updW() {
    const R = LAB.rng(W.seed * 13), s = [20, Math.pow(10, W.lgs2)], b1 = 0.9, b2 = 0.999, e = W.eta, l = W.lam, every = Math.max(1, Math.floor(W.T / 400));
    const w = MET.map(() => [10, 10]), m = MET.map(() => [0, 0]), v = MET.map(() => [0, 0]);
    const rec = MET.map(() => [[], []]), ts = [];
    const push = (t) => { ts.push(t); MET.forEach((_, k) => [0, 1].forEach((i) => rec[k][i].push(Math.abs(w[k][i])))); };
    push(0);
    for (let t = 1; t <= W.T; t++) {
      const c1 = 1 - Math.pow(b1, t), c2 = 1 - Math.pow(b2, t);
      for (let i = 0; i < 2; i++) {
        const g = s[i] * R.normal();
        // Adam-L2
        let gl = g + l * w[0][i]; m[0][i] = b1 * m[0][i] + (1 - b1) * gl; v[0][i] = b2 * v[0][i] + (1 - b2) * gl * gl; w[0][i] -= e * (m[0][i] / c1) / (Math.sqrt(v[0][i] / c2) + 1e-8);
        // AdamW
        m[1][i] = b1 * m[1][i] + (1 - b1) * g; v[1][i] = b2 * v[1][i] + (1 - b2) * g * g; w[1][i] = (1 - e * l) * w[1][i] - e * (m[1][i] / c1) / (Math.sqrt(v[1][i] / c2) + 1e-8);
        // Lion（β1=0.9, β2=0.99）
        const c = 0.9 * m[2][i] + 0.1 * g; w[2][i] = (1 - e * l) * w[2][i] - e * Math.sign(c); m[2][i] = 0.99 * m[2][i] + 0.01 * g;
      }
      if (t % every === 0) push(t);
    }
    RW = { ts, rec };
    const ideal = 10 * Math.pow(1 - e * l, W.T);
    st[0].set(`${fx(last(rec[0][0]), 3)}<small>/ ${fx(last(rec[0][1]), 3)}</small>`);
    st[1].set(`${fx(last(rec[1][0]), 3)}<small>/ ${fx(last(rec[1][1]), 3)}</small>`);
    st[2].set(`${fx(last(rec[2][0]), 3)}<small>/ ${fx(last(rec[2][1]), 3)}</small>`);
    st[3].set(fx(ideal, 4));
    k1.redraw(); k2.redraw();
  }
  const st = [LAB.stat('#w-stats', 'Adam-L2 最终 $|w_1|$ / $|w_2|$', 'coral'), LAB.stat('#w-stats', 'AdamW 最终 $|w_1|$ / $|w_2|$', 'leaf'), LAB.stat('#w-stats', 'Lion 最终 $|w_1|$ / $|w_2|$', 'plum'), LAB.stat('#w-stats', '理想的纯缩回 $10(1-\\eta\\lambda)^T$', '')];
  const knob = (i) => (ctx, w, h) => {
    if (!RW) return;
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: W.T, ymin: 1e-3, ymax: 30, logy: true, ytickValues: logTicks(-3, 1), xlabel: '步数 t', ylabel: `|w${i ? '₂' : '₁'}|`, pad: { l: 50, r: 10, t: 10, b: 36 } }).axes();
    P.clip();
    P.fn((t) => Math.max(10 * Math.pow(1 - W.eta * W.lam, t), 1e-3), C.slate, 1.4, [6, 4]);
    MET.forEach((mt, k) => P.line(RW.ts, RW.rec[k][i].map((v) => M.clamp(v, 1e-3, 100)), mt.col, k === 1 ? 2.6 : 1.8));
    P.unclip();
  };
  const k1 = LAB.canvas('#w-k1', knob(0)), k2 = LAB.canvas('#w-k2', knob(1));
  (function bookTable() {
    const e = 0.1, l = 1, w0 = 10, g = [20, 0.02];
    const L2 = g.map((gi) => w0 - e * (gi + l * w0) / Math.abs(gi)), AW = g.map((gi) => (1 - e * l) * w0 - e * gi / Math.abs(gi)), LI = g.map((gi) => (1 - e * l) * w0 - e * Math.sign(gi));
    const f2 = (x) => (x < 0 ? '−' : '') + Math.abs(x).toFixed(2);
    const row = (name, col, a, how) => `<tr><td><b style="color:${col}">${name}</b></td><td class="num"><b>${f2(a[0])}</b></td><td class="num"><b>${f2(a[1])}</b></td><td class="small muted">${how}</td></tr>`;
    $('#w-book').innerHTML = `<thead><tr><th>算法</th><th>旋钮 1（${LAB.tex('g_1=20')}）</th><th>旋钮 2（${LAB.tex('g_2=0.02')}）</th><th>怎么算的</th></tr></thead><tbody>
      ${row('Adam-L2', C.c4, L2, `${LAB.tex('10-0.1\\times\\frac{g_i+10}{|g_i|}')}：旋钮 2 被除以 0.02，砍掉 50`)}
      ${row('AdamW', C.c3, AW, `${LAB.tex('(1-0.1)\\times10-0.1\\times\\frac{g_i}{|g_i|}')}`)}
      ${row('Lion', C.c5, LI, `${LAB.tex('(1-0.1)\\times10-0.1\\times\\operatorname{sign}(c_i)')}，不存分母`)}
      <tr><td class="muted">理想</td><td class="num">8.90</td><td class="num">8.90</td><td class="small muted">先缩回 1.0，再走 0.1</td></tr></tbody>`;
  })();
  updW();

  /* ================= 实验 2：指针越短转得越快 ================= */
  const S = { R: 10, ds: 1, d: 64, eta: 0.01, lam: 0.05, R0: 40, T: 10000 };
  LAB.slider('#s-R', { label: '长指针半径 $R$（短指针 $R/2$）', min: 2, max: 20, step: 0.5, value: 10, fmt: (v) => v.toFixed(1), onInput: (v) => { S.R = v; clock.redraw(); clockStats(); } });
  LAB.slider('#s-ds', { label: '指针尖走过的弧长 $\\Delta s$', min: 0.2, max: 4, step: 0.1, value: 1, fmt: (v) => v.toFixed(1), onInput: (v) => { S.ds = v; clock.redraw(); clockStats(); } });
  const sD = LAB.slider('#s-d', { label: '向量维度 $d$', min: 8, max: 256, step: 8, value: 64, onInput: (v) => { S.d = v; updS(); } });
  const sE = LAB.slider('#s-eta', { label: '步长 $\\eta$', min: 0.001, max: 0.05, step: 0.001, value: 0.01, fmt: (v) => v.toFixed(3), onInput: (v) => { S.eta = v; updS(); } });
  const sL = LAB.slider('#s-lam', { label: '权重衰减 $\\lambda$', min: 0.005, max: 0.5, step: 0.005, value: 0.05, fmt: (v) => v.toFixed(3), onInput: (v) => { S.lam = v; updS(); } });
  const sR0 = LAB.slider('#s-R0', { label: '初始长度 $\\|\\mathbf w_0\\|$', min: 1, max: 60, step: 1, value: 40, onInput: (v) => { S.R0 = v; updS(); } });
  const sT = LAB.slider('#s-T', { label: '总步数', min: 2000, max: 20000, step: 1000, value: 10000, onInput: (v) => { S.T = v; updS(); } });
  $('#s-book').onclick = () => { Object.assign(S, { d: 64, eta: 0.01, lam: 0.05, R0: 40, T: 20000 }); sD.set(64); sE.set(0.01); sL.set(0.05); sR0.set(40); sT.set(20000); updS(); };
  const stS = [LAB.stat('#s-stats', '长指针转过 $\\Delta s/R$', ''), LAB.stat('#s-stats', '短指针转过 $\\Delta s/(R/2)$', 'coral'), LAB.stat('#s-stats', '平衡半径 $\\sqrt{\\eta d/(2\\lambda)}$', 'amber'), LAB.stat('#s-stats', '第 2000 步实测长度', 'plum'), LAB.stat('#s-stats', '最后一步实测长度', 'leaf'), LAB.stat('#s-stats', '稳态有效步长 $\\sqrt{2\\eta\\lambda/d}$', '')];
  function clockStats() { stS[0].set(fx(S.ds / S.R, 3) + '<small>弧度</small>'); stS[1].set(fx(2 * S.ds / S.R, 3) + '<small>弧度</small>'); }
  const clock = LAB.canvas('#s-clock', (ctx, w, h) => {
    const side = Math.min(w, h), cx = w / 2, cy = h / 2 + 10, sc = (side / 2 - 26) / S.R;
    const arc = (R, col, lw) => {
      const r = R * sc, phi = S.ds / R, a0 = -Math.PI / 2;
      ctx.save(); ctx.strokeStyle = LAB.mix(col, '#ffffff', 0.6); ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.fillStyle = LAB.mix(col, '#ffffff', 0.8); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a0 + phi); ctx.closePath(); ctx.fill(); ctx.restore();
      LAB.arrow(ctx, cx, cy, cx + r * Math.cos(a0), cy + r * Math.sin(a0), LAB.mix(col, '#ffffff', 0.45), lw, 9);
      LAB.arrow(ctx, cx, cy, cx + r * Math.cos(a0 + phi), cy + r * Math.sin(a0 + phi), col, lw, 10);
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r, a0, a0 + phi); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.fillStyle = col; ctx.font = '600 12px ' + NUMF; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(` Δφ = ${fx(phi, 3)} rad`, cx + r * Math.cos(a0 + phi) + 4, cy + r * Math.sin(a0 + phi) - 8); ctx.restore();
    };
    arc(S.R, C.c1, 2.2); arc(S.R / 2, C.c4, 2.6);
    ctx.save(); ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 7); ctx.fill(); ctx.font = '12px ' + FONT; ctx.fillStyle = C.slate; ctx.textAlign = 'center'; ctx.fillText(`蓝：R = ${S.R}　红：R/2 = ${S.R / 2}　弧长都是 ${S.ds}`, cx, h - 8); ctx.restore();
  });
  let RS = null;
  function sim(lam) {
    const R = LAB.rng(0), d = S.d, w = new Float64Array(d).fill(S.R0 / Math.sqrt(d)), u = new Float64Array(d), every = Math.max(1, Math.floor(S.T / 400)), ts = [0], ns = [S.R0];
    for (let t = 1; t <= S.T; t++) {
      let uw = 0, ww = 0; for (let i = 0; i < d; i++) { u[i] = R() < 0.5 ? -1 : 1; uw += u[i] * w[i]; ww += w[i] * w[i]; }
      const k = uw / ww, f = 1 - S.eta * lam; let nn = 0;
      for (let i = 0; i < d; i++) { w[i] = f * w[i] - S.eta * (u[i] - k * w[i]); nn += w[i] * w[i]; }
      if (t % every === 0 || t === 2000) { ts.push(t); ns.push(Math.sqrt(nn)); }
    }
    return { ts, ns };
  }
  function updS() {
    RS = { a: sim(S.lam), b: sim(0) };
    const req = Math.sqrt(S.eta * S.d / (2 * S.lam)), i2 = RS.a.ts.indexOf(2000);
    stS[2].set(fx(req, 3)); stS[3].set(i2 >= 0 ? fx(RS.a.ns[i2], 2) : '–'); stS[4].set(fx(last(RS.a.ns), 3)); stS[5].set(fx(Math.sqrt(2 * S.eta * S.lam / S.d), 4));
    $('#s-sub').textContent = `平衡时间尺度 1/(2ηλ) = ${fx(1 / (2 * S.eta * S.lam), 0)} 步`;
    normC.redraw(); effC.redraw();
  }
  const normC = LAB.canvas('#s-norm', (ctx, w, h) => {
    if (!RS) return;
    const req = Math.sqrt(S.eta * S.d / (2 * S.lam)), top = Math.max(...RS.b.ns, S.R0) * 1.1;
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: S.T, ymin: 0, ymax: top, xlabel: '步数 t', ylabel: '‖w_t‖', pad: { l: 48, r: 12, t: 10, b: 36 } }).axes();
    P.clip();
    // 勾股递推的理论曲线 r²_{t+1} = (1-ηλ)² r²_t + η²(d-1)
    const xs = [], ys = []; let r2 = S.R0 * S.R0; const f2 = Math.pow(1 - S.eta * S.lam, 2), add = S.eta * S.eta * (S.d - 1), every = Math.max(1, Math.floor(S.T / 300));
    for (let t = 0; t <= S.T; t++) { if (t % every === 0) { xs.push(t); ys.push(Math.sqrt(r2)); } r2 = f2 * r2 + add; }
    P.line(xs, ys, C.navy, 1.2, [3, 3]);
    P.hline(req, C.c4, [6, 4], 1.6); P.vline(2000, C.slate, [3, 3], 1);
    P.line(RS.b.ts, RS.b.ns, C.c2, 2); P.line(RS.a.ts, RS.a.ns, C.c1, 2.4);
    P.unclip();
    P.text(S.T, req, `√(ηd/2λ) = ${fx(req, 2)} `, C.c4, 'right', 'bottom', '600 12px ' + NUMF);
  });
  const effC = LAB.canvas('#s-eff', (ctx, w, h) => {
    if (!RS) return;
    const ea = RS.a.ns.map((n) => S.eta / n), eb = RS.b.ns.map((n) => S.eta / n), st = Math.sqrt(2 * S.eta * S.lam / S.d), top = Math.max(...ea, st) * 1.15;
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: S.T, ymin: 0, ymax: top, xlabel: '步数 t', ylabel: 'η / ‖w_t‖', pad: { l: 56, r: 12, t: 10, b: 36 } }).axes();
    P.clip(); P.hline(st, C.c4, [6, 4], 1.6); P.line(RS.b.ts, eb, C.c2, 2); P.line(RS.a.ts, ea, C.c1, 2.4); P.unclip();
  });
  clockStats(); updS();

  /* ================= 实验 3：账本瘦身省显存 ================= */
  const AF = { G: [1, 2, 3, 6], lgN: Math.log10(70), d: 8192, bytes: 4 };
  const grid = $('#a-grid'), inputs = [];
  for (let k = 0; k < 4; k++) { const inp = document.createElement('input'); inp.type = 'number'; inp.step = 'any'; inp.value = AF.G[k]; inp.oninput = () => { AF.G[k] = Number(inp.value) || 0; updAF(); }; grid.appendChild(inp); inputs.push(inp); }
  const setG = (G) => { AF.G = G.slice(); inputs.forEach((inp, k) => { inp.value = +G[k].toFixed(4); }); updAF(); };
  $('#a-v1').onclick = () => setG([2, 6, 4, 12].map(Math.sqrt));
  $('#a-v2').onclick = () => setG([2, 6, 4, 10].map(Math.sqrt));
  $('#a-book').onclick = () => setG([1, 2, 3, 6]);
  let rs = 3; $('#a-rand').onclick = () => { const R = LAB.rng(rs++); setG([0, 0, 0, 0].map(() => +(R() * 8 - 2).toFixed(1))); };
  const bm = (A, d) => `\\begin{bmatrix}${fx(A[0], d)} & ${fx(A[1], d)} \\\\ ${fx(A[2], d)} & ${fx(A[3], d)}\\end{bmatrix}`;
  function updAF() {
    const G = AF.G, V = G.map((g) => g * g), r = [V[0] + V[1], V[2] + V[3]], c = [V[0] + V[2], V[1] + V[3]], S = r[0] + r[1];
    const Vh = S > 0 ? [r[0] * c[0] / S, r[0] * c[1] / S, r[1] * c[0] / S, r[1] * c[1] / S] : [0, 0, 0, 0];
    const step = G.map((g, k) => (Vh[k] > 0 ? g / Math.sqrt(Vh[k]) : 0)), err = Math.max(...V.map((v, k) => Math.abs(v - Vh[k])));
    const rel = Math.max(...G.map((g, k) => (Math.abs(g) > 1e-12 ? Math.abs(Math.sqrt(Vh[k]) / Math.abs(g) - 1) : 0)));
    const blk = (label, tex) => `<div style="display:inline-block;vertical-align:top;margin:4px 16px 10px 0"><div class="small muted" style="margin-bottom:2px">${label}</div>${LAB.tex(tex)}</div>`;
    $('#a-out').innerHTML = blk('① 斜率平方表（Adam 要存的 4 个数）', `\\mathbf G\\odot\\mathbf G=${bm(V, 2)}`) +
      blk('② Adafactor 只存行和、列和（共 4 个数，m×n 时是 m+n 个）', `\\mathbf r=(${fx(r[0], 2)},\\ ${fx(r[1], 2)}),\\ \\mathbf c=(${fx(c[0], 2)},\\ ${fx(c[1], 2)}),\\ S=${fx(S, 2)}`) +
      blk('③ 还原 V̂ᵢⱼ = rᵢcⱼ/S', `\\hat{\\mathbf V}=${bm(Vh, 3)}`) +
      blk('分母对比：√V̂ 与真实 |G|', `\\sqrt{\\hat{\\mathbf V}}=${bm(Vh.map(Math.sqrt), 3)}\\ \\text{vs}\\ |\\mathbf G|=${bm(G.map(Math.abs), 3)}`) +
      blk('④ 每个格子迈出的步子 G/√V̂', `${bm(step, 3)}`) +
      `<div class="small" style="margin-top:2px">平方表还原的最大误差：<b style="color:${err < 1e-9 ? C.leaf : C.coral}">${fx(err, 4)}</b>；分母 √V̂ 的最大相对误差：<b style="color:${rel < 1e-9 ? C.leaf : C.coral}">${(rel * 100).toFixed(1)}%</b>${err < 1e-9 ? '（秩 1，分毫不差）' : '（不是“行因子×列因子”，只能近似）'}</div>`;
  }
  const NS = [0.125, 0.5, 1, 3, 7, 8, 13, 34, 70, 175, 405, 671, 1000];
  LAB.slider('#a-N', { label: '模型参数量 $N$', min: 0, max: NS.length - 1, step: 1, value: NS.indexOf(70), fmt: (i) => NS[i] + 'B', onInput: (i) => { AF.lgN = Math.log10(NS[i]); updMem(); } });
  LAB.slider('#a-dim', { label: '权重矩阵边长（按 $d\\times d$ 方阵估算）', min: 1024, max: 16384, step: 1024, value: 8192, onInput: (v) => { AF.d = v; updMem(); } });
  LAB.segmented('#a-bytes', ['FP32 · 4 字节', 'BF16 · 2 字节'], 0, (i) => { AF.bytes = i ? 2 : 4; updMem(); });
  const OPTS = [
    { n: 'Adam / AdamW', f: (N) => 2 * N, tex: '2mn', col: C.c1 },
    { n: 'Lion', f: (N) => N, tex: 'mn', col: C.c5 },
    { n: 'Adafactor（带动量）', f: (N, d) => N + N * 2 / d, tex: 'mn+m+n', col: C.c2 },
    { n: 'Adafactor（不带动量）', f: (N, d) => N * 2 / d, tex: 'm+n', col: C.c3 },
  ];
  const fmtB = (b) => (b >= 1e9 ? (b / 1e9).toFixed(b >= 1e11 ? 0 : 1) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : (b / 1e3).toFixed(1) + ' KB');
  let MEM = null;
  function updMem() {
    const N = Math.pow(10, AF.lgN) * 1e9, d = AF.d;
    MEM = OPTS.map((o) => o.f(N, d) * AF.bytes);
    $('#a-sub').textContent = `${(N / 1e9).toFixed(N < 1e10 ? 1 : 0)}B 参数 · ${AF.bytes === 4 ? 'FP32' : 'BF16'} · ${d}×${d} 矩阵`;
    $('#a-table').innerHTML = `<thead><tr><th>优化器</th><th>每张 ${LAB.tex('m\\times n')} 表存几个数</th><th>账本显存</th><th>相对 Adam</th></tr></thead><tbody>${OPTS.map((o, i) => `<tr><td><b style="color:${o.col}">${o.n}</b></td><td>${LAB.tex(o.tex)}</td><td class="num"><b>${fmtB(MEM[i])}</b></td><td class="num">${(MEM[i] / MEM[0] * 100).toFixed(MEM[i] / MEM[0] < 0.01 ? 3 : 0)}%</td></tr>`).join('')}</tbody>`;
    memC.redraw();
  }
  const memC = LAB.canvas('#a-bars', (ctx, w, h) => {
    if (!MEM) return;
    const top = Math.max(...MEM), e1 = Math.ceil(Math.log10(top) + 0.2), e0 = Math.floor(Math.log10(Math.min(...MEM))) - 1;
    const P = new LAB.Plot(ctx, w, h, { xmin: -0.6, xmax: 3.6, ymin: Math.pow(10, e0), ymax: Math.pow(10, e1), logy: true, xtickValues: [], ytickValues: logTicks(e0, e1), yfmt: (v) => fmtB(v).replace('.0', ''), pad: { l: 64, r: 12, t: 14, b: 32 } }).axes();
    const bw = (P.tx(1) - P.tx(0)) * 0.5;
    OPTS.forEach((o, i) => {
      const X = P.tx(i), Y = P.ty(MEM[i]);
      ctx.save(); ctx.fillStyle = o.col; LAB.roundRect(ctx, X - bw / 2, Y, bw, P.y0 - Y, 4); ctx.fill(); ctx.restore();
      P.text(i, MEM[i], fmtB(MEM[i]), C.navy, 'center', 'bottom', '600 12.5px ' + NUMF);
      ctx.save(); ctx.fillStyle = o.col; ctx.font = '600 12px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(o.n, X, P.y0 + 7); ctx.restore();
    });
  });
  updAF(); updMem();
})();
