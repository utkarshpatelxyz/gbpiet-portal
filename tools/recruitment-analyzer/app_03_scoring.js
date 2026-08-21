/* ===========================================================================
   [ENGINE + CONFIG] SCORING ENGINE
   The mechanics here are FIXED (identical for every customer). What they score
   AGAINST comes entirely from CONFIG. None of these functions contains any
   company-specific skill, level, or keyword — those arrive from the workbook.

   The earlier single-department build hard-coded skill indices (e.g. "skills
   11 and 12 are the codes"). That cannot work for an arbitrary framework, so
   the behavioral and competency estimators below are driven by per-row
   keywords, an optional linked skill-group, and a years-weight — all supplied
   in the workbook.
   =========================================================================== */

const YW={none:0, low:0.33, medium:0.66, high:1};   // Years-Weight → fraction (behavioral)
const YWC={none:0, low:0.4, medium:0.7, high:1};    // Years-Weight → fraction (competencies)

// which config level a candidate's raw years lands in (highest band whose min ≤ years)
function yearsLevelIndex(years){
  let idx=0; CONFIG.levels.forEach(L=>{ if(years>=L.yMin) idx=L.i; }); return idx;
}

/* ---- Section A: technical skills. Keyword evidence → a score on the config's
   technical scale [techMin..techMax]. Generalised from the original 0–4 model. */
function scoreSkills(text){
  const t=" "+text.toLowerCase().replace(/\s+/g," ")+" ";
  const M=CONFIG.meta.techMax, mn=CONFIG.meta.techMin;
  const strongHits=CONFIG.meta.strong.reduce((a,k)=>a+(k&&t.includes(k)?1:0),0);
  const seniorBoost=strongHits>=3;
  return CONFIG.skills.map(sk=>{
    let hits=0; const found=[];
    sk.kw.forEach(kk=>{
      if(!kk)return;
      if(t.includes(kk)){
        let c=0,p=0; while((p=t.indexOf(kk,p))>=0){c++;p+=kk.length;if(c>5)break;}
        hits+=c; found.push(kk);
      }
    });
    // tiered mapping across the configured scale (reproduces 0/2/3/4 when M=4)
    let sc;
    if(hits===0)      sc=mn;
    else if(hits===1) sc=Math.round(mn+(M-mn)*0.5);
    else if(hits<=3)  sc=Math.round(mn+(M-mn)*0.75);
    else              sc=M;
    if(sc===mn && found.length) sc=Math.min(M,mn+1);        // some evidence → not zero
    if(seniorBoost && sc>mn && sc<M) sc=Math.min(M,sc+1);   // seniority signals nudge up
    if(!seniorBoost && sc===M && hits<5) sc=Math.max(mn,M-1);// lone top score without depth
    return {score:sc, hits, evidence:[...new Set(found)].slice(0,6)};
  });
}

/* ---- best-fit level. Skill-fit ratio + years-fit, weighted per Setup.
   Tenure sets the band; skills position the candidate inside it (±). */
function bestFit(sA,years){
  const M=CONFIG.meta.techMax, mn=CONFIG.meta.techMin, N=CONFIG.skills.length;
  const perLevel=CONFIG.levels.map(L=>{
    let meet=0,deficit=0,surplus=0;
    CONFIG.skills.forEach((sk,i)=>{
      const ref=sk.ref[L.i],cand=sA[i].score;
      if(cand>=ref)meet++; else deficit+=(ref-cand);
      if(cand>ref)surplus+=(cand-ref);
    });
    const ratio=N?meet/N:0;
    let yFit;
    if(years>=L.yMin && years<=L.yMax)yFit=1;
    else if(years<L.yMin)yFit=Math.max(0,1-(L.yMin-years)/4);
    else yFit=Math.max(0,1-(years-L.yMax)/6);
    const combined=CONFIG.meta.skillWeight*ratio+CONFIG.meta.yearsWeight*yFit;
    return {L,ratio,deficit,surplus,yFit,combined};
  });
  const th=CONFIG.meta.meets;
  let skillLevel=0,br=-1;
  perLevel.forEach(p=>{if(p.ratio>=th)skillLevel=Math.max(skillLevel,p.L.i);if(p.ratio>br)br=p.ratio;});
  if(br<th){let mx=-1;perLevel.forEach(p=>{if(p.ratio>mx){mx=p.ratio;skillLevel=p.L.i;}});}
  const yLvl=yearsLevelIndex(years);
  let best=perLevel[0];perLevel.forEach(p=>{if(p.combined>best.combined)best=p;});
  let bi=best.L.i, clamped=null;
  if(years>=1){
    const lo=Math.max(0,yLvl-2), hi=Math.min(CONFIG.levels.length-1,yLvl+1);
    const bounded=clamp(bi,lo,hi);
    if(bounded!==bi){clamped={from:bi,to:bounded};bi=bounded;}
  }
  return {perLevel,skillLevel,yearsLevel:yLvl,best:bi,bestObj:perLevel[bi],clamped};
}

/* ---- Section B: behavioral dimensions. Generic model per dimension:
   score = behMin + range·(0.5·groupTechAvg + 0.2·keywordHit + 0.3·yearsWeight·yearsFrac) */
function estimateBehavioral(sA,years,text){
  const t=text.toLowerCase();
  const {behMin,behMax,techMax}=CONFIG.meta;
  const range=behMax-behMin, L=CONFIG.levels.length;
  const yFrac=L>1?yearsLevelIndex(years)/(L-1):0;
  const groupAvg01=(grp)=>{
    const idxs=CONFIG.skills.map((s,i)=>({s,i})).filter(o=>grp==="all"||o.s.g.toLowerCase()===grp);
    const use=idxs.length?idxs:CONFIG.skills.map((s,i)=>({s,i}));
    const avg=use.reduce((a,o)=>a+sA[o.i].score,0)/use.length;
    return techMax? clamp(avg/techMax,0,1):0;
  };
  return CONFIG.behavioral.map(d=>{
    const tech01=groupAvg01((d.linkGroup||"all").toLowerCase());
    const kw=d.kw.some(k=>k&&t.includes(k))?1:0;
    const yw=YW[d.yearsWeight]!=null?YW[d.yearsWeight]:YW.medium;
    const raw=behMin+range*(0.5*tech01+0.2*kw+0.3*yw*yFrac);
    return {dim:d.dim, score:clamp(Math.round(raw),behMin,behMax)};
  });
}

/* ---- Section C: qualitative competencies. Years (weighted) + a keyword nudge
   pick a level index; the descriptor for that index is shown. */
function estimateCompetencies(years,text){
  const t=text.toLowerCase();
  const L=CONFIG.levels.length, yIdx=yearsLevelIndex(years);
  return CONFIG.competencies.map(c=>{
    const yw=YWC[c.yearsWeight]!=null?YWC[c.yearsWeight]:YWC.medium;
    const kwAdj=c.kw.some(k=>k&&t.includes(k))?1:0;
    const idx=clamp(Math.round(yw*yIdx)+kwAdj,0,L-1);
    return {name:c.name, level:idx, desc:c.levels[idx]||"—"};
  });
}
