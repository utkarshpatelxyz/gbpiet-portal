const E=require("./engine.js");
const {parseDatesLine,extractDates,mergeIntervals,claimedExperience,reconcileExperience,fmtYM}=E;

let pass=0,fail=0;const fails=[];
const yrs=r=>Math.round(((r.e-r.s)/12)*10)/10;

function ok(cond,label,extra){ if(cond){pass++;} else {fail++;fails.push(label+(extra?"   -> "+extra:""));} }

// ---------- 1. formats that MUST produce exactly one range ----------
const POS=[
  ["Jan 1995 - Mar 1998",            3.2],
  ["January 1995 to December 1998",  3.9],
  ["Jun'05 to Aug'10",               5.2],
  ["Jun-05 to Aug-10",               5.2],
  ["Jun-2005 – Aug-2010",            5.2],
  ["06/2005 - 08/2010",              5.2],
  ["06.2005 to 08.2010",             5.2],
  ["01.06.2005 to 31.08.2010",       5.2],
  ["01/06/2005 - 31/08/2010",        5.2],
  ["1995 - 1998",                    3.9],
  ["1995-98",                        3.9],
  ["2010-15",                        5.9],
  ["1995/1998",                      3.9],
  ["1995/98",                        3.9],
  ["'95 - '98",                      3.9],
  ["1995 to 1998",                   3.9],
  ["1995 – 1998",                    3.9],   // en dash
  ["1995 — 1998",                    3.9],   // em dash
  ["1995 upto 1998",                 3.9],
  ["Sept 2019 till 2022",            3.3],
  ["APL 2015 - MAY 2018",            3.1],   // OCR typo APL = Apr
  ["202 5 - 202 6",                  1.9],   // PDF split digits
  ["From 1995 to 1998",              3.9],
  ["Duration: 2005 to 2010",         5.9],
];
POS.forEach(([line,exp])=>{
  const r=parseDatesLine(line);
  ok(r.length===1,"POS one-range: "+line,"got "+r.length+" "+JSON.stringify(r.map(x=>fmtYM(x.s)+"→"+fmtYM(x.e))));
  if(r.length) ok(Math.abs(yrs(r[0])-exp)<=0.35,"POS duration: "+line,"got "+yrs(r[0])+" expected ~"+exp);
});

// ---------- 2. open-ended -> runs to today ----------
const NOWY=new Date().getFullYear();
[["Since OCT 2022",""],["From 2019",""],["w.e.f. Jan 2020",""],["2019 onwards",""],
 ["Oct 2022 - Present",""],["Oct 2022 to till date",""],["Jun 2018 – Continuing",""],
 ["Aug 2021 - Currently",""]].forEach(([line])=>{
  const r=parseDatesLine(line);
  ok(r.length===1&&Math.floor(r[0].e/12)===NOWY,"OPEN: "+line,JSON.stringify(r.map(x=>fmtYM(x.s)+"→"+fmtYM(x.e))));
});

// ---------- 3. traps that must produce NO range ----------
const NEG=[
  "Managed a team of 10-15 engineers",
  "Designed 20-30 pressure vessels",
  "ASME Section VIII Div 1 & 2",
  "ASME Sec VIII Div 1, 2019 Edition",
  "API 650 / API 620 storage tanks",
  "Rev. 02 dated as per clause 4.5",
  "Thickness 10-12 mm, design pressure 15-20 bar",
  "Scored 75-80 percent",
  "Handled 5-6 projects simultaneously",
  "IS 2062 Gr B plates",
  "Page 1 of 3",
  "PV Elite 2019",                 // a lone year is not a range
  "Nozzle loads as per WRC 107",
];
NEG.forEach(line=>{
  const r=parseDatesLine(line);
  ok(r.length===0,"NEG: "+line,"got "+JSON.stringify(r.map(x=>fmtYM(x.s)+"→"+fmtYM(x.e))));
});

// ---------- 4. the phantom-range regression ----------
{
  const r=parseDatesLine("1998 - 2005 (7 years)");
  ok(r.length===1,"no phantom range from '(7 years)'","got "+JSON.stringify(r.map(x=>fmtYM(x.s)+"→"+fmtYM(x.e))));
  ok(r.length===1&&Math.abs(yrs(r[0])-7.9)<0.4,"phantom: correct span","got "+(r[0]?yrs(r[0]):"-"));
}
{
  const r=parseDatesLine("Sr. Engineer | 2005 - 2010 | 5 Yrs 2 Months");
  ok(r.length===1,"no phantom from '5 Yrs 2 Months'","got "+r.length);
}

// ---------- 5. claimed-experience parsing ----------
[["Having 22+ years of experience in static equipment",22],
 ["Total Experience : 22 Years",22],
 ["Total Experience (in years): 18.5",18.5],
 ["Experience: 15 yrs",15],
 ["22 years 6 months of experience",22.5],
 ["Over 30 years of rich professional experience",30],
 ["A mechanical engineer with 8 years experience",8],
 ["3 years of experience in PV Elite and 22 years of total experience",22],
].forEach(([t,exp])=>{
  const v=claimedExperience(t);
  ok(Math.abs(v-exp)<0.2,"CLAIM: "+t,"got "+v+" expected "+exp);
});

