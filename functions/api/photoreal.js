// Cloudflare Pages Function: POST /api/photoreal
// Takes a JPEG frame from the page and returns a photoreal re-render from
// fal.ai (Nano Banana Pro by default; Seedream and Flux Kontext Pro also wired in). The fal key stays here on the server, never in the page.
//
// Settings in the Cloudflare Pages project (Settings > Variables and Secrets / Bindings):
//   FAL_KEY      secret, your fal.ai API key (required)
//   PHOTO_KV     KV namespace binding, used for the daily caps (required, so a
//                stranger can't run up your fal bill)
//   DAILY_LIMIT  optional, photos per day for the whole site (no limit if unset)
//   IP_LIMIT     optional, photos per day per visitor (no limit if unset)
//   OWNER_KEY    optional secret passphrase (ADMIN_KEY also accepted); a device that opened tokensforest.com/#admin=<passphrase>
//                once sends it with each photo and skips both daily limits

const PROMPT =
  'Turn this frame into a single still from a major live-action feature film, photographed on location by a world-class cinematographer ' +
  '(Roger Deakins, Emmanuel Lubezki) on an ARRI Alexa with anamorphic lenses. It must look like a real photograph of a real place, not CG, not animation. ' +
  'Keep the same place, the same characters with their exact designs and what they are doing, and the key props that tell the story ' +
  '(shelter, fire, lantern, workbench, bed). Keep the general viewpoint and the characters\' poses; you may recompose slightly the way a cinematographer would, ' +
  'with the camera at the character\'s eye level and minor clutter left out. ' +
  'If the frame is indoors, inside a room or the hollow of a tree, it stays indoors with its walls and furniture; never move the scene outdoors or to water, ' +
  'and never add vehicles, boats or new furniture. ' +
  'Realism is for the world, the light and the materials, not the character designs. The characters keep their stylized designs exactly as drawn: ' +
  'the same exaggerated proportions, head size, eye or goggle size, hair shape and body shape as in the frame and the maker\'s sketches. ' +
  'Never turn them into realistic humans, human children or animals, and never into dolls, puppets, figurines or toys. ' +
  'Render them the way a top VFX studio brings a stylized character into a live-action film (like Paddington or Detective Pikachu): ' +
  'the design untouched, but with real, physically convincing skin, fabric, metal and wood, weight, contact shadows and natural light on them. ' +
  'Everything is filmed at full scale. ' +
  'Normal cinema depth of field for a full-size scene, background softly out of focus; never macro, tilt-shift, diorama or miniature-looking. ' +
  'Light: naturalistic and motivated, with real contrast and deep shadows. Outdoors by day, soft directional sunlight filtered through the canopy, ' +
  'gentle haze in the distance; do not put a sunburst or starburst in the frame and do not make light glow. At night or indoors, warm firelight, lantern ' +
  'and candle light falling off into real darkness. Match the time of day and weather given. ' +
  'Texture: everything tangible, imperfect and lived-in: weathered wood, worn canvas, real towering redwood bark, dark soil with needles and debris. ' +
  'Blankets and bedding are dense, thick wool. ' +
  'Color: restrained, natural film color, slightly muted, true exposure, fine film grain. Never saturated, glossy, HDR, glowing, cute or storybook. ' +
  'No outlines, ink lines or crosshatching. ' +
  'Do not add any people, creatures, robots or characters that are not already in the frame, and do not remove any that are.';

// art notes per character, applied whenever they could be in the frame
const CHARACTER_NOTES =
  'Character notes: Gage is a stylized young tinkerer, not a realistic human boy. His design: an oversized, round head about as large as his whole torso; ' +
  'huge round brass-framed goggles with smoked, darkly tinted lenses covering most of his face, his eyes only faintly visible behind them; ' +
  'a few large, sharp, dramatic spikes of hair swept up and back from his head, stiff and pointed, real hair but never a soft or messy mop; ' +
  'a small face with a small nose and mouth, smooth young skin with no wrinkles; a small, slender body with thin arms and legs; ' +
  'a buttoned work shirt with a belt and tool pouches; and large, rounded clog shoes carved from smooth, solid wood with visible grain. ' +
  'Only his goggle frames, buckles and tools are metal; his clothes are real cloth and leather. ' +
  'Token is a small, gentle forest creature of his own kind, not a bear, animal, robot, alien or person: a large, perfectly round, smooth head; ' +
  'two very large teardrop-shaped eyes, each about a quarter of the width of his face, the rounded end low and the soft point rising toward the inner brow, ' +
  'glossy and dark with warm brown irises and soft highlights; when he sleeps the closed lids keep that same large teardrop outline, never small human slits; ' +
  'no ears, no fur, no hair, no visible nose; smooth, pale, softly matte living skin; a thin neck; a small rounded shell on his back like a turtle\'s; ' +
  'slender arms and legs; large, flat, rounded feet; often a long slender pale-wood staff. When he is in bed, only his round smooth head shows above the blankets.';

function clean(t) { return String(t || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160); }

function promptFor(who, scene, clock) {
  const lead = who === 'gage' ? 'This frame is from Gage\'s view; Gage is the main character. ' :
               who === 'token' ? 'This frame is from Token\'s view; Token is the main character. ' : '';
  const ctx = (scene ? 'What is happening: ' + clean(scene) + '. ' : '') + (clock ? 'Time and weather in the forest: ' + clean(clock) + '. ' : '');
  return lead + ctx + PROMPT + ' ' + CHARACTER_NOTES;
}

