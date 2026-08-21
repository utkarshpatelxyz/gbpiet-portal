/* ===========================================================================
   [DATA] APPLICATION STATE  — the ONLY place confidential data lives.
   Every field here is an ordinary JS variable in this tab. There is no
   localStorage, no IndexedDB, no network. Closing/refreshing the tab (or the
   Reset button) drops all of it. This is the mechanism behind the privacy
   promise — not a policy, but the absence of any persistence path.
   =========================================================================== */
let CONFIG   = null;   // [DATA] the parsed hiring framework (from the workbook)
let CV_FILES = [];     // [DATA] [{name, text, ocr}] extracted resume text
let ANALYSES = [];     // [DATA] analysis result per resume
let CURRENT  = 0;      // [UI]   index of the resume shown on the dashboard

const $=s=>document.querySelector(s);
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

/* [DATA] wipeSession — the explicit teardown the Reset button calls. Reloading
   the page does the same thing implicitly; this just avoids a full reload. */
function wipeSession(){
  CONFIG=null; CV_FILES=[]; ANALYSES=[]; CURRENT=0;
  location.reload();   // simplest guaranteed-clean reset
}

/* [UI] theme toggle. Persisting ONLY the light/dark preference is deliberate —
   it is a UI setting, never framework or resume data. */
(function(){
  let saved="light"; try{saved=localStorage.getItem("ra-theme")||"light";}catch(e){}
  applyTheme(saved);
  document.addEventListener("click",e=>{
    if(!e.target.closest("#themeToggle"))return;
    const next=document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark";
    applyTheme(next); try{localStorage.setItem("ra-theme",next);}catch(e){}
  });
  function applyTheme(t){
    document.documentElement.setAttribute("data-theme",t);
    const lbl=$("#themeLabel"),ic=document.querySelector("#themeToggle .ti");
    if(lbl)lbl.textContent=t==="dark"?"Dark":"Light";
    if(ic)ic.textContent=t==="dark"?"🌙":"☀️";
  }
})();

/* [UI] screen + stepper control */
function showScreen(which){
  ["config","resume","dash"].forEach(s=>$("#screen-"+s).classList.toggle("hide",s!==which));
  const stepFor={config:1,resume:2,dash:3}[which];
  document.querySelectorAll("#stepline .step").forEach(st=>{
    const n=+st.dataset.step;
    st.classList.toggle("active",n===stepFor);
    st.classList.toggle("done",n<stepFor);
  });
  window.scrollTo(0,0);
}
