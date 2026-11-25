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
  'COMPOSITION IS LOCKED: this is a re-render of the exact same shot, as if the same 3D scene were rendered again by a film-quality renderer. ' +
  'Keep the identical camera position, height, angle, lens and crop; the same horizon line; every object, character, tree, rock, doorway and prop ' +
  'in the same place in the frame at the same size, with the same silhouette and the same amount of empty space around it. ' +
  'Do not reframe, zoom in, center, enlarge or move the subject closer, do not change the aspect of any object, and do not add or leave out props. ' +
  'If a character is small or far away in the frame, it stays small and far away. ' +
  'Depth is locked too: anything seen through a doorway, window or opening stays deep inside at the same distance and size, partly hidden by the frame of the opening; ' +
  'never pull a character, bed or furniture forward to the threshold or out of the doorway to show it off. ' +
  'Use only the light sources already in the frame; never add fires, candles, lamps or glows that are not there. ' +
  'If the frame is indoors, inside a room or the hollow of a tree, it stays indoors with its walls and furniture; never move the scene outdoors or to water, ' +
  'and never add vehicles, boats or new furniture. ' +
  'EVERY PIXEL IS RE-RENDERED: nothing in the result may still look like the game frame. Not one object, surface or patch of ground may keep its flat colors, smooth shading, ' +
  'outline strokes, drawn-on lines or paper texture; a partly real, partly game-looking image is a failure. Re-render the whole frame edge to edge with the same care as the main character. ' +
  'The game draws simple stand-ins; each must become its real counterpart, in the same place, size and silhouette: the pale smooth columns are colossal redwood trunks with deep furrowed ' +
  'red-brown bark, moss and lichen; the flat round canopies on stalks (lollipop shapes) are the leafy crowns of real forest trees seen against the sky; the smooth rounded dark mounds are dense ' +
  'real wild shrubs and bramble with individual leaves, ragged and irregular, never clipped, round topiary balls; the striped wavy-line logs are real fallen logs with cracked bark, moss and splits; the flat pale floor with scattered leaf shapes is real ' +
  'forest floor of damp soil, leaf litter, twigs and needles; the plain gray or tan disks and pucks are real stones, stumps or tins; flat ribbon grasses are real grass and ferns; ' +
  'smooth domed mushroom shapes are real mushrooms; the sky keeps its colors and cloud layout but becomes a real photographed sky. Wood looks like real wood, metal like metal, cloth like cloth. ' +
  'NOTHING PASSES THROUGH ANYTHING. The frame comes from a game engine, so a foot may sink into a log, a leg into a rock, a hand into a table, a body into the ground or a staff through a wall. ' +
  'Repair every such intersection the way a real photograph would show it: feet rest on top of the ground, rock or log, a body stands in front of or beside an object, hands touch surfaces without entering them, ' +
  'and objects are whole and solid. If feet or legs show on the near side of a log, rock or table while the body is behind it, the feet are wrong: '+
  'redraw the legs so the character stands fully behind the object (feet hidden by it) or sits on top of it. Keep each character in the same place; change only what is needed to fix the contact. ' +
  '@@STYLE@@ ' +
  'Everything is filmed at full scale. ' +
  'Normal cinema depth of field for a full-size scene, background softly out of focus; never macro, tilt-shift, diorama or miniature-looking. ' +
  'LIGHTING IS LOCKED to the frame too: copy its exact lighting and mood and make it photographic, never relight the scene a different way. ' +
  'Same sun direction and height, same overall brightness and exposure, same amount of open sky between the trees, same haze or fog density, ' +
  'every light shaft, glare, backlight, rim light, reflection on water or wet ground and bright or dark area exactly where it is in the frame. ' +
  'If the frame is bright, hazy and backlit, the photo is bright, hazy and backlit, with the same glowing atmosphere and volumetric beams; ' +
  'if it is dark, it stays dark. Never darken it, never close the canopy over open sky, never trade its light for a generic moody forest look. ' +
  'At night or indoors, the light comes only from the lanterns, candles and fires in the frame. ' +
  'THE HERO IS LIT LIKE A HERO: the main character is the star of this shot and is lit the way a film crew lights its lead, with the scene\'s sun as the key. ' +
  'When the sun is behind or beside him, give him a hot, bright, golden edge light: a crisp glowing rim that clearly outlines his whole silhouette, ' +
  'the hair blazing with light, a bright line along his ears, cheek, neck, shoulders, back, arms, hands and shoes, light catching the goggle rims, ' +
  'strong enough to be the brightest edge in the frame and to pop him off the background. Fill his face and front with warm bounce light from the sunlit ground ' +
  'so his expression and clothes read clearly. Never dark, murky, flat or filled in, never a silhouette; he is the most clearly lit, most readable thing in the shot. Being the star changes only his light, never his size, position or distance: he stays exactly as big and exactly where he is in the frame. ' +
  'Warmth: the whole image feels warm, the golden, honey-colored warmth of sunlight in a forest: warm highlights, warm haze, warm skin, golden light on wood and water, ' +
  'with only gentle cool tones in the deepest shadows. Never cold, gray, blue or desaturated. ' +
  'Texture: everything tangible, imperfect and lived-in: weathered wood, worn canvas, real towering redwood bark, dark soil with needles and debris. ' +
  'Blankets and bedding are dense, thick wool. ' +
  'Color: the frame\'s own palette pushed warm, as real film color, true exposure, fine film grain. Never oversaturated, glossy, HDR, cute or storybook. ' +
  'No outlines, ink lines or crosshatching. ' +
  'Do not add any people, creatures, robots or characters that are not already in the frame, and do not remove any that are.';

