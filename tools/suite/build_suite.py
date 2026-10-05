"""Build MERIDIAM_SUITE.html — every MERIDIAM app behind one launchpad.

    python3 tools/suite/build_suite.py          (from the repository root)

Reads the main MERIDIAM app (index.html) and the latest standalone tools,
and changes the main app only at its shell: the launchpad replaces the old
carousel, the bar every app opens under gets a way home, the embedded apps
are swapped for the latest standalone files (byte for byte), and the help
button is added.  The Engineering Review Tool's content and every tool's own
code are untouched.

    index.html                              the main app (shell + Engineering Review Tool)
    tools/VENDOR_DOC_TOOL_TRIAL.html        Document Review Management
    tools/PLAN4E_MILESTONE_TOOL.html        P6 PLAN4E Milestone Management
    tools/ASME_VIII_1_VISUALISER.html       ASME Section VIII Division 1 Visualiser
    tools/suite/src/                        the launchpad, host bar and help button
"""
import base64, re, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(HERE, 'src')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'MERIDIAM_SUITE.html')
MAIN = os.path.join(ROOT, 'index.html')
TOOLS = {
    'drm':  os.path.join(ROOT, 'tools', 'VENDOR_DOC_TOOL_TRIAL.html'),
    'p6':   os.path.join(ROOT, 'tools', 'PLAN4E_MILESTONE_TOOL.html'),
    'asme': os.path.join(ROOT, 'tools', 'ASME_VIII_1_VISUALISER.html'),
}

def rd(p):
    return open(p, encoding='utf-8').read()

html = rd(MAIN)
src = {n: rd(os.path.join(SRC, n)) for n in os.listdir(SRC)}

def once(old, new, label):
    global html
    n = html.count(old)
    assert n == 1, f'{label}: expected one match, found {n}'
    html = html.replace(old, new, 1)

def between(start, end, new, label, keep_end=True):
    """Replace html[start .. end) — both markers must be unique."""
    global html
    a = html.find(start); assert a >= 0 and html.count(start) == 1, f'{label}: start marker'
    b = html.find(end, a); assert b > a, f'{label}: end marker'
    html = html[:a] + new + (html[b:] if keep_end else html[b + len(end):])

# ── titles ───────────────────────────────────────────────────────────────
once('<title>Meridiam — Suites</title>', '<title>MERIDIAM — Static Equipment Intelligence</title>', 'title')
once("const SPA_VIEW_TITLES = {'main': 'Meridiam — Suites', 'home': 'Meridiam — Engineer Review Tool', 'drum': 'Meridiam'};",
     "const SPA_VIEW_TITLES = {'main': 'MERIDIAM — Static Equipment Intelligence', 'home': 'MERIDIAM — Engineering Review Tool', 'drum': 'MERIDIAM — Engineering Review Tool'};",
     'view titles')
once('<div class="loader-tagline" id="loaderTagline"></div>',
     '<div class="loader-tagline" id="loaderTagline">Static Equipment Intelligence</div>', 'loader tagline')

# ── the tab carries the MERIDIAM mark ─────────────────────────────────────
from urllib.parse import quote
FAV = ("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>"
       "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#12395C'/>"
       "<stop offset='1' stop-color='#0B2545'/></linearGradient></defs>"
       "<rect width='64' height='64' rx='14' fill='url(#g)'/>"
       "<text x='32' y='45' text-anchor='middle' font-family='Montserrat,Segoe UI,Arial,sans-serif' "
       "font-weight='800' font-size='38' fill='#fff'>M</text></svg>")
once('<title>MERIDIAM — Static Equipment Intelligence</title>',
     '<title>MERIDIAM — Static Equipment Intelligence</title>\n  <link rel="icon" id="mrd-favicon" type="image/svg+xml" href="data:image/svg+xml,'
     + quote(FAV, safe=" =:/,;'") + '">', 'favicon')

# ── the wordmark: bold MERIDIAM on white, no globe, no rule ──────────────
a_ = html.find('    var LOGO =\n')
b_ = html.find("      '</svg>';\n", a_)
assert a_ > 0 and b_ > a_, 'logo svg'
html = html[:a_] + (
    "    var LOGO = '<span class=\"mrd-wordmark\">MERIDIAM</span>';\n") + html[b_ + len("      '</svg>';\n"):]
once('    // 0) Paint the supplied MERIDIAM logo (white wordmark + blue wireframe\n',
     '    // 0) Paint the MERIDIAM wordmark — bold navy letters, nothing else —\n', 'logo comment')
once('    //    globe + blue equator line on a dark chip) into every nav brand slot.\n',
     '    //    into every nav brand slot.\n', 'logo comment 2')

# ── the launchpad replaces the carousel ──────────────────────────────────
asme = rd(TOOLS['asme'])
n_mod = len(re.findall(r"id: '[A-Z]+-\d+', slug: '", asme))
assert n_mod > 0
between('  <div data-view="main" style="display:block; position:relative; width:100vw; height:100vh; isolation:isolate;">',
        '  <div data-view="home"', src['launchpad.html'].replace('__ASME_MODULES__', str(n_mod)), 'main view')

