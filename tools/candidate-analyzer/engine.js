/* ============================================================
   DATE / EXPERIENCE ENGINE  v2
   Structured atom scanner + explicit pairing.
   Replaces the old "many overlapping regexes each pushing a range"
   approach, which both missed formats and invented phantom ranges.
   ============================================================ */
const MONTHS={jan:0,feb:1,mar:2,apr:3,apl:3,may:4,jun:5,jul:6,aug:7,sep:8,sept:8,oct:9,nov:10,dec:11,
  january:0,february:1,march:2,april:3,june:5,july:6,august:7,september:8,october:9,november:10,december:11};
const NOW=new Date();
const NOW_YM=NOW.getFullYear()*12+NOW.getMonth();
const MIN_YEAR=1955, MAX_YEAR=NOW.getFullYear()+1;

function ym(month,year){return year*12+(month||0);}
function fmtYM(v){const y=Math.floor(v/12),m=((v%12)+12)%12;const mn=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];return mn[m]+" "+y;}
const _monNum=s=>{if(!s)return 0;const k=String(s).toLowerCase().replace(/[^a-z]/g,"");return (MONTHS[k] ?? MONTHS[k.slice(0,4)] ?? MONTHS[k.slice(0,3)] ?? 0);};

// two-digit year -> four digits. 00..(currentYY+1) => 2000s, else 1900s.
const _yyCut=(NOW.getFullYear()%100)+1;
function expandYY(n){return n<=_yyCut?2000+n:1900+n;}

