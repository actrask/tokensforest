// /api/letters/* : notes from visitors to Token and Gage on tokensforest.com.
// A visitor signs in with Google, writes a note; it waits until the forest's keeper (Cam) approves it.
// Approved notes are public (first name only), the hourly brain delivers them to Token and/or Gage,
// and their replies come back here and show under the note.
//
//   GET  /api/letters                 public: approved notes with replies (also the brain's feed)
//   GET  /api/letters/config          { clientId, on }
//   POST /api/letters                 { credential, to: 'token'|'gage'|'both', text }  (Google ID token)
//   POST /api/letters/mine            { credential }  -> this visitor's own notes and their status
//   GET  /api/letters/admin           owner (X-Forest-Admin): everything, with names and emails
//   POST /api/letters/admin           owner: { action: approve|decline|delete|block|unblock, id?, sub? }
//   GET  /api/letters/reply?id=&who=&text=&k=   the brain posting a reply (k = NOTES_KEY)
//
// Cloudflare settings: GOOGLE_CLIENT_ID (plain text), NOTES_KEY (secret), OWNER_KEY / ADMIN_KEY (existing).
// Storage: the PHOTO_KV namespace (keys letter:*, letters:public, lban:*, lday:*).
import { isOwner, json, sameText } from '../notes.js';

const MAX_TEXT = 600, PER_DAY = 3, MAX_PENDING = 5;
const WHO = ['token', 'gage'];

