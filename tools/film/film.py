"""Day films: up to 5 realistic stills per recorded day, shown with slow pan/zoom in presentation mode.

  python3 tools/film/film.py frames <who> <day> <n,n,...> [world.json]   # capture the 3D frames for those sentences (free)
  python3 tools/film/film.py pick <who> <day> 1=a,4=c                     # choose a different take (a/b/c) from the contact sheet
  python3 tools/film/film.py develop <who> <day>
  FOREST_SYNC=... python3 tools/film/film.py animate <who> <day> <n> "motion prompt"   # one still -> 5 s Kling clip (~56c)                         # turn the captured frames into realistic photos (~15c each)

<who> is token or gage, <day> is YYYY-MM-DD, n are 0-based sentence (beat) numbers of that day's telling.
Only days whose recording exists in site/audio are accepted.
Frames go to tools/film/frames/, finished photos to site/film/<who>-<day>-<n>.jpg,
and the day's list to site/film/<who>-<day>.json  ({h, shots:[{n, src}]}), which present.js reads.
world.json defaults to site/world.json; pass a fresher export for recent days.
Needs: pip install playwright (and a Chrome or `playwright install chromium`).
"""
import base64, functools, http.server, json, os, shutil, socketserver, sys, threading, time, urllib.request, urllib.parse, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE = os.path.join(ROOT, 'site'); FR = os.path.join(ROOT, 'tools', 'film', 'frames'); OUT = os.path.join(SITE, 'film')
API = 'https://tokensforest.com'

def fnv(s):
    h = 0x811c9dc5
    for b in s.encode('utf-8'): h = ((h ^ b) * 0x01000193) & 0xffffffff
    return '%08x' % h

def telling(world, who, day):
    d = world['docs']['world/narration' if who == 'token' else 'gage/narration']['days'][day]
    beats = d.get('beats') or []; text = (d.get('text') or ' '.join(b['s'] for b in beats)).strip()
    return text, beats

