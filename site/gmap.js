(() => { const G_ = window.__GM; if (!G_ || window.__gmapLoaded) return; window.__gmapLoaded = true; const {CREEK, EDGE, CH, readCard, esc, GHAND} = G_;
/* ---- "His map": the sheet Gage draws on. Everything on it is something his log says he put there, in the order he put it there, set down where it really is in the forest (he paces his distances, so the sheet is to scale) and drawn the way he draws: pencil, squared-off print, his people's north mark (a crescent and a dot), an infinity sign for east, and nothing at all for west. A mark pencils itself in at the moment he makes it, so the sheet can be watched filling in; marks from before this view existed are dated from his log. New marks arrive in gage/map. ---- */
const GMAP_SEED = [
  {id:'s-creek', at:'2026-11-11T03:10:00Z', kind:'creek', z1:-20, z2:23.5, label:'creek', note:'the creek'},
  {id:'s-stones', at:'2026-11-11T03:12:00Z', kind:'stones', label:'stones', lo:[10, 22], note:'the stepping stones'},
  {id:'s-camp', at:'2026-11-11T03:14:00Z', kind:'camp', x:23.5, z:4.5, label:'camp', lo:[16, 6], note:'his camp'},
  {id:'s-stalks', at:'2026-11-11T03:16:00Z', kind:'stalks', x:18.2, z:4.6, label:'stalks', lo:[-12, -16], note:'the stand of dead stalks'},
  {id:'s-oak', at:'2026-11-11T03:18:00Z', kind:'tree', x:19.2, z:9, label:'oak', lo:[12, -4], note:'the oak on his bank'},
  {id:'s-stump', at:'2026-11-11T03:21:00Z', kind:'stump', x:2, z:13.5, label:'stump', lo:[-14, -14], note:'the stump with the basket'},
  {id:'s-61', at:'2026-11-11T03:23:00Z', kind:'line', x:13.9, z:1, x2:2.5, z2:13, label:'61 paces', note:'sixty-one paces from the stones to the stump'},
  {id:'s-smoke', at:'2026-11-11T03:26:00Z', kind:'x', x:3.6, z:2.2, label:'smoke', lo:[-56, -14], note:'an x where the smoke rises'},
  {id:'s-north', at:'2026-11-11T04:40:00Z', kind:'arrow', note:'a north arrow off the needle, with no mark for west'},
  {id:'s-flag', at:'2026-11-11T14:20:00Z', kind:'post', x:23.25, z:3.9, label:'flag', lo:[12, 22], note:'the flag post, his back-sight'},
  {id:'s-fire', at:'2026-11-11T14:40:00Z', kind:'ring', x:3.6, z:2.2, r:1.1, label:"someone's fire", lo:[-20, 40], note:"someone's fire, not his"},
  {id:'s-mark1', at:'2026-11-11T15:05:00Z', kind:'tree', x:4.4, z:5.2, label:'mark 1, scar', lo:[-20, -18], note:'mark one, the scarred trunk'},
  {id:'s-bench', at:'2026-11-11T15:35:00Z', kind:'bench', x:-5.2, z:1.2, label:"flat stump: mark 2, someone's bench", lo:[-150, 24], note:"the flat stump: mark two, someone's bench"},
  {id:'s-edge', at:'2026-11-11T16:20:00Z', kind:'edge', z1:-21, z2:24, label:'water, no far side seen', note:'the edge, down the whole west side'},
  {id:'s-drop', at:'2026-11-11T16:40:00Z', kind:'label', x:-44.6, z:-12.5, label:'2½ counts: 100 ft down', note:'the drop, timed with three pebbles'},
  {id:'s-towers', at:'2026-11-11T16:50:00Z', kind:'towers', pts:[[-50.6, -13], [-52, -5.5], [-50.4, 4.5], [-52.4, 11], [-50.8, 18]], label:'lift only with wind off the water, not along', note:'five rock towers'},
  {id:'s-13mi', at:'2026-11-11T17:10:00Z', kind:'label', x:-44.6, z:-15.2, label:'nothing inside 13 miles', note:'how far he can see from the lip'},
  {id:'s-83', at:'2026-11-11T17:36:00Z', kind:'line', x:-44.9, z:1.6, x2:-5.9, z2:1.3, label:'83 paces', note:'eighty-three paces from the lip to the flat stump'},
  {id:'s-41', at:'2026-11-11T17:40:00Z', kind:'line', x:4.9, z:5.2, x2:22.9, z2:4, label:'41 paces', lo:[-36, 19], note:'forty-one paces, scarred trunk to flag'},
  {id:'s-sun1', at:'2026-11-11T23:28:00Z', kind:'sun', z:-1.5, deg:10, label:'Nov 11', note:'the first sunset line, a hand left of west'},
  {id:'s-sun2', at:'2026-11-12T23:27:00Z', kind:'sun', z:-1.5, deg:14, label:'Nov 12', note:'a second sunset line beside the first'},
  {id:'s-fire2', at:'2026-11-13T18:00:00Z', kind:'fire', x:3.6, z:2.2, r:1.9, label:'fire, kept all day', lo:[-40, 58], note:"the stone ring as a dotted circle: 'fire, kept all day'"},
  {id:'s-shed', at:'2026-11-16T03:30:00Z', kind:'rect', x:23.5, z:-14.5, w:1.3, d:0.9, mag:9, posts:true, label:'shed: 3 by 2 paces', note:'the shed, three paces by two'},
  {id:'s-boulder', at:'2026-11-18T23:10:00Z', kind:'boulder', x:-12, z:-8.5, label:'boulder', lo:[12, 18], note:'the boulder, paced from the stones'},
  {id:'s-sills', at:'2026-11-19T20:20:00Z', kind:'rect', x:23.5, z:-14.5, w:1.3, d:0.9, mag:9, dots:true, label:'', note:'the sills, with a dot at each corner'},
  {id:'s-gravel', at:'2026-11-19T21:20:00Z', kind:'rect', x:23.5, z:-14.5, w:1.3, d:0.9, mag:9, rings:true, label:'stone + gravel under each', lo:[-78, 74], note:'a gravel ring round each corner dot'},
];
const GMAP = {W:1200, H:720, m:42, x0:-57, x1:31, z0:-22, z1:25.5, paper:null, replay:null, key:'', cache:new Map()};
GMAP.k = (GMAP.W - 2*GMAP.m)/(GMAP.x1 - GMAP.x0);
const gmX = x => GMAP.m + (x - GMAP.x0)*GMAP.k, gmY = z => GMAP.H - 48 - (z - GMAP.z0)*GMAP.k;
function gmapItems(){ const by = new Map(); for (const it of GMAP_SEED) by.set(it.id, it);
  for (const it of ((typeof CH !== 'undefined' && CH.gage && CH.gage.MAP) || [])) if (it && it.id && it.at && isFinite(Date.parse(it.at))) by.set(String(it.id), it);
  return [...by.values()].filter(it => !it.gone && isFinite(Date.parse(it.at))).sort((a, b) => Date.parse(a.at) - Date.parse(b.at)); }
/* what one mark is made of: pencil strokes (each a run of points, in the order his hand makes them) and the words beside it */
function gmapShape(it){ const key = it.id + '|' + JSON.stringify(it); if (GMAP.cache.has(key)) return GMAP.cache.get(key);
  let h = 2166136261; for (const c of String(it.id)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); let sd = h >>> 0;
  const rnd = () => { sd = (sd + 0x6D2B79F5) | 0; let t = Math.imul(sd ^ (sd >>> 15), 1 | sd); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0)/4294967296; };
  const S = [], T = [], num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const line = (pts, wob = 0.8) => { const o = []; for (let i = 0; i < pts.length - 1; i++){ const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay)/7)); for (let j = (i ? 1 : 0); j <= n; j++) o.push([ax + (bx - ax)*j/n + (rnd() - 0.5)*wob, ay + (by - ay)*j/n + (rnd() - 0.5)*wob]); } if (o.length > 1) S.push(o); };
  const circ = (cx, cy, r, a0 = 0, a1 = Math.PI*2 + 0.25) => { const n = Math.max(8, Math.round(Math.abs(a1 - a0)*r/4)), p = []; for (let i = 0; i <= n; i++){ const a = a0 + (a1 - a0)*i/n; p.push([cx + Math.cos(a)*r, cy + Math.sin(a)*r]); } line(p, 0.5); };
  const dash = (ax, ay, bx, by, on = 9, off = 6) => { const L = Math.hypot(bx - ax, by - ay), ux = (bx - ax)/L, uy = (by - ay)/L; for (let s = 0; s < L; s += on + off){ const e = Math.min(L, s + on); line([[ax + ux*s, ay + uy*s], [ax + ux*e, ay + uy*e]], 0.6); } };
  const X = gmX(num(it.x, 0)), Y = gmY(num(it.z, 0)), lo = Array.isArray(it.lo) ? it.lo : null, word = (x, y, s, o = {}) => { if (s) T.push({x, y, s:String(s).slice(0, 60), ...o}); };
  switch (it.kind){
    case 'creek': { const z1 = num(it.z1, -20), z2 = num(it.z2, 23); for (const sgn of [-1, 1]){ const p = []; for (let z = z2; z >= z1; z -= 1) p.push([gmX(CREEK.cx(z) + sgn*CREEK.hw(z)), gmY(z)]); line(p, 1.1); }
      for (const z of [18, 9.5, -8, -15]){ const x = gmX(CREEK.cx(z)), y = gmY(z); line([[x - 5, y], [x - 2, y - 2.5], [x + 1, y], [x + 4, y - 2.5]], 0.3); }
      word(gmX(CREEK.cx(16)) + 20, gmY(16) + 4, it.label, {rot:-1.25}); break; }
    case 'stones': { const z0 = 0.9, c = CREEK.cx(z0), w = CREEK.hw(z0); for (let i = 0; i <= 5; i++){ const kq = -w - 0.15 + (2*w + 0.3)*i/5; circ(gmX(c + 0.95*kq), gmY(z0 + 0.31*kq), 2.3); } word(gmX(c) + (lo ? lo[0] : 10), gmY(z0) + (lo ? lo[1] : 20), it.label); break; }
    case 'camp': line([[X - 12, Y + 7], [X, Y - 9], [X + 12, Y + 7]]); line([[X - 14, Y + 7], [X + 14, Y + 7]]); line([[X, Y - 9], [X, Y + 7]], 0.4); word(X + (lo ? lo[0] : 16), Y + (lo ? lo[1] : 4), it.label); break;
    case 'stalks': for (let i = 0; i < 6; i++){ const x = X - 9 + i*3.6 + (rnd() - 0.5)*1.5; line([[x, Y + 5], [x + (rnd() - 0.5)*2, Y - 6 - rnd()*5]], 0.3); } word(X + (lo ? lo[0] : 10), Y + (lo ? lo[1] : -10), it.label); break;
    case 'tree': circ(X, Y, 6); circ(X, Y, 2.2); word(X + (lo ? lo[0] : 10), Y + (lo ? lo[1] : -6), it.label); break;
    case 'stump': circ(X, Y, 5.5); line([[X - 3.5, Y - 2], [X + 3.5, Y - 2]], 0.3); line([[X - 3.5, Y + 1.5], [X + 3.5, Y + 1.5]], 0.3); word(X + (lo ? lo[0] : 10), Y + (lo ? lo[1] : -8), it.label); break;
    case 'bench': line([[X - 6, Y - 5], [X + 6, Y - 5], [X + 6, Y + 5], [X - 6, Y + 5], [X - 6, Y - 5]], 0.5); for (const dx of [-3, 0, 3]) line([[X + dx, Y - 5], [X + dx, Y - 10]], 0.3); word(X + (lo ? lo[0] : 10), Y + (lo ? lo[1] : 18), it.label); break;
    case 'boulder': line([[X - 8, Y + 4], [X - 6, Y - 4], [X + 1, Y - 7], [X + 8, Y - 2], [X + 7, Y + 5], [X - 8, Y + 4]], 1.0); line([[X - 3, Y - 1], [X + 2, Y - 3]], 0.3); word(X + (lo ? lo[0] : 12), Y + (lo ? lo[1] : 16), it.label); break;
    case 'post': line([[X, Y + 6], [X, Y - 12]], 0.4); line([[X, Y - 12], [X + 8, Y - 9], [X, Y - 6]], 0.4); word(X + (lo ? lo[0] : 10), Y + (lo ? lo[1] : 18), it.label); break;
    case 'x': line([[X - 6, Y - 6], [X + 6, Y + 6]], 0.5); line([[X + 6, Y - 6], [X - 6, Y + 6]], 0.5); word(X + (lo ? lo[0] : 10), Y + (lo ? lo[1] : -8), it.label); break;
    case 'ring': circ(X, Y, Math.max(3, num(it.r, 1)*GMAP.k)); word(X + (lo ? lo[0] : 12), Y + (lo ? lo[1] : -10), it.label); break;
    case 'fire': { const r = Math.max(5, num(it.r, 1.8)*GMAP.k), n = Math.max(8, Math.round(r*0.9)); for (let i = 0; i < n; i++){ const a = i/n*Math.PI*2; circ(X, Y, r, a, a + Math.PI*2/n*0.5); } word(X + (lo ? lo[0] : 12), Y + (lo ? lo[1] : r + 16), it.label); break; }
    case 'line': { const X2 = gmX(num(it.x2, it.x)), Y2 = gmY(num(it.z2, it.z)); dash(X, Y, X2, Y2); const a = Math.atan2(Y2 - Y, X2 - X), fl = Math.abs(a) > Math.PI/2; word((X + X2)/2 + (lo ? lo[0] : 0) + Math.sin(a)*(fl ? -9 : 9), (Y + Y2)/2 + (lo ? lo[1] : 0) - Math.cos(a)*(fl ? -9 : 9), it.label, {rot:fl ? a + Math.PI : a, mid:true}); break; }
    case 'path': { const p = (Array.isArray(it.pts) ? it.pts : []).filter(q => Array.isArray(q) && q.length > 1).slice(0, 40).map(q => [gmX(+q[0]), gmY(+q[1])]); for (let i = 0; i < p.length - 1; i++) dash(p[i][0], p[i][1], p[i + 1][0], p[i + 1][1], 6, 5); if (p.length) word(p[p.length - 1][0] + (lo ? lo[0] : 10), p[p.length - 1][1] + (lo ? lo[1] : -8), it.label); break; }
    case 'edge': { const z1 = num(it.z1, -21), z2 = num(it.z2, 24), p = []; for (let z = z2; z >= z1; z -= 1) p.push([gmX(EDGE(z)), gmY(z)]); line(p, 1.3);
      for (let z = z2 - 1; z > z1; z -= 2.2){ const x = gmX(EDGE(z)), y = gmY(z); line([[x - 2, y], [x - 9 - rnd()*4, y + 2 + rnd()*2]], 0.4); }
      word(gmX(-42.6), gmY(11.5), it.label, {rot:-Math.PI/2, mid:true}); break; }
    case 'towers': { const P = (Array.isArray(it.pts) ? it.pts : []).filter(q => Array.isArray(q) && q.length > 1).slice(0, 12); for (const q of P){ const x = gmX(+q[0]), y = gmY(+q[1]); line([[x - 5, y + 5], [x - 3, y - 6], [x + 3, y - 7], [x + 5, y + 5], [x - 5, y + 5]], 0.9); line([[x - 2, y - 1], [x + 2, y - 2]], 0.3); }
      word(gmX(GMAP.x0) + 4, gmY(GMAP.z1) + 8, it.label, {size:14}); break; }
    case 'arrow': { const ax = gmX(27.2), ay = gmY(21.5); line([[ax, ay + 34], [ax, ay - 30]], 0.5); line([[ax - 6, ay - 20], [ax, ay - 30], [ax + 6, ay - 20]], 0.4);
      circ(ax, ay - 44, 7, Math.PI*0.25, Math.PI*1.75); circ(ax + 1.5, ay - 44, 1.6);                           // north: a crescent and a dot
      line([[ax, ay + 2], [ax + 20, ay + 2]], 0.4); { const p = []; for (let i = 0; i <= 24; i++){ const a = i/24*Math.PI*2; p.push([ax + 32 + Math.sin(a)*8, ay + 2 + Math.sin(a*2)*3.6]); } line(p, 0.3); }   // east: an infinity sign; west: nothing
      break; }
    case 'sun': { const z = num(it.z, 0), x0 = gmX(EDGE(z)) - 4, y0 = gmY(z), a = Math.PI + num(it.deg, 10)*Math.PI/180*-1, L = 88, x1 = x0 + Math.cos(a)*L, y1 = y0 - Math.sin(a)*L;
      line([[x0, y0], [x1, y1]], 0.5); circ(x1 - 5, y1 + 2, 5, Math.PI*0.5, Math.PI*1.5); word((x0 + x1)/2 - 14, (y0 + y1)/2 + (num(it.deg, 10) > 12 ? 15 : -11), it.label, {size:13}); break; }
    case 'rect': { const mg = num(it.mag, 1), w = num(it.w, 1)*GMAP.k*mg/2, d = num(it.d, 1)*GMAP.k*mg/2, C = [[X - w, Y - d], [X + w, Y - d], [X + w, Y + d], [X - w, Y + d]];
      if (it.dots) for (const q of C) circ(q[0], q[1], 2.2); else if (it.rings) for (const q of C) circ(q[0], q[1], 8); else { line([...C, C[0]], 0.7); if (it.posts) line([[C[0][0] + 5, C[0][1] + 5], [C[1][0] - 5, C[1][1] + 5], [C[2][0] - 5, C[2][1] - 5], [C[3][0] + 5, C[3][1] - 5], [C[0][0] + 5, C[0][1] + 5]], 0.5); }
      word(X + (lo ? lo[0] : -w), Y + (lo ? lo[1] : -d - 12), it.label); break; }
    case 'label': word(X, Y, it.label); break;
    default: circ(X, Y, 3); word(X + (lo ? lo[0] : 10), Y + (lo ? lo[1] : -8), it.label);
  }
  let len = 0; for (const s of S) for (let i = 1; i < s.length; i++) len += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
  const out = {S, T, len:Math.max(1, len), wlen:T.reduce((a, t) => a + t.s.length*7, 0)}; GMAP.cache.set(key, out); return out; }
