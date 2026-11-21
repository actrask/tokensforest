// GET /api/photos: every photo the forest camera has saved, newest first.
export async function onRequestGet({ env }) {
  const out = [];
  if (env.PHOTO_KV) {
    let cursor;
    for (let page = 0; page < 5; page++) {
      const r = await env.PHOTO_KV.list({ prefix: 'img:', cursor, limit: 1000 });
      for (const k of r.keys) {
        const id = k.name.slice(4), m = k.metadata || {};
        out.push({ id, url: '/api/photo/' + id + '.jpg', who: m.who || '', at: m.at || '', model: m.model || '' });
      }
      if (r.list_complete) break;
      cursor = r.cursor;
    }
  }
  out.sort((a, b) => (b.at || b.id).localeCompare(a.at || a.id));
  return new Response(JSON.stringify({ photos: out }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
