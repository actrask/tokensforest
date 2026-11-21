// /api/develop/<key>.jpg : a picture Token or Gage took with his pinhole camera, made into a real photograph.
// GET  returns the stored photograph (404 until one exists).
// POST {image, aspect, who, caption} makes it once from the page's developed pinhole sheet and stores it,
//      so every visitor sees the same photograph and the generator runs once per picture, ever.
// Uses the same FAL_KEY and PHOTO_KV as /api/photoreal. Optional DEVELOP_LIMIT caps new photographs per day (default 12).

const ALLOWED_HOSTS = [/^tokensforest\.com$/, /^www\.tokensforest\.com$/, /\.?tokensforest\.pages\.dev$/, /^localhost$/, /^127\.0\.0\.1$/];
const ASPECTS = ['21:9', '16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16', '9:21'];
const KEY_RE = /^(token|gage)-[a-z0-9-]{3,48}$/;

const PROMPT =
  'This is a picture taken in a forest with a small homemade wooden pinhole camera: a box with a pin-sized hole and no lens, exposed onto a sheet of paper. ' +
  'Turn it into the real photograph that camera would have made of this real place. Keep the exact framing, angle, composition and every object, tree, plant, stone, fire, light and figure exactly where it is; ' +
  'rebuild everything as real, life-size physical things in a real ancient forest of towering redwood-like trunks with deeply furrowed bark. ' +
  'It must look like a genuine pinhole photograph: soft all over with no sharp focus anywhere, gentle glow around bright areas, strong dark vignetting toward the corners, ' +
  'warm sepia-brown monochrome like an old paper print, fine grain, slight unevenness of a hand-developed sheet. Anything soft or smeared in the frame stays soft or smeared. ' +
  'Match the light and time of day in the frame. Do not add or remove any person, creature or object, no text, no border, no frame, no outlines, no illustration or cartoon look. ' +
  'If Gage appears (a youthful tinkerer with big round brass goggles and stiff spiky hair, wooden clogs), he is a real young person; ' +
  'if Token appears (a small gentle creature with a large round smooth head, two very large dark teardrop eyes, a small turtle-like shell, slender limbs, no fur), he is a real living creature of his own kind.';

function json(obj, status = 200) { return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }); }
function keyOf(params) { const k = String(params.key || '').replace(/\.jpg$/, '').toLowerCase(); return KEY_RE.test(k) ? k : ''; }
function clean(t) { return String(t || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140); }

export async function onRequestGet({ params, env }) {
  const k = keyOf(params); if (!k || !env.PHOTO_KV) return new Response('Not found', { status: 404 });
  const img = await env.PHOTO_KV.get('dev:' + k, { type: 'arrayBuffer' });
  if (!img) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  return new Response(img, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable', 'Access-Control-Allow-Origin': '*' } });
}

export async function onRequestPost({ params, request, env }) {
  try {
    const k = keyOf(params); if (!k) return json({ error: 'Bad picture.' }, 400);
    if (!env.FAL_KEY || !env.PHOTO_KV) return json({ error: 'Not switched on.' }, 424);
    let host = ''; try { host = new URL(request.headers.get('Origin') || request.headers.get('Referer') || '').hostname; } catch (e) {}
    if (!ALLOWED_HOSTS.some(r => r.test(host))) return json({ error: 'Not allowed.' }, 403);
    if (await env.PHOTO_KV.get('dev:' + k, { type: 'stream' })) return json({ url: '/api/develop/' + k + '.jpg', cached: true });
    // only one visitor at a time makes a given picture
    if (await env.PHOTO_KV.get('devlock:' + k)) return json({ error: 'Developing.' }, 409);
    let body; try { body = await request.json(); } catch (e) { return json({ error: 'Bad request.' }, 400); }
    const image = body && body.image;
    if (typeof image !== 'string' || !image.startsWith('data:image/jpeg;base64,') || image.length > 3_000_000) return json({ error: 'Bad image.' }, 400);
    const day = new Date().toISOString().slice(0, 10), dk = 'devday:' + day, n = parseInt((await env.PHOTO_KV.get(dk)) || '0', 10), max = parseInt(env.DEVELOP_LIMIT || '12', 10);
    if (n >= max) return json({ error: 'Enough for today.' }, 429);
    await Promise.all([env.PHOTO_KV.put(dk, String(n + 1), { expirationTtl: 172800 }), env.PHOTO_KV.put('devlock:' + k, '1', { expirationTtl: 180 })]);
    const aspect = ASPECTS.includes(body.aspect) ? body.aspect : '4:3';
    const prompt = (body.caption ? 'What he meant to keep: ' + clean(body.caption) + '. ' : '') + PROMPT;
    const r = await fetch('https://fal.run/fal-ai/nano-banana-pro/edit', {
      method: 'POST', headers: { Authorization: `Key ${env.FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, image_urls: [image], aspect_ratio: aspect, resolution: '1K', output_format: 'jpeg', num_images: 1 }),
    });
    if (!r.ok) { const d = (await r.text()).slice(0, 200); console.log('develop fal', r.status, d); await env.PHOTO_KV.delete('devlock:' + k); return json({ error: 'Did not develop.', detail: d.slice(0, 120) }, 424); }
    const out = await r.json(), url = out && out.images && out.images[0] && out.images[0].url;
    if (!url) { await env.PHOTO_KV.delete('devlock:' + k); return json({ error: 'Did not develop.' }, 424); }
    const got = await fetch(url); if (!got.ok) { await env.PHOTO_KV.delete('devlock:' + k); return json({ error: 'Did not develop.' }, 424); }
    await env.PHOTO_KV.put('dev:' + k, await got.arrayBuffer(), { metadata: { who: body.who === 'gage' ? 'gage' : 'token', at: new Date().toISOString() } });
    await env.PHOTO_KV.delete('devlock:' + k);
    return json({ url: '/api/develop/' + k + '.jpg' });
  } catch (e) { console.log('develop crash', e && e.stack); return json({ error: 'Did not develop.' }, 422); }
}