// how the characters themselves are rendered: the viewer picks Stylized or Realistic
const STYLE_TEXT = {
  stylized: 'Realism is for the world, the light and the materials, not the character designs. The characters keep their stylized designs exactly as drawn: ' +
    'the same exaggerated proportions, head size, eye or goggle size, hair shape and body shape as in the frame and the maker\'s sketches. ' +
    'Never turn them into realistic humans, human children or animals, and never into dolls, puppets, figurines or toys. ' +
    'Render them the way a top VFX studio brings a stylized character into a live-action film (like Paddington or Detective Pikachu): ' +
    'the design untouched, but with real, physically convincing skin, fabric, metal and wood, weight, contact shadows and natural light on them.',
  realistic: 'Everything is ultra-realistic, characters included: render each character as a real, living being photographed on set, with natural ' +
    'real-world proportions, real skin with pores and blemishes, real hair, real worn fabric, dirt and wear, like a gritty live-action period film. ' +
    'Keep each character\'s identity, costume and signature features (named in the character notes), but never stylized, cartoon, animated, doll or toy-like. ' +
    'REALISM CHANGES SURFACES, NEVER THE STAGING. This is a trace-over of the frame, not a new photo of a similar scene. Each character stays on the exact spot he occupies in the frame, ' +
    'at the same distance from the camera, facing the same way, with the same body pose, the same head tilt and the same direction of gaze; a character facing the camera with his head up ' +
    'still faces the camera with his head up. Only his anatomy becomes natural, around the same center point: do not sit him somewhere else, turn him, bow his head or re-pose his limbs. ' +
    'He wears and holds exactly what he wears and holds in the frame, the same way: goggles over the eyes stay over the eyes, covering them, whatever any reference photo shows. ' +
    'Every fire, lantern, table, crate, pile of stones, tool, pole and tree stays exactly where it is in the frame, the same size and the same count: a fire ring in the center foreground ' +
    'stays in the center foreground with the character behind it, a lantern glowing low down between the legs of a table stays low down between the legs, on the ground or lower shelf, and the tabletop above it stays without a lantern. Never add a prop, a second crate, loose tools or wheels, and never leave one out. ' +
    'Each tree keeps its own trunk width and its own silhouette: a slim trunk with a low leafy crown stays a slim tree with that crown, never a second giant redwood.',
};

const GAGE_NOTE = {
  stylized: 'Character notes: Gage is a stylized young tinkerer, not a realistic human boy. His design: an oversized, round head about as large as his whole torso; ' +
    'huge round brass-framed goggles with smoked, darkly tinted lenses covering most of his face, his eyes only faintly visible behind them; ' +
    'a few large, sharp, dramatic spikes of hair swept up and back from his head, stiff and pointed, real hair but never a soft or messy mop; ' +
    'a small face with a small nose and mouth, smooth young skin with no wrinkles; a small, slender body with thin arms and legs; ' +
    'a buttoned work shirt with a belt and tool pouches; and large, rounded clog shoes carved from smooth, solid wood with visible grain. ' +
    'Only his goggle frames, buckles and tools are metal; his clothes are real cloth and leather. ',
  realistic: 'Character notes: Gage is a real, living young forest kid of about ten with slightly pointed ears, a wild mop of stiff, spiky brown hair, ' +
    'a dirt-smudged face, worn brass goggles strapped over his eyes, the smoked lenses covering both eyes so his eyes are only faintly visible through the dark glass (never pushed up on his forehead or hair, even if a reference photo shows that), dusty, patched canvas work clothes, ' +
    'and big hand-carved wooden clogs with visible grain. ',
};
const TOKEN_NOTE =
  'Token is a small, gentle forest creature of his own kind, not a bear, animal, robot, alien or person: a large, perfectly round, smooth head; ' +
  'two very large teardrop-shaped eyes, each about a quarter of the width of his face, the rounded end low and the soft point rising toward the inner brow, ' +
  'glossy and dark with warm brown irises and soft highlights; when he sleeps the closed lids keep that same large teardrop outline, never small human slits; ' +
  'no ears, no fur, no hair, no visible nose. His skin is textured like a real turtle\'s, never smooth plastic, rubber or grey alien skin: fine pebbled scales, slightly leathery and dry, in warm pale sand and khaki tones with subtle olive mottling, the scales finest on his head and face and larger, more defined on his neck, arms and legs, with soft creases at the joints; a thin neck; on his back a small rounded shell like a real turtle\'s, with distinct scute plates, fine growth rings and natural horn-brown and amber tones; ' +
  'slender arms and legs; large, flat, rounded feet; often a long slender pale-wood staff. When he is in bed, only his round smooth head shows above the blankets.';

