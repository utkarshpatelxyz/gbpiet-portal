/* ===========================================================================
   [UI] EVENT WIRING & FLOW CONTROL
   Connects the three screens. Also the ingest points where [DATA] enters:
   the config workbook (onConfigFile) and the resumes (onCvFiles). Both parse
   in-browser and land only in the in-memory state from section 01.
   =========================================================================== */

/* ---- reset ---- */
$("#resetBtn").addEventListener("click",()=>{ if(confirm("Clear the framework and all resumes from this session?")) wipeSession(); });

/* ---- template download ---- */
$("#tmplBtn").addEventListener("click",downloadTemplate);

/* ---- generic dropzone helper ---- */
function wireDrop(dzSel,inputSel,onFiles){
  const dz=$(dzSel),input=$(inputSel);
  dz.addEventListener("click",()=>input.click());
  input.addEventListener("change",()=>{ if(input.files.length) onFiles([...input.files]); input.value=""; });
  ["dragover","dragenter"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add("drag");}));
  ["dragleave","drop"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove("drag");}));
  dz.addEventListener("drop",e=>{ const f=[...(e.dataTransfer?.files||[])]; if(f.length) onFiles(f); });
}

/* ---- STEP 1: config workbook ingest ------------------------------------- */
wireDrop("#cfgDrop","#cfgFile",files=>onConfigFile(files[0]));
async function onConfigFile(file){
  const st=$("#cfgStatus"); st.className="status"; st.textContent="Reading workbook…";
  try{
    const buf=await file.arrayBuffer();
    const wb=window.XLSX.read(buf,{type:"array"});     // [DATA] framework enters here
    CONFIG=parseConfigWorkbook(wb);                    // → in-memory only
    st.textContent="";
    showConfigSummary(file.name);
    populateRoleDropdown();
    $("#cfgChipHolder").textContent=CONFIG.meta.org;
    showScreen("resume");
  }catch(err){
    CONFIG=null;
    st.className="status err";
    st.innerHTML = err.list ? "Could not use this workbook:<br>• "+err.list.map(esc).join("<br>• ")
                            : "Could not read this file. Is it the .xlsx configuration workbook? ("+esc(err.message)+")";
  }
}
function showConfigSummary(fname){
  const s=$("#cfgSummary"); s.classList.remove("hide");
  s.innerHTML=`<div class="filechip">✓ <b>${esc(fname)}</b> loaded — held in memory only
      <span class="x" title="unload" onclick="wipeSession()">✕</span></div>
    <div class="small muted" style="margin-top:8px">${esc(CONFIG.meta.org)} · ${CONFIG.levels.length} levels ·
      ${CONFIG.skills.length} skills · ${CONFIG.behavioral.length} behavioral · ${CONFIG.competencies.length} competencies</div>`;
}

/* populate the target-position dropdown from the loaded framework */
function populateRoleDropdown(){
  const sel=$("#appliedRole"); sel.innerHTML="";
  const addTrack=(label,track)=>{
    const g=document.createElement("optgroup"); g.label=label+" track";
    CONFIG.levels.forEach(L=>{const o=document.createElement("option");
      o.value=track+":"+L.i; o.textContent=`${L.code} · ${track==="B"&&L.titleB?L.titleB:L.titleA}  (${bandTxt(L)})`;
      g.appendChild(o);});
    sel.appendChild(g);
  };
  addTrack(CONFIG.meta.trackA,"A");
  if(CONFIG.meta.trackB) addTrack(CONFIG.meta.trackB,"B");
  // default to a mid level
  sel.value="A:"+Math.min(CONFIG.levels.length-1,Math.floor(CONFIG.levels.length/2));
}

/* ---- STEP 2: resume ingest ---------------------------------------------- */
wireDrop("#cvDrop","#cvFile",onCvFiles);
async function onCvFiles(files){
  const st=$("#cvStatus"), bar=$("#cvBar"); st.className="status";
  for(const f of files){
    if(f.type!=="application/pdf" && !/\.pdf$/i.test(f.name)){ continue; }
    if(CV_FILES.some(x=>x.name===f.name)) continue;
    st.textContent="Reading "+f.name+"…"; bar.style.display="block";
    try{
      const prog=m=>{ if(m.status==="ocr-start")st.textContent="No text layer — running OCR on "+f.name+"…";
        if(m.progress!=null){bar.querySelector("i").style.width=Math.round(m.progress*100)+"%";} };
      const {text,ocr}=await extractPdf(f,prog,false);   // [DATA] resume text enters here
      CV_FILES.push({name:f.name,text,ocr});
    }catch(err){ st.className="status err"; st.textContent="Failed to read "+f.name+": "+err.message; }
  }
  bar.style.display="none"; bar.querySelector("i").style.width="0";
  if(st.className!=="status err") st.textContent=CV_FILES.length+" resume(s) ready.";
  renderCvRoster();
  $("#analyzeBtn").disabled = CV_FILES.length===0;
}
function renderCvRoster(){
  const box=$("#cvFiles"); box.innerHTML="";
  CV_FILES.forEach((f,i)=>{
    const chip=el("span","filechip"); chip.style.marginTop="0";
    chip.innerHTML=`📄 ${esc(f.name)}${f.ocr?' <span class="chip info small" style="padding:0 6px">OCR</span>':''}
      <span class="x" title="remove">✕</span>`;
    chip.querySelector(".x").onclick=()=>{CV_FILES.splice(i,1);renderCvRoster();$("#analyzeBtn").disabled=CV_FILES.length===0;};
    box.appendChild(chip);
  });
}

/* ---- run analysis ------------------------------------------------------- */
$("#analyzeBtn").addEventListener("click",()=>{
  if(!CV_FILES.length)return;
  const [track,li]=$("#appliedRole").value.split(":");
  const nameOv=$("#nameOverride").value;
  ANALYSES = CV_FILES.map((f,idx)=>analyze(f,track,+li, CV_FILES.length===1?nameOv:""));
  CURRENT=0;
  render(ANALYSES[0]);
});

/* ---- back navigation ---- */
$("#backToCfg").addEventListener("click",()=>showScreen("config"));

/* start on screen 1 */
showScreen("config");
