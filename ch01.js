/* 第 1 章：三把尺子量步长 · 交互实验 */
(function () {
  const { COLORS: C, M } = LAB;
  LAB.page({ bookRef: '对应书中 §1.1 步子迈太大跳到对面山坡 · §1.2 三把尺子 · §1.3 安全步长 η < 2/L · §1.4 旋转 45° 矩阵山谷手算' });
  document.querySelectorAll('.formula, [style*="overflow-x"]').forEach((f) => { f.style.width = '0'; f.style.minWidth = '100%'; });
  const $ = (s) => document.querySelector(s);
  const FONT = getComputedStyle(document.body).getPropertyValue('--font');
  const NUMF = getComputedStyle(document.body).getPropertyValue('--font-num');
  const fx = (x, d) => { if (!isFinite(x)) return '∞'; const a = Math.abs(x); if (a !== 0 && (a >= 1e5 || a < 1e-3)) return M.fmt(x, 2); return (+x.toFixed(d == null ? 3 : d)).toString(); };
  const num = (x, d) => (x < 0 ? '−' : '') + fx(Math.abs(x), d);
  function pointer(el, h) {
    const pos = (e) => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    let on = false;
    el.addEventListener('pointerdown', (e) => { on = true; try { el.setPointerCapture(e.pointerId); } catch (_) {} h.down && h.down(...pos(e)); e.preventDefault(); });
    el.addEventListener('pointermove', (e) => { if (on && h.move) h.move(...pos(e)); });
    const end = () => { if (on) { on = false; h.up && h.up(); } };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }

  /* ================= 实验 1：三把尺子量步长 ================= */
  const R1 = { g: [3, 4], eta: 1, iso: true };
  const PRE1 = [[3, 4], [100, 1], [-2, 0.5], [1, -3]];
  LAB.segmented('#r-preset', ['$(3,4)$', '$(100,1)$', '$(-2,0.5)$', '$(1,-3)$'], 0, (i) => { setG(PRE1[i][0], PRE1[i][1]); });
  const sg1 = LAB.slider('#r-g1', { label: '$g_1$（第 1 个旋钮的斜率）', min: -120, max: 120, step: 0.1, value: 3, fmt: (v) => v.toFixed(1), onInput: (v) => { R1.g[0] = v; upd1(); } });
  const sg2 = LAB.slider('#r-g2', { label: '$g_2$（第 2 个旋钮的斜率）', min: -120, max: 120, step: 0.1, value: 4, fmt: (v) => v.toFixed(1), onInput: (v) => { R1.g[1] = v; upd1(); } });
  LAB.slider('#r-eta', { label: '安全圈半径 $\\eta$', min: 0.2, max: 1.4, step: 0.05, value: 1, fmt: (v) => v.toFixed(2), onInput: (v) => { R1.eta = v; upd1(); } });
  LAB.checkbox('#r-show', '画出等高线 $\\langle\\mathbf g,\\mathbf d\\rangle=$ 常数', true, (v) => { R1.iso = v; plane.redraw(); });
  function setG(a, b) { R1.g = [a, b]; sg1.set(a); sg2.set(b); upd1(); }
  const dirs = () => {
    const [a, b] = R1.g, n2 = Math.hypot(a, b) || 1, e = R1.eta;
    return { l2: [-e * a / n2, -e * b / n2], li: [-e * Math.sign(a), -e * Math.sign(b)], n2: Math.hypot(a, b), n1: Math.abs(a) + Math.abs(b) };
  };
  const st1 = [LAB.stat('#r-stats', '圆圈尺子的一步 $\\mathbf d^*_{L_2}$', 'leaf'), LAB.stat('#r-stats', '方框尺子的一步 $\\mathbf d^*_{L_\\infty}$', 'amber'),
    LAB.stat('#r-stats', '预计下降 $\\eta\\|\\mathbf g\\|_2$ vs $\\eta\\|\\mathbf g\\|_1$', ''), LAB.stat('#r-stats', '第 2 个旋钮分到的步长', 'coral')];
  function upd1() {
    const D = dirs(), e = R1.eta;
    st1[0].set(`(${num(D.l2[0])}, ${num(D.l2[1])})`);
    st1[1].set(`(${num(D.li[0], 1)}, ${num(D.li[1], 1)})`);
    st1[2].set(`${fx(e * D.n2, 2)}<small>vs</small> ${fx(e * D.n1, 2)}`);
    st1[3].set(`${fx(Math.abs(D.l2[1]), 4)}<small>vs</small> ${fx(Math.abs(D.li[1]), 2)}`);
    $('#r-sub').textContent = `‖g‖₂ = ${fx(D.n2, 3)}，‖g‖₁ = ${fx(D.n1, 2)}`;
    plane.redraw(); share.redraw();
  }
  let planeP = null;
  const plane = LAB.canvas('#r-plane', (ctx, w, h) => {
    const S = 2.6, side = Math.min(w, h);
    const P = new LAB.Plot(ctx, w, h, { xmin: -S, xmax: S, ymin: -S, ymax: S, xlabel: 'd₁', ylabel: 'd₂', xticks: 6, yticks: 6, pad: { l: 40 + (w - side) / 2, r: 12 + (w - side) / 2, t: 12, b: 34 } });
    planeP = P;
    const [a, b] = R1.g, n2 = Math.hypot(a, b) || 1, ux = a / n2, uy = b / n2, e = R1.eta;
    P.axes(); P.clip();
    if (R1.iso) { // 等高线：垂直于 g 的直线族
      ctx.save(); ctx.lineWidth = 1;
      for (let k = -6; k <= 6; k++) {
        const c = k * 0.45, px = ux * c, py = uy * c;
        ctx.strokeStyle = k === 0 ? '#b8c2cd' : k < 0 ? 'rgba(47,143,91,.16)' : 'rgba(209,73,91,.12)';
        ctx.beginPath(); ctx.moveTo(P.tx(px - uy * 9), P.ty(py + ux * 9)); ctx.lineTo(P.tx(px + uy * 9), P.ty(py - ux * 9)); ctx.stroke();
      }
      ctx.restore();
    }
    // 方框与圆圈
    ctx.save();
    ctx.fillStyle = 'rgba(224,154,45,.10)'; ctx.strokeStyle = C.c2; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(P.tx(-e), P.ty(e), P.tx(e) - P.tx(-e), P.ty(-e) - P.ty(e)); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(47,143,91,.12)'; ctx.strokeStyle = C.c3;
    ctx.beginPath(); ctx.ellipse(P.tx(0), P.ty(0), P.tx(e) - P.tx(0), P.ty(0) - P.ty(e), 0, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    ctx.restore();
    const D = dirs();
    // g 的方向（固定长度画出）
    const gl = 2.25;
    LAB.arrow(ctx, P.tx(0), P.ty(0), P.tx(ux * gl), P.ty(uy * gl), C.c1, 2.6, 11);
    P.points([ux * gl], [uy * gl], C.c1, 7, '#fff');
    P.text(ux * gl + (ux > 0.3 ? -0.05 : ux < -0.3 ? 0.05 : 0), uy * gl + (uy >= 0 ? 0.2 : -0.2), `g = (${fx(a, 1)}, ${fx(b, 1)})`, C.c1, ux > 0.3 ? 'right' : ux < -0.3 ? 'left' : 'center', 'middle', '600 12.5px ' + FONT);
    LAB.arrow(ctx, P.tx(0), P.ty(0), P.tx(D.l2[0]), P.ty(D.l2[1]), C.c3, 3, 11);
    LAB.arrow(ctx, P.tx(0), P.ty(0), P.tx(D.li[0]), P.ty(D.li[1]), C.c2, 3, 11);
    P.points([D.l2[0], D.li[0]], [D.l2[1], D.li[1]], '#fff', 4.5);
    P.points([D.l2[0]], [D.l2[1]], C.c3, 3.2); P.points([D.li[0]], [D.li[1]], C.c2, 3.2);
    const lab = (pt, s, col, dy) => P.text(pt[0], pt[1] + dy, s, col, pt[0] >= 0 ? 'left' : 'right', 'middle', '600 12px ' + NUMF);
    lab(D.l2, ` (${num(D.l2[0], 2)}, ${num(D.l2[1], 2)})`, C.c3, D.l2[1] > D.li[1] ? 0.16 : -0.16);
    lab(D.li, ` (${num(D.li[0], 2)}, ${num(D.li[1], 2)})`, C.c2, D.li[1] >= D.l2[1] ? 0.16 : -0.16);
    P.unclip();
  });
  pointer(plane.canvas, {
    down: (x, y) => dragG(x, y), move: (x, y) => dragG(x, y), up: () => {},
  });
  plane.canvas.style.cursor = 'grab'; plane.canvas.style.touchAction = 'none';
  function dragG(px, py) {
    if (!planeP) return;
    const x = planeP.ix(px), y = planeP.iy(py), r = Math.hypot(x, y);
    if (r < 0.05) return;
    const n = Math.hypot(R1.g[0], R1.g[1]) || 5; // 拖动只改方向，保持 ‖g‖₂ 不变
    setG(+(x / r * n).toFixed(1), +(y / r * n).toFixed(1));
  }
  const share = LAB.canvas('#r-share', (ctx, w, h) => {
    const D = dirs(), e = R1.eta;
    const P = new LAB.Plot(ctx, w, h, { xmin: -0.6, xmax: 1.6, ymin: 0, ymax: e * 1.25, xtickValues: [], ylabel: '|dᵢ|', yticks: 4, pad: { l: 46, r: 10, t: 14, b: 30 } }).axes();
    const bw = (P.tx(1) - P.tx(0)) * 0.26;
    const v = [[Math.abs(D.l2[0]), Math.abs(D.li[0])], [Math.abs(D.l2[1]), Math.abs(D.li[1])]];
    [0, 1].forEach((k) => {
      P.bars([k - 0.17], [v[k][0]], C.c3, bw); P.bars([k + 0.17], [v[k][1]], C.c2, bw);
      P.text(k - 0.17, v[k][0], fx(v[k][0], 4), C.c3, 'center', 'bottom', '600 12px ' + NUMF);
      P.text(k + 0.17, v[k][1], fx(v[k][1], 2), C.c2, 'center', 'bottom', '600 12px ' + NUMF);
      ctx.save(); ctx.fillStyle = C.ink; ctx.font = '13px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(`第 ${k + 1} 个旋钮（g${k ? '₂' : '₁'} = ${fx(R1.g[k], 1)}）`, P.tx(k), P.y0 + 7); ctx.restore();
    });
    P.hline(e, C.slate, [4, 4], 1); P.text(1.58, e, `η = ${e.toFixed(2)}`, C.slate, 'right', 'bottom', '11px ' + NUMF);
  });
  upd1();

  /* ================= 实验 2：步子迈大会跳崖 ================= */
  const R2 = { L: 2, eta: 2, x0: 3, T: 4 };
  const PRE2 = [{ L: 2, eta: 2, x0: 3 }, { L: 10, eta: 0.1, x0: 2 }, { L: 10, eta: 0.2, x0: 2 }, { L: 10, eta: 0.25, x0: 2 }];
  LAB.segmented('#o-preset', ['$x^2$，$\\eta=2$', '$5x^2$，$\\eta=0.1$', '$\\eta=0.2$', '$\\eta=0.25$'], 0, (i) => { const p = PRE2[i]; sL.set(p.L); sEta.set(p.eta); sX0.set(p.x0); Object.assign(R2, p); upd2(); });
  const sL = LAB.slider('#o-L', { label: '山谷弯曲度 $L=f\'\'(x)$', min: 0.5, max: 20, step: 0.5, value: 2, fmt: (v) => v.toFixed(1), onInput: (v) => { R2.L = v; upd2(); } });
  const sEta = LAB.slider('#o-eta', { label: '步长 $\\eta$', min: 0.005, max: 2.5, step: 0.005, value: 2, fmt: (v) => v.toFixed(3), onInput: (v) => { R2.eta = v; upd2(); } });
  const sX0 = LAB.slider('#o-x0', { label: '出发点 $x_0$', min: -4, max: 4, step: 0.1, value: 3, fmt: (v) => v.toFixed(1), onInput: (v) => { R2.x0 = v; upd2(); } });
  LAB.slider('#o-T', { label: '走几步 $T$', min: 1, max: 10, step: 1, value: 4, onInput: (v) => { R2.T = v; upd2(); } });
  const iter2 = () => { const r = 1 - R2.eta * R2.L, xs = [R2.x0]; for (let t = 0; t < R2.T; t++) xs.push(xs[t] * r); return xs; };
  const f2 = (x) => 0.5 * R2.L * x * x;
  const st2 = [LAB.stat('#o-stats', '每步缩放系数 $1-\\eta L$', ''), LAB.stat('#o-stats', '小球的下场', 'coral'), LAB.stat('#o-stats', '生死线 $2/L$', 'amber'), LAB.stat('#o-stats', '黄金步长 $1/L$', 'leaf')];
  function regime(r) {
    if (Math.abs(r) < 1e-9) return '一步到底';
    if (r > 0 && r < 1) return '单调滑到谷底';
    if (r >= 1) return '原地不动';
    if (r < 0 && r > -1) return '来回跳着收敛';
    if (Math.abs(r + 1) < 1e-9) return '原地打乒乓';
    return '越跳越高，炸飞';
  }
  function upd2() {
    const r = 1 - R2.eta * R2.L, xs = iter2();
    st2[0].set(fx(r, 3)); st2[1].set(regime(r));
    st2[2].set(fx(2 / R2.L, 3)); st2[3].set(fx(1 / R2.L, 3));
    st2[1].el.querySelector('.value').style.color = Math.abs(r) > 1 + 1e-9 ? C.coral : Math.abs(Math.abs(r) - 1) < 1e-9 ? C.amber : C.leaf;
    $('#o-sub').textContent = `f(x) = ${R2.L === 2 ? 'x²' : (R2.L / 2) + 'x²'}，η = ${R2.eta}`;
    const rows = xs.map((x, t) => `<tr><td class="num">${t}</td><td class="num">${num(x, 4)}</td><td class="num">${fx(f2(x), 4)}</td><td class="num">${num(R2.L * x, 3)}</td></tr>`);
    $('#o-table').innerHTML = `<thead><tr><th>t</th><th>${LAB.tex('x_t')}</th><th>${LAB.tex('f(x_t)')}</th><th>${LAB.tex("f'(x_t)")}</th></tr></thead><tbody>${rows.join('')}</tbody>`;
    curve.redraw(); gain.redraw();
  }
  const curve = LAB.canvas('#o-curve', (ctx, w, h) => {
    const xs = iter2(), near = Math.max(...xs.slice(0, 3).map(Math.abs));
    const Rx = Math.max(4, Math.abs(R2.x0) * 1.35, Math.min(60, near * 1.12)), ymax = f2(Rx) * 1.04;
    const P = new LAB.Plot(ctx, w, h, { xmin: -Rx, xmax: Rx, ymin: 0, ymax, xlabel: 'x', ylabel: 'f(x)', pad: { l: 50, r: 14, t: 14, b: 36 } }).axes();
    P.clip();
    P.fn(f2, C.navy, 2.2);
    const cl = (x) => M.clamp(x, -Rx, Rx);
    for (let t = 0; t < xs.length - 1; t++) {
      const a = xs[t], b = xs[t + 1], X0 = P.tx(cl(a)), Y0 = P.ty(Math.min(f2(a), ymax)), X1 = P.tx(cl(b)), Y1 = P.ty(Math.min(f2(b), ymax));
      const col = LAB.mix(C.c4, C.c2, t / Math.max(1, xs.length - 2));
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.setLineDash([5, 3]);
      const mx = (X0 + X1) / 2, my = Math.min(Y0, Y1) - 30 - 10 * Math.min(4, t);
      ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.quadraticCurveTo(mx, my, X1, Y1); ctx.stroke(); ctx.restore();
      const ang = Math.atan2(Y1 - my, X1 - mx);
      LAB.arrow(ctx, X1 - 12 * Math.cos(ang), Y1 - 12 * Math.sin(ang), X1, Y1, col, 1.8, 9);
    }
    xs.forEach((x, t) => {
      const out = Math.abs(x) > Rx || f2(x) > ymax, X = P.tx(cl(x)), Y = P.ty(Math.min(f2(x), ymax));
      ctx.save(); ctx.fillStyle = t === 0 ? C.navy : C.c4; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(X, Y, out ? 7 : 5.5, 0, 7); ctx.fill(); ctx.stroke();
      ctx.font = '600 11.5px ' + NUMF; ctx.fillStyle = C.ink; ctx.textAlign = X > w / 2 ? 'right' : 'left'; ctx.textBaseline = 'top';
      ctx.fillText(out ? ` x${t}=${num(x, 0)}，f=${fx(f2(x), 0)} ` : ` x${t} `, X + (X > w / 2 ? -8 : 8), Y + 6);
      ctx.restore();
    });
    P.unclip();
  });
  const gain = LAB.canvas('#o-gain', (ctx, w, h) => {
    const L = R2.L, emax = Math.max(2.4 / L, R2.eta * 1.08), g = (e) => -e * (1 - L * e / 2);
    const ymin = -0.5 / L * 1.25, ymax = Math.max(0.3 / L, g(R2.eta) * 1.1);
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: emax, ymin, ymax, xlabel: '步长 η', ylabel: 'Δf / g²', pad: { l: 52, r: 12, t: 12, b: 36 } }).axes();
    P.clip();
    P.hline(0, C.slate, null, 1);
    P.fn(g, C.c1, 2.4);
    P.vline(1 / L, C.leaf, [4, 4]); P.vline(2 / L, C.coral, [4, 4]);
    P.text(1 / L, ymax * 0.9, ' 1/L', C.leaf, 'left', 'middle', '600 11.5px ' + NUMF);
    P.text(2 / L, ymax * 0.9, ' 2/L', C.coral, 'left', 'middle', '600 11.5px ' + NUMF);
    P.points([R2.eta], [g(R2.eta)], C.c4, 6, '#fff');
    P.unclip();
  });
  upd2();

  /* ================= 实验 3：旋转山谷走一步 ================= */
  const R3 = { th: 45, s1: 100, s2: 1, eta: 1, T: 1 };
  const sTh = LAB.slider('#v-theta', { label: '山谷旋转角 $\\theta$', min: 0, max: 90, step: 1, value: 45, fmt: (v) => v + '°', onInput: (v) => { R3.th = v; upd3(); } });
  const sS1 = LAB.slider('#v-s1', { label: '强方向斜率 $\\sigma_1$', min: 1, max: 200, step: 1, value: 100, onInput: (v) => { R3.s1 = v; upd3(); } });
  const sS2 = LAB.slider('#v-s2', { label: '弱方向斜率 $\\sigma_2$', min: 0, max: 200, step: 0.5, value: 1, fmt: (v) => v.toFixed(1), onInput: (v) => { R3.s2 = v; upd3(); } });
  const sE3 = LAB.slider('#v-eta', { label: '步长（安全圈半径）$\\eta$', min: 0.1, max: 1.5, step: 0.05, value: 1, fmt: (v) => v.toFixed(2), onInput: (v) => { R3.eta = v; upd3(); } });
  const sT3 = LAB.slider('#v-T', { label: '走几步', min: 1, max: 8, step: 1, value: 1, onInput: (v) => { R3.T = v; upd3(); } });
  $('#v-book').onclick = () => { sTh.set(45); sS1.set(100); sS2.set(1); sE3.set(1); sT3.set(1); Object.assign(R3, { th: 45, s1: 100, s2: 1, eta: 1, T: 1 }); upd3(); };
  // 2×2 矩阵小工具（行优先 [a,b,c,d]）
  const rot = (t) => [Math.cos(t), -Math.sin(t), Math.sin(t), Math.cos(t)];
  const mm = (A, B) => [A[0] * B[0] + A[1] * B[2], A[0] * B[1] + A[1] * B[3], A[2] * B[0] + A[3] * B[2], A[2] * B[1] + A[3] * B[3]];
  const tr = (A) => [A[0], A[2], A[1], A[3]];
  const sc = (A, k) => A.map((v) => v * k);
  const add = (A, B) => A.map((v, i) => v + B[i]);
  const fro = (A) => Math.hypot(...A);
  const mv = (A, v) => [A[0] * v[0] + A[1] * v[1], A[2] * v[0] + A[3] * v[1]];
  function svd2(m) { // m = Rot(φ)·diag(sx,sy)·Rot(θ)
    const [a, b, c, d] = m, E = (a + d) / 2, F = (a - d) / 2, G = (c + b) / 2, H = (c - b) / 2;
    const Q = Math.hypot(E, H), R = Math.hypot(F, G), a1 = Math.atan2(G, F), a2 = Math.atan2(H, E);
    return { ph: (a2 + a1) / 2, th: (a2 - a1) / 2, sx: Q + R, sy: Q - R };
  }
  const opn = (A) => { const s = svd2(A); return Math.max(Math.abs(s.sx), Math.abs(s.sy)); };
  const polar = (A) => { const s = svd2(A), tol = 1e-12 * Math.max(1e-300, Math.abs(s.sx)); return mm(mm(rot(s.ph), [Math.abs(s.sx) > tol ? Math.sign(s.sx) : 0, 0, 0, Math.abs(s.sy) > tol ? Math.sign(s.sy) : 0]), rot(s.th)); };
  const cl0 = (x) => (Math.abs(x) < 1e-10 ? 0 : x);
  const sgn = (A) => A.map((v) => (Math.abs(v) < 1e-12 ? 0 : Math.sign(v)));
  const RUL = [
    { n: '圆圈尺子', col: C.c3, cls: 'leaf', D: (G, e) => { const f = fro(G); return f < 1e-15 ? [0, 0, 0, 0] : sc(G, -e / f); } },
    { n: '方框尺子', col: C.c2, cls: 'amber', D: (G, e) => { const S = sgn(G), o = opn(S); return o < 1e-15 ? [0, 0, 0, 0] : sc(S, -e / o); } },
    { n: '椭圆尺子', col: C.c5, cls: 'plum', D: (G, e) => sc(polar(G), -e) },
  ];
  // 损失 L(W) = ½ Σ H_ij (RᵀWR)_ij²，H_ij = √(σ_iσ_j)（与书中 30 行脚本一致），梯度 G = R (H ∘ RᵀWR) Rᵀ
  function setup3() {
    const t = R3.th * Math.PI / 180, R = rot(t), s = [R3.s1, R3.s2], H = [s[0], Math.sqrt(s[0] * s[1]), Math.sqrt(s[0] * s[1]), s[1]];
    const grad = (W) => { const Wr = mm(mm(tr(R), W), R); return mm(mm(R, Wr.map((v, i) => v * H[i])), tr(R)); };
    return { R, u1: [Math.cos(t), Math.sin(t)], u2: [-Math.sin(t), Math.cos(t)], grad };
  }
  let S3 = null;
  function run3() {
    S3 = setup3();
    const G0 = S3.grad([1, 0, 0, 1]);
    S3.G0 = G0;
    S3.D = RUL.map((r) => r.D(G0, R3.eta).map(cl0));
    S3.err = RUL.map((r) => { let W = [1, 0, 0, 1]; const e = [fro(W)]; for (let t = 0; t < R3.T; t++) { W = add(W, r.D(S3.grad(W), R3.eta)); e.push(fro(W)); } return e; });
    S3.mov = S3.D.map((D) => [S3.u1, S3.u2].map((u) => { const v = mv(sc(D, -1), u); return cl0(v[0] * u[0] + v[1] * u[1]); }));
  }
  const st3 = RUL.map((r) => LAB.stat('#v-stats', `${r.n}：走 1 步后剩余误差 $\\|\\mathbf W_1\\|_F$`, r.cls));
  const bmat = (A, d) => `\\begin{bmatrix}${fx(A[0], d)} & ${fx(A[1], d)} \\\\ ${fx(A[2], d)} & ${fx(A[3], d)}\\end{bmatrix}`;
  function upd3() {
    run3();
    RUL.forEach((r, i) => st3[i].set(`${fx(S3.err[i][1], 3)}${R3.T > 1 ? `<small>第 ${R3.T} 步 ${fx(S3.err[i][R3.T], 3)}</small>` : ''}`));
    const G = S3.G0, f = fro(G), S = sgn(G), so = opn(S), U = polar(G);
    const mv3 = (i) => `${LAB.tex('\\mathbf u_1')}：<b>${S3.mov[i][0].toFixed(3)}</b>　${LAB.tex('\\mathbf u_2')}：<b>${S3.mov[i][1].toFixed(3)}</b>`;
    const blk = (label, tex, extra) => `<div style="display:inline-block;vertical-align:top;margin:4px 18px 12px 0"><div class="small muted" style="margin-bottom:2px">${label}</div>${LAB.tex(tex)}${extra ? `<div class="small" style="margin-top:4px">${extra}</div>` : ''}</div>`;
    $('#v-book-out').innerHTML =
      blk('① 当前导数矩阵', `\\mathbf G=${bmat(G, 2)}`, `奇异值 ${fx(R3.s1, 2)}、${fx(R3.s2, 2)}`) +
      blk('② 圆圈尺子：除以 ‖G‖_F', `\\|\\mathbf G\\|_F=${fx(f, 3)},\\ \\mathbf D=-\\eta\\frac{\\mathbf G}{\\|\\mathbf G\\|_F}=${bmat(S3.D[0], 3)}`, mv3(0)) +
      blk('③ 方框尺子：只看正负号', `\\operatorname{sign}(\\mathbf G)=${bmat(S, 0)},\\ \\mathbf D=-\\frac{\\eta}{${fx(so, 3)}}\\operatorname{sign}(\\mathbf G)=${bmat(S3.D[1], 3)}`, mv3(1)) +
      blk('④ 椭圆尺子：把 Σ 换成单位阵', `\\mathbf U\\mathbf V^\\top=${bmat(U, 3)},\\ \\mathbf D=-\\eta\\,\\mathbf U\\mathbf V^\\top`, mv3(2));
    ell.redraw(); bars.redraw(); errc.redraw();
  }
  const ell = LAB.canvas('#v-ellipse', (ctx, w, h) => {
    if (!S3) return;
    const S = 1.7, side = Math.min(w, h);
    const P = new LAB.Plot(ctx, w, h, { xmin: -S, xmax: S, ymin: -S, ymax: S, xticks: 4, yticks: 4, pad: { l: 34 + (w - side) / 2, r: 8 + (w - side) / 2, t: 8, b: 26 } }).axes();
    P.clip();
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#9aa5b1'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(P.tx(0), P.ty(0), P.tx(1) - P.tx(0), P.ty(0) - P.ty(1), 0, 0, 7); ctx.stroke(); ctx.restore();
    [[S3.u1, '强 u₁'], [S3.u2, '弱 u₂']].forEach(([u, s]) => { P.line([-u[0] * 2, u[0] * 2], [-u[1] * 2, u[1] * 2], C.slate, 0.9, [2, 3]); P.text(u[0] * 1.45, u[1] * 1.45, s, C.slate, 'center', 'middle', '12px ' + FONT); });
    S3.D.forEach((D, i) => {
      const xs = [], ys = [];
      for (let k = 0; k <= 160; k++) { const a = k / 160 * 2 * Math.PI, v = mv(sc(D, -1), [Math.cos(a), Math.sin(a)]); xs.push(v[0]); ys.push(v[1]); }
      P.line(xs, ys, RUL[i].col, i === 2 ? 3.2 : 2.4, i === 2 ? [7, 4] : null);
    });
    P.unclip();
    ctx.save(); ctx.font = '600 12px ' + FONT; ctx.textBaseline = 'top';
    RUL.forEach((r, i) => { ctx.fillStyle = r.col; ctx.fillText('— ' + r.n, P.x0 + 6, P.y1 + 4 + 16 * i); });
    ctx.restore();
  });
  const bars = LAB.canvas('#v-bars', (ctx, w, h) => {
    if (!S3) return;
    const top = Math.max(R3.eta * 1.3, ...S3.mov.flat()) * 1.05;
    const P = new LAB.Plot(ctx, w, h, { xmin: -0.6, xmax: 1.6, ymin: Math.min(0, ...S3.mov.flat()), ymax: top, xtickValues: [], ylabel: '迈出的距离', yticks: 5, pad: { l: 46, r: 8, t: 12, b: 30 } }).axes();
    const bw = (P.tx(1) - P.tx(0)) * 0.2;
    [0, 1].forEach((k) => {
      RUL.forEach((r, i) => {
        const x = k + (i - 1) * 0.25, v = S3.mov[i][k];
        P.bars([x], [v], r.col, bw);
        P.text(x, Math.max(v, 0), v.toFixed(3), r.col, 'center', 'bottom', '600 11px ' + NUMF);
      });
      ctx.save(); ctx.fillStyle = C.ink; ctx.font = '13px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(k ? '弱方向 u₂' : '强方向 u₁', P.tx(k), P.y0 + 7); ctx.restore();
    });
    P.hline(R3.eta, C.slate, [4, 4], 1);
  });
  const errc = LAB.canvas('#v-err', (ctx, w, h) => {
    if (!S3) return;
    const T = Math.max(R3.T, 1), top = Math.max(1.5, ...S3.err.flat().filter(isFinite)) * 1.05;
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: T, ymin: 0, ymax: top, xtickValues: M.range(T + 1), xlabel: '步数 t', ylabel: '‖W_t‖_F', pad: { l: 48, r: 14, t: 12, b: 36 } }).axes();
    S3.err.forEach((e, i) => { P.line(M.range(e.length), e, RUL[i].col, 2.4); P.points(M.range(e.length), e, RUL[i].col, 3.8, '#fff'); });
  });
  upd3();
})();