function clean(t) { return String(t || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160); }

function promptFor(who, scene, clock, style) {
  const lead = who === 'gage' ? 'This frame is from Gage\'s view; Gage is the main character. ' :
               who === 'token' ? 'This frame is from Token\'s view; Token is the main character. ' : '';
  const ctx = (scene ? 'What is happening: ' + clean(scene) + '. ' : '') + (clock ? 'Time and weather in the forest: ' + clean(clock) + '. ' : '');
  return lead + ctx + PROMPT.replace('@@STYLE@@', STYLE_TEXT[style]) + ' ' + GAGE_NOTE[style] + TOKEN_NOTE;
}

/* Directed shots (day films): the narration says what happens; the 3D frame only says where and when.
   The film tool writes a shot for each beat (size, angle, who is in frame, what they do and look at) and names the cast. */
const DIRECTED =
  'You are the director of photography on a live-action feature film. Make ONE frame of the film: the shot described under THE SHOT. ' +
  'IMAGE 1 is a game-engine frame of this place at this moment. Use it ONLY as the location: the terrain, the creek and its stepping stones, the giant trees, ' +
  'the camps, tents, workbenches and their layout, the props, the time of day, the sky and every light source in it (fires, lanterns, sun or moon). ' +
  'Do NOT copy its camera angle, its framing or the characters\' poses: compose the new shot. Do not invent new buildings, places or light sources. ' +
  '@@REFS@@ THE SHOT: @@SHOT@@ ' +
  'FILM GRAMMAR: nobody looks into the lens; the camera is an unseen observer. Each character looks at exactly what the shot names (the other character, the water, ' +
  'the fish, the object in his hands), and when two characters face each other their eyelines meet across the frame. Leave look room on the side each one faces. ' +
  'Place subjects on the thirds, use foreground elements for depth, and put the camera at the height the shot names. The action of the line must read at a glance: ' +
  'a raised open hand is clearly a wave, a held-up object is clearly shown. Faces show a quiet, specific feeling that fits the moment, never a blank stare. ' +
  'Nothing passes through anything: feet rest on the ground, hands touch objects without entering them. ' +
  'Light comes only from the sources in image 1, shaped like a feature film: the main character gets a clear warm rim or key light from the strongest source (light only: fire stays in the fire, never on a character), ' +
  'the grade is warm and rich, blacks are deep but never crushed. No text, letters, signs or watermarks. ';
const CAST_REFS = { gage: ['sketches/gage_real_ref.jpg'], token: ['sketches/token_portrait.jpg', 'sketches/token_turnaround.jpg'] };
function directed(shot, cast, aspectOk) {
  const imgs = [], parts = []; let n = 2;
  cast.forEach(w => {
    const f = CAST_REFS[w]; if (!f) return; const a = n, b = n + f.length - 1; n += f.length; imgs.push(...f);
    parts.push(w === 'gage' ? 'IMAGE ' + a + ' is the approved look for Gage: he must look exactly like that kid (face, pointed ears, spiky hair, goggles, clothes, wooden clogs) but take his pose and expression from THE SHOT.'
                            : 'IMAGE' + (a === b ? ' ' + a : 'S ' + a + '-' + b) + ' are the maker\'s pencil sketches of Token: match his head shape, eye shape and size and proportions, not the pencil style.');
  });
  const notes = (cast.includes('gage') ? GAGE_NOTE.realistic : '') + (cast.includes('token') ? 'Token: ' + TOKEN_NOTE +
    ' Realism never changes Token\'s design: he is never a grey or green alien, never a lizard or a human, never skinny with a big skull. He keeps his perfectly round head, ' +
    'his huge glossy teardrop eyes, his turtle-textured sand-colored skin and his rounded turtle shell in every shot, whatever the light. ' : '');
  return { refs: imgs, prompt: DIRECTED.replace('@@REFS@@', parts.join(' ')).replace('@@SHOT@@', String(shot).replace(/[\u0000-\u001f<>]/g, ' ').slice(0, 1400)) + STYLE_TEXT.realistic + ' ' + notes };
}

