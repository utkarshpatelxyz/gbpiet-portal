import json, re
raw=json.load(open('fab_data.json'))
LEG={'MI':'Material Inspection','MK':'Marking','CT':'Cutting','MC':'Machining','DR':'Drilling',
'RL':'Rolling','RE-ROLL':'Re-Rolling','C':'Circular','L':'Longitudinal','FM':'Forming',
"ASS'Y":'Assembly','ASSY':'Assembly','FU':'Fit-Up','WD':'Welding','FAB':'Fabrication',
'SR':'Stress Relieve','DI':'Dimension Inspection','VI':'Visual Inspection','HT':'Hydro Test',
'PA':'Painting','TB':'Tube Insert','SW':'Seal Welding','EXP':'Expanding','PKG':'Packing',
'PK':'Packing','G':'Packing','LP':'Ladder & Platform','PW':'Post Weld Heat Treatment'}
MN=['','JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
def ykey(m,d):  # order key: months Jul(7)..Dec(12) are 2026, Jan(1)..Jun are 2027
    yr=2026 if m>=7 else 2027
    return yr*10000+m*100+d
def expand(tok):
    # tok like 'L-FU,WD' 'MK,CT' 'C-FU,WD' 'PK,G' 'FU,FU,WD' 'RE-ROLL'
    tok=tok.replace('，',',')
    parts=re.split(r'[,\s]+', tok)
    names=[]
    for p in parts:
        p=p.strip()
        if not p: continue
        # handle prefix like L- C-
        pre=None
        m=re.match(r'^([A-Za-z]+)-(.+)$',p)
        if p in ('RE-ROLL',): names.append('Re-Rolling'); continue
        if m and m.group(1) in ('L','C'):
            pre=LEG.get(m.group(1)); p=m.group(2)
        key=p.upper().replace("'",'').replace('.','').replace('/','')
        nm=LEG.get(key) or LEG.get(p.upper()) or p
        names.append((pre+' '+nm) if pre else nm)
    # dedupe consecutive
    out=[]
    for n in names:
        if not out or out[-1]!=n: out.append(n)
    return ', '.join(out)

# group assignment by row position: head part rows before shell part.
# We detect via activity name keywords.
def group_of(name,idx,rows):
    n=(name or '').upper()
    if any(k in n for k in ['SHELL','SKIRT','SUPPORT','LUG','LEG']): return 'SHELL PART'
    if any(k in n for k in ['HEAD','COVER','CONE']): return 'HEAD PART'
    return None  # nozzle: inherit from preceding

seen=set(); tags=[]
for p in raw:
    key=(p['tag'], tuple((a['name'],len(a['steps'])) for a in p['activities']))
    sig=p['tag']
    if sig in seen: continue  # dedupe by tag (drops dup 542)
    seen.add(sig)
    dd=ykey(p['data_month'],p['data_day']) if p['data_month'] else 0
    acts=[]
    lastgrp='HEAD PART'
    allkeys=[]
    for i,a in enumerate(p['activities']):
        g=group_of(a['name'],i,None)
        if g: lastgrp=g
        steps=[]
        for s in a['steps']:
            k=ykey(s['m'],s['d'])
            steps.append({'code':s['s'],'label':expand(s['s']),'m':s['m'],'d':s['d'],
                          'date':f"{s['d']:02d} {MN[s['m']]}",'k':k,'done':k<=dd})
            allkeys.append(k)
        acts.append({'name':a['name'] or '—','group':lastgrp,'steps':steps})
    # window
    mn=min(allkeys) if allkeys else dd; mx=max(allkeys) if allkeys else dd
    total=sum(len(a['steps']) for a in acts); done=sum(1 for a in acts for s in a['steps'] if s['done'])
    tags.append({'tag':p['tag'],'doc':p['doc'],'wo':p['wo'],'delivery':p['delivery'],
                 'rev':p['rev'],'qty':p['qty'],'dataDate':f"{p['data_day']:02d} {MN[p['data_month']]} 2026",
                 'dataKey':dd,'winMin':mn,'winMax':mx,'progress':round(done/total*100) if total else 0,
                 'activities':acts})
project={'project':'HASSI MESSAOUD REFINERY PROJECT','projectNo':'80080',
 'client':'UTE TR-SE HASSI MESSAOUD PROJECT','company':'SONATRACH',
 'po':'1074503320','poDoc':'P-25TR-006','docSet':'FS-TR006-001',
 'legend':{k:v for k,v in [('MI','Material Inspection'),('MK','Marking'),('CT','Cutting'),
   ('MC','Machining'),('DR','Drilling'),('RL','Rolling'),('RE-ROLL','Re-Rolling'),
   ('C-','Circular'),('L-','Longitudinal'),('FM','Forming'),("ASS'Y",'Assembly'),
   ('FU','Fit-Up'),('WD','Welding'),('FAB','Fabrication'),('SR','Stress Relieve'),
   ('DI','Dimension Inspection'),('VI','Visual Inspection'),('HT','Hydro Test'),
   ('PA','Painting'),('T/B IN','Tube Insert'),('SW','Seal Welding'),('EXP','Expanding'),
   ('PK\'G','Packing'),('L/P','Ladder & Platform'),('PW','Post Weld Heat Treatment')]},
 'tags':tags}
json.dump(project,open('fab_project.json','w'),indent=1)
print('unique tags:',len(tags))
print('sample tag 200-R-001 first activity:')
t=tags[0]; print(' ',t['tag'],'del',t['delivery'],'progress',t['progress'],'%','data',t['dataDate'])
for a in t['activities'][:2]:
    print('  ',a['group'],'|',a['name'],'->',[ (s['code'],s['date'],'✓' if s['done'] else '·') for s in a['steps']])
print('window keys', t['winMin'], t['winMax'])
