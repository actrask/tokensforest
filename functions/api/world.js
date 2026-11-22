// /api/world: the public copy of the forest, refreshed whenever Cam taps "Sync to tokensforest.com" in the Claude artifact.
//   GET  (anyone): { exportedAt, syncedAt, docs }  (no notes: those stay private)
//   POST (owner, header X-Forest-Admin): the artifact's snapshot { exportedAt, docs }. creator_notes/* and inbox/* are split out
//        into the private notes history; everything else becomes the public world.
import { isOwner, json } from './notes.js';

export async function onRequestGet({ env }) {
  const w = env.PHOTO_KV && await env.PHOTO_KV.get('world:snapshot');
  if (!w) return json({ error: 'No synced world yet.' }, 404);
  return new Response(w, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

export async function onRequestPost({ request, env }) {
  if (!env.PHOTO_KV) return json({ error: 'Storage is not set up.' }, 424);
  if (!isOwner(request, env)) return json({ error: 'Only the forest\'s maker can sync the world. Open tokensforest.com/#admin=<your passphrase> on this device once.' }, 403);
  let snap; try { snap = await request.json(); } catch (e) { return json({ error: 'The world did not arrive in one piece.' }, 400); }
  if (!snap || typeof snap.docs !== 'object') return json({ error: 'That is not a world snapshot.' }, 400);
  const pub = {}, notes = [];
  for (const [k, v] of Object.entries(snap.docs)) {
    if (k.startsWith('creator_notes/')) { if (v && v.text) notes.push({ id: k.slice(14), to: v.to === 'gage' ? 'gage' : 'token', text: String(v.text).slice(0, 2000), at: String(v.at || ''), read: !!v.read, readAt: String(v.readAt || ''), reply: String(v.reply || '').slice(0, 2000) }); }
    else if (k.startsWith('inbox/')) { /* visitor notes stay private and are not published */ }
    else pub[k] = v;
  }
  const syncedAt = new Date().toISOString();
  const body = JSON.stringify({ exportedAt: snap.exportedAt || syncedAt, syncedAt, docs: pub });
  await env.PHOTO_KV.put('world:snapshot', body);
  if (notes.length) {
    notes.sort((a, b) => b.at.localeCompare(a.at));
    await env.PHOTO_KV.put('notes:history', JSON.stringify(notes.slice(0, 80)));
    await env.PHOTO_KV.put('notes:syncedAt', syncedAt);
  }
  return json({ ok: true, docs: Object.keys(pub).length, notes: notes.length, kb: Math.round(body.length / 1024), exportedAt: snap.exportedAt || '' });
}