function gmapPaper(){ if (GMAP.paper) return GMAP.paper; const c = document.createElement('canvas'), W = GMAP.W, H = GMAP.H; c.width = W*2; c.height = H*2; const g = c.getContext('2d'); g.scale(2, 2);
  g.fillStyle = '#e9e1cb'; g.fillRect(0, 0, W, H); let sd = 99; const r = () => (sd = (sd*16807) % 2147483647)/2147483647;
  for (let i = 0; i < 2600; i++){ const x = r()*W, y = r()*H, a = r()*6.3, l = 3 + r()*9; g.strokeStyle = `rgba(${r() < 0.5 ? '120,100,70' : '255,250,236'},${0.05 + r()*0.07})`; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a)*l, y + Math.sin(a)*l); g.stroke(); }
  for (const fx of [W/3, 2*W/3]){ const gr = g.createLinearGradient(fx - 14, 0, fx + 14, 0); gr.addColorStop(0, 'rgba(90,70,40,0)'); gr.addColorStop(0.5, 'rgba(90,70,40,0.10)'); gr.addColorStop(1, 'rgba(90,70,40,0)'); g.fillStyle = gr; g.fillRect(fx - 14, 0, 28, H); }   // rolled, then folded in three
  const v = g.createRadialGradient(W/2, H/2, H*0.35, W/2, H/2, W*0.62); v.addColorStop(0, 'rgba(80,60,30,0)'); v.addColorStop(1, 'rgba(80,60,30,0.2)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  return (GMAP.paper = c); }
/* how far along each mark is at this moment: live, a mark takes about as long as it would take a hand (half a minute to a couple of minutes) starting when he made it; in the replay they follow one another quickly */
function gmapProgress(items, now){ const P = new Map(); if (GMAP.replay){ let t = 0.4; const el = (performance.now() - GMAP.replay.t0)/1000; GMAP.replay.done = true;
    for (const it of items){ const sh = gmapShape(it), d = Math.min(2.4, Math.max(0.5, (sh.len + sh.wlen)/420)); const p = Math.max(0, Math.min(1, (el - t)/d)); P.set(it.id, p); if (p < 1) GMAP.replay.done = false; t += d + 0.12; } return P; }
  for (const it of items){ const sh = gmapShape(it), d = Math.min(150, Math.max(25, (sh.len + sh.wlen)/5)); P.set(it.id, Math.max(0, Math.min(1, (now - Date.parse(it.at))/(d*1000)))); } return P; }
function gmapDraw(cv, now){ const all = gmapItems().filter(it => Date.parse(it.at) <= now || GMAP.replay), items = GMAP.replay ? all.filter(it => Date.parse(it.at) <= now) : all, P = gmapProgress(items, now);
  let busy = null, last = null, key = items.length + ':'; for (const it of items){ const p = P.get(it.id); key += Math.round(p*400) + ','; if (p > 0) last = it; if (p > 0 && p < 1) busy = it; }
  const st = {busy, last, n:items.filter(it => P.get(it.id) > 0).length}; if (key === GMAP.key && cv.width) return st; GMAP.key = key;
  const W = GMAP.W, H = GMAP.H; if (cv.width !== W*2){ cv.width = W*2; cv.height = H*2; } const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(gmapPaper(), 0, 0); g.setTransform(2, 0, 0, 2, 0, 0);
  g.lineCap = 'round'; g.lineJoin = 'round'; let tip = null;
  for (const it of items){ const p = P.get(it.id); if (p <= 0) continue; const sh = gmapShape(it), tot = sh.len + sh.wlen; let budget = p*tot;
    for (const pass of [0, 1]){ let b = budget; g.strokeStyle = pass ? 'rgba(46,44,52,0.80)' : 'rgba(46,44,52,0.22)'; g.lineWidth = pass ? 1.25 : 2.6;   // graphite: a soft wide stroke under a darker thin one
      for (const s of sh.S){ if (b <= 0) break; g.beginPath(); g.moveTo(s[0][0], s[0][1]); for (let i = 1; i < s.length; i++){ const dl = Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); if (dl > b){ const f = b/dl, x = s[i - 1][0] + (s[i][0] - s[i - 1][0])*f, y = s[i - 1][1] + (s[i][1] - s[i - 1][1])*f; g.lineTo(x, y); if (pass && p < 1) tip = [x, y]; b = 0; break; } g.lineTo(s[i][0], s[i][1]); b -= dl; } g.stroke(); } if (pass) budget = b; }
    for (const t of sh.T){ if (budget <= 0) break; const n = Math.min(t.s.length, Math.ceil(budget/7)); budget -= t.s.length*7; g.save(); g.translate(t.x, t.y); if (t.rot) g.rotate(t.rot); g.font = (t.size || 16) + 'px ' + GHAND; g.fillStyle = 'rgba(40,38,46,0.88)'; g.textBaseline = 'middle'; g.textAlign = t.mid ? 'center' : 'left';
      const sub = t.s.slice(0, n); g.fillText(sub, 0, 0); if (p < 1 && n < t.s.length){ const w = g.measureText(sub).width, x0 = t.mid ? -g.measureText(t.s).width/2 : 0; const c = Math.cos(t.rot || 0), s2 = Math.sin(t.rot || 0), lx = (t.mid ? g.measureText(sub).width/2 : w); tip = [t.x + c*lx, t.y + s2*lx]; } g.restore(); } }
  if (tip){ g.save(); g.translate(tip[0], tip[1]); g.rotate(-0.9); g.fillStyle = '#d9a441'; g.strokeStyle = 'rgba(60,40,20,0.7)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, 0); g.lineTo(9, -3.2); g.lineTo(46, -3.2); g.lineTo(46, 3.2); g.lineTo(9, 3.2); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#3a3a40'; g.beginPath(); g.moveTo(0, 0); g.lineTo(4, -1.5); g.lineTo(4, 1.5); g.closePath(); g.fill(); g.restore(); }   // his yellow pencil, where the line is being made
  return st; }