// the maker's sketches, sent as extra reference images to models that take several images
const SKETCHES = {
  token: ['sketches/token_portrait.jpg', 'sketches/token_turnaround.jpg'],
  gage: ['sketches/gage_film_ref.jpg', 'sketches/gage_goggles.jpg', 'sketches/gage_turnaround.jpg'],
  gage_realistic: ['sketches/gage_real_ref.jpg'],
};
const REF_NOTE = {
  gage_realistic: ' The first image is the frame to turn into a photo. The second image is the approved realistic look for Gage: when Gage appears, make him look exactly like the kid in that photo (same face, ears, hair, goggles, clothes, wooden clogs, same gritty photographic realism). Take everything else (pose, framing, setting, time of day, light) only from the first image; do not copy the second image\'s pose, lanterns, wall or background, and do not copy where he wears his goggles: if the first image shows the goggles over his eyes, they are over his eyes.',
  token: ' The first image is the frame to turn into a photo. The other images are the maker\'s pencil sketches of Token: match his head shape, eye shape and size, face and proportions to these sketches exactly, but take everything else (pose, framing, setting, light) only from the first image, and do not copy the pencil style.',
  gage: ' The first image is the frame to turn into a photo. The second image is the approved film look for Gage: when Gage appears, make him look exactly like he does in that photo (same face, head shape, goggles, hair, clothes, wooden shoes, skin and materials, same live-action finish). The remaining images are the maker\'s pencil sketches of Gage, for his design only. Take everything else (pose, framing, setting, time of day, light) only from the first image; do not copy the second image\'s pose, camp or background, and do not copy the pencil style.',
};

// model choices; the page sends one of these keys (default first)
const MODELS = {
  kontext: { url: 'https://fal.run/fal-ai/flux-pro/kontext', body: (img, aspect, prompt) => ({ prompt, image_url: img, aspect_ratio: aspect, guidance_scale: 4, output_format: 'jpeg', num_images: 1, safety_tolerance: '2' }) },
  nanopro: { url: 'https://fal.run/fal-ai/nano-banana-pro/edit', refs: true, body: (img, aspect, prompt, refs, refWho) => ({ prompt: refs.length ? prompt + (REF_NOTE[refWho] || REF_NOTE[String(refWho).split('_')[0]] || '') : prompt, image_urls: [img].concat(refs), aspect_ratio: aspect, resolution: '2K', output_format: 'jpeg', num_images: 1 }) },
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
  const style = body.style === 'realistic' ? 'realistic' : 'stylized';
  const refKey = style === 'realistic' && SKETCHES[body.who + '_realistic'] ? body.who + '_realistic' : body.who;
  const m = MODELS[model];
  const cast = Array.isArray(body.cast) ? body.cast.filter(w => w === 'token' || w === 'gage').slice(0, 2) : [];
  const D = typeof body.shot === 'string' && body.shot.trim() && m.refs ? directed(body.shot, cast.length ? cast : [body.who]) : null;   // a directed day-film shot
  const r = await fetch(m.url, {
    method: 'POST',
    headers: { Authorization: `Key ${env.FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(D ? m.body(image, aspect, D.prompt, D.refs.map(f => new URL('/' + f, request.url).href), null)
                           : m.body(image, aspect, promptFor(body.who, body.scene, body.clock, style), m.refs ? (SKETCHES[refKey] || SKETCHES[body.who] || []).map(f => new URL('/' + f, request.url).href) : [], refKey)),
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
      await env.PHOTO_KV.put('img:' + id, buf, { metadata: { who: body.who || '', style: D ? 'directed' : style, model, at: new Date().toISOString() } });
      saved = '/api/photo/' + id + '.jpg';
    }
  } catch (e) { console.log('photo save failed', e && e.message); }
  return json({ url: saved, id, model, style, left: ipMax === Infinity ? null : Math.max(0, ipMax - ipN - 1) });
}

export function onRequest() {
  return json({ error: 'Use POST.' }, 405);
}
