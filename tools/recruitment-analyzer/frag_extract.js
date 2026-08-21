   ============================================================ */
function b64ToBytes(b){const s=atob(b),n=s.length,a=new Uint8Array(n);for(let i=0;i<n;i++)a[i]=s.charCodeAt(i);return a;}

// extract the PDF's embedded text layer (fast path)
async function extractTextLayer(pdf){
  let out="";
  for(let p=1;p<=pdf.numPages;p++){
    const page=await pdf.getPage(p);
    const tc=await page.getTextContent();
    let lines={},order=[];
    tc.items.forEach(it=>{
      const y=Math.round(it.transform[5]);
      if(!(y in lines)){lines[y]=[];order.push(y);}
      lines[y].push(it.str);
    });
    order.sort((a,b)=>b-a);
    out+=order.map(y=>lines[y].join(" ").replace(/\s+/g," ").trim()).filter(Boolean).join("\n")+"\n";
  }
  return out.trim();
}

// ---- OCR (Tesseract.js), engine + English model embedded ----
let OCR_WORKER=null, OCR_WURL=null;
function ocrWorkerUrl(){
  if(OCR_WURL)return OCR_WURL;
  // A single self-contained Web Worker script, assembled from:
  //  (1) a shim that serves the embedded eng.traineddata over fetch (offline),
  //  (2) the Tesseract core (single-file wasm.js) — defining self.TesseractCore
  //      up front so the worker never importScripts/fetches it,
  //  (3) the tesseract.js worker script.
  const shim="(function(){var B=\""+OCR_ENG_B64+"\";var s=atob(B),n=s.length,E=new Uint8Array(n);for(var i=0;i<n;i++)E[i]=s.charCodeAt(i);"
    +"var _f=self.fetch?self.fetch.bind(self):null;"
    +"self.fetch=function(u,o){try{if(String(u).indexOf('traineddata')>=0)return Promise.resolve(new Response(E,{status:200,headers:{'Content-Type':'application/octet-stream'}}));}catch(e){}"
    +"return _f?_f(u,o):Promise.reject(new Error('offline:'+u));};})();\n";
  const coreText=new TextDecoder("utf-8").decode(b64ToBytes(OCR_CORE_B64));
  const workerText=new TextDecoder("utf-8").decode(b64ToBytes(OCR_WORKER_B64));
  OCR_WURL=URL.createObjectURL(new Blob([shim+coreText+"\n"+workerText],{type:"application/javascript"}));
  return OCR_WURL;
}
async function getOcrWorker(onProg){
  if(OCR_WORKER)return OCR_WORKER;
  if(typeof Tesseract==="undefined")throw new Error("OCR engine not available");
  const workerUrl=ocrWorkerUrl();
  OCR_WORKER=await Tesseract.createWorker("eng",1,{ // OEM 1 = LSTM only
    workerPath:workerUrl, langPath:"https://tessdata.local",
    workerBlobURL:false,
    logger:m=>{ if(onProg && m.status) onProg(m); }
  });
  return OCR_WORKER;
}
// render each page to a canvas and OCR it
async function ocrPdf(pdf,onProg){
  const worker=await getOcrWorker(onProg);
  let out="";
  for(let p=1;p<=pdf.numPages;p++){
    if(onProg)onProg({status:"rendering",page:p,pages:pdf.numPages,progress:0});
    const page=await pdf.getPage(p);
    let scale=2.0;
    const base=page.getViewport({scale:1});
    if(base.width*scale>2400)scale=2400/base.width; // cap for speed/memory
    const vp=page.getViewport({scale});
    const canvas=document.createElement("canvas");
    canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);
    await page.render({canvasContext:canvas.getContext("2d"),viewport:vp}).promise;
    const {data}=await worker.recognize(canvas,{},{text:true});
    out+=(data.text||"").replace(/[ \t]+\n/g,"\n")+"\n";
    canvas.width=canvas.height=0;
  }
  return out.trim();
}

// full extraction: text layer first, OCR fallback (or forced)
async function extractPdf(file,onProg,forceOcr){
  const buf=await file.arrayBuffer();
  const pdf=await pdfjsLib.getDocument({data:buf}).promise;
  let text="",ocr=false;
  if(!forceOcr){
    text=await extractTextLayer(pdf);
  }
  const enough=text.replace(/\s/g,"").length>=120;
  if(forceOcr || !enough){
    if(onProg)onProg({status:"ocr-start"});
    const ot=await ocrPdf(pdf,onProg);
    // keep whichever is richer
    if(ot.replace(/\s/g,"").length > text.replace(/\s/g,"").length){text=ot;ocr=true;}
  }
  return {text,ocr,pages:pdf.numPages};
}

