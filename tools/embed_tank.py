"""
Embed (or refresh) the API 650 Tank GAD Review tool inside Meridian's index.html.

The tank tool is a self-contained single-file app (TANK_GAD_Review_3D.html) with
its own Three.js / TWEEN / xlsx CDN imports and CSS.  It is hosted exactly like
the other embedded dashboards: base64-encoded into the `window.__MRD_APPS__`
registry under the key `tank`, then opened in an isolated blob-URL <iframe> by
`openEmbeddedApp('tank', …)`.  The Tank dock icon in the engineering-review tool
is wired to that call (ICON_URLS['icon-tank'] = '__MRD_EMBED_TANK__', handled in
startGenieEffect).

This edit is additive and idempotent: it only replaces the `tank:"…"` entry and
leaves ceyhan / p6 / vendor untouched.  Re-run it whenever TANK_GAD_Review_3D.html
changes.
"""
import base64, re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDX  = os.path.join(ROOT, 'index.html')
TANK = os.path.join(ROOT, 'TANK_GAD_Review_3D.html')

idx = open(IDX, encoding='utf-8').read()
b64 = base64.b64encode(open(TANK, 'rb').read()).decode('ascii')

marker = '<script id="mrd-embedded-apps">window.__MRD_APPS__={'
if marker not in idx:
    raise SystemExit('mrd-embedded-apps script not found in index.html')

# Drop any prior tank entry (idempotent), then splice the fresh one in before
# the closing "};</script>" of that specific script tag.
idx = re.sub(r',tank:"[^"]*"(?=\};</script>)', '', idx)
start = idx.index(marker)
end = idx.index('};</script>', start)
idx = idx[:end] + ',tank:"' + b64 + '"' + idx[end:]

open(IDX, 'w', encoding='utf-8').write(idx)
print('tank source bytes :', os.path.getsize(TANK))
print('tank base64 chars :', len(b64))
print('index.html size   :', len(idx))
