#!/usr/bin/env python3
"""Build ONE self-contained HTML for a claude.ai Artifact (relative URLs do not resolve there).

  bundle-single-file.py --page dist/x/index.html --dist dist --entry entry.ts \
      --assets public/x [--plates public/x/plates] --out out/index.html \
      [--site https://example.com] [--strip ChatWidget,ConsentBanner]

--entry: the page's own <script> with the engine imported statically (see shipping.md).
Assets in --assets are exposed as data URIs on window.__MH_ASSETS (the loader prefers them).
Plate <img src="/.../plates/NAME"> become data URIs; srcset and lazy loading are dropped.
"""
import argparse, base64, json, os, re, subprocess, sys

MIME = {'.hdr': 'application/octet-stream', '.webp': 'image/webp', '.glb': 'model/gltf-binary',
        '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4'}

def data_uri(path):
    return f'data:{MIME[os.path.splitext(path)[1]]};base64,' + base64.b64encode(open(path, 'rb').read()).decode()

def main():
    ap = argparse.ArgumentParser()
    for a in ('--page', '--dist', '--entry', '--assets', '--out'):
        ap.add_argument(a, required=True)
    ap.add_argument('--plates')
    ap.add_argument('--site', default='')
    ap.add_argument('--strip', default='ChatWidget,ConsentBanner,SocialLinks')
    a = ap.parse_args()

    bundle = a.out + '.bundle.js'
    subprocess.run(['npx', 'esbuild', a.entry, '--bundle', '--format=iife', '--minify', '--target=es2020',
                    f'--outfile={bundle}', '--log-level=warning'], check=True)
    js = open(bundle).read()
    os.remove(bundle)
    if '</script' in js.lower():
        sys.exit('bundle contains </script; cannot inline safely')

    h = open(a.page).read()
    head = re.search(r'<head>(.*?)</head>', h, re.S).group(1)
    body = re.search(r'<body[^>]*>(.*)</body>', h, re.S).group(1)
    title = re.search(r'<title>(.*?)</title>', head, re.S).group(1).split(' · ')[0]
    css = ''.join(open(a.dist + m).read() for m in re.findall(r'<link rel="stylesheet" href="([^"]+)"', head))
    inline_head = ''.join(re.findall(r'<script>[^<]*localStorage[^<]*</script>', head, re.S))
    strip = '|'.join(re.escape(s) for s in a.strip.split(',') if s)
    body = re.sub(r'<script type="module"[^>]*src="[^"]*"[^>]*></script>', '', body)
    body = re.sub(r'<script type="module">.*?</script>', '', body, flags=re.S)
    if strip:
        body = re.sub(rf'<script[^>]*({strip})[^>]*></script>', '', body)
    if a.plates:
        body = re.sub(r'\s*srcset="[^"]*"', '', body)
        body = re.sub(r'\s*sizes="[^"]*"', '', body)
        body = re.sub(r'(src)="/[^"]*/plates/([^"]+)"',
                      lambda m: f'{m.group(1)}="{data_uri(os.path.join(a.plates, m.group(2)))}"', body)
        body = body.replace(' loading="lazy"', '')
    assets = {f: data_uri(os.path.join(a.assets, f)) for f in os.listdir(a.assets)
              if os.path.isfile(os.path.join(a.assets, f)) and os.path.splitext(f)[1] in MIME}
    out = (f'<title>{title}</title>\n{inline_head}<style>{css}</style>\n{body}\n'
           f'<script>window.__MH_ASSETS={json.dumps(assets)};</script>\n<script>{js}</script>\n')
    if a.site:
        out = re.sub(r'href="/([^"#]*)"', lambda m: f'href="{a.site.rstrip("/")}/{m.group(1)}"', out)
    os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True)
    open(a.out, 'w').write(out)
    print(a.out, round(len(out) / 1e6, 2), 'MB', '(limit 16 MB)')

if __name__ == '__main__':
    main()