function gmapOpen(){ const card = readCard.firstElementChild; card.classList.add('big'); card.style.maxWidth = 'min(1180px, calc(100vw - 20px))';
  card.innerHTML = `<div style="font:700 35px Gaegu;margin:0 0 6px">Gage's map</div><div style="margin:2px 0 12px;opacity:.8;font-size:17px">The sheet he draws on in pencil: only what he has seen and paced, where it really lies. It fills in as he does.</div>` +
    `<div style="overflow:auto;-webkit-overflow-scrolling:touch;border-radius:8px;box-shadow:0 6px 22px rgba(0,0,0,.35)"><div style="position:relative;width:max(100%, 860px)"><canvas id="gmapCv" style="display:block;width:100%;aspect-ratio:${GMAP.W}/${GMAP.H}"></canvas>` +
    `<div id="gmapMe" style="position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;display:none"><span style="position:absolute;left:-8px;top:-8px;width:16px;height:16px;border-radius:50%;background:#d2401e;border:3px solid #fff;box-sizing:border-box;box-shadow:0 1px 5px rgba(0,0,0,.5)"></span><span id="gmapMeL" style="position:absolute;left:0;bottom:16px;transform:translateX(-50%);white-space:nowrap;background:#d2401e;color:#fff;font:700 14px/1 system-ui,sans-serif;padding:5px 9px;border-radius:999px;box-shadow:0 2px 6px rgba(0,0,0,.4)">Gage is here</span></div><div id="gmapPh" style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none"></div></div></div>` +
    `<div id="gmapLg" style="display:none;margin:9px 0 0;font-size:16px;opacity:.8"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#2f9e52;border:2px solid #fff;vertical-align:-1px;margin-right:7px"></span>Where he took a picture. Tap a dot to see it.</div>` +
    `<div id="gmapSt" style="margin:12px 2px 0;font-size:16px;min-height:1.5em"></div>` +
    `<div style="display:flex;gap:10px;margin-top:12px"><button class="btn light" id="gmapRp" style="flex:1">Watch him draw it</button><button class="btn" id="gmapX" style="flex:1">Close</button></div>`;
  const cv = card.querySelector('#gmapCv'), stEl = card.querySelector('#gmapSt'), rp = card.querySelector('#gmapRp'), me = card.querySelector('#gmapMe'); GMAP.key = ''; GMAP.replay = null;
  const meAt = () => { const g = CH.gage && CH.gage.group; if (!g || !g.position) return null; const fx = gmX(g.position.x)/GMAP.W, fy = gmY(g.position.z)/GMAP.H; return {fx:Math.max(0.015, Math.min(0.985, fx)), fy:Math.max(0.06, Math.min(0.97, fy))}; };
  const fmt = t => new Date(t).toLocaleString(undefined, {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'});
  rp.onclick = () => { GMAP.replay = GMAP.replay ? null : {t0:performance.now()}; GMAP.key = ''; rp.textContent = GMAP.replay ? 'Show it as it is now' : 'Watch him draw it'; };
  card.querySelector('#gmapX').onclick = () => { readCard.style.display = 'none'; };
  card.scrollTop = 0; readCard.style.display = 'flex';
  { const sc = cv.parentElement.parentElement, its = gmapItems().filter(it => Date.parse(it.at) <= Date.now()), lt = its[its.length - 1], at = meAt(), fx = at ? at.fx : lt && typeof lt.x === 'number' ? (gmX(lt.x)/GMAP.W) : 0.8; requestAnimationFrame(() => { sc.scrollLeft = Math.max(0, fx*sc.scrollWidth - sc.clientWidth/2); }); }   // on a narrow screen the sheet is wider than the card: open it on where he is (or his latest mark)
  const tick = () => { if (!cv.isConnected || readCard.style.display === 'none'){ card.style.maxWidth = ''; GMAP.replay = null; return; }
    const now = (typeof G_.RP_T === 'number' ? G_.RP_T : null) ?? Date.now(), st = gmapDraw(cv, now);
    if (GMAP.replay && GMAP.replay.done && performance.now() - GMAP.replay.t0 > 1500 && !st.busy){ GMAP.replay = null; GMAP.key = ''; rp.textContent = 'Watch him draw it again'; }
    const it = st.busy || st.last, txt = !it ? 'Nothing on the sheet yet.' : st.busy && !GMAP.replay ? `<b>He is drawing this now:</b> ${esc(it.note || it.label || '')}` : `${GMAP.replay ? '' : 'Last mark: '}${esc(it.note || it.label || '')} <span style="opacity:.65">· ${esc(fmt(Date.parse(it.at)))} · ${st.n} mark${st.n === 1 ? '' : 's'}</span>`;
    if (stEl.dataset.t !== txt){ stEl.dataset.t = txt; stEl.innerHTML = txt; }
    { const ph = card.querySelector('#gmapPh'), lg = card.querySelector('#gmapLg'), L = (!GMAP.replay && G_.photosOf && G_.PLACES) ? G_.photosOf('gage').filter(q => q.place && G_.PLACES[q.place]) : [], key = L.map(q => q.id).join('|');   // one dot per picture, at the place he took it; pictures taken at the same place fan out round it
      if (ph && ph.dataset.k !== key){ ph.dataset.k = key; ph.innerHTML = ''; const seen = {};
        for (const q of L.slice().reverse()){ const P = G_.PLACES[q.place], n = seen[q.place] = (seen[q.place] || 0) + 1, a = (n - 1)*2.4, r = n > 1 ? 15 + (n - 2)*2.5 : 0, d = document.createElement('button');
          d.type = 'button'; d.title = q.caption || 'A picture he took'; d.setAttribute('aria-label', 'Picture: ' + (q.caption || 'taken here'));
          d.style.cssText = 'position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;padding:0;border-radius:50%;background:#2f9e52;border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.5);cursor:pointer;pointer-events:auto;left:calc(' + (Math.max(0.015, Math.min(0.985, gmX(P.x)/GMAP.W))*100).toFixed(2) + '% + ' + (Math.cos(a)*r).toFixed(1) + 'px);top:calc(' + (Math.max(0.03, Math.min(0.97, gmY(P.z)/GMAP.H))*100).toFixed(2) + '% + ' + (Math.sin(a)*r).toFixed(1) + 'px)';
          d.onclick = ev => { ev.stopPropagation(); if (G_.openPhoto) G_.openPhoto(q.id); }; ph.appendChild(d); }
        if (lg) lg.style.display = L.length ? '' : 'none'; } }
    { const at = GMAP.replay ? null : meAt(); if (me){ if (!at) me.style.display = 'none'; else { me.style.display = ''; me.style.left = (at.fx*100).toFixed(2) + '%'; me.style.top = (at.fy*100).toFixed(2) + '%'; const l = me.querySelector('#gmapMeL'), low = at.fy < 0.14; if (l && (l.dataset.low === '1') !== low){ l.dataset.low = low ? '1' : ''; l.style.bottom = low ? '' : '16px'; l.style.top = low ? '16px' : ''; } } } }
    requestAnimationFrame(tick); }; tick(); }
setTimeout(() => { const b = document.createElement('button'); b.className = 'btn light'; b.id = 'gmapBtn'; b.textContent = 'His map'; b.style.display = 'none'; const bs = document.getElementById('btns'), nb = document.getElementById('nbBtn'); if (!bs) return; bs.insertBefore(b, nb ? nb.nextSibling : null);
  b.onclick = gmapOpen; setInterval(() => { const on = G_.ACTIVE === 'gage'; if ((b.style.display !== 'none') !== on) b.style.display = on ? '' : 'none'; }, 400); }, 1300);
})();