// Normalise a line: unify dashes/quotes, repair digits split by PDF extraction.
function normLine(raw){
  return String(raw)
    .replace(/[‐-―−⁃]/g,"-")     // ‐ ‑ ‒ – — ― − ⁃  ->  -
    .replace(/[‘’ʼ`´]/g,"'")// ‘ ’ ʼ ` ´      ->  '
    .replace(/[   \t]/g," ")
    .replace(/(\d)\s+(?=\d)/g,"$1")                  // "202 6" -> "2026"
    .replace(/\s{2,}/g," ")
    .trim();
}
function normNums(l){return normLine(l);}            // kept for callers of the old name

const MONW="(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|apl|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sept(?:ember)?|sep|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const PRESW="(?:present|currently|current|till\\s*now|till\\s*date|till\\s*present|to\\s*date|to\\s*present|uptill\\s*now|up\\s*to\\s*now|as\\s*on\\s*date|ongoing|onwards?|continuing|continued|continue|contd\\.?|now)";
// a gap between two atoms that means "…to…"
const SEPW=/^\s*(?:-{1,2}|to|till|until|untill|through|thru|upto|up\s*to|\/|:|~)\s*$/i;
// things that make a numeric pair a quantity, not a date
const QTY_AFTER=/^\s*(?:engineers?|people|persons?|members?|staff|employees?|nos?\b|units?|vessels?|exchangers?|drawings?|documents?|projects?|jobs?|kg|mm|cm|ltr|litres?|psi|bar|mpa|mw|kv|kva|hrs?|hours?|days?|weeks?|%|percent|marks?|cgpa|gpa|students?|teams?)\b/i;
// standard / code context immediately before a pair
const CODE_BEFORE=/(?:asme|api|iso|astm|ansi|tema|aws|nace|uns|sa-?|is\s*:?\s*\d|en\s*\d|edition|addenda|clause|section|sect\.?|sec\.?|div(?:ision)?\.?|rev\.?|page|table|fig(?:ure)?\.?|para|appendix|\$|rs\.?|inr|usd|team\s+of|group\s+of|batch\s+of)\s*$/i;
const SINCE_BEFORE=/(?:\bsince|\bfrom|w\.?\s?e\.?\s?f\.?|\bjoined(?:\s+in|\s+on)?|\beffective|\bstarting)\s*(?:the\s+)?[:\-]?\s*$/i;

// ---- atom scanner -------------------------------------------------
// Emits ordered, non-overlapping date atoms with their character offsets.
function scanAtoms(t){
  const rx=new RegExp(
      "(\\d{1,2})[./-](\\d{1,2})[./-]((?:19|20)\\d{2})"      // 1,2,3   DD.MM.YYYY
    +"|(\\d{1,2})[./-]((?:19|20)\\d{2})"                      // 4,5     MM/YYYY
    +"|("+MONW+")\\.?\\s*[-/,']?\\s*((?:19|20)\\d{2})"        // 6,7     Mon YYYY
    +"|("+MONW+")\\.?\\s*[-/,']\\s*(\\d{2})(?!\\d)"           // 8,9     Mon-YY / Mon'YY
    +"|'(\\d{2})(?!\\d)"                                      // 10      'YY
    +"|((?:19|20)\\d{2})"                                     // 11      YYYY
    +"|("+PRESW+")"                                           // 12      present-ish
    ,"gi");
  const atoms=[];let m;
  while((m=rx.exec(t))){
    let a=null;
    if(m[3]){                                   // DD.MM.YYYY  (or MM.DD.YYYY — month is the 1..12 one)
      let d=+m[1],mo=+m[2],y=+m[3];
      if(mo>12&&d<=12){const x=mo;mo=d;d=x;}
      if(mo>=1&&mo<=12) a={m:mo-1,y};
    }else if(m[5]){                             // MM/YYYY
      const mo=+m[4],y=+m[5];
      if(mo>=1&&mo<=12) a={m:mo-1,y};
    }else if(m[7]){                             // Mon YYYY
      a={m:_monNum(m[6]),y:+m[7]};
    }else if(m[9]){                             // Mon'YY
      a={m:_monNum(m[8]),y:expandYY(+m[9])};
    }else if(m[10]){                            // 'YY
      a={m:null,y:expandYY(+m[10])};
    }else if(m[11]){                            // YYYY
      a={m:null,y:+m[11]};
    }else if(m[12]){                            // present
      a={present:true};
    }
    if(!a)continue;
    if(!a.present&&(a.y<MIN_YEAR||a.y>MAX_YEAR))continue;
    a.start=m.index;a.end=m.index+m[0].length;a.txt=m[0];
    atoms.push(a);
  }
  return atoms;
}

const _startOf=a=>ym(a.m==null?0:a.m,a.y);                 // unknown start month -> Jan
const _endOf  =a=>a.present?NOW_YM:ym(a.m==null?11:a.m,a.y); // unknown end month  -> Dec

function _mkRange(A,B,raw,openEnded){
  let s=_startOf(A), e=_endOf(B);
  if(!B.present&&e<s){const x=s;s=e;e=x;}
  if(e>NOW_YM)e=NOW_YM;                                     // never count the future
  if(e<s)return null;
  const months=e-s;
  if(months>55*12)return null;                              // implausible single role
  // year-only endpoints are rounded out to Jan/Dec, so consecutive roles share
  // their handover year — callers must not read that as a genuine overlap
  const approx=(A.m==null)||(!B.present&&B.m==null);
  return {s,e,raw:raw.trim().slice(0,60),open:!!openEnded,approx};
}

// parse every date range on a single line
function parseDatesLine(line){
  const t=normLine(line);
  if(!t)return [];
  const atoms=scanAtoms(t);
  if(!atoms.length)return [];
  const out=[];
  const used=new Set();
  for(let i=0;i<atoms.length;i++){
    if(used.has(i))continue;
    const A=atoms[i];
    if(A.present)continue;                                  // "present" can only end a range
    const before=t.slice(Math.max(0,A.start-16),A.start);
    if(CODE_BEFORE.test(before))continue;                   // "ASME Sec VIII Div 1", "Rs. 2015" …
    // (a) pair with the next atom when the gap is a range separator
    const B=atoms[i+1];
    if(B&&!used.has(i+1)){
      const gap=t.slice(A.end,B.start);
      if(gap.length<=10&&SEPW.test(gap)&&!QTY_AFTER.test(t.slice(B.end))){
        const r=_mkRange(A,B,t.slice(A.start,B.end),B.present);
        if(r){out.push(r);used.add(i+1);continue;}
      }
    }
    // (b) short right-hand year: "1995-98", "2010 - 15", "1995/98"
    const sy=/^\s*(?:-|to|till|until|through|thru|upto|up\s*to|\/)\s*'?(\d{2})(?!\d)/i.exec(t.slice(A.end));
    if(sy&&!QTY_AFTER.test(t.slice(A.end+sy[0].length))){
      const y2=expandYY(+sy[1]);
      if(y2>A.y&&y2<=MAX_YEAR){
        const r=_mkRange(A,{m:null,y:y2},t.slice(A.start,A.end+sy[0].length));
        if(r){out.push(r);continue;}
      }
    }
    // (c) open-ended — "since Oct 2022", "2019 onwards", "w.e.f. Jan 2020"
    const onward=new RegExp("^\\s*(?:,|-|–)?\\s*(?:"+PRESW+")","i").test(t.slice(A.end));
    if(SINCE_BEFORE.test(before)||onward){
      const r=_mkRange(A,{present:true},t.slice(Math.max(0,A.start-8),A.end+10),true);
      if(r)out.push(r);
    }
  }
  const seen=new Set();
  return out.filter(r=>{const k=r.s+"_"+r.e;if(seen.has(k))return false;seen.add(k);return true;});
}

// "(3 years 6 months)" / "5 Yrs" — metadata about a range, never a range itself
function statedDurationMonths(line){
  const t=normLine(line);
  let best=0,m;
  const rx=/(\d{1,2}(?:\.\d{1,2})?)\s*(?:\+)?\s*(?:years?|yrs?)(?:\s*(?:&|and|,)?\s*(\d{1,2})\s*(?:months?|mos?)\b)?/gi;
  while((m=rx.exec(t))){
    const mo=Math.round(parseFloat(m[1])*12)+(m[2]?+m[2]:0);
    if(mo>0&&mo<=55*12)best=Math.max(best,mo);
  }
  return best;
}

/* ---------------- section / kind classification ---------------- */
const COL_WORDS=new Set(["project","projects","employer","employers","duration","period","role","roles","company","companies","designation","designations","organization","organisation","organisations","from","to","year","years","client","clients","location","position","positions","title","tenure","responsibilities","date","dates","name","status","sl","sr","no","department","level","grade","total","exp","experience in years"]);
const HEAD=[
  {t:"EXP", re:/^(work\s+experience|professional\s+experience|experience|employment(\s+history)?|work\s+history|career(\s+history|\s+summary)?|professional\s+background|organizational\s+experience|organisational\s+experience|employment\s+details|work\s+profile|professional\s+experience\s+(summary|details))\b.{0,20}:?\s*$/i},
  {t:"EDU", re:/^(?:(?:professional|educational|academic)\s+)?(education(al)?|qualifications?|academics?|scholastics?|academic\s+details|educational\s+background)\b.{0,22}:?\s*$/i},
  {t:"INT", re:/^(internships?(\s+and\s+other\s+projects?)?|trainings?|apprenticeships?|other\s+projects?|academic\s+projects?|industrial\s+training)\b.{0,30}:?\s*$/i},
  {t:"OTHER",re:/^(summary|profile\s+summary|professional\s+summary|career\s+objective|objective|profile|skills?\s+summary|skill\s+summary|technical\s+skills?|skills?|software\s+\w+|core\s+competenc\w*|strengths?|certifications?|courses?|achievements?|accomplishments?|awards?|honou?rs?|extra[\s-]?curricular\w*|activities|hobbies|interests|languages?|personal\s+(details|information|profile|data)|contact|declaration|references?|publications?|patents?)\b.{0,22}:?\s*$/i},
];
function headingType(line){
  const l=String(line).trim().replace(/^[•\-*.\s|]+/,"").replace(/[|].*$/,"").trim();
  if(!l||l.length>44||l.split(/\s+/).length>5)return null;
  const key=l.toLowerCase().replace(/[^a-z ]/g,"").trim();
  if(COL_WORDS.has(key))return null;                     // a lone table-column header, not a section
  for(const h of HEAD){if(h.re.test(l))return h.t;}
  return null;
}
/* Education signals. EVERY alternative is anchored with \b on the left —
   an unanchored `m\.?\s?e\b` matches the "me" inside ASME, which silently
   reclassified most static-equipment roles as education. Patterns that are
   common engineering words on their own ("degree", "master", "graduate")
   must carry qualifying context. */
const EDU_CTX=new RegExp("("+[
  "universit","\\bpolytechnic","\\bcollege\\b","institute\\s+of\\s+tech",
  "\\bb\\.?\\s?tech\\b","\\bm\\.?\\s?tech\\b","\\bb\\.?\\s?e\\.?\\b","\\bm\\.?\\s?e\\.?\\b",
  "\\bb\\.?\\s?sc\\b","\\bm\\.?\\s?sc\\b","\\bb\\.?\\s?arch\\b","\\bmba\\b","\\bamie\\b",
  "\\bd\\.?\\s?m\\.?\\s?e\\b","\\bdiploma\\b","\\bbachelor","\\bmaster(?:'?s)?\\s+(?:of|in|degree)",
  "\\b(?:bachelor|master|engineering)s?\\s+degree\\b","\\bschool\\b","\\bc\\.?b\\.?s\\.?e\\b",
  "\\bh\\.?s\\.?c\\b","\\bs\\.?s\\.?c\\b","\\bboard\\s+of\\s+(?:secondary|higher)","\\bsemester\\b",
  "\\bc\\.?g\\.?p\\.?a\\b","\\bg\\.?p\\.?a\\b","\\bpercentage\\b","\\baggregate\\b",
  "\\bgraduation\\b","\\bpost[\\s-]?graduat","\\bmatriculation\\b","\\b10th\\b","\\b12th\\b",
  "\\bsecondary\\b","\\bpassed\\s+out\\b","\\bpassing\\s+year\\b"
].join("|")+")","i");
const NONWORK_CTX=/(\bintern\b|\binternship\b|\bapprentice|\btrainee\b|technical\s+training|industrial\s+training|\bthesis\b|dissertation|academic\s+project|coursework|\bworkshop\b|training\s+(program|camp)|bootcamp)/i;
// strong employer signals — these force WORK even inside a loosely-labelled section
const WORK_CTX=/(pvt\.?\s*ltd|private\s+limited|\bltd\b|\blimited\b|\bllp\b|\binc\b|\bcorp\b|corporation|\bcompany\b|industries|\bengineer\b|engineers\b|engineering|consultan|technolog|solutions|services|refiner|petrochem|fabricat|\bworked\b|working\s+(?:as|with|at)|employed|employer|designation|reporting\s+to|resigned|\bclient\b|\bepc\b|\bfeed\b)/i;
/* STRONG work signals only — a company suffix or an explicit employment word.
   Generic engineering vocabulary ("engineering", "design") is deliberately
   excluded: "B.E. Mechanical Engineering, Pune University" must stay education. */
const WORK_STRONG=/(pvt\.?\s*ltd|private\s+limited|\bltd\b|\blimited\b|\bllp\b|\binc\b|\bcorp(?:oration)?\b|industries|refiner|petrochem|\bworked\b|working\s+(?:as|with|at)|\bemployed\b|\bemployer\b|\bdesignation\b|reporting\s+to|\bresigned\b|\bepc\b)/i;

/* Classification is LINE-FIRST: the line carrying the dates decides.
   Neighbouring lines are only consulted when the line itself is silent AND
   the section heading is ambiguous — otherwise a nearby "ASME"/"B.E." bleeds
   across rows of a table and corrupts unrelated entries. */
function classifyKind(section,lineCtx,nearCtx){
  const near=nearCtx==null?lineCtx:nearCtx;
  const eduL=EDU_CTX.test(lineCtx), nonL=NONWORK_CTX.test(lineCtx);
  const workL=WORK_CTX.test(lineCtx), strongL=WORK_STRONG.test(lineCtx);
  if(eduL&&!strongL)return "education";
  if(nonL&&!strongL)return "other";
  if(section==="EDU")return strongL?"work":"education";
  if(section==="INT")return "other";
  if(section==="EXP")return "work";
  // ambiguous section (HEADER / OTHER / unlabelled) — allow neighbours to speak
  if(workL||WORK_CTX.test(near))return "work";
  if(EDU_CTX.test(near))return "education";
  if(NONWORK_CTX.test(near))return "other";
  return section==="OTHER"?"other":"work";
}

// section-aware extraction over the whole document
function extractDates(text){
  const lines=String(text).split("\n");
  const norm=lines.map(normLine);
  let section="HEADER",sawExp=false;
  const all=[];
  let undatedEmployers=0;
  const pushFrom=(idx,rs)=>{
    const near=[norm[idx-1]||"",norm[idx],norm[idx+1]||""].join(" ");
    rs.forEach(r=>all.push({...r,kind:classifyKind(section,norm[idx],near),section,line:idx,src:norm[idx].slice(0,90)}));
  };
  // a line naming a real employer: company suffix or an explicit employer label
  const EMPLOYER_LINE=/(pvt\.?\s*ltd|private\s+limited|\bltd\b\.?|\blimited\b|\bllp\b|\binc\b|\bcorp(?:oration)?\b|industries|refiner|\bengineering\b|technologies|\bemployer\b\s*[:\-]|\bcompany\b\s*[:\-]|\borganization\b\s*[:\-]|\borganisation\b\s*[:\-])/i;
  for(let i=0;i<lines.length;i++){
    const h=headingType(lines[i]);
    if(h){section=h;if(h==="EXP")sawExp=true;continue;}
    const rs=parseDatesLine(lines[i]);
    if(!rs.length&&(section==="EXP"||section==="HEADER")&&EMPLOYER_LINE.test(norm[i])
       &&!EDU_CTX.test(norm[i])&&!parseDatesLine(norm[i+1]||"").length&&!parseDatesLine(norm[i-1]||"").length){
      undatedEmployers++;                                 // an employer whose dates we could not read
    }
    if(rs.length){pushFrom(i,rs);continue;}
    // orphan pairing: a table column split "Jun 2005" / "Aug 2010" onto two short lines
    const a1=scanAtoms(norm[i]);
    if(a1.length===1&&!a1[0].present&&norm[i].replace(a1[0].txt,"").replace(/[^A-Za-z0-9]/g,"").length===0){
      const nx=norm[i+1]||"";const a2=scanAtoms(nx);
      if(a2.length===1&&nx.replace(a2[0].txt,"").replace(/[^A-Za-z0-9]/g,"").length===0){
        const r=_mkRange(a1[0],a2[0],a1[0].txt+" – "+a2[0].txt,a2[0].present);
        if(r){pushFrom(i,[r]);i++;}
      }
    }
  }
  return {all,sawExp,undatedEmployers};
}

function mergeIntervals(rs){
  if(!rs.length)return [];
  const a=rs.map(r=>({...r})).sort((x,y)=>x.s-y.s);
  const out=[{...a[0]}];
  for(let i=1;i<a.length;i++){
    const last=out[out.length-1];
    if(a[i].s<=last.e+1){last.e=Math.max(last.e,a[i].e);}
    else out.push({...a[i]});
  }
  return out;
}

/* ---------------- claimed total experience ---------------- */
// "22+ years of experience", "Total Experience : 22 Years", "Experience 22.5 yrs",
// "22 years 6 months of experience"
function claimedExperience(text){
  const t=String(text).replace(/[ ]/g," ");
  const cands=[];
  const add=(v,strong,plus)=>{if(v>=0.5&&v<=55)cands.push({v:Math.round(v*10)/10,strong,plus:!!plus});};
  let m;
  const rxA=/(\d{1,2}(?:\.\d{1,2})?)\s*(\+|plus)?\s*(?:years?|yrs?)\s*(?:(?:&|and|,)?\s*(\d{1,2})\s*(?:months?|mos?)\s*)?(?:of\s+)?(?:rich\s+|total\s+|overall\s+|relevant\s+|professional\s+|hands[\s-]?on\s+|work(?:ing)?\s+)*(?:experience|exp\b)/gi;
  while((m=rxA.exec(t))){
    const pre=t.slice(Math.max(0,m.index-24),m.index);
    add(parseFloat(m[1])+(m[3]?+m[3]/12:0),/total|overall/i.test(pre),m[2]||/\bover\b|more\s+than/i.test(pre));
  }
  const rxB=/(?:total|overall|cumulative)?\s*(?:work(?:ing)?\s+)?(?:experience|exp)\s*(?:\(in\s*years?\))?\s*[:\-–]\s*(?:approx\.?\s*|about\s*|around\s*|(over)\s*|(more\s+than)\s*)?(\d{1,2}(?:\.\d{1,2})?)\s*(\+|plus)?\s*(?:years?|yrs?)?(?:\s*(?:&|and|,)?\s*(\d{1,2})\s*(?:months?|mos?))?/gi;
  while((m=rxB.exec(t)))add(parseFloat(m[3])+(m[5]?+m[5]/12:0),true,m[1]||m[2]||m[4]);
  if(!cands.length)return 0;
  const strong=cands.filter(c=>c.strong);
  const pool=strong.length?strong:cands;
  const top=pool.reduce((a,c)=>c.v>a.v?c:a,pool[0]);
  claimedExperience.lastWasMinimum=!!top.plus;   // "22+ yrs" / "over 22 yrs" = a floor, not an exact figure
  return top.v;
}

/* ---------------- experience reconciliation ----------------
   Three independent estimates, then a documented choice.
     union  – months actually covered by dated work ranges
     span   – first work start → last work end (career span)
     claim  – what the CV says in words
   Dates can be missed (odd formats, scans); claims can be stale or
   inflated. Agreement is the norm; disagreement is surfaced, never hidden. */
function reconcileExperience(merged,claim,override,undatedEmployers,claimIsMinimum){
  const union=merged.reduce((a,r)=>a+(r.e-r.s),0)/12;
  const span=merged.length?(merged[merged.length-1].e-merged[0].s)/12:0;
  const undated=undatedEmployers||0;
  const R={union,span,claim:claim||0,undatedEmployers:undated};
  if(override!=null&&override!==""&&!isNaN(+override)&&+override>=0){
    R.years=+override;R.basis="manual override entered by the reviewer";R.confidence="manual";return R;
  }
  if(!merged.length){
    R.years=claim||0;R.basis=claim?"CV's stated total — no dated roles could be read":"no dated roles and no stated total";
    R.confidence=claim?"low":"none";return R;
  }
  R.years=union;R.basis="union of the dated roles";R.confidence="high";
  const gapToClaim=claim-union;
  if(claim&&gapToClaim>=2){
    if(claim<=span+1.5){
      // the claim fits inside the career span → we simply missed some role dates
      R.years=claim;R.confidence="medium";
      R.basis="CV's stated total — it fits inside the "+span.toFixed(1)+" yr career span, so some role dates were not machine-readable";
    }else if(undated>0){
      // there are employers on the CV whose dates we could not read at all
      R.years=claim;R.confidence="medium";
      R.basis="CV's stated total — "+undated+" employer"+(undated>1?"s":"")+" on the CV carr"+(undated>1?"y":"ies")+" no readable dates, so the dated span understates the career";
    }else{
      R.confidence="medium";
      R.basis="union of the dated roles — the CV claims "+claim+" yrs, which exceeds the "+span.toFixed(1)+" yr span between the first and last dated role";
    }
  }else if(claim&&union>claim+3&&!claimIsMinimum){
    R.confidence="medium";
    R.basis="union of the dated roles — this exceeds the CV's stated "+claim+" yrs, so check for overlapping or duplicated entries";
  }else if(claim&&claimIsMinimum&&union>=claim-0.5){
    R.basis="union of the dated roles — consistent with the CV's stated "+claim+"+ yrs";
  }
  R.years=Math.round(R.years*10)/10;
  return R;
}

if(typeof module!=="undefined"&&module.exports){
  module.exports={parseDatesLine,extractDates,mergeIntervals,claimedExperience,reconcileExperience,
    statedDurationMonths,scanAtoms,normLine,fmtYM,ym,NOW_YM,headingType,classifyKind};
}