// the maker's sketches, sent as extra reference images to models that take several images
const SKETCHES = {
  token: ['sketches/token_portrait.jpg', 'sketches/token_turnaround.jpg'],
  gage: ['sketches/gage_film_ref.jpg', 'sketches/gage_goggles.jpg', 'sketches/gage_turnaround.jpg'],
};
const REF_NOTE = {
  token: ' The first image is the frame to turn into a photo. The other images are the maker\'s pencil sketches of Token: match his head shape, eye shape and size, face and proportions to these sketches exactly, but take everything else (pose, framing, setting, light) only from the first image, and do not copy the pencil style.',
  gage: ' The first image is the frame to turn into a photo. The second image is the approved film look for Gage: when Gage appears, make him look exactly like he does in that photo (same face, head shape, goggles, hair, clothes, wooden shoes, skin and materials, same live-action finish). The remaining images are the maker\'s pencil sketches of Gage, for his design only. Take everything else (pose, framing, setting, time of day, light) only from the first image; do not copy the second image\'s pose, camp or background, and do not copy the pencil style.',
};

// model choices; the page sends one of these keys (default first)
const MODELS = {
  kontext: { url: 'https://fal.run/fal-ai/flux-pro/kontext', body: (img, aspect, prompt) => ({ prompt, image_url: img, aspect_ratio: aspect, guidance_scale: 4, output_format: 'jpeg', num_images: 1, safety_tolerance: '2' }) },
  nanopro: { url: 'https://fal.run/fal-ai/nano-banana-pro/edit', refs: true, body: (img, aspect, prompt, refs, refWho) => ({ prompt: refs.length ? prompt + (REF_NOTE[refWho] || '') : prompt, image_urls: [img].concat(refs), aspect_ratio: aspect, resolution: '2K', output_format: 'jpeg', num_images: 1 }) },
  seedream: { url: 'https://fal.run/fal-ai/bytedance/seedream/v4/edit', body: (img, aspect, prompt) => ({ prompt, image_urls: [img], image_size: 'auto_2K', num_images: 1 }) },
};

const ASPECTS = ['21:9', '16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16', '9:21'];

const ALLOWED_HOSTS = [/^tokensforest\.com$/, /^www\.tokensforest\.com$/, /\.?tokensforest\.pages\.dev$/, /^localhost$/, /^127\.0\.0\.1$/];

function sameText(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0;
}

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
  // limits are off unless set in Cloudflare (DAILY_LIMIT / IP_LIMIT)
  const siteMax = env.DAILY_LIMIT ? parseInt(env.DAILY_LIMIT, 10) : Infinity, ipMax = env.IP_LIMIT ? parseInt(env.IP_LIMIT, 10) : Infinity;
  const given = (request.headers.get('X-Forest-Admin') || '').trim();
  const admin = !!given && [env.OWNER_KEY, env.ADMIN_KEY].some(k => typeof k === 'string' && k.trim() && sameText(given, k.trim()));
  if (!admin && siteN >= siteMax) return json({ error: 'The forest camera has taken all its photos for today. Try again tomorrow.' }, 429);
  if (!admin && ipN >= ipMax) return json({ error: 'You have used all your photos for today. Try again tomorrow.' }, 429);
  if (!admin) await Promise.all([
    env.PHOTO_KV.put(siteKey, String(siteN + 1), { expirationTtl: 172800 }),
    env.PHOTO_KV.put(ipKey, String(ipN + 1), { expirationTtl: 172800 }),
  ]);

  const model = MODELS[body.model] ? body.model : 'nanopro';
  const m = MODELS[model];
  const r = await fetch(m.url, {
    method: 'POST',
    headers: { Authorization: `Key ${env.FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(m.body(image, aspect, promptFor(body.who, body.scene, body.clock), m.refs ? (SKETCHES[body.who] || []).map(f => new URL('/' + f, request.url).href) : [], body.who)),
  });
  if (!r.ok) {
    const detail = (await r.text()).slice(0, 300);
    console.log('fal error', r.status, detail);
    return json({ error: 'The photo did not develop. Try again in a moment.', detail: `fal ${r.status}: ${detail.slice(0, 160)}` }, 424);
  }
  const out = await r.json();
  const url = out && out.images && out.images[0] && out.images[0].url;
  if (!url) return json({ error: 'The photo did not develop. Try again in a moment.' }, 424);
  // keep a copy here so the photo outlives the model's temporary link
  let saved = url, id = '';
  try {
    const got = await fetch(url);
    if (got.ok) {
      const buf = await got.arrayBuffer();
      id = day.replace(/-/g, '') + '-' + crypto.randomUUID().slice(0, 12);
      await env.PHOTO_KV.put('img:' + id, buf, { metadata: { who: body.who || '', model, at: new Date().toISOString() } });
      saved = '/api/photo/' + id + '.jpg';
    }
  } catch (e) { console.log('photo save failed', e && e.message); }
  return json({ url: saved, id, model, left: ipMax === Infinity ? null : Math.max(0, ipMax - ipN - 1) });
}

export function onRequest() {
  return json({ error: 'Use POST.' }, 405);
}
