/* ===========================================================================
   [ENGINE] SCREENING FLAGS + ANALYSIS ORCHESTRATION
   detectFlags() is fixed logic: timeline consistency, over/under-qualification,
   OCR notices, thin-CV warnings. It reads CONFIG only to name levels in its
   messages. analyze()/recompute() tie the fixed date engine (engine.js) to the
   config-driven scorers above.
   =========================================================================== */
function detectFlags(a){
  const F=[]; const push=(sev,ft,fb)=>F.push({sev,ft,fb});
  const L=CONFIG.levels, merged=a.merged, years=a.years;

  // employment gaps
  if(merged.length>1){
    for(let i=1;i<merged.length;i++){
      const gap=merged[i].s-merged[i-1].e;
      if(gap>=6) push(gap>=18?"high":"med","Employment gap detected",
        `~${(gap/12).toFixed(1)} year gap between ${fmtYM(merged[i-1].e)} and ${fmtYM(merged[i].s)}. Confirm what the candidate did during this period.`);
    }
  }
  // overlapping engagements (ignoring year-only rounding artefacts)
  const raw=a.ranges.slice().sort((x,y)=>x.s-y.s);
  for(let i=1;i<raw.length;i++){
    const ov=Math.min(raw[i-1].e,raw[i].e)-raw[i].s;
    const floor=(raw[i-1].approx||raw[i].approx)?13:6;
    if(ov>=floor && !(raw[i].s<=raw[i-1].s && raw[i].e>=raw[i-1].e)){
      push("low","Overlapping engagements",
        `Two roles overlap by ~${(ov/12).toFixed(1)} yr ("${raw[i-1].raw}" & "${raw[i].raw}"). May be concurrent / part-time — verify.`);
      break;
    }
  }
  // experience reconciliation notices
  const R=a.rec||{};
  const claimSatisfied=a.claimIsMinimum && R.union>=a.claimedYears-0.5;
  if(a.claimedYears && !claimSatisfied && Math.abs(a.claimedYears-R.union)>=2.5)
    push(R.confidence==="high"?"med":"low","Experience claim vs. dated timeline",
      `The CV states ~${a.claimedYears} yrs; the dated roles cover ~${(R.union||0).toFixed(1)} yrs across a ${(R.span||0).toFixed(1)} yr span. `+
      `Reported: ${years.toFixed(1)} yrs — ${R.basis}. Confirm the actual total with the candidate.`);
  if(R.confidence==="low"||R.confidence==="none")
    push("high","Experience total is not reliable",`${R.basis}. Use the Experience audit to set the correct total before relying on this report.`);
  if(R.confidence==="manual")
    push("ok","Experience total set manually",`Using ${years.toFixed(1)} yrs as entered by the reviewer.`);
  if(a.undatedEmployers>0)
    push("low","Employers without readable dates",
      `${a.undatedEmployers} employer${a.undatedEmployers>1?"s appear":" appears"} on the CV with no date range the parser could read — see the Experience audit.`);

  // frequent role changes
  const shortRoles=a.ranges.filter(r=>(r.e-r.s)<18).length;
  if(shortRoles>=3) push("low","Frequent role changes",`${shortRoles} engagements shorter than 18 months. Explore reasons for the moves.`);

  // over / under-qualification vs the applied level
  const diff=a.best-a.applied.i;
  if(diff>=2) push("high","Signs of over-qualification",
    `Best-fit level is ${L[a.best].code} (${L[a.best].short}) — ${diff} levels above the ${a.applied.code} role applied for. Assess retention risk, salary expectations and motivation.`);
  else if(diff===1) push("low","Slightly above the target level",
    `Profile leans toward ${L[a.best].code}. The candidate may expect more scope than the ${a.applied.code} role offers.`);
  if(diff<=-2) push("high","Below the target level",
    `Best-fit is ${L[a.best].code}, ${Math.abs(diff)} levels under the ${a.applied.code} role. Evidence for the applied level is thin — probe the weak skill areas.`);
  else if(diff===-1) push("med","Marginally below target",
    `Profile maps to ${L[a.best].code}, one level below the ${a.applied.code} target. Confirm depth in the gap areas below.`);

  if(years<a.applied.yMin-0.5) push("med","Experience below the role's band",
    `~${years.toFixed(1)} yrs vs the ${a.applied.code} band of ${bandTxt(a.applied)}.`);
  if(Math.abs(a.fit.skillLevel-a.fit.yearsLevel)>=2){
    const dir=a.fit.skillLevel>a.fit.yearsLevel?"technical evidence outpaces the years of experience":"years of experience outpace the demonstrated technical depth";
    push("low","Profile imbalance",`The ${dir}. Skill evidence ≈ ${L[a.fit.skillLevel].code}, experience ≈ ${L[a.fit.yearsLevel].code}.`);
  }
  if(a.ocr) push("med","Read via OCR — verify the text",
    "This resume had no digital text layer (scanned/image), so it was read with on-device OCR. OCR can misread characters, dates and names — confirm the extracted text below and every score before relying on them.");
  if(a.eduRanges.length) push("low","Education excluded from experience",
    `${a.eduRanges.length} education/academic date range${a.eduRanges.length>1?"s were":" was"} detected and kept out of the experience total. Professional experience is counted from work history only.`);
  if(a.internMonths>=1) push("low","Internships / academic work counted separately",
    `~${(a.internMonths/12).toFixed(1)} yr of internship / academic-project time was found and excluded from core professional experience.`);
  if(a.expInferred) push("med","Experience section not clearly labelled",
    "No explicit 'Experience' heading was found, so the years are inferred from non-education dates and may be less precise. Verify the work history manually.");
  if(a.ranges.length===0) push("med","No datable work history found",
    "Could not extract dated employment periods — the PDF may be scanned/unusually formatted, or roles may lack dates. Timeline checks are limited; verify manually.");
  if(a.wordCount<180) push("low","Sparse resume content",`Only ~${a.wordCount} words extracted. Extraction may be incomplete.`);
  if(!F.length) push("ok","No red flags detected","Timeline is consistent and the profile aligns with the target level. Proceed with a standard structured interview.");
  return F;
}

