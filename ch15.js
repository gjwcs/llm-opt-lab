/* 第 15 章 分布式训练：梯度累积、ZeRO 与 DiLoCo（交互实验） */
(function () {
  const { COLORS: C, M } = LAB;
  LAB.page({ bookRef: '对应书中 §15.1 ZeRO 显存账单与梯度累积 · §15.2 Ring All-Reduce 与 DiLoCo' });
  document.querySelectorAll('.formula').forEach((f) => { f.style.width = '0'; f.style.minWidth = '100%'; });
  const $ = (s) => document.querySelector(s);
  const FONT = getComputedStyle(document.body).getPropertyValue('--font');
  const NUMF = getComputedStyle(document.body).getPropertyValue('--font-num');
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = (e) => String(e).split('').map((c) => SUP[c] || c).join('');
  const sciParts = (x) => { let e = Math.floor(Math.log10(Math.abs(x))), m = +(x / Math.pow(10, e)).toPrecision(3); if (Math.abs(m) >= 10) { m /= 10; e++; } return [m, e]; };
  const fnum = (x, d) => { if (!isFinite(x)) return x > 0 ? '∞' : '–'; if (x === 0) return '0'; const a = Math.abs(x); if (a >= 1e6 || a < 1e-3) { const [m, e] = sciParts(x); return (m === 1 ? '' : m + '×') + '10' + sup(e); } return String(+x.toPrecision(d || 4)); };
  const gb = (v) => (v >= 1000 ? v.toFixed(0) : v >= 100 ? v.toFixed(1) : v >= 10 ? v.toFixed(2).replace(/0$/, '') : v.toFixed(2)) + ' GB';
  const isActive = (sec) => sec.classList.contains('active');
  function label(ctx, txt, x, y, col, font, align, base) { ctx.fillStyle = col || C.ink; ctx.font = font || `12px ${FONT}`; ctx.textAlign = align || 'center'; ctx.textBaseline = base || 'middle'; ctx.fillText(txt, x, y); }

  /* ================= 实验 1：ZeRO 显存计算器 ================= */
  const ZR = { psi: 70, N: 64, gpu: 2, opt: 0, stage: 1, b: 4, B: 4096, forget: false };
  const GPUS = [24, 40, 80, 141];
  const STAGES = ['DDP', 'ZeRO-1', 'ZeRO-2', 'ZeRO-3'];
  const optB = () => (ZR.opt ? 8 : 12);
  const perGPU = (s, P, N) => { const o = optB(); return [[2 * P, 2 * P, o * P], [2 * P, 2 * P, (o * P) / N], [2 * P, (2 * P) / N, (o * P) / N], [(2 * P) / N, (2 * P) / N, (o * P) / N]][s]; };
  const sPsi = LAB.slider('#z-psi', { label: '模型参数量 $\\Psi$', min: 0, max: 3, step: 0.01, value: Math.log10(70), fmt: () => `${fnum(ZR.psi, 3)}B`, onInput: (v) => { ZR.psi = +Math.pow(10, v).toPrecision(2); upd1(); } });
  const sN = LAB.slider('#z-n', { label: '数据并行显卡数 $N_d$', min: 0, max: 10, step: 1, value: 6, fmt: (v) => String(Math.pow(2, v)), onInput: (v) => { ZR.N = Math.pow(2, v); upd1(); } });
  const gSeg = LAB.segmented('#z-gpu', GPUS.map((g) => g + ' GB'), 2, (i) => { ZR.gpu = i; upd1(); });
  LAB.segmented('#z-opt', ['AdamW（12 字节）', 'Muon / Lion（8 字节）'], 0, (i) => { ZR.opt = i; upd1(); });
  $('#z-book').onclick = () => { ZR.psi = 70; ZR.N = 64; sPsi.set(Math.log10(70)); sN.set(6); gSeg.set(2); };
  LAB.segmented('#z-stage', ['DDP（不切）', 'ZeRO-1', 'ZeRO-2', 'ZeRO-3'], 1, (i) => { ZR.stage = i; shelfCv.redraw(); });
  const SEGC = [C.slate, C.c2, C.c4];
  const barsCv = LAB.canvas('#z-bars', (ctx, w, h) => {
    const P = ZR.psi, N = ZR.N, cap = GPUS[ZR.gpu], rows = STAGES.map((n, s) => [n, perGPU(s, P, N)]), tot = rows.map((r) => M.sum(r[1])), mx = Math.max(tot[0], cap) * 1.06;
    const narrow = w < 520, l = narrow ? 8 : 76, rp = 84, rowH = (h - 20) / 4, X = (v) => l + (v / mx) * (w - l - rp);
    rows.forEach(([name, segs], i) => {
      const y = 4 + i * rowH, bh = narrow ? rowH * 0.4 : Math.min(28, rowH * 0.6), by = narrow ? y + rowH * 0.48 : y + (rowH - bh) / 2;
      if (narrow) label(ctx, name, l, y + rowH * 0.24, C.ink, `600 12px ${FONT}`, 'left'); else label(ctx, name, l - 10, by + bh / 2, C.ink, `600 12.5px ${NUMF}`, 'right');
      let x = l; segs.forEach((v, k) => { const ww = X(v) - l; ctx.fillStyle = SEGC[k]; ctx.fillRect(x, by, Math.max(ww, 0.8), bh); x += ww; });
      label(ctx, gb(tot[i]), x + 6, by + bh / 2, tot[i] <= cap ? C.leaf : C.coral, `600 12.5px ${NUMF}`, 'left');
    });
    const cx = X(cap); ctx.strokeStyle = C.c4; ctx.lineWidth = 1.6; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(cx, 2); ctx.lineTo(cx, h - 16); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, `${cap} GB`, cx, h - 6, C.c4, `600 11px ${NUMF}`);
  });
  const shelfCv = LAB.canvas('#z-shelf', (ctx, w, h) => {
    const s = ZR.stage, books = perGPU(s, 1, 4).map((v) => v), cols = [C.slate, C.c2, C.c4], names = ['公式手册（参数）', '错题本（斜率）', '历年总账（优化器）'];
    const nb = 2 + 2 + optB(), narrow = w < 560;
    const per = narrow ? 1 : 2, gx = 14, cellW = (w - gx * (per + 1)) / per, rowsN = 4 / per, cellH = (h - (narrow ? 4 : 24)) / rowsN;
    const unit = Math.min((cellW - 20) / nb, 24, cellH / 3.6);
    for (let r = 0; r < 4; r++) {
      const cx = gx + (r % per) * (cellW + gx), cy = 4 + Math.floor(r / per) * cellH, base = cy + cellH - 26;
      // 书架（容量 6 本）
      ctx.fillStyle = '#f4efe6'; ctx.fillRect(cx + 6, base - unit * 2.6, unit * 6, unit * 2.6); ctx.strokeStyle = '#c9b99a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + 4, base + 1); ctx.lineTo(cx + 8 + unit * 6, base + 1); ctx.stroke();
      let x = cx + 8, k = 0; const total = M.sum(books);
      books.forEach((nbk, t) => { let left = nbk; while (left > 1e-9) { const f = Math.min(1, left); const over = x + unit * f > cx + 8 + unit * 6 + 0.5; ctx.fillStyle = over ? LAB.mix('#ffffff', cols[t], 0.45) : cols[t]; LAB.roundRect(ctx, x + 1, base - unit * 2.3, unit * f - 2, unit * 2.3, 2); ctx.fill(); if (over) { ctx.strokeStyle = C.coral; ctx.lineWidth = 1; ctx.stroke(); } x += unit * f; left -= f; k++; } });
      const ok = total <= 6 + 1e-9;
      label(ctx, `室友 ${r + 1}：${+total.toFixed(2)} 本 ${ok ? '✓' : '书架塌了'}`, cx + 8, base + 14, ok ? C.leaf : C.coral, `600 12px ${FONT}`, 'left');
    }
    if (!narrow) names.forEach((n, i) => { ctx.fillStyle = cols[i]; ctx.fillRect(w - 380 + i * 128, h - 12, 10, 10); label(ctx, n, w - 366 + i * 128, h - 7, C.slate, `11px ${FONT}`, 'left'); });
  });
  const zs = [LAB.stat('#z-stats', 'ZeRO-1 单卡', ''), LAB.stat('#z-stats', 'ZeRO-2 单卡', 'amber'), LAB.stat('#z-stats', 'ZeRO-3 单卡', 'leaf'), LAB.stat('#z-stats', 'ZeRO-3 至少要几张卡', 'teal')];
  // 梯度累积
  LAB.slider('#g-b', { label: '每卡每次能摊开几道题 $b_{\\text{micro}}$', min: 1, max: 32, step: 1, value: 4, onInput: (v) => { ZR.b = v; updAcc(); } });
  LAB.slider('#g-B', { label: '目标全局批量 $B_{\\text{global}}$', min: 8, max: 14, step: 1, value: 12, fmt: (v) => Math.pow(2, v).toLocaleString(), onInput: (v) => { ZR.B = Math.pow(2, v); updAcc(); } });
  LAB.checkbox('#g-forget', '累加后忘了除以 $K$', false, (v) => { ZR.forget = v; updAcc(); });
  const ga = [LAB.stat('#g-stats', '需要累积的趟数 $K$', 'teal'), LAB.stat('#g-stats', '实际全局批量 $N_d b K$', ''), LAB.stat('#g-stats', '每卡草稿纸只占', 'leaf')];
  function updAcc() {
    const K = Math.max(1, Math.ceil(ZR.B / (ZR.N * ZR.b)));
    ga[0].set(String(K)); ga[1].set((ZR.N * ZR.b * K).toLocaleString()); ga[2].set(`${ZR.b}<small> 道题的激活</small>`);
    const g = [2, 4, 6, 8], big = M.mean(g), m1 = (g[0] + g[1]) / 2, m2 = (g[2] + g[3]) / 2, acc = ZR.forget ? m1 + m2 : (m1 + m2) / 2;
    $('#g-demo').innerHTML = LAB.tex(`\\text{书中 4 道题的斜率 }(2,4,6,8):\\quad \\text{一次算 }\\frac{2+4+6+8}{4}=${big.toFixed(1)},\\qquad \\text{分两趟：}\\ \\bar g_{(1)}=\\frac{2+4}{2}=3,\\ \\bar g_{(2)}=\\frac{6+8}{2}=7\\ \\Rightarrow\\ ${ZR.forget ? '3+7' : '\\frac{3+7}{2}'}=\\color{${ZR.forget ? '#D1495B' : '#2F8F5B'}}{${acc.toFixed(1)}}`, true);
  }
  function upd1() {
    const P = ZR.psi, N = ZR.N, cap = GPUS[ZR.gpu];
    [1, 2, 3].forEach((s, i) => { const t = M.sum(perGPU(s, P, N)); zs[i].set(gb(t).replace(' GB', `<small> GB ${t <= cap ? '✓' : '✗'}</small>`)); });
    zs[3].set(`${Math.ceil(((2 + 2 + optB()) * P) / cap).toLocaleString()}<small> 张</small>`);
    barsCv.redraw(); shelfCv.redraw(); updAcc();
  }
  upd1();

  /* ================= 实验 2：Ring 围圈传纸条 ================= */
  const sec2 = $('#ring');
  const RG = { N: 4, s: 0 };
  const mod = (a, n) => ((a % n) + n) % n;
  function ringState(N, s) {
    let cards = M.range(N).map((r) => M.range(N).map((c) => (N <= 5 ? (c + 1) * Math.pow(10, r) : r + 1 + c)));
    const tot = M.range(N).map((c) => cards.reduce((a, row) => a + row[c], 0));
    let last = null;
    for (let st = 1; st <= s; st++) {
      if (st <= N - 1) { const k = st - 1, send = cards.map((row, r) => row[mod(r - k, N)]); last = { sendIdx: cards.map((_, r) => mod(r - k, N)), recvIdx: cards.map((_, r) => mod(r - k - 1, N)), val: send, add: true }; cards = cards.map((row, r) => { const nr = row.slice(); nr[mod(r - k - 1, N)] += send[mod(r - 1, N)]; return nr; }); }
      else { const k = st - N, send = cards.map((row, r) => row[mod(r + 1 - k, N)]); last = { sendIdx: cards.map((_, r) => mod(r + 1 - k, N)), recvIdx: cards.map((_, r) => mod(r - k, N)), val: send, add: false }; cards = cards.map((row, r) => { const nr = row.slice(); nr[mod(r - k, N)] = send[mod(r - 1, N)]; return nr; }); }
    }
    return { cards, tot, last };
  }
  const sRN = LAB.slider('#r-n', { label: '显卡数 $N$', min: 2, max: 8, step: 1, value: 4, onInput: (v) => { RG.N = v; RG.s = 0; sRS.setRange(0, 2 * (v - 1), 1); sRS.set(0); updRing(); } });
  const sRS = LAB.slider('#r-step', { label: '进行到第几轮', min: 0, max: 6, step: 1, value: 0, onInput: (v) => { RG.s = v; updRing(); } });
  $('#r-next').onclick = () => { RG.s = Math.min(2 * (RG.N - 1), RG.s + 1); sRS.set(RG.s); updRing(); };
  $('#r-prev').onclick = () => { RG.s = Math.max(0, RG.s - 1); sRS.set(RG.s); updRing(); };
  $('#r-reset').onclick = () => { RG.s = 0; sRS.set(0); updRing(); };
  let rTimer = null;
  $('#r-play').onclick = () => { clearInterval(rTimer); RG.s = 0; sRS.set(0); updRing(); rTimer = setInterval(() => { if (!isActive(sec2) || RG.s >= 2 * (RG.N - 1)) { clearInterval(rTimer); return; } RG.s++; sRS.set(RG.s); updRing(); }, 1100); };
  const ringCv = LAB.canvas('#r-ring', (ctx, w, h) => {
    const N = RG.N, st = ringState(N, RG.s), cx = w / 2, cy = h / 2 + 4, Rx = Math.min(w * 0.34, 230), Ry = Math.min(h * 0.36, 165);
    const cellW = Math.min(46, (w - 24) / (2 * N + 2), 260 / N), cardW = cellW * N + 12, cardH = 46;
    const pos = M.range(N).map((r) => { const a = -Math.PI / 2 + (2 * Math.PI * r) / N; return [cx + Rx * Math.cos(a), cy + Ry * Math.sin(a), a]; });
    const P = (a) => [cx + Rx * Math.cos(a), cy + Ry * Math.sin(a)];
    ctx.strokeStyle = C.line; ctx.lineWidth = 10; ctx.beginPath(); ctx.ellipse(cx, cy, Rx, Ry, 0, 0, 7); ctx.stroke();
    if (st.last && RG.s > 0) {
      pos.forEach(([x, y, a], r) => {
        const a2 = a + (2 * Math.PI) / N, [mx, my] = P((a + a2) / 2);
        ctx.strokeStyle = C.c2; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(cx, cy, Rx, Ry, 0, a + 0.2, a2 - 0.2); ctx.stroke();
        const [ex, ey] = P(a2 - 0.2), [sx, sy] = P(a2 - 0.27); LAB.arrow(ctx, sx, sy, ex, ey, C.c2, 2.4, 9);
        const v = st.last.val[r], txt = (st.last.add ? '+' : '抄 ') + v.toLocaleString(); ctx.font = `600 11px ${NUMF}`; const tw = ctx.measureText(txt).width + 10;
        ctx.fillStyle = '#fff8ea'; ctx.strokeStyle = C.c2; ctx.lineWidth = 1.2; LAB.roundRect(ctx, mx - tw / 2, my - 10, tw, 20, 5); ctx.fill(); ctx.stroke(); label(ctx, txt, mx, my, '#8a5a1e', `600 11px ${NUMF}`);
      });
    }
    pos.forEach(([x, y], r) => {
      const x0 = M.clamp(x - cardW / 2, 3, w - cardW - 3), y0 = y - cardH / 2, xc = x0 + cardW / 2;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = C.navy; ctx.lineWidth = 1.5; LAB.roundRect(ctx, x0, y0, cardW, cardH, 8); ctx.fill(); ctx.stroke();
      label(ctx, `卡 ${r}`, xc, y0 - 9, C.navy, `600 12px ${FONT}`);
      st.cards[r].forEach((v, c) => {
        const X = x0 + 6 + c * cellW, done = v === st.tot[c], recv = st.last && RG.s > 0 && st.last.recvIdx[r] === c;
        ctx.fillStyle = done ? C.c3l : recv ? C.c2l : '#f4f6f9'; LAB.roundRect(ctx, X + 1, y0 + 14, cellW - 2, 26, 4); ctx.fill();
        if (recv) { ctx.strokeStyle = C.c2; ctx.lineWidth = 1.5; ctx.stroke(); }
        const s = v.toLocaleString(), fs = Math.min(11, (cellW - 3) / (s.length * 0.58)); label(ctx, s, X + cellW / 2, y0 + 27, done ? C.leaf : C.ink, `600 ${fs.toFixed(1)}px ${NUMF}`);
        label(ctx, String.fromCharCode(65 + c), X + cellW / 2, y0 + 8, C.slate, `9.5px ${NUMF}`);
      });
    });
  });
  const commCv = LAB.canvas('#r-comm', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: 2, xmax: 1000, ymin: 1, ymax: 1e4, logx: true, logy: true, xtickValues: [2, 10, 100, 1000], ytickValues: [1, 10, 100, 1000, 1e4], xlabel: '显卡数 N', ylabel: '单卡收发量 / GB', pad: { l: 48, r: 10, t: 10, b: 36 } }).axes();
    P.fn((N) => 2 * (N - 1) * 2, C.c4, 2.4); P.fn((N) => 2 * ((2 * (N - 1)) / N) * 2, C.c3, 2.4);
    P.points([100, 100], [396, 7.92], C.ink, 4.5, '#fff'); P.text(100, 396, ' 396 GB', C.c4, 'left', 'bottom', `600 11.5px ${NUMF}`); P.text(100, 7.92, ' 7.92 GB', C.c3, 'left', 'bottom', `600 11.5px ${NUMF}`);
    P.vline(RG.N, C.slate, [2, 3], 1);
  });
  const rs1 = LAB.stat('#r-stats', '已进行轮数', '');
  const rs2 = LAB.stat('#r-stats', '每张卡已发出', 'amber');
  const rs3 = LAB.stat('#r-stats', '全程每卡发出 $2\\frac{N-1}{N}$ 份', 'teal');
  const rs4 = LAB.stat('#r-stats', '卡 0 手里的向量', 'leaf');
  function updRing() {
    const N = RG.N, s = RG.s, st = ringState(N, s);
    $('#r-phase').textContent = s === 0 ? '第 0 轮：各自算好自己的斜率' : s <= N - 1 ? `第 ${s} 轮：Reduce-Scatter（收到的纸条加到自己的同一段上）` : s < 2 * (N - 1) ? `第 ${s} 轮：All-Gather（收到加齐的那段直接抄下）` : `第 ${s} 轮：完成！每张卡都拿到了全部 ${N} 段的总和`;
    rs1.set(`${s}<small> / ${2 * (N - 1)}</small>`); rs2.set(`${s}/${N}<small> 份斜率</small>`); rs3.set(`${2 * (N - 1)}/${N}<small> = ${((2 * (N - 1)) / N).toFixed(2)} 份</small>`);
    rs4.set(`<span style="font-size:15px">[${st.cards[0].map((v) => v.toLocaleString()).join(', ')}]</span>`);
    ringCv.redraw(); commCv.redraw();
  }
  updRing();

  /* ================= 实验 3：DiLoCo 自习对答案 ================= */
  const DL = { H: 100, K: 4, beta: 0.9, eta: 0.7, lr: 0.005, seed: 1 };
  const DIM = 20, TT = 3000, NOISE = 0.3, HET = 0.3, SCALE = 4;
  let DR = null;
  function adamState() { return { m: new Float64Array(DIM), v: new Float64Array(DIM), t: 0 }; }
  function adamStep(w, g, st, lr) { st.t++; const c1 = 1 - 0.9 ** st.t, c2 = 1 - 0.999 ** st.t; for (let i = 0; i < DIM; i++) { st.m[i] = 0.9 * st.m[i] + 0.1 * g[i]; st.v[i] = 0.999 * st.v[i] + 0.001 * g[i] * g[i]; w[i] -= (lr * (st.m[i] / c1)) / (Math.sqrt(st.v[i] / c2) + 1e-8); } }
  function runDL() {
    const R = LAB.rng(40 + DL.seed), a = M.range(DIM).map((i) => Math.pow(100, -i / (DIM - 1))), ws = M.range(DIM).map(() => SCALE * R.normal());
    const wk = M.range(DL.K).map(() => ws.map((x) => x + HET * R.normal())), wbar = ws.map((_, i) => M.mean(wk.map((w) => w[i])));
    const gl = (w) => { let l = 0; for (let i = 0; i < DIM; i++) l += 0.5 * a[i] * (w[i] - wbar[i]) ** 2; return l; };
    const out = {};
    { // 每步都通信
      const Rn = LAB.rng(900 + DL.seed), w = new Float64Array(DIM), st = adamState(), L = [gl(w)], comm = [[0, gl(w)]];
      for (let t = 1; t <= TT; t++) { const g = new Float64Array(DIM); for (let k = 0; k < DL.K; k++) for (let i = 0; i < DIM; i++) g[i] += (a[i] * (w[i] - wk[k][i]) + NOISE * Rn.normal()) / DL.K; adamStep(w, g, st, DL.lr); L.push(gl(w)); comm.push([t, L[t]]); }
      out.sync = { L, comm, n: TT };
    }
    const local = (beta, eta) => {
      const Rn = LAB.rng(900 + DL.seed), w = new Float64Array(DIM), mo = new Float64Array(DIM), sts = M.range(DL.K).map(adamState), L = [gl(w)], comm = [[0, gl(w)]];
      const H = DL.H, rounds = Math.floor(TT / H); let t = 0;
      for (let r = 0; r < rounds; r++) {
        const D = new Float64Array(DIM);
        for (let k = 0; k < DL.K; k++) { const x = Float64Array.from(w); for (let h = 0; h < H; h++) { const g = new Float64Array(DIM); for (let i = 0; i < DIM; i++) g[i] = a[i] * (x[i] - wk[k][i]) + NOISE * Rn.normal(); adamStep(x, g, sts[k], DL.lr); } for (let i = 0; i < DIM; i++) D[i] += (w[i] - x[i]) / DL.K; }
        for (let h = 0; h < H; h++) L.push(L[L.length - 1]);
        for (let i = 0; i < DIM; i++) { mo[i] = beta * mo[i] + D[i]; w[i] -= eta * (beta * mo[i] + D[i]); }
        t += H; L[t] = gl(w); comm.push([r + 1, L[t]]);
      }
      while (L.length <= TT) L.push(L[L.length - 1]);
      return { L, comm, n: rounds };
    };
    out.avg = local(0, 1); out.dl = local(DL.beta, DL.eta);
    DR = out;
  }
  LAB.slider('#d-H', { label: '每次碰头前自习的步数 $H$', min: 0, max: Math.log10(500), step: 0.01, value: 2, fmt: () => String(DL.H), onInput: (v) => { DL.H = Math.max(1, Math.round(Math.pow(10, v))); updDL(); } });
  LAB.slider('#d-K', { label: '机房数 $K$', min: 2, max: 8, step: 1, value: 4, onInput: (v) => { DL.K = v; updDL(); } });
  LAB.slider('#d-beta', { label: '外层动量 $\\beta_{\\text{outer}}$', min: 0, max: 0.95, step: 0.05, value: 0.9, fmt: (v) => v.toFixed(2), onInput: (v) => { DL.beta = v; updDL(); } });
  LAB.slider('#d-eta', { label: '外层学习率 $\\eta_{\\text{outer}}$', min: 0.1, max: 1.5, step: 0.05, value: 0.7, fmt: (v) => v.toFixed(2), onInput: (v) => { DL.eta = v; updDL(); } });
  LAB.slider('#d-lr', { label: '内层 Adam 学习率', min: -3, max: -1.5, step: 0.05, value: Math.log10(0.005), fmt: (v) => fnum(Math.pow(10, v), 2), onInput: (v) => { DL.lr = Math.pow(10, v); updDL(); } });
  $('#d-seed').onclick = () => { DL.seed++; updDL(); };
  const KEYS = [['sync', '#9aa5b1', 1.8], ['avg', C.c2, 2.2], ['dl', C.c3, 2.6]];
  const stepsCv = LAB.canvas('#d-steps', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: 0, xmax: TT, ymin: 1e-3, ymax: 1e3, logy: true, ytickValues: [1e-3, 0.01, 0.1, 1, 10, 100, 1e3], xlabel: '内层步数', ylabel: '全局损失', pad: { l: 48, r: 10, t: 10, b: 36 } }).axes();
    P.clip(); KEYS.forEach(([k, col, lw]) => { const L = DR[k].L; P.line(L.map((_, i) => i), L.map((v) => Math.max(v, 1e-3)), col, lw); }); P.unclip();
  });
  const commsCv = LAB.canvas('#d-comms', (ctx, w, h) => {
    const P = new LAB.Plot(ctx, w, h, { xmin: 1, xmax: TT, ymin: 1e-3, ymax: 1e3, logx: true, logy: true, xtickValues: [1, 10, 100, 1000], ytickValues: [1e-3, 0.01, 0.1, 1, 10, 100, 1e3], xlabel: '通信次数（对数刻度）', ylabel: '全局损失', pad: { l: 48, r: 10, t: 10, b: 36 } }).axes();
    P.clip(); KEYS.forEach(([k, col, lw]) => { const c = DR[k].comm.filter((p) => p[0] >= 1); P.line(c.map((p) => p[0]), c.map((p) => Math.max(p[1], 1e-3)), col, lw); if (c.length < 60) P.points(c.map((p) => p[0]), c.map((p) => Math.max(p[1], 1e-3)), col, 2.6); }); P.unclip();
  });
  const ds = [LAB.stat('#d-stats', '每步都通信：通信 · 最终损失', ''), LAB.stat('#d-stats', '简单平均：通信 · 最终损失', 'amber'), LAB.stat('#d-stats', 'DiLoCo：通信 · 最终损失', 'leaf'), LAB.stat('#d-stats', '通信省下', 'teal')];
  function updDL() {
    runDL();
    KEYS.forEach(([k], i) => { const r = DR[k]; ds[i].set(`${r.n.toLocaleString()}<small> 次 · ${fnum(r.L[TT], 3)}</small>`); });
    ds[3].set(`${fnum(100 * (1 - DR.dl.n / TT), 3)}<small>%（${DL.H} 倍）</small>`);
    stepsCv.redraw(); commsCv.redraw();
  }
  updDL();
  // 书中手算
  const HC = { w1: 7, w2: 5, beta: 0.5, eta: 1 };
  LAB.slider('#h-w1', { label: '机房 1 走到 $w_1$', min: 0, max: 10, step: 0.5, value: 7, onInput: (v) => { HC.w1 = v; updHC(); } });
  LAB.slider('#h-w2', { label: '机房 2 走到 $w_2$', min: 0, max: 10, step: 0.5, value: 5, onInput: (v) => { HC.w2 = v; updHC(); } });
  LAB.slider('#h-beta', { label: '外层动量 $\\beta$', min: 0, max: 0.95, step: 0.05, value: 0.5, fmt: (v) => v.toFixed(2), onInput: (v) => { HC.beta = v; updHC(); } });
  LAB.slider('#h-eta', { label: '外层学习率 $\\eta_{\\text{outer}}$', min: 0.1, max: 2, step: 0.1, value: 1, fmt: (v) => v.toFixed(1), onInput: (v) => { HC.eta = v; updHC(); } });
  let HCR = null;
  const hcCv = LAB.canvas('#h-line', (ctx, w, h) => {
    const { w1, w2, avg, wn } = HCR, lo = Math.min(-1, wn - 0.5), X = (v) => 20 + ((v - lo) / (10.8 - lo)) * (w - 40), y = h / 2 + 10;
    ctx.strokeStyle = '#9aa5b1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(lo), y); ctx.lineTo(X(10.8), y); ctx.stroke();
    for (let v = Math.ceil(lo); v <= 10; v++) { ctx.beginPath(); ctx.moveTo(X(v), y - 4); ctx.lineTo(X(v), y + 4); ctx.stroke(); label(ctx, String(v), X(v), y + 16, C.slate, `11px ${NUMF}`); }
    label(ctx, '← 谷底方向', X(lo) + 4, y - 58, C.slate, `11.5px ${FONT}`, 'left');
    const mark = (v, txt, col, dy) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(v), y, 6, 0, 7); ctx.fill(); label(ctx, txt, X(v), y + dy, col, `600 11.5px ${FONT}`); };
    LAB.arrow(ctx, X(10), y - 30, X(wn), y - 30, C.c3, 2.4, 9);
    mark(10, '起点 10', C.navy, -16); mark(w1, `机房1 ${w1}`, C.c1, 34); mark(w2, `机房2 ${w2}`, C.c5, 50); mark(avg, `平均 ${+avg.toFixed(2)}`, C.c2, -16); mark(wn, `DiLoCo ${+wn.toFixed(2)}`, C.c3, -44);
  });
  function updHC() {
    const d = (10 - HC.w1 + (10 - HC.w2)) / 2, m = d, wn = 10 - HC.eta * (HC.beta * m + d), avg = (HC.w1 + HC.w2) / 2;
    HCR = { w1: HC.w1, w2: HC.w2, avg, wn };
    $('#h-calc').innerHTML = LAB.tex(`\\Delta=\\frac{(10-${HC.w1})+(10-${HC.w2})}{2}=${+d.toFixed(3)},\\quad m=${HC.beta}\\times0+${+d.toFixed(3)}=${+m.toFixed(3)},\\quad w^{(1)}=10-${HC.eta}\\times(${HC.beta}\\times${+m.toFixed(3)}+${+d.toFixed(3)})=\\mathbf{${+wn.toFixed(3)}}\\quad(\\text{简单平均：}${+avg.toFixed(3)})`, true);
    hcCv.redraw();
  }
  updHC();
})();
