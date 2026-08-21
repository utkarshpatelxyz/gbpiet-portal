import base64,os
lib="lib/package"
pdfjs=open(lib+"/build/pdf.min.js").read()
xlsx=open(lib+"/dist/xlsx.full.min.js").read()
worker=open(lib+"/build/pdf.worker.min.js").read()
wb64=base64.b64encode(worker.encode("utf-8")).decode("ascii")
tpl=open("app_template.html").read()

pdf_block=("<script>\n"+pdfjs+"\n</script>\n<script>\n(function(){try{\n"
 " var b=atob(\"__WB64__\");var len=b.length;var arr=new Uint8Array(len);for(var i=0;i<len;i++)arr[i]=b.charCodeAt(i);\n"
 " var blob=new Blob([arr],{type:'application/javascript'});\n"
 " pdfjsLib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(blob);\n"
 "}catch(e){console.error('worker init',e);} })();\n</script>").replace("__WB64__",wb64)
xlsx_block="<script>\n"+xlsx+"\n</script>"

# --- OCR (Tesseract) ---
tess_main=open("assets/tesseract.min.js").read()
tess_block="<script>\n"+tess_main+"\n</script>"
core_b64=base64.b64encode(open("assets/core-lstm.wasm.js","rb").read()).decode("ascii")
tworker_b64=base64.b64encode(open("assets/worker.min.js","rb").read()).decode("ascii")
eng_b64=base64.b64encode(open("assets/eng.traineddata.gz","rb").read()).decode("ascii")

# --- ExcelJS (fills the original kit template, preserving formatting) ---
exceljs_block="<script>\n"+open("assets/exceljs.min.js").read()+"\n</script>"
template_b64=base64.b64encode(open("template.xlsx","rb").read()).decode("ascii")

# --- date/experience engine (single source of truth, unit-tested via engine.test.js) ---
engine=open("engine.js").read()
engine=engine.split('if(typeof module!=="undefined"')[0]   # drop the node export tail

out=tpl.replace("<!--INJECT_ENGINE-->",engine)
out=out.replace("<!--INJECT_PDFJS-->",pdf_block)
out=out.replace("<!--INJECT_XLSX-->",xlsx_block)
out=out.replace("<!--INJECT_TESSERACT-->",tess_block)
out=out.replace("<!--INJECT_EXCELJS-->",exceljs_block)
out=out.replace("__CORE_B64__",core_b64)
out=out.replace("__TWORKER_B64__",tworker_b64)
out=out.replace("__ENG_B64__",eng_b64)
out=out.replace("__TEMPLATE_B64__",template_b64)

for tok in ["<!--INJECT_ENGINE-->","<!--INJECT_PDFJS-->","<!--INJECT_XLSX-->","<!--INJECT_TESSERACT-->","<!--INJECT_EXCELJS-->","__WB64__","__CORE_B64__","__TWORKER_B64__","__ENG_B64__","__TEMPLATE_B64__"]:
    assert tok not in out, "leftover "+tok
path="/home/user/gbpiet-portal/public/candidate-profile-analyzer.html"
open(path,"w").write(out)
print("written",round(len(out)/1024/1024,2),"MB")
