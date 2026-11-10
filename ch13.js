/* 第 13 章 泛化：平坦盆地、顿悟与模型合并（交互实验） */
(function () {
  const { COLORS: C, M } = LAB;
  LAB.page({ bookRef: '对应书中 §13.1 宽盆地与窄深井 · §13.2 SAM 两步探路 · §13.3 顿悟现象 · §13.4 模型合并与 TIES' });
  document.querySelectorAll('.formula').forEach((f) => { f.style.width = '0'; f.style.minWidth = '100%'; });
  const $ = (s) => document.querySelector(s);
  const FONT = getComputedStyle(document.body).getPropertyValue('--font');
  const NUMF = getComputedStyle(document.body).getPropertyValue('--font-num');
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = (e) => String(e).split('').map((c) => SUP[c] || c).join('');
  const sciParts = (x) => { let e = Math.floor(Math.log10(Math.abs(x))), m = +(x / Math.pow(10, e)).toPrecision(3); if (Math.abs(m) >= 10) { m /= 10; e++; } return [m, e]; };
  const fnum = (x, d) => { if (!isFinite(x)) return x > 0 ? '∞' : '–'; if (x === 0) return '0'; const a = Math.abs(x); if (a >= 1e5 || a < 1e-3) { const [m, e] = sciParts(x); return (m === 1 ? '' : m + '×') + '10' + sup(e); } return String(+x.toPrecision(d || 4)); };
  const tnum = (x, d) => { if (!isFinite(x)) return '\\infty'; if (Math.abs(x) < 1e-12) return '0'; const a = Math.abs(x); if (a >= 1e5 || a < 1e-3) { const [m, e] = sciParts(x); return (m === 1 ? '' : m + '\\times') + '10^{' + e + '}'; } return String(+x.toPrecision(d || 4)); };
  const bvec = (v, d) => '\\begin{bmatrix}' + v.map((x) => tnum(x, d)).join('\\\\') + '\\end{bmatrix}';
  const isActive = (sec) => sec.classList.contains('active');
  function label(ctx, txt, x, y, col, font, align, base) { ctx.fillStyle = col || C.ink; ctx.font = font || `12px ${FONT}`; ctx.textAlign = align || 'center'; ctx.textBaseline = base || 'middle'; ctx.fillText(txt, x, y); }
  function pointer(cv, h) {
    cv.style.touchAction = 'none';
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    let active = false;
    cv.addEventListener('pointerdown', (e) => { if (h.down && h.down(pos(e)) !== false) { active = true; cv.setPointerCapture(e.pointerId); e.preventDefault(); } });
    cv.addEventListener('pointermove', (e) => { if (active) h.move && h.move(pos(e)); });
    const end = () => { if (active) { active = false; h.up && h.up(); } };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  }
  function heatField(ctx, P, f, lo, hi, res, light) {
    const W = Math.max(2, Math.round((P.x1 - P.x0) / res)), H = Math.max(2, Math.round((P.y0 - P.y1) / res));
    const off = document.createElement('canvas'); off.width = W; off.height = H; const oc = off.getContext('2d'), img = oc.createImageData(W, H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const x = P.ix(P.x0 + ((i + 0.5) / W) * (P.x1 - P.x0)), y = P.iy(P.y1 + ((j + 0.5) / H) * (P.y0 - P.y1));
      const t = M.clamp((Math.log10(Math.max(0, f(x, y)) + 1e-6) - lo) / (hi - lo), 0, 1) || 0, col = LAB.heat(0.06 + (light || 0.6) * (1 - t)).match(/\d+/g).map(Number), k = 4 * (j * W + i);
      img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 255;
    }
    oc.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(off, P.x0, P.y1, P.x1 - P.x0, P.y0 - P.y1);
  }
  function contours(ctx, P, f, levels, nx, ny, col) {
    const xs = M.linspace(P.o.xmin, P.o.xmax, nx), ys = M.linspace(P.o.ymin, P.o.ymax, ny), V = ys.map((y) => xs.map((x) => f(x, y)));
    ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = col || 'rgba(29,53,87,.25)';
    levels.forEach((lv) => {
      ctx.beginPath();
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = V[j][i], b = V[j][i + 1], c = V[j + 1][i + 1], d = V[j + 1][i], pts = [];
        const e = (v1, v2, x1, y1, x2, y2) => { if ((v1 - lv) * (v2 - lv) < 0) { const t = (lv - v1) / (v2 - v1); pts.push([x1 + t * (x2 - x1), y1 + t * (y2 - y1)]); } };
        e(a, b, xs[i], ys[j], xs[i + 1], ys[j]); e(b, c, xs[i + 1], ys[j], xs[i + 1], ys[j + 1]); e(c, d, xs[i + 1], ys[j + 1], xs[i], ys[j + 1]); e(d, a, xs[i], ys[j + 1], xs[i], ys[j]);
        for (let q = 0; q + 1 < pts.length; q += 2) { ctx.moveTo(P.tx(pts[q][0]), P.ty(pts[q][1])); ctx.lineTo(P.tx(pts[q + 1][0]), P.ty(pts[q + 1][1])); }
      }
      ctx.stroke();
    });
    ctx.restore();
  }
  const eigmax2 = (a, b, d) => (a + d) / 2 + Math.sqrt(((a - d) / 2) ** 2 + b * b);

  /* ================= 实验 1：窄深井与 SAM 探路 ================= */
  const sec1 = $('#sam');
  const LANDS = {
    valley: { L: (a, b) => 0.5 * (a * b - 1) ** 2, g: (a, b) => { const r = a * b - 1; return [r * b, r * a]; }, H: (a, b) => eigmax2(b * b, 2 * a * b - 1, a * a), dom: [-0.3, 4.3, -0.3, 4.3], start: [3.6, 0.15], rho: 0.25, lr: 0.05, T: 600 },
    ellipse: { L: (a, b) => 0.5 * a * a + 50 * b * b, g: (a, b) => [a, 100 * b], H: () => 100, dom: [-0.25, 1.25, -0.3, 0.3], start: [1.0, 0.1], rho: 0.1, lr: 0.015, T: 60 },
  };
  const S = { land: 'valley', rho: 0.25, lr: 0.05, T: 600, delta: 0.1, start: [3.6, 0.15], frame: null };
  let RUN = null, mapP = null;
  const LD = () => LANDS[S.land];
  function run1() {
    const Ld = LD(), out = {};
    [['gd', 0], ['sam', S.rho]].forEach(([k, rho]) => {
      let [a, b] = S.start; const pts = [[a, b]], eps = [];
      for (let t = 0; t < S.T; t++) {
        let g = Ld.g(a, b); const n = Math.hypot(g[0], g[1]) || 1, e = [(rho * g[0]) / n, (rho * g[1]) / n]; eps.push(e);
        if (rho > 0) g = Ld.g(a + e[0], b + e[1]);
        a -= S.lr * g[0]; b -= S.lr * g[1];
        if (!isFinite(a) || Math.abs(a) > 1e3 || Math.abs(b) > 1e3) break;
        pts.push([a, b]);
      }
      out[k] = { pts, eps };
    });
    RUN = out;
  }
  const sRho = LAB.slider('#s-rho', { label: '探路半径 $\\rho$', min: 0, max: 0.5, step: 0.01, value: S.rho, fmt: (v) => v.toFixed(2), onInput: (v) => { S.rho = v; upd1(); } });
  const sLr = LAB.slider('#s-lr', { label: '学习率 $\\eta$', min: 0.005, max: 0.15, step: 0.001, value: S.lr, fmt: (v) => v.toFixed(3), onInput: (v) => { S.lr = v; upd1(); } });
  const sT = LAB.slider('#s-steps', { label: '步数', min: 10, max: 1500, step: 10, value: S.T, onInput: (v) => { S.T = v; upd1(); } });
  LAB.slider('#s-shift', { label: '考场偏移 $\\delta$', min: 0, max: 0.3, step: 0.01, value: 0.1, fmt: (v) => v.toFixed(2), onInput: (v) => { S.delta = v; upd1(); parabCv.redraw(); updParab(); } });
  function setLand(k) { S.land = k; const Ld = LD(); S.rho = Ld.rho; S.lr = Ld.lr; S.T = Ld.T; S.start = Ld.start.slice(); sRho.set(S.rho); sLr.set(S.lr); sT.set(S.T); $('#s-leg-valley').style.display = k === 'valley' ? '' : 'none'; upd1(); }
  LAB.segmented('#s-land', ['一谷多底 $\\tfrac12(w_1w_2-1)^2$', '书中椭圆碗 $\\tfrac12w_1^2+50w_2^2$'], 0, (i) => setLand(i ? 'ellipse' : 'valley'));
  $('#s-reset').onclick = () => { S.start = LD().start.slice(); upd1(); };
  $('#s-play').onclick = () => {
    S.frame = 0; const tick = () => { if (S.frame === null) return; S.frame = Math.min(S.T, S.frame + Math.max(1, Math.round(S.T / 180))); mapCv.redraw(); if (S.frame < S.T && isActive(sec1)) requestAnimationFrame(tick); else { S.frame = null; mapCv.redraw(); } };
    requestAnimationFrame(tick);
  };
  const mapCv = LAB.canvas('#s-map', (ctx, w, h) => {
    const Ld = LD(), [x0, x1, y0, y1] = Ld.dom;
    const P = (mapP = new LAB.Plot(ctx, w, h, { xmin: x0, xmax: x1, ymin: y0, ymax: y1, xlabel: 'w₁', ylabel: 'w₂', pad: { l: 44, r: 12, t: 10, b: 34 } }));
    const lf = (a, b) => Ld.L(a, b);
    heatField(ctx, P, lf, S.land === 'valley' ? -3 : -3, S.land === 'valley' ? 2.5 : 1, 4, 0.62);
    P.axes();
    P.clip();
    contours(ctx, P, (a, b) => Math.log10(lf(a, b) + 1e-6), S.land === 'valley' ? [-2, -1, -0.5, 0, 0.5, 1, 1.5, 2] : [-2.5, -2, -1.5, -1, -0.5, 0, 0.5], 90, 70);
    if (S.land === 'valley') { // 谷底线 w1·w2 = 1，按曲率着色
      for (let i = 0; i < 160; i++) { const a0 = 0.24 + (i / 160) * 4.1, a1 = 0.24 + ((i + 1) / 160) * 4.1, sh = Ld.H(a0, 1 / a0), t = M.clamp((Math.log(sh) - Math.log(2)) / (Math.log(18) - Math.log(2)), 0, 1); ctx.strokeStyle = LAB.mix('#2F8F5B', '#D1495B', t); ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(P.tx(a0), P.ty(1 / a0)); ctx.lineTo(P.tx(a1), P.ty(1 / a1)); ctx.stroke(); }
    }
    // 考场：平移后的谷底
    if (S.delta > 0) { ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(209,73,91,.55)'; ctx.lineWidth = 1.3; ctx.beginPath(); if (S.land === 'valley') { for (let i = 0; i <= 160; i++) { const a = 0.24 + (i / 160) * 4.1; const X = P.tx(a + S.delta), Y = P.ty(1 / a + S.delta); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); } } else { ctx.arc(P.tx(S.delta), P.ty(S.delta), 4, 0, 7); } ctx.stroke(); ctx.restore(); }
    const n = S.frame === null ? Infinity : S.frame;
    [['gd', C.c1], ['sam', C.c3]].forEach(([k, col]) => {
      const pts = RUN[k].pts.slice(0, Math.min(RUN[k].pts.length, n + 1));
      ctx.strokeStyle = col; ctx.lineWidth = k === 'sam' ? 1.3 : 2; ctx.globalAlpha = k === 'sam' ? 0.85 : 1; ctx.beginPath(); pts.forEach((p, i) => { const X = P.tx(p[0]), Y = P.ty(p[1]); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.stroke();
      ctx.globalAlpha = 1; const step = Math.max(1, Math.round(pts.length / 60)); ctx.fillStyle = col; pts.forEach((p, i) => { if (i && i % step === 0) { ctx.beginPath(); ctx.arc(P.tx(p[0]), P.ty(p[1]), 2.2, 0, 7); ctx.fill(); } });
      const e = pts[pts.length - 1]; ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(P.tx(e[0]), P.ty(e[1]), 5.5, 0, 7); ctx.fill(); ctx.stroke();
      if (k === 'sam' && S.rho > 0) { const idx = Math.min(pts.length - 1, RUN.sam.eps.length - 1), ep = RUN.sam.eps[idx]; if (ep) LAB.arrow(ctx, P.tx(e[0]), P.ty(e[1]), P.tx(e[0] + ep[0]), P.ty(e[1] + ep[1]), C.c4, 2, 7); }
    });
    P.unclip();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P.tx(S.start[0]), P.ty(S.start[1]), 7, 0, 7); ctx.fill(); ctx.stroke();
  });
  pointer(mapCv.canvas, { down: ([x, y]) => { if (!mapP) return false; setStart(x, y); }, move: ([x, y]) => setStart(x, y) });
  function setStart(x, y) { const [x0, x1, y0, y1] = LD().dom; S.start = [+M.clamp(mapP.ix(x), x0, x1).toFixed(3), +M.clamp(mapP.iy(y), y0, y1).toFixed(3)]; S.frame = null; upd1(); }
  const st1 = LAB.stat('#s-stats', 'GD：训练 / 考场损失', '');
  const st2 = LAB.stat('#s-stats', 'SAM：训练 / 考场损失', 'leaf');
  const st3 = LAB.stat('#s-stats', 'GD 落点曲率 $\\lambda_{\\max}$', 'coral');
  const st4 = LAB.stat('#s-stats', 'SAM 落点曲率 $\\lambda_{\\max}$', 'teal');
  function upd1() {
    run1();
    const Ld = LD(), end = (k) => RUN[k].pts[RUN[k].pts.length - 1], te = (p) => Ld.L(p[0] - S.delta, p[1] - S.delta);
    const g = end('gd'), s = end('sam');
    const z = (v) => (v < 1e-6 ? '≈0' : fnum(v, 2));
    st1.set(`${z(Ld.L(...g))}<small> / ${fnum(te(g), 3)}</small>`); st2.set(`${z(Ld.L(...s))}<small> / ${fnum(te(s), 3)}</small>`);
    st3.set(fnum(Ld.H(...g), 3)); st4.set(fnum(Ld.H(...s), 3));
    $('#s-sub').textContent = S.land === 'valley' ? '谷底是一整条曲线：两端尖、中间平' : '只有一个谷底，看清 SAM 的每一步怎么算';
    // 一步拆解
    const w0 = S.start, g0 = Ld.g(...w0), n0 = Math.hypot(...g0), e0 = [(S.rho * g0[0]) / n0, (S.rho * g0[1]) / n0], wa = [w0[0] + e0[0], w0[1] + e0[1]], ga = Ld.g(...wa);
    const wS = [w0[0] - S.lr * g0[0], w0[1] - S.lr * g0[1]], wM = [w0[0] - S.lr * ga[0], w0[1] - S.lr * ga[1]];
    $('#s-hand').innerHTML = LAB.tex(`\\mathbf w_0=${bvec(w0, 4)},\\quad \\mathbf g_0=${bvec(g0, 4)},\\quad \\|\\mathbf g_0\\|=${tnum(n0, 4)},\\quad \\hat{\\boldsymbol\\epsilon}=\\rho\\frac{\\mathbf g_0}{\\|\\mathbf g_0\\|}=${bvec(e0, 3)}`, true) +
      LAB.tex(`\\mathbf w_{\\text{adv}}=${bvec(wa, 4)},\\quad \\mathbf g_{\\text{adv}}=${bvec(ga, 4)},\\qquad \\mathbf w_1^{\\text{SGD}}=${bvec(wS, 4)},\\quad \\mathbf w_1^{\\text{SAM}}=${bvec(wM, 4)}`, true);
    mapCv.redraw();
  }
  // 书中两条抛物线
  const parabCv = LAB.canvas('#s-parab', (ctx, w, h) => {
    const d = S.delta, rho = 0.1, w0 = 0.001;
    [[1, w < 520 ? '宽盆地 w²' : '宽盆地 f(w) = w²', C.c3], [10000, w < 520 ? '窄深井 10000w²' : '窄深井 f(w) = 10000 w²', C.c4]].forEach(([k, name, col], i) => {
      const pw = w / 2, ymax = k * 0.16 * 0.16 * 1.05;
      const P = new LAB.Plot(ctx, w, h, { xmin: -0.16, xmax: 0.16, ymin: 0, ymax, xtickValues: [-0.1, 0, 0.1], yticks: 3, pad: { l: i * pw + 46, r: (1 - i) * pw + 10, t: 24, b: 30 } }).axes();
      P.fn((x) => k * x * x, col, 2.4);
      P.vline(d, C.c4, [4, 3], 1); P.points([d], [k * d * d], C.c4, 4.5, '#fff');
      // 探路员：从 w0 往上坡迈 ρ，切线表示测到的斜率
      const wa = w0 + rho, ga = 2 * k * wa, ya = k * wa * wa;
      if (wa <= 0.16) { P.points([wa], [ya], C.c2, 4); const dx = 0.03; ctx.save(); ctx.strokeStyle = C.c2; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(P.tx(wa - dx), P.ty(ya - ga * dx)); ctx.lineTo(P.tx(wa + dx), P.ty(ya + ga * dx)); ctx.stroke(); ctx.restore(); }
      label(ctx, name, i * pw + 46 + (pw - 56) / 2, 10, col, `600 12.5px ${FONT}`);
    });
  });
  const pb1 = LAB.stat('#s-stats2', '考场罚分：宽盆地 $f(\\delta)$', 'leaf');
  const pb2 = LAB.stat('#s-stats2', '考场罚分：窄深井 $f(\\delta)$', 'coral');
  const pb3 = LAB.stat('#s-stats2', '探路斜率 $f\'(0.101)$：宽 / 窄', 'amber');
  const pb4 = LAB.stat('#s-stats2', '二阶导数：宽 / 窄', 'plum');
  function updParab() { const d = S.delta; pb1.set(fnum(d * d, 3)); pb2.set(fnum(10000 * d * d, 4)); pb3.set(`0.202<small> / </small>2020`); pb4.set(`2<small> / </small>20000`); }
  setLand('valley'); updParab();

  /* ================= 实验 2：顿悟与权重衰减 ================= */
  const sec2 = $('#grok');
  const PM = 11, D = 64, KR = 0.5, STEPS = 16384;
  const K2 = { lam: 0.03, lr: 0.1, frac: 0.5 };
  let GR = null, GJOB = null, CMP = null;
  const pairs = []; for (let a = 0; a < PM; a++) for (let b = 0; b < PM; b++) pairs.push([a, b, (a + b) % PM]);
  const RF = LAB.rng(3); const PH = pairs.map(() => Float64Array.from({ length: D }, () => RF.normal()));
  const order = M.range(pairs.length); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(RF() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const CHECK = new Set(); for (let e = 0; e <= 14; e += 0.125) CHECK.add(Math.round(Math.pow(2, e))); CHECK.add(0);
  function makeRun(lam, lr, frac) {
    const nt = Math.round(frac * pairs.length), tr = order.slice(0, nt), te = order.slice(nt);
    const R = LAB.rng(11), W = Float64Array.from({ length: PM * D }, () => R.normal() * 0.01);
    return { lam, lr, tr, te, W, u: 1e-3, v: 1e-3, t: 0, log: [], GW: new Float64Array(PM * D), z: new Float64Array(PM) };
  }
  function evalSet(r, set) {
    let acc = 0; const z = r.z, s = KR * r.u * r.v;
    for (const idx of set) { const f = PH[idx], y = pairs[idx][2]; let best = -Infinity, am = 0; for (let c = 0; c < PM; c++) { let v = c === y ? s : 0; const o = c * D; for (let k = 0; k < D; k++) v += r.W[o + k] * f[k]; z[c] = v; if (v > best) { best = v; am = c; } } if (am === y) acc++; }
    return acc / set.length;
  }
  function stepRun(r, n) {
    const N = r.tr.length, z = r.z, GW = r.GW;
    for (let it = 0; it < n && r.t <= STEPS; it++) {
      if (CHECK.has(r.t)) { let wn = 0; for (const x of r.W) wn += x * x; r.log.push([r.t, evalSet(r, r.tr), evalSet(r, r.te), wn, r.u * r.u + r.v * r.v]); }
      if (r.t === STEPS) { r.t++; break; }
      GW.fill(0); let gs = 0; const s = KR * r.u * r.v;
      for (const idx of r.tr) {
        const f = PH[idx], y = pairs[idx][2]; let mx = -Infinity;
        for (let c = 0; c < PM; c++) { let v = c === y ? s : 0; const o = c * D; for (let k = 0; k < D; k++) v += r.W[o + k] * f[k]; z[c] = v; if (v > mx) mx = v; }
        let Z = 0; for (let c = 0; c < PM; c++) { z[c] = Math.exp(z[c] - mx); Z += z[c]; }
        for (let c = 0; c < PM; c++) { const g = (z[c] / Z - (c === y ? 1 : 0)) / N; const o = c * D; for (let k = 0; k < D; k++) GW[o + k] += g * f[k]; if (c === y) gs += g * KR; }
      }
      const dec = 1 - r.lr * r.lam;
      for (let i = 0; i < r.W.length; i++) r.W[i] = dec * r.W[i] - r.lr * GW[i];
      const gu = gs * r.v, gv = gs * r.u; r.u = dec * r.u - r.lr * gu; r.v = dec * r.v - r.lr * gv;
      r.t++;
    }
    return r.t > STEPS;
  }
  function startGrok() {
    clearTimeout(GJOB); GR = makeRun(K2.lam, K2.lr, K2.frac); CMP = null; $('#k-cmp-card').style.display = 'none';
    const tick = () => { const t0 = performance.now(); let done = false; while (!done && performance.now() - t0 < 30) done = stepRun(GR, 200); $('#k-prog').textContent = done ? `完成：${STEPS.toLocaleString()} 步。` : `正在训练：第 ${GR.t.toLocaleString()} 步…`; updGrok(); if (!done) GJOB = setTimeout(tick, 0); };
    tick();
  }
  const LAMS = [0, 0.01, 0.03, 0.1], LCOL = ['#9aa5b1', C.c1, C.c3, C.c4];
  function startCmp() {
    clearTimeout(GJOB); CMP = LAMS.map((l) => makeRun(l, K2.lr, K2.frac)); $('#k-cmp-card').style.display = '';
    $('#k-cmp-leg').innerHTML = LAMS.map((l, i) => `<span><i style="background:${LCOL[i]}"></i>λ = ${l}</span>`).join('');
    const tick = () => { const t0 = performance.now(); let all = true; for (const r of CMP) { if (r.t <= STEPS) { all = false; stepRun(r, 120); } if (performance.now() - t0 > 30) break; } all = CMP.every((r) => r.t > STEPS); $('#k-prog').textContent = all ? '对比完成。' : `对比中：${CMP.map((r) => Math.min(r.t, STEPS)).reduce((a, b) => a + b, 0).toLocaleString()} / ${(4 * STEPS).toLocaleString()} 步`; cmpCv.redraw(); if (!all) GJOB = setTimeout(tick, 0); };
    tick();
  }
  LAB.slider('#k-lam', { label: '权重衰减 $\\lambda$', min: 0, max: 0.1, step: 0.005, value: K2.lam, fmt: (v) => v.toFixed(3), onInput: (v) => { K2.lam = v; } });
  LAB.slider('#k-lr', { label: '学习率 $\\eta$', min: 0.05, max: 0.3, step: 0.01, value: K2.lr, fmt: (v) => v.toFixed(2), onInput: (v) => { K2.lr = v; } });
  LAB.slider('#k-frac', { label: '练习题占全部 121 道题的比例', min: 0.3, max: 0.8, step: 0.05, value: K2.frac, fmt: (v) => `${Math.round(v * 100)}%（${Math.round(v * 121)} 道）`, onInput: (v) => { K2.frac = v; } });
  $('#k-run').onclick = startGrok; $('#k-cmp').onclick = startCmp;
  const xT = (t) => Math.log2(t + 1);
  const XT = { xmin: 0, xmax: xT(STEPS), xtickValues: [0, 10, 100, 1000, 10000].map(xT), xfmt: (v) => Math.round(Math.pow(2, v) - 1).toLocaleString() };
  const accCv = LAB.canvas('#k-acc', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, Object.assign({ ymin: 0, ymax: 1.04, ytickValues: [0, 0.25, 0.5, 0.75, 1], yfmt: (v) => Math.round(v * 100) + '%', xlabel: '训练步数', ylabel: '正确率', pad: { l: 46, r: 10, t: 10, b: 36 } }, XT)).axes();
    P.hline(1 / PM, '#9aa5b1', [4, 3], 1.2);
    if (!GR || !GR.log.length) return;
    const xs = GR.log.map((r) => xT(r[0]));
    P.line(xs, GR.log.map((r) => r[1]), C.c1, 2.4); P.line(xs, GR.log.map((r) => r[2]), C.c4, 2.4);
    const m = GR.marks || {};
    if (m.mem >= 0) { P.vline(xT(m.mem), C.c1, [3, 3], 1); P.text(xT(m.mem), 0.55, ` 背会 ${m.mem}`, C.c1, 'left', 'middle', `11px ${FONT}`); }
    if (m.grok >= 0) { P.vline(xT(m.grok), C.c4, [3, 3], 1); P.text(xT(m.grok), 0.4, ` 顿悟 ${m.grok}`, C.c4, 'left', 'middle', `11px ${FONT}`); }
  });
  const normCv = LAB.canvas('#k-norm', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, Object.assign({ ymin: 1e-6, ymax: 1e3, logy: true, ytickValues: [1e-6, 1e-4, 0.01, 1, 100], xlabel: '训练步数', ylabel: '旋钮平方和', pad: { l: 46, r: 10, t: 10, b: 36 } }, XT)).axes();
    if (!GR || !GR.log.length) return;
    const xs = GR.log.map((r) => xT(r[0]));
    P.line(xs, GR.log.map((r) => Math.max(1e-6, r[3])), C.c2, 2.2); P.line(xs, GR.log.map((r) => Math.max(1e-6, r[4])), C.c3, 2.2); P.line(xs, GR.log.map((r) => r[3] + r[4]), C.slate, 1.6, [5, 4]);
  });
  const cmpCv = LAB.canvas('#k-cmpcv', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, Object.assign({ ymin: 0, ymax: 1.04, ytickValues: [0, 0.5, 1], yfmt: (v) => Math.round(v * 100) + '%', xlabel: '训练步数', ylabel: '考题正确率', pad: { l: 46, r: 10, t: 10, b: 36 } }, XT)).axes();
    if (!CMP) return;
    CMP.forEach((r, i) => { if (r.log.length) P.line(r.log.map((q) => xT(q[0])), r.log.map((q) => q[2]), LCOL[i], 2.2); });
  });
  const gk1 = LAB.stat('#k-stats', '背会练习题（≥99%）', '');
  const gk2 = LAB.stat('#k-stats', '顿悟（考题 ≥95%）', 'coral');
  const gk3 = LAB.stat('#k-stats', '等待 $\\Delta T$', 'amber');
  const gk4 = LAB.stat('#k-stats', '参考尺度 $1/(\\eta\\lambda)$', 'plum');
  function updGrok() {
    const first = (k, th) => { const r = GR.log.find((q) => q[k] >= th); return r ? r[0] : -1; };
    GR.marks = { mem: first(1, 0.99), grok: first(2, 0.95) };
    gk1.set(GR.marks.mem >= 0 ? `第 ${GR.marks.mem.toLocaleString()}<small> 步</small>` : '…');
    gk2.set(GR.marks.grok >= 0 ? `第 ${GR.marks.grok.toLocaleString()}<small> 步</small>` : GR.t > STEPS ? '没有发生' : '…');
    gk3.set(GR.marks.grok >= 0 && GR.marks.mem >= 0 ? `${(GR.marks.grok - GR.marks.mem).toLocaleString()}<small> 步</small>` : '–');
    gk4.set(GR.lam > 0 ? `${Math.round(1 / (GR.lr * GR.lam)).toLocaleString()}<small> 步</small>` : '∞');
    accCv.redraw(); normCv.redraw();
  }
  new MutationObserver(() => { if (isActive(sec2) && !GR) startGrok(); }).observe(sec2, { attributes: true, attributeFilter: ['class'] });
  if (isActive(sec2)) setTimeout(startGrok, 50);

  /* ================= 实验 3：模型合并与 TIES ================= */
  const MG = { land: 0, A: [-0.2, 0.4], B: [0.4, -0.2], alpha: 0.5, vec: 0, trim: 0 };
  const smin = (a, b, k) => { const m = Math.min(a, b); return m - Math.log(Math.exp(-k * (a - m)) + Math.exp(-k * (b - m))) / k; };
  const LANDM = [(x, y) => x * x + y * y, (x, y) => Math.max(0, 3 * smin((x + 0.2) ** 2 + (y - 0.4) ** 2, (x - 0.4) ** 2 + (y + 0.2) ** 2, 12))];
  const fM = (p) => LANDM[MG.land](p[0], p[1]);
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  let planeP = null, dragM = null;
  LAB.segmented('#m-land', ['同一个碗 $w_1^2+w_2^2$', '两个碗之间隔着山'], 0, (i) => { MG.land = i; updM(); });
  LAB.slider('#m-alpha', { label: '插值比例 $\\alpha$：$(1-\\alpha)\\mathbf w_A+\\alpha\\mathbf w_B$', min: 0, max: 1, step: 0.01, value: 0.5, fmt: (v) => v.toFixed(2), onInput: (v) => { MG.alpha = v; updM(); } });
  $('#m-book').onclick = () => { MG.A = [-0.2, 0.4]; MG.B = [0.4, -0.2]; updM(); };
  const planeCv = LAB.canvas('#m-plane', (ctx, w, h) => {
    const P = (planeP = new LAB.Plot(ctx, w, h, { xmin: -0.8, xmax: 0.8, ymin: -0.8, ymax: 0.8, xtickValues: [-0.8, -0.4, 0, 0.4, 0.8], ytickValues: [-0.8, -0.4, 0, 0.4, 0.8], xlabel: 'w₁', ylabel: 'w₂', pad: { l: 40, r: 10, t: 10, b: 34 } }));
    heatField(ctx, P, (x, y) => LANDM[MG.land](x, y), -2.5, 0.4, 4, 0.62);
    P.axes(); P.clip();
    contours(ctx, P, (x, y) => LANDM[MG.land](x, y), [0.02, 0.05, 0.1, 0.2, 0.3, 0.5, 0.8], 80, 80);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(P.tx(MG.A[0]), P.ty(MG.A[1])); ctx.lineTo(P.tx(MG.B[0]), P.ty(MG.B[1])); ctx.stroke(); ctx.setLineDash([]);
    const M2 = lerp(MG.A, MG.B, MG.alpha);
    [[MG.A, 'A', C.c1], [MG.B, 'B', C.c2]].forEach(([p, n, col]) => { ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P.tx(p[0]), P.ty(p[1]), 9, 0, 7); ctx.fill(); ctx.stroke(); label(ctx, n, P.tx(p[0]), P.ty(p[1]), '#fff', `700 11px ${NUMF}`); });
    ctx.fillStyle = C.c3; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(P.tx(M2[0]), P.ty(M2[1]), 6.5, 0, 7); ctx.fill(); ctx.stroke();
    P.unclip();
  });
  pointer(planeCv.canvas, {
    down: ([x, y]) => { if (!planeP) return false; const dA = Math.hypot(x - planeP.tx(MG.A[0]), y - planeP.ty(MG.A[1])), dB = Math.hypot(x - planeP.tx(MG.B[0]), y - planeP.ty(MG.B[1])); if (Math.min(dA, dB) > 40) return false; dragM = dA < dB ? 'A' : 'B'; },
    move: ([x, y]) => { MG[dragM] = [+M.clamp(planeP.ix(x), -0.8, 0.8).toFixed(2), +M.clamp(planeP.iy(y), -0.8, 0.8).toFixed(2)]; updM(); },
  });
  const lineCv = LAB.canvas('#m-line', (ctx, w, h) => {
    const ys = M.linspace(0, 1, 101).map((t) => fM(lerp(MG.A, MG.B, t))), top = Math.max(0.25, ...ys) * 1.15;
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: 1, ymin: 0, ymax: top, xtickValues: [0, 0.25, 0.5, 0.75, 1], xfmt: (v) => (v === 0 ? 'A' : v === 1 ? 'B' : String(v)), xlabel: '插值比例 α', ylabel: '损失', pad: { l: 46, r: 10, t: 10, b: 36 } }).axes();
    const xs = M.linspace(0, 1, 101), a = fM(MG.A), b = fM(MG.B);
    P.line([0, 1], [a, b], '#9aa5b1', 1.4, [5, 4]);
    P.area(xs, ys, C.c4, 0.1); P.line(xs, ys, C.c4, 2.4);
    P.points([0], [a], C.c1, 5, '#fff'); P.points([1], [b], C.c2, 5, '#fff'); P.points([MG.alpha], [fM(lerp(MG.A, MG.B, MG.alpha))], C.c3, 5.5, '#fff');
    P.text(0.02, top * 0.96, '虚线：两端罚分的平均', C.slate, 'left', 'top', `11px ${FONT}`);
  });
  const mg1 = LAB.stat('#m-stats', '$f(\\mathbf w_A)$ / $f(\\mathbf w_B)$', '');
  const mg2 = LAB.stat('#m-stats', '中点 $f\\big(\\tfrac{\\mathbf w_A+\\mathbf w_B}{2}\\big)$', 'leaf');
  const mg3 = LAB.stat('#m-stats', '省下的罚分', 'teal');
  const mg4 = LAB.stat('#m-stats', '当前插值点的罚分', 'plum');
  function updM() {
    const a = fM(MG.A), b = fM(MG.B), mid = fM(lerp(MG.A, MG.B, 0.5));
    mg1.set(`${fnum(a, 3)}<small> / ${fnum(b, 3)}</small>`); mg2.set(fnum(mid, 3)); const sv = (a + b) / 2 - mid; mg3.set(sv >= 0 ? fnum(sv, 3) : `<span style="color:var(--coral)">−${fnum(-sv, 3)}</span><small> 反而变差</small>`); mg4.set(fnum(fM(lerp(MG.A, MG.B, MG.alpha)), 3));
    planeCv.redraw(); lineCv.redraw();
  }
  updM();
  // TIES
  const VECS = [[[0.6, -0.4, 0, 0.2], [0.4, 0.1, -0.5, 0.4], [-0.2, -0.6, -0.3, 0]], [[0.6, -0.4, 0.01, 0.2], [0.4, 0.1, -0.5, 0.4], [-0.2, -0.6, -0.3, 0.02]]];
  let TAU = VECS[0].map((r) => r.slice());
  const ECOL = [C.c1, C.c2, C.c5];
  LAB.segmented('#m-vec', ['书中正文版', '零算力实战版'], 0, (i) => { MG.vec = i; TAU = VECS[i].map((r) => r.slice()); sTr.set(i ? 25 : 0); MG.trim = i ? 25 : 0; updT(); });
  const sTr = LAB.slider('#m-trim', { label: '修剪：每个专家去掉改动最小的', min: 0, max: 75, step: 25, value: 0, fmt: (v) => v + '%', onInput: (v) => { MG.trim = v; updT(); } });
  // 与 numpy.percentile 一致的线性插值分位数
  const pct = (arr, q) => { const s = arr.slice().sort((a, b) => a - b), pos = ((s.length - 1) * q) / 100, lo = Math.floor(pos), hi = Math.ceil(pos); return s[lo] + (s[hi] - s[lo]) * (pos - lo); };
  function ties() {
    const trimmed = TAU.map((t) => { const th = pct(t.map(Math.abs), MG.trim); return t.map((v) => (MG.trim > 0 && Math.abs(v) < th ? 0 : v)); });
    const n = 4, sign = M.range(n).map((i) => Math.sign(M.sum(trimmed.map((t) => t[i]))));
    const agree = M.range(n).map((i) => trimmed.map((t) => t[i] !== 0 && Math.sign(t[i]) === sign[i]));
    const res = M.range(n).map((i) => { const vs = trimmed.filter((_, m) => agree[i][m]).map((t) => t[i]); return vs.length ? M.mean(vs) : 0; });
    const avg = M.range(n).map((i) => M.mean(TAU.map((t) => t[i])));
    return { trimmed, sign, agree, res, avg };
  }
  let TR = null, tiesP = null, dragT = null;
  const tiesCv = LAB.canvas('#m-ties', (ctx, w, h) => {
    const P = (tiesP = new LAB.Plot(ctx, w, h, { xmin: 0.4, xmax: 4.6, ymin: -0.8, ymax: 0.8, xtickValues: [1, 2, 3, 4], xfmt: (v) => `旋钮 ${v}`, ytickValues: [-0.8, -0.4, 0, 0.4, 0.8], ylabel: '改动量 τ', pad: { l: 46, r: 10, t: 10, b: 30 } })).axes();
    P.hline(0, C.slate, null, 1);
    const gw = P.tx(1.8) - P.tx(1), bw = Math.min(16, gw / 6.5);
    for (let i = 0; i < 4; i++) {
      const xc = P.tx(i + 1);
      TAU.forEach((t, m) => {
        const X = xc + (m - 2) * bw * 1.15, v = t[i], used = TR.agree[i][m], y0 = P.ty(0), y1 = P.ty(v);
        ctx.save(); if (used) { ctx.fillStyle = ECOL[m]; LAB.roundRect(ctx, X - bw / 2, Math.min(y0, y1), bw, Math.max(1.5, Math.abs(y1 - y0)), 2); ctx.fill(); } else { ctx.strokeStyle = ECOL[m]; ctx.setLineDash([3, 2]); ctx.lineWidth = 1.4; LAB.roundRect(ctx, X - bw / 2 + 0.7, Math.min(y0, y1), bw - 1.4, Math.max(1.5, Math.abs(y1 - y0)), 2); ctx.stroke(); } ctx.restore();
      });
      [[TR.avg[i], '#9aa5b1'], [TR.res[i], C.c3]].forEach(([v, col], q) => { const X = xc + (q + 1.6) * bw * 1.15, y0 = P.ty(0), y1 = P.ty(v); ctx.fillStyle = col; LAB.roundRect(ctx, X - bw / 2, Math.min(y0, y1), bw, Math.max(1.5, Math.abs(y1 - y0)), 2); ctx.fill(); label(ctx, (v >= 0 ? '+' : '') + v.toFixed(2), X, v >= 0 ? y1 - 8 : y1 + 9, col === C.c3 ? C.c3 : C.slate, `600 10.5px ${NUMF}`); });
    }
  });
  pointer(tiesCv.canvas, {
    down: ([x, y]) => { if (!tiesP) return false; const gw = tiesP.tx(1.8) - tiesP.tx(1), bw = Math.min(16, gw / 6.5); for (let i = 0; i < 4; i++) for (let m = 0; m < 3; m++) { const X = tiesP.tx(i + 1) + (m - 2) * bw * 1.15; if (Math.abs(x - X) <= bw * 0.6) { dragT = [m, i]; setT(y); return; } } return false; },
    move: ([, y]) => setT(y),
  });
  function setT(y) { const [m, i] = dragT; TAU[m][i] = +M.clamp(tiesP.iy(y), -0.8, 0.8).toFixed(2); updT(); }
  function updT() {
    TR = ties();
    const f2 = (v) => (Math.abs(v) < 1e-9 ? '0' : (v >= 0 ? '+' : '') + v.toFixed(2));
    let html = '<tr><th>旋钮</th><th>专家 1</th><th>专家 2</th><th>专家 3</th><th>修剪后</th><th>选出的符号</th><th>简单平均</th><th>TIES</th></tr>';
    for (let i = 0; i < 4; i++) html += `<tr><td>${i + 1}</td>${TAU.map((t) => `<td>${f2(t[i])}</td>`).join('')}<td>${TR.trimmed.map((t) => (t[i] === 0 ? '0' : f2(t[i]))).join(', ')}</td><td>${TR.sign[i] > 0 ? '＋' : TR.sign[i] < 0 ? '－' : '0'}</td><td>${f2(TR.avg[i])}</td><td><b style="color:var(--leaf)">${f2(TR.res[i])}</b></td></tr>`;
    $('#m-table').innerHTML = html;
    tiesCv.redraw();
  }
  updT();
})();
