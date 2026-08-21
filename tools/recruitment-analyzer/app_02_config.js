/* ===========================================================================
   [CONFIG] CONFIGURATION WORKBOOK PARSER + VALIDATOR
   Turns the uploaded .xlsx into the CONFIG object the engine reads. This is the
   ONLY bridge between the customer's confidential framework and the tool. It is
   intentionally strict and returns clear, human-readable errors so a recruiter
   (not a developer) can fix their workbook.

   Sheets are matched by a fuzzy key (number prefix / case ignored) so light
   relabelling by the user does not break it. Column positions inside a sheet
   are matched by header text for the same reason.
   =========================================================================== */

// find a worksheet whose name contains a keyword (case-insensitive)
function findSheet(wb,...keys){
  for(const name of wb.SheetNames){
    const k=name.toLowerCase();
    if(keys.some(x=>k.includes(x))) return wb.Sheets[name];
  }
  return null;
}
// read a sheet as an array-of-arrays (rows of cells), trimming trailing blanks
function grid(ws){
  if(!ws)return [];
  const X=window.XLSX;
  return X.utils.sheet_to_json(ws,{header:1,blankrows:false,defval:""})
    .map(r=>r.map(c=>typeof c==="string"?c.trim():c));
}
const splitKw=s=>String(s||"").split(/[,;\n]/).map(x=>x.trim().toLowerCase()).filter(Boolean);
const numOr=(v,d)=>{const n=parseFloat(v);return isFinite(n)?n:d;};

// map a header row to {normalizedLabel: columnIndex}
function headerIndex(row){
  const m={};
  row.forEach((h,i)=>{ if(h!=="") m[String(h).toLowerCase().replace(/\s+/g," ").trim()]=i; });
  return m;
}

