# Handoff: work done in the second Claude session (through 2026-11-22)

Two Claude sessions worked on this project at the same time. This file lists what the second one built, so one session can carry on alone. Secrets are NOT in this repository (it is public): they live in Cloudflare environment variables and in the brain's scheduled-task instructions.

## Working rules that bit us
- Both sessions publish the Claude artifact (slug `fdfa22dc-8fa8-447f-b4ab-3138b3dcbd69`) and push to `main`. Before any page edit, `get_artifact` and re-pull the live `index.html`; before any push, `git fetch` and rebase.
- The artifact is shared publicly, so database writes from a chat are refused. Changes to the world go through the brain's instructions (scheduled task "Forest brain: Token + Gage (hourly)", `19 * * * *`, model claude-opus-5-5; never change the model unless the owner asks).
- The brain's instructions are capped at 65,536 bytes. Read the live text with `list_triggers` (save the output to a file; it is too large to read inline), edit, `update_trigger`, then check the stored prompt equals your file byte for byte.
- When adding a one-time "PENDING ..." block to the brain, fold the previous finished one into "WHAT THEY HAVE ALREADY BEEN GIVEN".
- Pushing `site/**` to `main` deploys to tokensforest.com in about a minute (`.github/workflows/deploy.yml`, repo secret `CLOUDFLARE_API_TOKEN`). Check with `gh run list --repo actrask/tokensforest`.

## Visitor notes (letters), built 2026-11-22
- `functions/api/letters/[[path]].js`: visitors sign in with Google (ID token checked at Google's tokeninfo endpoint against `GOOGLE_CLIENT_ID`), send a note to token, gage or both (600 chars, 3 a day, 5 waiting per person). Stored in `PHOTO_KV` as `letter:<id>`; public list `letters:public` shows first names only. Owner routes (approve, decline, delete, block, unblock) use `isOwner` from `notes.js`. `GET /api/letters/reply?id&who&text&k` sets a character's reply; `k` (or header `X-Forest-Sync`) must equal `NOTES_KEY`.
- `site/letters.js`: the "Notes from visitors" button and panel (loaded by `world-loader.js`). Owner devices also see "Approve notes (N waiting)".
- `site/keeper.html` (served at `/keeper`): the owner's approval page.
- Brain side: the "NOTES FROM THE WEBSITE" paragraph and a clause in step 1. Each tick it reads `/api/letters`, files new approved notes as `inbox/web-<id>-<who>`, and posts replies back with `NOTES_KEY` (the key is written in the brain's instructions).
- Needs from the owner before it works: Cloudflare Pages variables `GOOGLE_CLIENT_ID` and `NOTES_KEY` (secret; same value as in the brain's instructions), then a redeploy. Until then the panel says "Leaving a note opens soon."
- Not yet tested end to end: a real Google sign-in, and a real reply arriving from the brain.

## Pinhole pictures through the image generator
- `functions/api/develop/[key].js`: `GET/POST /api/develop/<who>-<id>.jpg` turns a pinhole frame into a sepia photograph with fal (`FAL_KEY`), cached in KV as `dev:<key>`, daily cap `DEVELOP_LIMIT` (default 12).
- Gage's map shows green dots where he took pictures; tapping one opens the picture.
- Not done: Token's paintings through the generator (needs a painting record format in the brain plus a text-to-image mode). A design was proposed to the owner, not approved yet.

## Page work in this stretch (all in the artifact and mirrored to `site/index.html`)
Floating rocks grounded; free view can look past the cliff (the spoiler stays hidden); "Gage is resting at his workshop" wording; haze reduced 15%; camera direction reworked for every shot; collapsible UI; Gage's duffel rebuilt; visitor summaries rewritten (brain rule "WHO HE REMEMBERS"); painting supplies for Token (brain block "PENDING PAINTS FOR TOKEN"); lens hatching with a fresnel falloff.
Not verified on screen: several new camera shots (bed close-up, over-shoulder, far, still, dolly).

## Nightly narration audio
- Each night at 00:25 Chicago a scheduled wake-up in the second session records the finished day's tellings with Kokoro (voice `bm_lewis`, speed 0.9), publishes the mp3+json to the artifact as `audio/<who>-<day>-<fnv hash of text>.*`, copies them into `site/audio`, and pushes. It re-arms itself each night.
- Recorder: `tools/narration/rec.py <days.json> <outdir>`; days.json is `[{who, day, text, sents}]` where `sents` are the beats' `s` values and `text` is them joined by spaces. Model files (`kokoro-v1.0.onnx`, `voices-v1.0.bin`) come from `https://huggingface.co/fastrtc/kokoro-onnx/resolve/main/`; set `TTS_DIR` to their folder; `pip install kokoro-onnx soundfile`.
- If a past day's telling is retold, its hash changes: record the new one and remove the old files for that who+day.
