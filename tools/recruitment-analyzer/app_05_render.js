/* ===========================================================================
   [UI] DASHBOARD RENDERING
   Pure presentation: reads an analysis object + CONFIG and paints DOM. No
   scoring or data logic here. Enterprise style — tiles, tables, meters; no
   decorative chrome.
   =========================================================================== */
const CONF_LABEL={high:"Verified",medium:"Check",low:"Unreliable",none:"No dates",manual:"Manual"};
const CONF_CHIP ={high:"good",medium:"warn",low:"bad",none:"bad",manual:"info"};

function kpiTile(label,value,foot){
  return `<div class="kpi"><div class="l">${label}</div><div class="v">${value}</div>
    ${foot?`<div class="f">${foot}</div>`:""}<div class="accent"></div></div>`;
}
function meterCell(cand,ref,max){
  const w=max?Math.round(cand/max*100):0, rp=max?Math.round(ref/max*100):0;
  const col=cand>=ref?"var(--good)":cand>=ref-1?"var(--warn)":"var(--bad)";
  return `<div class="meter"><i style="width:${w}%;background:${col}"></i><span class="ref" style="left:${rp}%"></span></div>`;
}
function gapCell(g){
  if(g>0)return `<span class="gap-neg">−${g}</span>`;
  if(g<0)return `<span class="gap-pos">+${-g}</span>`;
  return `<span class="gap-zero">0</span>`;
}

function render(a){
  const d=$("#screen-dash"); d.innerHTML=""; showScreen("dash");

  /* roster — switch between resumes in this batch */
  if(ANALYSES.length>1){
    const r=el("div","card pad"); r.style.marginBottom="18px";
    r.innerHTML=`<div style="font-size:12px;font-weight:600;color:var(--ink-2);margin-bottom:4px">Batch · ${ANALYSES.length} resumes</div>`;
    const row=el("div","roster");
    ANALYSES.forEach((x,i)=>{
      const t=el("span","rtab"+(i===CURRENT?" active":""),`${esc(x.name)} <span class="chip ${x.verdict.cls} small" style="padding:1px 7px">${CONFIG.levels[x.best].code}</span>`);
      t.onclick=()=>{CURRENT=i;render(ANALYSES[i]);};
      row.appendChild(t);
    });
    r.appendChild(row); d.appendChild(r);
  }

  /* KPI tiles */
  const kp=el("div","kpis");
  kp.innerHTML=
    kpiTile("Candidate",esc(a.name),(a.email?esc(a.email):"")+(a.phone?" · "+esc(a.phone):"")||"—")+
    kpiTile("Applied for",`${a.applied.code} · ${esc(a.applied.short)}`,esc(trackTitle(a,a.applied.i)))+
    kpiTile("Best-fit level",`${CONFIG.levels[a.best].code} · ${esc(CONFIG.levels[a.best].short)}`,esc(trackTitle(a,a.best)))+
    kpiTile("Experience",a.years.toFixed(1)+" yrs",
      `${a.ranges.length} dated role${a.ranges.length!==1?"s":""} · <span class="chip ${CONF_CHIP[a.rec.confidence]} small" style="padding:0 6px">${CONF_LABEL[a.rec.confidence]}</span>`);
  d.appendChild(kp);

  /* verdict banner */
  const vb=el("div","card pad"); vb.style.marginTop="16px";
  const pct=Math.round(a.fit.bestObj.combined*100);
  vb.innerHTML=`<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
     <span class="chip ${a.verdict.cls}" style="font-size:13px;padding:5px 12px">${a.verdict.t}</span>
     <span class="muted small">Best-fit profile vs the selected <b style="color:var(--ink)">${a.applied.code} · ${esc(trackTitle(a,a.applied.i))}</b> role.</span>
     <span style="margin-left:auto" class="small muted">Skill evidence ≈ <b>${CONFIG.levels[a.fit.skillLevel].code}</b> · Experience ≈ <b>${CONFIG.levels[a.fit.yearsLevel].code}</b> · Match ${pct}%</span>
   </div>`;
  d.appendChild(vb);

  /* experience audit */
  d.appendChild(renderExpAudit(a));

  /* findings + timeline */
  secTitle(d,"Timeline & consistency checks","Screening");
  const two=el("div","two");
  const fc=el("div","card"); fc.innerHTML=`<div class="card-h"><h3>Findings</h3></div>`;
  const fb=el("div","card-b");
  a.flags.forEach(f=>{
    const sev={high:"High",med:"Medium",low:"Note",ok:"OK"}[f.sev];
    fb.appendChild(el("div","finding "+f.sev,
      `<span class="d"></span><div><div class="ft">${esc(f.ft)}</div><div class="fb">${esc(f.fb)}</div></div><span class="sev">${sev}</span>`));
  });
  fc.appendChild(fb); two.appendChild(fc);
  const tc=el("div","card"); tc.innerHTML=`<div class="card-h"><h3>Career timeline</h3></div>`;
  const tb=el("div","card-b"); tb.appendChild(renderTimeline(a)); tc.appendChild(tb); two.appendChild(tc);
  d.appendChild(two);

  /* level mapping */
  secTitle(d,"Designation mapping",esc(CONFIG.meta.org));
  d.appendChild(renderLevelMap(a));

  /* Section A — technical */
  secTitle(d,"Section A · Technical skills",`PCI ${CONFIG.meta.techMin}–${CONFIG.meta.techMax} · ${CONFIG.skills.length} skills`);
  d.appendChild(renderSkillTable(a));

  /* Section B + C */
  secTitle(d,"Sections B & C · Behavioral and competencies",`JCS ${CONFIG.meta.behMin}–${CONFIG.meta.behMax} · qualitative`);
  const bc=el("div","two");
  if(CONFIG.behavioral.length) bc.appendChild(renderBehav(a));
  if(CONFIG.competencies.length) bc.appendChild(renderComp(a));
  d.appendChild(bc);

  /* interview focus */
  if(a.focus.length){ secTitle(d,"Recommended interview focus","Largest gaps"); d.appendChild(renderFocus(a)); }

  /* exports */
  secTitle(d,"Reports","Export");
  const ex=el("div","card pad");
  ex.innerHTML=`<span class="muted small" style="margin-right:14px">Generate the evaluation kit for <b style="color:var(--ink)">${esc(a.name)}</b>:</span>`;
  const b1=el("button","btn","⬇ Evaluation Kit (Excel)"); b1.onclick=()=>exportKit(a);
  const b2=el("button","btn sec","🖨 Print / Save as PDF"); b2.onclick=()=>window.print();
  ex.appendChild(b1); ex.appendChild(b2); d.appendChild(ex);

  /* raw text */
  const raw=el("details","raw");
  raw.innerHTML=`<summary>View extracted resume text (for verification)${a.ocr?' · OCR':''}</summary>`;
  const pre=el("div","cvtext"); pre.textContent=a.text; raw.appendChild(pre); d.appendChild(raw);

  d.appendChild(el("div","foot",
    "Scores are automated estimates from resume keywords and seniority signals — a screening aid, not a decision. "+
    "Confirm every score in the interview against the framework. All processing is in-browser; nothing is stored or uploaded."));
  window.scrollTo(0,0);
}

