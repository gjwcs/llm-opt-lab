/* 第 9 章：如果峡谷是斜着摆的怎么办？—— 交互实验 */
(function () {
  const { COLORS: C, M } = LAB;
  LAB.page({ bookRef: '对应书中 §9.1 斜着摆的峡谷与牛顿法 · §9.2 自然梯度与费雪表格 · §9.3 K-FAC 与 Shampoo · §9.4 手算对比' });
  document.querySelectorAll('.formula').forEach((f) => { f.style.width = '0'; f.style.minWidth = '100%'; });
  const $ = (s) => document.querySelector(s);
  const FONT = getComputedStyle(document.body).getPropertyValue('--font');
  const NUMF = getComputedStyle(document.body).getPropertyValue('--font-num');
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = (e) => String(e).split('').map((c) => SUP[c] || c).join('');
  // 通用数字格式：有效数字 d 位，去掉多余的 0
  const sciParts = (x) => { let e = Math.floor(Math.log10(Math.abs(x))), m = +(x / Math.pow(10, e)).toPrecision(3); if (Math.abs(m) >= 10) { m /= 10; e++; } return [m, e]; };
  const fnum = (x, d) => { if (!isFinite(x)) return x > 0 ? '∞' : '–'; if (x === 0) return '0'; const a = Math.abs(x); if (a >= 1e5 || a < 1e-4) { const [m, e] = sciParts(x); return (m === 1 ? '' : m + '×') + '10' + sup(e); } return String(+x.toPrecision(d || 4)); };
  const tnum = (x, d) => { if (!isFinite(x)) return '\\infty'; if (x === 0) return '0'; const a = Math.abs(x); if (a >= 1e5 || a < 1e-4) { const [m, e] = sciParts(x); return (m === 1 ? '' : m + '\\times') + '10^{' + e + '}'; } return String(+x.toPrecision(d || 4)); };
  const bmat = (A, d) => '\\begin{bmatrix}' + A.map((r) => r.map((v) => tnum(Math.abs(v) < 1e-12 ? 0 : v, d)).join(' & ')).join('\\\\') + '\\end{bmatrix}';
  const bvec = (v, d) => bmat(v.map((x) => [x]), d);
  function pointer(cv, h) {
    cv.style.touchAction = 'none';
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    let active = false;
    cv.addEventListener('pointerdown', (e) => { if (h.down && h.down(pos(e)) !== false) { active = true; cv.setPointerCapture(e.pointerId); e.preventDefault(); } });
    cv.addEventListener('pointermove', (e) => { if (active) h.move && h.move(pos(e)); });
    const end = () => { active = false; h.up && h.up(); };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  }
  // 等比例坐标范围：让 x、y 方向一个单位的像素数相同
  function squareRange(w, h, pad, cx, cy, half) {
    const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b, s = Math.min(iw, ih) / (2 * half);
    return { xmin: cx - iw / (2 * s), xmax: cx + iw / (2 * s), ymin: cy - ih / (2 * s), ymax: cy + ih / (2 * s) };
  }
  function label(ctx, txt, x, y, col, font, align, base) { ctx.fillStyle = col || C.ink; ctx.font = font || `12px ${FONT}`; ctx.textAlign = align || 'center'; ctx.textBaseline = base || 'middle'; ctx.fillText(txt, x, y); }
  // 2×2 对称矩阵的特征分解：返回 {l:[λ1,λ2], v:[[c,s],[-s,c]]}（λ1≥λ2）
  function eig2(A) {
    const a = A[0][0], b = A[0][1], d = A[1][1], tr = a + d, df = Math.sqrt(((a - d) / 2) ** 2 + b * b);
    const l1 = tr / 2 + df, l2 = tr / 2 - df, th = 0.5 * Math.atan2(2 * b, a - d);
    return { l: [l1, l2], v: [[Math.cos(th), Math.sin(th)], [-Math.sin(th), Math.cos(th)]] };
  }
  const mm2 = (A, B) => [[A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]], [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]];
  const tr2 = (A) => [[A[0][0], A[1][0]], [A[0][1], A[1][1]]];
  const symPow = (A, p) => { const e = eig2(A), f = e.l.map((l) => (l > 1e-300 ? Math.pow(l, p) : 0)), v = e.v; return [[f[0] * v[0][0] * v[0][0] + f[1] * v[1][0] * v[1][0], f[0] * v[0][0] * v[0][1] + f[1] * v[1][0] * v[1][1]], [f[0] * v[0][1] * v[0][0] + f[1] * v[1][1] * v[1][0], f[0] * v[0][1] * v[0][1] + f[1] * v[1][1] * v[1][1]]]; };
  const sv2 = (A) => { const e = eig2(mm2(tr2(A), A)); return e.l.map((l) => Math.sqrt(Math.max(0, l))); };

  /* ================= 实验 1：斜峡谷下山赛 ================= */
  const V = { ang: 45, kappa: 100, steps: 50, lrGD: 0.009, lrAdam: 0.1, eta: 1, p0: [1, 0] };
  const METHODS = [['gd', 'GD', C.c1], ['adam', 'Adam', C.c2], ['diag', '对角预条件', C.c5], ['newton', '牛顿法', C.c3]];
  let RUN = null;
  function Hmat() {
    const a = (V.ang * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), l1 = 200, l2 = 200 / V.kappa;
    return [[l1 * c * c + l2 * s * s, (l1 - l2) * c * s], [(l1 - l2) * c * s, l1 * s * s + l2 * c * c]];
  }
  function runValley() {
    const H = Hmat(), T = V.steps, det = H[0][0] * H[1][1] - H[0][1] * H[1][0];
    const Hi = [[H[1][1] / det, -H[0][1] / det], [-H[1][0] / det, H[0][0] / det]];
    const grad = (p) => [H[0][0] * p[0] + H[0][1] * p[1], H[1][0] * p[0] + H[1][1] * p[1]];
    const loss = (p) => { const g = grad(p); return 0.5 * (p[0] * g[0] + p[1] * g[1]); };
    const res = {};
    METHODS.forEach(([k]) => {
      let p = V.p0.slice(); const pts = [p.slice()], L = [loss(p)]; const m = [0, 0], v = [0, 0];
      for (let t = 1; t <= T; t++) {
        const g = grad(p);
        if (k === 'gd') p = [p[0] - V.lrGD * g[0], p[1] - V.lrGD * g[1]];
        else if (k === 'adam') { for (let i = 0; i < 2; i++) { m[i] = 0.9 * m[i] + 0.1 * g[i]; v[i] = 0.99 * v[i] + 0.01 * g[i] * g[i]; p[i] -= (V.lrAdam * (m[i] / (1 - 0.9 ** t))) / (Math.sqrt(v[i] / (1 - 0.99 ** t)) + 1e-8); } }
        else if (k === 'diag') p = [p[0] - (V.eta * g[0]) / H[0][0], p[1] - (V.eta * g[1]) / H[1][1]];
        else p = [p[0] - V.eta * (Hi[0][0] * g[0] + Hi[0][1] * g[1]), p[1] - V.eta * (Hi[1][0] * g[0] + Hi[1][1] * g[1])];
        if (!isFinite(p[0]) || Math.hypot(p[0], p[1]) > 1e8) { pts.push([NaN, NaN]); L.push(Infinity); break; }
        pts.push(p.slice()); L.push(loss(p));
      }
      res[k] = { pts, L };
    });
    RUN = { H, Hi, res, g0: grad(V.p0), L0: loss(V.p0) };
  }
  const sAng = LAB.slider('#v-angle', { label: '峡谷倾斜角 $\\alpha$', min: 0, max: 90, step: 1, value: V.ang, fmt: (v) => v + '°', onInput: (v) => { V.ang = v; upd1(); } });
  LAB.slider('#v-kappa', { label: '条件数 $\\kappa=\\lambda_{\\max}/\\lambda_{\\min}$', min: 0, max: 3, step: 0.05, value: 2, fmt: (v) => fnum(Math.pow(10, v), 3), onInput: (v) => { V.kappa = Math.pow(10, v); upd1(); } });
  LAB.slider('#v-steps', { label: '每种方法走的步数', min: 5, max: 200, step: 1, value: V.steps, onInput: (v) => { V.steps = v; upd1(); } });
  LAB.slider('#v-lr-gd', { label: 'GD 学习率 $\\eta$', min: -4, max: -1.7, step: 0.01, value: Math.log10(0.009), fmt: (v) => fnum(Math.pow(10, v), 2), hint: '稳定上限 $2/\\lambda_{\\max}=0.01$', onInput: (v) => { V.lrGD = Math.pow(10, v); upd1(); } });
  LAB.slider('#v-lr-adam', { label: 'Adam 学习率', min: -3, max: -0.3, step: 0.01, value: -1, fmt: (v) => fnum(Math.pow(10, v), 2), onInput: (v) => { V.lrAdam = Math.pow(10, v); upd1(); } });
  LAB.slider('#v-eta', { label: '牛顿 / 对角预条件的步长 $\\eta$', min: 0.05, max: 1.2, step: 0.05, value: 1, fmt: (v) => v.toFixed(2), onInput: (v) => { V.eta = v; upd1(); } });
  $('#v-p10').onclick = () => { V.p0 = [1, 0]; upd1(); };
  $('#v-p11').onclick = () => { V.p0 = [1, 1]; upd1(); };
  let mapP = null;
  const mapCv = LAB.canvas('#v-map', (ctx, w, h) => {
    const pad = { l: 30, r: 10, t: 10, b: 24 };
    const rg = squareRange(w, h, pad, 0, 0, 1.45), tk = [-3, -2, -1, 0, 1, 2, 3];
    const P = (mapP = new LAB.Plot(ctx, w, h, Object.assign({ pad, xtickValues: tk.filter((v) => v >= rg.xmin && v <= rg.xmax), ytickValues: tk.filter((v) => v >= rg.ymin && v <= rg.ymax) }, rg)));
    const { H } = RUN, e = eig2(H), cx = P.tx(0), cy = P.ty(0), sx = P.tx(1) - P.tx(0);
    // 等高线：沿缓方向的半轴等间距
    const lmin = e.l[1], lmax = e.l[0], ang = Math.atan2(e.v[0][1], e.v[0][0]);
    P.clip();
    for (let k = 9; k >= 1; k--) {
      const a = (k / 9) * 2.1, c = 0.5 * lmin * a * a;
      const rSlow = a * sx, rFast = Math.sqrt((2 * c) / lmax) * sx;
      ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(rFast, 0.6), rSlow, -ang, 0, 2 * Math.PI);
      ctx.fillStyle = LAB.heat(0.08 + 0.42 * (1 - k / 9)); ctx.fill();
      ctx.strokeStyle = 'rgba(29,53,87,.22)'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
    P.axes();
    P.clip();
    // 峡谷主轴
    ctx.save(); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2;
    [[e.v[0], C.c4], [e.v[1], C.teal]].forEach(([v, col]) => { ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(P.tx(-3 * v[0]), P.ty(-3 * v[1])); ctx.lineTo(P.tx(3 * v[0]), P.ty(3 * v[1])); ctx.stroke(); });
    ctx.restore();
    const lab = (v, txt, col) => { const t = 1.18, X = P.tx(t * v[0]), Y = P.ty(t * v[1]); ctx.save(); ctx.font = `600 11.5px ${FONT}`; const tw = ctx.measureText(txt).width; ctx.fillStyle = 'rgba(255,255,255,.85)'; LAB.roundRect(ctx, X - tw / 2 - 4, Y - 9, tw + 8, 18, 5); ctx.fill(); label(ctx, txt, X, Y, col, `600 11.5px ${FONT}`); ctx.restore(); };
    lab(e.v[0][1] >= 0 ? e.v[0] : [-e.v[0][0], -e.v[0][1]], `陡：曲率 ${fnum(lmax, 3)}`, C.c4);
    lab(e.v[1][1] >= 0 ? e.v[1] : [-e.v[1][0], -e.v[1][1]], `缓：曲率 ${fnum(lmin, 3)}`, C.teal);
    // 轨迹
    [2, 0, 1, 3].forEach((q) => {
      const [k, , col] = METHODS[q], pts = RUN.res[k].pts.filter((p) => isFinite(p[0])), faint = k === 'diag';
      ctx.strokeStyle = col; ctx.lineWidth = faint ? 1.1 : 1.9; ctx.globalAlpha = faint ? 0.55 : 0.95; ctx.beginPath();
      pts.forEach((p, i) => { const X = P.tx(p[0]), Y = P.ty(p[1]); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.stroke();
      ctx.fillStyle = col; pts.forEach((p, i) => { if (i === 0) return; ctx.beginPath(); ctx.arc(P.tx(p[0]), P.ty(p[1]), k === 'newton' ? 4.5 : faint ? 1.5 : 2.3, 0, 7); ctx.fill(); });
      ctx.globalAlpha = 1;
    });
    P.unclip();
    // 谷底与起点
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 7); ctx.fill();
    const sxp = P.tx(V.p0[0]), syp = P.ty(V.p0[1]);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sxp, syp, 7, 0, 7); ctx.fill(); ctx.stroke();
  });
  pointer(mapCv.canvas, {
    down: ([x, y]) => { if (!mapP) return false; setStart(x, y); },
    move: ([x, y]) => setStart(x, y),
  });
  function setStart(x, y) { const px = M.clamp(mapP.ix(x), -1.4, 1.4), py = M.clamp(mapP.iy(y), -1.4, 1.4); V.p0 = [+px.toFixed(2), +py.toFixed(2)]; upd1(); }
  const lossCv = LAB.canvas('#v-loss', (ctx, w, h) => {
    const T = V.steps, top = Math.max(1e4, RUN.L0 * 10);
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: T, ymin: 1e-14, ymax: top, logy: true, ytickValues: [1e-14, 1e-10, 1e-6, 0.01, 100, 1e6].filter((v) => v <= top), xlabel: '步数 t', ylabel: '损失', pad: { l: 50, r: 10, t: 10, b: 36 } }).axes();
    P.clip();
    METHODS.forEach(([k, , col], q) => { const L = RUN.res[k].L; P.line(L.map((_, i) => i), L.map((v) => (v === Infinity ? top * 10 : Math.max(v, 1.2e-14))), col, 2.2, q === 2 ? [6, 4] : null); });
    P.unclip();
  });
  const st = METHODS.map(([k, name], i) => LAB.stat('#v-stats', `${name}：${'走完后的损失'}`, ['', 'amber', 'plum', 'leaf'][i]));
  function upd1() {
    runValley();
    METHODS.forEach(([k], i) => { const L = RUN.res[k].L, v = L[L.length - 1]; st[i].set(v === Infinity ? '跑飞' : fnum(v, 3)); });
    const { H, Hi, g0 } = RUN, ng = [Hi[0][0] * g0[0] + Hi[0][1] * g0[1], Hi[1][0] * g0[0] + Hi[1][1] * g0[1]];
    const ad = g0.map((g) => g / (Math.abs(g) + 1e-8));
    $('#v-hand').innerHTML = LAB.tex(`\\boldsymbol\\theta_0=${bvec(V.p0, 3)},\\quad \\mathbf H=${bmat(H, 4)},\\quad \\mathbf g=\\mathbf H\\boldsymbol\\theta_0=${bvec(g0, 4)}`, true) + LAB.tex(`\\text{牛顿步 }\\mathbf H^{-1}\\mathbf g=${bvec(ng, 4)},\\qquad \\text{Adam 第 1 步方向 }\\frac{\\mathbf g}{|\\mathbf g|}=${bvec(ad, 3)}`, true);
    mapCv.redraw(); lossCv.redraw();
  }
  upd1();

  /* ================= 实验 2：大表拆成两张小表 ================= */
  const K = { x: [2, 3], g: [10, -5], m: 4096, n: 4096, rot: 0, pow: -0.25 };
  const sx1 = LAB.slider('#k-x1', { label: '输入 $x_1$', min: -4, max: 4, step: 0.5, value: 2, onInput: (v) => { K.x[0] = v; upd2(); } });
  const sx2 = LAB.slider('#k-x2', { label: '输入 $x_2$', min: -4, max: 4, step: 0.5, value: 3, onInput: (v) => { K.x[1] = v; upd2(); } });
  const sg1 = LAB.slider('#k-g1', { label: '输出斜率 $g_1$', min: -10, max: 10, step: 1, value: 10, onInput: (v) => { K.g[0] = v; upd2(); } });
  const sg2 = LAB.slider('#k-g2', { label: '输出斜率 $g_2$', min: -10, max: 10, step: 1, value: -5, onInput: (v) => { K.g[1] = v; upd2(); } });
  $('#k-book').onclick = () => { K.x = [2, 3]; K.g = [10, -5]; sx1.set(2); sx2.set(3); sg1.set(10); sg2.set(-5); upd2(); };
  const P2 = (k) => Math.pow(2, k);
  LAB.slider('#k-m', { label: '输出维度 $m$', min: 6, max: 14, step: 1, value: 12, fmt: (v) => P2(v).toLocaleString(), onInput: (v) => { K.m = P2(v); upd2(); } });
  LAB.slider('#k-n', { label: '输入维度 $n$', min: 6, max: 14, step: 1, value: 12, fmt: (v) => P2(v).toLocaleString(), onInput: (v) => { K.n = P2(v); upd2(); } });
  const outer = (a, b) => a.map((ai) => b.map((bj) => ai * bj));
  function drawGrid(ctx, A, x0, y0, side, mx, opt) {
    const n = A.length, c = side / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = A[i][j]; ctx.fillStyle = LAB.diverge(mx ? v / mx : 0); ctx.fillRect(x0 + j * c, y0 + i * c, c, c);
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + j * c + 0.5, y0 + i * c + 0.5, c - 1, c - 1);
      const dark = Math.abs(mx ? v / mx : 0) > 0.55;
      const fs = Math.max(9, Math.min(15, c * 0.3));
      label(ctx, fnum(v, 3), x0 + (j + 0.5) * c, y0 + (i + 0.5) * c, dark ? '#fff' : C.ink, `600 ${fs}px ${NUMF}`);
    }
    if (opt && opt.blocks) { ctx.strokeStyle = C.navy; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x0 + side / 2, y0 - 3); ctx.lineTo(x0 + side / 2, y0 + side + 3); ctx.moveTo(x0 - 3, y0 + side / 2); ctx.lineTo(x0 + side + 3, y0 + side / 2); ctx.stroke(); }
    ctx.strokeStyle = '#9aa5b1'; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, side, side);
    if (opt && opt.title) label(ctx, opt.title, x0 + side / 2, y0 - 12, opt.col || C.navy, `600 13px ${FONT}`);
  }
  const kronCv = LAB.canvas('#k-kron', (ctx, w, h) => {
    const vecG = [K.g[0] * K.x[0], K.g[0] * K.x[1], K.g[1] * K.x[0], K.g[1] * K.x[1]];
    const F = outer(vecG, vecG), L = outer(K.g, K.g), R = outer(K.x, K.x);
    const mx = Math.max(1e-9, ...F.flat().map(Math.abs)), narrow = w < 520;
    if (!narrow) {
      const big = Math.min(h - 50, w * 0.48), sm = Math.min(big * 0.45, (w - big - 120) / 2);
      const y0 = 30, x0 = 6;
      drawGrid(ctx, F, x0, y0, big, mx, { blocks: true, title: '大表 F = vec(G) vec(G)ᵀ' });
      const xr = x0 + big + 34;
      label(ctx, '=', xr - 14, y0 + big / 2, C.ink, `600 22px ${NUMF}`);
      const lmax = Math.max(1e-9, ...L.flat().map(Math.abs)), rmax = Math.max(1e-9, ...R.flat().map(Math.abs));
      const yy = y0 + big / 2 - sm / 2;
      drawGrid(ctx, L, xr, yy, sm, lmax, { title: 'L = g gᵀ', col: C.c4 });
      label(ctx, '⊗', xr + sm + 18, yy + sm / 2, C.ink, `600 22px ${NUMF}`);
      drawGrid(ctx, R, xr + sm + 36, yy, sm, rmax, { title: 'R = x xᵀ', col: C.c1 });
      label(ctx, `左上块 = ${fnum(L[0][0], 3)} × R，右上块 = ${fnum(L[0][1], 3)} × R`, xr, yy + sm + 26, C.slate, `12px ${FONT}`, 'left');
      label(ctx, `左下块 = ${fnum(L[1][0], 3)} × R，右下块 = ${fnum(L[1][1], 3)} × R`, xr, yy + sm + 44, C.slate, `12px ${FONT}`, 'left');
    } else {
      const big = Math.min(w - 12, h - 150), x0 = (w - big) / 2, y0 = 24;
      drawGrid(ctx, F, x0, y0, big, mx, { blocks: true, title: '大表 F' });
      const sm = Math.min(86, (w - 80) / 2), yy = y0 + big + 36;
      const lmax = Math.max(1e-9, ...L.flat().map(Math.abs)), rmax = Math.max(1e-9, ...R.flat().map(Math.abs));
      const xa = w / 2 - sm - 20;
      drawGrid(ctx, L, xa, yy, sm, lmax, { title: 'L = g gᵀ', col: C.c4 });
      label(ctx, '⊗', w / 2, yy + sm / 2, C.ink, `600 20px ${NUMF}`);
      drawGrid(ctx, R, w / 2 + 20, yy, sm, rmax, { title: 'R = x xᵀ', col: C.c1 });
    }
  });
  const memCv = LAB.canvas('#k-mem', (ctx, w, h) => {
    const m = K.m, n = K.n, rows = [['整张费雪表 (mn)²', 4 * (m * n) ** 2, C.c4], ['K-FAC / Shampoo m²+n²', 4 * (m * m + n * n), C.c3], ['AdamW 两本账 2mn', 8 * m * n, C.c2], ['参数本身 mn', 4 * m * n, C.slate]];
    const narrow = w < 520, l = narrow ? 8 : 190, rp = 92, lo = Math.pow(10, Math.floor(Math.log10(4 * m * n)) - 1), hi = Math.pow(10, Math.ceil(Math.log10(4 * (m * n) ** 2)) + 0.3);
    const X = (b) => l + ((Math.log10(b) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (w - l - rp);
    const rowH = (h - 26) / rows.length;
    rows.forEach(([name, bytes, col], i) => {
      const y = 6 + i * rowH, bh = narrow ? rowH * 0.36 : Math.min(26, rowH * 0.58), by = narrow ? y + rowH * 0.48 : y + (rowH - bh) / 2;
      const nm = name;
      if (narrow) label(ctx, nm, l, y + rowH * 0.24, C.ink, `12px ${FONT}`, 'left'); else label(ctx, nm, l - 10, by + bh / 2, C.ink, `12.5px ${FONT}`, 'right');
      ctx.fillStyle = col; LAB.roundRect(ctx, l, by, Math.max(2, X(bytes) - l), bh, 4); ctx.fill();
      label(ctx, human(bytes), X(bytes) + 6, by + bh / 2, C.navy, `600 12.5px ${NUMF}`, 'left');
    });
    // 对数刻度
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    for (let e = Math.ceil(Math.log10(lo)); e <= Math.floor(Math.log10(hi)); e += 3) { const x = X(Math.pow(10, e)); ctx.beginPath(); ctx.moveTo(x, h - 20); ctx.lineTo(x, h - 14); ctx.stroke(); label(ctx, human(Math.pow(10, e)), x, h - 6, C.slate, `10.5px ${NUMF}`); }
  });
  function human(b) { const u = [['EB', 1e18], ['PB', 1e15], ['TB', 1e12], ['GB', 1e9], ['MB', 1e6], ['KB', 1e3]]; for (const [s, v] of u) if (b >= v) return +(b / v).toPrecision(3) + ' ' + s; return Math.round(b) + ' B'; }
  // Shampoo 的 −1/4 次方
  LAB.slider('#k-rot', { label: '把 $\\operatorname{diag}(16,1)$ 旋转的角度', min: 0, max: 90, step: 1, value: 0, fmt: (v) => v + '°', onInput: (v) => { K.rot = v; updShampoo(); } });
  LAB.slider('#k-pow', { label: '左右小表的指数 $p$', min: -0.5, max: 0, step: 0.0625, value: -0.25, fmt: (v) => (v === -0.25 ? '−1/4' : v === -0.5 ? '−1/2' : v === 0 ? '0' : v.toFixed(3)), onInput: (v) => { K.pow = v; updShampoo(); } });
  let SH = null;
  function updShampoo() {
    const a = (K.rot * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), Rm = [[c, -s], [s, c]];
    const G = mm2(mm2(Rm, [[16, 0], [0, 1]]), tr2(Rm));
    const Lp = symPow(mm2(G, tr2(G)), K.pow), Rp = symPow(mm2(tr2(G), G), K.pow);
    const sgd = G.map((r) => r.map((v) => -0.1 * v)), adam = G.map((r) => r.map((v) => (-0.1 * v) / (Math.abs(v) + 1e-8))), sh = mm2(mm2(Lp, G), Rp).map((r) => r.map((v) => -0.1 * v));
    SH = { G, ups: [['SGD', sgd, C.c1], ['Adam', adam, C.c2], ['Shampoo', sh, C.c5]] };
    $('#k-shampoo-mats').innerHTML = LAB.tex(`\\mathbf G=${bmat(G, 3)}`, true) + LAB.tex(`-0.1\\,\\tfrac{\\mathbf G}{|\\mathbf G|}=${bmat(adam, 3)},\\quad -0.1\\,\\mathbf L^{p}\\mathbf G\\mathbf R^{p}=${bmat(sh, 3)}`, true);
    svCv.redraw();
  }
  const svCv = LAB.canvas('#k-sv', (ctx, w, h) => {
    if (!SH) return;
    const data = SH.ups.map(([n, A, col]) => [n, sv2(A), col]), mx = Math.max(0.2, ...data.map((d) => d[1][0])) * 1.15;
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: 3, ymin: 0, ymax: mx, xtickValues: [], ylabel: '更新量的奇异值', pad: { l: 50, r: 8, t: 14, b: 40 } }).axes();
    const bw = Math.min(26, (P.tx(1) - P.tx(0)) * 0.3);
    data.forEach(([n, s, col], i) => {
      const xc = i + 0.5;
      [0, 1].forEach((k) => { const X = P.tx(xc) + (k ? 1 : -1) * (bw * 0.6); ctx.fillStyle = k ? LAB.mix('#ffffff', col, 0.55) : col; LAB.roundRect(ctx, X - bw / 2, P.ty(s[k]), bw, Math.max(1, P.ty(0) - P.ty(s[k])), 3); ctx.fill(); label(ctx, fnum(s[k], 3), X, P.ty(s[k]) - 8, C.ink, `600 11px ${NUMF}`); });
      label(ctx, n, P.tx(xc), P.y0 + 14, col, `600 12.5px ${FONT}`);
    });
    label(ctx, '深色 σ₁ · 浅色 σ₂', P.tx(1.5), P.y0 + 30, C.slate, `11px ${FONT}`);
  });
  const k1 = LAB.stat('#k-stats', '斜率表 $\\mathbf G=\\mathbf g\\mathbf x^\\top$');
  const k2 = LAB.stat('#k-stats', '整张费雪表（FP32）', 'coral');
  const k3 = LAB.stat('#k-stats', '两张小表（FP32）', 'leaf');
  const k4 = LAB.stat('#k-stats', '缩小倍数 $\\frac{(mn)^2}{m^2+n^2}$', 'teal');
  function upd2() {
    const G = outer(K.g, K.x);
    k1.set(`<span style="font-size:15px">${LAB.tex(bmat(G, 3))}</span>`);
    const m = K.m, n = K.n;
    const fb = 4 * (m * n) ** 2; k2.set(human(fb) + (fb >= 1e12 ? `<small>≈${fb / 1e9 >= 1e4 ? +(fb / 1e13).toPrecision(4) + ' 万' : Math.round(fb / 1e9)} GB</small>` : '')); k3.set(human(4 * (m * m + n * n))); k4.set(fnum((m * n) ** 2 / (m * m + n * n), 3) + '<small>倍</small>');
    kronCv.redraw(); memCv.redraw();
  }
  upd2(); updShampoo();

  /* ================= 实验 3：自然梯度的概率尺子 ================= */
  const N = { p: 0.5, q: 0.51, lrGD: 0.003, lrNG: 0.1, steps: 60, start: [-2, 0.3], target: [1, 1] };
  const logit = (p) => Math.log(p / (1 - p)), sig = (z) => 1 / (1 + Math.exp(-z));
  const KL = (p, q) => p * Math.log(p / q) + (1 - p) * Math.log((1 - p) / (1 - q));
  const fp = (p) => (p > 0.999 || p < 0.001 ? p.toFixed(5).replace(/0+$/, '') : p.toFixed(4).replace(/0+$/, '').replace(/\.$/, ''));
  const sP = LAB.slider('#n-p', { label: '原概率 $p$', min: -9.5, max: 9.5, step: 0.01, value: 0, fmt: () => fp(N.p), onInput: (v) => { N.p = sig(v); upd3(); } });
  const sQ = LAB.slider('#n-q', { label: '新概率 $q=p+\\Delta p$', min: -9.5, max: 9.5, step: 0.01, value: logit(0.51), fmt: () => fp(N.q), onInput: (v) => { N.q = sig(v); upd3(); } });
  $('#n-a').onclick = () => { N.p = 0.5; N.q = 0.51; sP.set(logit(0.5)); sQ.set(logit(0.51)); upd3(); };
  $('#n-b').onclick = () => { N.p = 0.9999; N.q = 0.99; sP.set(logit(0.9999)); sQ.set(logit(0.99)); upd3(); };
  const PT = [0.0001, 0.01, 0.1, 0.5, 0.9, 0.99, 0.9999];
  const fisherCv = LAB.canvas('#n-fisher', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: -9.5, xmax: 9.5, ymin: 1, ymax: 1e5, logy: true, xtickValues: PT.map(logit), xfmt: (z) => fp(sig(z)), ytickValues: [1, 10, 100, 1e3, 1e4, 1e5], xlabel: '概率 p（logit 刻度）', ylabel: 'F(p)', pad: { l: 46, r: 10, t: 10, b: 36 } }).axes();
    P.fn((z) => { const p = sig(z); return 1 / (p * (1 - p)); }, C.c4, 2.4);
    [[N.p, C.c4], [N.q, C.c6]].forEach(([p, col]) => { const z = logit(p), F = 1 / (p * (1 - p)); P.vline(z, col, [3, 3], 1); P.points([z], [F], col, 5, '#fff'); });
    P.text(logit(N.p), 1 / (N.p * (1 - N.p)) * 1.9, ` F = ${fnum(1 / (N.p * (1 - N.p)), 4)}`, C.c4, logit(N.p) > 4 ? 'right' : 'left', 'bottom', `600 12px ${NUMF}`);
  });
  const klCv = LAB.canvas('#n-kl', (ctx, w, h) => {
    const p = N.p, F = 1 / (p * (1 - p));
    const P = new LAB.Plot(ctx, w, h, { xmin: -9.5, xmax: 9.5, ymin: 1e-6, ymax: 100, logy: true, xtickValues: PT.map(logit), xfmt: (z) => fp(sig(z)), ytickValues: [1e-6, 1e-4, 0.01, 1, 100], xlabel: '新概率 q（logit 刻度）', ylabel: 'KL', pad: { l: 46, r: 10, t: 10, b: 36 } }).axes();
    P.clip();
    P.fn((z) => Math.max(1e-7, 0.5 * F * (sig(z) - p) ** 2), C.c2, 2, [6, 4], 600);
    P.fn((z) => Math.max(1e-7, KL(p, sig(z))), C.c6, 2.4, null, 600);
    P.unclip();
    P.vline(logit(p), C.c4, [3, 3], 1);
    const z = logit(N.q); P.points([z, z], [Math.max(1e-6, KL(p, N.q)), Math.max(1e-6, 0.5 * F * (N.q - p) ** 2)], C.ink, 4.5, '#fff');
  });
  const n1 = LAB.stat('#n-stats', '$|\\Delta p|$');
  const n2 = LAB.stat('#n-stats', '精确 $D_{\\text{KL}}(p\\,\\|\\,q)$', 'teal');
  const n3 = LAB.stat('#n-stats', '二次近似 $\\tfrac12F(p)(\\Delta p)^2$', 'amber');
  const n4 = LAB.stat('#n-stats', '以打分 $z$ 为参数：经验费雪 $(1-p)^2$', 'coral');
  const n5 = LAB.stat('#n-stats', '真费雪 $p(1-p)$', 'leaf');
  function upd3() {
    const p = N.p, q = N.q, F = 1 / (p * (1 - p));
    n1.set(fnum(Math.abs(q - p), 3)); n2.set(fnum(KL(p, q), 3)); n3.set(fnum(0.5 * F * (q - p) ** 2, 3));
    n4.set(fnum((1 - p) ** 2, 3)); n5.set(fnum(p * (1 - p), 3));
    fisherCv.redraw(); klCv.redraw();
  }
  upd3();
  // 正态分布拟合：GD vs 自然梯度
  const GL = (mu, s) => { const [m0, s0] = N.target; return Math.log(s) + (s0 * s0 + (mu - m0) ** 2) / (2 * s * s); };
  const GKL = (mu, s) => GL(mu, s) - (Math.log(N.target[1]) + 0.5);
  let GR = null;
  function runGauss() {
    const [m0, s0] = N.target, out = {};
    [['gd', N.lrGD], ['ng', N.lrNG]].forEach(([k, lr]) => {
      let mu = N.start[0], s = N.start[1]; const pts = [[mu, s]]; let hit = -1, dead = false;
      for (let t = 1; t <= N.steps; t++) {
        const d2 = s0 * s0 + (mu - m0) ** 2, gm = (mu - m0) / (s * s), gs = 1 / s - d2 / (s * s * s);
        if (k === 'gd') { mu -= lr * gm; s -= lr * gs; } else { mu -= lr * s * s * gm; s -= lr * 0.5 * s * s * gs; }
        if (!isFinite(mu) || !isFinite(s) || s < 0.01 || Math.abs(mu) > 1e4 || s > 1e4) { dead = true; pts.push([mu, s]); break; }
        pts.push([mu, s]); if (hit < 0 && GKL(mu, s) < 0.01) hit = t;
      }
      out[k] = { pts, hit, dead, kl: dead ? Infinity : GKL(pts[pts.length - 1][0], pts[pts.length - 1][1]) };
    });
    GR = out;
  }
  LAB.slider('#n-lr-gd', { label: '普通 GD 学习率', min: -4, max: -1, step: 0.01, value: Math.log10(N.lrGD), fmt: (v) => fnum(Math.pow(10, v), 2), onInput: (v) => { N.lrGD = Math.pow(10, v); updGauss(); } });
  LAB.slider('#n-lr-ng', { label: '自然梯度学习率', min: -2, max: 0, step: 0.01, value: Math.log10(N.lrNG), fmt: (v) => fnum(Math.pow(10, v), 2), onInput: (v) => { N.lrNG = Math.pow(10, v); updGauss(); } });
  LAB.slider('#n-steps', { label: '步数', min: 5, max: 200, step: 1, value: N.steps, onInput: (v) => { N.steps = v; updGauss(); } });
  const DOM = { xmin: -3.2, xmax: 3.2, ymin: 0.05, ymax: 3 };
  let planeP = null, dragWhat = null;
  function contourField(ctx, P, f, levels, nx, ny) {
    const xs = M.linspace(P.o.xmin, P.o.xmax, nx), ys = M.linspace(P.o.ymin, P.o.ymax, ny), V2 = ys.map((y) => xs.map((x) => f(x, y)));
    ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(29,53,87,.28)';
    levels.forEach((lv) => {
      ctx.beginPath();
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = V2[j][i], b = V2[j][i + 1], c = V2[j + 1][i + 1], d = V2[j + 1][i];
        const pts = [];
        const edge = (v1, v2, x1, y1, x2, y2) => { if ((v1 - lv) * (v2 - lv) < 0) { const t = (lv - v1) / (v2 - v1); pts.push([x1 + t * (x2 - x1), y1 + t * (y2 - y1)]); } };
        edge(a, b, xs[i], ys[j], xs[i + 1], ys[j]); edge(b, c, xs[i + 1], ys[j], xs[i + 1], ys[j + 1]); edge(c, d, xs[i + 1], ys[j + 1], xs[i], ys[j + 1]); edge(d, a, xs[i], ys[j + 1], xs[i], ys[j]);
        for (let q = 0; q + 1 < pts.length; q += 2) { ctx.moveTo(P.tx(pts[q][0]), P.ty(pts[q][1])); ctx.lineTo(P.tx(pts[q + 1][0]), P.ty(pts[q + 1][1])); }
      }
      ctx.stroke();
    });
    ctx.restore();
  }
  function heatField(ctx, P, f, lo, hi, res) {
    const W = Math.max(2, Math.round((P.x1 - P.x0) / res)), H = Math.max(2, Math.round((P.y0 - P.y1) / res));
    const off = document.createElement('canvas'); off.width = W; off.height = H; const oc = off.getContext('2d'), img = oc.createImageData(W, H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const x = P.ix(P.x0 + ((i + 0.5) / W) * (P.x1 - P.x0)), y = P.iy(P.y1 + ((j + 0.5) / H) * (P.y0 - P.y1));
      const t = M.clamp((Math.log10(f(x, y) + 1e-12) - lo) / (hi - lo), 0, 1), col = LAB.heat(0.08 + 0.55 * (1 - t)).match(/\d+/g).map(Number), k = 4 * (j * W + i);
      img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 255;
    }
    oc.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(off, P.x0, P.y1, P.x1 - P.x0, P.y0 - P.y1);
  }
  const planeCv = LAB.canvas('#n-plane', (ctx, w, h) => {
    const P = (planeP = new LAB.Plot(ctx, w, h, Object.assign({ xlabel: '均值 μ', ylabel: '标准差 σ', pad: { l: 40, r: 10, t: 10, b: 34 }, xticks: 4, yticks: 5 }, DOM)));
    heatField(ctx, P, GKL, -2.5, 1.5, 4);
    P.axes();
    P.clip();
    contourField(ctx, P, (x, y) => Math.log10(GKL(x, y) + 1e-9), [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5], 70, 60);
    // 等距圈：KL = 0.2
    const eps = 0.2, [m, s] = N.start;
    ctx.save(); ctx.strokeStyle = C.c4; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(P.tx(m), P.ty(s), Math.abs(P.tx(m + s * Math.sqrt(2 * eps)) - P.tx(m)), Math.abs(P.ty(s + s * Math.sqrt(eps)) - P.ty(s)), 0, 0, 7); ctx.stroke();
    const [m0, s0] = N.target; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(P.tx(m0), P.ty(s0), Math.abs(P.tx(m0 + s0 * Math.sqrt(2 * eps)) - P.tx(m0)), Math.abs(P.ty(s0 + s0 * Math.sqrt(eps)) - P.ty(s0)), 0, 0, 7); ctx.stroke();
    ctx.globalAlpha = 1; ctx.strokeStyle = '#9aa5b1'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.ellipse(P.tx(m), P.ty(s), Math.abs(P.tx(m + Math.sqrt(2 * eps)) - P.tx(m)), Math.abs(P.ty(s + Math.sqrt(2 * eps)) - P.ty(s)), 0, 0, 7); ctx.stroke(); ctx.restore();
    [['gd', C.c1], ['ng', C.c3]].forEach(([k, col]) => {
      const pts = GR[k].pts; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
      pts.forEach((p, i) => { const X = P.tx(p[0]), Y = P.ty(M.clamp(p[1], -100, 100)); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.stroke();
      ctx.fillStyle = col; pts.forEach((p, i) => { if (i) { ctx.beginPath(); ctx.arc(P.tx(p[0]), P.ty(p[1]), 2.4, 0, 7); ctx.fill(); } });
    });
    P.unclip();
    // 目标星号与起点
    const tx = P.tx(m0), ty = P.ty(s0); ctx.fillStyle = C.c2; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let k = 0; k < 10; k++) { const r = k % 2 ? 4.5 : 10, a = -Math.PI / 2 + (k * Math.PI) / 5; ctx.lineTo(tx + r * Math.cos(a), ty + r * Math.sin(a)); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P.tx(m), P.ty(s), 7, 0, 7); ctx.fill(); ctx.stroke();
  });
  pointer(planeCv.canvas, {
    down: ([x, y]) => { if (!planeP) return false; const d0 = Math.hypot(x - planeP.tx(N.start[0]), y - planeP.ty(N.start[1])), d1 = Math.hypot(x - planeP.tx(N.target[0]), y - planeP.ty(N.target[1])); dragWhat = d1 < d0 && d1 < 30 ? 'target' : 'start'; moveDrag(x, y); },
    move: ([x, y]) => moveDrag(x, y),
  });
  function moveDrag(x, y) { const mu = M.clamp(planeP.ix(x), -3, 3), s = M.clamp(planeP.iy(y), 0.08, 2.9); N[dragWhat] = [+mu.toFixed(2), +s.toFixed(3)]; updGauss(); }
  const densCv = LAB.canvas('#n-dens', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: -5, xmax: 5, ymin: 0, ymax: 1.2, xlabel: 'x', ylabel: '概率密度', pad: { l: 40, r: 8, t: 10, b: 34 }, yticks: 3 }).axes();
    const pdf = (m, s) => (x) => Math.exp(-((x - m) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI));
    P.clip();
    P.fn(pdf(...N.target), C.c2, 2.4, [6, 4]);
    [['gd', C.c1], ['ng', C.c3]].forEach(([k, col]) => { const r = GR[k]; if (r.dead) return; const p = r.pts[r.pts.length - 1]; P.fn(pdf(p[0], p[1]), col, 2.2); });
    P.unclip();
    P.text(-4.8, 1.12, '虚线：目标分布；实线：各自走完后的模型', C.slate, 'left', 'top', `11px ${FONT}`);
  });
  const g1 = LAB.stat('#n-stats2', 'GD 走完后的 KL');
  const g2 = LAB.stat('#n-stats2', '自然梯度走完后的 KL', 'leaf');
  const g3 = LAB.stat('#n-stats2', 'KL<0.01 所需步数（GD / NGD）', 'teal');
  function updGauss() {
    runGauss();
    g1.set(GR.gd.dead ? '跑飞' : fnum(GR.gd.kl, 3)); g2.set(GR.ng.dead ? '跑飞' : fnum(GR.ng.kl, 3));
    g3.set(`${GR.gd.hit > 0 ? GR.gd.hit : '–'}<small> / </small>${GR.ng.hit > 0 ? GR.ng.hit : '–'}`);
    planeCv.redraw(); densCv.redraw();
  }
  updGauss();
})();
