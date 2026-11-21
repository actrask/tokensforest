#!/usr/bin/env python3
"""Capture a clean hero frame of Token and of Gage from the public page.

Serves site/ locally, opens it in headless Chromium (software WebGL), hides every
UI element so only the 3D canvas shows, waits for the camera director to settle,
grabs several candidate frames and keeps the one with the most detail (skipping
fades to black and cut holds).

Usage: python3 tools/photoreal_capture.py OUT_DIR [--chrome PATH]
Writes OUT_DIR/token.png and OUT_DIR/gage.png.
"""
import argparse, functools, http.server, io, os, socketserver, sys, threading, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')

HIDE_UI = """
body > *:not(#gl) { visibility: hidden !important; }
#gl { visibility: visible !important; }
"""


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE)
    handler.log_message = lambda *a: None
    httpd = socketserver.TCPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def detail_score(png_bytes):
    """Standard deviation of luminance; near zero means black/blank frame."""
    from PIL import Image, ImageStat
    im = Image.open(io.BytesIO(png_bytes)).convert('L').resize((320, 180))
    st = ImageStat.Stat(im)
    return st.stddev[0], st.mean[0]


def capture(page, url, out_path, candidates=4, gap=5.0, settle=25.0):
    page.goto(url, wait_until='load', timeout=180_000)
    page.add_style_tag(content=HIDE_UI)
    # wait for the boot screen to go away, then let the director frame a shot
    try:
        page.wait_for_function("() => { const b = document.getElementById('boot'); return !b || b.style.display === 'none' || getComputedStyle(b).display === 'none' || b.offsetParent === null; }", timeout=180_000)
    except Exception:
        print('  boot screen did not clear in time; capturing anyway', file=sys.stderr)
    time.sleep(settle)
    try:
        fps = page.evaluate("() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(n / 3); }; requestAnimationFrame(f); })")
        print(f'  render rate ~{fps:.1f} fps')
    except Exception as e:
        print('  fps probe failed', e, file=sys.stderr)
    best, best_score = None, -1.0
    for i in range(candidates):
        shot = page.screenshot(type='png', timeout=240_000, animations='allow', caret='initial')
        sd, mean = detail_score(shot)
        print(f'  candidate {i}: detail={sd:.1f} brightness={mean:.1f}')
        if mean > 8 and sd > best_score:
            best, best_score = shot, sd
        time.sleep(gap)
    if best is None:
        raise SystemExit(f'no usable frame for {url} (all candidates black)')
    with open(out_path, 'wb') as fh:
        fh.write(best)
    print(f'  kept frame with detail {best_score:.1f} -> {out_path}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out_dir')
    ap.add_argument('--chrome', default=None, help='path to a Chrome/Chromium binary')
    ap.add_argument('--who', default='token,gage')
    a = ap.parse_args()
    os.makedirs(a.out_dir, exist_ok=True)
    httpd = serve()
    base = f'http://127.0.0.1:{httpd.server_address[1]}/index.html'
    args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=a.chrome, args=args, headless=True)
        for who in a.who.split(','):
            print(f'capturing {who}')
            ctx = browser.new_context(viewport={'width': 1600, 'height': 900}, device_scale_factor=1)
            # page remembers the last character in localStorage; the hash decides here
            ctx.add_init_script("try { localStorage.setItem('forestWho', '%s'); localStorage.setItem('forestWelcomed','1'); } catch (e) {}" % who)
            page = ctx.new_page()
            capture(page, f'{base}#{who}&nowelcome', os.path.join(a.out_dir, f'{who}.png'))
            ctx.close()
        browser.close()
    httpd.shutdown()


if __name__ == '__main__':
    main()