function secTitle(parent,title,tag){
  parent.appendChild(el("div","sec",`<h2>${esc(title)}</h2><span class="ln"></span><span class="tag">${esc(tag||"")}</span>`));
}

/* ---- experience audit (reviewer can correct ranges / override the total) ---- */
function renderExpAudit(a){
  const wrap=el("div","card"); wrap.style.marginTop="16px";
  const R=a.rec, conf=CONF_CHIP[R.confidence];
  wrap.innerHTML=`<div class="card-h"><h3>Experience audit</h3>
    <span class="chip ${conf}">${CONF_LABEL[R.confidence]} confidence</span>
    <span class="tag" style="margin-left:auto">${esc(R.basis)}</span></div>`;
  const b=el("div","card-b");
  b.innerHTML=`<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">
    ${["Union of dated roles|"+R.union.toFixed(1)+" yrs","First → last|"+R.span.toFixed(1)+" yrs",
       "Stated in CV|"+(R.claim?R.claim+" yrs":"—"),"Reported|"+a.years.toFixed(1)+" yrs"]
      .map(s=>{const[k,v]=s.split("|");return `<span class="chip neutral">${k} <b style="color:var(--ink);margin-left:4px">${v}</b></span>`;}).join("")}</div>`;
  if(!a.allRanges.length){
    b.appendChild(el("div","muted small","No date ranges could be read from this resume. Enter the correct total below."));
  }else{
    const tbl=el("table","tbl");
    tbl.innerHTML="<tr><th>Count</th><th>Period</th><th>Length</th><th>Counted as</th><th>Source line</th></tr>";
    a.allRanges.forEach(r=>{
      const tr=el("tr"); if(r.excluded)tr.style.opacity=".5";
      const cb=el("input");cb.type="checkbox";cb.checked=!r.excluded;
      cb.onchange=()=>{r.excluded=!cb.checked;recompute(a);render(a);};
      const td0=el("td");td0.appendChild(cb);
      const sel=el("select");sel.style.cssText="padding:3px 6px;font-size:12px";
      [["work","Work"],["education","Education"],["other","Intern/academic"]].forEach(([v,l])=>{
        const o=el("option",null,l);o.value=v;if(r.kind===v)o.selected=true;sel.appendChild(o);});
      sel.onchange=()=>{r.kind=sel.value;recompute(a);render(a);};
      const td3=el("td");td3.appendChild(sel);
      tr.appendChild(td0);
      tr.appendChild(el("td",null,fmtYM(r.s)+" → "+(r.open?"present":fmtYM(r.e))));
      tr.appendChild(el("td",null,((r.e-r.s)/12).toFixed(1)+" yrs"));
      tr.appendChild(td3);
      const src=el("td","small muted",esc(r.src||r.raw||"")); src.style.cssText="max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
      tr.appendChild(src); tbl.appendChild(tr);
    });
    b.appendChild(tbl);
  }
  const ov=el("div"); ov.style.cssText="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px;border-top:1px dashed var(--line);padding-top:14px";
  const inp=el("input");inp.type="number";inp.step="0.5";inp.min="0";inp.max="60";inp.placeholder=a.years.toFixed(1);inp.value=a.override||"";
  inp.style.cssText="width:110px;padding:7px 9px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink)";
  const ap=el("button","btn sm","Apply override"); ap.onclick=()=>{a.override=inp.value;recompute(a);render(a);};
  const cl=el("button","btn sec sm","Reset to auto"); cl.onclick=()=>{a.override="";recompute(a);render(a);};
  inp.onkeydown=e=>{if(e.key==="Enter")ap.onclick();};
  ov.appendChild(el("span","small muted","Override the total:")); ov.appendChild(inp); ov.appendChild(ap); ov.appendChild(cl);
  ov.appendChild(el("span","small muted","This figure flows into the kit and every score."));
  b.appendChild(ov); wrap.appendChild(b); return wrap;
}

