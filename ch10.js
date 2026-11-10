/* 第 10 章：矩阵正交化：Muon 与 SOAP（交互实验） */
(function () {
  const { COLORS: C, M } = LAB;
  LAB.page({ bookRef: '对应书中 §10.1 奇异值分解：圆变椭圆 · §10.2 Muon：把扁椭圆拍回正圆 · §10.3 Newton-Schulz 迭代与 SOAP · §10.4 完整算例' });
  document.querySelectorAll('.formula').forEach((f) => { f.style.width = '0'; f.style.minWidth = '100%'; });
  const $ = (s) => document.querySelector(s);
  const FONT = getComputedStyle(document.body).getPropertyValue('--font');
  const NUMF = getComputedStyle(document.body).getPropertyValue('--font-num');
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = (e) => String(e).split('').map((c) => SUP[c] || c).join('');
  const sciParts = (x) => { let e = Math.floor(Math.log10(Math.abs(x))), m = +(x / Math.pow(10, e)).toPrecision(3); if (Math.abs(m) >= 10) { m /= 10; e++; } return [m, e]; };
  const fnum = (x, d) => { if (!isFinite(x)) return x > 0 ? '∞' : '–'; if (x === 0) return '0'; const a = Math.abs(x); if (a >= 1e5 || a < 1e-3) { const [m, e] = sciParts(x); return (m === 1 ? '' : m + '×') + '10' + sup(e); } return String(+x.toPrecision(d || 4)); };
  const tnum = (x, d) => { if (!isFinite(x)) return '\\infty'; if (Math.abs(x) < 1e-12) return '0'; const a = Math.abs(x); if (a >= 1e5 || a < 1e-3) { const [m, e] = sciParts(x); return (m === 1 ? '' : m + '\\times') + '10^{' + e + '}'; } return String(+x.toPrecision(d || 4)); };
  const bmat = (A, d) => '\\begin{bmatrix}' + A.map((r) => r.map((v) => tnum(v, d)).join(' & ')).join('\\\\') + '\\end{bmatrix}';
  const isActive = (sec) => sec.classList.contains('active');
  function label(ctx, txt, x, y, col, font, align, base) { ctx.fillStyle = col || C.ink; ctx.font = font || `12px ${FONT}`; ctx.textAlign = align || 'center'; ctx.textBaseline = base || 'middle'; ctx.fillText(txt, x, y); }
  const rot = (deg) => { const a = (deg * Math.PI) / 180; return [[Math.cos(a), -Math.sin(a)], [Math.sin(a), Math.cos(a)]]; };
  const mm2 = (A, B) => [[A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]], [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]];
  const tr2 = (A) => [[A[0][0], A[1][0]], [A[0][1], A[1][1]]];
  const sv2 = (A) => { const B = mm2(tr2(A), A), a = B[0][0], b = B[0][1], d = B[1][1], df = Math.sqrt(((a - d) / 2) ** 2 + b * b); return [Math.sqrt(Math.max(0, (a + d) / 2 + df)), Math.sqrt(Math.max(0, (a + d) / 2 - df))]; };
  // 单边 Jacobi SVD（小方阵，行优先 Float64Array）→ 降序奇异值
  function svals(A, n) {
    const U = []; for (let j = 0; j < n; j++) { const c = new Float64Array(n); for (let i = 0; i < n; i++) c[i] = A[i * n + j]; U.push(c); }
    for (let sweep = 0; sweep < 60; sweep++) {
      let off = 0;
      for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
        const up = U[p], uq = U[q]; let a = 0, b = 0, g = 0;
        for (let i = 0; i < n; i++) { a += up[i] * up[i]; b += uq[i] * uq[i]; g += up[i] * uq[i]; }
        if (Math.abs(g) <= 1e-300 || Math.abs(g) <= 1e-16 * Math.sqrt(a * b)) continue;
        off = Math.max(off, Math.abs(g) / Math.sqrt(a * b));
        const z = (b - a) / (2 * g), t = Math.sign(z || 1) / (Math.abs(z) + Math.sqrt(1 + z * z)), c = 1 / Math.sqrt(1 + t * t), s = c * t;
        for (let i = 0; i < n; i++) { const x = up[i], y = uq[i]; up[i] = c * x - s * y; uq[i] = s * x + c * y; }
      }
      if (off < 1e-15) break;
    }
    return U.map((u) => Math.hypot(...u)).sort((a, b) => b - a);
  }
  function matmul(A, B, n) { const Cm = new Float64Array(n * n); for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) { const a = A[i * n + k]; if (a === 0) continue; for (let j = 0; j < n; j++) Cm[i * n + j] += a * B[k * n + j]; } return Cm; }
  function transpose(A, n) { const T = new Float64Array(n * n); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) T[j * n + i] = A[i * n + j]; return T; }
  function orthRows(R, n) { const Q = []; for (let j = 0; j < n; j++) { const v = Float64Array.from({ length: n }, () => R.normal()); for (const q of Q) { let p = 0; for (let i = 0; i < n; i++) p += v[i] * q[i]; for (let i = 0; i < n; i++) v[i] -= p * q[i]; } const s = Math.hypot(...v); for (let i = 0; i < n; i++) v[i] /= s; Q.push(v); } return Q; }
  const QUINT = [3.4445, -4.775, 2.0315], CUBIC = [1.5, -0.5, 0];
  const poly = (co) => (x) => co[0] * x + co[1] * x ** 3 + co[2] * x ** 5;
  // 矩阵版奇次多项式迭代：X ← aX + (bA + cA²)X，A = X Xᵀ
  function nsMatrix(G, n, steps, co) {
    let nr = 0; for (const v of G) nr += v * v; nr = Math.sqrt(nr) + 1e-12;
    let X = G.map((v) => v / nr);
    for (let k = 0; k < steps; k++) { const A = matmul(X, transpose(X, n), n), A2 = matmul(A, A, n), B = A.map((v, i) => co[1] * v + co[2] * A2[i]), BX = matmul(B, X, n); X = X.map((v, i) => co[0] * v + BX[i]); }
    return X;
  }

  /* ================= 实验 1：圆变椭圆三步曲 ================= */
  const sec1 = $('#svd');
  const S = { s1: 100, s2: 0.01, tv: 45, tu: 45, stage: 3 };
  const lg = (v) => Math.pow(10, v);
  const sS1 = LAB.slider('#s-s1', { label: '第 1 个奇异值 $\\sigma_1$', min: -2, max: 2, step: 0.01, value: 2, fmt: (v) => fnum(lg(v), 3), onInput: (v) => { S.s1 = lg(v); upd1(); } });
  const sS2 = LAB.slider('#s-s2', { label: '第 2 个奇异值 $\\sigma_2$', min: -2, max: 2, step: 0.01, value: -2, fmt: (v) => fnum(lg(v), 3), onInput: (v) => { S.s2 = lg(v); upd1(); } });
  const sTV = LAB.slider('#s-tv', { label: '$\\mathbf V$ 的旋转角 $\\theta_{\\mathbf V}$', min: -90, max: 90, step: 1, value: 45, fmt: (v) => v + '°', onInput: (v) => { S.tv = v; upd1(); } });
  const sTU = LAB.slider('#s-tu', { label: '$\\mathbf U$ 的旋转角 $\\theta_{\\mathbf U}$', min: -90, max: 90, step: 1, value: 45, fmt: (v) => v + '°', onInput: (v) => { S.tu = v; upd1(); } });
  const STAGES = ['第 0 步：单位圆', '第 1 步：先转 Vᵀ', '第 2 步：按 Σ 拉伸', '第 3 步：再转 U'];
  const sStage = LAB.slider('#s-stage', { label: '三步曲进度', min: 0, max: 3, step: 0.01, value: 3, fmt: (v) => STAGES[Math.min(3, Math.round(v))].split('：')[0], onInput: (v) => { S.stage = v; morphCv.redraw(); } });
  const preset = (a, b, tv, tu) => { S.s1 = a; S.s2 = b; S.tv = tv; S.tu = tu; sS1.set(Math.log10(a)); sS2.set(Math.log10(b)); sTV.set(tv); sTU.set(tu); upd1(); };
  $('#s-book').onclick = () => preset(100, 0.01, 45, 45);
  $('#s-mild').onclick = () => preset(2, 0.5, 30, -20);
  let playing = false;
  $('#s-play').onclick = () => {
    if (playing) return; playing = true; const t0 = performance.now();
    const tick = (now) => { const t = (now - t0) / 1000, st = Math.min(3, t * 0.85); S.stage = st; sStage.set(st); morphCv.redraw(); if (st < 3 && isActive(sec1)) requestAnimationFrame(tick); else playing = false; };
    requestAnimationFrame(tick);
  };
  const Gmat = () => mm2(mm2(rot(S.tu), [[S.s1, 0], [0, S.s2]]), tr2(rot(S.tv)));
  function stageMat(s) {
    const Vt = tr2(rot(S.tv));
    if (s <= 1) return tr2(rot(S.tv * s));
    if (s <= 2) { const f = s - 1; return mm2([[Math.pow(S.s1, f), 0], [0, Math.pow(S.s2, f)]], Vt); }
    const f = s - 2; return mm2(mm2(rot(S.tu * f), [[S.s1, 0], [0, S.s2]]), Vt);
  }
  function drawShape(ctx, A, cx, cy, unit, opt) {
    ctx.save();
    ctx.beginPath(); for (let i = 0; i <= 180; i++) { const a = (i / 180) * 2 * Math.PI, x = A[0][0] * Math.cos(a) + A[0][1] * Math.sin(a), y = A[1][0] * Math.cos(a) + A[1][1] * Math.sin(a); const X = cx + x * unit, Y = cy - y * unit; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
    ctx.closePath(); ctx.fillStyle = opt.fill || 'rgba(47,109,181,.12)'; ctx.fill(); ctx.strokeStyle = opt.stroke || C.navy; ctx.lineWidth = opt.lw || 2; ctx.stroke();
    if (opt.arrows) {
      [[0, C.c4], [1, C.c1]].forEach(([j, col]) => { const x = A[0][j], y = A[1][j]; const L = Math.hypot(x, y) * unit; if (L < 2) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx + x * unit, cy - y * unit, 3, 0, 7); ctx.fill(); return; } LAB.arrow(ctx, cx, cy, cx + x * unit, cy - y * unit, col, 2.4, Math.min(10, L * 0.5)); });
    }
    ctx.restore();
  }
  const morphCv = LAB.canvas('#s-morph', (ctx, w, h) => {
    const s = S.stage, A = stageMat(s), sv = sv2(A), smax = Math.max(1, sv[0]);
    const cx = w / 2, cy = h / 2 + 8, R = Math.min(w, h) / 2 - 34, unit = R / smax;
    // 网格十字
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - R - 20, cy); ctx.lineTo(cx + R + 20, cy); ctx.moveTo(cx, cy - R - 20); ctx.lineTo(cx, cy + R + 20); ctx.stroke();
    // 原来的单位圆
    ctx.strokeStyle = '#cfd6de'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(cx, cy, unit, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    if (s < 0.05) { // 右奇异向量
      [0, 1].forEach((j) => { const a = ((S.tv + 90 * j) * Math.PI) / 180; ctx.strokeStyle = C.c3; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * (R + 10), cy + Math.sin(a) * (R + 10)); ctx.lineTo(cx + Math.cos(a) * (R + 10), cy - Math.sin(a) * (R + 10)); ctx.stroke(); ctx.setLineDash([]); label(ctx, j ? 'v₂' : 'v₁', cx + Math.cos(a) * (R + 18), cy - Math.sin(a) * (R + 18), C.c3, `600 13px ${NUMF}`); });
    }
    drawShape(ctx, A, cx, cy, unit, { arrows: true });
    label(ctx, STAGES[Math.min(3, Math.floor(s + 0.001))], 12, 16, C.navy, `600 13.5px ${FONT}`, 'left');
    label(ctx, `当前拉伸倍数 (${fnum(sv[0], 3)}, ${fnum(sv[1], 3)})`, 12, 36, C.slate, `12px ${FONT}`, 'left');
    if (smax > 1.001) label(ctx, `显示比例 1 : ${fnum(smax, 3)}`, w - 12, 16, C.c4, `600 12px ${NUMF}`, 'right');
  });
  const threeCv = LAB.canvas('#s-three', (ctx, w, h) => {
    const G = Gmat(), ups = [['SGD：−0.01·G', G.map((r) => r.map((v) => -0.01 * v)), C.c1], ['Adam 第 1 步：G/|G|', G.map((r) => r.map((v) => v / (Math.abs(v) + 1e-8))), C.c2], ['Muon：U Vᵀ', mm2(rot(S.tu), tr2(rot(S.tv))), C.c3]];
    const pw = w / 3, narrow = pw < 170, R = Math.min(pw / 2 - 10, (h - (narrow ? 96 : 70)) / 2), top = Math.max(0, (h - 2 * R - (narrow ? 96 : 70)) / 2), cy = top + (narrow ? 40 : 26) + R + 6;
    ups.forEach(([name0, A, col], i) => {
      const name = narrow ? name0.split('：')[0].replace(' 第 1 步', '') : name0;
      if (narrow) label(ctx, name0.split('：')[1], pw * (i + 0.5), top + 28, col, `11px ${NUMF}`);
      const cx = pw * (i + 0.5), sv = sv2(A), unit = R / Math.max(1e-12, sv[0]);
      ctx.strokeStyle = '#e1e6ec'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      drawShape(ctx, A, cx, cy, unit, { stroke: col, fill: LAB.mix('#ffffff', col, 0.2), lw: 2.2 });
      label(ctx, name, cx, top + 12, col, `600 12.5px ${FONT}`);
      label(ctx, `σ = (${fnum(sv[0], 3)}, ${fnum(sv[1], 3)})`, cx, cy + R + 16, C.ink, `600 12px ${NUMF}`);
      label(ctx, `σ₂/σ₁ = ${fnum(sv[1] / sv[0], 3)}`, cx, cy + R + 33, C.slate, `11.5px ${NUMF}`);
    });
  });
  const s1 = LAB.stat('#s-stats', '$\\mathbf G$ 的四个格子');
  const s2 = LAB.stat('#s-stats', '$\\sigma_1/\\sigma_2$（偏科程度）', 'coral');
  const s3 = LAB.stat('#s-stats', '$\\eta=0.01$ 时两通道走的距离', 'amber');
  const s4 = LAB.stat('#s-stats', 'Muon 两通道走的距离', 'leaf');
  function upd1() {
    const G = Gmat();
    s1.set(`<span style="font-size:14px">${LAB.tex(bmat(G, 5))}</span>`);
    s2.set(fnum(S.s1 / S.s2, 3)); s3.set(`${fnum(0.01 * S.s1, 3)}<small> 与 </small>${fnum(0.01 * S.s2, 3)}`); s4.set('1<small> 与 </small>1');
    const ad = G.map((r) => r.map((v) => v / (Math.abs(v) + 1e-8))), uv = mm2(rot(S.tu), tr2(rot(S.tv)));
    $('#s-mats').innerHTML = LAB.tex(`\\mathbf G=${bmat(G, 5)},\\qquad \\frac{\\mathbf G}{|\\mathbf G|}=${bmat(ad, 4)},\\qquad \\mathbf U\\mathbf V^\\top=${bmat(uv, 4)}`, true);
    morphCv.redraw(); threeCv.redraw();
  }
  upd1();

  /* ================= 实验 2：五次迭代拉平奇异值 ================= */
  const NS = { preset: 0, x0: 0.5, k: 5 };
  const PRESETS = [[100, 10, 1, 0.1], [3, 4], null];
  const COLS = [C.c1, C.c6, C.c5, C.c4];
  LAB.segmented('#n-preset', ['书中 4×4', '书中 2×2', '单个 $x_0$'], 0, (i) => { NS.preset = i; sX0.el.style.display = i === 2 ? '' : 'none'; upd2(); });
  const sX0 = LAB.slider('#n-x0', { label: '$x_0$', min: -3, max: 0, step: 0.01, value: Math.log10(0.5), fmt: (v) => fnum(lg(v), 3), onInput: (v) => { NS.x0 = +lg(v).toPrecision(3); upd2(); } });
  sX0.el.style.display = 'none';
  const sK = LAB.slider('#n-k', { label: '已经按了几次（迭代步数 $k$）', min: 0, max: 10, step: 1, value: 5, onInput: (v) => { NS.k = v; upd2(); } });
  $('#n-next').onclick = () => { NS.k = Math.min(10, NS.k + 1); sK.set(NS.k); upd2(); };
  $('#n-reset').onclick = () => { NS.k = 0; sK.set(0); upd2(); };
  let TR = null;
  function compute2() {
    let x0;
    if (NS.preset === 2) x0 = [NS.x0];
    else { const s = PRESETS[NS.preset], f = Math.hypot(...s); x0 = s.map((v) => v / f); }
    const traj = (co) => x0.map((x) => { const a = [x]; for (let k = 0; k < 10; k++) a.push(poly(co)(a[k])); return a; });
    TR = { x0, q: traj(QUINT), c: traj(CUBIC) };
  }
  const polyCv = LAB.canvas('#n-poly', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: 1.3, ymin: 0, ymax: 1.45, xlabel: 'x（当前奇异值）', ylabel: 'p(x)（按一次后）', pad: { l: 44, r: 10, t: 10, b: 36 } }).axes();
    P.clip();
    ctx.fillStyle = 'rgba(47,143,91,.08)'; ctx.fillRect(P.x0, P.ty(1.2), P.x1 - P.x0, P.ty(0.68) - P.ty(1.2));
    P.fn((x) => x, '#9aa5b1', 1.2, [4, 3]);
    P.hline(1, C.c3, [2, 3], 1);
    P.fn(poly(CUBIC), C.c2, 2.2); P.fn(poly(QUINT), C.c1, 2.4);
    // 蛛网：跟踪最小的那个奇异值
    const idx = TR.x0.indexOf(Math.min(...TR.x0));
    [[TR.c[idx], C.c2], [TR.q[idx], C.c1]].forEach(([a, col]) => {
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.3; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(P.tx(a[0]), P.ty(0));
      for (let k = 0; k < NS.k; k++) { ctx.lineTo(P.tx(a[k]), P.ty(a[k + 1])); ctx.lineTo(P.tx(a[k + 1]), P.ty(a[k + 1])); }
      ctx.stroke(); ctx.restore();
      P.points([a[NS.k]], [a[NS.k]], col, 4.5, '#fff');
    });
    P.unclip();
    P.text(0.03, 1.38, `蛛网图跟踪最小的奇异值，已按 ${NS.k} 次`, C.slate, 'left', 'top', `11.5px ${FONT}`);
  });
  const trajCv = LAB.canvas('#n-traj', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: 10, ymin: 1e-4, ymax: 2, logy: true, ytickValues: [1e-4, 1e-3, 0.01, 0.1, 1], xlabel: '按键次数 k', ylabel: '奇异值', pad: { l: 46, r: 10, t: 10, b: 36 } }).axes();
    P.clip();
    ctx.fillStyle = 'rgba(47,143,91,.1)'; ctx.fillRect(P.x0, P.ty(1.2), P.x1 - P.x0, P.ty(0.68) - P.ty(1.2));
    const ks = M.range(11);
    TR.x0.forEach((_, i) => { const col = COLS[i % 4]; P.line(ks, TR.c[i].map((v) => Math.max(v, 1e-5)), col, 1.6, [5, 4]); P.line(ks, TR.q[i].map((v) => Math.max(v, 1e-5)), col, 2.4); P.points([NS.k], [Math.max(TR.q[i][NS.k], 1e-5)], col, 4, '#fff'); });
    P.unclip(); P.vline(NS.k, C.ink, [2, 3], 1);
  });
  const n1 = LAB.stat('#n-stats', '最小奇异值（五次）', 'teal');
  const n2 = LAB.stat('#n-stats', '最小奇异值（三次）', 'amber');
  const n3 = LAB.stat('#n-stats', '最大偏离 $\\max|\\sigma-1|$（五次）', 'coral');
  const n4 = LAB.stat('#n-stats', '矩阵乘法次数 $3k$', 'plum');
  const R2 = LAB.rng(2024);
  const VER = [4, 2].map((n) => ({ n, U: orthRows(R2, n), V: orthRows(R2, n) }));
  function upd2() {
    compute2();
    const k = NS.k, q = TR.q.map((a) => a[k]), c = TR.c.map((a) => a[k]);
    n1.set(fnum(Math.min(...q), 4)); n2.set(fnum(Math.min(...c), 4)); n3.set(fnum(Math.max(...q.map((v) => Math.abs(v - 1))), 3)); n4.set(String(3 * k));
    // 表格
    const names = NS.preset === 2 ? ['x₀'] : TR.x0.map((_, i) => `σ${'₁₂₃₄'[i]}`);
    let html = `<tr><th>奇异值</th><th>多项式</th>${M.range(k + 1).map((j) => `<th>k=${j}</th>`).join('')}</tr>`;
    TR.x0.forEach((_, i) => {
      [['五次', TR.q[i]], ['三次', TR.c[i]]].forEach(([nm, a], r) => { html += `<tr>${r === 0 ? `<td rowspan="2"><b style="color:${COLS[i % 4]}">${names[i]}</b></td>` : ''}<td>${nm}</td>${a.slice(0, k + 1).map((v) => `<td>${v < 1e-3 ? fnum(v, 3) : v.toFixed(4)}</td>`).join('')}</tr>`; });
    });
    $('#n-table').innerHTML = html;
    // 用真的矩阵验算
    if (NS.preset === 2) { $('#n-verify').innerHTML = '选“书中 4×4”或“书中 2×2”时，这里会用一个真的矩阵做矩阵乘法迭代来验算。'; }
    else {
      const s = PRESETS[NS.preset], n = s.length, vv = VER.find((o) => o.n === n), G = new Float64Array(n * n);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { let v = 0; for (let r = 0; r < n; r++) v += vv.U[r][i] * s[r] * vv.V[r][j]; G[i * n + j] = v; }
      const X = nsMatrix(G, n, k, QUINT), sv = svals(X, n), scal = q.slice().sort((a, b) => b - a), diff = Math.max(...sv.map((v, i) => Math.abs(v - scal[i])));
      $('#n-verify').innerHTML = `验算：随机取正交矩阵 $\\mathbf U,\\mathbf V$ 造出 $\\mathbf M=\\mathbf U\\operatorname{diag}(${s.join(',')})\\mathbf V^\\top$（${n}×${n}），真的做 ${k} 步五次矩阵迭代（共 ${3 * k} 次矩阵乘法）后再做 SVD，得到奇异值 (${sv.map((v) => v.toFixed(4)).join(', ')})；逐个按计算器得到 (${scal.map((v) => v.toFixed(4)).join(', ')})，最大差 ${fnum(diff, 2)}。`;
      LAB.renderMath($('#n-verify'));
    }
    polyCv.redraw(); trajCv.redraw();
  }
  upd2();

  /* ================= 实验 3：Muon 对 Adam 训练赛 ================= */
  const RC = { kappa: 1e4, T: 200, lrS: 3, lrA: 0.2, lrM: 0.1, kimi: false, decay: true, seed: 5, t: 200 };
  const N = 12;
  const OPTS = [['sgd', 'SGD', C.c1], ['adam', 'Adam', C.c2], ['muon', 'Muon', C.c3]];
  let RR = null;
  function ns5(Gm) { return nsMatrix(Gm, N, 5, QUINT); }
  function runRace() {
    const R = LAB.rng(RC.seed), Q = orthRows(R, N), s = M.range(N).map((i) => Math.pow(RC.kappa, -i / (N - 1)));
    const Sm = new Float64Array(N * N); for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { let v = 0; for (let k = 0; k < N; k++) v += Q[k][i] * s[k] * Q[k][j]; Sm[i * N + j] = v; }
    const Ws = Float64Array.from({ length: N * N }, () => R.normal() / Math.sqrt(N));
    const lrM = RC.kimi ? 0.2 * Math.sqrt(N) * RC.lrA : RC.lrM;
    const out = {};
    OPTS.forEach(([k]) => {
      const W = new Float64Array(N * N), m = new Float64Array(N * N), v = new Float64Array(N * N);
      const loss = [], err = [], chan = [];
      const record = () => {
        const E = W.map((x, i) => x - Ws[i]), ES = matmul(E, Sm, N); let l = 0, e2 = 0; for (let i = 0; i < N * N; i++) { l += E[i] * ES[i]; e2 += E[i] * E[i]; }
        loss.push(isFinite(l) ? 0.5 * l : Infinity); err.push(Math.sqrt(e2));
        chan.push(Q.map((q) => { let t = 0; for (let i = 0; i < N; i++) { let r = 0; for (let j = 0; j < N; j++) r += E[i * N + j] * q[j]; t += r * r; } return Math.sqrt(t); }));
      };
      record();
      for (let t = 1; t <= RC.T; t++) {
        const E = W.map((x, i) => x - Ws[i]), g = matmul(E, Sm, N), f = RC.decay ? 1 - (t - 1) / RC.T : 1;
        if (k === 'sgd') { const lr = RC.lrS * f; for (let i = 0; i < N * N; i++) { m[i] = 0.9 * m[i] + g[i]; W[i] -= lr * m[i]; } }
        else if (k === 'adam') { const lr = RC.lrA * f; for (let i = 0; i < N * N; i++) { m[i] = 0.9 * m[i] + 0.1 * g[i]; v[i] = 0.999 * v[i] + 0.001 * g[i] * g[i]; W[i] -= (lr * (m[i] / (1 - 0.9 ** t))) / (Math.sqrt(v[i] / (1 - 0.999 ** t)) + 1e-8); } }
        else { const lr = lrM * f; for (let i = 0; i < N * N; i++) m[i] = 0.95 * m[i] + g[i]; const O = ns5(g.map((x, i) => x + 0.95 * m[i])); for (let i = 0; i < N * N; i++) W[i] -= lr * O[i]; }
        if (!isFinite(W[0]) || Math.abs(W[0]) > 1e6) { for (let r = t; r <= RC.T; r++) { loss.push(Infinity); err.push(Infinity); chan.push(new Array(N).fill(Infinity)); } break; }
        record();
      }
      out[k] = { loss, err, chan };
    });
    RR = { out, s, lrM };
  }
  LAB.slider('#r-kappa', { label: '条件数 $\\kappa$', min: 1, max: 4, step: 0.1, value: 4, fmt: (v) => fnum(lg(v), 3), onInput: (v) => { RC.kappa = lg(v); upd3(); } });
  const sT = LAB.slider('#r-steps', { label: '训练步数 $T$', min: 50, max: 400, step: 10, value: 200, onInput: (v) => { RC.T = v; RC.t = v; tS.setRange(0, v, 1); tS.set(v); upd3(); } });
  LAB.slider('#r-lr-sgd', { label: 'SGD 学习率', min: -1, max: 0.7, step: 0.01, value: Math.log10(3), fmt: (v) => fnum(lg(v), 2), hint: '动量 0.9 时稳定上限约 3.8', onInput: (v) => { RC.lrS = lg(v); upd3(); } });
  LAB.slider('#r-lr-adam', { label: 'Adam 学习率', min: -2.5, max: 0, step: 0.01, value: Math.log10(0.2), fmt: (v) => fnum(lg(v), 2), onInput: (v) => { RC.lrA = lg(v); upd3(); } });
  const sM = LAB.slider('#r-lr-muon', { label: 'Muon 学习率', min: -2.5, max: 0, step: 0.01, value: Math.log10(0.1), fmt: (v) => fnum(RC.kimi ? 0.2 * Math.sqrt(N) * RC.lrA : lg(v), 2), onInput: (v) => { RC.lrM = lg(v); upd3(); } });
  LAB.checkbox('#r-kimi', 'Kimi 对齐：Muon 用 $0.2\\sqrt{12}\\times$ Adam 学习率', false, (v) => { RC.kimi = v; sM.input.disabled = v; sM.el.style.opacity = v ? 0.55 : 1; upd3(); });
  LAB.checkbox('#r-decay', '学习率线性衰减到 0', true, (v) => { RC.decay = v; upd3(); });
  $('#r-seed').onclick = () => { RC.seed++; upd3(); };
  const tS = LAB.slider('#r-t', { label: '看第几步', min: 0, max: 200, step: 1, value: 200, onInput: (v) => { RC.t = v; chanCv.redraw(); lossCv.redraw(); errCv.redraw(); } });
  function curve(id, key, ylab) {
    return LAB.canvas(id, (ctx, w, h) => {
      if (!RR) return;
      const all = OPTS.flatMap(([k]) => RR.out[k][key]).filter(isFinite), hi = Math.pow(10, Math.ceil(Math.log10(Math.max(...all)) + 0.2)), lo = Math.max(1e-12, Math.pow(10, Math.floor(Math.log10(Math.max(1e-12, Math.min(...all))))));
      const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: RC.T, ymin: lo, ymax: hi, logy: true, xlabel: '步数', ylabel: ylab, pad: { l: 50, r: 10, t: 10, b: 36 } }).axes();
      P.clip();
      OPTS.forEach(([k, , col]) => { const a = RR.out[k][key]; P.line(a.map((_, i) => i), a.map((v) => (isFinite(v) ? Math.max(v, lo) : hi * 10)), col, 2.2); });
      P.unclip(); P.vline(RC.t, C.ink, [2, 3], 1);
    });
  }
  const lossCv = curve('#r-loss', 'loss', '损失');
  const errCv = curve('#r-err', 'err', '‖W − W*‖');
  const chanCv = LAB.canvas('#r-chan', (ctx, w, h) => {
    if (!RR) return;
    const t = Math.min(RC.t, RC.T), lo = 1e-4, hi = 3;
    const P = new LAB.Plot(ctx, w, h, { xmin: 0.4, xmax: N + 0.6, ymin: lo, ymax: hi, logy: true, xtickValues: M.range(N).map((i) => i + 1), xfmt: (v) => (v === 1 || v === N ? `s=${fnum(RR.s[v - 1], 2)}` : String(v)), ytickValues: [1e-4, 1e-3, 0.01, 0.1, 1], xlabel: '通道（按曲率从大到小）', ylabel: '剩余误差', pad: { l: 46, r: 10, t: 10, b: 36 } }).axes();
    const bw = Math.min(14, (P.tx(2) - P.tx(1)) * 0.27);
    OPTS.forEach(([k, , col], q) => { const e = RR.out[k].chan[t]; for (let i = 0; i < N; i++) { const v = M.clamp(isFinite(e[i]) ? e[i] : hi, lo, hi), X = P.tx(i + 1) + (q - 1) * bw * 1.1; ctx.fillStyle = col; LAB.roundRect(ctx, X - bw / 2, P.ty(v), bw, P.ty(lo) - P.ty(v), 2); ctx.fill(); } });
    P.text(N + 0.5, hi * 0.8, `第 ${t} 步`, C.ink, 'right', 'top', `600 12px ${FONT}`);
  });
  const rs = OPTS.map(([, name], i) => LAB.stat('#r-stats', `${name}：最终损失 · 误差`, ['', 'amber', 'leaf'][i]));
  function upd3() {
    runRace();
    OPTS.forEach(([k], i) => { const o = RR.out[k], L = o.loss[o.loss.length - 1], E = o.err[o.err.length - 1]; rs[i].set(isFinite(L) ? `${fnum(L, 3)}<small> · ${fnum(E, 3)}</small>` : '跑飞'); });
    sM.set(Math.log10(RC.lrM));
    lossCv.redraw(); errCv.redraw(); chanCv.redraw();
  }
  upd3();
})();
