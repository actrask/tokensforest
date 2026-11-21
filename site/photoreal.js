/* Token's Forest, public site: the camera button.
   Grabs the current frame straight from the 3D canvas (no UI), sends it to
   /api/photoreal, and shows the photoreal version with a before/after toggle. */
(function(){
  var ASPECTS = [['21:9',21/9],['16:9',16/9],['3:2',3/2],['4:3',4/3],['1:1',1],['3:4',3/4],['2:3',2/3],['9:16',9/16],['9:21',9/21]];
  var busy = false;

  var css = document.createElement('style');
  css.textContent =
    '#prShade{position:fixed;inset:0;z-index:50;background:rgba(12,10,8,.86);display:none;align-items:center;justify-content:center;flex-direction:column;gap:12px;padding:16px;box-sizing:border-box}' +
    '#prShade.on{display:flex}' +
    '#prFrame{position:relative;max-width:min(1200px,100%);max-height:calc(100dvh - 120px)}' +
    '#prFrame img{display:block;max-width:100%;max-height:calc(100dvh - 120px);border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.5)}' +
    '#prFrame.dev img{filter:grayscale(.6) brightness(.55) blur(1.5px)}' +
    '#prMsg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#f4ead8;font:600 15px/1.4 system-ui,sans-serif;text-align:center;padding:20px;text-shadow:0 1px 4px #000}' +
    '#prBar{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}' +
    '#prBar .btn{min-width:90px}' + '#prFrame img{cursor:pointer}' + '#prCount{color:#cbbfa8;font:13px system-ui,sans-serif;text-align:center;min-height:16px}' + '#prFrame .nav{position:absolute;top:50%;transform:translateY(-50%);color:#fff;font:600 30px system-ui;opacity:.55;pointer-events:none;text-shadow:0 1px 6px #000;padding:0 10px}' + '#prFrame .nav.l{left:0} #prFrame .nav.r{right:0}' +
    '#photoBtn{position:fixed;right:132px;bottom:16px;z-index:6;width:42px;height:42px;padding:0;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:opacity .6s}' +
    '#photoBtn svg{width:21px;height:21px;display:block}' +
    'body.cine #photoBtn{opacity:0;pointer-events:none}' +
    '@media (max-width:640px){#photoBtn{right:120px;bottom:104px}}' +
    '#galleryBtn{position:fixed;z-index:6;width:42px;height:42px;padding:0;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:opacity .6s}' +
    '#galleryBtn svg{width:20px;height:20px;display:block}' +
    'body.cine #galleryBtn{opacity:0;pointer-events:none}' +
    '#prGal{position:fixed;inset:0;z-index:49;background:rgba(12,10,8,.92);display:none;flex-direction:column;padding:16px;box-sizing:border-box}' +
    '#prGal.on{display:flex} #prGal h3{color:#f4ead8;font:600 17px system-ui,sans-serif;margin:4px 4px 12px}' +
    '#prGrid{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;align-content:start}' +
    '#prGrid figure{margin:0;cursor:pointer} #prGrid img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;display:block;background:#222}' +
    '#prGrid figcaption{color:#cbbfa8;font:12px system-ui,sans-serif;margin-top:4px}' +
    '#prGalBar{display:flex;justify-content:center;padding-top:12px}';
  document.head.appendChild(css);

  function el(tag, attrs, html){ var e = document.createElement(tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (html) e.innerHTML = html; return e; }
  var shade = el('div', {id:'prShade'});
  var frame = el('div', {id:'prFrame'}); var img = el('img', {alt:'Photo of the forest'}); var msg = el('div', {id:'prMsg'});
  frame.appendChild(img); frame.appendChild(msg);
  var navL = el('div', {'class':'nav l'}, '&#8249;'), navR = el('div', {'class':'nav r'}, '&#8250;'); frame.appendChild(navL); frame.appendChild(navR);
  var count = el('div', {id:'prCount'});
  var bar = el('div', {id:'prBar'});
  var bCompare = el('button', {'class':'btn light'}, 'Show original');
  var bSave = el('button', {'class':'btn light'}, 'Save');
  var bClose = el('button', {'class':'btn'}, 'Close');
  bar.appendChild(bCompare); bar.appendChild(bSave); bar.appendChild(bClose);
  shade.appendChild(frame); shade.appendChild(count); shade.appendChild(bar);

  var original = '', photo = '', showing = 'photo';
  var KEY = 'forestPhotos';
  function loadList(){ try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function saveList(l){ try { localStorage.setItem(KEY, JSON.stringify(l.slice(0, 300))); } catch (e) {} }
  function remember(p){ var l = loadList(); l.unshift(p); saveList(l); refreshGalleryBtn(); }
  var LIST = [], IDX = -1;
  function label(p){ if (!p) return ''; var d = new Date(p.at || Date.now()); return (p.who ? p.who.charAt(0).toUpperCase() + p.who.slice(1) + ' \u00b7 ' : '') + d.toLocaleDateString(undefined, {month:'short', day:'numeric'}) + ' ' + d.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'}); }
  function showAt(i){
    if (!LIST.length) return; IDX = (i + LIST.length) % LIST.length; var p = LIST[IDX];
    photo = p.url; original = p.original || ''; showing = 'photo'; bCompare.textContent = 'Show original';
    img.src = p.url; frame.classList.remove('dev'); msg.style.display = 'none'; setButtons();
    count.textContent = (LIST.length > 1 ? (IDX + 1) + ' / ' + LIST.length + '  \u00b7  ' : '') + label(p) + (LIST.length > 1 ? '  \u00b7  tap the photo for the next one' : '');
    navL.style.display = navR.style.display = LIST.length > 1 ? '' : 'none';
  }
  img.addEventListener('click', function(e){
    if (busy && !photo) return; if (LIST.length < 2) return;
    var r = img.getBoundingClientRect(); showAt(IDX + ((e.clientX - r.left) < r.width * 0.33 ? -1 : 1));
  });
  function absUrl(u){ return u && u.charAt(0) === '/' ? location.origin + u : u; }
  function fetchAll(){
    return fetch('/api/photos', {cache:'no-store'}).then(function(r){ return r.ok ? r.json() : {photos: []}; }).catch(function(){ return {photos: []}; })
      .then(function(j){
        var seen = {}, all = [];
        (j.photos || []).forEach(function(p){ p.url = absUrl(p.url); if (!seen[p.url]) { seen[p.url] = 1; all.push(p); } });
        loadList().forEach(function(p){ if (!seen[p.url]) { seen[p.url] = 1; all.push(p); } });
        all.sort(function(a, b){ return String(b.at || '').localeCompare(String(a.at || '')); });
        return all;
      });
  }
  function setButtons(){ bSave.style.display = photo ? '' : 'none'; bCompare.style.display = (photo && original) ? '' : 'none'; }
  bClose.onclick = function(){ shade.classList.remove('on'); };
  bCompare.onclick = function(){ showing = showing === 'photo' ? 'orig' : 'photo'; img.src = showing === 'photo' ? photo : original; bCompare.textContent = showing === 'photo' ? 'Show original' : 'Show photo'; };
  bSave.onclick = function(){
    fetch(photo).then(function(r){ return r.blob(); }).then(function(b){ var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'tokens-forest-' + new Date().toISOString().slice(0,16).replace(/[:T]/g,'-') + '.jpg'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 2000); })
      .catch(function(){ window.open(photo, '_blank'); });
  };

  function txt(id){ var e = document.getElementById(id); return e ? (e.textContent || '').trim().slice(0, 160) : ''; }
  function adminHeaders(){ var h = {'Content-Type':'application/json'}; try { var k = localStorage.getItem('forestAdmin'); if (k) h['X-Forest-Admin'] = k; } catch (e) {} return h; }
  function whoNow(){ var b = document.querySelector('#who button.on'); return b && b.dataset.w || ''; }

  var gal = el('div', {id:'prGal'}), galTitle = el('h3', {}, 'Your forest photos'), grid = el('div', {id:'prGrid'}), galBar = el('div', {id:'prGalBar'});
  var bGalClose = el('button', {'class':'btn'}, 'Close'); galBar.appendChild(bGalClose);
  gal.appendChild(galTitle); gal.appendChild(grid); gal.appendChild(galBar);
  bGalClose.onclick = function(){ gal.classList.remove('on'); };
  var galBtn;
  function refreshGalleryBtn(){}
  function openGallery(){
    grid.innerHTML = '<div style="color:#cbbfa8;font:14px system-ui">Loading photos\u2026</div>'; gal.classList.add('on');
    fetchAll().then(function(all){
      LIST = all; grid.innerHTML = '';
      galTitle.textContent = all.length ? 'Forest photos (' + all.length + ')' : 'No photos yet: tap the camera to take one';
      all.forEach(function(p, i){
        var f = el('figure'), im = el('img', {loading:'lazy', alt:'Forest photo'}), cap = el('figcaption');
        im.src = p.url; im.onerror = function(){ f.style.display = 'none'; };
        cap.textContent = label(p); f.appendChild(im); f.appendChild(cap);
        f.onclick = function(){ showAt(i); shade.classList.add('on'); };
        grid.appendChild(f);
      });
    });
  }

  // grab the canvas right after the page has drawn the next frame
  function grab(){
    return new Promise(function(res){
      requestAnimationFrame(function(){
        var c = document.getElementById('gl'); var w = c.width, h = c.height, s = Math.min(1, 1440 / Math.max(w, h));
        var o = document.createElement('canvas'); o.width = Math.round(w * s); o.height = Math.round(h * s);
        o.getContext('2d').drawImage(c, 0, 0, o.width, o.height);
        var r = w / h, best = ASPECTS[0]; ASPECTS.forEach(function(a){ if (Math.abs(Math.log(a[1] / r)) < Math.abs(Math.log(best[1] / r))) best = a; });
        res({data: o.toDataURL('image/jpeg', 0.9), aspect: best[0]});
      });
    });
  }

  function shoot(){
    if (busy) { shade.classList.add('on'); return; }
    busy = true; photo = ''; showing = 'photo'; bCompare.textContent = 'Show original'; setButtons(); count.textContent = ''; navL.style.display = navR.style.display = 'none';
    grab().then(function(g){
      original = g.data; img.src = original; frame.classList.add('dev'); msg.textContent = 'Developing the photo… (about 10–20 seconds)'; msg.style.display = 'flex';
      shade.classList.add('on');
      return fetch('/api/photoreal', {method:'POST', headers: adminHeaders(), body: JSON.stringify({image: g.data, aspect: g.aspect, who: whoNow(), scene: txt('statusTxt'), clock: txt('clock')})})
        .then(function(r){ return r.json().catch(function(){ return {error:'The photo did not develop.'}; }); })
        .then(function(j){
          if (j.url && j.url.charAt(0) === '/') j.url = location.origin + j.url;
          if (!j.url) throw new Error(j.error || 'The photo did not develop.');
          return new Promise(function(res, rej){ var p = new Image(); p.onload = function(){ res(j.url); }; p.onerror = function(){ rej(new Error('The photo did not load.')); }; p.src = j.url; });
        })
        .then(function(u){ photo = u; img.src = u; frame.classList.remove('dev'); msg.style.display = 'none'; setButtons();
          var p = {url: u, who: whoNow(), at: new Date().toISOString(), original: original}; remember({url: u, who: p.who, at: p.at});
          LIST = [p]; showAt(0);
          fetchAll().then(function(all){ LIST = [p].concat(all.filter(function(x){ return x.url !== u; })); if (IDX === 0 && photo === u) showAt(0); }); });
    }).catch(function(e){ frame.classList.add('dev'); msg.textContent = e.message || 'The photo did not develop.'; msg.style.display = 'flex'; })
      .then(function(){ busy = false; });
  }

  function init(){
    document.body.appendChild(shade);
    var b = el('button', {'class':'btn', id:'photoBtn', title:'Photoreal photo of this view', 'aria-label':'Take a photoreal photo of this view'},
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg>');
    b.addEventListener('click', function(e){ e.stopPropagation(); shoot(); });
    document.body.appendChild(b);
    document.body.appendChild(gal);
    galBtn = el('button', {'class':'btn', id:'galleryBtn', title:'Your photos', 'aria-label':'See your previous photos'},
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/></svg>');
    galBtn.addEventListener('click', function(e){ e.stopPropagation(); openGallery(); });
    document.body.appendChild(galBtn); refreshGalleryBtn();
    // sit just left of the Menu button, whatever its width
    function place(){ var m = document.getElementById('menuBtn'); if (!m) return; var r = m.getBoundingClientRect(); if (!r.width) return;
      var bot = (window.innerHeight - r.bottom + (r.height - 42) / 2) + 'px', right = window.innerWidth - r.left + 10;
      b.style.right = right + 'px'; b.style.bottom = bot; galBtn.style.right = (right + 52) + 'px'; galBtn.style.bottom = bot; }
    place(); window.addEventListener('resize', place); setInterval(place, 2000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
