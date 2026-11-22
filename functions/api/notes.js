// /api/notes: Cam's notes to Token and Gage from the public site.
//   GET  (owner or brain): { history: [...notes with replies], pending: [...not yet picked up by the brain] }
//   POST (owner): { to: 'token' | 'gage', text } -> queued until the hourly brain files it as a creator note
// Keys (Cloudflare secrets): OWNER_KEY / ADMIN_KEY for Cam's devices (header X-Forest-Admin),
// NOTES_KEY (or SYNC_KEY) for the hourly brain (header X-Forest-Sync). Storage: the PHOTO_KV namespace.

export function sameText(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0;
}
export function isOwner(request, env) {
  const g = (request.headers.get('X-Forest-Admin') || '').trim();
  return !!g && [env.OWNER_KEY, env.ADMIN_KEY].some(k => typeof k === 'string' && sameText(g, k.trim()));
}
export function isSync(request, env) {
  const g = (request.headers.get('X-Forest-Sync') || '').trim();
  return !!g && [env.NOTES_KEY, env.SYNC_KEY].some(k => typeof k === 'string' && k.trim() && sameText(g, k.trim()));
}
export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
export async function pendingNotes(env) {
  const r = await env.PHOTO_KV.list({ prefix: 'note:', limit: 200 });
  const out = [];
  for (const k of r.keys) { const v = await env.PHOTO_KV.get(k.name, { type: 'json' }); if (v) out.push(v); }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

export async function onRequestGet({ request, env }) {
  if (!env.PHOTO_KV) return json({ error: 'Notes are not set up.' }, 424);
  if (!isOwner(request, env) && !isSync(request, env)) return json({ error: 'Notes are private.' }, 403);
  const history = (await env.PHOTO_KV.get('notes:history', { type: 'json' })) || [];
  const syncedAt = (await env.PHOTO_KV.get('notes:syncedAt')) || '';
  return json({ history, pending: await pendingNotes(env), syncedAt });
}

export async function onRequestPost({ request, env }) {
  if (!env.PHOTO_KV) return json({ error: 'Notes are not set up.' }, 424);
  if (!isOwner(request, env)) return json({ error: 'Only the forest\'s maker can leave notes here.' }, 403);
  let b; try { b = await request.json(); } catch (e) { return json({ error: 'Bad request.' }, 400); }
  const to = b && (b.to === 'gage' ? 'gage' : b.to === 'token' ? 'token' : '');
  const text = String((b && b.text) || '').replace(/\r/g, '').trim().slice(0, 2000);
  if (!to || !text) return json({ error: 'Pick Token or Gage and write something.' }, 400);
  const at = new Date().toISOString();
  const id = 'cam-web-' + at.replace(/[-:.TZ]/g, '').slice(0, 14) + '-' + crypto.randomUUID().slice(0, 6);
  const note = { id, to, text, at, from: 'Cam' };
  await env.PHOTO_KV.put('note:' + id, JSON.stringify(note));
  return json({ ok: true, note });
}
