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
    '#prBar .btn{min-width:90px}' +
    '#photoBtn{position:fixed;right:132px;bottom:16px;z-index:6;width:42px;height:42px;padding:0;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:opacity .6s}' +
    '#photoBtn svg{width:21px;height:21px;display:block}' +
    'body.cine #photoBtn{opacity:0;pointer-events:none}' +
    '@media (max-width:640px){#photoBtn{right:120px;bottom:104px}}';
  document.head.appendChild(css);

  function el(tag, attrs, html){ var e = document.createElement(tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (html) e.innerHTML = html; return e; }
  var shade = el('div', {id:'prShade'});
  var frame = el('div', {id:'prFrame'}); var img = el('img', {alt:'Photo of the forest'}); var msg = el('div', {id:'prMsg'});
  frame.appendChild(img); frame.appendChild(msg);
  var bar = el('div', {id:'prBar'});
  var bCompare = el('button', {'class':'btn light'}, 'Show original');
  var bSave = el('button', {'class':'btn light'}, 'Save');
  var bClose = el('button', {'class':'btn'}, 'Close');
  bar.appendChild(bCompare); bar.appendChild(bSave); bar.appendChild(bClose);
  shade.appendChild(frame); shade.appendChild(bar);

  var original = '', photo = '', showing = 'photo';
  function setButtons(){ bCompare.style.display = bSave.style.display = photo ? '' : 'none'; }
  bClose.onclick = function(){ shade.classList.remove('on'); };
  bCompare.onclick = function(){ showing = showing === 'photo' ? 'orig' : 'photo'; img.src = showing === 'photo' ? photo : original; bCompare.textContent = showing === 'photo' ? 'Show original' : 'Show photo'; };
  bSave.onclick = function(){
    fetch(photo).then(function(r){ return r.blob(); }).then(function(b){ var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'tokens-forest-' + new Date().toISOString().slice(0,16).replace(/[:T]/g,'-') + '.jpg'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 2000); })
      .catch(function(){ window.open(photo, '_blank'); });
  };

  function whoNow(){ var b = document.querySelector('#who button.on'); return b && b.dataset.w || ''; }

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
    busy = true; photo = ''; showing = 'photo'; bCompare.textContent = 'Show original'; setButtons();
    grab().then(function(g){
      original = g.data; img.src = original; frame.classList.add('dev'); msg.textContent = 'Developing the photo… (about 10–20 seconds)'; msg.style.display = 'flex';
      shade.classList.add('on');
      return fetch('/api/photoreal', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({image: g.data, aspect: g.aspect, who: whoNow()})})
        .then(function(r){ return r.json().catch(function(){ return {error:'The photo did not develop.'}; }); })
        .then(function(j){
          if (!j.url) throw new Error(j.error || 'The photo did not develop.');
          return new Promise(function(res, rej){ var p = new Image(); p.onload = function(){ res(j.url); }; p.onerror = function(){ rej(new Error('The photo did not load.')); }; p.src = j.url; });
        })
        .then(function(u){ photo = u; img.src = u; frame.classList.remove('dev'); msg.style.display = 'none'; setButtons(); });
    }).catch(function(e){ frame.classList.add('dev'); msg.textContent = e.message || 'The photo did not develop.'; msg.style.display = 'flex'; })
      .then(function(){ busy = false; });
  }

  function init(){
    document.body.appendChild(shade);
    var b = el('button', {'class':'btn', id:'photoBtn', title:'Photoreal photo of this view', 'aria-label':'Take a photoreal photo of this view'},
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg>');
    b.addEventListener('click', function(e){ e.stopPropagation(); shoot(); });
    document.body.appendChild(b);
    // sit just left of the Menu button, whatever its width
    function place(){ var m = document.getElementById('menuBtn'); if (!m) return; var r = m.getBoundingClientRect(); if (!r.width) return;
      b.style.right = (window.innerWidth - r.left + 10) + 'px'; b.style.bottom = (window.innerHeight - r.bottom + (r.height - 42) / 2) + 'px'; }
    place(); window.addEventListener('resize', place); setInterval(place, 2000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
