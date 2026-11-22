# Nightly day films (scheduled task, ~1:40 AM Chicago)

Presentation mode on tokensforest.com (site/present.js) plays each recorded day with up to 5 realistic stills
that slowly pan/zoom. This job makes those stills for the newest recorded days. It runs after the narration
recorder (00:25 Chicago), which puts `site/audio/<who>-<day>-<hash>.mp3/.json` in the repo.

Artifact (Claude version of the forest): slug `fdfa22dc-8fa8-447f-b4ab-3138b3dcbd69`. Repo: `actrask/tokensforest` (push to main deploys).

## Steps
1. Clone or pull the repo. `pip install --break-system-packages playwright pillow` if missing; if there is no
   Chrome at /usr/bin/google-chrome, run `python3 -m playwright install --with-deps chromium`.
2. Get a fresh world: `curl -s https://tokensforest.com/api/world -o /tmp/world.json`. If its `exportedAt` is older
   than the day you are filming, build one: copy site/world.json, then with the artifact database tools (db_get)
   replace these docs with their current versions: `world/narration`, `gage/narration`, `diary/<day>`, `gagediary/<day>`,
   and also `diary/<day+1>` / `gagediary/<day+1>` if they exist (a day's evening runs past midnight UTC).
   Keep only what's needed when you write them out (for narration: just the days you are filming; for diaries: `day` and `moves`).
3. For token and for gage: find narration days (newest first, at most the last 3) whose exact text has a recording
   (`site/audio/<who>-<day>-<fnv1a of text.strip()>.mp3`) and no `site/film/<who>-<day>.json` whose `h` matches.
   No recording means no film: never film an unrecorded day.
4. For each such day, read its beats and pick the 5 most dramatic, visual moments: encounters between the two
   characters, light in the dark (lanterns, fire, sunset), catches, gifts, weather. Avoid beats that are only
   reading the slate/tablet. Prefer moments spread across the day.
5. `python3 tools/film/film.py frames <who> <day> n,n,n,n,n /tmp/world.json` (about 15 minutes per day; run it in
   the background and poll). Then open `tools/film/frames/<who>-<day>-sheet.jpg` with the Read tool and choose the
   best take for each row (a/b/c): the character clearly visible, not an extreme close-up of one body part, not
   blocked by foreground logs, and nothing clipping (a foot or leg on the near side of a log, rock or table while the body is behind it,
   a staff through a wall). `film.py pick <who> <day> 1=a,4=c`. If a moment has no usable take, retake it
   (`frames` with just that n) or swap it for another beat (delete that row from tools/film/frames/<who>-<day>.json first).
6. `python3 tools/film/film.py develop <who> <day>` (about 15 cents per photo; uses the public /api/photoreal endpoint).
   If fal reports an exhausted balance, stop making photos, keep whatever finished, and say so in the run summary.
6b. Animate ONE hero still per character per day (the most cinematic: firelight, lanterns, sunset, an encounter):
   `FOREST_SYNC=<sync key from the task prompt> python3 tools/film/film.py animate <who> <day> <n> "<motion prompt>"` (about 56 cents,
   5 to 15 minutes). Write the motion prompt as a live-action film shot with ONE small camera move (slow push-in, or locked-off),
   describe only gentle motion (flame flicker, breathing, water, drifting leaves or fireflies, a small gesture from the beat),
   and describe the character by look (Token: small turtle-skinned creature with a shell; Gage: young tinkerer with spiky hair and brass goggles).
   The route adds the props-stay-put and keep-the-character lines itself. Never put the key in the repo.
7. Commit `site/film/*` (not tools/film/frames) and push. Then add the same files to the artifact with publish_files
   in patch mode: each `site/film/X` as `film/X` (call list_files first, as the tool requires).
8. End with a one-line summary of the days filmed and photos made.

Never change the brain, the recorder, or any other scheduled task from this job.
