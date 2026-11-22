// TEMPORARY test endpoint: logs every request that reaches it, so we can see what a Claude artifact page is allowed to do.
//   GET /api/ping?list=1  -> the last 50 hits.   Any other request -> logged, answered with CORS open.
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS } }); }
export async function onRequest({ request, env }) {
  const u = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (u.searchParams.get('list')) {
    const r = await env.PHOTO_KV.list({ prefix: 'ping:' }); const out = [];
    for (const k of r.keys.slice(-50)) out.push(await env.PHOTO_KV.get(k.name, { type: 'json' }));
    return json({ hits: out });
  }
  let body = ''; try { body = (await request.text()).slice(0, 300); } catch (e) {}
  const hit = { at: new Date().toISOString(), method: request.method, t: u.searchParams.get('t') || '', origin: request.headers.get('Origin') || '', referer: (request.headers.get('Referer') || '').slice(0, 120), body };
  await env.PHOTO_KV.put('ping:' + hit.at + ':' + crypto.randomUUID().slice(0, 4), JSON.stringify(hit), { expirationTtl: 7 * 86400 });
  if (u.searchParams.get('img')) return new Response(Uint8Array.from(atob('R0lGODlhAQABAAAAACw='), c => c.charCodeAt(0)), { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store', ...CORS } });
  return json({ ok: true, got: hit });
}
