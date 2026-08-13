"""
Extract eqp.tank from Matriz_EQP_FINAL.xlsx and map every sub-parameter onto the
8 physical zones + 4 transversal control groups defined on page 1 of
"pdf tank checklist.pdf".  Emits JSON for inlining into the GAD review app.
"""
import zipfile, re, json
from xml.etree import ElementTree as ET

XLSX = '/root/.claude/uploads/706cbad2-49b2-5620-866d-c844ed50268d/086b45f9-Matriz_EQP_FINAL.xlsx'
M = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'

z = zipfile.ZipFile(XLSX)
ss = [''.join(t.text or '' for t in si.iter(M + 't'))
      for si in ET.fromstring(z.read('xl/sharedStrings.xml'))]

def read_sheet(path):
    sh = ET.fromstring(z.read(path)); rows = {}
    for row in sh.iter(M + 'row'):
        d = {}
        for c in row.iter(M + 'c'):
            col = re.match(r'([A-Z]+)', c.get('r')).group(1)
            t, v = c.get('t'), c.find(M + 'v')
            val = ss[int(v.text)] if (t == 's' and v is not None) else (v.text if v is not None else '')
            if val: d[col] = val.strip()
        if d: rows[int(row.get('r'))] = d
    return rows

rows = read_sheet('xl/worksheets/sheet3.xml')   # eqp.tank

DISCIPLINE = {
    '108': 'Projects', '120': 'Process', '131': 'Piping', '132': 'Civil',
    '133': 'Static Equipment', '134': 'Electrical', '136': 'Mechanical',
    '137': 'Instrumentation', '139': 'Materials', '236': 'Safety / Loss Prevention',
    '237': 'Metallurgy', '721': 'HT Thermal Design', '724': 'HT Mechanical Design',
    '732': 'HT Engineering Services',
}

# ── Zone definitions, verbatim from page 1 of the PDF ────────────────────────
ZONES = [
  ('Z1','Roof & Roof Structure',      '§1.2–1.3 / §1.6',        'zone', '#2B6CB0'),
  ('Z2','Shell Courses & Wind Girders','§1.1 / §1.4–1.5 / §2.3', 'zone', '#2C9AA8'),
  ('Z3','Bottom, Annular & Cleanout', '§1.4 / §5.3 / §6.1–6.2',  'zone', '#D9922E'),
  ('Z4','Anchorage & Foundation',     '§2.6 / §5.2–5.3',         'zone', '#1B3A5C'),
  ('Z5','Floating Roof & Internals',  '§1.6',                    'zone', '#2A9D8F'),
  ('Z6','Stairs, Platforms & Safety', '§1.2 / §1.7',             'zone', '#4E8B62'),
  ('Z7','Nozzles, Manholes & Vents',  '§1.1–1.2 / §1.7 / §6',    'zone', '#E08A2E'),
  ('Z8','Materials, Coating & Loads', '§2.4–2.8 / §4 / §5 / §11','zone', '#3763A8'),
  ('T1','Input Package',              '§0',                      'transversal', '#1B3A5C'),
  ('T2','Design Basis & Materials',   '§2–§4',                   'transversal', '#2C9AA8'),
  ('T3','Scope & Interfaces',         '§7–§13',                  'transversal', '#D9922E'),
  ('T4','Presentation & Record',      '§14',                     'transversal', '#3763A8'),
]

# Whole-table assignments (array tables keep their natural home)
TABLE_ZONE = {
  'eqp.tank_inventory': 'T2', 'eqp.tank_levels': 'T2',
  'eqp.tank_nozzles': 'Z7', 'eqp.tank_vents': 'Z7', 'eqp.tank_nozzle_calc_pr': 'Z7',
  'eqp.tank_coils': 'Z5', 'eqp.tank_agitator': 'Z5',
  'eqp.tank_platforms': 'Z6',
  'eqp.tank_shell': 'Z2', 'eqp.tank_pipe_clip': 'Z2',
  'eqp.tank_appurtenance': 'T3', 'eqp.tank_utilities': 'T3', 'eqp.tank_level_calc_pr': 'T3',
  'eqp.tank_auto_notes_pr': 'T4', 'eqp.tank_man_notes_pr': 'T4',
  'eqp.tank_auto_notes_ca': 'T4', 'eqp.tank_man_notes_ca': 'T4', 'eqp.calc_log_pr': 'T4',
}

