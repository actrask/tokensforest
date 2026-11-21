// GET /api/photo/<id>: a saved photo from the forest camera, kept in the PHOTO_KV namespace.
export async function onRequestGet({ params, env }) {
  const id = String(params.id || '').replace(/\.jpg$/, '');
  if (!/^[a-z0-9-]{6,64}$/.test(id) || !env.PHOTO_KV) return new Response('Not found', { status: 404 });
  const img = await env.PHOTO_KV.get('img:' + id, { type: 'arrayBuffer' });
  if (!img) return new Response('Not found', { status: 404 });
  return new Response(img, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
