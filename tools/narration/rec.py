import sys, json, os, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
def fnv(s):
    h = 0x811c9dc5
    for b in s.encode('utf-8'): h = ((h ^ b) * 0x01000193) & 0xffffffff
    return '%08x' % h
M = os.environ.get('TTS_DIR', '/tmp/tts'); k = Kokoro(M + '/kokoro-v1.0.onnx', M + '/voices-v1.0.bin'); os.makedirs(sys.argv[2], exist_ok=True)
for d in json.load(open(sys.argv[1])):
    text = d['text'].strip(); sents = d['sents']; parts, t, at = [], [], 0.0
    for s in sents:
        a, sr = k.create(s, voice='bm_lewis', speed=0.9, lang='en-gb'); a = np.asarray(a, dtype=np.float32)
        t.append(round(at, 2)); parts += [a, np.zeros(int(sr*0.38), dtype=np.float32)]; at += len(a)/sr + 0.38
    au = np.concatenate(parts); base = '%s/%s-%s-%s' % (sys.argv[2], d['who'], d['day'], fnv(text))
    sf.write(base + '.mp3', au, sr, format='MP3'); json.dump({'h':fnv(text), 'n':len(sents), 't':t, 'd':round(len(au)/sr, 2)}, open(base + '.json', 'w')); print(base)