/* ---- career timeline (simple proportional bars) ---- */
function renderTimeline(a){
  const box=el("div");
  if(!a.merged.length && !a.eduRanges.length){ box.appendChild(el("div","muted small","No dated history to plot.")); return box; }
  const all=[...a.ranges.map(r=>({...r,t:"work"})),...a.eduRanges.map(r=>({...r,t:"edu"})),...a.otherRanges.map(r=>({...r,t:"other"}))];
  const lo=Math.min(...all.map(r=>r.s)), hi=Math.max(...all.map(r=>r.e),NOW_YM), span=Math.max(1,hi-lo);
  const col={work:"var(--brand)",edu:"var(--ink-3)",other:"var(--warn)"};
  all.sort((x,y)=>x.s-y.s).forEach(r=>{
    const left=(r.s-lo)/span*100, w=Math.max(1.5,(r.e-r.s)/span*100);
    const row=el("div"); row.style.cssText="display:flex;align-items:center;gap:9px;margin:5px 0";
    row.innerHTML=`<div class="small muted" style="width:118px;flex:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${fmtYM(r.s)}–${r.open?"now":fmtYM(r.e)}</div>
      <div style="flex:1;position:relative;height:14px;background:var(--line-2);border-radius:3px">
        <div style="position:absolute;left:${left}%;width:${w}%;top:0;bottom:0;background:${col[r.t]};border-radius:3px"></div></div>`;
    box.appendChild(row);
  });
  box.appendChild(el("div","small muted",`<span style="color:var(--brand)">■</span> work &nbsp; <span style="color:var(--ink-3)">■</span> education &nbsp; <span style="color:var(--warn)">■</span> internship/academic`));
  return box;
}

/* ---- level mapping table ---- */
function renderLevelMap(a){
  const c=el("div","card"); const b=el("div","card-b"); b.style.overflowX="auto";
  const tbl=el("table","tbl");
  tbl.innerHTML="<tr><th>Level</th><th>Title</th><th>Band</th><th>Skill match</th><th>Fit</th><th></th></tr>";
  a.fit.perLevel.forEach(p=>{
    const L=p.L, isBest=L.i===a.best, isApp=L.i===a.applied.i;
    const tr=el("tr"); if(isBest)tr.style.background="var(--brand-050)";
    tr.innerHTML=`<td><b>${L.code}</b> <span class="muted">${esc(L.short)}</span></td>
      <td class="small">${esc(trackTitle(a,L.i))}</td>
      <td class="small muted">${bandTxt(L)}</td>
      <td style="min-width:120px">${meterCell(Math.round(p.ratio*100),CONFIG.meta.meets*100,100)}<span class="small muted"> ${Math.round(p.ratio*100)}%</span></td>
      <td class="small">${Math.round(p.combined*100)}%</td>
      <td class="small">${isBest?'<span class="chip good" style="padding:1px 8px">Best fit</span>':''} ${isApp?'<span class="chip info" style="padding:1px 8px">Applied</span>':''}</td>`;
    tbl.appendChild(tr);
  });
  b.appendChild(tbl); c.appendChild(b); return c;
}

