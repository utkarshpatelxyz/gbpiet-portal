import base64, re, io

UP = '/root/.claude/uploads/706cbad2-49b2-5620-866d-c844ed50268d/'
FILES = {
  'ceyhan': UP + '5e2654dd-CEYHAN_PDHPP_Equipment_Explorer_Updated.html',
  'p6':     UP + 'f7a79a65-P6PLAN4e_dashboard.html',
  'vendor': UP + '3f80eb12-Dashboard_VENDORdocV2_2.html',
}

FONT = ("<link rel='preconnect' href='https://fonts.googleapis.com'>"
        "<link href='https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap' rel='stylesheet'>")

# Light TR palette flip for the two dark, token-based dashboards (P6, Vendor)
DARK_FLIP = """
<style id='tr-consistency'>
:root{
  --bg:#EEF3F8 !important; --sf:#FFFFFF !important; --sf2:#F4F7FA !important; --sf3:#E8EEF4 !important;
  --border:#DCE4EC !important; --bdr2:#C9D6E2 !important;
  --text:#22415F !important; --t2:#5B7C9D !important; --t3:#93A7BC !important;
  --blue:#2F97AA !important; --blue2:#45C0CE !important;
}
body{ font-family:'Montserrat','Segoe UI',sans-serif !important; }
/* Lighten fixed dark chrome that isn't token-based */
.hdr{ background:#FFFFFF !important; color:#22415F !important; border-bottom:1px solid #DCE4EC !important; box-shadow:0 1px 8px rgba(34,65,95,.06) !important; }
.hdr-title{ color:#22415F !important; }
.tabs{ background:#EEF3F8 !important; }
.tab.active{ color:#22415F !important; }
.btn-primary{ background:linear-gradient(135deg,#4FC7D5,#2F97AA) !important; }
</style>
"""

# CEYHAN is already light; just unify the font + nudge navy/blue to TR
LIGHT_TUNE = """
<style id='tr-consistency'>
:root{
  --navy:#22415F !important; --navy2:#16293D !important;
  --blue:#2F97AA !important; --cyan:#45C0CE !important;
}
body{ font-family:'Montserrat',Inter,'Segoe UI',sans-serif !important; }
</style>
"""

OVERRIDE = { 'p6': DARK_FLIP, 'vendor': DARK_FLIP, 'ceyhan': LIGHT_TUNE }

def inject(html, key):
    add = FONT + OVERRIDE[key]
    # insert right before </head> (first, case-insensitive)
    m = re.search(r'</head>', html, re.I)
    if m:
        return html[:m.start()] + add + html[m.start():]
    return add + html

payload = {}
for key, path in FILES.items():
    html = open(path, encoding='utf-8').read()
    html = inject(html, key)
    b = base64.b64encode(html.encode('utf-8')).decode('ascii')
    payload[key] = b
    print(f"{key}: source {len(html)} chars -> base64 {len(b)} chars")

# Build the script that defines window.__MRD_APPS__
parts = []
for key in ('ceyhan','p6','vendor'):
    parts.append(f'{key}:"{payload[key]}"')
script = '<script id="mrd-embedded-apps">window.__MRD_APPS__={' + ','.join(parts) + '};</script>\n'

idx_path = '../index.html'
idx = open(idx_path, encoding='utf-8').read()

# Remove any prior embed (idempotent)
idx = re.sub(r'<script id="mrd-embedded-apps">.*?</script>\n?', '', idx, flags=re.S)

marker = '  <!-- ═══════════════════════════════════════════════════════════════\n       EMBEDDED APP HOST'
assert marker in idx, 'host marker not found'
idx = idx.replace(marker, script + marker, 1)

open(idx_path, 'w', encoding='utf-8').write(idx)
print('index.html size now:', len(idx))
