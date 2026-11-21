#!/usr/bin/env python3
"""Assemble site/world.json from the per-document files in data/.
Each file data/<collection>/<id>.json is one document of the forest's public state.
Run from anywhere: python3 tools/build_world.py [ISO timestamp]"""
import json, os, sys, datetime
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
docs = {}
for col in sorted(os.listdir(os.path.join(root, 'data'))):
    d = os.path.join(root, 'data', col)
    if not os.path.isdir(d): continue
    for f in sorted(os.listdir(d)):
        if f.endswith('.json'):
            with open(os.path.join(d, f), encoding='utf-8') as fh:
                docs[col + '/' + f[:-5]] = json.load(fh)
stamp = sys.argv[1] if len(sys.argv) > 1 else datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
out = os.path.join(root, 'site', 'world.json')
with open(out, 'w', encoding='utf-8') as fh:
    json.dump({'exportedAt': stamp, 'docs': docs}, fh, ensure_ascii=False, separators=(',', ':'))
print(len(docs), 'documents ->', out, os.path.getsize(out), 'bytes')
