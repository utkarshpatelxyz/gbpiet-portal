"""Embed/refresh the HASSI MESSAOUD Fabrication Schedule app inside index.html.
Adds it to window.__MRD_APPS__ under key 'hassi'; additive & idempotent."""
import base64, re, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDX=os.path.join(ROOT,'index.html')
APP=os.path.join(ROOT,'tools','HASSI_Fabrication_Schedule.html')
idx=open(IDX,encoding='utf-8').read()
b64=base64.b64encode(open(APP,'rb').read()).decode('ascii')
marker='<script id="mrd-embedded-apps">window.__MRD_APPS__={'
if marker not in idx: raise SystemExit('mrd-embedded-apps script not found')
idx=re.sub(r',hassi:"[^"]*"(?=\};</script>)','',idx)
start=idx.index(marker); end=idx.index('};</script>',start)
idx=idx[:end]+',hassi:"'+b64+'"'+idx[end:]
open(IDX,'w',encoding='utf-8').write(idx)
print('hassi source bytes:',os.path.getsize(APP),'| base64:',len(b64),'| index size:',len(idx))
