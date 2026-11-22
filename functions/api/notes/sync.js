// POST /api/notes/sync (hourly brain only, header X-Forest-Sync):
//   { history: [{id,to,text,at,read,readAt,reply}], imported: [ids filed as creator notes] }
import { isSync, json } from '../notes.js';

export async function onRequestPost({ request, env }) {
  if (!env.PHOTO_KV) return json({ error: 'Notes are not set up.' }, 424);
  if (!isSync(request, env)) return json({ error: 'Not allowed.' }, 403);
  let b; try { b = await request.json(); } catch (e) { return json({ error: 'Bad request.' }, 400); }
  const clip = (v, n) => (v == null ? '' : String(v)).slice(0, n);
  if (Array.isArray(b.history)) {
    const h = b.history.slice(0, 80).map(n => ({ id: clip(n.id, 80), to: n.to === 'gage' ? 'gage' : 'token', text: clip(n.text, 2000), at: clip(n.at, 40),
      read: !!n.read, readAt: clip(n.readAt, 40), reply: clip(n.reply, 2000) })).filter(n => n.id && n.text);
    await env.PHOTO_KV.put('notes:history', JSON.stringify(h));
    await env.PHOTO_KV.put('notes:syncedAt', new Date().toISOString());
  }
  const imported = Array.isArray(b.imported) ? b.imported.slice(0, 200) : [];
  for (const id of imported) await env.PHOTO_KV.delete('note:' + clip(id, 80));
  return json({ ok: true, imported: imported.length });
}