/* ---- Section A skill table ---- */
function renderSkillTable(a){
  const c=el("div","card"); const b=el("div","card-b"); b.style.overflowX="auto";
  const tbl=el("table","tbl");
  tbl.innerHTML=`<tr><th>Skill</th><th>Group</th><th style="width:150px">Candidate vs ${a.applied.code} ref</th><th>Cand</th><th>Ref</th><th>Gap</th><th>Evidence</th></tr>`;
  CONFIG.skills.forEach((sk,i)=>{
    const cand=a.sA[i].score, ref=sk.ref[a.applied.i], gap=ref-cand;
    const tr=el("tr");
    tr.innerHTML=`<td>${esc(sk.n)}</td><td class="small muted">${esc(sk.g)}</td>
      <td>${meterCell(cand,ref,CONFIG.meta.techMax)}</td>
      <td><b>${cand}</b></td><td class="muted">${ref}</td><td>${gapCell(gap)}</td>
      <td class="small muted">${a.sA[i].evidence.length?esc(a.sA[i].evidence.slice(0,3).join(", ")):"—"}</td>`;
    tbl.appendChild(tr);
  });
  b.appendChild(tbl); c.appendChild(b); return c;
}

/* ---- Section B behavioral ---- */
function renderBehav(a){
  const c=el("div","card"); c.innerHTML=`<div class="card-h"><h3>Behavioral dimensions</h3><span class="tag">JCS ${CONFIG.meta.behMin}–${CONFIG.meta.behMax}</span></div>`;
  const b=el("div","card-b"); const tbl=el("table","tbl");
  tbl.innerHTML=`<tr><th>Dimension</th><th style="width:150px">Estimate vs ref</th><th>Est</th><th>Ref</th></tr>`;
  CONFIG.behavioral.forEach((dd,i)=>{
    const est=a.sB[i].score, ref=dd.ref[a.applied.i];
    tbl.innerHTML+=`<tr><td>${esc(dd.dim)}</td>
      <td>${meterCell(est-CONFIG.meta.behMin+1,ref-CONFIG.meta.behMin+1,CONFIG.meta.behMax-CONFIG.meta.behMin+1)}</td>
      <td><b>${est}</b></td><td class="muted">${ref}</td></tr>`;
  });
  b.appendChild(tbl); c.appendChild(b); return c;
}

/* ---- Section C competencies ---- */
function renderComp(a){
  const c=el("div","card"); c.innerHTML=`<div class="card-h"><h3>Role competencies</h3><span class="tag">Qualitative</span></div>`;
  const b=el("div","card-b"); const tbl=el("table","tbl");
  tbl.innerHTML=`<tr><th>Competency</th><th>Estimated</th><th>Target (${a.applied.code})</th></tr>`;
  CONFIG.competencies.forEach((cc,i)=>{
    const est=a.sC[i], target=cc.levels[a.applied.i]||"—";
    const ok=est.level>=a.applied.i;
    tbl.innerHTML+=`<tr><td>${esc(cc.name)}</td>
      <td><span class="chip ${ok?"good":"warn"}" style="padding:1px 8px">${esc(est.desc)}</span></td>
      <td class="small muted">${esc(target)}</td></tr>`;
  });
  b.appendChild(tbl); c.appendChild(b); return c;
}

/* ---- interview focus ---- */
function renderFocus(a){
  const c=el("div","card"); const b=el("div","card-b");
  a.focus.slice(0,6).forEach(f=>{
    const qs=CONFIG.questions[f.name.toLowerCase()]||[];
    const row=el("div"); row.style.cssText="padding:11px 0;border-bottom:1px solid var(--line-2)";
    row.innerHTML=`<div style="display:flex;align-items:center;gap:10px">
        <b>${esc(f.name)}</b><span class="chip warn small" style="padding:1px 8px">gap ${f.gap}</span>
        <span class="small muted">candidate ${f.cand} vs ${a.applied.code} target ${f.ref}</span></div>
      ${qs.length?`<ul class="small muted" style="margin:6px 0 0;padding-left:18px">${qs.slice(0,3).map(q=>`<li>${esc(q)}</li>`).join("")}</ul>`:""}`;
    b.appendChild(row);
  });
  c.appendChild(b); return c;
}
