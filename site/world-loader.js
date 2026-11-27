/* Token's Forest, public site: a read-only stand-in for the world database.
   The page asks for documents; this answers from world.json (a snapshot of the public world state, kept current in the site's GitHub repository, with the copy beside this page as the fallback) and looks for a newer one every ten minutes.
   Nothing can be written from here. */
(function(){
  // owner device: tokensforest.com/#admin=<passphrase> is remembered here and wiped from the address bar
  (function(){ var m = (location.hash || '').match(/(?:^#|&)admin=([^&]*)/); if (!m) return;
    try { if (m[1]) localStorage.setItem('forestAdmin', decodeURIComponent(m[1])); else localStorage.removeItem('forestAdmin'); } catch (e) {}
    var rest = location.hash.replace(/(?:^#|&)admin=[^&]*/, '').replace(/^&/, ''); history.replaceState(null, '', location.pathname + location.search + (rest ? '#' + rest.replace(/^#/, '') : '')); })();
  var DATA = {docs:{}}, subs = [], stamp = '';
  var LIVE = 'https://raw.githubusercontent.com/actrask/tokensforest/main/site/world.json';
  function grab(u){ return fetch(u + '?t=' + Math.floor(Date.now()/600000), {cache:'no-store'}).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){ return j && j.docs ? j : null; }).catch(function(){ return null; }); }
  var FILM = (function(){ try { var m = /[?&]w=([\w.-]+)/.exec(document.currentScript.src); return m ? m[1] : null; } catch (e) { return null; } })();   // the film tool loads one exact snapshot
  function load(){ return (FILM ? grab(FILM) : grab('/api/world').then(function(j){ return j || grab(LIVE); }).then(function(j){ return j || grab('world.json'); })).then(function(j){
      if (!j || !j.docs) return false; var s = j.exportedAt || JSON.stringify(j).length + ''; if (s === stamp) return false; stamp = s; DATA = j; try { showAsOf(); } catch (e) {} return true; }).catch(function(){ return false; }); }
  function docSnap(p){ var d = DATA.docs[p]; return {exists: !!d, id: p.split('/').pop(), data: function(){ return d; }, metadata: {fromCache:false}}; }
  function colSnap(p, order, lim){ var items = Object.keys(DATA.docs).filter(function(k){ return k.indexOf(p + '/') === 0 && k.split('/').length === 2; }).map(function(k){ var v = DATA.docs[k]; return {id: k.split('/')[1], data: function(){ return v; }}; });
    if (order){ items.sort(function(a, b){ var x = (a.data() || {})[order.f], y = (b.data() || {})[order.f]; x = x === undefined ? a.id : x; y = y === undefined ? b.id : y; return (x < y ? -1 : x > y ? 1 : 0) * (order.desc ? -1 : 1); }); }
    if (lim) items = items.slice(0, lim); return {docs: items, metadata: {fromCache:false}}; }
  function sub(fn){ subs.push(fn); setTimeout(fn, 30); return function(){ var i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); }; }
  var no = function(){ return Promise.reject(new Error('This is the public, read-only forest.')); };
  var db = {
    doc: function(p){ return { onSnapshot: function(cb){ return sub(function(){ cb(docSnap(p)); }); }, get: function(){ return Promise.resolve(docSnap(p)); }, set: no, update: no, delete: no }; },
    collection: function(p){ var order = null, lim = 0; var q = { orderBy: function(f, dir){ order = {f: f, desc: dir === 'desc'}; return q; }, limit: function(n){ lim = n; return q; }, where: function(){ return q; },
        onSnapshot: function(cb){ return sub(function(){ cb(colSnap(p, order, lim)); }); }, get: function(){ return Promise.resolve(colSnap(p, order, lim)); }, add: no, doc: function(id){ return db.doc(p + '/' + id); } }; return q; }
  };
  // "Forest as of ..." under the clock, so a stale copy reads as stale instead of as a sleepy forest
  var asOf = null;
  function showAsOf(){
    var t = Date.parse(DATA.exportedAt || DATA.syncedAt || ''); if (isNaN(t)) return;
    if (!asOf) { if (!document.body) { document.addEventListener('DOMContentLoaded', showAsOf); return; }
      asOf = document.createElement('div'); asOf.id = 'asOf'; document.body.appendChild(asOf);
      var css = document.createElement('style'); css.textContent = '#asOf{position:fixed;z-index:5;left:14px;top:58px;padding:4px 11px;border-radius:999px;background:rgba(30,25,22,.62);color:#efe6d6;font:600 12px/1.4 system-ui,sans-serif;pointer-events:none;transition:opacity .6s;max-width:70vw}#asOf.old{background:rgba(120,78,12,.82);color:#fff3dc} body.cine #asOf{opacity:0}'; document.head.appendChild(css);
      setInterval(place, 2000); }
    var d = new Date(t), hrs = (Date.now() - t) / 3600000, owner = false; try { owner = !!localStorage.getItem('forestAdmin'); } catch (e) {}
    var when = d.toLocaleDateString(undefined, {weekday:'short'}) + ' ' + d.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'});
    asOf.classList.toggle('old', hrs > 3);
    asOf.textContent = 'Forest as of ' + when + (hrs > 3 ? ' \u00b7 not updated in ' + (hrs > 48 ? Math.round(hrs / 24) + ' days' : Math.round(hrs) + ' hours') + (owner ? ' \u00b7 sync from Claude to update' : '') : '');
    place();
  }
  function place(){ if (!asOf) return; var c = document.getElementById('clock'); if (!c) return; var r = c.getBoundingClientRect(); if (!r.width) return; asOf.style.left = r.left + 'px'; asOf.style.top = (r.bottom + 6) + 'px'; }
  setInterval(function(){ try { showAsOf(); } catch (e) {} }, 300000);
  var ready = load().then(function(){ return db; });
  setInterval(function(){ load().then(function(changed){ if (changed) subs.slice().forEach(function(fn){ try { fn(); } catch (e) {} }); }); }, 600000);
  window.claude = { use: function(n){ return n === 'db' ? ready : Promise.resolve(null); } };
  var st = document.createElement('style'); st.textContent = '#openNote,#exportBtn{display:none!important} #welcome .hero{display:block;margin:0 auto 10px;max-height:34vh;max-width:100%;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,.25)}'; document.head.appendChild(st);
  var nt = document.createElement('script'); nt.src = 'notes.js?v=1'; nt.defer = true; document.head.appendChild(nt);   // Cam's notes (owner devices only)
  var lt = document.createElement('script'); lt.src = 'letters.js?v=1'; lt.defer = true; document.head.appendChild(lt);   // notes from visitors: read by anyone, written after a Google sign-in, approved by the keeper
  var pn = document.createElement('script'); pn.src = 'paint.js?v=4'; pn.defer = true; document.head.appendChild(pn);   // "His paintings"
  var ps = document.createElement('script'); ps.src = 'present.js?v=5'; ps.defer = true; document.head.appendChild(ps);   // presentation mode (the default view)
  var pr = document.createElement('script'); pr.src = 'photoreal.js?v=10'; pr.defer = true; document.head.appendChild(pr);   // the camera button (public site only)
  document.addEventListener('DOMContentLoaded', function(){ var c = document.querySelector('#welcome .card'); if (!c || c.querySelector('.hero')) return; var im = new Image(); im.className = 'hero'; im.alt = "Pencil drawing of Token walking through the forest with his staff and bundle"; im.src = 'hero.jpg'; c.insertBefore(im, c.firstChild); });
})();