// ---------- 6. full-CV scenarios ----------
function total(cv,opts={}){
  const det=extractDates(cv);
  const work=det.all.filter(r=>r.kind==="work");
  const merged=mergeIntervals(work);
  return {R:reconcileExperience(merged,claimedExperience(cv),opts.override,det.undatedEmployers),det,work,merged};
}

// 6a. 22-year career, mixed short-year formats (the reported bug)
const CV1=`Ravindra Barange
ravindra.barange@example.com | Mobile: 9876543210

PROFESSIONAL SUMMARY
Mechanical design engineer with 22+ years of experience in static equipment.

WORK EXPERIENCE
Larsen & Toubro Ltd, Mumbai — Design Engineer
1998-2005
Pressure vessel and heat exchanger design as per ASME Sec VIII Div 1.

Thermax Limited, Pune — Sr. Design Engineer
2005-14
Led a team of 10-15 engineers. Designed 20-30 vessels.

Petrofac International — Lead Engineer
Jun'14 to Present
FEED and EPC projects, ASME Sec VIII Div 2.

EDUCATION
B.E. Mechanical, Nagpur University, 1994 - 1998
`;
{
  const {R,merged}=total(CV1);
  ok(merged.length===1,"CV1 merges to one continuous span","got "+merged.length);
  ok(R.years>=27&&R.years<=29,"CV1 total ≈ 28 yrs (1998→now)","got "+R.years+" union="+R.union.toFixed(1)+" span="+R.span.toFixed(1)+" claim="+R.claim);
  ok(!total(CV1).det.all.some(r=>r.kind==="work"&&Math.floor(r.s/12)===1994),"CV1 education not counted as work");
}

// 6b. dates partially unparseable -> falls back to the stated claim
const CV2=`Sunil Kumar
PROFILE
Static equipment specialist with 24 years of experience.

EXPERIENCE
ABC Engineering — Engineer   [Duration as per annexure]
XYZ Refineries — Sr. Engineer
2015 - Present
`;
{
  const {R}=total(CV2);
  ok(R.years===24,"CV2 uses the stated 24 yrs when dates are sparse","got "+R.years+" basis="+R.basis);
  ok(R.confidence==="medium","CV2 confidence flagged as medium","got "+R.confidence);
}

// 6c. inflated claim is NOT trusted
const CV3=`EXPERIENCE
Alpha Ltd 2018 - 2021
Beta Ltd 2021 - Present
SUMMARY: 30 years of experience.
`;
{
  const {R}=total(CV3);
  ok(R.years<12,"CV3 rejects the inflated 30-yr claim","got "+R.years);
  ok(/exceeds/.test(R.basis),"CV3 explains why","basis="+R.basis);
}

// 6d. real gap is preserved (union < span)
const CV4=`EXPERIENCE
Alpha Ltd  Jan 2000 - Dec 2004
Beta Ltd   Jan 2010 - Dec 2014
`;
{
  const {R}=total(CV4);
  ok(Math.abs(R.union-10)<0.5,"CV4 union excludes the gap","union="+R.union);
  ok(Math.abs(R.span-15)<0.5,"CV4 span includes the gap","span="+R.span);
  ok(Math.abs(R.years-10)<0.5,"CV4 reports the union","got "+R.years);
}

// 6e. tabular CV with the row split across lines
const CV5=`EMPLOYMENT DETAILS
Organization        Designation        From        To
Godrej & Boyce      Design Engineer
Jun 2001
May 2009
`;
{
  const {work}=total(CV5);
  ok(work.length===1,"CV5 pairs the split table columns","got "+work.length);
  ok(work.length===1&&Math.abs(yrs(work[0])-7.9)<0.4,"CV5 span ≈ 7.9 yrs","got "+(work[0]?yrs(work[0]):"-"));
}

// 6f. manual override always wins
{
  const {R}=total(CV1,{override:"21.5"});
  ok(R.years===21.5&&R.confidence==="manual","override wins","got "+R.years);
}

// 6g. education-only dates never become work
const CV6=`EDUCATION
B.E. Mechanical Engineering, Pune University, 2010 - 2014
Diploma in Mechanical, 2007 - 2010
HSC, Maharashtra Board, 2005 - 2007
`;
{
  const {work}=total(CV6);
  ok(work.length===0,"CV6 has no work ranges","got "+work.length+" "+JSON.stringify(work.map(w=>w.src)));
}

console.log("\n"+"=".repeat(60));
console.log(`PASS ${pass}   FAIL ${fail}`);
if(fails.length){console.log("=".repeat(60));fails.forEach(f=>console.log("  ✗ "+f));}
console.log("=".repeat(60));
process.exit(fail?1:0);