function parseConfigWorkbook(wb){
  const errors=[];
  const need=(cond,msg)=>{ if(!cond)errors.push(msg); return cond; };

  /* ---- Setup sheet → meta ---- */
  const setupRows=grid(findSheet(wb,"setup"));
  const setup={};
  setupRows.forEach(r=>{ if(r[0]!=="") setup[String(r[0]).toLowerCase().replace(/\s+/g," ").trim()]=r[1]; });
  const S=k=>setup[k.toLowerCase()];
  const meta={
    org:        S("organization / department")||S("organization")||S("department")||"Recruitment",
    reportTitle:S("report title")||"Candidate Evaluation Kit",
    trackA:     S("track a label")||"Engineer",
    trackB:     (S("track b label")||"").trim(),
    techMin:    numOr(S("technical scale min"),0),
    techMax:    numOr(S("technical scale max"),4),
    behMin:     numOr(S("behavioral scale min"),1),
    behMax:     numOr(S("behavioral scale max"),7),
    skillWeight:numOr(S("skill weight (0-1)"),0.6),
    yearsWeight:numOr(S("years weight (0-1)"),0.4),
    meets:      numOr(S("meets-ratio threshold (0-1)"),0.7),
    strong:     splitKw(S("seniority signal keywords"))
  };
  need(setupRows.length>0,"Sheet '2. Setup' is missing or empty.");

  /* ---- Levels sheet ---- */
  const lvRows=grid(findSheet(wb,"level"));
  const levels=[];
  if(need(lvRows.length>1,"Sheet '3. Levels' has no level rows.")){
    const H=headerIndex(lvRows[0]);
    const ci=(...names)=>{for(const n of names){if(n in H)return H[n];}return -1;};
    const cCode=ci("level code","code"), cShort=ci("short name","name"),
          cMin=ci("min years","min yrs"), cMax=ci("max years","max yrs"),
          cA=ci("track a title"), cB=ci("track b title");
    need(cCode>=0,"Sheet '3. Levels' needs a 'Level Code' column.");
    lvRows.slice(1).forEach((r,i)=>{
      const code=String(r[cCode]||"").trim(); if(!code)return;
      levels.push({i:levels.length, code,
        short: cShort>=0?String(r[cShort]||"").trim():code,
        yMin:  numOr(r[cMin],0), yMax:numOr(r[cMax],99),
        titleA:cA>=0?String(r[cA]||"").trim():code,
        titleB:cB>=0?String(r[cB]||"").trim():""});
    });
  }
  const codes=levels.map(l=>l.code);
  const levelCols=(H)=>codes.map(c=>{
    // match a level column by exact code, else by code ignoring case/space
    if(c.toLowerCase() in H)return H[c.toLowerCase()];
    return -1;
  });

  /* ---- Technical Skills sheet (Section A) ---- */
  const skRows=grid(findSheet(wb,"technical","skill"));
  const skills=[];
  if(need(skRows.length>1,"Sheet '4. Technical Skills' has no skill rows.")){
    const H=headerIndex(skRows[0]);
    const cName=("skill" in H)?H["skill"]:1;
    const cGroup=("group" in H)?H["group"]:-1;
    const cKw=Object.keys(H).find(k=>k.includes("keyword"));
    const lc=levelCols(H);
    lc.forEach((idx,li)=>{ if(idx<0)errors.push(`Sheet '4. Technical Skills' is missing the level column '${codes[li]}'.`); });
    skRows.slice(1).forEach(r=>{
      const n=String(r[cName]||"").trim(); if(!n)return;
      skills.push({ n, g:cGroup>=0?String(r[cGroup]||"").trim()||"—":"—",
        kw:splitKw(cKw!=null?r[H[cKw]]:""),
        ref:lc.map(idx=>idx>=0?clamp(numOr(r[idx],0),meta.techMin,meta.techMax):0) });
    });
  }

  /* ---- Behavioral sheet (Section B) ---- */
  const bhRows=grid(findSheet(wb,"behav"));
  const behavioral=[];
  if(bhRows.length>1){
    const H=headerIndex(bhRows[0]);
    const cDim=("dimension" in H)?H["dimension"]:0;
    const cKw=Object.keys(H).find(k=>k.includes("keyword"));
    const cYw=Object.keys(H).find(k=>k.includes("years weight"));
    const cLg=Object.keys(H).find(k=>k.includes("link group"));
    const lc=levelCols(H);
    bhRows.slice(1).forEach(r=>{
      const dim=String(r[cDim]||"").trim(); if(!dim)return;
      behavioral.push({ dim, kw:splitKw(cKw!=null?r[H[cKw]]:""),
        yearsWeight:String((cYw!=null?r[H[cYw]]:"")||"Medium").trim().toLowerCase(),
        linkGroup:String((cLg!=null?r[H[cLg]]:"All")||"All").trim(),
        ref:lc.map(idx=>idx>=0?clamp(numOr(r[idx],meta.behMin),meta.behMin,meta.behMax):meta.behMin) });
    });
  }

  /* ---- Competencies sheet (Section C) ---- */
  const cpRows=grid(findSheet(wb,"compet"));
  const competencies=[];
  if(cpRows.length>1){
    const H=headerIndex(cpRows[0]);
    const cName=("competency" in H)?H["competency"]:0;
    const cKw=Object.keys(H).find(k=>k.includes("keyword"));
    const cYw=Object.keys(H).find(k=>k.includes("years weight"));
    const lc=levelCols(H);
    cpRows.slice(1).forEach(r=>{
      const name=String(r[cName]||"").trim(); if(!name)return;
      competencies.push({ name, kw:splitKw(cKw!=null?r[H[cKw]]:""),
        yearsWeight:String((cYw!=null?r[H[cYw]]:"Medium")||"Medium").trim().toLowerCase(),
        levels:lc.map(idx=>idx>=0?String(r[idx]||"").trim():"") });
    });
  }

  /* ---- Questions sheet (optional) → indexed by topic ---- */
  const qRows=grid(findSheet(wb,"question"));
  const questions={};   // topic(lowercased) -> [q1,q2,q3]
  if(qRows.length>1){
    const H=headerIndex(qRows[0]);
    const cTopic=("topic" in H)?H["topic"]:1;
    const qCols=Object.keys(H).filter(k=>k.startsWith("question")).map(k=>H[k]).sort((a,b)=>a-b);
    qRows.slice(1).forEach(r=>{
      const topic=String(r[cTopic]||"").trim(); if(!topic)return;
      questions[topic.toLowerCase()]=qCols.map(ci=>String(r[ci]||"").trim()).filter(Boolean);
    });
  }

  // sanity checks
  need(levels.length>=2,"Define at least two levels in '3. Levels'.");
  need(skills.length>=1,"Define at least one skill in '4. Technical Skills'.");
  if(Math.abs(meta.skillWeight+meta.yearsWeight-1)>0.001)
    meta.skillWeight=meta.skillWeight/(meta.skillWeight+meta.yearsWeight||1), // normalise silently
    meta.yearsWeight=1-meta.skillWeight;

  if(errors.length) { const e=new Error("config"); e.list=errors; throw e; }

  const groups=[...new Set(skills.map(s=>s.g))];
  return {meta,levels,groups,skills,behavioral,competencies,questions};
}

// pretty one-liner band text for a level, e.g. "3–8 yrs"
function bandTxt(L){return L.yMax>=99?`${L.yMin}+ yrs`:(L.yMin===0?`≤${L.yMax} yr`:`${L.yMin}–${L.yMax} yrs`);}
// the job title for a level on the selected track
function trackTitle(a,li){return a.track==="B"&&CONFIG.levels[li].titleB?CONFIG.levels[li].titleB:CONFIG.levels[li].titleA;}
