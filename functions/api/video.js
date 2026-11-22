/* Day-film video clips (Kling 3.0 Pro on fal, start frame only, 5 s, no audio: the narrator is the only sound).
   POST {image, prompt}  -> {id, status, result}   submits to fal's queue (a clip takes several minutes)
   GET  ?status=..&result=..  -> {state} or {state:'done', url}
   Spending money: only the owner key or the sync key (the nightly film job) may call it. */
import { isOwner, isSync, json } from './notes.js';

const MODEL = 'fal-ai/kling-video/v3/pro/image-to-video';
const QUEUE = 'https://queue.fal.run/';
const LOCK = ' Every prop stays exactly where it is in the frame: lanterns, rocks, logs, tools, furniture and trees never move, slide, appear or disappear. ' +
  'Keep each character exactly as in the frame: same face, eyes, skin texture, shell, hair, goggles, clothes and shoes. Nothing passes through anything. No new people or creatures. No text.';
const NEG = 'blur, distort, low quality, morphing, melting, extra limbs, flicker, text, watermark, props sliding';

function allowed(request, env) { return isOwner(request, env) || isSync(request, env); }

export async function onRequestPost({ request, env }) {
  if (!allowed(request, env)) return json({ error: 'not allowed' }, 403);
  if (!env.FAL_KEY) return json({ error: 'no FAL_KEY' }, 400);
  let b; try { b = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  const image = String(b.image || '');
  if (!/^https:\/\/(tokensforest\.com|[\w-]+\.tokensforest\.pages\.dev)\//.test(image)) return json({ error: 'image must be a tokensforest.com URL' }, 400);
  const prompt = String(b.prompt || '').slice(0, 1800) + LOCK;
  const r = await fetch(QUEUE + MODEL, { method: 'POST', headers: { 'Authorization': 'Key ' + env.FAL_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ start_image_url: image, prompt, duration: '5', generate_audio: false, negative_prompt: NEG, cfg_scale: 0.5 }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.request_id) return json({ error: 'fal refused', status: r.status, detail: j.detail || j }, 400);
  return json({ id: j.request_id, status: j.status_url, result: j.response_url });
}

export async function onRequestGet({ request, env }) {
  if (!allowed(request, env)) return json({ error: 'not allowed' }, 403);
  const u = new URL(request.url), st = u.searchParams.get('status') || '', rs = u.searchParams.get('result') || '';
  if (!st.startsWith(QUEUE) || !rs.startsWith(QUEUE)) return json({ error: 'bad request urls' }, 400);
  const H = { 'Authorization': 'Key ' + env.FAL_KEY };
  const s = await (await fetch(st, { headers: H })).json().catch(() => ({}));
  if (s.status !== 'COMPLETED') return json({ state: s.status || 'UNKNOWN', position: s.queue_position });
  const r = await (await fetch(rs, { headers: H })).json().catch(() => ({}));
  const url = r && r.video && r.video.url;
  return url ? json({ state: 'done', url }) : json({ state: 'failed', detail: r.detail || r }, 400);
}