# ── the Engineering Review Tool gets a way back to the launchpad ─────────
ERT_LOGO = '    <div class="home-logo"><span class="mrd-brand-logo" role="img" aria-label="MERIDIAM"></span></div>\n'
once(ERT_LOGO, ERT_LOGO +
     '    <button type="button" id="mrd-ert-allapps" onclick="showView(\'main\')" title="Back to all apps">'
     '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">'
     '<rect x="3.5" y="3.5" width="4.4" height="4.4" rx="1"/><rect x="9.8" y="3.5" width="4.4" height="4.4" rx="1"/>'
     '<rect x="16.1" y="3.5" width="4.4" height="4.4" rx="1"/><rect x="3.5" y="9.8" width="4.4" height="4.4" rx="1"/>'
     '<rect x="9.8" y="9.8" width="4.4" height="4.4" rx="1"/><rect x="16.1" y="9.8" width="4.4" height="4.4" rx="1"/>'
     '<rect x="3.5" y="16.1" width="4.4" height="4.4" rx="1"/><rect x="9.8" y="16.1" width="4.4" height="4.4" rx="1"/>'
     '<rect x="16.1" y="16.1" width="4.4" height="4.4" rx="1"/></svg><span>All apps</span></button>\n',
     'ERT all-apps button')

# ── showView tells the suite where you are ───────────────────────────────
once('  SPA_STATE.currentView = targetView;\n',
     '  SPA_STATE.currentView = targetView;\n  if (window.mrdSuiteOnView) window.mrdSuiteOnView(targetView);\n', 'showView hook')

# ── the carousel's code goes with it ─────────────────────────────────────
between('function initMainView() {', '\n\n\nfunction initHomeView() {',
        "function initMainView() {\n"
        "  if (SPA_STATE.mainInitialized) return;\n"
        "  SPA_STATE.mainInitialized = true;\n"
        "  /* The launchpad paints its own page; the body carries the same blue\n"
        "     so nothing else shows at the edges while a view changes. */\n"
        "  SPA_STATE.bodyBackgrounds.main = 'linear-gradient(180deg,#C7D9EC 0%,#DAE5F0 34%,#E7EEF5 72%,#EDF2F7 100%)';\n"
        "  document.body.style.backgroundImage = SPA_STATE.bodyBackgrounds.main;\n"
        "}", 'initMainView')

# ── the embedded apps: the latest tools, byte for byte ───────────────────
m = re.search(r'<script id="mrd-embedded-apps">window\.__MRD_APPS__=\{(.*?)\};</script>', html, re.S)
assert m, 'embedded apps'
old = dict(re.findall(r'(\w+):"([A-Za-z0-9+/=]*)"', m.group(1)))
assert set(old) == {'ceyhan', 'p6', 'vendor', 'tank', 'hassi'}, sorted(old)
def b64(key):
    return base64.b64encode(open(TOOLS[key], 'rb').read()).decode('ascii')
apps = [('drm', b64('drm')), ('p6', b64('p6')), ('asme', b64('asme')),
        ('ceyhan', old['ceyhan']), ('tank', old['tank'])]
html = html[:m.start()] + '<script id="mrd-embedded-apps">window.__MRD_APPS__={' + \
       ','.join(f'{k}:"{v}"' for k, v in apps) + '};</script>' + html[m.end():]

# ── the host: a bar with a way home, and the apps' storage kept ──────────
once('Meridian top bar. Used for Project Details / P6-PLAN4e / VENDOR Doc.',
     'MERIDIAM bar. Used for every app on the launchpad and the tank review.', 'host comment')
between('    <div id="mrd-app-topbar">', '    <!-- Project picker landing', src['host_topbar.html'], 'host topbar')
once('<!-- Project picker landing (shared by Project Details & Revision & Tracking) -->',
     '<!-- Project picker landing (Project Details) -->', 'landing comment')
once('<iframe id="mrd-app-frame" title="Meridiam embedded application" style="display:none;"></iframe>',
     '<iframe id="mrd-app-frame" title="MERIDIAM application" style="display:none;"></iframe>',
     'host iframe')
between('  <script>\n  /* ── Embedded-app host (isolated iframes)', '  <script>\n  /* ── MERIDIAM brand logo',
        src['host.js'] + '\n', 'host script')

# ── no more wheel-to-scroll: there is nothing to scroll through ──────────
once('/* ── MERIDIAM brand logo, full-screen on open, scroll-to-move modules ── */',
     '/* ── MERIDIAM brand logo, full-screen on open ── */', 'logo script comment')
a = html.find('    // 2) On the suites page, the mouse wheel steps')
b = html.find('      }, { passive: false });\n    }\n', a)
assert a > 0 and b > a, 'wheel listener'
html = html[:a] + html[b + len('      }, { passive: false });\n    }\n'):]

# ── the suite's own sheet, the help button and the scripts, last ─────────
once('</body>', src['suite.css'] + src['help.html'] + src['suite.js'] + '</body>', 'body end')

# nothing left that pointed at the old modules
for gone in ('selectCard', 'cardsTrack', 'main-home-link', 'revtrack', 'hassi', 'VENDOR Doc Tool', 'window.navigate'):
    assert gone not in html, f'leftover: {gone}'

open(OUT, 'w', encoding='utf-8').write(html)
print(f'wrote {OUT}: {len(html.encode("utf-8")):,} bytes; ASME modules {n_mod}; apps ' +
      ', '.join(f'{k} {len(v):,}' for k, v in apps))
