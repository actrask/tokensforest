// Cloudflare Pages Function: POST /api/photoreal
// Takes a JPEG frame from the page and returns a photoreal re-render from
// fal.ai Flux Kontext Pro. The fal key stays here on the server, never in the page.
//
// Settings in the Cloudflare Pages project (Settings > Variables and Secrets / Bindings):
//   FAL_KEY      secret, your fal.ai API key (required)
//   PHOTO_KV     KV namespace binding, used for the daily caps (required, so a
//                stranger can't run up your fal bill)
//   DAILY_LIMIT  optional, photos per day for the whole site (default 25)
//   IP_LIMIT     optional, photos per day per visitor (default 5)

const MODEL_URL = 'https://fal.run/fal-ai/flux-pro/kontext';

const PROMPT =
  'Re-render this exact scene as a real photograph. Keep the composition, camera angle, ' +
  'framing and every object exactly where it is. Keep each character\'s design, shape, ' +
  'proportions, colors and face exactly as drawn, rendered as real physical materials. ' +
  'Replace the ink outlines and crosshatching with true photographic materials: real tree bark, ' +
  'wet river stones, moving water with natural reflections, canvas, weathered wood, metal, ' +
  'grass and ferns. Natural light with soft atmospheric haze, shot on a 35mm lens at f/2.8, ' +
  'natural color grading, shallow depth of field. No outlines, no hatching, no illustration or cartoon style.';

const ASPECTS = ['21:9', '16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16', '9:21'];

const ALLOWED_HOSTS = [/^tokensforest\.com$/, /^www\.tokensforest\.com$/, /\.?tokensforest\.pages\.dev$/, /^localhost$/, /^127\.0\.0\.1$/];

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

export async function onRequestPost(ctx) {
  try { return await handle(ctx); }
  catch (e) { console.log('photoreal crash', e && e.stack); return json({ error: 'The photo did not develop. Try again in a moment.', detail: String(e && e.message || e).slice(0, 200) }, 422); }
}

async function handle({ request, env }) {
  if (!env.FAL_KEY) return json({ error: 'The camera is not switched on yet.' }, 424);
  if (!env.PHOTO_KV) return json({ error: 'The camera is missing its daily limit setting.' }, 424);

  // only answer the forest's own pages
  let host = '';
  try { host = new URL(request.headers.get('Origin') || request.headers.get('Referer') || '').hostname; } catch (e) {}
  if (!ALLOWED_HOSTS.some(r => r.test(host))) return json({ error: 'Not allowed.' }, 403);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Bad request.' }, 400); }
  const image = body && body.image;
  if (typeof image !== 'string' || !image.startsWith('data:image/jpeg;base64,') || image.length > 4_000_000) {
    return json({ error: 'Bad image.' }, 400);
  }
  const aspect = ASPECTS.includes(body.aspect) ? body.aspect : '16:9';

  // daily caps, whole site and per visitor
  const day = new Date().toISOString().slice(0, 10);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const siteKey = `site:${day}`, ipKey = `ip:${day}:${ip}`;
  const [siteN, ipN] = await Promise.all([env.PHOTO_KV.get(siteKey), env.PHOTO_KV.get(ipKey)]).then(v => v.map(x => parseInt(x || '0', 10)));
  const siteMax = parseInt(env.DAILY_LIMIT || '25', 10), ipMax = parseInt(env.IP_LIMIT || '5', 10);
  if (siteN >= siteMax) return json({ error: 'The forest camera has taken all its photos for today. Try again tomorrow.' }, 429);
  if (ipN >= ipMax) return json({ error: 'You have used all your photos for today. Try again tomorrow.' }, 429);
  await Promise.all([
    env.PHOTO_KV.put(siteKey, String(siteN + 1), { expirationTtl: 172800 }),
    env.PHOTO_KV.put(ipKey, String(ipN + 1), { expirationTtl: 172800 }),
  ]);

  const r = await fetch(MODEL_URL, {
    method: 'POST',
    headers: { Authorization: `Key ${env.FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: PROMPT, image_url: image, aspect_ratio: aspect, guidance_scale: 3.5, output_format: 'jpeg', num_images: 1, safety_tolerance: '2' }),
  });
  if (!r.ok) {
    const detail = (await r.text()).slice(0, 300);
    console.log('fal error', r.status, detail);
    return json({ error: 'The photo did not develop. Try again in a moment.', detail: `fal ${r.status}: ${detail.slice(0, 160)}` }, 424);
  }
  const out = await r.json();
  const url = out && out.images && out.images[0] && out.images[0].url;
  if (!url) return json({ error: 'The photo did not develop. Try again in a moment.' }, 424);
  return json({ url, left: Math.max(0, ipMax - ipN - 1) });
}

export function onRequest() {
  return json({ error: 'Use POST.' }, 405);
}
