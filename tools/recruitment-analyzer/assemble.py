import base64, re
LIB="../lib/package"; AS="../assets"
def read(p): return open(p,encoding="utf-8").read()
def b64f(p): return base64.b64encode(open(p,"rb").read()).decode("ascii")

# ---- libraries (inlined) ----
pdfjs   = read(LIB+"/build/pdf.min.js")
worker_b64 = base64.b64encode(read(LIB+"/build/pdf.worker.min.js").encode()).decode()
xlsx    = read(LIB+"/dist/xlsx.full.min.js")
tess    = read(AS+"/tesseract.min.js")
exceljs = read(AS+"/exceljs.min.js")

pdf_block=("<script>\n"+pdfjs+"\n</script>\n<script>\n(function(){try{"
 "var b=atob(\"__WB64__\");var a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);"
 "pdfjsLib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([a],{type:'application/javascript'}));"
 "}catch(e){console.error('worker init',e);}})();\n</script>").replace("__WB64__",worker_b64)

# ---- engine (fixed date core), strip node export tail ----
engine = read("../engine.js").split('if(typeof module!=="undefined"')[0]

# ---- reusable engine fragments (verbatim from the proven build) ----
frag_extract = "/* [ENGINE] PDF text extraction + on-device OCR (fixed core)\n" + read("frag_extract.js")
frag_names   = read("frag_names.js")

# ---- app modules (this project) ----
app = "\n".join(read(f) for f in [
  "app_01_state.js","app_02_config.js","app_03_scoring.js","app_04_analyze.js",
  "app_05_render.js","app_06_export.js","app_07_wiring.js"])

# ---- OCR + config-template assets ----
ocr_assets = ("<script>\n"
  'const OCR_CORE_B64="'   + b64f(AS+"/core-lstm.wasm.js") + '";\n'
  'const OCR_WORKER_B64="' + b64f(AS+"/worker.min.js")     + '";\n'
  'const OCR_ENG_B64="'    + b64f(AS+"/eng.traineddata.gz")+ '";\n'
  "</script>")
cfg_template_b64 = b64f("Recruitment_Framework_Config_TEMPLATE.xlsx")

head = read("app_head.html")
body = read("app_body.html")

engine_script = ("<script>\n"
  "/* ================= FIXED ENGINE (date/experience core) ================= */\n"
  + engine + "\n"
  + frag_extract + "\n"
  + frag_names + "\n"
  "/* ================= CONFIG-DRIVEN APP ================= */\n"
  + app + "\n"
  "</script>")
engine_script = engine_script.replace("__CFG_TEMPLATE_B64__", cfg_template_b64)

out = (head + "\n" + body + "\n"
  + pdf_block + "\n"
  + "<script>\n"+xlsx+"\n</script>\n"
  + "<script>\n"+tess+"\n</script>\n"
  + "<script>\n"+exceljs+"\n</script>\n"
  + ocr_assets + "\n"
  + engine_script + "\n"
  + "</body></html>\n")

for tok in ["__WB64__","__CFG_TEMPLATE_B64__","<!--INJECT"]:
    assert tok not in out, "leftover "+tok
path="/home/user/gbpiet-portal/public/recruitment-analyzer.html"
open(path,"w",encoding="utf-8").write(out)
print("written", round(len(out)/1024/1024,2), "MB ->", path)
