const ExcelJS = require('./node_modules/exceljs');
const { S1_DS_SECTIONS, MRD_ICONS } = require('./extract.js');
const { buildKeys } = require('./keys.js');

const BANNER = 'FF1F497D';   // dark blue section banner
const HEAD   = 'FF4F81BD';   // header row
const LABEL  = 'FFDCE6F2';   // light blue label wash
const LOCKED = 'FFF2F2F2';   // reference / read-only tint
const thin   = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };

const OPERATORS = [
  ['equals',           'Value matches exactly',                          'base.other.support_method | equals | Skirt'],
  ['not equals',       'Value is anything other than this',              'design.insulation.required | not equals | Yes'],
  ['is any of',        'Value matches one of a comma-separated list',    'nozzle[].rating | is any of | 900#, 1500#, 2500#'],
  ['includes',         'Multi-choice field contains this option',        'design.vessel_service | includes | Wet Hydrogen Sulfide (H2S)'],
  ['is filled',        'Anything was entered (leave Value blank)',       'design.cladding | is filled |'],
  ['is empty',         'Nothing was entered (leave Value blank)',        'design.cladding | is empty |'],
  ['greater than',     'Number is greater than Value',                   'design.design_temperature_internal | greater than | 400'],
  ['less than',        'Number is less than Value',                      'design.min_design_metal_temperature_mdmt | less than | -29'],
  ['greater or equal', 'Number is greater than or equal to Value',       'nozzle[].count | greater or equal | 1'],
  ['less or equal',    'Number is less than or equal to Value',          'design.design_pressure_internal | less or equal | 10'],
];

const EXAMPLES = [
  ['EX-01','Support','Verify skirt thickness and skirt-to-head joint type against LESA.','VEFV1128M','Critical','','ALL',
   'base.other.support_method','equals','Skirt','','','','','',''],
  ['EX-02','Support','Check saddle wear plate width and included angle (min 120°).','','Major','','ALL',
   'base.other.support_method','equals','Saddle','','','','','',''],
  ['EX-03','Internals','Confirm demister pad material and retaining arrangement.','','Major','','ALL',
   'design.removable_internals','equals','Demister','','','','','',''],
  ['EX-04','Material','Confirm NACE MR0175 / HIC-tested plate for wet H2S service.','NACE MR0175','Critical','','ALL',
   'design.vessel_service','includes','Wet Hydrogen Sulfide (H2S)','','','','','',''],
  ['EX-05','Design Condition','Verify external pressure / vacuum stiffening ring design.','UG-28','Critical','','ALL',
   'design.design_pressure_external','is filled','','','','','','',''],
  ['EX-06','Ext. Attachment','Check insulation support ring spacing (<=915 mm).','','Minor','','ALL',
   'design.insulation.required','equals','Yes','','','','','',''],
  ['EX-07','Nozzles','Verify RTJ groove dimensions and hardness for high-rating nozzles.','','Major','','ALL',
   'nozzle[].rating','is any of','900#, 1500#, 2500#','','','','','',''],
  ['EX-08','Nozzles','Confirm nozzle schedule matches the LESA nozzle list.','','Critical','','ALL',
   'nozzle[].count','greater or equal','1','','','','','',''],
  ['EX-09','Design Condition','Verify impact testing exemption curve for low MDMT.','UCS-66','Critical','','ALL',
   'design.min_design_metal_temperature_mdmt','less than','-29','','','','','',''],
  ['EX-10','Material','Verify PWHT procedure and heating/cooling rates.','UCS-56','Major','','ANY',
   'inspection.post_weld_heat_treatment','is filled','','design.vessel_service','includes','Amine','','',''],
  ['EX-11','Design Condition','Both conditions must hold: Div. 1 design in cyclic service.','','Major','','ALL',
   'design.design_code','equals','ASME Sec VIII Div. 1','design.vessel_service','includes','Cyclic','','',''],
];

const wb = new ExcelJS.Workbook();
wb.creator = 'Meridian';
wb.created = new Date();

