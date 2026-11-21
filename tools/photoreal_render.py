#!/usr/bin/env python3
"""Turn a Token's Forest frame into a photoreal still with fal.ai Flux Kontext Pro.

Needs the FAL_KEY environment variable (stored as a GitHub Actions secret).
Usage: python3 tools/photoreal_render.py INPUT_IMAGE OUTPUT_JPG [--seed N]
"""
import argparse, json, os, sys, urllib.request
import fal_client

MODEL = 'fal-ai/flux-pro/kontext'

PROMPT = (
    "Re-render this exact scene as a real photograph. Keep the composition, camera angle, "
    "framing and every object exactly where it is. Keep each character's design, shape, "
    "proportions, colors and face exactly as drawn, rendered as real physical materials. "
    "Replace the ink outlines and crosshatching with true photographic materials: real tree bark, "
    "wet river stones, moving water with natural reflections, canvas, weathered wood, metal, "
    "grass and ferns. Natural daylight with soft atmospheric haze and light shafts, "
    "shot on a 35mm lens at f/2.8, natural color grading, shallow depth of field. "
    "No outlines, no hatching, no illustration or cartoon style."
)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--seed', type=int, default=None)
    ap.add_argument('--aspect', default='16:9')
    a = ap.parse_args()
    if not os.environ.get('FAL_KEY'):
        sys.exit('FAL_KEY is not set. Add it as a repository secret named FAL_KEY.')
    print('uploading', a.src)
    url = fal_client.upload_file(a.src)
    args = {'prompt': PROMPT, 'image_url': url, 'guidance_scale': 3.5,
            'output_format': 'jpeg', 'num_images': 1, 'safety_tolerance': '2',
            'aspect_ratio': a.aspect}
    if a.seed is not None:
        args['seed'] = a.seed
    print('rendering with', MODEL)
    res = fal_client.subscribe(MODEL, arguments=args, with_logs=False)
    img = res['images'][0]['url']
    os.makedirs(os.path.dirname(os.path.abspath(a.dst)), exist_ok=True)
    urllib.request.urlretrieve(img, a.dst)
    meta = {'model': MODEL, 'seed': res.get('seed'), 'source': os.path.basename(a.src), 'prompt': PROMPT}
    with open(os.path.splitext(a.dst)[0] + '.json', 'w') as fh:
        json.dump(meta, fh, indent=1)
    print('saved', a.dst, 'seed', res.get('seed'))


if __name__ == '__main__':
    main()
