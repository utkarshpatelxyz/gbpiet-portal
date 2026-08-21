/* ===========================================================================
   [CONFIG] REPORT EXPORT — evaluation kit built LIVE from CONFIG.
   The single-department build embedded a confidential .xlsx template and filled
   it. That template WAS confidential data living in the tool, so it is gone.
   Instead the kit is generated from scratch here (ExcelJS) using only the
   framework the user loaded this session. Nothing about the format is baked in.
   =========================================================================== */
const BRAND="FF2563EB", HEADF="FF1D4ED8", ZEBRA="FFF3F6FC", GAPBAD="FFFDECEC", GAPOK="FFE7F6EF", RULE="FFD9E0EC";

async function exportKit(a){
  const XLSXlib=window.ExcelJS;
  const wb=new XLSXlib.Workbook(); wb.creator="Recruitment Analyzer";
  const ws=wb.addWorksheet("Scorecard",{views:[{showGridLines:false}]});
  ws.columns=[{width:34},{width:12},{width:10},{width:10},{width:10},{width:52}];
  const bd={top:{style:"thin",color:{argb:RULE}},left:{style:"thin",color:{argb:RULE}},
            bottom:{style:"thin",color:{argb:RULE}},right:{style:"thin",color:{argb:RULE}}};
  let R=1;
  const band=(text,sub)=>{
    ws.mergeCells(R,1,R,6); const c=ws.getCell(R,1); c.value=text;
    c.fill={type:"pattern",pattern:"solid",fgColor:{argb:BRAND}};
    c.font={bold:true,color:{argb:"FFFFFFFF"},size:13}; c.alignment={vertical:"middle"};
    ws.getRow(R).height=24; R++;
    if(sub){ws.mergeCells(R,1,R,6);const s=ws.getCell(R,1);s.value=sub;s.font={color:{argb:"FF5B6675"},size:10};R++;}
  };
  const field=(label,val)=>{
    const r=ws.getRow(R); r.getCell(1).value=label; r.getCell(1).font={bold:true,size:10};
    ws.mergeCells(R,2,R,6); const v=ws.getCell(R,2); v.value=val; v.font={size:10};
    [1,2].forEach(i=>ws.getCell(R,i).border=bd); R++;
  };
  const headerRow=(cells)=>{
    const r=ws.getRow(R); cells.forEach((t,i)=>{const c=r.getCell(i+1);c.value=t;
      c.fill={type:"pattern",pattern:"solid",fgColor:{argb:HEADF}};c.font={bold:true,color:{argb:"FFFFFFFF"},size:10};
      c.alignment={vertical:"middle",horizontal:i>=2&&i<=4?"center":"left",wrapText:true};c.border=bd;});
    r.height=20; R++;
  };

  band(CONFIG.meta.reportTitle, CONFIG.meta.org);
  R++;
  field("Candidate", a.name);
  field("Position applied", `${a.applied.code} · ${trackTitle(a,a.applied.i)}`);
  field("Target level", `${a.applied.code} — ${a.applied.short} (${bandTxt(a.applied)})`);
  field("Best-fit (auto)", `${CONFIG.levels[a.best].code} · ${trackTitle(a,a.best)}`);
  field("Professional experience", `${a.years.toFixed(1)} yrs (${a.rec.basis})`);
  field("Interview date", ""); field("Interviewer", "");
  R++;

  // Section A
  band("Section A — Technical Skills",`Scale ${CONFIG.meta.techMin}–${CONFIG.meta.techMax}. Ref = expected at ${a.applied.code}. Your Score to be confirmed in interview.`);
  headerRow(["Skill","Group","Ref","Auto","Gap","Notes / evidence"]);
  CONFIG.skills.forEach((sk,i)=>{
    const cand=a.sA[i].score, ref=sk.ref[a.applied.i], gap=cand-ref;
    const r=ws.getRow(R);
    const vals=[sk.n,sk.g,ref,cand,gap<0?`GAP ${gap}`:(gap>0?`+${gap}`:"meets"),
      a.sA[i].evidence.length?("evidence: "+a.sA[i].evidence.slice(0,4).join(", ")):""];
    vals.forEach((v,ci)=>{const c=r.getCell(ci+1);c.value=v;c.border=bd;c.font={size:10};
      c.alignment={vertical:"top",horizontal:ci>=2&&ci<=4?"center":"left",wrapText:true};
      if(i%2)c.fill={type:"pattern",pattern:"solid",fgColor:{argb:ZEBRA}};
      if(ci===4)c.fill={type:"pattern",pattern:"solid",fgColor:{argb:gap<0?GAPBAD:GAPOK}};});
    R++;
  });
  R++;

  // Section B
  if(CONFIG.behavioral.length){
    band("Section B — Behavioral Dimensions",`Scale ${CONFIG.meta.behMin}–${CONFIG.meta.behMax}.`);
    headerRow(["Dimension","","Ref","Auto","Gap",""]);
    CONFIG.behavioral.forEach((dd,i)=>{
      const est=a.sB[i].score, ref=dd.ref[a.applied.i], gap=est-ref;
      const r=ws.getRow(R);
      [dd.dim,"",ref,est,gap<0?`GAP ${gap}`:"ok",""].forEach((v,ci)=>{const c=r.getCell(ci+1);c.value=v;c.border=bd;c.font={size:10};
        c.alignment={horizontal:ci>=2&&ci<=4?"center":"left"};
        if(ci===4)c.fill={type:"pattern",pattern:"solid",fgColor:{argb:gap<0?GAPBAD:GAPOK}};});
      R++;
    });
    R++;
  }

  // Section C
  if(CONFIG.competencies.length){
    band("Section C — Role Competencies","Qualitative descriptor per level.");
    headerRow(["Competency","Estimated","","Target","",""]);
    CONFIG.competencies.forEach((cc,i)=>{
      const est=a.sC[i], target=cc.levels[a.applied.i]||"—";
      const r=ws.getRow(R); ws.mergeCells(R,2,R,3); ws.mergeCells(R,4,R,6);
      r.getCell(1).value=cc.name; r.getCell(2).value=est.desc; r.getCell(4).value=target;
      [1,2,4].forEach(ci=>{const c=r.getCell(ci);c.border=bd;c.font={size:10};c.alignment={wrapText:true}});
      R++;
    });
    R++;
  }

  // Overall
  band("Overall Assessment","");
  const rec = a.verdict.cls==="good"?"Recommended — proceed to interview.":
              a.verdict.cls==="warn"?"Proceed with caution — confirm the flagged gaps.":
              "Not a clear match for this level — review before proceeding.";
  field("Recommendation (auto)", rec);
  field("Screening flags", a.flags.filter(f=>f.sev!=="ok").map(f=>f.ft).join("; ")||"None");
  field("Comments / observations", "");
  R++;

  // Reference sheet — the framework, so the kit is self-contained
  const rf=wb.addWorksheet("Reference",{views:[{showGridLines:false}]});
  rf.columns=[{width:30},{width:12},...CONFIG.levels.map(()=>({width:8}))];
  let RR=1;
  const rfBand=t=>{rf.mergeCells(RR,1,RR,2+CONFIG.levels.length);const c=rf.getCell(RR,1);c.value=t;
    c.fill={type:"pattern",pattern:"solid",fgColor:{argb:BRAND}};c.font={bold:true,color:{argb:"FFFFFFFF"}};RR++;};
  rfBand("Framework reference — "+CONFIG.meta.org);
  const rh=rf.getRow(RR); ["Skill","Group",...CONFIG.levels.map(l=>l.code)].forEach((t,i)=>{
    const c=rh.getCell(i+1);c.value=t;c.font={bold:true,color:{argb:"FFFFFFFF"}};c.fill={type:"pattern",pattern:"solid",fgColor:{argb:HEADF}};c.border=bd;}); RR++;
  CONFIG.skills.forEach(sk=>{const r=rf.getRow(RR);[sk.n,sk.g,...sk.ref].forEach((v,i)=>{const c=r.getCell(i+1);c.value=v;c.border=bd;c.font={size:10};c.alignment={horizontal:i>=2?"center":"left"}});RR++;});

  const buf=await wb.xlsx.writeBuffer();
  downloadBlob(new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),
    (CONFIG.meta.reportTitle.replace(/[^\w]+/g,"_"))+"_"+a.name.replace(/[^\w]+/g,"_")+"_"+a.applied.code+".xlsx");
}

function downloadBlob(blob,name){
  const u=URL.createObjectURL(blob); const link=el("a"); link.href=u; link.download=name;
  document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(u),1500);
}

/* [UI] the blank config template lives in the tool as a NEUTRAL sample (no
   customer data). It is offered for download so a new user can start filling. */
const CFG_TEMPLATE_B64="__CFG_TEMPLATE_B64__";
function downloadTemplate(){
  downloadBlob(new Blob([b64ToBytes(CFG_TEMPLATE_B64)],
    {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),
    "Recruitment_Framework_Config_TEMPLATE.xlsx");
}