# Ordered keyword rules for tag-level rows. First match wins.
# (zone, [regexes tested against "key || description" lower-cased])
RULES = [
 ('T1', [r'\bnum_requi\b', r'\bunit_code\b', r'\bunit_name\b', r'\btag_number\b', r'\btag_service\b',
         r'num_(prds|meds|spec|msd|pid|pfd|vend_gad)\b', r'\brev_(prds|meds)\b', r'\bdate_meds\b',
         r'\bsketch\b', r'\bmnfr\b', r'project coordinate', r'project elevation',
         r'counterclockwise rotation', r'data sheet no', r'p&id associated', r'pfd associated']),
 ('T4', [r'meds_(done|checked|approved)', r'note description', r'note correlative']),

 # ── Floating roof & internals (§1.6) ────────────────────────────────────────
 ('Z5', [r'float', r'pontoon', r'\bseal\b', r'rolling ladder', r'anti-?rotation',
         r'\bstwell\b', r'stilling well', r'submerged', r'\bcoil', r'agitat',
         r'mixer', r'int_moc', r'corr_int_thkns', r'internals']),

 # ── Stairs, platforms & safety (§1.2 / §1.7) ────────────────────────────────
 ('Z6', [r'\bplatform', r'\baccess_', r'stair', r'ladder', r'walkway', r'walkaway',
         r'handrail', r'fire protection', r'foam chamber', r'spray nozzle',
         r'leak detection', r'release prevention', r'earthlu', r'earthing lug']),

 # ── Nozzles, manholes & vents (§1.1–1.2 / §1.7 / §6) ────────────────────────
 ('Z7', [r'\bnozzle', r'\bvent_', r'vent devices', r'manhole', r'\bflange_',
         r'reinforcing_pa_pad', r'\bwrc_apply\b', r'\bfitt_mat_grade\b']),

 # ── Bottom, annular & cleanout (§1.4 / §5.3 / §6.1–6.2) ─────────────────────
 ('Z3', [r'\bbottom', r'\bannular', r'\bsump_', r'drip_ring', r'under_bottom', r'cleanout']),

 # ── Roof & roof structure (§1.2–1.3 / §1.6) ─────────────────────────────────
 ('Z1', [r'\broof', r'gauge hatch', r'flame arrester', r'\bcolumn_roof']),

 # ── Anchorage & foundation (§2.6 / §5.2–5.3) ────────────────────────────────
 ('Z4', [r'\banch', r'\bchair_', r'foundation', r'\bseismic', r'\bwind_(code|vel|cat|factor|moment|load|tload)',
         r'\blive_t', r'snow_sand', r'\bperimeter_', r'freeboard', r'sloshing', r'settlement',
         r'site class', r'soil category']),

 # ── Shell courses & wind girders (§1.1 / §1.4–1.5 / §2.3) ───────────────────
 ('Z2', [r'\bshell', r'wgirder', r'wind girder', r'\bdiam\b', r'\bheight\b',
         r'tank diameter', r'tank height', r'\bclip_']),

 # ── Materials, coating & loads (§2.4–2.8 / §4 / §5 / §11) ───────────────────
 ('Z8', [r'mat_grade', r'\bmoc\b', r'_moc\b', r'\bcoat', r'paint', r'insulation',
         r'\bpwht\b', r'stress relieve', r'\bclad', r'gask', r'bolts?_mat', r'\bnut_',
         r'corrosion allowance', r'corr_thkns', r'\bweight', r'hardness',
         r'\bcapro', r'cathodic', r'\banode\b', r'reference electrode',
         r'tk_test_', r'tk_corr_', r'nace', r'materials_spec', r'\bpmi_apply\b',
         r'special_serv_spec', r'hic|sohic|sscc|htha|disbonding|step cooling',
         r'thkns\b']),

 # ── Design basis & materials, transversal (§2–§4) ───────────────────────────
 ('T2', [r'\bstd\b', r'api_appendix', r'edition_addendum', r'nde_std',
         r'\bdes_(temp|press)', r'\bope_(press|temp|dens|spgr|viscd|weight)',
         r'joint_effic', r'radiograh|radiography', r'hydro_test', r'pneumatic_test',
         r'\bvol_', r'capacity', r'filling rate', r'emptying rate',
         r'massfr_|molefr_|molwt|conc_|phval|tan_overall|press_(h2|h2s|co2)',
         r'dewpt|bubpt|water_free|flashpt|pourpt|vappr|foul',
         r'apply_(flamm|toxic|lethal|corr|erosive|weth2s)', r'volfr_aromatic',
         r'\bhg_overall\b', r'bacteria', r'oxidants', r'desc_(upset|cycle|serv_others)',
         r'stout_id', r'ext_factor_press_comb', r'int_factor_press_comb',
         r'\bname_gas\b', r'\bbottom_slope\b', r'\bwork_.*basis\b']),

 # ── Scope & interfaces, transversal (§7–§13) ────────────────────────────────
 ('T3', [r'appur', r'\bcoil_apply\b', r'\bvent_apply\b', r'blank_apply',
         r'process_remark', r'tracing', r'utilit', r'remark', r'\bhold\b']),
]