// [ENGINE] one resume → a full analysis object. `track` = "A" or "B".
function analyze(file,track,levelIdx,nameOverride){
  const text=file.text;
  const det=extractDates(text);   // fixed date engine (engine.js)
  const a={file:file.name,text,ocr:!!file.ocr,wordCount:text.split(/\s+/).length,
    allRanges:det.all.map((r,i)=>({...r,id:i,excluded:false})),
    sawExp:det.sawExp,undatedEmployers:det.undatedEmployers,
    claimedYears:claimedExperience(text),
    claimIsMinimum:!!claimedExperience.lastWasMinimum,
    override:"",
    name:guessName(text,nameOverride||""),
    email:(text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)||[])[0]||"",
    phone:extractPhone(text),
    sA:scoreSkills(text),
    applied:CONFIG.levels[levelIdx], track};
  recompute(a);
  return a;
}

/* [ENGINE] recompute everything downstream of the experience number. Called on
   first analysis and again whenever the reviewer edits a range or overrides the
   total in the Experience audit, so the whole report stays consistent. */
function recompute(a){
  const kind=k=>a.allRanges.filter(r=>r.kind===k&&!r.excluded);
  a.ranges=kind("work"); a.eduRanges=kind("education"); a.otherRanges=kind("other");
  a.merged=mergeIntervals(a.ranges);
  a.internMonths=mergeIntervals(a.otherRanges).reduce((s,r)=>s+(r.e-r.s),0);
  a.expInferred=(!a.sawExp&&a.ranges.length>0);
  a.rec=reconcileExperience(a.merged,a.claimedYears,a.override,a.undatedEmployers,a.claimIsMinimum);
  a.years=a.rec.years;
  a.firstStart=a.merged.length?a.merged[0].s:null;
  a.lastEnd=a.merged.length?a.merged[a.merged.length-1].e:null;
  a.sB=estimateBehavioral(a.sA,a.years,a.text);
  a.sC=estimateCompetencies(a.years,a.text);
  a.fit=bestFit(a.sA,a.years);
  a.best=a.fit.best;
  a.flags=detectFlags(a);
  const d=a.best-a.applied.i;
  a.verdict=d>=2?{cls:"bad",t:"Over-qualified for the role"}:
            d===1?{cls:"warn",t:"Slightly above target"}:
            d===0?{cls:"good",t:"Well matched to the role"}:
            d===-1?{cls:"warn",t:"Slightly below target"}:
            {cls:"bad",t:"Below the target level"};
  a.focus=CONFIG.skills.map((sk,i)=>({i,name:sk.n,g:sk.g,gap:sk.ref[a.applied.i]-a.sA[i].score,ref:sk.ref[a.applied.i],cand:a.sA[i].score}))
    .filter(x=>x.gap>0).sort((x,y)=>y.gap-x.gap);
  return a;
}
