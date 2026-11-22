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
  function load(){ return grab(LIVE).then(function(j){ return j || grab('world.json'); }).then(function(j){
      if (!j || !j.docs) return false; var s = j.exportedAt || JSON.stringify(j).length + ''; if (s === stamp) return false; stamp = s; DATA = j; return true; }).catch(function(){ return false; }); }
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
  var ready = load().then(function(){ return db; });
  setInterval(function(){ load().then(function(changed){ if (changed) subs.slice().forEach(function(fn){ try { fn(); } catch (e) {} }); }); }, 600000);
  window.claude = { use: function(n){ return n === 'db' ? ready : Promise.resolve(null); } };
  var st = document.createElement('style'); st.textContent = '#openNote,#exportBtn{display:none!important} #welcome .hero{display:block;margin:0 auto 10px;max-height:34vh;max-width:100%;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,.25)}'; document.head.appendChild(st);
  var nt = document.createElement('script'); nt.src = 'notes.js?v=1'; nt.defer = true; document.head.appendChild(nt);   // Cam's notes (owner devices only)
  var pr = document.createElement('script'); pr.src = 'photoreal.js?v=8'; pr.defer = true; document.head.appendChild(pr);   // the camera button (public site only)
  document.addEventListener('DOMContentLoaded', function(){ var c = document.querySelector('#welcome .card'); if (!c || c.querySelector('.hero')) return; var im = new Image(); im.className = 'hero'; im.alt = "Pencil drawing of Token walking through the forest with his staff and bundle"; im.src = 'hero.jpg'; c.insertBefore(im, c.firstChild); });
})();