DEFAULT_ZONE = 'T2'

def classify(key, desc, table):
    if table in TABLE_ZONE:
        return TABLE_ZONE[table], 'table'
    hay = (key + ' || ' + desc).lower()
    for zone, pats in RULES:
        for p in pats:
            if re.search(p, hay):
                return zone, p
    return DEFAULT_ZONE, 'default'

def disciplines(code_str):
    if not code_str: return []
    out = []
    for c in re.split(r'[-/,\s]+', code_str):
        c = c.strip()
        if c and c in DISCIPLINE: out.append(f'{c} — {DISCIPLINE[c]}')
        elif c: out.append(c)
    return out

items, cur_table, cur_section = [], 'eqp.tank', ''
for rn in sorted(rows):
    d = rows[rn]
    a = d.get('A', '')
    if a.startswith('▼'):
        cur_table = a.lstrip('▼ ').split('·')[0].strip()
        continue
    if d.get('B', '').startswith('▼'):
        cur_section = d['B'].lstrip('▼ ').strip()
        continue
    desc = d.get('O', '')
    if not desc or desc == 'description':
        continue
    key = d.get('N', '')
    zone, why = classify(key, desc, cur_table)
    items.append({
        'id':    f'r{rn}',
        'key':   key or '(unnamed)',
        'label': desc,
        'table': cur_table,
        'group': cur_section,
        'dtype': d.get('P', ''),
        'constr': d.get('Q', ''),
        'mand':  (d.get('R', '') or '').upper() == 'YES',
        'owner': disciplines(d.get('S', '')),
        'cons':  disciplines(d.get('T', '')),
        'note':  d.get('AJ', ''),
        'zone':  zone,
        'why':   why,
    })

by_zone = {}
for it in items: by_zone.setdefault(it['zone'], []).append(it)

out = {
  'meta': {
    'source_xlsx': 'Matriz_EQP_FINAL.xlsx  ·  sheet "eqp.tank"',
    'source_pdf': 'pdf tank checklist.pdf  ·  page 1 (LV-133-XX Tank Checklist)',
    'total': len(items),
    'disciplines': DISCIPLINE,
  },
  'zones': [
    {'id': zid, 'name': name, 'ref': ref, 'kind': kind, 'color': color,
     'items': by_zone.get(zid, [])}
    for zid, name, ref, kind, color in ZONES
  ],
}

with open('tank_data.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, separators=(',', ':'))

print('total items:', len(items))
for zid, name, *_ in ZONES:
    print(f'  {zid} {name:34s} {len(by_zone.get(zid, [])):4d}')
print('defaulted (no rule matched):', sum(1 for i in items if i['why'] == 'default'))
