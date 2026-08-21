/* ============================================================================
   CONFIGURATION-WORKBOOK GENERATOR
   Produces "Recruitment_Framework_Config_TEMPLATE.xlsx" — the container the
   user fills with THEIR confidential framework. The running tool reads this
   workbook in the browser (in memory only). Sheet names & header labels here
   MUST match the parser in the app (parseConfigWorkbook).
   ============================================================================ */
const ExcelJS = require("exceljs");
const S = require("./sample-config.js");

const NAVY="FF1F3864", HEAD="FF2E5C8A", SUB="FFDCE6F1", ACC="FF305496",
      SAMPLE="FFFFF2CC", NOTE="FF7F7F7F", WHITE="FFFFFFFF", LINE="FFBFBFBF";

const wb = new ExcelJS.Workbook();
wb.creator = "Recruitment Analyzer — Config Template";
wb.created = new Date();

const border = {top:{style:"thin",color:{argb:LINE}},left:{style:"thin",color:{argb:LINE}},
                bottom:{style:"thin",color:{argb:LINE}},right:{style:"thin",color:{argb:LINE}}};
function headerRow(ws, cells, row){
  const r = ws.getRow(row);
  cells.forEach((t,i)=>{const c=r.getCell(i+1); c.value=t;
    c.fill={type:"pattern",pattern:"solid",fgColor:{argb:HEAD}};
    c.font={bold:true,color:{argb:WHITE},size:11};
    c.alignment={vertical:"middle",horizontal:"center",wrapText:true};
    c.border=border;});
  r.height=30;
}
function body(ws, rowArr, startRow, sampleCols){
  rowArr.forEach((rowVals,ri)=>{
    const r=ws.getRow(startRow+ri);
    rowVals.forEach((v,ci)=>{const c=r.getCell(ci+1); c.value=v;
      c.border=border; c.alignment={vertical:"top",wrapText:true,horizontal:typeof v==="number"?"center":"left"};
      if(sampleCols&&sampleCols(ci)) c.fill={type:"pattern",pattern:"solid",fgColor:{argb:SAMPLE}};
    });
  });
}

/* ---- Sheet 1: Read Me ---------------------------------------------------- */
const rm = wb.addWorksheet("1. Read Me",{properties:{tabColor:{argb:NAVY}}});
rm.columns=[{width:3},{width:110}];
const rmLines=[
 ["","RECRUITMENT FRAMEWORK — CONFIGURATION WORKBOOK", "title"],
 ["",""],
 ["","WHAT THIS FILE IS","h"],
 ["","This workbook holds your department's confidential hiring framework — the levels, skills, scoring and"],
 ["","interview questions. The analysis tool has NO framework of its own: it reads everything from this file."],
 ["",""],
 ["","HOW YOUR DATA IS HANDLED  (read this)","h"],
 ["","• You open the tool and upload this workbook. It is parsed IN YOUR BROWSER and held in memory only."],
 ["","• Nothing in this file — and no resume you analyse — is ever sent to a server. There is no server."],
 ["","• The moment you refresh or close the tab, the framework AND every resume are erased. Nothing persists."],
 ["","• To analyse again later, re-open the tool and upload this workbook again."],
 ["","→ This is what keeps the TOOL and your CONFIDENTIAL DATA separate. The tool can be shared or demoed"],
 ["","  freely because it carries no data; this workbook stays with you."],
 ["",""],
 ["","HOW TO FILL IT IN","h"],
 ["","• Yellow cells are SAMPLE values — a generic example. Replace them all with your own framework."],
 ["","• Do NOT rename the sheets or change the header row labels — the tool finds data by those names."],
 ["","• You may add or remove ROWS freely (any number of levels, skills, dimensions, competencies)."],
 ["","• The level columns in the Skills/Behavioral/Competencies sheets must match the Level Codes you"],
 ["","  define in the 'Levels' sheet (e.g. L1, L2, L3 …). Add or delete level columns to match."],
 ["",""],
 ["","THE SHEETS","h"],
 ["","2. Setup            Organisation name, score scales, weightings, seniority keywords."],
 ["","3. Levels           Your designation ladder — code, name, min/max years, job titles."],
 ["","4. Technical Skills  Section A. Each skill: detection keywords + the reference score expected at each level."],
 ["","5. Behavioral       Section B. Soft/behavioral dimensions with keywords and the expected level scores."],
 ["","6. Competencies     Section C. Qualitative competencies with a text descriptor per level."],
 ["","7. Questions        Optional. Interview questions per topic, printed into the evaluation kit."],
 ["",""],
 ["","SCORES","h"],
 ["","• Technical skills use the numeric scale you set in Setup (sample 0–4: 0 none … 4 expert)."],
 ["","• Behavioral dimensions use the behavioral scale (sample 1–7)."],
 ["","• 'Keywords' are comma-separated phrases the tool looks for in the resume text to estimate a score."],
 ["","• 'Years Weight' (None/Low/Medium/High) sets how much a candidate's years of experience drive that row."],
 ["","• 'Link Group' (Behavioral) ties a dimension to one skill Group's average, or 'All' for every skill."]
];
rmLines.forEach((ln,i)=>{
  const r=rm.getRow(i+1); const c=r.getCell(2); c.value=ln[1];
  if(ln[2]==="title"){c.font={bold:true,size:16,color:{argb:NAVY}};r.height=22;}
  else if(ln[2]==="h"){c.font={bold:true,size:12,color:{argb:ACC}};r.height=18;}
  else {c.font={size:10.5,color:{argb:"FF333333"}};}
});

