/* Token's Forest, public site: Cam's notes to Token and Gage, with their replies.
   Shown only on the owner's devices (opened once with #admin=<passphrase>). New notes wait on the
   site until the hourly brain files them as creator notes; replies come back with the next update. */
(function(){
  var key = ''; try { key = localStorage.getItem('forestAdmin') || ''; } catch (e) {}
  if (!key) return;
  var WHO = 'token';
  var css = document.createElement('style');
  css.textContent =
    '#notesBtn{position:fixed;z-index:6;width:42px;height:42px;padding:0;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:opacity .6s}' +
    '#notesBtn svg{width:20px;height:20px;display:block} body.cine #notesBtn{opacity:0;pointer-events:none}' +
    '#nShade{position:fixed;inset:0;z-index:48;background:rgba(12,10,8,.9);display:none;align-items:center;justify-content:center;padding:14px;box-sizing:border-box}' +
    '#nShade.on{display:flex}' +
    '#nCard{background:#2a2420;color:#f1e7d6;border-radius:14px;width:min(620px,100%);max-height:calc(100dvh - 28px);display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.5);font:15px/1.45 system-ui,sans-serif}' +
    '#nHead{display:flex;align-items:center;gap:8px;padding:14px 16px 8px} #nHead h3{margin:0;flex:1;font-size:17px}' +
    '#nTabs .btn{min-width:74px} #nTabs .btn.on{background:#f4ead8;color:#2a2420}' +
    '#nForm{padding:4px 16px 10px} #nForm textarea{width:100%;box-sizing:border-box;min-height:84px;border-radius:10px;border:1px solid #5a4e44;background:#1d1916;color:#f1e7d6;padding:10px;font:inherit;resize:vertical}' +
    '#nRow{display:flex;align-items:center;gap:10px;margin-top:8px} #nMsg{flex:1;color:#cbbfa8;font-size:13px}' +
    '#nList{overflow:auto;padding:4px 16px 16px;border-top:1px solid #443a33}' +
    '.nItem{padding:12px 0;border-bottom:1px solid #3a322c} .nWhen{color:#a99c86;font-size:12px;margin-bottom:3px}' +
    '.nMine{white-space:pre-wrap} .nReply{margin-top:8px;padding:8px 10px;border-left:3px solid #c9a66b;background:#231e1a;border-radius:0 8px 8px 0;white-space:pre-wrap}' +
    '.nReply b{color:#e6c98f} .nWait{margin-top:6px;color:#a99c86;font-style:italic;font-size:13px}';
  document.head.appendChild(css);
  function el(t, a, h){ var e = document.createElement(t); for (var k in a) e.setAttribute(k, a[k]); if (h != null) e.innerHTML = h; return e; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function when(t){ var d = new Date(t); if (isNaN(d)) return ''; return d.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'}) + ' · ' + d.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'}); }
  function name(w){ return w === 'gage' ? 'Gage' : 'Token'; }
  function hdrs(){ return {'Content-Type':'application/json', 'X-Forest-Admin': key}; }

  var shade = el('div', {id:'nShade'}), card = el('div', {id:'nCard'});
  card.innerHTML = '<div id="nHead"><h3>Notes</h3><span id="nTabs"><button class="btn light" data-w="token">Token</button> <button class="btn light" data-w="gage">Gage</button></span></div>' +
    '<form id="nForm"><textarea id="nText" maxlength="2000" placeholder=""></textarea><div id="nRow"><span id="nMsg"></span><button class="btn light" type="button" id="nClose">Close</button><button class="btn" type="submit" id="nSend">Send</button></div></form>' +
    '<div id="nList"></div>';
  shade.appendChild(card);
  var DATA = {history: [], pending: []};

  function render(){
    [].forEach.call(card.querySelectorAll('#nTabs .btn'), function(b){ b.classList.toggle('on', b.dataset.w === WHO); });
    card.querySelector('#nText').placeholder = 'Write to ' + name(WHO) + '…';
    var items = [];
    DATA.pending.filter(function(n){ return n.to === WHO; }).forEach(function(n){ items.push({n: n, pending: true}); });
    DATA.history.filter(function(n){ return (n.to || 'token') === WHO; }).forEach(function(n){ items.push({n: n}); });
    items.sort(function(a, b){ return String(b.n.at).localeCompare(String(a.n.at)); });
    var list = card.querySelector('#nList');
    if (!items.length) { list.innerHTML = '<p class="nWait">No notes to ' + name(WHO) + ' yet.</p>'; return; }
    list.innerHTML = items.map(function(it){
      var n = it.n, h = '<div class="nItem"><div class="nWhen">You · ' + esc(when(n.at)) + '</div><div class="nMine">' + esc(n.text) + '</div>';
      if (it.pending) h += '<div class="nWait">Waiting to reach the forest: it goes out with the next hourly update.</div>';
      else if (n.reply) h += '<div class="nReply"><b>' + name(n.to) + '</b>' + (n.readAt ? ' <span class="nWhen" style="display:inline">· ' + esc(when(n.readAt)) + '</span>' : '') + '<br>' + esc(n.reply) + '</div>';
      else h += '<div class="nWait">' + (n.to === 'gage' ? 'Gage hasn’t read it yet; his tablet only wakes in daylight.' : 'Token hasn’t read it yet; he reads notes in his own time.') + '</div>';
      return h + '</div>';
    }).join('');
  }
  function load(){
    var msg = card.querySelector('#nMsg'); msg.textContent = 'Loading…';
    return fetch('/api/notes', {headers: hdrs(), cache: 'no-store'}).then(function(r){ return r.json().then(function(j){ return {ok: r.ok, j: j}; }); })
      .then(function(x){ if (!x.ok) throw new Error(x.j.error || 'Could not load notes.'); DATA = {history: x.j.history || [], pending: x.j.pending || []}; msg.textContent = ''; render(); })
      .catch(function(e){ msg.textContent = e.message; render(); });
  }
  card.querySelector('#nTabs').addEventListener('click', function(e){ var b = e.target.closest('[data-w]'); if (!b) return; WHO = b.dataset.w; render(); });
  card.querySelector('#nClose').onclick = function(){ shade.classList.remove('on'); };
  shade.addEventListener('click', function(e){ if (e.target === shade) shade.classList.remove('on'); });
  card.querySelector('#nForm').addEventListener('submit', function(e){
    e.preventDefault(); var t = card.querySelector('#nText'), msg = card.querySelector('#nMsg'), send = card.querySelector('#nSend');
    var text = t.value.trim(); if (!text) return; send.disabled = true; msg.textContent = 'Sending…';
    fetch('/api/notes', {method: 'POST', headers: hdrs(), body: JSON.stringify({to: WHO, text: text})})
      .then(function(r){ return r.json().then(function(j){ if (!r.ok) throw new Error(j.error || 'Could not send.'); return j; }); })
      .then(function(j){ t.value = ''; DATA.pending.push(j.note); render(); msg.textContent = 'Sent. ' + name(WHO) + ' gets it with the next hourly update.'; })
      .catch(function(err){ msg.textContent = err.message; }).then(function(){ send.disabled = false; });
  });

  function open(){ var a = document.querySelector('#who button.on'); if (a && a.dataset.w) WHO = a.dataset.w === 'gage' ? 'gage' : 'token'; render(); shade.classList.add('on'); load(); }
  function init(){
    document.body.appendChild(shade);
    var b = el('button', {'class':'btn', id:'notesBtn', title:'Notes to Token and Gage', 'aria-label':'Notes to Token and Gage'},
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>');
    b.addEventListener('click', function(e){ e.stopPropagation(); open(); });
    document.body.appendChild(b);
    function place(){ var g = document.getElementById('galleryBtn'); if (!g) return; var r = g.getBoundingClientRect(); if (!r.width) return;
      b.style.right = (window.innerWidth - r.left + 10) + 'px'; b.style.bottom = (window.innerHeight - r.bottom) + 'px'; }
    place(); window.addEventListener('resize', place); setInterval(place, 2000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