// ───────────────────────────────────────────── README
const readme = wb.addWorksheet('README');
readme.columns = [{ width: 3 }, { width: 26 }, { width: 96 }];
const rmRows = [
  ['banner', 'MERIDIAN — MASTER CHECKLIST'],
  ['blank'],
  ['para', '', 'Fill in the Checkpoints sheet. Every checkpoint you list there becomes available to Meridian; Meridian then shows a checkpoint only when its conditions match the vessel that was built on the Build Vessel page.'],
  ['blank'],
  ['h', 'How filtering works'],
  ['kv', 'No conditions', 'Leave Field 1 blank and the checkpoint ALWAYS shows. This is the default.'],
  ['kv', 'One condition', 'Fill Field 1 / Operator 1 / Value 1. The checkpoint shows only when that is true.'],
  ['kv', 'Several conditions', 'Fill Field 2, Field 3, ... Set Match to ALL (every condition must hold) or ANY (at least one).'],
  ['kv', 'More than three', 'Add more columns to the right in the same Field / Operator / Value order. Meridian reads as many as it finds.'],
  ['blank'],
  ['h', 'Filling the condition columns'],
  ['kv', 'Field', 'A key from the Field Reference sheet. Pick from the dropdown — do not type it by hand.'],
  ['kv', 'Operator', 'From the Operators sheet. Pick from the dropdown.'],
  ['kv', 'Value', 'What to compare against. For choice fields use one of the Allowed Values shown in Field Reference, spelled exactly. Leave blank for "is filled" / "is empty".'],
  ['blank'],
  ['h', 'Table fields'],
  ['para', '', 'Keys containing [] refer to the repeating tables (nozzles, instrument nozzles, operating streams). A condition on nozzle[].rating is true when ANY nozzle row matches. Use nozzle[].count to test how many rows were entered.'],
  ['blank'],
  ['h', 'The other columns'],
  ['kv', 'Checkpoint ID', 'Must be unique. Keep the ID stable once issued — Meridian stores review results against it, so changing an ID loses that checkpoint’s history.'],
  ['kv', 'Section', 'Which checklist tab the checkpoint appears under. Add new sections on the Sections sheet.'],
  ['kv', 'Checkpoint', 'The text the reviewer reads. One clear, verifiable statement.'],
  ['kv', 'Reference', 'Optional code clause or standard (UG-32, VEFV1128M, ...). Shown alongside the checkpoint.'],
  ['kv', 'Criticality', 'Critical / Major / Minor. Optional.'],
  ['kv', 'Order', 'Optional number controlling order within a section. Blank = sheet order.'],
  ['blank'],
  ['h', 'Notes'],
  ['para', '', 'The Checkpoints sheet is pre-filled with the 110 checkpoints currently in Meridian, all unconditional. Edit them, delete them, add your own — this sheet replaces what is in the app. (Meridian\u2019s old \u201cExport\u201d tab is not included; those were app instructions, not review points.)'],
  ['para', '', 'The Examples sheet shows working conditions using real keys. It is reference only; Meridian ignores it.'],
  ['para', '', 'Field Reference, Operators and Sections are generated from Meridian. Do not rename their columns.'],
];
rmRows.forEach(r => {
  const row = readme.addRow(r[0] === 'blank' ? [] : ['', r[1] || '', r[2] || '']);
  const n = row.number;
  if (r[0] === 'banner') {
    readme.mergeCells(n, 2, n, 3);
    const c = readme.getCell(n, 2);
    c.value = r[1];
    c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: BANNER } };
    c.font = { bold:true, size:14, color:{ argb:'FFFFFFFF' } };
    c.alignment = { vertical:'middle' };
    row.height = 26;
  } else if (r[0] === 'h') {
    readme.mergeCells(n, 2, n, 3);
    const c = readme.getCell(n, 2);
    c.value = r[1];
    c.font = { bold:true, size:12, color:{ argb:'FF1F497D' } };
    row.height = 20;
  } else if (r[0] === 'kv') {
    readme.getCell(n, 2).font = { bold:true, size:11 };
    readme.getCell(n, 3).font = { size:11 };
    readme.getCell(n, 3).alignment = { wrapText:true, vertical:'top' };
  } else if (r[0] === 'para') {
    readme.mergeCells(n, 2, n, 3);
    const c = readme.getCell(n, 2);
    c.value = r[2];
    c.font = { size:11 };
    c.alignment = { wrapText:true, vertical:'top' };
    row.height = 30;
  }
});

// ───────────────────────────────────────────── Field Reference
const fr = wb.addWorksheet('Field Reference');
const keys = buildKeys();
fr.columns = [
  { header:'Field Key',      width:42 },
  { header:'Datasheet Section', width:24 },
  { header:'Group',          width:26 },
  { header:'Field',          width:32 },
  { header:'Type',           width:14 },
  { header:'Allowed Values', width:60 },
  { header:'Notes',          width:32 },
];
keys.forEach(k => fr.addRow([k.key, k.section, k.group, k.field, k.type, k.values, k.note]));
fr.getRow(1).eachCell(c => {
  c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: HEAD } };
  c.font = { bold:true, size:12, color:{ argb:'FFFFFFFF' } };
  c.border = thin;
});
fr.getRow(1).height = 26;
for (let i = 2; i <= fr.rowCount; i++) {
  fr.getRow(i).eachCell(c => { c.border = thin; c.font = { size:11 }; });
  fr.getCell(i, 1).font = { size:11, bold:true };
  fr.getCell(i, 1).fill = { type:'pattern', pattern:'solid', fgColor:{ argb: LABEL } };
  fr.getCell(i, 6).alignment = { wrapText:true, vertical:'top' };
}
fr.autoFilter = { from:'A1', to:'G1' };
fr.views = [{ state:'frozen', ySplit:1 }];