function clean(t, n) { return String(t == null ? '' : t).replace(/\r/g, '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, n); }
function first(name, email) { const f = clean(name, 60).split(/\s+/)[0] || clean(email, 80).split('@')[0] || 'A visitor'; return f.replace(/[^\p{L}\p{N}'\-.]/gu, '').slice(0, 24) || 'A visitor'; }
async function verify(cred, env) {
  if (!env.GOOGLE_CLIENT_ID) return { err: 'Sign-in is not switched on yet.' };
  if (typeof cred !== 'string' || cred.length < 100 || cred.length > 5000) return { err: 'Please sign in again.' };
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(cred));
  if (!r.ok) return { err: 'Please sign in again.' };
  const t = await r.json();
  if (t.aud !== env.GOOGLE_CLIENT_ID || !/^(https:\/\/)?accounts\.google\.com$/.test(t.iss || '') || !(Number(t.exp) * 1000 > Date.now()) || !t.sub) return { err: 'Please sign in again.' };
  return { sub: String(t.sub), email: String(t.email || ''), name: String(t.name || ''), first: first(t.given_name || t.name, t.email) };
}
async function allLetters(env) {
  const out = []; let cursor;
  for (let p = 0; p < 5; p++) { const r = await env.PHOTO_KV.list({ prefix: 'letter:', cursor, limit: 1000 }); out.push(...r.keys); if (r.list_complete) break; cursor = r.cursor; }
  const vals = await Promise.all(out.map(k => env.PHOTO_KV.get(k.name, { type: 'json' })));
  return vals.filter(Boolean).sort((a, b) => b.at.localeCompare(a.at));
}
function pub(l) { return { id: l.id, to: l.to, from: l.first, text: l.text, at: l.at, approvedAt: l.approvedAt || '', reply: l.reply || {}, replyAt: l.replyAt || {} }; }
async function rebuildPublic(env) {
  const all = await allLetters(env);
  const list = all.filter(l => l.status === 'approved').slice(0, 200).map(pub);
  await env.PHOTO_KV.put('letters:public', JSON.stringify({ updatedAt: new Date().toISOString(), letters: list }));
  return list;
}

export async function onRequest(ctx) {
  try { return await route(ctx); }
  catch (e) { console.log('letters crash', e && e.stack); return json({ error: 'Something went wrong. Try again in a moment.' }, 500); }
}

async function route({ request, env, params }) {
  if (!env.PHOTO_KV) return json({ error: 'Notes are not set up.' }, 424);
  const path = (params.path || []).join('/'), m = request.method;

  if (path === '' && m === 'GET') {
    const v = await env.PHOTO_KV.get('letters:public');
    return new Response(v || JSON.stringify({ updatedAt: '', letters: [] }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
  if (path === 'config' && m === 'GET') return json({ clientId: env.GOOGLE_CLIENT_ID || '', on: !!env.GOOGLE_CLIENT_ID });

  if (path === '' && m === 'POST') {
    let b; try { b = await request.json(); } catch (e) { return json({ error: 'Bad request.' }, 400); }
    const who = await verify(b && b.credential, env); if (who.err) return json({ error: who.err, signin: true }, 401);
    if (await env.PHOTO_KV.get('lban:' + who.sub)) return json({ error: 'Notes from this account are not being accepted.' }, 403);
    const to = b.to === 'both' ? ['token', 'gage'] : WHO.includes(b.to) ? [b.to] : null;
    const text = clean(b.text, MAX_TEXT);
    if (!to) return json({ error: 'Choose Token, Gage, or both.' }, 400);
    if (text.length < 2) return json({ error: 'Write a few words first.' }, 400);
    const day = new Date().toISOString().slice(0, 10), dk = 'lday:' + day + ':' + who.sub, n = parseInt((await env.PHOTO_KV.get(dk)) || '0', 10);
    if (n >= PER_DAY) return json({ error: 'That is ' + PER_DAY + ' notes today. Come back tomorrow.' }, 429);
    const mine = (await allLetters(env)).filter(l => l.sub === who.sub && l.status === 'pending');
    if (mine.length >= MAX_PENDING) return json({ error: 'You have ' + MAX_PENDING + ' notes waiting for approval already.' }, 429);
    const at = new Date().toISOString(), id = 'l' + at.replace(/[-:.TZ]/g, '').slice(0, 14) + crypto.randomUUID().slice(0, 6);
    const l = { id, to, text, at, status: 'pending', sub: who.sub, email: who.email, name: who.name, first: who.first, reply: {}, replyAt: {} };
    await env.PHOTO_KV.put('letter:' + id, JSON.stringify(l), { metadata: { status: 'pending', sub: who.sub } });
    await env.PHOTO_KV.put(dk, String(n + 1), { expirationTtl: 172800 });
    return json({ ok: true, letter: { id, to, text, at, status: 'pending', from: who.first } });
  }
  if (path === 'mine' && m === 'POST') {
    let b; try { b = await request.json(); } catch (e) { return json({ error: 'Bad request.' }, 400); }
    const who = await verify(b && b.credential, env); if (who.err) return json({ error: who.err, signin: true }, 401);
    const mine = (await allLetters(env)).filter(l => l.sub === who.sub).slice(0, 30).map(l => ({ ...pub(l), status: l.status === 'declined' ? 'not approved' : l.status }));
    return json({ name: who.first, letters: mine });
  }

  if (path === 'reply' && m === 'GET') {
    const u = new URL(request.url), k = u.searchParams.get('k') || request.headers.get('X-Forest-Sync') || '';
    if (!env.NOTES_KEY || !sameText(k.trim(), String(env.NOTES_KEY).trim())) return json({ error: 'Not allowed.' }, 403);
    const id = clean(u.searchParams.get('id'), 40), w = u.searchParams.get('who'), text = clean(u.searchParams.get('text'), 2000);
    if (!WHO.includes(w) || !text) return json({ error: 'Bad reply.' }, 400);
    const l = await env.PHOTO_KV.get('letter:' + id, { type: 'json' });
    if (!l || l.status !== 'approved' || !l.to.includes(w)) return json({ error: 'No such note.' }, 404);
    l.reply = l.reply || {}; l.replyAt = l.replyAt || {}; l.reply[w] = text; l.replyAt[w] = new Date().toISOString();
    await env.PHOTO_KV.put('letter:' + id, JSON.stringify(l), { metadata: { status: l.status, sub: l.sub } });
    await rebuildPublic(env);
    return json({ ok: true, id, who: w });
  }

  if (path === 'admin') {
    if (!isOwner(request, env)) return json({ error: 'Only the forest\'s keeper can do that. Open tokensforest.com/#admin=<your passphrase> on this device once.' }, 403);
    if (m === 'GET') {
      const all = await allLetters(env), bans = [];
      let cursor; for (let p = 0; p < 3; p++) { const r = await env.PHOTO_KV.list({ prefix: 'lban:', cursor }); bans.push(...r.keys.map(k => k.name.slice(5))); if (r.list_complete) break; cursor = r.cursor; }
      return json({ letters: all, blocked: bans, on: !!env.GOOGLE_CLIENT_ID, replies: !!env.NOTES_KEY });
    }
    if (m === 'POST') {
      let b; try { b = await request.json(); } catch (e) { return json({ error: 'Bad request.' }, 400); }
      const a = b && b.action;
      if (a === 'block' || a === 'unblock') {
        const sub = clean(b.sub, 64); if (!sub) return json({ error: 'Who?' }, 400);
        if (a === 'block') { await env.PHOTO_KV.put('lban:' + sub, '1');
          for (const l of (await allLetters(env)).filter(x => x.sub === sub && x.status === 'pending')) { l.status = 'declined'; await env.PHOTO_KV.put('letter:' + l.id, JSON.stringify(l), { metadata: { status: l.status, sub } }); }
        } else await env.PHOTO_KV.delete('lban:' + sub);
        await rebuildPublic(env); return json({ ok: true });
      }
      const id = clean(b.id, 40), l = await env.PHOTO_KV.get('letter:' + id, { type: 'json' });
      if (!l) return json({ error: 'No such note.' }, 404);
      if (a === 'delete') await env.PHOTO_KV.delete('letter:' + id);
      else if (a === 'approve' || a === 'decline') { l.status = a === 'approve' ? 'approved' : 'declined'; if (a === 'approve') l.approvedAt = new Date().toISOString(); await env.PHOTO_KV.put('letter:' + id, JSON.stringify(l), { metadata: { status: l.status, sub: l.sub } }); }
      else return json({ error: 'Unknown action.' }, 400);
      await rebuildPublic(env); return json({ ok: true });
    }
  }
  return json({ error: 'Not found.' }, 404);
}
