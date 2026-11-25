/* "His paintings": everything Token has painted with the box of colors from his maker, read from his own diary and drawn here
   as a child's watercolor on paper: the colors he names, the thing he says he painted, and bare paper wherever he left it.
   Nothing is generated or stored: each painting is drawn fresh from his words, so it always matches what he wrote. */
(function(){
  if (window.__paintOn) return; window.__paintOn = true;
  var START = '2026-11-21';   // the day he carried the paint box home
  var ORD = ['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth','sixteenth','seventeenth','eighteenth','nineteenth','twentieth'];
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function CH(){ return window.__CH && window.__CH.token; }
  function who(){ try { return window.__forest ? window.__forest.who() : 'token'; } catch (e) { return 'token'; } }
  function chiDay(t){ return new Intl.DateTimeFormat('en-CA', {timeZone:'America/Chicago', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date(t)); }
  function daysSince(){ var out = [], d = new Date(START + 'T12:00:00Z'), end = chiDay(Date.now()); while (true){ var k = d.toISOString().slice(0, 10); out.push(k); if (k >= end || out.length > 400) break; d.setUTCDate(d.getUTCDate() + 1); } return out; }

  /* ---- which diary entries are paintings */
  var PAINT = /\b(painted|repainted|laid on|lays on|laying on|brushed|washed (in|on)|dabb(ed|ing)|painting (a|the|this|his|my|it)\b)/i, LOOK = /^(held|holding|tilt|tapp|look|turn|lift|carr|propp|set |brought|untied)/i, NOTE = /^the one who drew me|^my maker/i;
  function sheetOf(t){ var m = t.match(new RegExp('\\b(' + ORD.join('|') + '|\\d+(?:st|nd|rd|th))\\s+(sheet|canvas|page)', 'i')); if (!m) return null;
    var w = m[1].toLowerCase(), n = ORD.indexOf(w) + 1 || parseInt(w, 10); return (m[2].toLowerCase() === 'canvas' ? 'c' : 's') + n; }
  function collect(){ var C = CH(), D = (C && C.DIARY) || {}, list = [], by = {};
    Object.keys(D).filter(function(d){ return d >= START; }).sort().forEach(function(d){ ((D[d] && D[d].entries) || []).forEach(function(e){
      var t = (e.text || ''); if (!e.at || !PAINT.test(t) || e.kind === 'internet' || e.kind === 'dream') return;
      if (NOTE.test(t.trim()) || e.kind === 'visitor') return;   // a note from his maker about the paints is not a painting
      if (LOOK.test(t.trim()) && !/\b(painted|dabbed|laid on)\b/i.test(t.split('.')[0])) return;   // holding a dry sheet up to the light is looking, not painting
      var key = sheetOf(t) || ('e' + e.at), p = by[key];
      if (!p){ p = by[key] = {key:key, at:e.at, title:e.title || 'A painting', words:[], canvas:/canvas/i.test(t)}; list.push(p); }
      p.words.push(t); p.last = e.at; }); });
    return list.sort(function(a, b){ return Date.parse(b.at) - Date.parse(a.at); }); }
  function loadDays(cb){ var need = daysSince().filter(function(d){ var C = CH(); return !(C && C.DIARY && C.DIARY[d]); }), n = need.length;
    if (!n || !window.__dayDoc) return cb(); var left = n, t = setTimeout(cb, 6000), fin = function(){ if (--left <= 0){ clearTimeout(t); cb(); } };
    need.forEach(function(d){ try { window.__dayDoc('token', d, fin); } catch (e) { fin(); } }); }

  /* ---- drawing: watercolor on paper from his words */
  var COL = {blue:'#3d6cad', yellow:'#e6bf3c', gold:'#d6a531', gray:'#8b9096', grey:'#8b9096', brown:'#8a5733', orange:'#df8536', red:'#bf4337', green:'#5c8c46',
    black:'#2b2723', purple:'#76579a', violet:'#76579a', pink:'#d98ba0', ochre:'#c4943a', rust:'#a4512c', olive:'#7d7d3a', white:null, cream:null};
  function rngOf(s){ var h = 2166136261; for (var i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return function(){ h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000)/100000; }; }
  function rgba(hex, a){ var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function blob(g, R, cx, cy, rx, ry, col, alpha, layers){ // a wash: several thin, ragged layers, each with a darker dried edge
    for (var L = 0; L < (layers || 5); L++){ var n = 22, pts = [], j = 0.22 + 0.1*R();
      for (var i = 0; i < n; i++){ var a = i/n*Math.PI*2, r = 1 + (R() - 0.5)*j*2; pts.push([cx + Math.cos(a)*rx*r, cy + Math.sin(a)*ry*r]); }
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (i = 1; i <= n; i++){ var p = pts[i % n], q = pts[(i - 1) % n]; g.quadraticCurveTo(q[0], q[1], (p[0] + q[0])/2, (p[1] + q[1])/2); } g.closePath();
      g.fillStyle = rgba(col, alpha); g.fill(); g.strokeStyle = rgba(col, alpha*1.6); g.lineWidth = 1.4; g.stroke(); } }
  function band(g, R, x, y, w, h, col){ for (var L = 0; L < 5; L++){ g.beginPath(); var s = 14;
      g.moveTo(x + (R() - 0.5)*6, y + (R() - 0.5)*6); for (var i = 1; i <= s; i++) g.lineTo(x + w*i/s + (R() - 0.5)*7, y + (R() - 0.5)*7);
      for (i = s; i >= 0; i--) g.lineTo(x + w*i/s + (R() - 0.5)*7, y + h + (R() - 0.5)*7); g.closePath(); g.fillStyle = rgba(col, 0.16); g.fill(); g.strokeStyle = rgba(col, 0.22); g.stroke(); } }
  function stroke(g, R, pts, col, w, a){ g.strokeStyle = rgba(col, a); g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0] + (R() - 0.5)*2, pts[i][1] + (R() - 0.5)*2); g.stroke(); }
  function subject(words){ // only the sentences where he is putting paint down (and what they describe) say what the painting shows; the rest of the entry is about his day
    var out = []; words.forEach(function(w){ var ss = w.split(/(?<=[.!?])\s+/); ss.forEach(function(x, i){ if (PAINT.test(x) || /\b(sheet|tail|paper|canvas|brush|ghost|fuzz\w*|spots?)\b/i.test(x)) out.push(x); }); if (!out.length && ss[0]) out.push(ss[0]); });
    return out.join(' '); }
  function draw(cv, p){ var t = subject(p.words).toLowerCase(), R = rngOf(p.key + t.slice(0, 40)), W = cv.width, H = cv.height, g = cv.getContext('2d');
    g.fillStyle = p.canvas ? '#efe6d2' : '#f4eedf'; g.fillRect(0, 0, W, H);
    for (var i = 0; i < 2600; i++){ g.fillStyle = 'rgba(120,100,70,' + (0.025 + 0.03*R()) + ')'; g.fillRect(R()*W, R()*H, 1 + R()*1.5, 1); }   // paper tooth
    var cols = []; Object.keys(COL).forEach(function(k){ if (COL[k] && new RegExp('\\b' + k + '\\b').test(t)) cols.push(COL[k]); });
    if (/fire|firelight|orange/.test(t) && cols.indexOf(COL.orange) < 0) cols.push(COL.orange);
    var c0 = cols[0] || COL.ochre, c1 = cols[1] || cols[0] || COL.blue, did = false;
    var bare = /bare paper|leave the white|leaving the rest|left .* bare|paper between/.test(t);
    if (/\bband|stripe|along (one|the other|its|the) edge|(yellow|blue|red|green|orange|brown|gray|grey) edge/.test(t)){ did = true; var bh = H*0.2;   // bands along the edges, with the bare paper between that he chose to leave
      band(g, R, W*0.04, H*0.05, W*0.92, bh, /yellow/.test(t) ? COL.yellow : c0);
      if (/other edge|blue/.test(t)) band(g, R, W*0.04, H*0.95 - bh, W*0.92, bh, /blue/.test(t) ? COL.blue : c1); }
    if (/ripple|pool|water|creek|wave/.test(t)){ did = true; var wc = /gray|grey/.test(t) ? COL.gray : (/orange/.test(t) && !/not orange/.test(t) ? COL.orange : c1);
      if (!bare) blob(g, R, W*0.5, H*0.55, W*0.48, H*0.36, wc, 0.05, 3);
      for (var k = 0; k < 9; k++){ var yy = H*(0.25 + k*0.065), pts = []; for (var x = W*0.08; x <= W*0.92; x += 14) pts.push([x, yy + Math.sin(x*0.03 + k)*5 + (x - W/2)*0.06]); stroke(g, R, pts, /darker|dark/.test(t) ? '#5c6168' : wc, 3 + R()*2, 0.45); } }
    if (/\bfish\b/.test(t)){ did = true; var fx = W*0.44, fy = H*0.52, fl = W*0.46, fh = H*0.24;   // the fish: brown on the back, pale beneath, spots last
      blob(g, R, fx, fy + fh*0.25, fl*0.55, fh*0.42, /gray|grey|pale/.test(t) ? '#a7aab0' : '#c9b48a', 0.12, 4);
      blob(g, R, fx, fy - fh*0.1, fl*0.55, fh*0.4, /brown/.test(t) ? COL.brown : c0, 0.14, 4);
      var ghost = /ghost|smaller now/.test(t), big = /too big/.test(t) && !ghost, tl = fl*(big ? 0.5 : 0.3);
      if (ghost){ g.save(); g.globalAlpha = 0.16; tail(g, R, fx + fl*0.5, fy, fl*0.5, fh*1.1, '#a08458'); g.restore(); }   // the pale ghost of the big tail he lifted out
      tail(g, R, fx + fl*0.5, fy, tl, fh*(big ? 1.1 : 0.8), /brown/.test(t) ? COL.brown : c0);
      g.fillStyle = '#2b2723'; g.beginPath(); g.arc(fx - fl*0.42, fy - fh*0.08, 3.4, 0, Math.PI*2); g.fill();
      if (/spot/.test(t)) for (k = 0; k < 9; k++){ g.fillStyle = 'rgba(60,40,25,0.55)'; g.beginPath(); g.arc(fx - fl*0.3 + R()*fl*0.7, fy - fh*0.3 + R()*fh*0.45, 2 + R()*2.4, 0, Math.PI*2); g.fill(); } }
    if (/\bowls?\b/.test(t)){ did = true; stroke(g, R, [[W*0.15, H*0.62], [W*0.85, H*0.58]], COL.brown, 7, 0.6);
      [0.4, 0.58].forEach(function(u){ blob(g, R, W*u, H*0.47, W*0.07, H*0.13, COL.brown, 0.16, 4); g.fillStyle = '#f4eedf'; [-1, 1].forEach(function(s){ g.beginPath(); g.arc(W*u + s*W*0.025, H*0.42, 6, 0, Math.PI*2); g.fill(); }); }); }
    if (/\b(fire|flame|coals)\b/.test(t) && !/by the fire|by firelight|in firelight|firelight lied/.test(t)){ did = true; blob(g, R, W*0.5, H*0.62, W*0.12, H*0.2, COL.orange, 0.13, 5); blob(g, R, W*0.5, H*0.66, W*0.06, H*0.1, COL.yellow, 0.2, 4); }
    if (/\b(tree|trunk|oak|leaf|leaves)\b/.test(t) && !did){ did = true; band(g, R, W*0.42, H*0.12, W*0.12, H*0.78, COL.brown); blob(g, R, W*0.48, H*0.22, W*0.28, H*0.17, COL.green, 0.1, 5); }
    if (/\b(sky|dot|planet|saturn|moon|star)\b/.test(t) && !did){ did = true; band(g, R, 0, 0, W, H*0.6, /blue|night/.test(t) ? COL.blue : c1); g.fillStyle = rgba(COL.gold, 0.9); g.beginPath(); g.arc(W*0.7, H*0.25, 6, 0, Math.PI*2); g.fill(); }
    if (!did){ blob(g, R, W*0.4, H*0.45, W*0.26, H*0.24, c0, 0.08, 6); if (cols.length > 1) blob(g, R, W*0.62, H*0.58, W*0.2, H*0.2, c1, 0.08, 6); }
    if (/fuzz|fuzzy|rough/.test(t)){ for (i = 0; i < 400; i++){ g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(W*0.62 + R()*W*0.2, H*0.38 + R()*H*0.25, 1.5, 1.5); } }
    if (p.canvas){ g.strokeStyle = 'rgba(90,70,45,0.35)'; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10); } }
  function tail(g, R, x, y, l, h, col){ for (var L = 0; L < 4; L++){ g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + l + (R() - 0.5)*6, y - h*0.5 + (R() - 0.5)*6); g.lineTo(x + l*0.82, y + (R() - 0.5)*4); g.lineTo(x + l + (R() - 0.5)*6, y + h*0.5 + (R() - 0.5)*6); g.closePath(); g.fillStyle = rgba(col, 0.14); g.fill(); } }

  /* ---- the card */
  function fmt(t){ try { return new Date(t).toLocaleString(undefined, {weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}); } catch (e) { return t; } }
  function open(){ var rc = document.getElementById('readCard'); if (!rc) return; var card = rc.firstElementChild; card.classList.add('big');
    card.innerHTML = '<div style="font:700 35px Gaegu;margin:0 0 10px">Token’s paintings</div><div style="opacity:.75">Looking through his notebook…</div>';
    card.scrollTop = 0; rc.style.display = 'flex';
    loadDays(function(){ var L = collect();
      card.innerHTML = '<div style="font:700 35px Gaegu;margin:0 0 10px">Token’s paintings</div>' +
        (L.length ? '<div style="margin:6px 0 14px;opacity:.8;font-size:17px">Painted with the box of colors his maker left at the stump. Each one is drawn here from what he wrote about it, bare paper and all.</div>' +
          L.map(function(p, i){ return '<figure style="margin:0 0 24px"><canvas class="pntC" data-i="' + i + '" width="600" height="' + (p.canvas ? 520 : 420) + '" style="width:100%;height:auto;display:block;background:#f4eedf;border-radius:2px;box-shadow:0 6px 18px rgba(0,0,0,.4)"></canvas>' +
            '<button class="btn pntD" data-i="' + i + '" style="margin-top:8px;font-size:15px;padding:6px 14px">Download full size</button>' +
            '<figcaption style="margin-top:8px"><b>' + esc(p.title) + '</b><br><span style="opacity:.65;font-size:16px">' + esc(fmt(p.at)) + '</span><br><span style="font-size:17px">' + esc(p.words.join(' ')) + '</span></figcaption></figure>'; }).join('')
          : '<div style="margin:6px 0">Token has his paints, but he hasn’t painted anything yet.</div>') +
        '<button class="btn" style="margin-top:14px;width:100%">Close</button>';
      card.querySelectorAll('canvas.pntC').forEach(function(c){ try { draw(c, L[+c.dataset.i]); } catch (e) {} });
      card.querySelectorAll('button.pntD').forEach(function(bt){ bt.onclick = function(){ save(L[+bt.dataset.i], bt); }; });
      var cl = card.querySelectorAll('button'); cl[cl.length - 1].onclick = function(){ rc.style.display = 'none'; }; }); }
  /* the same painting, drawn again six times larger (3600 pixels wide) and handed over as a PNG: the phone's share sheet where there is one (Save Image), a plain download elsewhere */
  function save(p, bt){ var K = 6, w = 600, h = p.canvas ? 520 : 420, cv = document.createElement('canvas'); cv.width = w*K; cv.height = h*K; var g = cv.getContext('2d'); g.scale(K, K);
    var old = bt.textContent; bt.textContent = 'Painting it full size…'; bt.disabled = true; var done = function(msg){ bt.textContent = msg || old; bt.disabled = false; if (msg) setTimeout(function(){ bt.textContent = old; }, 4000); };
    setTimeout(function(){ try { draw({width:w, height:h, getContext:function(){ return g; }}, p); } catch (e) { return done('Could not draw it'); }
      var name = 'token-painting-' + String(p.title || 'painting').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) + '-' + String(p.at || '').slice(0, 10) + '.png';
      cv.toBlob(function(bl){ if (!bl) return done('Could not save it');
        var plain = function(){ var u = URL.createObjectURL(bl), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(u); }, 30000); done('Saved'); };
        try { var f = new File([bl], name, {type:'image/png'}); if (matchMedia('(pointer:coarse)').matches && navigator.canShare && navigator.canShare({files:[f]})){ navigator.share({files:[f], title:p.title || 'Token’s painting'}).then(function(){ done(); }, function(e){ if (e && e.name === 'AbortError') done(); else plain(); }); return; } } catch (e) {}
        plain(); }, 'image/png'); }, 30); }
  function addBtn(){ var bs = document.getElementById('btns'); if (!bs || document.getElementById('pntBtn')) return !!bs;
    var b = document.createElement('button'); b.className = 'btn light'; b.id = 'pntBtn'; b.textContent = 'His paintings';
    var after = document.getElementById('phoBtn'); bs.insertBefore(b, after ? after.nextSibling : null); b.onclick = open; return true; }
  var tries = 0, iv = setInterval(function(){ tries++; if (addBtn() || tries > 60){ if (tries > 60) clearInterval(iv); } var b = document.getElementById('pntBtn'), ph = document.getElementById('phoBtn'); if (b && ph && ph.nextSibling !== b) ph.parentNode.insertBefore(b, ph.nextSibling);   /* keep it right under "His pictures" (that button is added late) */ if (b) b.style.display = who() === 'token' ? '' : 'none'; }, 1000);
  window.__paintDraw = draw; window.__paintCollect = collect;
})();
