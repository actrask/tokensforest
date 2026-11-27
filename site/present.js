/* Presentation mode: what a visitor sees first. A title card sets up the story, then "Watch his day" plays the narrator's
   recorded telling over the replays, with up to five realistic stills from the day's most dramatic moments, each moving
   slowly (pan or zoom, eased, alternating direction, crossfaded), the way documentaries bring still photographs to life.
   Only days with a finished recording are offered. The dev view (everything the page had before) is one tap away, and
   the choice is remembered on the device. */
(function(){
  if (window.__presentOn) return; window.__presentOn = true;
  var DEV_KEY = 'forestMode', NAMES = {token:'Token', gage:'Gage'};
  var mode = 'present'; try { if (localStorage.getItem(DEV_KEY) === 'dev') mode = 'dev'; } catch (e) {}
  if (/(^|[#&])dev\b/.test(location.hash)) mode = 'dev'; if (/(^|[#&])present\b/.test(location.hash)) mode = 'present';

  var css = document.createElement('style'); css.textContent = [
    'body.present>*:not(#gl):not(#prShade):not(#cutHold):not(#cutBlack):not(.bars):not(#pres):not(#presKB):not(#presCap):not(#presTog):not(#presStop):not(#presCam):not(#camOvC):not(#readCard):not(script):not(style){visibility:hidden!important}',
    'body.present #readCard{z-index:60}',   // his paintings and pictures open over the title card
    '#pres{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,rgba(10,12,10,.35),rgba(6,8,6,.86));color:#f4ead2;font-family:Georgia,"Iowan Old Style",serif;opacity:0;transition:opacity 1.2s}',
    'body.present #pres.show{display:flex} #pres.vis{opacity:1}',
    '#pres .in{max-width:640px;padding:28px 26px;text-align:center}',
    '#pres h1{font-weight:400;font-size:clamp(34px,6vw,58px);letter-spacing:.04em;margin:0 0 8px}',
    '#pres .ptag{font-style:italic;opacity:.8;margin:0 0 22px;font-size:clamp(15px,2.2vw,19px)}',
    '#pres p.st{font-size:clamp(15px,2.1vw,18px);line-height:1.55;opacity:.92;margin:0 auto 12px;max-width:560px}',
    '#pres .row{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin:26px 0 6px}',
    '#pres button.go{font:inherit;font-size:17px;padding:14px 22px;border-radius:999px;border:1px solid rgba(244,234,210,.55);background:rgba(244,234,210,.12);color:#f4ead2;cursor:pointer;min-width:220px}',
    '#pres button.go:hover{background:rgba(244,234,210,.24)} #pres button.go small{display:block;opacity:.7;font-size:13px;margin-top:3px}',
    '#pres button.go[disabled]{opacity:.45;cursor:default}',
    '#pres .more{margin-top:18px;font-size:14px;opacity:.75} #pres .more a{color:inherit;cursor:pointer;text-decoration:underline;margin:0 8px}',
    '#pres .list{margin-top:14px;max-height:34vh;overflow:auto;display:none} #pres .list.open{display:block}',
    '#pres .list button{display:block;width:100%;font:inherit;font-size:15px;background:none;border:0;border-bottom:1px solid rgba(244,234,210,.15);color:#f4ead2;padding:9px 4px;cursor:pointer;text-align:left}',
    '#presKB{position:fixed;inset:0;z-index:30;pointer-events:none;overflow:hidden;background:#000;opacity:0;transition:opacity 1.4s ease-in-out}',
    '#presKB.on{opacity:1} #presKB img,#presKB video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 1.4s ease-in-out;will-change:transform,opacity;transform-origin:50% 50%}',
    '#presKB img.on,#presKB video.on{opacity:1}',
    '#presCap{position:fixed;left:50%;bottom:4.2vh;transform:translateX(-50%);z-index:35;max-width:min(880px,88vw);text-align:center;color:#f7efdc;font-family:Georgia,serif;font-size:clamp(15px,2.1vw,21px);line-height:1.4;text-shadow:0 1px 3px #000,0 0 12px rgba(0,0,0,.8);opacity:0;transition:opacity .6s;pointer-events:none}',
    'body.present.playing #presCap{opacity:1}',
    '#presTog,#presStop{position:fixed;z-index:45;top:12px;font:13px/1 -apple-system,system-ui,sans-serif;padding:8px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.35);background:rgba(0,0,0,.38);color:#fff;cursor:pointer;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}',
    '#presTog{left:12px} #presStop{right:12px;display:none} body.present.playing #presStop{display:block}',
    'body:not(.present) #presTog{top:auto;bottom:16px;left:14px}',
    '#presCam{position:fixed;z-index:45;right:18px;bottom:calc(4.2vh + 6px);width:58px;height:58px;border-radius:50%;border:1px solid rgba(255,255,255,.45);background:rgba(0,0,0,.42);color:#fff;cursor:pointer;display:none;align-items:center;justify-content:center;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);box-shadow:0 2px 10px rgba(0,0,0,.35)}',
    'body.nocam #presCam{display:none!important} body.present.playing #presCam{display:flex} #presCam:active{transform:scale(.94)} #presCam.wait{opacity:.5;cursor:default}',
    '#presCap{max-width:min(880px,72vw)!important}',
    'body.present.paused #presCap::after{content:"  \u275a\u275a";opacity:.7}'
  ].join('\n'); document.head.appendChild(css);

  var pres = document.createElement('div'); pres.id = 'pres'; document.body.appendChild(pres);
  var kb = document.createElement('div'); kb.id = 'presKB'; document.body.appendChild(kb);
  var cap = document.createElement('div'); cap.id = 'presCap'; document.body.appendChild(cap);
  var tog = document.createElement('button'); tog.id = 'presTog'; document.body.appendChild(tog);
  var camB = document.createElement('button'); camB.id = 'presCam'; camB.title = 'Take a photo of this moment'; camB.setAttribute('aria-label', 'Take a photo of this moment');
  camB.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.6"/></svg>';
  document.body.appendChild(camB);
  var stopB = document.createElement('button'); stopB.id = 'presStop'; stopB.textContent = '✕  End'; document.body.appendChild(stopB);

  function F(){ return window.__forest; }
  function fmtDay(d){ try { return new Date(d + 'T12:00:00').toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'}); } catch (e) { return d; } }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  /* which days are ready: a telling whose exact words have a recording */
  var READY = {token:[], gage:[]}, probed = {};
  function probe(cb){ var f = F(); if (!f) return; var jobs = [];
    ['token', 'gage'].forEach(function(w){ var N = f.days(w) || {}; Object.keys(N).sort().reverse().slice(0, 14).forEach(function(d){ var t = N[d] && N[d].text; if (!t) return;
      var k = w + '-' + d + '-' + f.fnv(t.trim()); if (probed[k] !== undefined) return; probed[k] = null;
      jobs.push(fetch('audio/' + k + '.json', {cache:'no-store'}).then(function(r){ return r.ok ? r.json() : null; }).then(function(m){ probed[k] = m && m.t ? {who:w, day:d, key:k, m:m} : false; }).catch(function(){ probed[k] = false; })); }); });
    Promise.all(jobs).then(function(){ ['token', 'gage'].forEach(function(w){ READY[w] = Object.keys(probed).map(function(k){ return probed[k]; }).filter(function(x){ return x && x.who === w; }).sort(function(a, b){ return a.day < b.day ? 1 : -1; }); }); cb && cb(); }); }

  function title(){ var t = READY.token[0], g = READY.gage[0];
    function btn(x, w){ return x ? '<button class="go" data-w="' + w + '" data-d="' + x.day + '">Watch ' + NAMES[w] + '’s day<small>' + esc(fmtDay(x.day)) + '</small></button>' : '<button class="go" disabled>' + NAMES[w] + '’s day<small>being recorded tonight</small></button>'; }
    pres.innerHTML = '<div class="in"><h1>Token’s Forest</h1><div class="ptag">a small world that runs on its own</div>' +
      '<p class="st">Two small creatures live in this forest, and nobody is steering them. Every hour each one wakes, decides what to do, and does it: fishing the creek, building, whittling, looking things up on a slate.</p>' +
      '<p class="st">Token was here first. Gage keeps his own camp across the water. Each night a narrator tells the story of their day.</p>' +
      '<div class="row">' + btn(t, 'token') + btn(g, 'gage') + '</div>' +
      '<div class="more"><a data-a="paint">Token’s paintings</a>·<a data-a="pho-token">Token’s pictures</a>·<a data-a="pho-gage">Gage’s pictures</a></div>' +
      '<div class="more"><a data-a="earlier">Earlier days</a>·<a data-a="dev">Explore the forest (dev view)</a></div><div class="list"></div></div>';
    pres.querySelectorAll('button.go[data-w]').forEach(function(b){ b.onclick = function(){ play(b.dataset.w, b.dataset.d); }; });
    /* what they have made, straight from the title card: the same windows the menu opens in the dev view */
    var openMade = function(who, id){ var f = window.__forest; try { if (f && f.who() !== who) f.setWho(who); } catch (e) {} var n = 0, t = setInterval(function(){ var bt = document.getElementById(id); if (bt && (!f || f.who() === who)){ clearInterval(t); bt.click(); } else if (++n > 40) clearInterval(t); }, 150); };
    pres.querySelector('[data-a=paint]').onclick = function(){ openMade('token', 'pntBtn'); };
    pres.querySelector('[data-a=pho-token]').onclick = function(){ openMade('token', 'phoBtn'); };
    pres.querySelector('[data-a=pho-gage]').onclick = function(){ openMade('gage', 'phoBtn'); };
    pres.querySelector('[data-a=dev]').onclick = function(){ setMode('dev'); };
    pres.querySelector('[data-a=earlier]').onclick = function(){ var L = pres.querySelector('.list'); L.classList.toggle('open');
      L.innerHTML = ['token', 'gage'].map(function(w){ return READY[w].map(function(x){ return '<button data-w="' + w + '" data-d="' + x.day + '">' + NAMES[w] + ' · ' + esc(fmtDay(x.day)) + '</button>'; }).join(''); }).join('') || '<p class="st">No recorded days yet.</p>';
      L.querySelectorAll('button').forEach(function(b){ b.onclick = function(){ play(b.dataset.w, b.dataset.d); }; }); }; }
  function endCard(who, day){ var other = who === 'token' ? 'gage' : 'token', o = READY[other][0];
    pres.innerHTML = '<div class="in"><div class="ptag">That was ' + NAMES[who] + '’s ' + esc(fmtDay(day).split(',')[0]) + '.</div>' +
      '<div class="row">' + (o ? '<button class="go" data-w="' + other + '" data-d="' + o.day + '">Watch ' + NAMES[other] + '’s day<small>' + esc(fmtDay(o.day)) + '</small></button>' : '') +
      '<button class="go" data-a="home">Back to the start</button></div><div class="more"><a data-a="dev">Explore the forest (dev view)</a></div></div>';
    pres.querySelectorAll('button.go[data-w]').forEach(function(b){ b.onclick = function(){ play(b.dataset.w, b.dataset.d); }; });
    pres.querySelector('[data-a=home]').onclick = function(){ title(); }; pres.querySelector('[data-a=dev]').onclick = function(){ setMode('dev'); }; showCard(); }
  function showCard(){ pres.classList.add('show'); requestAnimationFrame(function(){ pres.classList.add('vis'); }); }
  function hideCard(){ pres.classList.remove('vis'); setTimeout(function(){ if (!pres.classList.contains('vis')) pres.classList.remove('show'); }, 1200); }

  /* the film: the recording drives it; each sentence with a still shows it moving slowly */
  var P = null, MOVES = [   // start and end framing (scale, x%, y%), alternating so consecutive stills move differently
    [[1.02, 0, 0], [1.16, -1.5, -1]],   // slow push in
    [[1.14, 3.5, 0], [1.14, -3.5, -.5]],   // pan left to right
    [[1.18, -1, -1.5], [1.03, 0, 0]],   // slow pull out
    [[1.14, -3.5, -.5], [1.14, 3.5, 0]]];   // pan right to left
  function tf(f){ return 'translate(' + f[1] + '%,' + f[2] + '%) scale(' + f[0] + ')'; }
  function play(who, day){ var f = F(), r = (READY[who] || []).filter(function(x){ return x.day === day; })[0]; if (!f || !r) return;
    stop(true); hideCard(); document.body.classList.add('playing'); document.body.classList.toggle('nocam', !window.__forestCamera && !document.getElementById('camBtnC'));
    P = {who:who, day:day, t:r.m.t, cur:-1, shots:{}, imgs:{}, k:0, shown:null};
    /* pre-made stills are off: the viewer takes the photos with the camera button */
    if (window.__presentFilm) fetch('film/' + who + '-' + day + '.json', {cache:'no-store'}).then(function(x){ return x.ok ? x.json() : null; }).then(function(j){
      if (!P || P.day !== day || !j || j.h !== r.key.split('-').pop()) return;
      j.shots.slice(0, 5).forEach(function(s){ var im = new Image(); im.decoding = 'async'; im.src = s.src; P.shots[s.n] = im;
        if (s.clip){ var v = document.createElement('video'); v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.src = s.clip; v.poster = s.src; im.__clip = v; } }); }).catch(function(){});
    setTimeout(function(){ if (P && P.day === day) f.play(who, day); }, 50);
    P.iv = setInterval(tick, 200); }
  function tick(){ var f = F(); if (!P || !f) return; var A = f.audio, ct = A.currentTime || 0;
    if (P.holding) return;
    if (P.started && !f.on()){ var w = P.who, d = P.day; stop(true); endCard(w, d); return; }
    if (f.on() && ct > 0) P.started = true;
    var i = 0; while (i + 1 < P.t.length && P.t[i + 1] <= ct + 0.05) i++;
    if (P.started && i !== P.cur){ P.cur = i; var s = (f.sents() || [])[i] || ''; cap.style.opacity = 0; setTimeout(function(){ cap.textContent = s; cap.style.opacity = ''; }, 300); still(i); } }
  function still(i){ var im = P.shots[i];
    if (!im || !im.complete || !im.naturalWidth){ if (P.shown){ var old = P.shown; P.shown = null; kb.classList.remove('on'); old.classList.remove('on'); setTimeout(function(){ if (old.parentNode && !old.classList.contains('on')) old.remove(); }, 1500); } return; }
    var end = i + 1 < P.t.length ? P.t[i + 1] : (P.t[i] + 9), dur = Math.max(6, end - P.t[i] + 1.4), mv = MOVES[P.k++ % MOVES.length];
    var clip = im.__clip, el;
    if (clip){ el = clip; im.__clip = null; mv = [[1.0, 0, 0], [1.04, 0, -.5]];   // a clip moves by itself: only a faint push-in, and it is slowed to fill its sentence
      try { el.currentTime = 0; el.playbackRate = Math.max(0.5, Math.min(1, 5 / dur)); el.play().catch(function(){}); } catch (e) {} }
    else el = im.cloneNode();
    el.style.transition = 'none'; el.style.transform = tf(mv[0]); kb.appendChild(el); kb.classList.add('on');
    void el.offsetWidth; el.style.transition = 'opacity 1.4s ease-in-out, transform ' + dur.toFixed(1) + 's cubic-bezier(.42,0,.58,1)';
    el.classList.add('on'); el.style.transform = tf(mv[1]);
    var old = P.shown; P.shown = el; if (old){ old.classList.remove('on'); setTimeout(function(){ old.remove(); }, 1500); } }
  function stop(quiet){ var f = F(); if (P){ clearInterval(P.iv); P = null; } if (f && f.on()) f.stop();
    document.body.classList.remove('playing'); kb.classList.remove('on'); setTimeout(function(){ if (!kb.classList.contains('on')) kb.innerHTML = ''; }, 1500); cap.textContent = ''; }
  stopB.onclick = function(){ stop(); title(); showCard(); };
  /* the camera: the telling pauses while the photo develops, and picks up again when the photo is closed (or a few seconds after it appears) */
  camB.onclick = function(){ var f = F(), C = window.__forestCamera; if (!C){ var cc = document.getElementById('camBtnC'); if (cc) cc.click(); return; }   // the Claude version's own camera (it develops on tokensforest.com) pauses the telling itself
    if (!P || !f || !C || C.busy() || P.holding) return;
    var A = f.audio; P.holding = true; try { A.pause(); } catch (e) {} document.body.classList.add('paused'); camB.classList.add('wait');
    var resumed = false, timer = null, here = P;
    function resume(){ if (resumed) return; resumed = true; clearTimeout(timer); camB.classList.remove('wait'); document.body.classList.remove('paused');
      if (P === here){ P.holding = false; try { var pr = A.play(); if (pr && pr.catch) pr.catch(function(){}); } catch (e) {} } }
    var ok = C.shoot(function(good){ timer = setTimeout(function(){ if (!resumed){ try { C.close(); } catch (e) {} resume(); } }, good ? 6000 : 3000); }, resume);
    if (!ok) resume(); };

  function setMode(m){ mode = m; try { localStorage.setItem(DEV_KEY, m); } catch (e) {}
    if (m === 'dev'){ stop(); document.body.classList.remove('present'); hideCard(); tog.textContent = '▶ Presentation'; try { localStorage.setItem('forestWelcomed', '1'); } catch (e) {} }
    else { document.body.classList.add('present'); tog.textContent = 'Dev view'; title(); showCard(); probe(title); } }
  tog.onclick = function(){ setMode(mode === 'dev' ? 'present' : 'dev'); };

  if (mode === 'present'){ document.body.classList.add('present'); try { localStorage.setItem('forestWelcomed', '1'); var w = document.getElementById('welcome'); if (w) w.style.display = 'none'; } catch (e) {} }
  tog.textContent = mode === 'dev' ? '▶ Presentation' : 'Dev view';
  var tries = 0, wait = setInterval(function(){ var f = F(); tries++;
    if (f && (Object.keys(f.days('token') || {}).length || tries > 60)){ clearInterval(wait); probe(function(){ if (mode === 'present' && !P) { title(); showCard(); } }); setInterval(function(){ probe(function(){ if (mode === 'present' && !P && pres.querySelector('h1')) title(); }); }, 600000); } }, 500);
  if (mode === 'present'){ pres.innerHTML = '<div class="in"><h1>Token’s Forest</h1><div class="ptag">one moment…</div></div>'; showCard(); }
})();