def frames(who, day, picks, wpath):
    world = json.load(open(wpath)); text, beats = telling(world, who, day); h = fnv(text)
    if not os.path.exists(os.path.join(SITE, 'audio', '%s-%s-%s.mp3' % (who, day, h))): sys.exit('no recording for %s %s (hash %s): not filming it' % (who, day, h))
    picks = picks[:5]; os.makedirs(FR, exist_ok=True)
    tmp = os.path.join(SITE, '_film_world.json'); shutil.copy(wpath, tmp)
    page = open(os.path.join(SITE, 'index.html'), encoding='utf-8').read()
    page = page.replace('world-loader.js', 'world-loader.js?film=1&w=_film_world.json', 1)
    open(os.path.join(SITE, '_film.html'), 'w', encoding='utf-8').write(page)
    h_ = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE); h_.log_message = lambda *a: None
    srv = socketserver.TCPServer(('127.0.0.1', 0), h_); threading.Thread(target=srv.serve_forever, daemon=True).start()
    from playwright.sync_api import sync_playwright
    try:
        with sync_playwright() as p:
            chrome = '/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None
            b = p.chromium.launch(executable_path=chrome, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'])
            pg = b.new_page(viewport={'width': 1600, 'height': 900})
            pg.add_init_script("try{localStorage.setItem('forestWelcomed','1');localStorage.setItem('forestMode','dev')}catch(e){}")
            pg.goto('http://127.0.0.1:%d/_film.html#%s&nowelcome&dev' % (srv.server_address[1], who), timeout=240000)
            for _ in range(120):
                time.sleep(2)
                if pg.evaluate("!!(window.__forest && Object.keys(window.__forest.days('%s')).length)" % who): break
            time.sleep(15)
            pg.add_style_tag(content='body>*:not(#gl){visibility:hidden!important} #gl{visibility:visible!important}')
            out = []
            for n in picks:
                at = beats[n]['at']; pg.evaluate("window.__forest.moment(%s, %s)" % (json.dumps(who), json.dumps(at))); t0 = time.time(); cands = []
                for c, wait in (('a', 5), ('b', 11), ('c', 19)):   # three takes as the director changes angle; the best is picked by eye
                    time.sleep(max(0, wait - (time.time() - t0)))
                    f = os.path.join(FR, '%s-%s-%d%s.jpg' % (who, day, n, c)); pg.screenshot(path=f, type='jpeg', quality=92, timeout=180000); cands.append(f)
                out.append({'n': n, 'at': at, 's': beats[n]['s'], 'cands': cands, 'frame': cands[1]}); print('frames', n)
            b.close()
    finally:
        srv.shutdown()
        for x in ('_film.html', '_film_world.json'):
            try: os.remove(os.path.join(SITE, x))
            except OSError: pass
    pf = os.path.join(FR, '%s-%s.json' % (who, day)); old = json.load(open(pf)) if os.path.exists(pf) else {}   # a retake replaces only the shots it took
    keep = [x for x in old.get('shots', []) if old.get('h') == h and x['n'] not in picks]; out = sorted(keep + out, key=lambda x: x['n'])[:5]
    json.dump({'who': who, 'day': day, 'h': h, 'shots': out}, open(pf, 'w'), indent=1)
    sheet(who, day)

def sheet(who, day):
    from PIL import Image, ImageDraw
    plan = json.load(open(os.path.join(FR, '%s-%s.json' % (who, day)))); rows = plan['shots']
    S = Image.new('RGB', (3*480, len(rows)*270), 'black'); d = ImageDraw.Draw(S)
    for r, x in enumerate(rows):
        for k, f in enumerate(x.get('cands') or [x['frame']]):
            S.paste(Image.open(f).resize((480, 270)), (k*480, r*270)); d.text((k*480 + 8, r*270 + 6), '%d%s%s' % (x['n'], 'abc'[k], ' *' if f == x['frame'] else ''), fill='yellow')
    out = os.path.join(FR, '%s-%s-sheet.jpg' % (who, day)); S.save(out, quality=80); print('sheet', out)

def pick(who, day, spec):   # e.g. 1=a,4=c
    pf = os.path.join(FR, '%s-%s.json' % (who, day)); plan = json.load(open(pf))
    for kv in spec.split(','):
        n, c = kv.split('='); n = int(n)
        for x in plan['shots']:
            if x['n'] == n: x['frame'] = x['cands']['abc'.index(c)]
    json.dump(plan, open(pf, 'w'), indent=1); sheet(who, day)

# fixed camera setups for directed shots: [from x,y,z], [look-at x,y,z], fov.  Token's fire (3.6, 2.2), the creek (x~15), Gage's camp (23.5, 4.5)
CAMS = {
    'across_to_gage':  ([4.6, 1.5, 3.4], [23.5, 1.0, 4.5], 38),   # from just behind Token's fire, over the creek to Gage's camp
    'across_to_token': ([22.0, 1.5, 4.0], [3.6, 0.9, 2.2], 38),   # the reverse: from Gage's camp back over the creek to Token's fire
    'token_camp':      ([8.5, 3.0, 8.5], [2.0, 0.6, 0.5], 46),    # wide of Token's camp, burrow and fire
    'gage_camp':       ([19.0, 2.6, 10.0], [23.5, 0.7, 4.5], 46), # wide of Gage's camp, bench and tent
    'creek':           ([10.5, 2.2, 5.5], [15.2, 0.2, -3.5], 44), # along the creek, the pool and the stepping stones
    'cliff':           ([-36.0, 3.0, 2.0], [-50.0, -6.0, 0.0], 50),  # the west edge, looking out to sea
}
CAM_JS = """(c => { const C = window.__cam; window.__shotCam = c;
  if (!C.__shotPatched){ const orig = C.updateMatrixWorld.bind(C); C.__shotPatched = true;
    C.updateMatrixWorld = function(f){ const s = window.__shotCam; if (s){ C.position.set(s[0][0], s[0][1], s[0][2]); C.up.set(0, 1, 0); C.lookAt(s[1][0], s[1][1], s[1][2]);
      if (C.fov !== s[2]){ C.fov = s[2]; C.updateProjectionMatrix(); } } return orig(f); }; } })"""

def shoot(who, day, listfile, wpath):
    """Directed shots: listfile is JSON [{n, cam, shot, cast}] written from the beats. cam is a CAMS name or 'replay' (keep the director's
    angle); shot is the written shot (size, angle, who is in frame, what they do and look at); cast is ['token'], ['gage'] or both."""
    plan = json.load(open(listfile))[:5]
    world = json.load(open(wpath)); text, beats = telling(world, who, day); h = fnv(text)
    if not os.path.exists(os.path.join(SITE, 'audio', '%s-%s-%s.mp3' % (who, day, h))): sys.exit('no recording for %s %s: not filming it' % (who, day))
    os.makedirs(FR, exist_ok=True); tmp = os.path.join(SITE, '_film_world.json'); shutil.copy(wpath, tmp)
    page = open(os.path.join(SITE, 'index.html'), encoding='utf-8').read().replace('world-loader.js', 'world-loader.js?film=1&w=_film_world.json', 1)
    open(os.path.join(SITE, '_film.html'), 'w', encoding='utf-8').write(page)
    h_ = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE); h_.log_message = lambda *a: None
    srv = socketserver.TCPServer(('127.0.0.1', 0), h_); threading.Thread(target=srv.serve_forever, daemon=True).start()
    from playwright.sync_api import sync_playwright
    out = []
    try:
        with sync_playwright() as p:
            chrome = '/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None
            b = p.chromium.launch(executable_path=chrome, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            pg = b.new_page(viewport={'width': 1600, 'height': 900})
            pg.add_init_script("try{localStorage.setItem('forestWelcomed','1');localStorage.setItem('forestMode','dev')}catch(e){}")
            pg.goto('http://127.0.0.1:%d/_film.html#%s&nowelcome&dev' % (srv.server_address[1], who), timeout=240000)
            for _ in range(120):
                time.sleep(2)
                if pg.evaluate("!!(window.__forest && window.__cam && Object.keys(window.__forest.days('%s')).length)" % who): break
            time.sleep(15); pg.add_style_tag(content='body>*:not(#gl){visibility:hidden!important} #gl{visibility:visible!important}')
            for x in plan:
                n = int(x['n']); pg.evaluate("window.__shotCam = null"); pg.evaluate("window.__forest.moment(%s, %s)" % (json.dumps(who), json.dumps(beats[n]['at'])))
                time.sleep(12)
                if x.get('cam', 'replay') != 'replay': c = CAMS[x['cam']] if isinstance(x['cam'], str) else x['cam']; pg.evaluate(CAM_JS + '(%s)' % json.dumps(list(c))); time.sleep(3)
                f = os.path.join(FR, '%s-%s-%d.jpg' % (who, day, n)); pg.screenshot(path=f, type='jpeg', quality=92, timeout=180000)
                out.append({'n': n, 'at': beats[n]['at'], 's': beats[n]['s'], 'cands': [f], 'frame': f, 'cam': x.get('cam', 'replay'), 'shot': x['shot'], 'cast': x.get('cast') or [who]})
                print('frame', n, x.get('cam'))
            b.close()
    finally:
        srv.shutdown()
        for q in ('_film.html', '_film_world.json'):
            try: os.remove(os.path.join(SITE, q))
            except OSError: pass
    json.dump({'who': who, 'day': day, 'h': h, 'shots': out}, open(os.path.join(FR, '%s-%s.json' % (who, day)), 'w'), indent=1); sheet(who, day)

def develop(who, day):
    plan = json.load(open(os.path.join(FR, '%s-%s.json' % (who, day)))); os.makedirs(OUT, exist_ok=True); shots = []
    for s in plan['shots']:
        dst = os.path.join(OUT, '%s-%s-%d.jpg' % (who, day, s['n']))
        if not os.path.exists(dst):
            img = 'data:image/jpeg;base64,' + base64.b64encode(open(s['frame'], 'rb').read()).decode()
            req = {'image': img, 'who': who, 'style': 'realistic', 'aspect': '16:9'}
            if s.get('shot'): req.update({'shot': s['shot'], 'cast': s.get('cast') or [who]})   # a directed shot: the narration sets the action
            body = json.dumps(req).encode()   # (no narration text: the model would paint the words in)
            hdr = {'Content-Type': 'application/json', 'User-Agent': 'forest-film/1', 'Origin': API}
            if os.environ.get('FOREST_ADMIN'): hdr['X-Forest-Admin'] = os.environ['FOREST_ADMIN']
            for tries in range(3):
                try:
                    r = json.load(urllib.request.urlopen(urllib.request.Request(API + '/api/photoreal', body, hdr), timeout=300)); break
                except Exception as e:
                    print('retry', s['n'], e); time.sleep(10); r = {}
            url = r.get('url') or r.get('src') or r.get('image')
            if not url: print('failed', s['n'], r); continue
            data = urllib.request.urlopen(urllib.request.Request(url if url.startswith('http') else API + url, headers={'User-Agent': 'forest-film/1'}), timeout=120).read()
            from PIL import Image; import io
            im = Image.open(io.BytesIO(data)).convert('RGB'); im.thumbnail((1920, 1080)); im.save(dst, quality=84, optimize=True, progressive=True); print('photo', dst)   # web size
        shots.append({'n': s['n'], 'src': 'film/' + os.path.basename(dst)})
    json.dump({'h': plan['h'], 'shots': shots}, open(os.path.join(OUT, '%s-%s.json' % (who, day)), 'w'))
    print('wrote', os.path.join(OUT, '%s-%s.json' % (who, day)))

def animate(who, day, n, prompt):
    """Turn one finished still into a 5 s clip (Kling, ~56 cents). Needs FOREST_SYNC (the sync key) in the environment."""
    key = os.environ.get('FOREST_SYNC') or os.environ.get('FOREST_ADMIN'); n = int(n)
    if not key: sys.exit('set FOREST_SYNC to the sync key')
    hdr = {'Content-Type': 'application/json', 'User-Agent': 'forest-film/1', 'Origin': API,
           ('X-Forest-Sync' if os.environ.get('FOREST_SYNC') else 'X-Forest-Admin'): key}
    mf = os.path.join(OUT, '%s-%s.json' % (who, day)); man = json.load(open(mf))
    shot = [x for x in man['shots'] if x['n'] == n][0]
    img = API + '/' + shot['src'] + '?v=' + str(int(time.time()))
    q = json.load(urllib.request.urlopen(urllib.request.Request(API + '/api/video', json.dumps({'image': img, 'prompt': prompt}).encode(), hdr), timeout=120))
    print('queued', q.get('id'))

    qs = urllib.parse.urlencode({'status': q['status'], 'result': q['result']})
    for _ in range(120):   # up to ~30 minutes
        time.sleep(15)
        try: r = json.load(urllib.request.urlopen(urllib.request.Request(API + '/api/video?' + qs, headers=hdr), timeout=60))
        except urllib.error.HTTPError as e: r = json.loads(e.read() or b'{}')
        if r.get('state') == 'done': break
        if r.get('state') == 'failed': sys.exit('failed: %s' % r)
    else: sys.exit('timed out')
    dst = os.path.join(OUT, '%s-%s-%d.mp4' % (who, day, n)); raw = dst + '.raw.mp4'
    open(raw, 'wb').write(urllib.request.urlopen(urllib.request.Request(r['url'], headers={'User-Agent': 'forest-film/1'}), timeout=300).read())
    import subprocess   # web size: 1080p max, H.264, no audio, fast start
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-an', '-vf', "scale='min(1920,iw)':-2", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
                    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', dst], check=True); os.remove(raw)
    shot['clip'] = 'film/' + os.path.basename(dst); json.dump(man, open(mf, 'w')); print('clip', dst)

if __name__ == '__main__':
    if sys.argv[1] == 'frames': frames(sys.argv[2], sys.argv[3], [int(x) for x in sys.argv[4].split(',')], sys.argv[5] if len(sys.argv) > 5 else os.path.join(SITE, 'world.json'))
    elif sys.argv[1] == 'pick': pick(sys.argv[2], sys.argv[3], sys.argv[4])
    elif sys.argv[1] == 'shoot': shoot(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5] if len(sys.argv) > 5 else os.path.join(SITE, 'world.json'))
    elif sys.argv[1] == 'animate': animate(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])
    elif sys.argv[1] == 'sheet': sheet(sys.argv[2], sys.argv[3])
    else: develop(sys.argv[2], sys.argv[3])
