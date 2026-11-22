/* Token's Forest, public site: notes from visitors to Token and Gage.
   Anyone can read the approved notes and the replies. Leaving one needs a Google sign-in, and every note
   waits for the forest's keeper to approve it before Token or Gage ever sees it. */
(function(){
  var WHO = 'token', CRED = '', ME = '', CID = '', ON = false, OWNER = false;
  try { CRED = sessionStorage.getItem('forestCred') || ''; ME = sessionStorage.getItem('forestMe') || ''; OWNER = !!localStorage.getItem('forestAdmin'); } catch (e) {}
  var css = document.createElement('style');
  css.textContent =
    '#lShade{position:fixed;inset:0;z-index:48;background:rgba(12,10,8,.9);display:none;align-items:center;justify-content:center;padding:14px;box-sizing:border-box}' +
    '#lShade.on{display:flex}' +
    '#lCard{background:#2a2420;color:#f1e7d6;border-radius:14px;width:min(640px,100%);max-height:calc(100dvh - 28px);display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.5);font:15px/1.5 system-ui,sans-serif}' +
    '#lHead{display:flex;align-items:center;gap:8px;padding:14px 16px 6px;flex-wrap:wrap} #lHead h3{margin:0;flex:1;font-size:18px;min-width:150px}' +
    '#lTabs{display:flex;gap:6px} #lTabs .btn{min-width:76px} #lTabs .btn.on{background:#f4ead8;color:#2a2420}' +
    '#lBody{overflow:auto;padding:2px 16px 16px}' +
    '#lIntro{color:#cbbfa8;font-size:14px;margin:2px 0 10px}' +
    '.lItem{padding:12px 0;border-bottom:1px solid #3a322c} .lWho{color:#e6c98f;font-weight:600} .lWhen{color:#a99c86;font-size:12px}' +
    '.lText{white-space:pre-wrap;margin-top:3px} .lReply{margin-top:8px;padding:8px 10px;border-left:3px solid #c9a66b;background:#231e1a;border-radius:0 8px 8px 0;white-space:pre-wrap}' +
    '.lReply b{color:#e6c98f} .lWait{margin-top:6px;color:#a99c86;font-style:italic;font-size:13px}' +
    '#lWrite{border-top:1px solid #443a33;margin-top:14px;padding-top:12px}' +
    '#lWrite textarea{width:100%;box-sizing:border-box;min-height:90px;border-radius:10px;border:1px solid #5a4e44;background:#1d1916;color:#f1e7d6;padding:10px;font:inherit;resize:vertical}' +
    '#lTo{display:flex;gap:14px;flex-wrap:wrap;margin:8px 0;color:#e6dcc6} #lTo label{cursor:pointer}' +
    '#lRow{display:flex;align-items:center;gap:10px;flex-wrap:wrap} #lMsg{flex:1;color:#cbbfa8;font-size:13px;min-width:160px}' +
    '#lPriv{color:#a99c86;font-size:12px;margin-top:8px} #lMine h4{margin:14px 0 4px;font-size:14px;color:#e6dcc6}' +
    '.lSt{font-size:12px;padding:1px 7px;border-radius:999px;background:#3a322c;color:#cbbfa8;margin-left:6px} .lSt.approved{background:#2f5a3a;color:#dff0d8}';
  document.head.appendChild(css);
  function el(t, a, h){ var e = document.createElement(t); for (var k in a) e.setAttribute(k, a[k]); if (h != null) e.innerHTML = h; return e; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function when(t){ var d = new Date(t); return isNaN(d) ? '' : d.toLocaleDateString(undefined, {month:'short', day:'numeric'}) + ', ' + d.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'}); }
  function name(w){ return w === 'gage' ? 'Gage' : 'Token'; }

  var shade = el('div', {id:'lShade'}), card = el('div', {id:'lCard'});
  card.innerHTML = '<div id="lHead"><h3>Notes for Token and Gage</h3><div id="lTabs"><button class="btn light" data-w="token">Token</button><button class="btn light" data-w="gage">Gage</button></div><button class="btn" id="lClose">Close</button></div>' +
    '<div id="lBody"><div id="lIntro"></div><div id="lList">Loading notes…</div><div id="lWrite"></div><div id="lMine"></div></div>';
  shade.appendChild(card);
  var LETTERS = [];

  function paintList(){
    var list = card.querySelector('#lList'), mine = LETTERS.filter(function(l){ return l.to.indexOf(WHO) >= 0; });
    card.querySelector('#lIntro').textContent = 'Notes visitors have left for ' + name(WHO) + ', and what ' + (WHO === 'gage' ? 'he' : 'he') + ' wrote back. ' + name(WHO) + ' reads them when ' + (WHO === 'gage' ? 'the sun is up and his tablet works' : 'he next visits the stump') + ', so a reply can take a while.';
    if (!mine.length){ list.innerHTML = '<div style="color:#a99c86;padding:8px 0">No notes for ' + name(WHO) + ' yet. Be the first.</div>'; return; }
    list.innerHTML = mine.map(function(l){
      var r = l.reply && l.reply[WHO];
      return '<div class="lItem"><span class="lWho">' + esc(l.from) + '</span> <span class="lWhen">' + esc(when(l.at)) + (l.to.length > 1 ? ' · to both' : '') + '</span>' +
        '<div class="lText">' + esc(l.text) + '</div>' +
        (r ? '<div class="lReply"><b>' + name(WHO) + ' wrote back:</b> ' + esc(r) + '</div>' : '<div class="lWait">' + name(WHO) + ' hasn’t answered yet.</div>') + '</div>';
    }).join('');
  }
  function load(){ return fetch('/api/letters', {cache:'no-store'}).then(function(r){ return r.json(); }).then(function(j){ LETTERS = j.letters || []; paintList(); }).catch(function(){ card.querySelector('#lList').textContent = 'The notes could not be loaded right now.'; }); }

  function paintWrite(){
    var w = card.querySelector('#lWrite');
    if (!ON){ w.innerHTML = '<div style="color:#a99c86;font-size:14px">Leaving a note opens soon.</div>'; return; }
    if (!CRED){
      w.innerHTML = '<div style="margin-bottom:8px">Want to leave ' + name(WHO) + ' a note? Sign in first.</div><div id="lG"></div>' +
        '<div id="lPriv">Signing in shares your name and email with the forest’s keeper, only so the notes stay kind. Only your first name is ever shown. Every note is read and approved before Token or Gage sees it.</div>';
      gsiButton(); return;
    }
    w.innerHTML = '<div style="margin-bottom:6px">Signed in as <b>' + esc(ME) + '</b> <button class="btn light" id="lOut" style="padding:3px 10px;font-size:13px">Sign out</button></div>' +
      '<textarea id="lTxt" maxlength="600" placeholder="Write your note…"></textarea>' +
      '<div id="lTo"><label><input type="radio" name="lto" value="token"' + (WHO === 'token' ? ' checked' : '') + '> To Token</label><label><input type="radio" name="lto" value="gage"' + (WHO === 'gage' ? ' checked' : '') + '> To Gage</label><label><input type="radio" name="lto" value="both"> To both</label></div>' +
      '<div id="lRow"><button class="btn" id="lSend">Send note</button><div id="lMsg">Notes wait for approval before they’re delivered.</div></div>';
    w.querySelector('#lOut').onclick = function(){ CRED = ''; ME = ''; try { sessionStorage.removeItem('forestCred'); sessionStorage.removeItem('forestMe'); if (window.google) google.accounts.id.disableAutoSelect(); } catch (e) {} card.querySelector('#lMine').innerHTML = ''; paintWrite(); };
    w.querySelector('#lSend').onclick = send; loadMine();
  }
  function send(){
    var t = card.querySelector('#lTxt'), msg = card.querySelector('#lMsg'), b = card.querySelector('#lSend'), to = (card.querySelector('input[name=lto]:checked') || {}).value || WHO;
    if ((t.value || '').trim().length < 2){ msg.textContent = 'Write a few words first.'; return; }
    b.disabled = true; msg.textContent = 'Sending…';
    fetch('/api/letters', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({credential: CRED, to: to, text: t.value})})
      .then(function(r){ return r.json(); }).then(function(j){ b.disabled = false;
        if (j.signin){ CRED = ''; try { sessionStorage.removeItem('forestCred'); } catch (e) {} paintWrite(); return; }
        if (!j.ok){ msg.textContent = j.error || 'It didn’t send. Try again.'; return; }
        t.value = ''; msg.textContent = 'Thank you. Your note is waiting for the keeper to approve it.'; loadMine(); })
      .catch(function(){ b.disabled = false; msg.textContent = 'It didn’t send. Try again.'; });
  }
  function loadMine(){
    var box = card.querySelector('#lMine'); if (!CRED) { box.innerHTML = ''; return; }
    fetch('/api/letters/mine', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({credential: CRED})}).then(function(r){ return r.json(); }).then(function(j){
      if (j.signin){ CRED = ''; try { sessionStorage.removeItem('forestCred'); } catch (e) {} paintWrite(); return; }
      var L = j.letters || []; if (!L.length){ box.innerHTML = ''; return; }
      box.innerHTML = '<h4>Your notes</h4>' + L.map(function(l){
        var rep = ['token','gage'].filter(function(w){ return l.reply && l.reply[w]; }).map(function(w){ return '<div class="lReply"><b>' + name(w) + ' wrote back:</b> ' + esc(l.reply[w]) + '</div>'; }).join('');
        return '<div class="lItem"><span class="lWhen">' + esc(when(l.at)) + ' · to ' + l.to.map(name).join(' and ') + '</span><span class="lSt ' + esc(l.status) + '">' + esc(l.status) + '</span><div class="lText">' + esc(l.text) + '</div>' + rep + '</div>'; }).join('');
    }).catch(function(){});
  }
  function gsiButton(){
    var host = card.querySelector('#lG'); if (!host) return;
    var go = function(){ try {
      google.accounts.id.initialize({client_id: CID, auto_select: false, callback: function(r){
        CRED = r.credential || ''; try { var p = JSON.parse(atob(CRED.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); ME = (p.given_name || p.name || '').split(' ')[0]; sessionStorage.setItem('forestCred', CRED); sessionStorage.setItem('forestMe', ME); } catch (e) {}
        paintWrite(); } });
      google.accounts.id.renderButton(host, {theme:'filled_black', size:'large', text:'signin_with', shape:'pill'}); } catch (e) { host.textContent = 'Sign-in could not start here.'; } };
    if (window.google && google.accounts && google.accounts.id) return go();
    if (!document.getElementById('gsiJs')){ var s = el('script', {src:'https://accounts.google.com/gsi/client', id:'gsiJs'}); s.async = true; document.head.appendChild(s); }
    var tries = 0, wait = setInterval(function(){ if (window.google && google.accounts && google.accounts.id){ clearInterval(wait); go(); } else if (++tries > 50){ clearInterval(wait); host.textContent = 'Sign-in could not load. Check that nothing is blocking accounts.google.com.'; } }, 200);
  }
  function setWho(w){ WHO = w; [].forEach.call(card.querySelectorAll('#lTabs .btn'), function(b){ b.classList.toggle('on', b.dataset.w === w); }); paintList(); paintWrite(); }
  function open(){ var b = document.querySelector('#who button.on'); setWho(b && b.dataset.w === 'gage' ? 'gage' : 'token'); shade.classList.add('on'); load(); }

  function init(){
    document.body.appendChild(shade);
    card.querySelector('#lClose').onclick = function(){ shade.classList.remove('on'); };
    shade.addEventListener('click', function(e){ if (e.target === shade) shade.classList.remove('on'); });
    [].forEach.call(card.querySelectorAll('#lTabs .btn'), function(b){ b.onclick = function(){ setWho(b.dataset.w); }; });
    fetch('/api/letters/config', {cache:'no-store'}).then(function(r){ return r.json(); }).then(function(j){ CID = j.clientId || ''; ON = !!j.on; }).catch(function(){});
    var tries = 0, t = setInterval(function(){ var host = document.getElementById('btns'); if (!host && ++tries < 60) return; clearInterval(t); if (!host || document.getElementById('lettersBtn')) return;
      var b = el('button', {'class':'btn light', id:'lettersBtn'}, 'Notes from visitors'); b.addEventListener('click', function(e){ e.stopPropagation(); open(); });
      host.insertBefore(b, host.children[3] || null);
      if (OWNER){ var k = el('a', {'class':'btn light', href:'/keeper.html', id:'keeperBtn', style:'text-decoration:none;text-align:center'}, 'Approve notes'); host.insertBefore(k, b.nextSibling);
        fetch('/api/letters/admin', {headers:{'X-Forest-Admin': localStorage.getItem('forestAdmin') || ''}}).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){ if (!j) return; var n = (j.letters || []).filter(function(l){ return l.status === 'pending'; }).length; if (n) k.textContent = 'Approve notes (' + n + ' waiting)'; }).catch(function(){}); }
    }, 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