// ───────────────────────────────────────────── Operators
const op = wb.addWorksheet('Operators');
op.columns = [{ header:'Operator', width:20 }, { header:'Meaning', width:52 }, { header:'Example', width:64 }];
OPERATORS.forEach(o => op.addRow(o));
op.getRow(1).eachCell(c => {
  c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: HEAD } };
  c.font = { bold:true, size:12, color:{ argb:'FFFFFFFF' } };
  c.border = thin;
});
op.getRow(1).height = 26;
for (let i = 2; i <= op.rowCount; i++) {
  op.getRow(i).eachCell(c => { c.border = thin; c.font = { size:11 }; });
  op.getCell(i, 1).font = { size:11, bold:true };
  op.getCell(i, 1).fill = { type:'pattern', pattern:'solid', fgColor:{ argb: LABEL } };
}

// ───────────────────────────────────────────── Sections
const secSheet = wb.addWorksheet('Sections');
secSheet.columns = [{ header:'Section', width:28 }, { header:'Order', width:10 }, { header:'Description', width:60 }];
MRD_ICONS.filter(i => i.id !== 'export').forEach((i, idx) =>
  secSheet.addRow([i.label, idx + 1, '']));
secSheet.getRow(1).eachCell(c => {
  c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: HEAD } };
  c.font = { bold:true, size:12, color:{ argb:'FFFFFFFF' } };
  c.border = thin;
});
secSheet.getRow(1).height = 26;
for (let i = 2; i <= secSheet.rowCount; i++) {
  secSheet.getRow(i).eachCell(c => { c.border = thin; c.font = { size:11 }; });
  secSheet.getCell(i, 1).font = { size:11, bold:true };
  secSheet.getCell(i, 1).fill = { type:'pattern', pattern:'solid', fgColor:{ argb: LABEL } };
}

// ───────────────────────────────────────────── Checkpoints
const CP_COLS = [
  { header:'Checkpoint ID', width:15 },
  { header:'Section',       width:20 },
  { header:'Checkpoint',    width:78 },
  { header:'Reference',     width:16 },
  { header:'Criticality',   width:13 },
  { header:'Order',         width:8  },
  { header:'Match',         width:9  },
  { header:'Field 1',       width:36 },
  { header:'Operator 1',    width:17 },
  { header:'Value 1',       width:26 },
  { header:'Field 2',       width:36 },
  { header:'Operator 2',    width:17 },
  { header:'Value 2',       width:26 },
  { header:'Field 3',       width:36 },
  { header:'Operator 3',    width:17 },
  { header:'Value 3',       width:26 },
];

function buildCheckpointSheet(name, rows, tint) {
  const ws = wb.addWorksheet(name);
  ws.columns = CP_COLS;
  rows.forEach(r => ws.addRow(r));

  const head = ws.getRow(1);
  head.eachCell((c, n) => {
    c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: n >= 7 ? BANNER : HEAD } };
    c.font = { bold:true, size:12, color:{ argb:'FFFFFFFF' } };
    c.border = thin;
    c.alignment = { vertical:'middle', horizontal: n >= 6 ? 'center' : 'left' };
  });
  head.height = 30;

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    for (let c = 1; c <= CP_COLS.length; c++) {
      const cell = ws.getCell(i, c);
      cell.border = thin;
      cell.font = { size:11 };
      if (c === 3) cell.alignment = { wrapText:true, vertical:'top' };
      if (c === 1) { cell.font = { size:11, bold:true }; cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: LABEL } }; }
      if (tint && c >= 7) cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: LOCKED } };
    }
  }
  ws.views = [{ state:'frozen', xSplit:3, ySplit:1 }];
  ws.autoFilter = { from:'A1', to:'P1' };
  return ws;
}

// Seed with what Meridian currently has, unconditional
const seeded = [];
let n = 0;
MRD_ICONS.filter(i => i.id !== 'export').forEach((ico, si) => {
  ico.checks.forEach((chk, ci) => {
    n++;
    seeded.push([
      'CP-' + String(n).padStart(3, '0'), ico.label, chk, '', '', (si + 1) * 100 + (ci + 1),
      'ALL', '', '', '', '', '', '', '', '', ''
    ]);
  });
});

const cp = buildCheckpointSheet('Checkpoints', seeded, false);

// Dropdowns down the whole usable range
const LAST = 600;
const listVal = (formula) => ({ type:'list', allowBlank:true, showErrorMessage:true, formulae:[formula] });
for (let i = 2; i <= LAST; i++) {
  cp.getCell(i, 2).dataValidation  = listVal(`=Sections!$A$2:$A$${secSheet.rowCount}`);
  cp.getCell(i, 5).dataValidation  = listVal('"Critical,Major,Minor"');
  cp.getCell(i, 7).dataValidation  = listVal('"ALL,ANY"');
  [8, 11, 14].forEach(c => {
    cp.getCell(i, c).dataValidation = listVal(`='Field Reference'!$A$2:$A$${fr.rowCount}`);
  });
  [9, 12, 15].forEach(c => {
    cp.getCell(i, c).dataValidation = listVal(`=Operators!$A$2:$A$${op.rowCount}`);
  });
}

buildCheckpointSheet('Examples', EXAMPLES, true);

const out = 'MERIDIAN_Master_Checklist_TEMPLATE.xlsx';
wb.xlsx.writeFile(out).then(() => console.log('written:', out));