/* ---- Sheet 2: Setup ------------------------------------------------------ */
const su = wb.addWorksheet("2. Setup",{properties:{tabColor:{argb:HEAD}}});
su.columns=[{width:34},{width:60},{width:44}];
headerRow(su,["Setting","Value","Notes"],1);
const setupNotes={
 "Organization / Department":"Printed on the report header.",
 "Report Title":"Title of the exported evaluation kit.",
 "Track A Label":"Primary career track (e.g. Engineer).",
 "Track B Label":"Optional second track (e.g. Designer). Leave blank if unused.",
 "Technical Scale Min":"Lowest technical score (usually 0).",
 "Technical Scale Max":"Highest technical score (e.g. 4).",
 "Behavioral Scale Min":"Lowest behavioral score (e.g. 1).",
 "Behavioral Scale Max":"Highest behavioral score (e.g. 7).",
 "Skill Weight (0-1)":"Weight of skills in best-fit. Skill + Years should total 1.",
 "Years Weight (0-1)":"Weight of experience in best-fit.",
 "Meets-Ratio Threshold (0-1)":"Share of skills met to qualify for a level (e.g. 0.7).",
 "Seniority Signal Keywords":"Comma-separated. Their presence nudges scores up one step."
};
let sr=2;
for(const k of Object.keys(S.setup)){
  const r=su.getRow(sr++);
  r.getCell(1).value=k; r.getCell(1).font={bold:true};
  r.getCell(2).value=S.setup[k];
  r.getCell(2).fill={type:"pattern",pattern:"solid",fgColor:{argb:SAMPLE}};
  r.getCell(3).value=setupNotes[k]||""; r.getCell(3).font={italic:true,size:9.5,color:{argb:NOTE}};
  [1,2,3].forEach(i=>{r.getCell(i).border=border;r.getCell(i).alignment={vertical:"middle",wrapText:true};});
}

/* ---- Sheet 3: Levels ----------------------------------------------------- */
const lv = wb.addWorksheet("3. Levels",{properties:{tabColor:{argb:HEAD}}});
lv.columns=[{width:12},{width:16},{width:11},{width:11},{width:30},{width:30}];
headerRow(lv,["Level Code","Short Name","Min Years","Max Years","Track A Title","Track B Title"],1);
body(lv,S.levels,2,()=>true);
lv.views=[{state:"frozen",ySplit:1}];

/* ---- helper to build a level-scored sheet -------------------------------- */
const levelCodes = S.levels.map(l=>l[0]);
function levelSheet(name,tab,fixedCols,rows,{descriptor=false}={}){
  const ws=wb.addWorksheet(name,{properties:{tabColor:{argb:tab}}});
  const hdr=[...fixedCols, ...levelCodes];
  const widths=fixedCols.map((c,i)=>i===0? (name.includes("Skill")?6:22) : (c.toLowerCase().includes("keyword")?42:16));
  ws.columns=[...widths.map(w=>({width:w})), ...levelCodes.map(()=>({width:descriptor?20:8}))];
  headerRow(ws,hdr,1);
  body(ws,rows,2,ci=>ci>=fixedCols.length);   // highlight the per-level sample cells
  // also lightly highlight fixed sample cells
  rows.forEach((rv,ri)=>{const r=ws.getRow(2+ri);
    for(let ci=0;ci<fixedCols.length;ci++){const c=r.getCell(ci+1);
      if(!c.fill) c.fill={type:"pattern",pattern:"solid",fgColor:{argb:SAMPLE}};}});
  ws.views=[{state:"frozen",xSplit:fixedCols.length,ySplit:1}];
  return ws;
}

/* ---- Sheet 4: Technical Skills (Section A) ------------------------------- */
levelSheet("4. Technical Skills",HEAD,["#","Skill","Group","Keywords (comma separated)"],
  S.skills.map((s,i)=>[i+1,...s]));

/* ---- Sheet 5: Behavioral (Section B) ------------------------------------ */
levelSheet("5. Behavioral",HEAD,["Dimension","Keywords (comma separated)","Years Weight","Link Group"],
  S.behavioral);

/* ---- Sheet 6: Competencies (Section C) ---------------------------------- */
levelSheet("6. Competencies",HEAD,["Competency","Keywords (comma separated)","Years Weight"],
  S.competencies,{descriptor:true});

/* ---- Sheet 7: Questions (optional) -------------------------------------- */
const q=wb.addWorksheet("7. Questions",{properties:{tabColor:{argb:HEAD}}});
q.columns=[{width:10},{width:24},{width:38},{width:38},{width:38}];
headerRow(q,["Section (A/B/C)","Topic","Question 1","Question 2","Question 3"],1);
body(q,S.questions,2,()=>true);
q.views=[{state:"frozen",ySplit:1}];

wb.xlsx.writeFile("Recruitment_Framework_Config_TEMPLATE.xlsx").then(()=>{
  console.log("template written");
});
