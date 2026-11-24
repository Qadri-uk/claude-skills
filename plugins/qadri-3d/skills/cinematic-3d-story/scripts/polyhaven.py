#!/usr/bin/env python3
"""Fetch CC0 assets from Poly Haven (https://polyhaven.com, all CC0).

The API returns 403 without a User-Agent, so every request sends one.

  polyhaven.py list skies|textures|models [filter]
  polyhaven.py size  <model-id> [res]           total download size of a glTF model
  polyhaven.py hdri  <id> [res=1k] [outdir=.]   .hdr
  polyhaven.py texture <id> [res=1k] [outdir=.] [map=Diffuse]   .jpg
  polyhaven.py model <id> [res=1k] [outdir=.]   glTF + its .bin and textures
"""
import json, os, sys, urllib.request

UA = {'User-Agent': 'cinematic-3d-story/1.0'}
API = 'https://api.polyhaven.com'

def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()

def save(url, path):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    with open(path, 'wb') as f:
        f.write(get(url))
    print(path, os.path.getsize(path))

def files(asset):
    return json.loads(get(f'{API}/files/{asset}'))

def main(a):
    cmd = a[0]
    if cmd == 'list':
        kind = {'skies': 'hdris&c=skies', 'textures': 'textures', 'models': 'models'}[a[1]]
        names = sorted(json.loads(get(f'{API}/assets?t={kind}')))
        if a[1] == 'skies':
            names = [n for n in names if 'puresky' in n]
        flt = a[2] if len(a) > 2 else ''
        print('\n'.join(n for n in names if flt in n))
    elif cmd == 'size':
        g = files(a[1])['gltf'][a[2] if len(a) > 2 else '1k']['gltf']
        print(round((g['size'] + sum(v['size'] for v in g['include'].values())) / 1e6, 2), 'MB')
    elif cmd == 'hdri':
        res, out = (a[2] if len(a) > 2 else '1k'), (a[3] if len(a) > 3 else '.')
        save(files(a[1])['hdri'][res]['hdr']['url'], f'{out}/{a[1]}.hdr')
    elif cmd == 'texture':
        res, out = (a[2] if len(a) > 2 else '1k'), (a[3] if len(a) > 3 else '.')
        m = a[4] if len(a) > 4 else 'Diffuse'
        save(files(a[1])[m][res]['jpg']['url'], f'{out}/{a[1]}.jpg')
    elif cmd == 'model':
        res, out = (a[2] if len(a) > 2 else '1k'), (a[3] if len(a) > 3 else '.')
        g = files(a[1])['gltf'][res]['gltf']
        save(g['url'], f'{out}/{a[1]}/{a[1]}.gltf')
        for rel, v in g['include'].items():
            save(v['url'], f'{out}/{a[1]}/{rel}')
    else:
        print(__doc__)

if __name__ == '__main__':
    main(sys.argv[1:] or ['help'])
