const ExcelJS = require('./node_modules/exceljs');
const { MRD_ICONS } = require('./extract.js');
const { buildConditions } = require('./conditions.js');

const BANNER = 'FF1F497D';
const HEAD   = 'FF4F81BD';
const LABEL  = 'FFDCE6F2';
const thin   = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };

const conditions = buildConditions();
const sections   = MRD_ICONS.filter(i => i.id !== 'export').map(i => i.label);

const wb = new ExcelJS.Workbook();
wb.creator = 'Meridian';
wb.created = new Date();

// ═══════════════════════════════ Checkpoints
const ws = wb.addWorksheet('Checkpoints');
ws.columns = [
  { width: 22 },   // Section
  { width: 88 },   // Checkpoint
  { width: 46 },   // Show only when
  { width: 46 },   // ...and also
];

// Row 1 — instruction strip
ws.mergeCells(1, 1, 1, 4);
const note = ws.getCell(1, 1);
note.value = 'Type your checkpoints below. Leave "Show only when" blank and the checkpoint always appears. '
           + 'To make one conditional, pick a condition from the dropdown (the full list is on the Conditions sheet). '
           + 'Use the last column only if TWO things must both be true.';
note.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: BANNER } };
note.font = { size:11, color:{ argb:'FFFFFFFF' } };
note.alignment = { wrapText:true, vertical:'middle' };
ws.getRow(1).height = 40;

// Row 2 — header
ws.addRow(['Section', 'Checkpoint', 'Show only when…  (blank = always)', '…and also  (optional)']);
ws.getRow(2).eachCell(c => {
  c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: HEAD } };
  c.font = { bold:true, size:12, color:{ argb:'FFFFFFFF' } };
  c.border = thin;
  c.alignment = { vertical:'middle' };
});
ws.getRow(2).height = 26;

// Seed with what Meridian has today, all unconditional
MRD_ICONS.filter(i => i.id !== 'export').forEach(ico => {
  ico.checks.forEach(chk => ws.addRow([ico.label, chk, '', '']));
});

const LAST = 600;
for (let i = 3; i <= LAST; i++) {
  for (let c = 1; c <= 4; c++) {
    const cell = ws.getCell(i, c);
    cell.border = thin;
    cell.font = { size:11 };
    if (c === 2) cell.alignment = { wrapText:true, vertical:'top' };
    if (c === 1) cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: LABEL } };
  }
  ws.getCell(i, 1).dataValidation = {
    type:'list', allowBlank:true, showErrorMessage:true,
    formulae:[`=Sections!$A$2:$A$${sections.length + 1}`]
  };
  [3, 4].forEach(c => {
    ws.getCell(i, c).dataValidation = {
      type:'list', allowBlank:true, showErrorMessage:true,
      error:'Pick a condition from the list on the Conditions sheet.',
      formulae:[`=Conditions!$A$2:$A$${conditions.length + 1}`]
    };
  });
}
ws.views = [{ state:'frozen', ySplit:2 }];
ws.autoFilter = { from:'A2', to:'D2' };

// ═══════════════════════════════ Conditions (dropdown source + browsable list)
const cond = wb.addWorksheet('Conditions');
cond.columns = [
  { header:'Condition', width:62 },
  { header:'Comes from', width:26 },
  { header:'Meaning', width:44 },
];
conditions.forEach(c => cond.addRow([c.phrase, c.where, c.note]));
cond.getRow(1).eachCell(c => {
  c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: HEAD } };
  c.font = { bold:true, size:12, color:{ argb:'FFFFFFFF' } };
  c.border = thin;
});
cond.getRow(1).height = 26;
for (let i = 2; i <= cond.rowCount; i++) {
  cond.getRow(i).eachCell(c => { c.border = thin; c.font = { size:11 }; });
  cond.getCell(i, 1).font = { size:11, bold:true };
  cond.getCell(i, 1).fill = { type:'pattern', pattern:'solid', fgColor:{ argb: LABEL } };
}
cond.autoFilter = { from:'A1', to:'C1' };
cond.views = [{ state:'frozen', ySplit:1 }];

// ═══════════════════════════════ Sections (dropdown source)
const sec = wb.addWorksheet('Sections');
sec.columns = [{ header:'Section', width:28 }];
sections.forEach(s => sec.addRow([s]));
sec.getRow(1).eachCell(c => {
  c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: HEAD } };
  c.font = { bold:true, size:12, color:{ argb:'FFFFFFFF' } };
  c.border = thin;
});
for (let i = 2; i <= sec.rowCount; i++) {
  sec.getCell(i, 1).border = thin;
  sec.getCell(i, 1).font = { size:11 };
}

const out = process.argv[2] || 'MERIDIAN_Checklist_TEMPLATE.xlsx';
wb.xlsx.writeFile(out).then(() => console.log('written:', out));
